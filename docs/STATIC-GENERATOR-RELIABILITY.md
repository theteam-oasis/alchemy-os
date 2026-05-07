# Alchemy Static Generator — Reliability Architecture

## Context

Custom-built tool that takes a `clientId` + `productId`, pulls the brand kit
(colors, voice, audience, spokesperson) and product context from Supabase,
auto-derives 5 headlines + 5 image prompts (or accepts user-supplied ones),
and uses Google Gemini Nano Banana 2 (`gemini-3.1-flash-image-preview`) to
render the full **5 × 5 = 25-image cartesian product** of headlines × prompts.

Each generated image is uploaded to Supabase Storage (`brand-assets` bucket,
`portal/<projectId>/static-gen/`) and merged into the matching
`portal_projects.images` array so the client sees them in the Creatives review
tab on their portal.

Endpoints:

- `POST /api/static-generator/start` — orchestrator. Creates a `static_gen_jobs`
  row, returns `jobId` immediately, fans out N chained lanes.
- `POST /api/static-generator` — chunk worker. Processes a small slice
  (`offset`, `limit`) and chains the next chunk in its lane via `waitUntil`.
- `GET  /api/static-generator/status?id=<jobId>` — polled by the UI for
  progress, accumulated images, failure list, and `done` status.

Same failure modes as `/samples` were observed during peak hours (timeouts,
silent "no image returned" responses, 429 spirals). The fixes below mirror
the proven Python batch script at `/Users/testtest/agent2_creative.py` that
ran 400 images cleanly, adapted to this generator's chunked-lane architecture.

---

## Part 1: Reliability Fix — Mirroring the Proven Batch Script

The `/api/static-generator/route.js` `generateOne()` function was diffed
against the proven batch script. Five specific differences, each fixed:

### 1. Remove `imageSize` parameter (likely the biggest fix)

**Current (broken pattern):**

```js
generationConfig: {
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: { imageSize: "1K", aspectRatio },
}
```

**Fixed (mirroring batch script):**

```js
generationConfig: {
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: { aspectRatio },
}
```

`imageSize` is undocumented for `gemini-3.1-flash-image-preview` and silently
causes `"No image returned"` errors where the API returns text-only candidates
with no inline image data. The batch script never set it.

> Cost note in the original code claims 1K saves money vs. 2K. That's only
> meaningful if Gemini actually honors the parameter — empirically it doesn't,
> and the side effect is dropped images. Drop the param entirely.

### 2. Patient 180s timeouts (no explicit ceiling today)

**Current:**

```js
// no AbortController; falls back to default fetch timeout, which on Vercel
// serverless can fire well before Gemini finishes a slow generation
for (let attempt = 0; attempt < 3; attempt++) { ... }
```

**Fixed (mirroring `aiohttp.ClientTimeout(total=180)`):**

```js
const ATTEMPTS = [
  { timeout: 180000, rewritePrompt: false },
  { timeout: 180000, rewritePrompt: false },
  // ... all 180s, see Part 2
]
const ac = new AbortController()
const t = setTimeout(() => ac.abort(), cfg.timeout)
const res = await fetch(url, { signal: ac.signal, ... }).finally(() => clearTimeout(t))
```

Gemini image gen runs 30–60s under load. Any aggressive timeout kills
legitimate-but-slow generations. 180s is the proven ceiling.

> Watch the Vercel `maxDuration` interaction: chunk handler is `maxDuration = 60`,
> so even with a 180s fetch budget the function will be terminated at 60s.
> Either bump `maxDuration` to 300 (matching `/samples`) **or** keep `CHUNK = 1`
> so a slow generation can use the full 60s. Today `CHUNK = 2` + 60s = a single
> 50s+ image starves its sibling.

### 3. 60-second backoff on 429 rate limits

**Current:**

```js
if (res.status === 429 || res.status >= 500) {
  const wait = (attempt + 1) * (res.status === 429 ? 8000 : 3000)
  // 8s, 16s, 24s — never exits the rate-limit window
}
```

**Fixed (mirroring `GEMINI_429_WAIT = 60`):**

```js
const is429 = /429|rate limit/i.test(msg) || res.status === 429
const backoff = is429 ? 60000 : 5000
await new Promise((r) => setTimeout(r, backoff))
```

Google's rate-limit window is ~60s. Retrying inside it keeps the lane blocked.
Wait the full 60s and the quota actually resets.

### 4. Image-first parts order (when reference image is supported)

The static generator does not currently send a reference image — it relies
purely on the text prompt + brand-kit context. If/when reference images get
added (e.g., the actual product photo from `products.image_url`), the parts
order must put `inlineData` first, then `text`, mirroring the batch script's
`parts.insert(0, image)` pattern:

```js
parts: productImageBase64
  ? [
      { inlineData: { mimeType: productMimeType, data: productImageBase64 } },
      { text: prompt },
    ]
  : [{ text: prompt }],
```

### 5. Concurrency throttle (lanes × chunk)

Today: `LANES = 4`, `CHUNK = 2` → up to 8 concurrent Gemini calls per job.
With the 60s 429 backoff in place, this is safe on the current account quota.
If 429s start appearing in `static_gen_jobs.failures`, drop `LANES` to 3 or
`CHUNK` to 1 before adding a global semaphore — the lane chaining already
acts as a natural throttle once a single 429 fires (that lane stalls 60s
while the others keep moving).

---

## Part 2: 8-Attempt System with Claude Prompt Rewrites

Once the base config is fixed, the chunk worker loops 8 attempts per task,
mirroring the `/samples` strategy. Two distinct failure modes:

- **Transient** (timeout, 503, network blip, rate limit) → same prompt, retry.
- **Prompt-dependent** (safety-filter trip on offer/discount language,
  complexity-induced "no image returned") → different prompt.

### Architecture

```js
const ATTEMPTS = [
  { timeout: 180000, rewritePrompt: false }, // 1: original
  { timeout: 180000, rewritePrompt: false }, // 2: original retry — transient catch
  { timeout: 180000, rewritePrompt: true  }, // 3: Claude rewrite #1
  { timeout: 180000, rewritePrompt: false }, // 4: rewrite #1 retry
  { timeout: 180000, rewritePrompt: true  }, // 5: Claude rewrite #2
  { timeout: 180000, rewritePrompt: false }, // 6: rewrite #2 retry
  { timeout: 180000, rewritePrompt: true  }, // 7: Claude rewrite #3
  { timeout: 180000, rewritePrompt: false }, // 8: rewrite #3 retry
]
```

Pairs of two: original attempt + one same-prompt retry. If both fail, next
pair uses a freshly rewritten prompt. Fast on transient flakes, escapes
prompt-dependent dead ends with three different Claude variations.

### Claude rewrite function

`regenerateStaticPrompt({ brand, product, headline, prevPrompt, aspectRatio })`:

- Calls Claude Sonnet 4 with the same brand context (`brand_intake` + `products`
  fields) used by `buildPrompt()` in the chunk worker.
- User message includes: the headline copy, the previous failed visual prompt,
  the aspect ratio, and instructions to write a NEW visual variation: same
  shot intent, same brand voice, but different angle / composition / lighting /
  background.
- Returns `{ imagePrompt: "..." }` JSON.
- Cost: ~$0.005 per rewrite. Worst case (all 3 fire on a single task):
  ~$0.015 added. On a 25-image batch with a 5% rewrite rate: pennies.

### Loop body (chunk worker, per task in `slice`)

```js
let activePrompt = t.prompt
for (let attempt = 1; attempt <= 8; attempt++) {
  const cfg = ATTEMPTS[attempt - 1]
  if (cfg.rewritePrompt) {
    activePrompt = await regenerateStaticPrompt({
      brand, product, headline: t.headline,
      prevPrompt: activePrompt, aspectRatio,
    })
  }
  try {
    const img = await generateImageOnce(activePrompt, null, null, cfg.timeout)
    return img // success — break out of attempt loop
  } catch (err) {
    const msg = String(err?.message || err)
    const is429 = /429|rate limit/i.test(msg)
    await new Promise((r) => setTimeout(r, is429 ? 60000 : 5000))
  }
}
// All 8 attempts failed — push to `failures` array on the job row.
```

---

## Part 3: Chunked Lanes + Polling (the static-gen-specific bit)

Unlike `/samples` (which uses Server-Sent Events because all 6 slots are in
one serverless invocation), the static generator splits a 25-image job
across many chained invocations. The architecture:

1. **`/start`** creates a `static_gen_jobs` row with `total = headlines × prompts`,
   returns `jobId` immediately, then calls `waitUntil(fetch(chunkUrl, ...))`
   `LANES` times — one per parallel lane. Each lane starts at
   `offset = lane * CHUNK` and uses `stride = LANES * CHUNK`.
2. **Chunk worker** (`/api/static-generator`) processes its slice in parallel
   (`Promise.all` over `slice.length` tasks), uploads images, merges them into
   `portal_projects.images` and `static_gen_jobs.images`, increments
   `completed` / `failed` counters, then before returning fires the next
   chunk in its lane via `waitUntil(fetch(chunkUrl, { offset: offset + stride }))`.
3. The **last chunk in any lane** checks `(completed + failed) >= total` and,
   if true and status is still `running`, flips `status = "done"` and stamps
   `portal_slug` / `portal_id`.
4. **UI polls** `GET /api/static-generator/status?id=<jobId>` on a 1.5–2s
   interval and renders progress + accumulated images live. Survives tab close
   and navigation because all dispatch is server-side.

Concrete events the UI cares about (derived from polled state, not SSE):

- `status = "running"` and `completed + failed < total` → show progress bar.
- `images` array growing → render new tiles as they arrive.
- `failures` array entries → render an error card with retry button per failure.
- `status = "done"` → unlock the "Send to client portal" CTA, link to
  `/portal/<portal_slug>` where the Creatives tab now contains all 25.

### Failure isolation per task

Today: a single task throwing inside `Promise.all(slice.map(...))` is caught
in the per-task `try/catch`, so one bad image doesn't kill the chunk. Keep
that pattern. The 8-attempt loop wraps the inner call; the per-task `catch`
wraps the loop and pushes to `failed`.

### Per-task cancellation (future)

Static generator runs server-side after the user closes the tab, so true
"cancel" requires writing `status = "cancelled"` to the job row and having
the chunk worker check that flag at the top of each task. Not implemented
yet; lower priority than reliability.

---

## Part 4: Per-Image Regenerate (UI-side)

The Creatives review tab shows the 25 generated images. Each tile gets a
"Regenerate this one" button that:

1. POSTs to `/api/static-generator` with `headlines: [thatHeadline]`,
   `imagePrompts: [thatPrompt]`, `limit: 1`, no `jobId`, no `chain`.
2. Receives the new image inline in the response (no polling needed — single
   image fits inside one 60s invocation).
3. Replaces the tile in `portal_projects.images` by `id`.

Same `AbortController` pattern as `/samples`: store the controller in
`tileAbortRef.current[imageId]`, abort on re-click, only clear loading state
if `tileAbortRef.current[imageId] === ac` so a stale cancelled call doesn't
clobber the new attempt's spinner.

---

## Part 5: Reference Image Handling (when added)

If/when the static generator starts sending the actual product photo as a
reference (pulled from `products.image_url`):

```js
async function compressImage(blobOrFile, maxDim = 1024, quality = 0.85) {
  // data URL → Image → canvas at max 1024px → JPEG at 0.85 quality
  // 4MB photo → ~150KB
}
```

A 25-image batch with up to 8 attempts per slot = up to 200 Gemini calls
per job. A 4MB → 150KB compression cuts ~770MB of upload traffic per job
in the worst case. Compress once at the brand-kit / product-creation step
and store the compressed version on the row, so the chunk worker can attach
it without re-fetching the original each time.

When reference image is **not** provided, the chunk worker already falls back
to the existing brand-kit-derived `buildPrompt()` + `deriveDefaultPrompts()`
pattern. That's the equivalent of `/samples` MODE B.

---

## Part 6: Prompt Architecture

Static generator currently builds prompts inline in `buildPrompt()` from
`brand_intake` + `products` columns:

- `brand_colors`, `personality_tags`, `audience_description`, `voice_style`,
  `influencer_age/gender/ethnicity/style`, `product.name/description`.
- Visual direction (`imagePrompt`) is auto-derived if missing via
  `deriveDefaultPrompts()` — 5 named scenes (hero, lifestyle, close-up,
  spokesperson portrait, in-context).
- Headline overlay is rendered as actual readable text in the image, not a
  watermark.
- Aspect-ratio-aware framing string ("Vertical 9:16 social/Story format" /
  "Widescreen 16:9" / "Square 1:1 feed").

To bring this up to `/samples` quality, lift the same structure into a
`STATIC_GEN_SYSTEM_PROMPT` constant the Claude rewrite function (Part 2)
can call, including:

1. Audience identification step (demographics + psychographics).
2. Brand tone bucket (clinical / luxury / wellness / playful / gritty).
3. Audience → visual translation table (6 archetypes).
4. Audience → copy translation (mirror exact pain language).
5. Surrealism-as-tool devices (A–H).
6. Typography devices (T1–T10).
7. DR copy principles (Halbert/Hormozi-level: specificity, banned filler).
8. Locked-order shot specs:
   - **DR shots** (Bold Claim, Social Proof, Offer) → headline + CTA + badge.
   - **Brand shots** (Product Hero, Editorial, Lifestyle) → no overlays.

The static generator already has the `headline` channel for DR overlay —
when `imagePrompt` is one of the brand-shot archetypes, the rewriter should
strip the overlay instruction and let the headline render below the image
in the portal UI, not on the image itself.

---

## Stack

- Frontend: Next.js 14.2 App Router, React, inline-style design system.
- Image gen: Google Gemini Nano Banana 2 via Generative Language API
  (`generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`).
- Prompt gen / rewrites: Claude Sonnet 4 via Anthropic SDK.
- Storage: Supabase (`brand-assets` bucket) under
  `portal/<projectId>/static-gen/<uuid>.{png,jpg,webp}`.
- Hosting: Vercel serverless functions:
  - `/start` — `maxDuration = 30`.
  - `/api/static-generator` (chunk worker) — `maxDuration = 60` (bump to 300
    if patient 180s timeouts are enabled).
  - `/status` — fast read, default duration.
- Progress: poll-based (`static_gen_jobs` row) — durable across tab close,
  navigation, and backgrounding. Not SSE because the work is fanned out
  across many invocations.

---

## TL;DR — Static-Generator-Specific Action Items

1. Drop `imageSize: "1K"` from `imageConfig`.
2. Add `AbortController` with 180s timeout per Gemini fetch; bump chunk
   worker `maxDuration` to 300 to match.
3. Replace `(attempt + 1) * 8000` 429 backoff with flat 60s on 429, 5s otherwise.
4. Replace 3-attempt `for` loop with 8-attempt `ATTEMPTS` table including
   3 Claude rewrite slots.
5. Add `regenerateStaticPrompt()` calling Claude Sonnet 4 with brand + product
   context + previous failed prompt.
6. Wire failures into `static_gen_jobs.failures` so the UI can render a retry
   button per failed `(headline, imagePrompt)` pair.
7. (Future) Compress + attach product reference image; switch to image-first
   `parts` order when present.
8. (Future) Lift `buildPrompt()` into a `STATIC_GEN_SYSTEM_PROMPT` constant
   shared between initial generation and Claude rewrites, with locked DR vs.
   brand-shot text rules.
