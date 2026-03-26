export async function POST(request) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return Response.json({ success: false, error: 'No prompt provided' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return Response.json({ success: false, error: 'GOOGLE_API_KEY not set' }, { status: 500 })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Google API error:', errText)
      return Response.json({ success: false, error: `Google API error: ${response.status} — ${errText}` }, { status: 500 })
    }

    const data = await response.json()

    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData)

    if (!imagePart) {
      console.error('No image in response:', JSON.stringify(data))
      return Response.json({ success: false, error: 'No image returned from Nano Banana 2' }, { status: 500 })
    }

    const { data: imageBase64, mimeType } = imagePart.inlineData
    const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBase64}`

    return Response.json({ success: true, imageUrl: dataUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
