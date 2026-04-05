import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 120

async function fetchBase64(input) {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return { mimeType: match[1], data: match[2] }
  }
  try {
    const res = await fetch(input)
    const buf = await res.arrayBuffer()
    return { mimeType: res.headers.get('content-type') || 'image/jpeg', data: Buffer.from(buf).toString('base64') }
  } catch { return null }
}

async function uploadToStorage(dataUrl, path) {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const { error } = await supabase.storage.from('brand-assets').upload(`${path}.${ext}`, Buffer.from(match[2], 'base64'), { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(`${path}.${ext}`)
    return publicUrl
  } catch (e) {
    console.error('Upload failed:', e.message)
    return null
  }
}

async function generateSceneImage(prompt, refs, aspectRatio) {
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]
  for (const ref of refs) {
    if (ref) {
      const b64 = await fetchBase64(ref)
      if (b64) parts.push({ inlineData: b64 })
    }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { imageSize: '2K', aspectRatio } },
        }),
      }
    )
    const text = await res.text()
    if (!res.ok) {
      if (attempt < 2 && (res.status === 500 || res.status === 503)) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
        continue
      }
      throw new Error(`Google API ${res.status}: ${text.slice(0, 100)}`)
    }
    const data = JSON.parse(text)
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part) throw new Error('No image')
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
  }
}

export async function POST(request) {
  try {
    const { scene, sceneIndex, aspectRatio, productImage, avatarImage, envImage, sessionId, avatarDescription, envDescription } = await request.json()

    // Build a coherent, specific prompt
    const refs = []
    const refLines = []

    if (avatarImage) {
      refs.push(avatarImage)
      refLines.push(`CHARACTER: Use the provided portrait EXACTLY — same face, hair, outfit, skin. This is ${avatarDescription || 'the main character'}.`)
    }
    if (envImage) {
      refs.push(envImage)
      refLines.push(`ENVIRONMENT: Use the provided image as the setting — ${envDescription || 'the environment'}.`)
    }
    if (productImage) {
      refs.push(productImage)
      refLines.push(`PRODUCT: Feature the provided product with exact appearance maintained.`)
    }

    const prompt = [
      `Cinematic ${aspectRatio === '9:16' ? '9:16 vertical' : '16:9 widescreen'} ad scene.`,
      `SCENE ACTION: ${scene.imagePrompt}`,
      ...refLines,
      `STYLE: Photorealistic, 2K quality, cinematic lighting, high production value.`,
      `CRITICAL: The character must look IDENTICAL to the reference portrait — same person throughout the campaign. No text or watermarks.`,
    ].join(' ')

    const altPrompt = [
      `Cinematic ${aspectRatio === '9:16' ? '9:16 vertical' : '16:9 widescreen'} ad scene, alternative composition.`,
      `SCENE ACTION: ${scene.imagePrompt} — slightly different angle or framing.`,
      ...refLines,
      `STYLE: Photorealistic, 2K quality, cinematic lighting.`,
      `CRITICAL: Same character as reference portrait, identical appearance. No text or watermarks.`,
    ].join(' ')

    // Generate 2 options in parallel
    const [raw1, raw2] = await Promise.all([
      generateSceneImage(prompt, refs, aspectRatio),
      generateSceneImage(altPrompt, refs, aspectRatio),
    ])

    // Upload outputs to storage
    const sid = sessionId || `sb-${Date.now()}`
    const [url1, url2] = await Promise.all([
      raw1 ? uploadToStorage(raw1, `storyboard/${sid}/scene-${sceneIndex}-a`) : null,
      raw2 ? uploadToStorage(raw2, `storyboard/${sid}/scene-${sceneIndex}-b`) : null,
    ])

    return Response.json({ options: [url1 || raw1, url2 || raw2].filter(Boolean) })
  } catch (e) {
    console.error('Generate scene error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
