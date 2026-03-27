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

function safeParseJSON(text, fallback = null) {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    // Try to fix truncated JSON by finding last complete object
    return JSON.parse(clean)
  } catch {
    // Try to extract partial array
    try {
      const match = text.match(/(\[.*\])/s)
      if (match) return JSON.parse(match[1])
    } catch {}
    return fallback
  }
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

        const analysisText = await claude(`Brand strategist. Extract brand intelligence. Be specific, ground in actual page content.
Page: ${targetUrl}. Product: ${productName||'See page'}. Notes: ${offerNotes||'None'}.
Content: ${pageContent.slice(0,4000)}
ONLY JSON:
{"brandName":"","coreOffer":"","heroProduct":"","targetCustomer":"","corePainPoint":"","desiredTransformation":"","differentiators":[],"proofPoints":[],"websiteTone":"","keyPhrasing":[],"visualCues":"","productCategory":"","productDetails":"","brandPersonality":""}`, 1500)

        const analysis = safeParseJSON(analysisText, {brandName:'Brand',coreOffer:'',heroProduct:'',targetCustomer:'',corePainPoint:'',desiredTransformation:'',differentiators:[],websiteTone:'',keyPhrasing:[],visualCues:'',productCategory:'',productDetails:'',brandPersonality:''})
        sendEvent(controller, 'analysis_complete', { analysis })

        // Step 2: Generate 4 deeply specific concepts
        sendEvent(controller, 'progress', { step: 'concepts', message: 'Generating 4 campaign concepts...' })

        const keywords = creativeKeywords ? creativeKeywords.split(',').map(k => k.trim()).filter(Boolean) : []

        const conceptsText = await claude(`Creative director. 4 Super Bowl-caliber concepts for this brand.
Brand: ${analysis.brandName}. Product: ${analysis.heroProduct}. Customer: ${analysis.targetCustomer}.
Pain: ${analysis.corePainPoint}. Transformation: ${analysis.desiredTransformation}.
Tone: ${analysis.websiteTone}. Visual: ${analysis.visualCues}.
Keywords: ${keywords.join(', ')||'none'}.
Rules: completely different territories, brand-specific, reference real directors, human truths.
ONLY JSON array of 4 (no markdown):
[{"title":"","bigIdea":"","theme":"","visualUniverse":"","emotionalFrame":"","whyItFits":"","tone":""}]`, 6000)

        const rawConcepts = safeParseJSON(conceptsText, [])
        if (!rawConcepts?.length) throw new Error('Failed to parse concepts')
        const concepts = rawConcepts.slice(0, 4)
        sendEvent(controller, 'concepts_complete', { concepts })
        sendEvent(controller, 'progress', { step: 'building', message: 'Building 4 full campaigns...' })

        // Step 3: Build all 4 concepts in parallel
        const campaignPromises = concepts.map(async (concept, conceptIdx) => {
          try {
            sendEvent(controller, 'progress', { step: 'concept_start', message: `Concept ${conceptIdx + 1}: Writing script...`, conceptIdx })

            // Script — brand-specific
            const scriptText = await claude(`Ad copywriter. 30-second voiceover script.
Brand: ${analysis.brandName}. Product: ${analysis.heroProduct}. Tone: ${analysis.websiteTone}.
Concept: ${concept.title}. Big idea: ${concept.bigIdea}. Mood: ${concept.tone}.
Transformation: ${analysis.desiredTransformation}.
65-75 words. Brand voice. No medical claims.
ONLY JSON: {"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`, 800)

            const script = safeParseJSON(scriptText, {title:"",hook:"",body:"",cta:"",fullScript:"",mood:""})

            // Visual direction — derived from brand's actual visual world
            const directionText = await claude(`Creative director. Visual direction for this campaign.
Brand: ${analysis.brandName}. Visual cues: ${analysis.visualCues}. Customer: ${analysis.targetCustomer}.
Concept: ${concept.title}. Universe: ${concept.visualUniverse}.
ONLY JSON: {"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","cinematicReference":"","customerArchetype":"","summary":""}`, 700)

            const direction = safeParseJSON(directionText, {title:"",colorWorld:"",lighting:"",lensAndCamera:"",environment:"",texture:"",editingFeel:"",cinematicReference:"",customerArchetype:"",summary:""})

            // Avatar — built from real customer description
            const avatarText = await claude(`Portrait character for ad campaign.
Brand: ${analysis.brandName}. Customer: ${direction.customerArchetype||analysis.targetCustomer}. Style: ${direction.colorWorld}, ${direction.lighting}.
Safe, professional. Chest-up portrait, real not stock.
ONLY JSON: {"label":"4-word character","imagePrompt":"30-word portrait photo prompt"}`, 500)

            let avatarPrompt
            try { avatarPrompt = safeParseJSON(avatarText, null) || null }
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
            // Split into 2 calls of 4 shots each to avoid truncation
// Generate 6 individual shots - one per Claude call to avoid truncation
const shotCtx = `Brand: ${analysis.brandName}. Style: ${direction.colorWorld}, ${direction.lighting}. Concept: ${concept.theme}. Format: ${aspectRatio}.`
const SHOT_TYPES = ['EWS','WS','MS','CU','ECU','INSERT']
const shotList = (await Promise.all(
  SHOT_TYPES.map((shotType, idx) =>
    claude(`${shotCtx} Generate 1 cinematic shot. Shot type: ${shotType}. Index: ${idx}.${idx===4&&productImageUrl?' isProductShot: true.':''} imagePrompt 6 words max. ONLY JSON object: {"sceneIndex":${idx},"shotType":"${shotType}","action":"3 words","imagePrompt":"6 word scene description","isProductShot":${idx===4&&productImageUrl?'true':'false'}}`, 400)
    .then(t => { try { return parseJSON(t) } catch { return {sceneIndex:idx,shotType,action:'scene',imagePrompt:`${direction.colorWorld} ${shotType} shot`,isProductShot:false} } })
    .catch(() => ({sceneIndex:idx,shotType,action:'scene',imagePrompt:`${direction.colorWorld} ${shotType} shot`,isProductShot:false}))
  )
)).filter(Boolean)

            // shotList built above via per-shot calls

            sendEvent(controller, 'progress', { step: 'scenes', message: `Concept ${conceptIdx + 1}: Generating 8 scenes...`, conceptIdx })

            // Generate scenes in 2 batches of 4
            const SCENE_COUNT = Math.min(shotList.length, 6)
            const sceneResults = new Array(SCENE_COUNT).fill(null)

            const buildScene = async (shot, i) => {
              const isProduct = shot.isProductShot && productImageUrl
              const prompt = `${shot.imagePrompt}. Character: ${avatarPrompt.label}${avatarUrl ? ', match portrait' : ''}. ${isProduct ? 'Feature product.' : ''} ${direction.colorWorld}. ${direction.lighting}. Cinematic photorealistic. No text.`
              const imageUrl = await generateImage(prompt, {
                avatarUrl,
                productUrl: isProduct ? productImageUrl : undefined,
                aspectRatio,
                imageSize: '1K',
              })
              return { imageUrl, loading: false, shot }
            }

            // All scenes in parallel — 6 max at 1K is fast
            const allResults = await Promise.allSettled(shotList.slice(0, SCENE_COUNT).map((shot, i) => buildScene(shot, i)))
            allResults.forEach((r, i) => {
              sceneResults[i] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i] }
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
