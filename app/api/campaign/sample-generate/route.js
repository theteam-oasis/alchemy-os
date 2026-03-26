import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min max

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

async function claude(prompt, maxTokens = 2048) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content.find(b => b.type === 'text')
  return block.text.trim()
}

async function generateImage(prompt, options = {}) {
  const { avatarUrl, aspectRatio = '16:9' } = options
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]

  if (avatarUrl) {
    try {
      const imgRes = await fetch(avatarUrl)
      const buf = await imgRes.arrayBuffer()
      parts.push({
        inlineData: {
          mimeType: imgRes.headers.get('content-type') || 'image/png',
          data: Buffer.from(buf).toString('base64'),
        }
      })
    } catch (e) { console.error('Avatar fetch failed:', e.message) }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { imageSize: "1K", aspectRatio },
        },
      }),
    }
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`Google API ${res.status}: ${text.slice(0, 200)}`)
  const data = JSON.parse(text)
  const imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!imagePart) throw new Error('No image returned')
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}

async function uploadImageToStorage(dataUrl, filename) {
  try {
    const base64 = dataUrl.split(',')[1]
    const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const path = `${filename}.${ext}`
    const buffer = Buffer.from(base64, 'base64')
    const { error } = await supabase.storage.from('brand-assets').upload(path, buffer, { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
    return publicUrl
  } catch (e) {
    console.error('Upload failed:', e.message)
    return null
  }
}

// SSE helper
function sendEvent(controller, event, data) {
  const encoder = new TextEncoder()
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(request) {
  const body = await request.json()
  const { clientId, websiteUrl, productName, offerNotes, creativeKeywords, aspectRatio = '16:9' } = body

  // Use Server-Sent Events for live progress updates
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, 'progress', { step: 'analyzing', message: 'Analyzing brand website...' })

        // Step 1: Analyze website
        let websiteContent = ''
        try {
          const r = await fetch(websiteUrl, { signal: AbortSignal.timeout(8000) })
          const html = await r.text()
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000)
        } catch { websiteContent = `Product: ${productName}. Notes: ${offerNotes}` }

        const analysisText = await claude(`You are a brand strategist. Extract brand intelligence.
WEBSITE: ${websiteContent}
PRODUCT: ${productName}
NOTES: ${offerNotes || 'None'}
Respond ONLY with JSON:
{"coreOffer":"","heroProduct":"","targetCustomer":"","corePainPoint":"","desiredTransformation":"","differentiators":[],"proofPoints":[],"websiteTone":"","keyPhrasing":[],"visualCues":"","productCategory":""}`)
        const analysis = parseJSON(analysisText)

        sendEvent(controller, 'progress', { step: 'concepts', message: 'Generating 4 campaign concepts...' })

        // Step 2: Generate 4 concepts
        const keywords = creativeKeywords ? creativeKeywords.split(',').map(k => k.trim()).filter(Boolean) : []
        const conceptsText = await claude(`You are a creative director. Generate exactly 4 campaign concepts.
BRAND: ${analysis.coreOffer} | Customer: ${analysis.targetCustomer} | Tone: ${analysis.websiteTone}
KEYWORDS: ${keywords.join(', ') || 'none'}
Rules: Each concept must be from a completely different creative territory. No performance/racing metaphors unless brand clearly suggests it.
Respond ONLY with JSON array of exactly 4:
[{"title":"","theme":"","visualUniverse":"","metaphorBridge":"","emotionalFrame":"","whyItFits":"","siteAnchors":[]}]`, 4096)
        const concepts = parseJSON(conceptsText)

        sendEvent(controller, 'progress', { step: 'building', message: 'Building 4 full campaigns in parallel...' })

        // Step 3: Build all 4 campaigns in parallel
        const campaignPromises = concepts.map(async (concept, conceptIdx) => {
          try {
            // Script
            const scriptText = await claude(`Write 1 production-ready 30-second ad script.
CONCEPT: ${concept.title} — ${concept.theme}
PRODUCT: ${analysis.heroProduct}
TRANSFORMATION: ${analysis.desiredTransformation}
TONE: ${analysis.websiteTone}
~70 spoken words. Real lines only.
Respond ONLY with JSON (single object, not array):
{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`)
            const script = parseJSON(scriptText)

            // Visual direction
            const directionText = await claude(`Generate 1 visual direction for this campaign.
CONCEPT: ${concept.title} — ${concept.visualUniverse}
TONE: ${analysis.websiteTone}
Respond ONLY with JSON (single object):
{"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","texture":"","editingFeel":"","cinematicReference":"","summary":""}`)
            const direction = parseJSON(directionText)

            // Avatar prompt
            const avatarPromptText = await claude(`Generate 1 avatar portrait prompt for this campaign.
CONCEPT: ${concept.title}
STYLE: ${direction.colorWorld}, ${direction.lighting}
TARGET: ${analysis.targetCustomer}
Chest-up portrait, clear face and outfit, neutral background, editorial photography.
Respond ONLY with JSON (single object):
{"label":"","imagePrompt":""}`)
            const avatarPrompt = parseJSON(avatarPromptText)

            sendEvent(controller, 'progress', { 
              step: 'images', 
              message: `Concept ${conceptIdx + 1}: Generating avatar...`,
              conceptIdx
            })

            // Generate avatar image
            const avatarDataUrl = await generateImage(
              avatarPrompt.imagePrompt + ' Chest-up portrait, editorial photography, neutral background. No text.',
              { aspectRatio: '3:4', imageSize: "1K" }
            )

            // Upload avatar to get URL
            const avatarUrl = await uploadImageToStorage(avatarDataUrl, `auto-briefs/${clientId}/concept-${conceptIdx}-avatar`)

            // Shot list
            const sceneCount = 8 // 8 scenes for auto-brief (faster)
            const shotListText = await claude(`Create ${sceneCount} shots for a 30-second commercial.
CAMPAIGN: ${concept.title} — ${concept.theme}
DIRECTION: ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
CHARACTER: ${avatarPrompt.label}
SCRIPT: "${script.fullScript}"
FORMAT: ${aspectRatio}
Vary shot types: ECU, CU, MCU, MS, WS, EWS, INSERT, CUTAWAY
Respond ONLY with JSON array of exactly ${sceneCount}:
[{"sceneIndex":0,"shotType":"","scriptMoment":"","action":"","environment":"","cameraMove":"","mood":"","isProductShot":false,"imagePrompt":""}]`, 6000)
            const shotList = parseJSON(shotListText)

            sendEvent(controller, 'progress', { 
              step: 'scenes', 
              message: `Concept ${conceptIdx + 1}: Generating ${sceneCount} scenes...`,
              conceptIdx
            })

            // Generate scene images in batches of 4
            const sceneResults = []
            for (let i = 0; i < shotList.length; i += 4) {
              const batch = shotList.slice(i, i + 4)
              const batchResults = await Promise.allSettled(
                batch.map(async (shot, batchIdx) => {
                  const globalIdx = i + batchIdx
                  const prompt = `${shot.imagePrompt}
Character: ${avatarPrompt.label} — maintain exact appearance from reference portrait.
Shot: ${shot.shotType}. Camera: ${shot.cameraMove}.
${direction.colorWorld}, ${direction.lighting}. Photorealistic, cinematic. No text, no watermarks.`
                  const imageUrl = await generateImage(prompt, { avatarUrl, aspectRatio, imageSize: "1K" })
                  return { imageUrl, loading: false, shot }
                })
              )
              batchResults.forEach((r, batchIdx) => {
                const globalIdx = i + batchIdx
                sceneResults[globalIdx] = r.status === 'fulfilled'
                  ? r.value
                  : { imageUrl: null, loading: false, shot: shotList[globalIdx] }
              })
            }

            sendEvent(controller, 'progress', { 
              step: 'saving', 
              message: `Concept ${conceptIdx + 1}: Saving to database...`,
              conceptIdx
            })

            // Save campaign to Supabase
            const { data: saved, error } = await supabase
              .from('campaigns')
              .insert({
                client_id: clientId,
                status: 'complete',
                storyboard_complete: true,
                website_url: websiteUrl,
                product_name: productName,
                offer_notes: offerNotes,
                creative_keywords: keywords,
                website_analysis: analysis,
                concepts: concepts,
                chosen_concept: concept,
                script_duration: 30,
                scripts: [script],
                chosen_script: script,
                chosen_direction: direction,
                chosen_avatar: avatarDataUrl,
                avatars: [avatarDataUrl],
                scenes: sceneResults,
                aspect_ratio: aspectRatio,
                concept_title: concept.title,
              })
              .select('id')
              .single()

            if (error) throw error

            sendEvent(controller, 'concept_complete', { 
              conceptIdx, 
              campaignId: saved.id,
              conceptTitle: concept.title
            })

            return saved.id
          } catch (e) {
            console.error(`Concept ${conceptIdx} failed:`, e.message)
            sendEvent(controller, 'concept_error', { conceptIdx, error: e.message })
            return null
          }
        })

        const results = await Promise.allSettled(campaignPromises)
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length

        sendEvent(controller, 'complete', { 
          clientId, 
          successCount,
          message: `${successCount} of 4 concepts complete. Redirecting to brief...`
        })

      } catch (e) {
        console.error('Auto-generate error:', e)
        sendEvent(controller, 'error', { message: e.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
