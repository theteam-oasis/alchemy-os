import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const runtime = 'nodejs'
export const maxDuration = 300

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

async function claude(prompt, maxTokens = 2000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = msg.content?.find(b => b.type === 'text')
      if (!block?.text) throw new Error(`Empty response. Stop: ${msg.stop_reason}`)
      return block.text.trim()
    } catch (e) {
      if (attempt < 2 && (e.message?.includes('529') || e.status === 529)) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 4000))
      } else throw e
    }
  }
}

async function fetchBase64(url) {
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return { data: Buffer.from(buf).toString('base64'), mimeType: res.headers.get('content-type') || 'image/jpeg' }
  } catch { return null }
}

async function generateImage(prompt, options = {}) {
  const { avatarUrl, productUrl, aspectRatio = '16:9', imageSize = '2K' } = options
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]

  if (avatarUrl) {
    const img = await fetchBase64(avatarUrl)
    if (img) parts.push({ inlineData: img })
  }
  if (productUrl) {
    const img = await fetchBase64(productUrl)
    if (img) parts.push({ inlineData: img })
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { imageSize, aspectRatio } },
        }),
      }
    )
    const text = await res.text()
    if (!res.ok) {
      if (attempt < 2 && (res.status === 500 || res.status === 503)) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
        continue
      }
      throw new Error(`Google API ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = JSON.parse(text)
    const imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!imagePart) throw new Error('No image returned')
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
  }
}

async function uploadToStorage(dataUrl, filename) {
  try {
    const base64 = dataUrl.split(',')[1]
    const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const buffer = Buffer.from(base64, 'base64')
    const { error } = await supabase.storage.from('brand-assets').upload(`${filename}.${ext}`, buffer, { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(`${filename}.${ext}`)
    return publicUrl
  } catch (e) {
    console.error('Upload failed:', e.message)
    return null
  }
}

function sendEvent(controller, event, data) {
  const encoder = new TextEncoder()
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(request) {
  const { clientId, productPageUrl, websiteUrl, productName, offerNotes, creativeKeywords, aspectRatio = '16:9', productImageUrl } = await request.json()

  const targetUrl = productPageUrl || websiteUrl

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Scrape and analyze
        sendEvent(controller, 'progress', { step: 'analyzing', message: 'Analyzing brand...' })

        let pageContent = ''
        try {
          const r = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlchemyOS/1.0)' },
            signal: AbortSignal.timeout(8000)
          })
          const html = await r.text()
          pageContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
        } catch {
          pageContent = `Product: ${productName}. Notes: ${offerNotes}`
        }

        const analysisText = await claude(`Senior brand strategist. Extract deep brand intelligence from this page.

PAGE: ${targetUrl}
CONTENT: ${pageContent}
PRODUCT: ${productName || 'See page'}
NOTES: ${offerNotes || 'None'}

Be specific — ground everything in actual content from the page. No generic marketing language.
Respond ONLY with JSON:
{
  "brandName": "",
  "coreOffer": "",
  "heroProduct": "",
  "targetCustomer": "specific person, their life, their problem",
  "corePainPoint": "the real problem they have",
  "desiredTransformation": "how their life changes after using this",
  "differentiators": ["what makes this genuinely different"],
  "proofPoints": ["real claims, stats, testimonials from the page"],
  "websiteTone": "how the brand sounds",
  "keyPhrasing": ["actual phrases from the page"],
  "visualCues": "aesthetic and visual themes",
  "productCategory": "market category",
  "productDetails": "specific ingredients, features, specs from the page",
  "brandPersonality": "3 words that describe this brand"
}`, 1500)

        const analysis = parseJSON(analysisText)
        sendEvent(controller, 'analysis_complete', { analysis })

        // Step 2: Generate 4 deeply specific concepts
        sendEvent(controller, 'progress', { step: 'concepts', message: 'Generating 4 campaign concepts...' })

        const keywords = creativeKeywords ? creativeKeywords.split(',').map(k => k.trim()).filter(Boolean) : []

        const conceptsText = await claude(`World-class creative director at the best ad agency in the world. Generate 4 Super Bowl-caliber campaign concepts for this brand.

BRAND: ${analysis.brandName}
CORE OFFER: ${analysis.coreOffer}
HERO PRODUCT: ${analysis.heroProduct}
TARGET CUSTOMER: ${analysis.targetCustomer}
PAIN POINT: ${analysis.corePainPoint}
TRANSFORMATION: ${analysis.desiredTransformation}
DIFFERENTIATORS: ${analysis.differentiators?.join(', ')}
BRAND TONE: ${analysis.websiteTone}
KEY PHRASES: ${analysis.keyPhrasing?.join(', ')}
VISUAL CUES: ${analysis.visualCues}
PRODUCT DETAILS: ${analysis.productDetails}
BRAND PERSONALITY: ${analysis.brandPersonality}
CREATIVE KEYWORDS: ${keywords.join(', ') || 'none'}

REQUIREMENTS:
- Each concept from a COMPLETELY different creative territory
- Each must feel like it was written specifically for this brand — no generic ideas
- The "Big Idea" (theme) must be a specific human truth this brand's customer lives
- The visualUniverse must reference specific directors, photographers, or visual movements
- Think Super Bowl: entertaining, emotionally resonant, impossible to ignore
- The metaphorBridge must be specific — NOT generic like "journey" or "transformation"

Respond ONLY with JSON array of exactly 4:
[{
  "title": "Campaign title (3-5 words, evocative)",
  "bigIdea": "The single insight this whole campaign is built on — one sentence, specific",
  "theme": "What this campaign is really about — the human truth",
  "visualUniverse": "Specific aesthetic world — reference real directors/photographers/movements",
  "metaphorBridge": "The specific metaphor or device that makes this concept work",
  "emotionalFrame": "Exactly how the viewer feels at the END of watching this",
  "whyItFits": "Why this specific brand, not any brand",
  "openingImage": "The very first frame — describe it precisely",
  "tone": "The specific tone of this campaign"
}]`, 5000)

        const concepts = parseJSON(conceptsText)
        sendEvent(controller, 'concepts_complete', { concepts })
        sendEvent(controller, 'progress', { step: 'building', message: 'Building 4 full campaigns...' })

        // Step 3: Build all 4 concepts in parallel
        const campaignPromises = concepts.map(async (concept, conceptIdx) => {
          try {
            sendEvent(controller, 'progress', { step: 'concept_start', message: `Concept ${conceptIdx + 1}: Writing script...`, conceptIdx })

            // Script — brand-specific
            const scriptText = await claude(`World-class copywriter. Write a 30-second Super Bowl-caliber ad script.

BRAND: ${analysis.brandName}
PRODUCT: ${analysis.heroProduct}
TARGET: ${analysis.targetCustomer}
TRANSFORMATION: ${analysis.desiredTransformation}
PRODUCT DETAILS: ${analysis.productDetails}
BRAND TONE: ${analysis.websiteTone}
KEY PHRASES: ${analysis.keyPhrasing?.join(', ')}

CAMPAIGN: ${concept.title}
BIG IDEA: ${concept.bigIdea}
TONE: ${concept.tone}
EMOTIONAL FRAME: ${concept.emotionalFrame}

Write 65-75 words of spoken voiceover. Sound exactly like this brand. Use their actual language. Reference the real transformation. Make it cinematic and memorable. No medical claims.

Respond ONLY with JSON:
{"title":"","hook":"one sentence that opens the spot","body":"the middle — develops the idea","cta":"closing line or call to action","fullScript":"complete 65-75 word script","mood":""}`, 1200)

            const script = parseJSON(scriptText)

            // Visual direction — derived from brand's actual visual world
            const directionText = await claude(`Creative director. Define the visual direction for this campaign.

BRAND: ${analysis.brandName}
VISUAL CUES: ${analysis.visualCues}
BRAND TONE: ${analysis.websiteTone}
TARGET CUSTOMER: ${analysis.targetCustomer}

CONCEPT: ${concept.title}
BIG IDEA: ${concept.bigIdea}
VISUAL UNIVERSE: ${concept.visualUniverse}
TONE: ${concept.tone}

Define a cinematic visual direction true to this brand's customer's world. Be specific — think about where they live, their aesthetic, what their hands look like, what they drink in the morning.

Respond ONLY with JSON:
{"title":"","colorWorld":"specific palette","lighting":"specific light quality","lensAndCamera":"specific lens choice","environment":"where we are","texture":"what materials/surfaces","editingFeel":"rhythm and pace","cinematicReference":"specific directors or films","customerArchetype":"specific description of the character","summary":""}`, 1000)

            const direction = parseJSON(directionText)

            // Avatar — built from real customer description
            const avatarText = await claude(`Casting director. Describe a portrait character for this commercial.

BRAND: ${analysis.brandName}
CUSTOMER: ${direction.customerArchetype || analysis.targetCustomer}
STYLE: ${direction.colorWorld}, ${direction.lighting}
CONCEPT TONE: ${concept.tone}

Describe the ideal person to represent this brand's customer. Be specific: age, energy, style, expression. This person should feel real, not like a stock photo.
Safe, professional, mainstream advertising appropriate.

Respond ONLY with JSON:
{"label":"character in 4 words","imagePrompt":"precise 40-word portrait photo prompt"}`, 700)

            let avatarPrompt
            try { avatarPrompt = parseJSON(avatarText) }
            catch { avatarPrompt = { label: analysis.targetCustomer || 'brand customer', imagePrompt: `Portrait photo of ${analysis.targetCustomer || 'a person'}, chest-up, ${direction.colorWorld} aesthetic, ${direction.lighting}, editorial photography, clean background` } }

            sendEvent(controller, 'progress', { step: 'avatar', message: `Concept ${conceptIdx + 1}: Generating character...`, conceptIdx })

            // Avatar image — non-fatal
            let avatarDataUrl = null
            let avatarUrl = null
            try {
              avatarDataUrl = await generateImage(
                avatarPrompt.imagePrompt + '. Chest-up portrait, editorial photography, clean neutral background. No text.',
                { aspectRatio: '3:4', imageSize: '2K' }
              )
              avatarUrl = await uploadToStorage(avatarDataUrl, `auto-briefs/${clientId}/c${conceptIdx}-avatar`)
            } catch (e) {
              console.log(`Concept ${conceptIdx + 1} avatar failed: ${e.message}`)
            }

            // Shot list — 8 scenes, brand-specific world
            const shotListText = await claude(`Cinematographer. Build an 8-shot storyboard for a Super Bowl ad.

BRAND: ${analysis.brandName}
CHARACTER: ${avatarPrompt.label}
STYLE: ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
REFERENCE: ${direction.cinematicReference}
CONCEPT: ${concept.title} — ${concept.bigIdea}
SCRIPT: "${script.fullScript}"
FORMAT: ${aspectRatio}
${productImageUrl ? 'PRODUCT: Feature product naturally in 2 shots.' : ''}

Build 8 shots that tell a complete visual story. Each shot should feel like it belongs in THIS brand's world.
Use: EWS, WS, MS, CU, ECU, INSERT, CUTAWAY, POV
imagePrompt max 12 words. action max 5 words.

ONLY JSON array of exactly 8:
[{"sceneIndex":0,"shotType":"","action":"","imagePrompt":"","isProductShot":false}]`, 6000)

            const shotList = parseJSON(shotListText)

            sendEvent(controller, 'progress', { step: 'scenes', message: `Concept ${conceptIdx + 1}: Generating 8 scenes...`, conceptIdx })

            // Generate scenes in 2 batches of 4
            const sceneResults = new Array(8).fill(null)

            const buildScene = async (shot, i) => {
              const isProduct = shot.isProductShot && productImageUrl
              const prompt = `${shot.imagePrompt}. Character: ${avatarPrompt.label}${avatarUrl ? ' — match reference portrait' : ''}. ${isProduct ? 'Feature product — match reference.' : ''} Shot: ${shot.shotType}. ${direction.colorWorld}. ${direction.lighting}. ${direction.environment}. Cinematic 2K photorealistic. No text.`
              const imageUrl = await generateImage(prompt, {
                avatarUrl,
                productUrl: isProduct ? productImageUrl : undefined,
                aspectRatio,
                imageSize: '2K',
              })
              return { imageUrl, loading: false, shot }
            }

            const batch1 = await Promise.allSettled(shotList.slice(0, 4).map((shot, i) => buildScene(shot, i)))
            batch1.forEach((r, i) => {
              sceneResults[i] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i] }
            })

            const batch2 = await Promise.allSettled(shotList.slice(4, 8).map((shot, i) => buildScene(shot, i + 4)))
            batch2.forEach((r, i) => {
              sceneResults[i + 4] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i + 4] }
            })

            sendEvent(controller, 'progress', { step: 'saving', message: `Concept ${conceptIdx + 1}: Saving...`, conceptIdx })

            // Save
            const { data: saved, error } = await supabase.from('campaigns').insert({
              client_id: clientId,
              status: 'complete',
              storyboard_complete: true,
              website_url: targetUrl,
              product_name: productName,
              offer_notes: offerNotes,
              website_analysis: analysis,
              chosen_concept: concept,
              script_duration: 30,
              chosen_script: script,
              chosen_direction: direction,
              chosen_avatar: avatarDataUrl,
              scenes: sceneResults,
              aspect_ratio: aspectRatio,
              concept_title: concept.title,
              client_status: 'pending',
            }).select('id').single()

            if (error) throw error

            sendEvent(controller, 'concept_complete', {
              conceptIdx,
              campaignId: saved.id,
              conceptTitle: concept.title,
            })

            return saved.id
          } catch (e) {
            console.error(`Concept ${conceptIdx + 1} failed:`, e.message)
            sendEvent(controller, 'concept_error', { conceptIdx, error: e.message })
            return null
          }
        })

        await Promise.allSettled(campaignPromises)

        sendEvent(controller, 'complete', {
          clientId,
          message: 'All concepts complete.',
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
