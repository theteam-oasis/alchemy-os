// Express product-info auto-fill: takes a product page URL, fetches the page,
// extracts readable text + meta tags + image URLs, and asks Claude to derive
// product name, description, target market, problems solved, and unique features.
// Used by the "Express mode" in the New Product modal.

export const dynamic = "force-dynamic";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

// Pull product-style images from <img src> + og:image. Heuristic: skip tracking
// pixels, logos, common icon paths. Take up to 8 candidates.
function extractImages(html, baseUrl) {
  const found = new Set();
  const og = extractMeta(html, "og:image");
  if (og) found.add(og);
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (!src) continue;
    if (/data:|svg\+xml/i.test(src)) continue;
    if (/(logo|icon|favicon|sprite|spinner|loader|pixel|tracker)/i.test(src)) continue;
    if (src.length > 600) continue;
    let abs = src;
    try {
      abs = new URL(src, baseUrl).href;
    } catch { continue; }
    found.add(abs);
    if (found.size >= 12) break;
  }
  return Array.from(found).slice(0, 8);
}

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Claude error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text || "";
  // Best-effort JSON parse - find the first { ... } block
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return Response.json({ error: "url required" }, { status: 400 });

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    let html = "";
    try {
      const res = await fetch(normalized, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; AlchemyBot/1.0; +https://scalewithalchemy.com)",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (e) {
      return Response.json({ error: `Couldn't fetch ${normalized}: ${e.message}` }, { status: 502 });
    }

    const title = extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const ogTitle = extractMeta(html, "og:title");
    const text = stripHtml(html).slice(0, 8000); // cap context for Claude
    const images = extractImages(html, normalized);

    const prompt = `You are a product strategist. Extract structured product info from this product page.

URL: ${normalized}
Title: ${title || ogTitle || "(unknown)"}
Meta description: ${description || "(none)"}

Page text (truncated):
${text}

Return ONLY valid JSON in this exact shape:
{
  "name": "Short product name (2-4 words max)",
  "description": "1-2 sentences explaining what the product is",
  "targetMarket": "1-2 sentences describing who buys this product",
  "problemsSolved": "1-2 sentences describing the pain points it solves",
  "uniqueFeatures": ["3-5 short bullet points of what makes it unique"],
  "pricePoint": "e.g. '$49' or 'Mid-range' if a price is mentioned, else null"
}

Be concise and specific. If a field can't be inferred, return an empty string for it (or empty array).`;

    const ai = await callClaude(prompt);
    if (!ai) {
      return Response.json({
        error: "Couldn't extract product info from that page.",
        hints: { title, description, images },
      }, { status: 500 });
    }

    return Response.json({
      product: {
        name: ai.name || ogTitle || title || "",
        description: ai.description || "",
        targetMarket: ai.targetMarket || "",
        problemsSolved: ai.problemsSolved || "",
        uniqueFeatures: Array.isArray(ai.uniqueFeatures) ? ai.uniqueFeatures : [],
        pricePoint: ai.pricePoint || "",
        productUrl: normalized,
        candidateImageUrls: images,
      },
    });
  } catch (e) {
    console.error("[products/scrape]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
