// Static Ad Generator: takes a client + product, headlines, image prompts,
// pulls the brand kit (colors, voice, audience, spokesperson) and asks Gemini
// to render N×M ads (default 5×5=25). Each generated image is uploaded to
// Supabase Storage and added to that product's portal_project so the client
// sees them in the Creatives review tab.
//
// Body: { clientId, productId, headlines: [], imagePrompts: [], aspectRatio? }
// Returns: { generated: number, failed: number, images: [{url,name}] }

import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
// Each call processes a small chunk (5 images). The UI loops to do all 25.
// Keeps each invocation under Vercel's function timeout.
export const maxDuration = 60;

const MODEL = "gemini-3.1-flash-image-preview";

async function generateOne(prompt, aspectRatio = "1:1") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            // 1K keeps cost ~$0.04/image (~$1 per batch of 25). 2K quadruples
            // both pixels and price; bump back to "2K" only for final approved
            // ads that need high-res for CTV/OOH placements.
            imageConfig: { imageSize: "1K", aspectRatio },
          },
        }),
      }
    );
    if (!res.ok) {
      if (attempt < 2 && (res.status === 429 || res.status >= 500)) {
        const wait = (attempt + 1) * (res.status === 429 ? 8000 : 3000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error("No image returned");
    return { mime: part.inlineData.mimeType, base64: part.inlineData.data };
  }
}

// Headlines auto-derived from the brand kit when the team hasn't supplied any.
// Pulls tagline, key message, audience callouts, etc., and templates 5 lines.
function deriveDefaultHeadlines(brand, product) {
  const out = [];
  const productName = product?.name || brand?.brand_name || "this";
  if (brand?.tagline) out.push(brand.tagline);
  if (brand?.key_message) out.push(brand.key_message);
  if (product?.problems_solved) {
    const short = String(product.problems_solved).split(/[.!?]/)[0].slice(0, 60);
    if (short) out.push(short);
  }
  if (brand?.audience_description) {
    const audience = String(brand.audience_description).split(/[.,]/)[0].slice(0, 30);
    if (audience) out.push(`Made for ${audience.toLowerCase().replace(/^(women|men|people)\s+/, "")}`);
  }
  if (product?.unique_features?.length > 0) {
    out.push(`${product.unique_features[0].slice(0, 40)}`);
  }
  if (brand?.brand_name) out.push(`Meet ${brand.brand_name}.`);
  return [...new Set(out)].filter(Boolean).slice(0, 5);
}

// Visual prompts auto-derived from the brand kit. Combines spokesperson,
// brand mood, video direction, and music vibe to produce 5 distinct scenes.
function deriveDefaultPrompts(brand, product) {
  const productName = product?.name || brand?.brand_name || "the product";
  const spokesperson = [
    brand?.influencer_age ? `${brand.influencer_age}-year-old` : null,
    brand?.influencer_gender,
    brand?.influencer_ethnicity,
    brand?.influencer_style ? `${brand.influencer_style} style` : null,
  ].filter(Boolean).join(", ");
  const personalityTone = brand?.personality_tags?.length
    ? brand.personality_tags.slice(0, 2).join(", ")
    : "premium, modern";
  const colorTone = brand?.brand_colors ? `with ${brand.brand_colors} color accents` : "";

  return [
    `Hero product shot of ${productName} on a clean editorial backdrop, ${personalityTone} feel, soft cinematic lighting ${colorTone}`,
    `Lifestyle scene with ${spokesperson || "the target customer"} naturally using ${productName}, candid moment, golden hour, premium feel`,
    `Premium close-up of ${productName} with subtle texture detail, ${personalityTone} mood, professional studio lighting`,
    `${spokesperson ? `Portrait of ${spokesperson}` : "Confident portrait"} holding ${productName}, warm natural light, looking direct-to-camera`,
    `In-context use shot of ${productName} in a real environment, lifestyle storytelling, ${personalityTone} aesthetic`,
  ];
}

function buildPrompt({ headline, imagePrompt, brand, product, aspectRatio }) {
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
  const productLine = product
    ? `Product: ${product.name}${product.description ? ` - ${product.description}` : ""}.`
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
`.trim();
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
      headlines = [], imagePrompts = [],
      aspectRatio = "1:1",
    } = body || {};

    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });
    let validHeadlines = headlines.map((h) => String(h || "").trim()).filter(Boolean);
    let validPrompts = imagePrompts.map((p) => String(p || "").trim()).filter(Boolean);

    // Brand kit + product context
    const [{ data: brand }, { data: product }] = await Promise.all([
      supabase.from("brand_intake").select("*").eq("client_id", clientId).maybeSingle(),
      productId
        ? supabase.from("products").select("*").eq("id", productId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Fill in defaults from the brand kit when the team hasn't provided
    // headlines or prompts. The whole point: Static Studio should be able to
    // generate on-brand ads with one click, no manual input required.
    if (validHeadlines.length === 0) {
      validHeadlines = deriveDefaultHeadlines(brand, product);
    }
    if (validPrompts.length === 0) {
      validPrompts = deriveDefaultPrompts(brand, product);
    }
    if (validHeadlines.length === 0) validHeadlines = ["Designed for you.", "Built different.", "Try it once.", "Made better.", "The everyday upgrade."];
    if (validPrompts.length === 0) validPrompts = [
      "Hero product shot on a clean editorial background, soft cinematic lighting",
      "Lifestyle scene with a real person using the product naturally",
      "Premium close-up of the product with subtle brand color tones",
      "Spokesperson portrait holding the product, warm natural light",
      "In-context use shot, candid feel, golden hour",
    ];

    // Find or create the portal_project for this product so we can drop the
    // generated images into the client's Creatives review surface.
    let portalRow = null;
    {
      let q = supabase.from("portal_projects").select("*").eq("client_id", clientId);
      if (productId) q = q.eq("product_id", productId);
      const { data: portals } = await q;
      portalRow = (portals || [])[0] || null;
    }
    if (!portalRow && productId) {
      const { data: legacy } = await supabase
        .from("portal_projects")
        .select("*")
        .eq("client_id", clientId)
        .is("product_id", null);
      if (legacy?.length > 0) {
        portalRow = legacy[0];
        await supabase.from("portal_projects").update({ product_id: productId }).eq("id", portalRow.id);
      }
    }
    if (!portalRow) {
      // Create one
      const { data: clientRow } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
      const insert = {
        client_id: clientId,
        client_name: clientRow?.name || "Client",
        slug: `gen-${Date.now().toString(36)}`,
        images: [],
        hero_scripts: [],
        ugc_scripts: [],
      };
      if (productId) insert.product_id = productId;
      const { data } = await supabase.from("portal_projects").insert(insert).select().single();
      portalRow = data;
    }
    if (!portalRow) return Response.json({ error: "Could not find or create portal project" }, { status: 500 });

    // Build the full cartesian product of headlines × imagePrompts.
    // The client decides how many to process per chunk via offset+limit.
    const tasks = [];
    for (const headline of validHeadlines) {
      for (const imagePrompt of validPrompts) {
        tasks.push({
          headline, imagePrompt,
          prompt: buildPrompt({ headline, imagePrompt, brand, product, aspectRatio }),
        });
      }
    }

    // Chunked processing: only handle a slice of `tasks` per request, so each
    // Vercel function invocation completes well under its timeout (60s).
    const offset = Number.isFinite(body.offset) ? Math.max(0, body.offset) : 0;
    // Cap at 3 so a single invocation never times out even if Gemini retries
    // multiple images. Client default is 2 (see StaticStudio CHUNK).
    const limit = Number.isFinite(body.limit) ? Math.min(3, Math.max(1, body.limit)) : 2;
    const slice = tasks.slice(offset, offset + limit);

    const generated = [];
    const failed = [];
    // Run all images in this chunk in parallel - the chunk is small enough
    // (max 8) that we won't hit rate limits. Each image ~5-15s, so a chunk
    // of 5 finishes in ~10-20s.
    const results = await Promise.all(slice.map(async (t) => {
      try {
        const img = await generateOne(t.prompt, aspectRatio);
        const upload = await uploadBase64(img.base64, img.mime, portalRow.id);
        return {
          ok: true,
          image: { id: crypto.randomUUID(), url: upload.url, name: `${t.headline.slice(0, 30)} — ${t.imagePrompt.slice(0, 30)}.${img.mime?.includes("png") ? "png" : "jpg"}` },
        };
      } catch (e) {
        console.error("[generator] failed", t.headline, e.message);
        return { ok: false, error: e.message, headline: t.headline, imagePrompt: t.imagePrompt };
      }
    }));

    for (const r of results) {
      if (r.ok) generated.push(r.image);
      else failed.push({ error: r.error, headline: r.headline, imagePrompt: r.imagePrompt });
    }

    // Append this chunk's successes to the portal_project's images array.
    // Re-fetch so we don't clobber concurrent updates from other chunks.
    if (generated.length > 0) {
      const { data: latest } = await supabase
        .from("portal_projects")
        .select("images")
        .eq("id", portalRow.id)
        .maybeSingle();
      const merged = [...((latest?.images) || (portalRow.images || [])), ...generated];
      await supabase.from("portal_projects").update({ images: merged }).eq("id", portalRow.id);
    }

    const nextOffset = offset + slice.length;
    return Response.json({
      generated: generated.length,
      failed: failed.length,
      images: generated,
      failures: failed,
      total: tasks.length,
      processed: nextOffset,
      done: nextOffset >= tasks.length,
      nextOffset,
      portalSlug: portalRow.slug,
      portalId: portalRow.id,
    });
  } catch (e) {
    console.error("[static-generator]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
