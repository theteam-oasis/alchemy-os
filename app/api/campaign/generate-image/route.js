export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt, avatarImageUrl, productImageUrl, aspectRatio, imageSize } = body

    if (!prompt || prompt.trim() === '') {
      return Response.json({ success: false, error: 'No prompt provided' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return Response.json({ success: false, error: 'GOOGLE_API_KEY not set' }, { status: 500 })
    }

    console.log('Generating | size:', imageSize || '2K', '| aspect:', aspectRatio || '16:9', '| avatar url:', !!avatarImageUrl, '| product url:', !!productImageUrl)

    // Build parts. text first, then fetch reference images by URL server-side
    const parts = [{ text: prompt }]

    // Fetch avatar reference image from URL (avoids huge base64 in request body)
    if (avatarImageUrl) {
      try {
        const imgRes = await fetch(avatarImageUrl)
        const imgBuffer = await imgRes.arrayBuffer()
        const imgBase64 = Buffer.from(imgBuffer).toString('base64')
        const mimeType = imgRes.headers.get('content-type') || 'image/png'
        parts.push({ inlineData: { mimeType, data: imgBase64 } })
      } catch (e) {
        console.error('Failed to fetch avatar image:', e.message)
      }
    }

    // Fetch product reference image from URL
    if (productImageUrl) {
      try {
        const imgRes = await fetch(productImageUrl)
        const imgBuffer = await imgRes.arrayBuffer()
        const imgBase64 = Buffer.from(imgBuffer).toString('base64')
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        parts.push({ inlineData: { mimeType, data: imgBase64 } })
      } catch (e) {
        console.error('Failed to fetch product image:', e.message)
      }
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
