export async function POST(req) {
  const { prompt } = await req.json()
  
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    
    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 })
    }

    const text = data.content.map(c => c.text || '').join('\n')

    try {
      // Strip markdown fences first
      let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      // If there's extra text around the JSON, extract the outermost { ... }
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1)
      }
      const parsed = JSON.parse(cleaned)
      return Response.json({ result: parsed })
    } catch {
      // If JSON parsing fails, return the raw text as the result
      // This handles cases like brandSummary which is a plain string
      return Response.json({ result: text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() })
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
