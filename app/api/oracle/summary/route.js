export async function POST(req) {
  const { dataContext } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const prompt = `You are Oracle, an AI marketing analyst. Below is a client's marketing data summary:

${dataContext}

Write a 1-2 sentence at-a-glance summary in plain English, like you're texting the client. Reference specific numbers from the data.

Also rate overall campaign health 0-100:
- 80-100: crushing it
- 60-79: solid, with optimization room
- 40-59: mixed, needs attention
- 0-39: urgent problems

Return ONLY a JSON object, no markdown:
{"text": "...", "health": 82}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

    const text = (data.content || []).map(c => c.text || "").join("\n").trim();
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    try {
      const parsed = JSON.parse(cleaned);
      return Response.json({ summary: parsed });
    } catch {
      return Response.json({ summary: null, raw: text });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
