import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SAMPLES_SYSTEM_PROMPT = `You generate 6 locked-order image-gen prompts. Output reference: iklipse / Highsnobiety / Vogue / Apple campaign aesthetic. NEVER stock, NEVER Amazon-listing-on-white, NEVER tame.

PRODUCT DESCRIPTION RULE — CHECK WHICH MODE:
The user message will tell you whether a product reference image is attached or not. Two modes:

• MODE A — REFERENCE IMAGE ATTACHED (default): NEVER describe the product. The image handles all visual details. Just say "the product." No colors, shapes, labels, logos, materials.

• MODE B — NO REFERENCE IMAGE (fallback): The user couldn't get a clean product photo. You MUST describe the product in vivid visual detail in every prompt — exact color, shape, packaging, label, finish, scale relative to a hand, any visible logo or text. Pull these details from the brand's website (product page photos, descriptions, ingredient/component callouts). The image generator has nothing else to go on, so your description IS the product. Be precise: "a 3-inch matte forest-green glass jar with a flat black screw-top lid, bold off-white serif Seed wordmark centered, 'DS-01 DAILY SYNBIOTIC' in small caps below" beats "a probiotic jar."

STEP 1 — READ THE BRAND. THIS COMES FIRST.
Before anything else, parse the brand site for its actual aesthetic. Identify:
• Tone: clinical, luxurious, gritty, playful, minimalist, heritage, Gen-Z, premium-wellness, etc.
• Visual cues: typography style, color palette, photography style on their site, packaging finish.
• Customer aspiration: who does this brand make their customer feel like?
The brand's DNA is the master directive. Everything below — surrealism, casting, lighting — is a TOOL to express that DNA, never to override it.

STEP 2 — APPLY SURREALISM IN SERVICE OF THE BRAND, NEVER AGAINST IT.

Different brands need different flavors of surrealism. The aesthetic LEVEL must match the brand. Get this wrong and you make the brand look ridiculous or off-brand:

• CLEAN / CLINICAL / SCIENTIFIC (Seed, Function Health, Eight Sleep, Hims, Apple) → CLEAN CLINICAL SURREALISM. Pristine. Minimal. Studio-grade lighting. Beautifully-rendered scientific elements (microscopy, anatomical, molecular). NEVER dirty, never messy hair, never soil-splattered, never "disheveled scientist in muddy forest." Think: a single capsule levitating in pristine white space with a perfect halo of clean illustrated bacteria. Dr. casting should be GROOMED, sharp, premium — like a Vogue editorial of a top scientist, not a stock-photo lab worker.

• PREMIUM LUXURY / MINIMALIST HERITAGE (Aesop, Le Labo, Loewe, Hermès) → MINIMAL POETIC SURREALISM. Restraint. Negative space. ONE bold device, never multiple. Refined editorial typography. Subtle dream physics or top-down composition. Never wacky, never eccentric.

• WELLNESS / LIFESTYLE / MID-LUXURY (Athletic Greens, Recess, Olipop, Glossier) → SOFT POETIC SURREALISM. Dream physics, golden-hour, painterly. Distinctive casting but still beautiful, never eccentric to the point of weird.

• PLAYFUL / CPG / GEN-Z (Liquid Death, Nutter Butter, MSCHF, Loops) → FULL LACHAPELLE SURREAL. Eccentric casting, bright saturated color, weird props, surreal scale exaggeration, chaos welcome.

• GRITTY / MASCULINE / PERFORMANCE (Cerebral, Bulletproof, Liquid IV) → GROUNDED CINEMATIC SURREAL. Hard lighting, real-world settings pushed slightly impossible. Strong masculine archetypes, never goofy.

DECIDE THE BRAND'S BUCKET FIRST, then build prompts inside that visual language. When in doubt: stay clean, premium, restrained. Better to be slightly tame on-brand than wildly off-brand.

CRITICAL — examples below are CONCEPT FRAMEWORKS, not literal templates. Never copy. Translate the device to fit the brand's bucket. A probiotic brand doesn't need an Eiffel Tower of capsules — it might use surreal scale by showing one capsule the size of a grapefruit cradled in pristine hands against a clean gradient. The DEVICE is the framework; the EXECUTION must match the brand DNA.

NAMED CREATIVE DEVICES — every prompt MUST use 2-3 of these as CONCEPTUAL TOOLS (translate them to fit the brand, never copy the examples literally):

A. SURREAL SCALE — something massively bigger or smaller than reality. (e.g. iconic landmark made entirely of one product element, single product oversized in a public space, model dwarfed by their product.) Adapt the scale device to whatever fits the brand.

B. CONTEXTUAL COLLISION — pair two worlds that don't belong. (e.g. cheap product treated like luxury, traditional figure in modern sport, formal setting for casual product.) Tension creates attention.

C. OBJECT REPLACEMENT / MERGE — substitute one thing for another visually. (e.g. one circular object becomes another, product replaces a celestial body, fabric wrapped around an unexpected object.)

D. IMPOSSIBLE ARCHITECTURE / DREAM PHYSICS — locations that defy gravity. (e.g. infrastructure floating in clouds, ground replaced by water, Escher-like recursion.)

E. EXTREME LOW-ANGLE HERO — camera below subject, massive headline wraps the head against saturated sky. Product held forward into camera, distorted in scale. 24mm lens. Model dominates.

F. TOP-DOWN GOD VIEW — overhead drone perspective. Reveals pattern, symmetry, surprise that you can't see from eye-level.

G. ECCENTRIC / DISTINCTIVE CASTING — cast a CHARACTER, not a generic stock face. Older subjects with weathered features, eccentric stylists, cultural specificity, prosthetic-sharp features. Personality > generic beauty. (Calibrate eccentricity to brand tone — see calibration block above.)

H. ACTION-FROZEN PHYSICS — single impossible-feeling moment. (e.g. animal mid-leap, hair mid-toss, liquid mid-splash.)

LAYOUT & TYPOGRAPHY DEVICES — most prompts use several:

T1. MASSIVE BOLD SANS HEADLINE that crops/wraps the subject. Headline runs behind, in front of, or partially behind the model so it feels integrated, not pasted on. Specify exact word break ("AI REPLACES" line 1 / "SHOOTS" line 2, both flush-center, headline 30% of frame height).

T2. ITALIC EDITORIAL SERIF SUBHEAD paired with the bold sans — extreme contrast in weight + style. ("And here's the fix" / "Swipe →" / "Not just visuals.")

T3. RULE-NUMBER FRAMING — small "RULE #2 ·" or "TIP #3 ·" pre-headline in tracked caps, then big headline below.

T4. CONTRAST-PAIR HEADLINE — "Tradition × Adventure" / "AI + Products = Storytelling" / "Same Candy / Different Look" — two opposing words joined by ×, +, =, or /.

T5. HAND-DRAWN MARKER ARROWS / CIRCLES / SCRIBBLES in pure white or brand accent. Curved arrows pointing from headline to product, lasso circles around a detail, underline strokes for emphasis.

T6. CURVED TYPE wrapping along an arm, sleeve, or curve in the image ("Swipe →" hand-painted along a forearm).

T7. DIAGONAL TAPE BANNER — saturated stripe stretched across frame, repeating tracked-caps text ("LIMITED LAUNCH OFFER · LIMITED LAUNCH OFFER · LIMITED").

T8. STARBURST DIE-CUT BADGE — tilted ~15°, contrasting brand color, "25% OFF" / "★★★★★ 12K" / "60-DAY GUARANTEE."

T9. PILL CTA WITH ARROW — "→" or "»»»" inside or after the button text.

T10. BRAND CORNER MARKS — small wordmark top-left, section/category tag top-right, URL bottom-left. Frames the ad like an editorial spread.

DR COPY (Bold Claim, Social Proof, Offer) — Halbert/Hormozi level:
• Specific numbers + timeframes pulled from brand site.
• Benefit-first, customer-voice, never feature-first.
• Provocative direct headlines ("YOUR ADS SUCK!" / "Premium Is Perception" / "Stop guessing. Start converting.").
• Real testimonials/offers verbatim from site (or write one matching customer voice if none).
• CTA = strong verb + outcome ("Claim 40% Off" / "Lock In" / "Start" — NEVER "Shop Now" alone or "Learn More").
• BANNED words: "Discover," "Introducing," "Welcome," "Premium quality," "Made with love," "We believe," "Crafted," "Experience the difference."

LAYOUT MASTERY — for every text element specify exact word count per line, explicit hierarchy ratio ("headline 4× subhead"), alignment grid, and 5-8% safe margin. Use solid color blocks behind text on busy backgrounds for legibility.

THE 6 SHOTS (locked order):

CRITICAL RULE — TEXT vs NO TEXT:
• DR SHOTS (Bold Claim, Social Proof, Offer) = always carry headlines, subheads, CTAs, badges, etc. Full ad copy treatment.
• BRAND SHOTS (Product Hero, Editorial, Lifestyle) = NO HEADLINES. NO TEXT OVERLAYS. NO CTAS. NO BADGES. NO "RULE #X" framing. Pure visual storytelling. The image alone communicates. (A small brand wordmark in a corner is fine; advertising copy is not.)

1. BOLD CLAIM AD (DR — has text): Pick 2-3 creative devices in the brand's bucket. Build a heightened world around the product. Massive headline (3-7 words) integrating with the subject — provable claim with number/contrast/curiosity. Italic serif subhead. Pill CTA + small star badge. Optional hand-drawn arrow. Specify model casting (or no model). Camera and lighting that match the surreal world.

2. PRODUCT HERO (brand — NO TEXT): Product is the hero in a surreal or world-built context that matches the brand bucket. Examples: floating in dream physics (D), oversized at impossible scale (A), or in an unexpected elevated context (B). For clinical brands → pristine clean surrealism with scientific elements. For luxury → minimal poetic. For playful → wild. Tight composition, dramatic specific lighting. 1-2 contextual props. NO PEOPLE. NO TEXT OVERLAYS — pure product photography.

3. SOCIAL PROOF AD (DR — has text): iPhone-style real-customer feel, scene can be slightly elevated/cinematic. 26mm f/1.8, JPEG warmth. Real customer in real-life environment matching the brand customer (kitchen, bathroom, gym, car, café). Handwritten-style testimonial overlay: before-state + specific result with number + emotional payoff. First name + location. 5 filled brand-color stars + "12,847 reviews" or "Verified Buyer" badge. Specific CTA. End with "Shot on iPhone energy."

4. EDITORIAL (brand — NO TEXT): Magazine-cover portrait of a stunning model on-brand. Casting matches the brand bucket (clinical = sharp/groomed Vogue-style scientist; luxury = refined heritage face; playful = eccentric character; performance = strong archetype). Direct eye contact. Product held or interacting with the figure. Background: bold saturated brand color, blown gradient, or moody dark — match brand palette. Single hard key, sculptural shadow, brand-color rim. Optional small surreal element ON-BRAND. Real skin texture, on-brand wardrobe (premium brands → crisp/groomed; never dirty/disheveled unless that IS the brand). Camera: 85mm f/1.2. NO TEXT OVERLAYS.

5. OFFER AD (DR — has text): Editorial or surreal hero shot + offer-stack overlay. Headline = offer as benefit ("Save $40 On Your First Order" / "Your First Month $1"). Price anchor visually shown (strikethrough $89 → $49 in brand accent). Real urgency line ("Ends Sunday" / "Only 47 left"). Diagonal OFFER tape (T7). Starburst badge with discount % (T8). Big CTA ("Claim 40% Off" / "Lock In My Price"). Trust microcopy below ("60-day guarantee · ★★★★★ 12K"). Camera: 85mm f/1.4.

6. LIFESTYLE (brand — NO TEXT): Real environment matching how the product is actually used in the customer's real life. 1-2 people NOT looking at camera, mid-action candid moment. Cinematic or surreal lift on-brand (top-down god view, action-frozen physics, color-pop). On-brand wardrobe and styling — premium brands stay premium. Natural or motivated cinematic light. Documentary feel but visually elevated. Product woven into the scene, not centerpiece. Camera: 35-50mm f/1.8. NO TEXT OVERLAYS.

PERMANENT RULES:
1. Don't describe the product visually.
2. No cannabis/THC/CBD/dispensary mentions.
3. No aspect ratios (1:1 etc.).
4. Describe fonts visually ("bold condensed geometric sans" not "Druk").
5. End every prompt: "Use attached image as product reference."
6. Each prompt 140-200 words. Include the surreal/world-building concept, the model casting (if any), the typography devices, the lighting, and a mood phrase at the end.
7. Match brand voice from URL. Pull real claims/testimonials/offers.
8. If brand site is non-English, write copy in that language.

The goal is a scroll-stop. If a prompt could describe any brand on white, REWRITE IT.

OUTPUT FORMAT — Return ONLY valid JSON with no other text:
{
  "prompts": [
    "<full prompt 1: BOLD CLAIM AD>",
    "<full prompt 2: PRODUCT HERO>",
    "<full prompt 3: SOCIAL PROOF AD>",
    "<full prompt 4: EDITORIAL>",
    "<full prompt 5: OFFER AD>",
    "<full prompt 6: LIFESTYLE>"
  ]
}`

// Re-write a single slot's prompt as a fresh variation. Used for manual retry
// when the team wants a different take (e.g. when safety filters tripped or
// the existing prompt produced a bad image).
async function regenerateSinglePrompt(brandUrl, slotIndex, currentPrompt, hasReferenceImage = true) {
  const slotNames = ['BOLD CLAIM AD', 'PRODUCT HERO', 'SOCIAL PROOF AD', 'EDITORIAL', 'OFFER AD', 'LIFESTYLE']
  const slotName = slotNames[slotIndex] || 'AD'
  const modeBlock = hasReferenceImage
    ? `MODE: Reference image attached. Do NOT describe the product visually — just say "the product."`
    : `MODE: NO reference image. You MUST describe the product in precise visual detail (color, shape, packaging, label, finish, scale). Your description IS the product since the image generator has nothing else to go on.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SAMPLES_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Brand URL: ${brandUrl}

${modeBlock}

I previously generated this prompt for the ${slotName} slot, but the image came back wrong (or got rejected by safety filters, or just isn't striking enough). Please write a FRESH variation of just this one prompt.

Rules for the new variation:
- Same shot TYPE (still ${slotName})
- Same brand voice + same brand-specific claims/testimonials/offers from the URL
- Different visual angle, composition, lighting, location, model casting, or styling
- Different specific phrasing in any text overlays (especially for offer/social-proof copy that may have tripped a content filter)
- Follow ALL the rules from the system prompt

Previous prompt that needs replacing:
"""
${currentPrompt}
"""

Return ONLY a JSON object with one key: { "prompt": "<full new prompt as a single string>" }
No markdown, no code fences, no explanation.`
    }],
  })

  const text = message.content.find(b => b.type === 'text')?.text || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed.prompt) throw new Error('No prompt in response')
    return parsed.prompt
  } catch (e) {
    throw new Error(`Failed to parse fresh prompt: ${cleaned.slice(0, 300)}`)
  }
}

async function generatePrompts(brandUrl, hasReferenceImage = true) {
  const modeBlock = hasReferenceImage
    ? `MODE: A reference image will be attached when each prompt is run. Do NOT describe the product visually — just say "the product."`
    : `MODE: NO reference image will be attached. You MUST describe the product in precise visual detail in every prompt (exact color, shape, packaging, label, finish, scale). Pull product details from the brand site product pages and product photography. Without the reference image, your description IS the product.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: SAMPLES_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `URL: ${brandUrl}

${modeBlock}

This URL may be either:
• A specific product page (preferred) — pull claims, testimonials, offers, and copy directly from it
• OR the brand's homepage / general website — in this case, identify the brand's hero/primary product, then pull claims, testimonials, brand voice, and offers from across the site

Generate the 6 locked-order prompts. Return ONLY the JSON object — no markdown, no explanations, no code fences.`
    }],
  })

  const text = message.content.find(b => b.type === 'text')?.text || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed.prompts || parsed.prompts.length !== 6) {
      throw new Error('Invalid prompts response')
    }
    return parsed.prompts
  } catch (e) {
    throw new Error(`Failed to parse prompts: ${cleaned.slice(0, 300)}`)
  }
}

// ─── OpenAI image API ───
// Production-grade reliability + far better text rendering than Gemini.
// Uses /v1/images/edits with the product reference as the image input.
// Default model is gpt-image-2 (newest), but we accept any modelName so we
// can fall back to gpt-image-1 if gpt-image-2 isn't available on this account.
async function generateImageOpenAI(prompt, productImageBase64, productMimeType, timeoutMs, modelName = 'gpt-image-2') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  // Build multipart form-data body. fetch in Node 18+ supports FormData/Blob natively.
  const imgBuffer = Buffer.from(productImageBase64, 'base64')
  const ext = productMimeType.includes('jpeg') || productMimeType.includes('jpg') ? 'jpg' : 'png'
  const imgBlob = new Blob([imgBuffer], { type: productMimeType })

  const formData = new FormData()
  formData.append('model', modelName)
  formData.append('prompt', prompt)
  formData.append('size', '1024x1024')
  formData.append('quality', 'high')
  formData.append('n', '1')
  formData.append('image', imgBlob, `reference.${ext}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      // Surface OpenAI's actual error message (which is usually descriptive — model
      // not available, org needs verification, rate limit, billing, etc.)
      console.error(`[OpenAI ${modelName}] ${response.status}:`, text.slice(0, 500))
      throw new Error(`OpenAI ${modelName} ${response.status}: ${text.slice(0, 400)}`)
    }

    const data = await response.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) throw new Error(`No image returned from OpenAI: ${JSON.stringify(data).slice(0, 300)}`)

    return { mimeType: 'image/png', base64: b64 }
  } finally {
    clearTimeout(timer)
  }
}

async function generateImageOnce(prompt, productImageBase64, productMimeType, timeoutMs, modelName = 'gemini-3.1-flash-image-preview') {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: productImageBase64
            ? [
                { text: prompt },
                { inlineData: { mimeType: productMimeType, data: productImageBase64 } },
              ]
            : [{ text: prompt }],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            // 1K is ~4x faster than 2K and plenty for ad creative.
            // Flow uses 1K by default, which is why it feels snappy.
            imageSize: '1K',
            aspectRatio: '1:1',
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`)
    }

    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData)

    if (!imagePart) throw new Error('No image returned from Gemini')

    return {
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      base64: imagePart.inlineData.data,
    }
  } finally {
    clearTimeout(timer)
  }
}

// Gemini Nano Banana 2 only — 8 attempts in sets of 2. Every other set gets a
// freshly rewritten prompt from Claude. Attempts 1-2 use original. Attempts 3-4
// use fresh rewrite #1. Attempts 5-6 use fresh rewrite #2. Attempts 7-8 use
// fresh rewrite #3. Maximizes success even when Google's API is overloaded.
async function generateImage(prompt, productImageBase64, productMimeType, onAttempt, ctx = {}) {
  const ATTEMPTS = [
    { timeout: 30000, rewritePrompt: false }, // attempt 1: original prompt
    { timeout: 25000, rewritePrompt: false }, // attempt 2: original prompt (one retry)
    { timeout: 25000, rewritePrompt: true },  // attempt 3: fresh rewrite #1
    { timeout: 25000, rewritePrompt: false }, // attempt 4: same fresh rewrite #1 (one retry)
    { timeout: 20000, rewritePrompt: true },  // attempt 5: fresh rewrite #2
    { timeout: 20000, rewritePrompt: false }, // attempt 6: same fresh rewrite #2
    { timeout: 20000, rewritePrompt: true },  // attempt 7: fresh rewrite #3
    { timeout: 20000, rewritePrompt: false }, // attempt 8: same fresh rewrite #3 (last shot)
  ]
  const MAX_ATTEMPTS = ATTEMPTS.length
  let lastErr = null
  let lastUnderlyingMsg = ''
  let activePrompt = prompt

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const cfg = ATTEMPTS[attempt - 1]

    // If this attempt should rewrite the prompt AND we have brand context,
    // ask Claude for a new variation before firing the image call.
    if (cfg.rewritePrompt && ctx.brandUrl && typeof ctx.slotIndex === 'number') {
      try {
        activePrompt = await regenerateSinglePrompt(ctx.brandUrl, ctx.slotIndex, activePrompt)
        console.log(`[generateImage] attempt ${attempt}: using freshly rewritten prompt`)
      } catch (e) {
        console.error(`[generateImage] prompt rewrite failed, keeping existing:`, e.message)
      }
    }

    try {
      if (onAttempt) onAttempt(attempt)
      return await generateImageOnce(activePrompt, productImageBase64, productMimeType, cfg.timeout)
    } catch (err) {
      lastErr = err
      const msg = err?.message || ''
      lastUnderlyingMsg = msg.slice(0, 250)
      const isAbort = err?.name === 'AbortError'
      const isRetryable =
        isAbort ||
        /timeout|abort|no image returned|5\d\d|network|ECONN|ETIMEDOUT|fetch failed|429|rate limit|model.*not.*found|model.*does.*not.*exist|invalid_model|access|verify|verified|tier|safety|content_policy/i.test(msg)
      console.error(`[generateImage] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, msg.slice(0, 400))
      if (!isRetryable || attempt === MAX_ATTEMPTS) {
        if (isAbort) {
          throw new Error(`Image API timed out after ${MAX_ATTEMPTS} attempts. Hit Retry to try again.`)
        }
        throw new Error(`Failed after ${MAX_ATTEMPTS} attempts. Last: ${lastUnderlyingMsg}`)
      }
      const backoff = 800 * Math.pow(2, attempt - 1)
      await new Promise(r => setTimeout(r, backoff))
    }
  }
  throw lastErr
}

export async function POST(request) {
  const { brandUrl, productImageUrl, mode, slotIndex, prompts: providedPrompts, freshPrompt, currentPrompt } = await request.json()

  const hasReferenceImage = !!productImageUrl

  // ─── Prompt-only mode: rewrite a single prompt via Claude, no image gen ───
  if (mode === 'prompt-only' && typeof slotIndex === 'number') {
    try {
      if (!brandUrl) return Response.json({ error: 'brandUrl required' }, { status: 400 })
      const newPrompt = await regenerateSinglePrompt(brandUrl, slotIndex, currentPrompt || '', hasReferenceImage)
      return Response.json({ success: true, slotIndex, prompt: newPrompt })
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 })
    }
  }

  if (!brandUrl) return Response.json({ error: 'brandUrl required' }, { status: 400 })
  // productImageUrl is optional — if omitted, we generate text-to-image and
  // tell Claude to describe the product in detail in each prompt.

  // ─── Single slot regeneration: keep as plain JSON response ───
  if (mode === 'single' && typeof slotIndex === 'number') {
    try {
      let productImageBase64 = null
      let productMimeType = null
      if (hasReferenceImage) {
        const imgRes = await fetch(productImageUrl)
        if (!imgRes.ok) return Response.json({ error: 'Failed to fetch product reference image' }, { status: 400 })
        const imgBuffer = await imgRes.arrayBuffer()
        productImageBase64 = Buffer.from(imgBuffer).toString('base64')
        productMimeType = imgRes.headers.get('content-type') || 'image/png'
      }

      let prompts = providedPrompts
      if (!prompts || prompts.length !== 6) prompts = await generatePrompts(brandUrl, hasReferenceImage)

      let promptForGen = prompts[slotIndex]
      if (freshPrompt) {
        try {
          promptForGen = await regenerateSinglePrompt(brandUrl, slotIndex, prompts[slotIndex], hasReferenceImage)
          prompts = prompts.map((p, i) => (i === slotIndex ? promptForGen : p))
        } catch (e) {
          console.error('Fresh prompt rewrite failed, using existing prompt:', e.message)
        }
      }

      const image = await generateImage(promptForGen, productImageBase64, productMimeType, undefined, { brandUrl, slotIndex, hasReferenceImage })
      return Response.json({
        success: true,
        slotIndex,
        prompts,
        image: `data:${image.mimeType};base64,${image.base64}`,
      })
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 })
    }
  }

  // ─── All-6 mode: stream Server-Sent Events as each image completes ───
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        // Fetch product reference image (optional — skip if not provided)
        let productImageBase64 = null
        let productMimeType = null
        if (hasReferenceImage) {
          send({ type: 'status', message: 'Loading product reference...' })
          const imgRes = await fetch(productImageUrl)
          if (!imgRes.ok) {
            send({ type: 'error', fatal: true, error: 'Failed to fetch product reference image' })
            controller.close()
            return
          }
          const imgBuffer = await imgRes.arrayBuffer()
          productImageBase64 = Buffer.from(imgBuffer).toString('base64')
          productMimeType = imgRes.headers.get('content-type') || 'image/png'
        }

        // Get prompts (Claude knows whether to describe the product based on hasReferenceImage)
        let prompts = providedPrompts
        if (!prompts || prompts.length !== 6) {
          send({ type: 'status', message: hasReferenceImage ? 'Writing 6 prompts from brand site...' : 'Writing 6 detailed prompts (no reference image)...' })
          prompts = await generatePrompts(brandUrl, hasReferenceImage)
        }
        send({ type: 'prompts', prompts })
        send({ type: 'status', message: 'Generating 6 images (Nano Banana 2, 3 at a time)...' })

        // Gemini's preview API rate-limits hard at 6 concurrent. 3 is the
        // sweet spot between wall-clock speed and reliability.
        const CONCURRENCY = 3
        let completed = 0
        const total = 6
        let inFlight = 0
        const waiters = []
        const acquire = () => new Promise((resolve) => {
          if (inFlight < CONCURRENCY) { inFlight++; resolve() }
          else waiters.push(resolve)
        })
        const release = () => {
          inFlight--
          const next = waiters.shift()
          if (next) { inFlight++; next() }
        }

        const tasks = prompts.map(async (prompt, i) => {
          await acquire()
          try {
            send({ type: 'imageStart', slotIndex: i, startedAt: Date.now() })
            const onAttempt = (attemptNum) => {
              if (attemptNum > 1) {
                send({ type: 'imageRetry', slotIndex: i, attempt: attemptNum })
              }
            }
            const image = await generateImage(prompt, productImageBase64, productMimeType, onAttempt, { brandUrl, slotIndex: i, hasReferenceImage })
            completed++
            send({
              type: 'image',
              slotIndex: i,
              dataUrl: `data:${image.mimeType};base64,${image.base64}`,
              completed,
              total,
            })
          } catch (err) {
            completed++
            send({
              type: 'imageError',
              slotIndex: i,
              error: err?.message || 'Generation failed',
              completed,
              total,
            })
          } finally {
            release()
          }
        })

        await Promise.all(tasks)
        send({ type: 'done' })
        controller.close()
      } catch (err) {
        send({ type: 'error', fatal: true, error: err.message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
