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
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return msg.content.find(b => b.type === 'text').text.trim()
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

// Handles ONE concept per call — called 2x in parallel from frontend
export async function POST(request) {
  try {
    const { clientId, analysis, concept, conceptIdx, websiteUrl, productName, offerNotes, aspectRatio = '16:9' } = await request.json()

    console.log(`Sample concept ${conceptIdx + 1}: ${concept.title}`)

    // Script — concise prompt, low tokens
    const script = parseJSON(await claude(`Write a 30-second ad script.
CONCEPT: ${concept.title} — ${concept.theme}
PRODUCT: ${analysis.heroProduct}, TONE: ${analysis.websiteTone}
~70 words spoken. Respond ONLY with JSON (no markdown):
{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":""}`, 800))

    // Visual direction
    const direction = parseJSON(await claude(`1 visual direction for this campaign.
CONCEPT: ${concept.title}, TONE: ${analysis.websiteTone}
Respond ONLY with JSON (no markdown):
{"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","cinematicReference":"","summary":""}`, 600))

    // Avatar prompt
    const avatarPrompt = parseJSON(await claude(`1 avatar portrait prompt.
CONCEPT: ${concept.title}, STYLE: ${direction.colorWorld} ${direction.lighting}
TARGET: ${analysis.targetCustomer}
Chest-up portrait, clear face, neutral background.
Respond ONLY with JSON (no markdown):
{"label":"","imagePrompt":""}`, 400))

    console.log(`Concept ${conceptIdx + 1}: generating avatar`)
    const avatarDataUrl = await generateImage(
      avatarPrompt.imagePrompt + ' Chest-up portrait, editorial photography, neutral background. No text.',
      { aspectRatio: '3:4' }
    )
    const avatarUrl = await uploadToStorage(avatarDataUrl, `samples/${clientId}/c${conceptIdx}-avatar`)



    // Shot list — 8 scenes
    const SCENE_COUNT = 8
    const shotList = parseJSON(await claude(`${SCENE_COUNT} shots for a 30-second ad.
CAMPAIGN: ${concept.title}, DIRECTION: ${direction.colorWorld} ${direction.lighting}
CHARACTER: ${avatarPrompt.label}, SCRIPT: "${script.fullScript}", FORMAT: ${aspectRatio}
Vary shot types cinematically: EWS, WS, MS, MCU, CU, ECU, INSERT, CUTAWAY
Open wide, build close, mix throughout.
Respond ONLY with JSON array of exactly ${SCENE_COUNT} (no markdown):
[{"sceneIndex":0,"shotType":"","scriptMoment":"","action":"","environment":"","cameraMove":"","mood":"","imagePrompt":""}]`, 3000))

    console.log(`Concept ${conceptIdx + 1}: generating ${SCENE_COUNT} scenes in 2 batches`)

    // Generate in 2 batches of 4 — parallel within each batch, sequential between batches
    const sceneResultsFlat = new Array(SCENE_COUNT).fill(null)

    for (let batchStart = 0; batchStart < SCENE_COUNT; batchStart += 4) {
      const batch = shotList.slice(batchStart, batchStart + 4)
      const batchResults = await Promise.allSettled(
        batch.map(async (shot, bi) => {
          const prompt = `${shot.imagePrompt}
Character: ${avatarPrompt.label} — match reference portrait exactly.
Shot: ${shot.shotType}. Camera: ${shot.cameraMove}.
${direction.colorWorld}, ${direction.lighting}. Cinematic, photorealistic. No text.`
          const imageUrl = await generateImage(prompt, { avatarUrl, aspectRatio })
          return { imageUrl, loading: false, shot }
        })
      )
      batchResults.forEach((r, bi) => {
        sceneResultsFlat[batchStart + bi] = r.status === 'fulfilled'
          ? r.value
          : { imageUrl: null, loading: false, shot: shotList[batchStart + bi] }
      })
      console.log(`Concept ${conceptIdx + 1}: batch ${batchStart / 4 + 1} done`)
    }

    const scenes = sceneResultsFlat

    // Save to Supabase
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
      scenes,
      aspect_ratio: aspectRatio,
      concept_title: concept.title,
    }).select('id').single()

    if (error) throw error

    console.log(`Concept ${conceptIdx + 1} saved: ${saved.id}`)
    return Response.json({ success: true, campaignId: saved.id, conceptTitle: concept.title })

  } catch (error) {
    console.error('Sample generate error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
