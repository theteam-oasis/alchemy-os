export async function POST(req) {
  const { dataContext } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const prompt = `You are Oracle, a marketing coach. Analyze this data and respond with ONLY a JSON object (no markdown).

${dataContext}

STRICT RULES:
- Every headline/title must name a SPECIFIC ad set / placement / metric from the data
- Every detail must cite 2+ specific numbers ($ or %)
- No "industry benchmarks" — only compare items in this dataset
- Be willing to call out specific underperformers by name

Return exactly this shape:
{
  "playbook": [
    {"action":"scale|cut|shift|test","title":"...","why":"...","impact":"..."}
  ],
  "opportunities": [
    {"headline":"...","detail":"...","severity":"positive","actionTag":"SCALE IT|TEST IT","actionDetail":"..."}
  ],
  "warnings": [
    {"headline":"...","detail":"...","severity":"mild|severe","actionTag":"CUT IT|FIX IT|WATCH IT","actionDetail":"..."}
  ]
}

- playbook: exactly 3 top actions with dollar impact in "impact"
- opportunities: 3 specific wins
- warnings: 2-3 concerns (underperformers, wasted spend)
- headline: 5-10 words, names a specific thing
- detail: <25 words with 2+ numbers
- actionDetail: <12 words, specific $ or % move`;

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
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 });
    }

    const text = (data.content || []).map(c => c.text || "").join("\n").trim();
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(cleaned);
      return Response.json({
        playbook: Array.isArray(parsed.playbook) ? parsed.playbook.slice(0, 4) : [],
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 4) : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 4) : [],
      });
    } catch {
      return Response.json({ playbook: [], opportunities: [], warnings: [], raw: text });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
