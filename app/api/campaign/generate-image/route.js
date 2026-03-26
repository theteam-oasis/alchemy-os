export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt } = body

    console.log('generate-image called, prompt:', prompt ? prompt.slice(0, 80) : 'MISSING')

    if (!prompt || prompt.trim() === '') {
      return Response.json({ success: false, error: 'No prompt provided' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    console.log('API key present:', !!apiKey)

    if (!apiKey) {
      return Response.json({ success: false, error: 'GOOGLE_API_KEY not set' }, { status: 500 })
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    })

    const responseText = await response.text()
    console.log('Google API status:', response.status)
    console.log('Google response preview:', responseText.slice(0, 200))

    if (!response.ok) {
      return Response.json({ success: false, error: `Google API ${response.status}: ${responseText.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData)

    if (!imagePart) {
      return Response.json({ success: false, error: `No image returned. Parts found: ${JSON.stringify(parts.map(p => Object.keys(p)))}` }, { status: 500 })
    }

    const dataUrl = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`
    return Response.json({ success: true, imageUrl: dataUrl })

  } catch (error) {
    console.error('generate-image exception:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
