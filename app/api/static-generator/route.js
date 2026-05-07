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
        { inlineData: { mimeType: productMimeType || "image/png", data: productImageBase64 } },
        { text: prompt },
      ]
    : [{ text: prompt }];
  console.log(`[gemini call] hasRef=${!!productImageBase64} mime=${productMimeType || "none"} parts=${parts.length} promptLen=${prompt.length}`);

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
async function regenerateStaticPrompt({ brand, product, headline, prevPrompt, aspectRatio, hasReferenceImage = false }) {
  const ctx = [
    product?.name ? `Product: ${product.name}` : null,
    product?.description ? `Description: ${product.description}` : null,
    brand?.brand_colors ? `Brand colors: ${brand.brand_colors}` : null,
    brand?.personality_tags?.length ? `Personality: ${brand.personality_tags.join(", ")}` : null,
    brand?.audience_description ? `Audience: ${brand.audience_description}` : null,
    brand?.voice_style?.length ? `Voice: ${brand.voice_style.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  // When a reference image is attached, the rewrite MUST preserve the
  // product-fidelity instructions or Gemini will start inventing products.
  const refRules = hasReferenceImage
    ? `\nIMPORTANT — REFERENCE IMAGE IS ATTACHED:\nThe new prompt MUST keep these rules:\n- Treat the inline reference image as the EXACT product (same shape, colors, label, logo, finish).\n- Do NOT describe the product visually in your rewrite — let the image handle it.\n- Do NOT instruct Gemini to redesign, restyle, or recolor the product.\n- End the rewritten prompt with the exact phrase: "Use attached image as product reference."`
    : `\nNOTE: No reference image attached. Describe the product in precise visual detail (color, shape, packaging, label, finish, scale).`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are rewriting a single image-generation prompt for a static social ad. The previous prompt failed (likely safety filter, complexity, or transient API issue). Write a NEW visual variation: same shot intent, same brand voice, but different angle / composition / lighting / background / framing. Keep it photorealistic and premium.${refRules}

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
  const hasReferenceImage = !!productImageBase64;

  for (let attempt = 1; attempt <= ATTEMPTS.length; attempt++) {
    const cfg = ATTEMPTS[attempt - 1];

    if (cfg.rewritePrompt) {
      activePrompt = await regenerateStaticPrompt({
        brand, product, headline,
        prevPrompt: activePrompt,
        aspectRatio,
        hasReferenceImage,
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

// Preview-phase prompt: scene-only, NO headline overlay, NO ad copy. The
// approved scene gets re-run in the variants phase with each headline.
function buildPreviewPrompt({ imagePrompt, brand, product, aspectRatio, hasReferenceImage = false, shot = "" }) {
  const colors = brand?.brand_colors ? `Brand colors: ${brand.brand_colors}.` : "";
  const personality = brand?.personality_tags?.length ? `Brand personality: ${brand.personality_tags.join(", ")}.` : "";
  const audience = brand?.audience_description ? `Target audience: ${brand.audience_description}.` : "";
  const voice = brand?.voice_style?.length ? `Tone of voice: ${brand.voice_style.join(", ")}.` : "";
  const shotLine = shot ? `Shot type: ${shot}.` : "";

  if (hasReferenceImage) {
    return `
TASK: Create a high-quality preview scene image for static social ad approval. NO headline overlay, NO ad copy text — just the scene that an ad will be built on top of.

CRITICAL — PRODUCT FIDELITY:
- The first input is a reference photo of the EXACT product to feature.
- Render the product EXACTLY as shown in the reference: same shape, colors, packaging, label text, logo, material, finish, proportions.
- Do NOT redesign, restyle, recolor, or "improve" the product. Do NOT change the label, font, or branding.
- Place this exact product into the scene described below.

SCENE:
${imagePrompt}

BRAND CONTEXT:
${shotLine}
${colors}
${personality}
${audience}
${voice}

FORMAT: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
STYLE: photorealistic, premium, on-brand. NO headline text. NO CTAs. NO badges. NO ad copy of any kind. Brand wordmark in a corner is fine.

Use attached image as product reference. Render that exact product in the scene described above.
`.trim();
  }

  const productLine = product
    ? `Product: ${product.name}${product.description ? ` — ${product.description}` : ""}.`
    : "";
  return `
Create a high-quality preview scene image for static social ad approval. NO headline overlay, NO ad copy text — just the scene.

${productLine}
${shotLine}
${colors}
${personality}
${audience}
${voice}

Scene: ${imagePrompt}

Format: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
Style: photorealistic, premium, on-brand. NO headline text. NO CTAs. NO badges.
NOTE: No reference image attached. Render the product in precise visual detail based on the description above.
`.trim();
}

// Shot-specific ad-copy treatment block. Ported from /samples
// SAMPLES_SYSTEM_PROMPT so variant ads carry the same Halbert/Hormozi-level
// DR copy + T1-T10 typography devices instead of plain headline overlays.
function shotTreatmentBlock(shot, headline) {
  const SHOT = String(shot || "").toUpperCase();
  if (SHOT.includes("BOLD CLAIM")) {
    return `THIS IS A BOLD CLAIM AD (DR — full ad copy treatment):
- MASSIVE bold sans headline (3-7 words) integrating with the subject — wraps behind/in front of the model, 25-35% of frame height. Headline: "${headline}"
- Italic editorial serif subhead in extreme contrast to the headline. ("And here's the fix" / "Swipe →" / similar.)
- Pill CTA with arrow (→ or »»») — strong verb + outcome ("Claim Yours" / "Lock In" / "Start Today" — NEVER "Shop Now" alone or "Learn More").
- Small star badge or starburst die-cut tilted ~15° in brand accent ("★★★★★ 12K" / "60-DAY GUARANTEE" / "MOST POPULAR").
- Optional hand-drawn marker arrow / circle in pure white pointing from headline to product, or underline emphasizing a key word.
- Brand corner marks: small wordmark top-left, URL or category top-right, both tiny.
BANNED WORDS in any copy: "Discover," "Introducing," "Welcome," "Premium quality," "Made with love," "We believe," "Crafted," "Experience the difference."`;
  }
  if (SHOT.includes("SOCIAL PROOF")) {
    return `THIS IS A SOCIAL PROOF AD (DR — full ad copy treatment):
- Handwritten-style or casual sans testimonial overlay: before-state + specific result with number + emotional payoff. The HEADLINE TO USE is: "${headline}"
- 5 filled stars in brand accent color, prominent.
- "12,847 reviews" / "Verified Buyer" / "10K+ five-star reviews" trust badge.
- First name + city/state byline ("— Sarah K., Brooklyn NY").
- Specific CTA pill with arrow ("Try Risk-Free →" / "Get Mine →").
- "Shot on iPhone" energy — JPEG warmth, slight grain, real-customer feel.
BANNED WORDS: "Discover," "Introducing," "Welcome," "Premium quality," "Made with love," "We believe," "Crafted," "Experience the difference."`;
  }
  if (SHOT.includes("OFFER")) {
    return `THIS IS AN OFFER AD (DR — full ad copy treatment):
- Headline = offer as benefit. The HEADLINE TO USE is: "${headline}"
- Price anchor visually shown (strikethrough → discount price in brand accent).
- Real urgency line ("Ends Sunday" / "Only 47 left" / "Last 24 hours") in tracked caps.
- Diagonal OFFER tape (T7) — saturated stripe across frame with repeating tracked-caps text.
- Starburst die-cut badge tilted ~15° with discount % (T8).
- Big CTA pill with arrow ("Claim 40% Off →" / "Lock In My Price →").
- Trust microcopy below ("60-day guarantee · ★★★★★ 12K").
BANNED WORDS: "Discover," "Introducing," "Welcome," "Premium quality," "Made with love," "We believe," "Crafted," "Experience the difference."`;
  }
  // PRODUCT HERO / EDITORIAL / LIFESTYLE — brand shots. /samples specifies
  // NO TEXT OVERLAYS for these, but the variant phase intentionally adds a
  // headline (the team approved 5 headline variants per scene). Keep the
  // overlay minimal and editorial — small italic serif subhead at the
  // bottom, no DR ad copy treatment.
  return `THIS IS A BRAND SHOT (${SHOT || "Editorial"}) — minimal text treatment:
- Single small italic editorial serif subhead at the bottom of the frame: "${headline}"
- Headline lives like a magazine caption, not an ad. No CTA pill, no badge, no urgency, no diagonal tape, no starburst.
- Tiny brand wordmark top-left or bottom-right is fine; no other text.
- Editorial / luxury feel — Kinfolk / Wallpaper* / Vogue Italia / Nowness energy.
BANNED WORDS: "Discover," "Introducing," "Welcome," "Premium quality," "Made with love," "We believe," "Crafted," "Experience the difference."`;
}

const TYPOGRAPHY_DEVICES = `LAYOUT & TYPOGRAPHY DEVICES — pick the ones that fit this shot:
T1. MASSIVE BOLD SANS HEADLINE that crops/wraps the subject (headline runs behind, in front of, or partially behind the model). Specify exact word break.
T2. ITALIC EDITORIAL SERIF SUBHEAD paired with the bold sans — extreme contrast in weight + style.
T3. RULE-NUMBER FRAMING — small "RULE #2 ·" / "TIP #3 ·" pre-headline in tracked caps, then big headline below.
T4. CONTRAST-PAIR HEADLINE — two opposing words joined by ×, +, =, or /.
T5. HAND-DRAWN MARKER ARROWS / CIRCLES / SCRIBBLES in pure white or brand accent.
T6. CURVED TYPE wrapping along an arm, sleeve, or curve in the image.
T7. DIAGONAL TAPE BANNER — saturated stripe across frame with repeating tracked-caps text.
T8. STARBURST DIE-CUT BADGE — tilted ~15°, contrasting brand color.
T9. PILL CTA WITH ARROW — "→" or "»»»" inside or after the button text.
T10. BRAND CORNER MARKS — small wordmark top-left, section/category tag top-right, URL bottom-left.
LAYOUT MASTERY: specify exact word count per line, hierarchy ratio ("headline 4× subhead"), 5-8% safe margin. Use solid color blocks behind text on busy backgrounds for legibility.`;

function buildPrompt({ headline, imagePrompt, brand, product, aspectRatio, hasReferenceImage = false, shot = "" }) {
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

  const treatment = shotTreatmentBlock(shot, headline);

  if (hasReferenceImage) {
    return `
TASK: Create a high-converting social media ad using the provided reference image as the literal product. Apply the full Halbert/Hormozi-level direct-response copy treatment + Apple/Highsnobiety/Vogue typography craft.

CRITICAL — PRODUCT FIDELITY:
- The first input is a reference photo of the EXACT product to feature.
- Render the product EXACTLY as shown: same shape, colors, packaging, label text, logo, material, finish, proportions.
- Do NOT redesign, restyle, recolor, or "improve" the product. Do NOT change the label, font, or branding on the product.
- Do NOT add or remove product elements. Treat the reference as ground truth.
- Place this exact product into the scene described below.

SCENE / VISUAL DIRECTION:
${imagePrompt}

BRAND CONTEXT:
${colors}
${personality}
${audience}
${voice}
${spokes}

${treatment}

${TYPOGRAPHY_DEVICES}

DR COPY PRINCIPLES (Halbert/Hormozi-level):
- Specific numbers + timeframes when possible.
- Benefit-first, customer-voice, never feature-first.
- Provocative direct headlines.
- CTA = strong verb + outcome.
- Real testimonials/offers feel verbatim, not generic.

FORMAT: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
STYLE: photorealistic, premium, on-brand, scroll-stopping. Every text element rendered as part of the design (not flat overlay text), with explicit hierarchy and breathing room.

Use attached image as product reference. Render that exact product, in the scene described above, with the full ad treatment applied.
`.trim();
  }

  const productLine = product
    ? `Product: ${product.name}${product.description ? ` — ${product.description}` : ""}.`
    : "";
  return `
Create a high-converting social media ad creative with the full Halbert/Hormozi-level direct-response copy treatment + Apple/Highsnobiety/Vogue typography craft.

${productLine}
${colors}
${personality}
${audience}
${voice}
${spokes}

Visual direction: ${imagePrompt}

${treatment}

${TYPOGRAPHY_DEVICES}

DR COPY PRINCIPLES:
- Specific numbers + timeframes when possible.
- Benefit-first, customer-voice, never feature-first.
- Provocative direct headlines.
- CTA = strong verb + outcome.

Format: ${aspectRatio === "9:16" ? "Vertical 9:16 social/Story format" : aspectRatio === "16:9" ? "Widescreen 16:9 format" : "Square 1:1 feed format"}.
Style: photorealistic, premium, on-brand, scroll-stopping.
NOTE: No reference image attached. Render the product in precise visual detail based on the description above.
`.trim();
}

// Fetch a remote URL and return { base64, mime }. Used to attach a chosen
// product image from product.product_image_urls as a Gemini visual reference.
// Mirrors /samples' approach (which ships 400s on fetch failure) but here we
// throw and let the chunk's per-task try/catch surface the error in the
// failures[] array, so the team SEES that the reference image couldn't be
// loaded instead of silently getting text-only generations.
async function fetchUrlAsBase64(url) {
  if (!url) return null;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Reference image fetch ${res.status} ${res.statusText} for ${url.slice(0, 80)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  // Sanity: empty body or HTML response means the URL didn't resolve to an image
  if (buf.length === 0) throw new Error(`Reference image empty body for ${url.slice(0, 80)}`);
  if (mime.includes("text/html")) {
    throw new Error(`Reference image returned HTML (likely 401/redirect) for ${url.slice(0, 80)}`);
  }
  console.log(`[refImage] fetched ${buf.length}B mime=${mime} url=${url.slice(0, 80)}`);
  return { base64: buf.toString("base64"), mime };
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
      // Optional: one product reference image URL per headline. When set for a
      // given headline, every (headline × imagePrompt) task in that row uses
      // that image as visual reference. Picked from product.product_image_urls
      // in the UI. Length matches `headlines`; "" / null = no reference.
      headlineImageUrls = [],
      // Two-phase flow: phase = 'preview' | 'variants' | 'cartesian' (legacy).
      phase = "cartesian",
      // Preview-phase inputs:
      scenePrompts = [],
      shots = [],
      productImageUrl = "",
      // Variants-phase inputs:
      scenePrompt = "",
      shot = "",
    } = body || {};

    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    // Brand kit + product context (used by every phase)
    const [{ data: brand }, { data: product }] = await Promise.all([
      supabase.from("brand_intake").select("*").eq("client_id", clientId).maybeSingle(),
      productId
        ? supabase.from("products").select("*").eq("id", productId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // ─── Phase-aware variables (cartesian path populates them below) ───
    let validHeadlines = headlines.map((h) => String(h || "").trim());
    let validPrompts = imagePrompts.map((p) => String(p || "").trim()).filter(Boolean);

    // Fill in defaults from the brand kit when the team hasn't provided
    // headlines or prompts. Then PAD to exactly 5 with generic fallbacks so
    // every batch is 5 × 5 = 25 ads, never 4 × 5 = 20 because the brand kit
    // only had 4 usable headlines (e.g. tagline + key_message + audience +
    // brand_name and no problems_solved or unique_features).
    const GENERIC_HEADLINES = [
      "Designed for you.",
      "Built different.",
      "Try it once.",
      "Made better.",
      "The everyday upgrade.",
    ];
    const GENERIC_PROMPTS = [
      "Hero product shot on a clean editorial background, soft cinematic lighting",
      "Lifestyle scene with a real person using the product naturally",
      "Premium close-up of the product with subtle brand color tones",
      "Spokesperson portrait holding the product, warm natural light",
      "In-context use shot, candid feel, golden hour",
    ];

    // Cartesian-only padding: fill blank headline slots in place + pad
    // imagePrompts to 5 from brand kit / generics. Skipped for the two
    // phase-specific flows (preview / variants), which arrive with their own
    // explicit prompt + headline lists from the orchestrator.
    if (phase === "cartesian") {
      const derivedHeadlines = deriveDefaultHeadlines(brand, product);
      const derivedQueue = [...derivedHeadlines, ...GENERIC_HEADLINES.filter((g) => !derivedHeadlines.includes(g))];
      while (validHeadlines.length < 5) validHeadlines.push("");
      for (let i = 0; i < validHeadlines.length; i++) {
        if (!validHeadlines[i]) {
          const used = new Set(validHeadlines.filter(Boolean));
          const next = derivedQueue.find((g) => !used.has(g)) || GENERIC_HEADLINES[i % GENERIC_HEADLINES.length];
          validHeadlines[i] = next;
        }
      }
      if (validPrompts.length === 0) validPrompts = deriveDefaultPrompts(brand, product);
      while (validPrompts.length < 5) {
        const next = GENERIC_PROMPTS.find((g) => !validPrompts.includes(g));
        if (!next) break;
        validPrompts.push(next);
      }
      if (validPrompts.length === 0) validPrompts = [...GENERIC_PROMPTS];
    }

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

    // ─── Build tasks based on phase ─────────────────────────────────
    const tasks = [];
    if (phase === "preview") {
      // 5 preview scenes, no headline overlay. Each task uses the SAME
      // productImageUrl as the visual reference (one product → 5 scenes).
      const hasRef = !!productImageUrl;
      const arr = Array.isArray(scenePrompts) ? scenePrompts : [];
      for (let i = 0; i < arr.length; i++) {
        tasks.push({
          headline: "",
          imagePrompt: arr[i],
          shot: shots?.[i] || "",
          sceneIndex: i,
          referenceImageUrl: productImageUrl,
          prompt: buildPreviewPrompt({
            imagePrompt: arr[i],
            brand, product, aspectRatio,
            hasReferenceImage: hasRef,
            shot: shots?.[i] || "",
          }),
        });
      }
    } else if (phase === "variants") {
      // 5 ad variants of the SAME approved scene, one per headline.
      const hasRef = !!productImageUrl;
      const variantHeadlines = (Array.isArray(headlines) ? headlines : []).map((h) => String(h || "").trim()).filter(Boolean);
      for (let i = 0; i < variantHeadlines.length; i++) {
        tasks.push({
          headline: variantHeadlines[i],
          imagePrompt: scenePrompt,
          shot,
          headlineIndex: i,
          referenceImageUrl: productImageUrl,
          prompt: buildPrompt({
            headline: variantHeadlines[i],
            imagePrompt: scenePrompt,
            brand, product, aspectRatio,
            hasReferenceImage: hasRef,
            shot,
          }),
        });
      }
    } else {
      // Cartesian (legacy): full headlines × imagePrompts grid.
      for (let hi = 0; hi < validHeadlines.length; hi++) {
        const headline = validHeadlines[hi];
        const refUrl = headlineImageUrls[hi] || "";
        const hasRef = !!refUrl;
        for (const imagePrompt of validPrompts) {
          tasks.push({
            headline, imagePrompt,
            referenceImageUrl: refUrl,
            prompt: buildPrompt({ headline, imagePrompt, brand, product, aspectRatio, hasReferenceImage: hasRef, shot: "BOLD CLAIM" }),
          });
        }
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

    // Cancel check: if the user hit Stop while this chunk was waiting in the
    // chain queue, bail before doing any Gemini work. We still keep the row
    // tidy by short-circuiting the `done` math at the bottom — when status
    // is 'cancelled' we don't fire the next chunk in the lane either.
    let cancelled = false;
    if (jobId) {
      const { data: jobNow } = await supabase
        .from("static_gen_jobs")
        .select("status")
        .eq("id", jobId)
        .maybeSingle();
      if (jobNow?.status && jobNow.status !== "running") cancelled = true;
    }

    const generated = [];
    const failed = [];

    // Cache fetched reference images per chunk so multi-task chunks that
    // share a headline (and thus a reference URL) only download it once.
    const refCache = new Map();
    async function getRef(url) {
      if (!url) return null;
      if (refCache.has(url)) return refCache.get(url);
      const got = await fetchUrlAsBase64(url);
      refCache.set(url, got);
      return got;
    }

    // Run all images in this chunk in parallel - the chunk is small enough
    // (max 3) that we won't overwhelm the rate limit. Each image uses the
    // 8-attempt retry strategy internally.
    const results = cancelled ? [] : await Promise.all(slice.map(async (t) => {
      try {
        const ref = await getRef(t.referenceImageUrl);
        const img = await generateWithRetries({
          initialPrompt: t.prompt,
          productImageBase64: ref?.base64 || null,
          productMimeType: ref?.mime || null,
          aspectRatio,
          brand, product,
          headline: t.headline,
        });
        const upload = await uploadBase64(img.base64, img.mime, portalRow.id);
        return {
          ok: true,
          image: {
            id: crypto.randomUUID(),
            url: upload.url,
            // Phase-aware naming + metadata. Preview tiles get the shot label
            // and sceneIndex so the UI can match Approve/Revise back to the
            // matching scene prompt. Variant tiles get headlineIndex for
            // the same matching purpose.
            name: phase === "preview"
              ? `Preview ${t.shot || `#${(t.sceneIndex ?? 0) + 1}`}.${img.mime?.includes("png") ? "png" : "jpg"}`
              : phase === "variants"
                ? `${t.shot || "Scene"} - ${(t.headline || "").slice(0, 40)}.${img.mime?.includes("png") ? "png" : "jpg"}`
                : `${(t.headline || "").slice(0, 30)} - ${(t.imagePrompt || "").slice(0, 30)}.${img.mime?.includes("png") ? "png" : "jpg"}`,
            phase,
            shot: t.shot || null,
            sceneIndex: t.sceneIndex ?? null,
            headlineIndex: t.headlineIndex ?? null,
            scenePrompt: phase === "variants" ? t.imagePrompt : (phase === "preview" ? t.imagePrompt : null),
            headline: t.headline || null,
            // Stash the aspect ratio used to generate this tile so the client
            // portal can render each card at the correct shape. Without this,
            // mixed-ratio batches (1:1 + 9:16 + 16:9) all get crammed into
            // project.imageRatio and look cropped / uneven.
            aspectRatio,
          },
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
    if (jobId && !cancelled && body.chain && Number.isFinite(body.chain.stride)) {
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
              headlineImageUrls,
              // Carry phase-specific fields to the next chunk in this lane
              phase,
              scenePrompts, shots, productImageUrl,
              scenePrompt, shot,
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
