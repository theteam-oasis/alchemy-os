// Per-tile regenerate. Mirrors the proposal/create regenerate UX: user clicks
// the refresh button on a single generated tile, we re-run that one
// (headline × imagePrompt) cell with the same brand context, then swap the
// new image into the portal_projects.images and static_gen_jobs.images arrays
// by id. Single-shot — fits inside one Vercel invocation, no chaining needed.
//
// Body: {
//   clientId, productId?, headline, imagePrompt,
//   imageId, // existing image id to replace; if missing, a new id is appended
//   aspectRatio?, referenceImageUrl?, jobId?, portalSlug?
// }

import { supabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gemini-3.1-flash-image-preview";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ATTEMPTS = [
  { timeout: 180000, rewritePrompt: false },
  { timeout: 180000, rewritePrompt: false },
  { timeout: 180000, rewritePrompt: true  },
  { timeout: 180000, rewritePrompt: false },
  { timeout: 180000, rewritePrompt: true  },
  { timeout: 180000, rewritePrompt: false },
  { timeout: 180000, rewritePrompt: true  },
  { timeout: 180000, rewritePrompt: false },
];

async function generateImageOnce(prompt, productImageBase64, productMimeType, timeoutMs, aspectRatio) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const parts = productImageBase64
    ? [
        { inlineData: { mimeType: productMimeType || "image/jpeg", data: productImageBase64 } },
        { text: prompt },
      ]
    : [{ text: prompt }];
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio },
          },
        }),
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error("No image returned from Gemini");
    return { mime: part.inlineData.mimeType, base64: part.inlineData.data };
  } finally {
    clearTimeout(timer);
  }
}

async function regenerateStaticPrompt({ brand, product, headline, prevPrompt, aspectRatio, hasReferenceImage = false }) {
  const ctx = [
    product?.name ? `Product: ${product.name}` : null,
    product?.description ? `Description: ${product.description}` : null,
    brand?.brand_colors ? `Brand colors: ${brand.brand_colors}` : null,
    brand?.personality_tags?.length ? `Personality: ${brand.personality_tags.join(", ")}` : null,
    brand?.audience_description ? `Audience: ${brand.audience_description}` : null,
    brand?.voice_style?.length ? `Voice: ${brand.voice_style.join(", ")}` : null,
  ].filter(Boolean).join("\n");
  const refRules = hasReferenceImage
    ? `\nIMPORTANT — REFERENCE IMAGE IS ATTACHED:\nThe new prompt MUST keep these rules:\n- Treat the inline reference image as the EXACT product.\n- Do NOT describe the product visually — let the image handle it.\n- Do NOT instruct Gemini to redesign or restyle the product.\n- End with: "Use attached image as product reference."`
    : `\nNOTE: No reference image attached. Describe the product in precise visual detail.`;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are rewriting a single image-generation prompt for a static social ad. The previous prompt failed (likely safety filter, complexity, or transient API issue). Write a NEW visual variation: same shot intent, same brand voice, but different angle / composition / lighting / background / framing. Keep it photorealistic and premium.${refRules}\n\nBrand context:\n${ctx}\n\nHeadline that will be overlaid on the image: "${headline}"\nAspect ratio: ${aspectRatio}\nPrevious (failed) prompt:\n${prevPrompt}\n\nReturn ONLY a JSON object: {"imagePrompt": "..."} — no markdown, no preamble.`,
        },
      ],
    });
    const text = msg?.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.imagePrompt) return String(parsed.imagePrompt);
    }
  } catch (e) {
    console.error("[regenerateStaticPrompt] failed", e?.message);
  }
  return prevPrompt;
}

async function generateWithRetries({ initialPrompt, productImageBase64, productMimeType, aspectRatio, brand, product, headline }) {
  let activePrompt = initialPrompt;
  let lastErr = null;
  const hasReferenceImage = !!productImageBase64;
  for (let attempt = 1; attempt <= ATTEMPTS.length; attempt++) {
    const cfg = ATTEMPTS[attempt - 1];
    if (cfg.rewritePrompt) {
      activePrompt = await regenerateStaticPrompt({ brand, product, headline, prevPrompt: activePrompt, aspectRatio, hasReferenceImage });
    }
    try {
      return await generateImageOnce(activePrompt, productImageBase64, productMimeType, cfg.timeout, aspectRatio);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      const is429 = /429|rate limit|quota/i.test(msg);
      if (attempt < ATTEMPTS.length) {
        await new Promise((r) => setTimeout(r, is429 ? 60000 : 5000));
      }
    }
  }
  throw lastErr || new Error("Image generation failed after 8 attempts");
}

function buildPrompt({ headline, imagePrompt, brand, product, aspectRatio, hasReferenceImage = false }) {
  const colors = brand?.brand_colors ? `Brand colors: ${brand.brand_colors}.` : "";
  const personality = brand?.personality_tags?.length ? `Brand personality: ${brand.personality_tags.join(", ")}.` : "";
  const audience = brand?.audience_description ? `Target audience: ${brand.audience_description}.` : "";
  const voice = brand?.voice_style?.length ? `Tone of voice: ${brand.voice_style.join(", ")}.` : "";
  const spokesperson = [
    brand?.influencer_age ? `age ${brand.influencer_age}` : null,
    brand?.influencer_gender,
    brand?.influencer_ethnicity,
    brand?.influencer_style ? `${brand.influencer_style} style` : null,
  ].filter(Boolean).join(", ");
  const spokes = spokesperson ? `Spokesperson: ${spokesperson}.` : "";

  if (hasReferenceImage) {
    return `
TASK: Create a high-converting social media ad using the provided reference image as the literal product.

CRITICAL — PRODUCT FIDELITY:
- The first input is a reference photo of the EXACT product to feature.
- Render the product EXACTLY as shown in the reference: same shape, colors, packaging, label text, logo, material, finish, proportions.
- Do NOT redesign, restyle, recolor, or "improve" the product. Do NOT change the label, font, or branding on the product.
- Place this exact product into the scene described below.

SCENE / VISUAL DIRECTION:
${imagePrompt}

BRAND CONTEXT:
${colors}
${personality}
${audience}
${voice}
${spokes}

HEADLINE OVERLAY (bold, legible, well-placed for the ${aspectRatio} format):
"${headline}"

FORMAT: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
STYLE: photorealistic, premium, on-brand. Headline rendered as clean overlay text, readable and visually integrated, not a watermark.

Use attached image as product reference. Render that exact product, in the scene described above, with the headline overlaid.
`.trim();
  }

  const productLine = product
    ? `Product: ${product.name}${product.description ? ` — ${product.description}` : ""}.`
    : "";
  return `
Create a high-converting social media ad creative.

${productLine}
${colors}
${personality}
${audience}
${voice}
${spokes}

Visual direction: ${imagePrompt}

Headline overlay (bold, legible, well-placed for the ${aspectRatio} format): "${headline}"

Format: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
Style: photorealistic, premium, on-brand, with the headline rendered cleanly as overlay text.
The headline must be readable and visually integrated, not a watermark.
NOTE: No reference image attached. Render the product in precise visual detail based on the description above.
`.trim();
}

async function fetchUrlAsBase64(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "image/jpeg";
    return { base64: buf.toString("base64"), mime };
  } catch (e) {
    console.error("[regen-one refImage] fetch failed", url, e?.message);
    return null;
  }
}

async function uploadBase64(base64, mime, projectId) {
  const ext = mime?.includes("png") ? "png" : mime?.includes("webp") ? "webp" : "jpg";
  const path = `portal/${projectId}/static-gen/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");
  const { error } = await supabase.storage
    .from("brand-assets")
    .upload(path, buffer, { contentType: mime, cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return { url: publicUrl, path };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      clientId, productId,
      headline, imagePrompt,
      imageId,
      aspectRatio = "1:1",
      referenceImageUrl = "",
      jobId,
    } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });
    if (!headline || !imagePrompt) return Response.json({ error: "headline and imagePrompt required" }, { status: 400 });

    const [{ data: brand }, { data: product }] = await Promise.all([
      supabase.from("brand_intake").select("*").eq("client_id", clientId).maybeSingle(),
      productId
        ? supabase.from("products").select("*").eq("id", productId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const ref = referenceImageUrl ? await fetchUrlAsBase64(referenceImageUrl) : null;
    const initialPrompt = buildPrompt({
      headline, imagePrompt, brand, product, aspectRatio,
      hasReferenceImage: !!ref?.base64,
    });

    const img = await generateWithRetries({
      initialPrompt,
      productImageBase64: ref?.base64 || null,
      productMimeType: ref?.mime || null,
      aspectRatio,
      brand, product,
      headline,
    });

    // Find the matching portal_project so we can swap the tile in its images array.
    let portalRow = null;
    {
      let q = supabase.from("portal_projects").select("*").eq("client_id", clientId);
      if (productId) q = q.eq("product_id", productId);
      const { data: portals } = await q;
      portalRow = (portals || [])[0] || null;
    }
    if (!portalRow) return Response.json({ error: "portal not found" }, { status: 404 });

    const upload = await uploadBase64(img.base64, img.mime, portalRow.id);
    const newImage = {
      id: imageId || crypto.randomUUID(),
      url: upload.url,
      name: `${headline.slice(0, 30)} - ${imagePrompt.slice(0, 30)}.${img.mime?.includes("png") ? "png" : "jpg"}`,
    };

    // Swap in portal_projects.images by id
    {
      const { data: latest } = await supabase
        .from("portal_projects")
        .select("images")
        .eq("id", portalRow.id)
        .maybeSingle();
      const list = latest?.images || [];
      const idx = list.findIndex((it) => it.id === newImage.id);
      let merged;
      if (idx >= 0) {
        merged = [...list];
        merged[idx] = newImage;
      } else {
        merged = [...list, newImage];
      }
      await supabase.from("portal_projects").update({ images: merged }).eq("id", portalRow.id);
    }

    // Mirror swap in static_gen_jobs.images if a jobId is given
    if (jobId) {
      const { data: job } = await supabase
        .from("static_gen_jobs")
        .select("images")
        .eq("id", jobId)
        .maybeSingle();
      const list = job?.images || [];
      const idx = list.findIndex((it) => it.id === newImage.id);
      let merged;
      if (idx >= 0) {
        merged = [...list];
        merged[idx] = newImage;
      } else {
        merged = [...list, newImage];
      }
      await supabase.from("static_gen_jobs").update({
        images: merged,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    return Response.json({ ok: true, image: newImage });
  } catch (e) {
    console.error("[regenerate-one]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
