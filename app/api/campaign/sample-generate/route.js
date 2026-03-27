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

async function claude(prompt, maxTokens = 1500) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = msg.content?.find(b => b.type === 'text')
      if (!block?.text) throw new Error(`Empty response from Claude. Stop reason: ${msg.stop_reason}`)
      return block.text.trim()
    } catch (e) {
      if (attempt < 2 && (e.message?.includes('529') || e.status === 529)) {
        console.log(`Claude overloaded, retrying in ${(attempt + 1) * 3}s...`)
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
      } else throw e
    }
  }
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return {
      data: Buffer.from(buf).toString('base64'),
      mimeType: res.headers.get('content-type') || 'image/jpeg',
    }
  } catch (e) {
    console.error('Image fetch failed:', e.message)
    return null
  }
}

async function generateImage(prompt, options = {}) {
  const { avatarUrl, productUrl, aspectRatio = '16:9' } = options
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]

  // Avatar reference — character consistency
  if (avatarUrl) {
    const img = await fetchImageAsBase64(avatarUrl)
    if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
  }

  // Product reference — product consistency
  if (productUrl) {
    const img = await fetchImageAsBase64(productUrl)
    if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { imageSize: '1K', aspectRatio },
          },
        }),
    }
  )
    const text = await res.text()
    if (!res.ok) {
      if (attempt < 2 && (res.status === 500 || res.status === 503)) {
        console.log(`Google API ${res.status}, retrying in ${(attempt + 1) * 3}s...`)
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
  throw new Error('Google API failed after 3 attempts')
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

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Handles ONE concept per call — called 2x in parallel from frontend
export async function POST(request) {
  try {
    const { clientId: incomingClientId, clientName: incomingClientName, analysis, concept, conceptIdx, websiteUrl, productName, offerNotes, aspectRatio = '16:9', productImageUrl, productPageUrl } = await request.json()

    console.log(`Sample concept ${conceptIdx + 1}: ${concept.title}`)

    // Auto-create client if none provided
    // Only concept 0 creates — concept 1 waits 3s then finds it
    let clientId = incomingClientId
    let clientName = incomingClientName || analysis.brandName || 'Brand'

    if (!clientId) {
      const sampleName = `SAMPLE - ${clientName}`

      if (conceptIdx > 0) {
        // Wait for concept 0 to create the record first
        await new Promise(r => setTimeout(r, 8000))
      }

      const { data: existing } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', sampleName)
        .maybeSingle()

      if (existing) {
        clientId = existing.id
        clientName = existing.name
      } else {
        // Only concept 0 should reach here
        const { data: created, error: createError } = await supabase
          .from('clients')
          .insert({ name: sampleName })
          .select('id, name')
          .single()
        if (createError) throw createError
        clientId = created.id
        clientName = created.name
        console.log(`Auto-created client: ${sampleName} (${clientId})`)
      }
    }

    // Script — fully grounded in brand analysis + concept
    const script = parseJSON(await claude(`You are a world-class copywriter. Write a 30-second commercial script.

BRAND: ${analysis.brandName}
PRODUCT: ${analysis.heroProduct}
TARGET CUSTOMER: ${analysis.targetCustomer}
CORE PAIN POINT: ${analysis.corePainPoint}
TRANSFORMATION: ${analysis.desiredTransformation}
KEY PHRASES FROM BRAND: ${analysis.keyPhrasing?.join(', ')}
PRODUCT DETAILS: ${analysis.productDetails || 'N/A'}
BRAND TONE: ${analysis.websiteTone}

CAMPAIGN CONCEPT: ${concept.theme}
EMOTIONAL FRAME: ${concept.emotionalFrame}

Write ~70 words of voiceover. Use the brand's actual tone and language. Reference the real transformation the product delivers. Sound like this specific brand, not a generic ad.
No medical claims. No superlatives like "revolutionary" or "amazing".
Respond ONLY with JSON (no markdown):
{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`, 1200))

    // Visual direction — grounded in brand's actual visual world
    const direction = parseJSON(await claude(`You are a creative director. Define the visual direction for this campaign.

BRAND: ${analysis.brandName}
VISUAL CUES FROM BRAND: ${analysis.visualCues}
BRAND TONE: ${analysis.websiteTone}
TARGET CUSTOMER: ${analysis.targetCustomer}
PRODUCT CATEGORY: ${analysis.productCategory}

CONCEPT VISUAL UNIVERSE: ${concept.visualUniverse}
EMOTIONAL FRAME: ${concept.emotionalFrame}

Define a specific, cinematic visual direction that feels true to this brand and its customer's world. Think about where this customer actually lives, what their aesthetic is, what time of day, what textures and light feel right for them.
Respond ONLY with JSON (no markdown):
{"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","cinematicReference":"","customerArchetype":"","summary":""}`, 1000))

    // Avatar — built from the actual target customer description
    const avatarClaudePrompt = await claude(`You are a casting director and photographer. Describe a portrait photo for a commercial campaign character.

BRAND: ${analysis.brandName}
TARGET CUSTOMER: ${analysis.targetCustomer}
BRAND TONE: ${analysis.websiteTone}
VISUAL DIRECTION: ${direction.colorWorld}, ${direction.lighting}
CUSTOMER ARCHETYPE: ${direction.customerArchetype || analysis.targetCustomer}

Describe a chest-up portrait of the ideal customer for this brand. Be specific about:
- Age range, general appearance, energy/vibe
- What they're wearing (simple, brand-appropriate)
- Expression and body language
- Background/setting (simple, on-brand)
- Photography style and lighting

Keep it safe, professional, and appropriate for mainstream advertising. No specific ethnicities, no medical conditions, no controversial elements.
Respond ONLY with JSON (no markdown):
{"label":"customer archetype in 4 words","imagePrompt":"detailed portrait photo prompt, 40-50 words"}`, 800)

    let avatarPrompt
    try {
      avatarPrompt = parseJSON(avatarClaudePrompt)
    } catch {
      // Fallback if parsing fails
      avatarPrompt = {
        label: direction.customerArchetype || 'brand customer',
        imagePrompt: `Portrait photo of a ${analysis.targetCustomer || 'professional person'}, chest-up, looking at camera, ${direction.colorWorld} color grade, ${direction.lighting}, editorial photography, neutral background`
      }
    }

    console.log(`Concept ${conceptIdx + 1}: generating avatar`)
    const avatarDataUrl = await generateImage(
      avatarPrompt.imagePrompt + ' Chest-up portrait, editorial photography, neutral background. No text.',
      { aspectRatio: '3:4' }
    )
    const avatarUrl = await uploadToStorage(avatarDataUrl, `samples/${clientId}/c${conceptIdx}-avatar`)

    // Shot list — grounded in brand's world, character, and concept
    const SCENE_COUNT = 8
    const shotList = parseJSON(await claude(`Shot list. 30s commercial. Brand: ${analysis.brandName}. Character: ${avatarPrompt.label}.
Style: ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}.
Ref: ${direction.cinematicReference}. Concept: ${concept.theme}. Format: ${aspectRatio}.
${productImageUrl ? 'Include 2-3 product shots.' : ''}
Vary: EWS/WS/MS/CU/ECU/INSERT/CUTAWAY/POV/MCU/DUTCH. imagePrompt max 12 words. action max 5 words.
ONLY JSON array of exactly ${SCENE_COUNT} no markdown:
[{"sceneIndex":0,"shotType":"","action":"","imagePrompt":"","isProductShot":false}]`, 8000))

    console.log(`Concept ${conceptIdx + 1}: generating ${SCENE_COUNT} scenes in 2 batches`)

    // Batch 1: scenes 0-4 in parallel
    const sceneResults = new Array(SCENE_COUNT).fill(null)

    const buildScene = async (shot, i) => {
      const isProduct = shot.isProductShot && productImageUrl
      const prompt = `${shot.imagePrompt}
Character: ${avatarPrompt.label}${avatarUrl ? ' — match reference portrait exactly' : ''}.
${isProduct ? 'Feature product prominently — match reference image exactly.' : ''}
Shot: ${shot.shotType}. ${direction.colorWorld}. ${direction.lighting}. ${direction.environment}.
Cinematic, photorealistic, editorial quality. No text or logos.`
      const imageUrl = await generateImage(prompt, {
        avatarUrl,
        productUrl: isProduct ? productImageUrl : undefined,
        aspectRatio,
      })
      return { imageUrl, loading: false, shot }
    }

    // Batch 1: first 5
    const batch1 = await Promise.allSettled(shotList.slice(0, 4).map((shot, i) => buildScene(shot, i)))
    batch1.forEach((r, i) => {
      sceneResults[i] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i] }
    })
    console.log(`Concept ${conceptIdx + 1}: batch 1 done`)

    // Batch 2: last 5
    const batch2 = await Promise.allSettled(shotList.slice(4, 8).map((shot, i) => buildScene(shot, i + 5)))
    batch2.forEach((r, i) => {
      sceneResults[i + 4] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i + 4] }
    })
    console.log(`Concept ${conceptIdx + 1}: batch 2 done`)

    // Save to Supabase
    const clientSlug = slugify(clientName || '')
    const { data: saved, error } = await supabase.from('campaigns').insert({
      client_id: clientId,
      status: 'complete',
      storyboard_complete: true,
      website_url: websiteUrl,
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

    console.log(`Concept ${conceptIdx + 1} saved: ${saved.id}`)
    return Response.json({ success: true, campaignId: saved.id, conceptTitle: concept.title, clientSlug, clientId })

  } catch (error) {
    console.error('Sample generate error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
