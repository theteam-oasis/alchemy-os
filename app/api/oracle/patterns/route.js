export async function POST(req) {
  const { dataContext } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const prompt = `You are Oracle, a creative strategist. Analyze the patterns in this marketing data and return ONLY a JSON object (no markdown).

${dataContext}

Look for performance patterns across:
- Asset Type (Video, Image, Carousel, UGC). which formats win?
- Hook angle (Testimonial, Demo, Founder Story, Promo, Before/After). which messaging works?
- Placement (Reels, Feed, Stories, Advantage+). where does each format perform best?

STRICT RULES:
- Each insight must reference SPECIFIC categorical values from the data with 2+ numbers
- Compare items WITHIN the dataset, never to "industry benchmarks"
- Be confident about winners and clear about losers

Return exactly:
{
  "patterns": [
    {"dimension": "Asset Type|Hook|Placement", "winner": "...", "headline": "...", "detail": "...", "lift": "..."}
  ]
}

- 3-5 patterns total
- dimension: which axis the pattern is about
- winner: the specific value that wins on this axis
- headline: 6-12 words, e.g. "Video creatives crush Image at 2.1x ROAS"
- detail: <30 words, cite 2+ specific numbers
- lift: short phrase quantifying the edge, e.g. "+89% ROAS vs Image", "3.4x more conversions"`;

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
        max_tokens: 700,
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
      return Response.json({ patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 6) : [] });
    } catch {
      return Response.json({ patterns: [] });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
