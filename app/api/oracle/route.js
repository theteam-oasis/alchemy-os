export async function POST(req) {
  const { question, dataContext, history } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const systemPrompt = `You are Oracle, an AI marketing analyst built into the Alchemy marketing dashboard. You help clients understand their marketing performance data.

You have access to the following campaign dataset summary:
${dataContext}

Guidelines:
- Be concise, direct and confident. Use plain English. no jargon unless the user uses it first.
- Reference specific numbers from the data when answering.
- If asked about trends, compare periods (e.g. first half vs second half).
- If the question is about a metric or dimension not in the data, say so honestly.
- Format responses in short paragraphs. Use bullet points for lists of 3+ items. Use **bold** for key numbers.
- Keep responses under 180 words unless the user explicitly asks for depth.
- Sound like a sharp marketing consultant. observations, not a data dump.
- If the question is off-topic (not about the marketing data), politely redirect back to the data.`;

  const messages = [];
  if (Array.isArray(history)) {
    history.slice(-10).forEach(h => {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: h.content });
      }
    });
  }
  messages.push({ role: "user", content: question });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await res.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 });
    }

    const text = (data.content || []).map(c => c.text || "").join("\n").trim();
    return Response.json({ answer: text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
