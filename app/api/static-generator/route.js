// Static Ad Generator: takes a client + product, headlines, image prompts,
// pulls the brand kit (colors, voice, audience, spokesperson) and asks Gemini
// to render N×M ads (default 5×5=25). Each generated image is uploaded to
// Supabase Storage and added to that product's portal_project so the client
// sees them in the Creatives review tab.
//
// Body: { clientId, productId, headlines: [], imagePrompts: [], aspectRatio? }
// Returns: { generated: number, failed: number, images: [{url,name}] }

import { supabase } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
// Bumped from 60 → 300 so a single image can use the full 180s patient
// timeout (mirroring the proven Python batch script) without the function
// being killed mid-generation. The chunked-lanes architecture still keeps
// wall time low because lanes run in parallel.
export const maxDuration = 300;

const MODEL = "gemini-3.1-flash-image-preview";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 8-attempt retry table mirroring /samples reliability strategy.
// Pairs of two: first try + same-prompt retry catches transient flakes
// (timeout, 503, network blip, rate limit). On the second pair onward we
// ask Claude for a fresh prompt rewrite — handles safety-filter trips on
// offer/discount language and complexity-induced "no image returned" cases.
const ATTEMPTS = [
  { timeout: 180000, rewritePrompt: false }, // 1: original
  { timeout: 180000, rewritePrompt: false }, // 2: original retry
  { timeout: 180000, rewritePrompt: true  }, // 3: Claude rewrite #1
  { timeout: 180000, rewritePrompt: false }, // 4: rewrite #1 retry
  { timeout: 180000, rewritePrompt: true  }, // 5: Claude rewrite #2
  { timeout: 180000, rewritePrompt: false }, // 6: rewrite #2 retry
  { timeout: 180000, rewritePrompt: true  }, // 7: Claude rewrite #3
  { timeout: 180000, rewritePrompt: false }, // 8: rewrite #3 retry
];

// Single Gemini call with patient 180s timeout via AbortController. No
// imageSize parameter — that param is undocumented for nano-banana-2 and
// silently causes "no image returned" responses where the API returns
// text-only candidates with no inline image data. The proven batch script
// at agent2_creative.py never set it.
async function generateImageOnce(prompt, productImageBase64, productMimeType, timeoutMs = 180000, aspectRatio = "1:1") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");

  // Image-first parts order (mirroring batch script's parts.insert(0, image)):
  // when a reference image is present, inlineData goes BEFORE the text. Order
  // is undocumented but reproducibly affects reliability.
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
            // No imageSize. See note above.
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

// Ask Claude for a fresh visual-prompt variation: same shot intent, same
// brand voice, but different angle/composition/lighting/background. Used
// only on attempts 3, 5, 7 of the 8-attempt loop. ~$0.005 per call; worst
// case 3 calls per task = ~$0.015 added.
async function regenerateStaticPrompt({ brand, product, headline, prevPrompt, aspectRatio }) {
  const ctx = [
    product?.name ? `Product: ${product.name}` : null,
    product?.description ? `Description: ${product.description}` : null,
    brand?.brand_colors ? `Brand colors: ${brand.brand_colors}` : null,
    brand?.personality_tags?.length ? `Personality: ${brand.personality_tags.join(", ")}` : null,
    brand?.audience_description ? `Audience: ${brand.audience_description}` : null,
    brand?.voice_style?.length ? `Voice: ${brand.voice_style.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are rewriting a single image-generation prompt for a static social ad. The previous prompt failed (likely safety filter, complexity, or transient API issue). Write a NEW visual variation: same shot intent, same brand voice, but different angle / composition / lighting / background / framing. Keep it photorealistic and premium.

Brand context:
${ctx}

Headline that will be overlaid on the image: "${headline}"
Aspect ratio: ${aspectRatio}
Previous (failed) prompt:
${prevPrompt}

Return ONLY a JSON object: {"imagePrompt": "..."} — no markdown, no preamble.`,
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
  // Fall through: return previous prompt so the loop still progresses.
  return prevPrompt;
}

// 8-attempt wrapper. Catches transient errors with same-prompt retries and
// prompt-dependent errors with Claude rewrites between pairs.
async function generateWithRetries({ initialPrompt, productImageBase64, productMimeType, aspectRatio, brand, product, headline }) {
  let activePrompt = initialPrompt;
  let lastErr = null;

  for (let attempt = 1; attempt <= ATTEMPTS.length; attempt++) {
    const cfg = ATTEMPTS[attempt - 1];

    if (cfg.rewritePrompt) {
      activePrompt = await regenerateStaticPrompt({
        brand, product, headline,
        prevPrompt: activePrompt,
        aspectRatio,
      });
    }

    try {
      const img = await generateImageOnce(activePrompt, productImageBase64, productMimeType, cfg.timeout, aspectRatio);
      return img;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      const is429 = /429|rate limit|quota/i.test(msg);
      // 60s on 429 (Google's rate-limit window) so the quota actually resets.
      // 5s otherwise. No exponential ramp — that just stays inside the window.
      if (attempt < ATTEMPTS.length) {
        const backoff = is429 ? 60000 : 5000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr || new Error("Image generation failed after 8 attempts");
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
    // Vercel function invocation completes well under its timeout (300s after
    // the bump). Still keep chunks small so a slow image doesn't starve siblings.
    const jobId = body.jobId || null;
    const offset = Number.isFinite(body.offset) ? Math.max(0, body.offset) : 0;
    // Cap at 3 so a single invocation never times out even with 8-attempt
    // retries firing on multiple tasks. Client default is 2 (see StaticStudio CHUNK).
    const limit = Number.isFinite(body.limit) ? Math.min(3, Math.max(1, body.limit)) : 2;
    const slice = tasks.slice(offset, offset + limit);

    const generated = [];
    const failed = [];
    // Run all images in this chunk in parallel - the chunk is small enough
    // (max 3) that we won't overwhelm the rate limit. Each image uses the
    // 8-attempt retry strategy internally.
    const results = await Promise.all(slice.map(async (t) => {
      try {
        const img = await generateWithRetries({
          initialPrompt: t.prompt,
          productImageBase64: null, // future: attach product reference image here
          productMimeType: null,
          aspectRatio,
          brand, product,
          headline: t.headline,
        });
        const upload = await uploadBase64(img.base64, img.mime, portalRow.id);
        return {
          ok: true,
          image: { id: crypto.randomUUID(), url: upload.url, name: `${t.headline.slice(0, 30)} - ${t.imagePrompt.slice(0, 30)}.${img.mime?.includes("png") ? "png" : "jpg"}` },
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

    // If a jobId was provided (from the orchestrated /start endpoint), update
    // the job row so the polling UI sees fresh progress + accumulated images.
    // Re-fetch latest before merging to avoid clobbering parallel chunk writes.
    if (jobId) {
      const { data: job } = await supabase
        .from("static_gen_jobs")
        .select("completed, failed, images, failures")
        .eq("id", jobId)
        .maybeSingle();
      const mergedImages = [...((job?.images) || []), ...generated];
      const mergedFailures = [...((job?.failures) || []), ...failed];
      await supabase.from("static_gen_jobs").update({
        completed: (job?.completed || 0) + generated.length,
        failed: (job?.failed || 0) + failed.length,
        images: mergedImages,
        failures: mergedFailures,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    const nextOffset = offset + slice.length;

    // Chain into the next chunk in this lane BEFORE returning. The /start
    // orchestrator passes `chain: { stride, total }` — stride is LANES*CHUNK,
    // so each lane skips ahead by that amount and we never duplicate work.
    // Each chunk hand-off uses waitUntil to keep the dispatch alive past the
    // function's response, so the next invocation always receives its request.
    // When the lane runs out, we mark the job done iff we're the last chunk.
    if (jobId && body.chain && Number.isFinite(body.chain.stride)) {
      const { stride } = body.chain;
      const laneNext = offset + stride;
      if (laneNext < tasks.length) {
        const baseUrl = new URL(req.url);
        const chunkUrl = `${baseUrl.protocol}//${baseUrl.host}/api/static-generator`;
        waitUntil(
          fetch(chunkUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId, productId, headlines, imagePrompts, aspectRatio,
              offset: laneNext, limit: limit,
              jobId, chain: body.chain,
            }),
          }).catch((e) => console.error("[chunk] chain dispatch failed", e?.message))
        );
      } else {
        // Last chunk in this lane. Check whether ALL tasks have settled and
        // mark the job done if so. Done by checking job row counters — the
        // chunk worker that observes total reached writes status='done'.
        try {
          const { data: latestJob } = await supabase
            .from("static_gen_jobs")
            .select("completed, failed, total, status")
            .eq("id", jobId)
            .maybeSingle();
          if (latestJob && latestJob.status === "running" &&
              (latestJob.completed || 0) + (latestJob.failed || 0) >= (latestJob.total || 0)) {
            await supabase.from("static_gen_jobs").update({
              status: "done",
              portal_slug: portalRow.slug,
              portal_id: portalRow.id,
              updated_at: new Date().toISOString(),
            }).eq("id", jobId);
          }
        } catch (e) { console.error("[chunk] final status update failed", e?.message); }
      }
    }

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
