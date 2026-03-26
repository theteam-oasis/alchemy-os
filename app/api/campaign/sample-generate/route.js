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

async function claude(prompt, maxTokens = 2048) {
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

// This route handles ONE concept at a time
// The frontend calls it 4 times in parallel
export async function POST(request) {
  try {
    const { 
      clientId, analysis, concept, conceptIdx,
      websiteUrl, productName, offerNotes,
      creativeKeywords, aspectRatio = '16:9'
    } = await request.json()

    console.log(`Building concept ${conceptIdx + 1}: ${concept.title}`)

    // Script
    const scriptText = await claude(`Write 1 production-ready 30-second ad script.
CONCEPT: ${concept.title} — ${concept.theme}
PRODUCT: ${analysis.heroProduct}
TRANSFORMATION: ${analysis.desiredTransformation}
TONE: ${analysis.websiteTone}
~70 spoken words. Real voiceover lines only.
Respond ONLY with JSON (single object):
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
    const avatarPromptText = await claude(`Generate 1 avatar portrait prompt.
CONCEPT: ${concept.title}
STYLE: ${direction.colorWorld}, ${direction.lighting}
TARGET: ${analysis.targetCustomer}
Chest-up portrait, clear face and outfit, neutral background, editorial photography.
Respond ONLY with JSON (single object):
{"label":"","imagePrompt":""}`)
    const avatarPrompt = parseJSON(avatarPromptText)

    // Generate avatar image
    const avatarDataUrl = await generateImage(
      avatarPrompt.imagePrompt + ' Chest-up portrait, editorial photography, neutral background. No text.',
      { aspectRatio: '3:4' }
    )

    // Upload avatar
    const avatarUrl = await uploadToStorage(avatarDataUrl, `samples/${clientId}/concept-${conceptIdx}-avatar`)

    // Shot list — 6 scenes for samples (faster)
    const sceneCount = 6
    const shotListText = await claude(`Create ${sceneCount} shots for a 30-second commercial.
CAMPAIGN: ${concept.title} — ${concept.theme}
DIRECTION: ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
CHARACTER: ${avatarPrompt.label}
SCRIPT: "${script.fullScript}"
FORMAT: ${aspectRatio}
Vary shot types: ECU, CU, MCU, MS, WS, EWS, INSERT
Respond ONLY with JSON array of exactly ${sceneCount}:
[{"sceneIndex":0,"shotType":"","scriptMoment":"","action":"","environment":"","cameraMove":"","mood":"","isProductShot":false,"imagePrompt":""}]`, 4000)
    const shotList = parseJSON(shotListText)

    // Generate scene images in batches of 3
    const sceneResults = new Array(shotList.length).fill(null)
    for (let i = 0; i < shotList.length; i += 3) {
      const batch = shotList.slice(i, i + 3)
      const results = await Promise.allSettled(
        batch.map(async (shot, bi) => {
          const prompt = `${shot.imagePrompt}
Character: ${avatarPrompt.label} — maintain exact appearance from reference.
Shot: ${shot.shotType}. Camera: ${shot.cameraMove}.
${direction.colorWorld}, ${direction.lighting}. Cinematic, photorealistic. No text, no watermarks.`
          const imageUrl = await generateImage(prompt, { avatarUrl, aspectRatio })
          return { imageUrl, loading: false, shot }
        })
      )
      results.forEach((r, bi) => {
        sceneResults[i + bi] = r.status === 'fulfilled'
          ? r.value
          : { imageUrl: null, loading: false, shot: shotList[i + bi] }
      })
    }

    // Save to Supabase
    const { data: saved, error } = await supabase
      .from('campaigns')
      .insert({
        client_id: clientId,
        status: 'complete',
        storyboard_complete: true,
        website_url: websiteUrl,
        product_name: productName,
        offer_notes: offerNotes,
        creative_keywords: creativeKeywords ? creativeKeywords.split(',').map(k => k.trim()) : [],
        website_analysis: analysis,
        chosen_concept: concept,
        script_duration: 30,
        chosen_script: script,
        chosen_direction: direction,
        chosen_avatar: avatarDataUrl,
        scenes: sceneResults,
        aspect_ratio: aspectRatio,
        concept_title: concept.title,
      })
      .select('id')
      .single()

    if (error) throw error

    console.log(`Concept ${conceptIdx + 1} complete: ${saved.id}`)
    return Response.json({ success: true, campaignId: saved.id, conceptTitle: concept.title })

  } catch (error) {
    console.error('Sample generate error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
