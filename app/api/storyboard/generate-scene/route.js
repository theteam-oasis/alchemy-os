export const runtime = 'nodejs'
export const maxDuration = 120

async function fetchBase64(dataUrl) {
  // dataUrl is already base64
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

async function generateSceneImage(prompt, references, aspectRatio) {
  const apiKey = process.env.GOOGLE_API_KEY
  const parts = [{ text: prompt }]

  // Add reference images in order: avatar first, then environment, then product
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
    const { scene, sceneIndex, aspectRatio, productImage, avatarImage, envImage } = await request.json()

    // Build prompt
    const refInstructions = []
    const references = []

    if (avatarImage) {
      refInstructions.push('Use the provided portrait as the character reference — maintain exact appearance.')
      references.push(avatarImage)
    }
    if (envImage) {
      refInstructions.push('Use the provided environment image as the setting reference.')
      references.push(envImage)
    }
    if (productImage) {
      refInstructions.push('Feature the provided product image prominently — maintain exact product appearance.')
      references.push(productImage)
    }

    const prompt = `${scene.imagePrompt}. ${refInstructions.join(' ')} ${aspectRatio === '9:16' ? 'Vertical 9:16 format.' : 'Widescreen 16:9 format.'} Cinematic, photorealistic, 2K quality. No text or watermarks.`

    // Generate 2 options in parallel
    const [opt1, opt2] = await Promise.all([
      generateSceneImage(prompt, references, aspectRatio),
      generateSceneImage(prompt + ' Slightly different angle and composition.', references, aspectRatio),
    ])

    return Response.json({ options: [opt1, opt2].filter(Boolean) })
  } catch (e) {
    console.error('Generate scene error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
