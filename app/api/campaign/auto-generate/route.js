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
    return parseJSON(text)
  } catch {
    try {
      const match = text.match(/(\[.*\])/s) || text.match(/(\{.*\})/s)
      if (match) return JSON.parse(match[1])
    } catch {}
    return fallback
  }
}

async function claude(prompt, maxTokens = 1000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = msg.content?.find(b => b.type === 'text')
      if (!block?.text) throw new Error('Empty response')
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
  const { avatarUrl, productUrl, aspectRatio = '16:9' } = options
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
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { imageSize: '1K', aspectRatio } },
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

async function uploadToStorage(dataUrl, path) {
  try {
    const base64 = dataUrl.split(',')[1]
    const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const buffer = Buffer.from(base64, 'base64')
    const { error } = await supabase.storage
      .from('brand-assets')
      .upload(`${path}.${ext}`, buffer, { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(`${path}.${ext}`)
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
        // ── ANALYZE ──
        sendEvent(controller, 'progress', { step: 'analyzing', message: 'Analyzing brand...' })
        let pageContent = ''
        try {
          const r = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })
          const html = await r.text()
          pageContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
        } catch { pageContent = `${productName}. ${offerNotes}` }

        const analysis = safeParseJSON(await claude(`Brand strategist. Extract brand intelligence from page content.
URL: ${targetUrl}. Product: ${productName||'see page'}. Notes: ${offerNotes||'none'}.
Content: ${pageContent}
ONLY JSON (no markdown): {"brandName":"","coreOffer":"","heroProduct":"","targetCustomer":"","corePainPoint":"","desiredTransformation":"","differentiators":[],"websiteTone":"","keyPhrasing":[],"visualCues":"","productCategory":"","productDetails":"","brandPersonality":""}`, 1200), { brandName: productName || 'Brand', coreOffer: '', heroProduct: productName || '', targetCustomer: '', corePainPoint: '', desiredTransformation: '', differentiators: [], websiteTone: '', keyPhrasing: [], visualCues: '', productCategory: '', productDetails: '', brandPersonality: '' })

        sendEvent(controller, 'analysis_complete', { analysis })

        // ── CONCEPTS ──
        sendEvent(controller, 'progress', { step: 'concepts', message: 'Generating 4 concepts...' })
        const keywords = creativeKeywords ? creativeKeywords.split(',').map(k => k.trim()).filter(Boolean) : []

        const concepts = safeParseJSON(await claude(`Creative director. 4 Super Bowl-caliber campaign concepts.
Brand: ${analysis.brandName}. Product: ${analysis.heroProduct}. Customer: ${analysis.targetCustomer}.
Pain: ${analysis.corePainPoint}. Change: ${analysis.desiredTransformation}.
Tone: ${analysis.websiteTone}. Visual: ${analysis.visualCues}. Keywords: ${keywords.join(',')||'none'}.
Each concept: completely different territory, brand-specific, real human truth, specific visual reference.
ONLY JSON array of 4 (no markdown): [{"title":"","bigIdea":"","theme":"","visualUniverse":"","emotionalFrame":"","whyItFits":"","tone":""}]`, 4000), [])

        if (!concepts?.length) throw new Error('Failed to generate concepts')
        sendEvent(controller, 'concepts_complete', { concepts })
        sendEvent(controller, 'progress', { step: 'building', message: 'Building 4 campaigns...' })

        // ── BUILD EACH CONCEPT ── (sequential to avoid DB connection exhaustion)
        for (const [conceptIdx, concept] of concepts.slice(0, 4).entries()) {
          try {
            sendEvent(controller, 'progress', { step: 'concept_start', message: `Concept ${conceptIdx + 1}: Writing...`, conceptIdx })

            // Script
            const script = safeParseJSON(await claude(`Ad copywriter. 30s voiceover script.
Brand: ${analysis.brandName}. Product: ${analysis.heroProduct}. Tone: ${analysis.websiteTone}.
Concept: ${concept.title}. Idea: ${concept.bigIdea}. Mood: ${concept.tone}.
65-75 words. Brand voice. No medical claims.
ONLY JSON: {"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`, 800), { title: '', hook: '', body: '', cta: '', fullScript: '', mood: '' })

            // Direction
            const direction = safeParseJSON(await claude(`Creative director. Visual direction.
Brand: ${analysis.brandName}. Cues: ${analysis.visualCues}. Customer: ${analysis.targetCustomer}.
Concept: ${concept.title}. Universe: ${concept.visualUniverse}.
ONLY JSON: {"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","cinematicReference":"","customerArchetype":"","summary":""}`, 700), { title: '', colorWorld: '', lighting: '', lensAndCamera: '', environment: '', cinematicReference: '', customerArchetype: '', summary: '' })

            // Avatar prompt
            const avatarPrompt = safeParseJSON(await claude(`Casting director. Ad campaign character.
Brand: ${analysis.brandName}. Customer: ${direction.customerArchetype || analysis.targetCustomer}. Style: ${direction.colorWorld}, ${direction.lighting}.
Safe, professional, mainstream. Chest-up portrait.
ONLY JSON: {"label":"4-word character","imagePrompt":"25-word portrait photo prompt"}`, 400), { label: analysis.targetCustomer || 'brand customer', imagePrompt: `Portrait of ${analysis.targetCustomer || 'person'}, chest-up, ${direction.colorWorld}, ${direction.lighting}, editorial photography, neutral background` })

            sendEvent(controller, 'progress', { step: 'avatar', message: `Concept ${conceptIdx + 1}: Generating character...`, conceptIdx })

            // Avatar image + upload
            let avatarUrl = null
            try {
              const avatarDataUrl = await generateImage(
                avatarPrompt.imagePrompt + '. Chest-up portrait, editorial photography, neutral background. No text.',
                { aspectRatio: '3:4' }
              )
              avatarUrl = await uploadToStorage(avatarDataUrl, `auto-briefs/${clientId}/c${conceptIdx}-avatar`)
            } catch (e) { console.log(`Concept ${conceptIdx + 1} avatar failed: ${e.message}`) }

            // Shots — one call per shot, all parallel per concept
            sendEvent(controller, 'progress', { step: 'scenes', message: `Concept ${conceptIdx + 1}: Generating scenes...`, conceptIdx })
            const SHOT_TYPES = ['EWS', 'WS', 'MS', 'CU', 'ECU', 'INSERT']
            const ctx = `Brand: ${analysis.brandName}. Style: ${direction.colorWorld}, ${direction.lighting}. Concept: ${concept.theme}.`
            const shots = await Promise.all(
              SHOT_TYPES.map((shotType, idx) =>
                claude(`${ctx} One shot. Type: ${shotType}. Index: ${idx}. imagePrompt 6 words max.
ONLY JSON object: {"sceneIndex":${idx},"shotType":"${shotType}","action":"3 words","imagePrompt":"6 words","isProductShot":${idx === 4 && productImageUrl ? 'true' : 'false'}}`, 200)
                  .then(t => safeParseJSON(t, { sceneIndex: idx, shotType, action: 'scene action', imagePrompt: `${direction.colorWorld} ${shotType} cinematic`, isProductShot: false }))
                  .catch(() => ({ sceneIndex: idx, shotType, action: 'scene action', imagePrompt: `${direction.colorWorld} ${shotType} cinematic`, isProductShot: false }))
              )
            )

            // Generate scene images in parallel, upload sequentially
            const sceneDataUrls = await Promise.all(
              shots.map(async (shot) => {
                try {
                  const isProduct = shot.isProductShot && productImageUrl
                  const prompt = `${shot.imagePrompt}. ${avatarUrl ? 'Match character portrait.' : ''} ${direction.colorWorld}. ${direction.lighting}. ${shot.shotType} shot. Cinematic photorealistic. No text.`
                  return await generateImage(prompt, { avatarUrl, productUrl: isProduct ? productImageUrl : undefined, aspectRatio })
                } catch { return null }
              })
            )

            // Upload scenes sequentially to avoid connection pool exhaustion
            const sceneResults = []
            for (let i = 0; i < shots.length; i++) {
              const dataUrl = sceneDataUrls[i]
              let imageUrl = null
              if (dataUrl) {
                imageUrl = await uploadToStorage(dataUrl, `auto-briefs/${clientId}/c${conceptIdx}-scene-${i}`)
              }
              sceneResults.push({ imageUrl, loading: false, shot: shots[i] })
            }

            sendEvent(controller, 'progress', { step: 'saving', message: `Concept ${conceptIdx + 1}: Saving...`, conceptIdx })

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
              chosen_avatar: avatarUrl,
              scenes: sceneResults,
              aspect_ratio: aspectRatio,
              concept_title: concept.title,
              client_status: 'pending',
            }).select('id').single()

            if (error) throw error

            sendEvent(controller, 'concept_complete', { conceptIdx, campaignId: saved.id, conceptTitle: concept.title })

          } catch (e) {
            console.error(`Concept ${conceptIdx + 1} failed:`, e.message)
            sendEvent(controller, 'concept_error', { conceptIdx, error: e.message })
          }
        }

        sendEvent(controller, 'complete', { clientId })

      } catch (e) {
        console.error('Auto-generate error:', e.message)
        sendEvent(controller, 'error', { message: e.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
