export const runtime = 'nodejs'
export const maxDuration = 60

async function generateImage(prompt, aspectRatio = '9:16') {
  const apiKey = process.env.GOOGLE_API_KEY
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { imageSize: '2K', aspectRatio },
          },
        }),
      }
    )
    const text = await res.text()
    if (!res.ok) {
      // Retry on 429 (rate limit), 500, 503 with backoff
      if (attempt < 3 && (res.status === 429 || res.status === 500 || res.status === 503)) {
        const wait = res.status === 429 ? (attempt + 1) * 8000 : (attempt + 1) * 3000
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw new Error(`Google API ${res.status}`)
    }
    const data = JSON.parse(text)
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part) throw new Error('No image returned')
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
  }
}

export async function POST(request) {
  try {
    const { prompt, type, aspectRatio = '9:16' } = await request.json()
    const imgAspect = type === 'avatar' ? '3:4' : aspectRatio
    let imagePrompt = prompt
    if (type === 'avatar') {
      imagePrompt = `${prompt}. Chest-up portrait, editorial photography, clean neutral background, cinematic lighting, photorealistic. No text.`
    } else {
      imagePrompt = `${prompt}. Cinematic environment, photorealistic, no people, no text. ${aspectRatio === '9:16' ? 'Vertical format.' : 'Widescreen format.'}`
    }
    const imageUrl = await generateImage(imagePrompt, imgAspect)
    return Response.json({ imageUrl })
  } catch (e) {
    console.error('Asset generation error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
