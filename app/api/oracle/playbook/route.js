export async function POST(req) {
  const { dataContext } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const prompt = `You are Oracle, a marketing coach. Below is a client's data. Return ONLY a JSON object (no markdown).

${dataContext}

STRICT RULES:
- Every "title" must name a SPECIFIC ad set / placement from the data
- Every "why" must cite 2+ specific numbers
- No "industry benchmarks" — only compare items in this dataset

Return exactly:
{
  "playbook": [
    {"action":"scale|cut|shift|test","title":"...","why":"...","impact":"..."}
  ]
}

- Exactly 3 top actions ranked by dollar impact
- title: 6-10 words naming a specific thing
- why: one sentence with 2+ numbers
- impact: short dollar phrase, e.g. "+$215K revenue/mo", "Save $52K/mo"`;

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
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

    const text = (data.content || []).map(c => c.text || "").join("\n").trim();
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(cleaned);
      return Response.json({ playbook: Array.isArray(parsed.playbook) ? parsed.playbook.slice(0, 4) : [] });
    } catch {
      return Response.json({ playbook: [] });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
