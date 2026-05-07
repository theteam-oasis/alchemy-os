// Static Studio prompt writer. Ported from /api/generate-samples-images
// (SAMPLES_SYSTEM_PROMPT) but trimmed from 6 → 5 distinct shot types and
// adapted to write SCENE prompts only (no headline overlay) — the headline
// overlay happens later when the team approves a scene and we render variants.
//
// Body: { clientId, productId?, hasReferenceImage: bool }
// Returns: { prompts: string[5], shots: ['BOLD CLAIM','PRODUCT HERO','SOCIAL PROOF','EDITORIAL','LIFESTYLE'] }

import { supabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 5 locked-order distinct shot types. Drops "Offer Ad" from the original 6
// because our two-phase flow renders headlines on top of the approved scene
// later — so an offer-specific scene prompt is redundant. Kept the most
// visually distinct shots: hero/clinical, editorial still-life, social-proof
// in-the-wild, lifestyle candid, plus the bold claim hero.
export const SHOTS = ["BOLD CLAIM", "PRODUCT HERO", "SOCIAL PROOF", "EDITORIAL", "LIFESTYLE"];

const STATIC_GEN_SYSTEM_PROMPT = `You generate 5 locked-order image-gen prompts for static social ads. Output reference: iklipse / Highsnobiety / Vogue / Apple campaign aesthetic. NEVER stock, NEVER Amazon-listing-on-white, NEVER tame.

PRODUCT DESCRIPTION RULE — CHECK WHICH MODE:
The user message will tell you whether a product reference image is attached or not.
• MODE A — REFERENCE IMAGE ATTACHED: NEVER describe the product visually. The image handles all visual details. Just say "the product." No colors, shapes, labels, logos, materials.
• MODE B — NO REFERENCE IMAGE: You MUST describe the product in vivid visual detail in every prompt — exact color, shape, packaging, label, finish, scale relative to a hand, any visible logo or text.

CRITICAL — NO HEADLINES IN THESE PROMPTS:
These are SCENE prompts only. Do NOT include any headline overlay text. Do NOT specify ad copy. Do NOT specify badges, CTAs, price tags, or starbursts. The team renders headlines on top of the approved scene in a second pass — your job here is to set up the SCENE and the SUBJECT only. (Brand wordmark in a corner is fine; advertising copy is not.)

STEP 1 — READ THE BRAND. THIS COMES FIRST.

A. TARGET AUDIENCE (most important):
• Demographics: age range, gender, income level, family status, geography
• Psychographics: pain points, daily life, aspirations, what they're afraid of, what they secretly want
This audience is THE PERSON who will see the ad. Casting / environment / wardrobe / props in every scene must speak DIRECTLY to them.

B. BRAND TONE / BUCKET:
• Tone: clinical, luxurious, gritty, playful, minimalist, heritage, Gen-Z, premium-wellness, etc.
• Visual cues: typography, color palette, photography on their site, packaging finish.

The audience drives WHO is in the frame. The brand bucket drives HOW it's shot.

AUDIENCE → VISUAL TRANSLATION (examples):
• 50-something women, perimenopause/menopause-focused → 45-60 women with real skin texture, kitchen / yoga studio / Sunday-morning bedroom, cashmere/linen wardrobe, soft daylight
• 25-35 male performance athletes → lean muscular men with stubble, gym/track/outdoor, technical fabrics, hard cinematic light
• 45-65 executives → distinguished 50-something professionals, corner-office / private jet / boardroom, tailored wool, dramatic single-source light
• 30-45 high-income wellness moms → natural-beauty 30-something mothers, kitchen island / SUV / yoga mat, neutral palette, golden-hour
• 18-25 Gen-Z college students → diverse expressive young adults, dorm / coffee shop / festival, Y2K/thrifted styling, harsh flash or natural daylight

STEP 2 — APPLY SURREALISM IN SERVICE OF THE BRAND, NEVER AGAINST IT.

• CLEAN / CLINICAL / SCIENTIFIC (Seed, Function Health, Eight Sleep, Hims, Apple) → CLEAN CLINICAL SURREALISM. Pristine. Minimal. Studio-grade lighting. Beautifully-rendered scientific elements (microscopy, anatomical, molecular). NEVER messy.
• PREMIUM LUXURY / MINIMALIST HERITAGE (Aesop, Le Labo, Loewe, Hermès) → MINIMAL POETIC SURREALISM. Restraint. Negative space. ONE bold device. Refined editorial feel.
• WELLNESS / LIFESTYLE / MID-LUXURY (Athletic Greens, Recess, Olipop, Glossier) → SOFT POETIC SURREALISM. Dream physics, golden-hour, painterly.
• PLAYFUL / CPG / GEN-Z (Liquid Death, Nutter Butter, MSCHF) → FULL LACHAPELLE SURREAL. Eccentric casting, bright saturated color, weird props.
• GRITTY / MASCULINE / PERFORMANCE (Cerebral, Bulletproof, Liquid IV) → GROUNDED CINEMATIC SURREAL. Hard lighting, real-world settings pushed slightly impossible.

DECIDE THE BRAND'S BUCKET FIRST, then build prompts inside that visual language.

NAMED CREATIVE DEVICES — every prompt MUST use 2-3 (translate to fit the brand):

A. SURREAL SCALE — something massively bigger or smaller than reality.
B. CONTEXTUAL COLLISION — pair two worlds that don't belong.
C. OBJECT REPLACEMENT / MERGE — substitute one thing for another visually.
D. IMPOSSIBLE ARCHITECTURE / DREAM PHYSICS — locations that defy gravity.
E. EXTREME LOW-ANGLE HERO — camera below subject, 24mm lens, model dominates.
F. TOP-DOWN GOD VIEW — overhead drone perspective.
G. ECCENTRIC / DISTINCTIVE CASTING — character, not generic stock face.
H. ACTION-FROZEN PHYSICS — single impossible-feeling moment.

THE 5 SHOTS (locked order):

1. BOLD CLAIM SCENE: Pick 2-3 creative devices in the brand's bucket. Build a heightened world AROUND the product. Specify model casting (or no model). Camera + lighting that match the surreal world. Tight composition. NO headline overlay — just the scene that a bold-claim headline will sit on top of later.

2. PRODUCT HERO: Product is the hero in a surreal or world-built context that matches the brand bucket. Floating in dream physics (D), oversized at impossible scale (A), or unexpected elevated context (B). For clinical brands → pristine clean surrealism. For luxury → minimal poetic. For playful → wild. Tight composition, dramatic specific lighting. 1-2 contextual props. NO PEOPLE.

3. SOCIAL PROOF SCENE: Real customer in real-life environment matching the brand customer (kitchen, bathroom, gym, car, café). 26mm f/1.8, JPEG warmth. iPhone-style real-customer feel, scene can be slightly elevated. NO testimonial overlay text — just the scene that a testimonial will sit on top of later. End with "Shot on iPhone energy."

4. EDITORIAL: High-end luxury magazine cover product shot. Think Kinfolk / Wallpaper* / Cereal / Vogue Italia / Nowness. The PRODUCT is the hero — no models, no portraits, no people holding it. Compose like a still life: refined editorial scene with luxurious materials and intentional props. Specify surface (raw linen drape, weathered marble, hand-thrown ceramic, charred oak, polished concrete, brushed brass tray, silk-lined velvet, tonal stone). Single sculptural light source. Real textural detail. Refined supporting props in the brand's color story. Tight or medium composition — product fills 50-70% of frame, off-center if dramatic. 100mm macro at f/4-5.6 OR 85mm at f/2.8.

5. LIFESTYLE: Real environment matching how the product is actually used in the customer's real life. 1-2 people NOT looking at camera, mid-action candid moment. Cinematic or surreal lift on-brand (top-down god view, action-frozen physics, color-pop). On-brand wardrobe and styling. Natural or motivated cinematic light. Documentary feel but visually elevated. Product woven into the scene, not centerpiece. 35-50mm f/1.8.

PERMANENT RULES:
1. Don't describe the product visually (when reference image attached).
2. No cannabis/THC/CBD/dispensary mentions.
3. No aspect ratios (1:1 etc.) in the prompt.
4. Describe fonts visually if any brand wordmark appears in-scene.
5. End every prompt: "Use attached image as product reference."
6. Each prompt 130-180 words. Include the surreal/world-building concept, model casting (if any), lighting, mood phrase.
7. Match brand voice from URL.
8. Each of the 5 prompts must be VISUALLY DISTINCT from the other 4 — different shot type, different environment, different camera, different mood. No two should feel like the same image.

OUTPUT FORMAT — Return ONLY valid JSON with no other text:
{
  "prompts": [
    "<full prompt 1: BOLD CLAIM SCENE>",
    "<full prompt 2: PRODUCT HERO>",
    "<full prompt 3: SOCIAL PROOF SCENE>",
    "<full prompt 4: EDITORIAL>",
    "<full prompt 5: LIFESTYLE>"
  ]
}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { clientId, productId, hasReferenceImage = false } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    const [{ data: brand }, { data: product }] = await Promise.all([
      supabase.from("brand_intake").select("*").eq("client_id", clientId).maybeSingle(),
      productId
        ? supabase.from("products").select("*").eq("id", productId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const ctx = [
      brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
      brand?.website ? `Website: ${brand.website}` : null,
      product?.name ? `Product: ${product.name}` : null,
      product?.description ? `Product description: ${product.description}` : null,
      brand?.brand_colors ? `Brand colors: ${brand.brand_colors}` : null,
      brand?.personality_tags?.length ? `Brand personality: ${brand.personality_tags.join(", ")}` : null,
      brand?.audience_description ? `Target audience: ${brand.audience_description}` : null,
      brand?.voice_style?.length ? `Voice: ${brand.voice_style.join(", ")}` : null,
      brand?.influencer_age ? `Spokesperson age: ${brand.influencer_age}` : null,
      brand?.influencer_gender ? `Spokesperson gender: ${brand.influencer_gender}` : null,
      brand?.influencer_ethnicity ? `Spokesperson ethnicity: ${brand.influencer_ethnicity}` : null,
      brand?.influencer_style ? `Spokesperson style: ${brand.influencer_style}` : null,
    ].filter(Boolean).join("\n");

    const modeBlock = hasReferenceImage
      ? `MODE: A reference image will be attached when each prompt is run. Do NOT describe the product visually — just say "the product."`
      : `MODE: NO reference image will be attached. You MUST describe the product in precise visual detail in every prompt (color, shape, packaging, label, finish, scale).`;

    const userMessage = `${modeBlock}

Brand context:
${ctx}

Write 5 distinct SCENE prompts (no headlines, no ad copy overlays). They must be visually distinct from each other and on-brand for this audience.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: STATIC_GEN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message?.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return Response.json({ error: "Claude did not return JSON" }, { status: 500 });
    const parsed = JSON.parse(jsonMatch[0]);
    const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts.slice(0, 5) : [];
    if (prompts.length < 5) return Response.json({ error: `Only ${prompts.length} prompts returned` }, { status: 500 });

    return Response.json({ prompts, shots: SHOTS });
  } catch (e) {
    console.error("[generate-prompts]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
