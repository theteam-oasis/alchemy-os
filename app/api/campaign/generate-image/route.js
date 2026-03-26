export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt, referenceImageBase64, referenceMimeType, productImageBase64, productMimeType, aspectRatio, imageSize } = body

    if (!prompt || prompt.trim() === '') {
      return Response.json({ success: false, error: 'No prompt provided' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return Response.json({ success: false, error: 'GOOGLE_API_KEY not set' }, { status: 500 })
    }

    console.log('Generating image | size:', imageSize || '2K', '| aspect:', aspectRatio || '16:9', '| avatar ref:', !!referenceImageBase64, '| product ref:', !!productImageBase64)

    // Build parts array — text prompt first, then reference images
    const parts = [{ text: prompt }]

    // Avatar reference image for character consistency
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: referenceMimeType || 'image/png',
          data: referenceImageBase64,
        }
      })
    }

    // Product reference image
    if (productImageBase64) {
      parts.push({
        inlineData: {
          mimeType: productMimeType || 'image/jpeg',
          data: productImageBase64,
        }
      })
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            imageSize: imageSize || '2K',
            aspectRatio: aspectRatio || '16:9',
          }
        },
      }),
    })

    const responseText = await response.text()
    console.log('Google API status:', response.status)

    if (!response.ok) {
      return Response.json({ success: false, error: `Google API ${response.status}: ${responseText.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const resParts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = resParts.find(p => p.inlineData)

    if (!imagePart) {
      return Response.json({ success: false, error: `No image returned. Parts: ${JSON.stringify(resParts.map(p => Object.keys(p)))}` }, { status: 500 })
    }

    const dataUrl = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`
    return Response.json({ success: true, imageUrl: dataUrl })

  } catch (error) {
    console.error('generate-image exception:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
