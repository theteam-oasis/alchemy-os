import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const runtime = 'nodejs'
export const maxDuration = 120

async function fetchBase64(input) {
  // Handle both data URLs and http URLs
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return { mimeType: match[1], data: match[2] }
  } else {
    // It's a URL — fetch it
    try {
      const res = await fetch(input)
      const buf = await res.arrayBuffer()
      return {
        mimeType: res.headers.get('content-type') || 'image/jpeg',
        data: Buffer.from(buf).toString('base64')
      }
    } catch { return null }
  }
}

async function uploadToStorage(dataUrl, path) {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const buffer = Buffer.from(match[2], 'base64')
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
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

async function generateSceneImage(prompt, references, aspectRatio) {
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]

  for (const ref of references) {
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
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { imageSize: '2K', aspectRatio }
          },
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
    const { scene, sceneIndex, aspectRatio, productImage, avatarImage, envImage, sessionId } = await request.json()

    // Build reference list — accept both data URLs and storage URLs
    const refInstructions = []
    const references = []

    if (avatarImage) {
      refInstructions.push('Use the provided portrait as the character — maintain exact appearance.')
      references.push(avatarImage)
    }
    if (envImage) {
      refInstructions.push('Use the provided image as the environment/setting reference.')
      references.push(envImage)
    }
    if (productImage) {
      refInstructions.push('Feature the provided product prominently — maintain exact product appearance.')
      references.push(productImage)
    }

    const prompt = `${scene.imagePrompt}. ${refInstructions.join(' ')} ${aspectRatio === '9:16' ? 'Vertical 9:16.' : 'Widescreen 16:9.'} Cinematic, photorealistic, 2K. No text or watermarks.`

    // Generate 2 options in parallel
    const [raw1, raw2] = await Promise.all([
      generateSceneImage(prompt, references, aspectRatio),
      generateSceneImage(prompt + ' Slightly different angle and composition.', references, aspectRatio),
    ])

    // Upload to storage so response isn't massive base64
    const sid = sessionId || `sb-${Date.now()}`
    const [url1, url2] = await Promise.all([
      raw1 ? uploadToStorage(raw1, `storyboard/${sid}/scene-${sceneIndex}-a`) : null,
      raw2 ? uploadToStorage(raw2, `storyboard/${sid}/scene-${sceneIndex}-b`) : null,
    ])

    // Return storage URLs if upload succeeded, else fall back to data URLs
    return Response.json({
      options: [url1 || raw1, url2 || raw2].filter(Boolean)
    })

  } catch (e) {
    console.error('Generate scene error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
