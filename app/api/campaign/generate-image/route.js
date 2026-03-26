import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })

export async function POST(request) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return Response.json({ success: false, error: 'No prompt provided' }, { status: 400 })
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['Text', 'Image'],
      },
    })

    let imageBase64 = null
    let mimeType = 'image/png'

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data
        mimeType = part.inlineData.mimeType || 'image/png'
        break
      }
    }

    if (!imageBase64) {
      throw new Error('No image returned from Nano Banana 2')
    }

    // Return as data URL so frontend can display without saving to disk
    const dataUrl = `data:${mimeType};base64,${imageBase64}`

    return Response.json({ success: true, imageUrl: dataUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
