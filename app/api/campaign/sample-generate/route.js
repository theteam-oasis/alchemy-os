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
  if (!res.ok) throw new Error(`Google API ${res.status}: ${text.slice(0, 200)}`)
  const data = JSON.parse(text)
  const imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!imagePart) throw new Error('No image returned')
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
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
        await new Promise(r => setTimeout(r, 3000))
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

    // Script — use product details from analysis for accuracy
    const productContext = analysis.productDetails ? `PRODUCT DETAILS: ${analysis.productDetails}` : ''
    const script = parseJSON(await claude(`Write a 30-second commercial ad script for a lifestyle brand.
CAMPAIGN THEME: ${concept.theme}
EMOTIONAL FRAME: ${concept.emotionalFrame}
VISUAL UNIVERSE: ${concept.visualUniverse}
${productContext}
~70 words of uplifting, positive spoken voiceover. No medical claims.
Respond ONLY with JSON (no markdown):
{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`, 1000))

    // Visual direction — no concept title to avoid filter triggers
    const direction = parseJSON(await claude(`1 visual direction for a commercial ad campaign.
VISUAL UNIVERSE: ${concept.visualUniverse}
EMOTIONAL FRAME: ${concept.emotionalFrame}
Respond ONLY with JSON (no markdown):
{"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","cinematicReference":"","summary":""}`, 800))

    // Avatar — hardcoded safe portraits to avoid refusals
    const avatarStyles = [
      { label: 'Confident professional', imagePrompt: `Portrait photo of a confident smiling professional person, chest-up, looking at camera, clean neutral gray background, soft studio lighting, shallow depth of field, commercial photography style, ${direction.colorWorld} color grade` },
      { label: 'Friendly lifestyle', imagePrompt: `Portrait photo of a friendly approachable person, chest-up, warm smile, looking at camera, neutral white background, natural soft lighting, editorial photography, ${direction.colorWorld} color grade` },
    ]
    const avatarPrompt = avatarStyles[conceptIdx % avatarStyles.length]

    console.log(`Concept ${conceptIdx + 1}: generating avatar`)
    const avatarDataUrl = await generateImage(
      avatarPrompt.imagePrompt + ' Chest-up portrait, editorial photography, neutral background. No text.',
      { aspectRatio: '3:4' }
    )
    const avatarUrl = await uploadToStorage(avatarDataUrl, `samples/${clientId}/c${conceptIdx}-avatar`)

    // Shot list — 10 scenes in two batches
    const SCENE_COUNT = 10
    const shotList = parseJSON(await claude(`Create ${SCENE_COUNT} cinematic shots for a 30-second commercial.
VISUAL STYLE: ${direction.colorWorld}, ${direction.lighting}
CHARACTER: ${avatarPrompt.label}
FORMAT: ${aspectRatio}
${productImageUrl ? 'PRODUCT: Feature the product naturally in 2-3 shots.' : ''}
Vary shot types: EWS, WS, MS, CU, ECU, INSERT, CUTAWAY, POV, MCU, DUTCH
Keep imagePrompt under 15 words. Keep action under 6 words.
Respond ONLY with JSON array of exactly ${SCENE_COUNT} (no markdown):
[{"sceneIndex":0,"shotType":"","action":"","imagePrompt":"","isProductShot":false}]`, 5000))

    console.log(`Concept ${conceptIdx + 1}: generating ${SCENE_COUNT} scenes in 2 batches`)

    // Batch 1: scenes 0-4 in parallel
    const sceneResults = new Array(SCENE_COUNT).fill(null)

    const buildScene = async (shot, i) => {
      const isProduct = shot.isProductShot && productImageUrl
      const prompt = `${shot.imagePrompt}
${avatarUrl ? `Character: ${avatarPrompt.label} — maintain exact appearance from reference portrait.` : ''}
${isProduct ? 'Feature the product prominently — maintain exact product appearance from reference.' : ''}
Shot: ${shot.shotType}. ${direction.colorWorld}, ${direction.lighting}. Cinematic, photorealistic. No text.`
      const imageUrl = await generateImage(prompt, {
        avatarUrl,
        productUrl: isProduct ? productImageUrl : undefined,
        aspectRatio,
      })
      return { imageUrl, loading: false, shot }
    }

    // Batch 1: first 5
    const batch1 = await Promise.allSettled(shotList.slice(0, 5).map((shot, i) => buildScene(shot, i)))
    batch1.forEach((r, i) => {
      sceneResults[i] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i] }
    })
    console.log(`Concept ${conceptIdx + 1}: batch 1 done`)

    // Batch 2: last 5
    const batch2 = await Promise.allSettled(shotList.slice(5, 10).map((shot, i) => buildScene(shot, i + 5)))
    batch2.forEach((r, i) => {
      sceneResults[i + 5] = r.status === 'fulfilled' ? r.value : { imageUrl: null, loading: false, shot: shotList[i + 5] }
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
