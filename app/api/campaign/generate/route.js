import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractText(message) {
  if (!message?.content?.length) throw new Error('Empty response from Claude')
  const block = message.content.find(b => b.type === 'text')
  if (!block?.text) throw new Error('No text block in Claude response')
  return block.text.trim()
}

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

export async function POST(request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  if (type === 'scripts') return generateScripts(request)
  if (type === 'directions') return generateDirections(request)
  if (type === 'avatar-prompts') return generateAvatarPrompts(request)
  if (type === 'shot-list') return generateShotList(request)
  if (type === 'scene-prompts') return generateScenePrompts(request)

  return Response.json({ error: 'Unknown type' }, { status: 400 })
}

async function generateScripts(request) {
  try {
    const { concept, analysis, duration = 30, previousScripts = [] } = await request.json()
    const wordCount = Math.round(duration * 2.3)
    const avoidBlock = previousScripts.length > 0
      ? `AVOID these hooks: ${previousScripts.map(s => s.hook).join(' | ')}`
      : ''

    const prompt = `You are a top ad copywriter. Write 4 short, production-ready ad scripts.

CONCEPT: ${concept.title} — ${concept.theme}
PRODUCT: ${analysis.heroProduct}
TRANSFORMATION: ${analysis.desiredTransformation}
TONE: ${analysis.websiteTone}
DURATION: ${duration} seconds
WORD COUNT: Each fullScript must be approximately ${wordCount} spoken words — no more, no less. This is critical for timing.
${avoidBlock}

Rules:
- Real spoken voiceover lines only, not scene descriptions
- Each script has a genuinely different structure and emotional approach
- fullScript must be exactly ~${wordCount} words of actual spoken content
- Include hook, body, CTA naturally in the flow

Return JSON array only, no markdown:
[{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":"","approach":"","estimatedDuration":"${duration}s"}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const scripts = parseJSON(extractText(message))
    return Response.json({ success: true, scripts })
  } catch (error) {
    console.error('Scripts error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateDirections(request) {
  try {
    const { concept, analysis } = await request.json()

    const prompt = `Generate 4 distinct visual directions for this ad campaign.

CONCEPT: ${concept.title} — ${concept.visualUniverse}
TONE: ${analysis.websiteTone}

Each direction = different film. All fields max 10 words each.

Return JSON array only, no markdown:
[{"title":"","colorWorld":"","lighting":"","lensAndCamera":"","environment":"","texture":"","editingFeel":"","designLanguage":"","cinematicReference":"","summary":""}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const directions = parseJSON(extractText(message))
    return Response.json({ success: true, directions })
  } catch (error) {
    console.error('Directions error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateAvatarPrompts(request) {
  try {
    const { concept, direction, analysis } = await request.json()

    // Lock in a single consistent portrait style for all 4 avatars
    const sharedStyle = `Editorial portrait photography. ${direction.colorWorld} color grading. ${direction.lighting} lighting. Shallow depth of field, softly blurred neutral background. Same camera setup and color treatment across all 4 — only the person changes.`

    const prompt = `Generate 4 avatar character portrait prompts for an ad campaign.

CAMPAIGN: ${concept.title}
SHARED VISUAL STYLE (IDENTICAL across all 4): ${sharedStyle}
TARGET CUSTOMER: ${analysis.targetCustomer}
BRAND TONE: ${analysis.websiteTone}

CRITICAL RULES:
- Every prompt MUST be a tight chest-up portrait, direct or slight angle to camera
- All 4 share THE EXACT SAME lighting, color grading, background treatment, and camera setup
- The ONLY difference between the 4 is the person themselves
- Show face clearly, hair, skin, outfit, expression — like choosing a character in a game
- 4 completely different people: vary age, ethnicity, gender expression, style, energy
- Each imagePrompt starts with the shared style, then describes the specific person

Return JSON array only, no markdown:
[{"label":"short character name","imagePrompt":"full prompt starting with the shared style then the specific character"}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const avatarPrompts = parseJSON(extractText(message))
    return Response.json({ success: true, avatarPrompts })
  } catch (error) {
    console.error('Avatar prompts error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateShotList(request) {
  try {
    const { script, duration, concept, direction, avatarLabel, hasProduct, aspectRatio } = await request.json()

    const sceneCount = Math.round(duration / 2.5)
    const formatNote = aspectRatio === '9:16' ? 'Vertical format (9:16) — compose shots for mobile/portrait viewing' : 'Horizontal format (16:9) — compose shots for widescreen/landscape viewing'

    const prompt = `You are a film director creating a shot list for a ${duration}-second commercial.

CAMPAIGN: ${concept.title} — ${concept.theme}
VISUAL DIRECTION: ${direction.title} — ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
CHARACTER: ${avatarLabel}
FORMAT: ${formatNote}
${hasProduct ? 'PRODUCT: The client product will appear in some scenes — plan INSERT and CU shots that feature the product naturally.' : ''}
FULL SCRIPT: "${script.fullScript}"

Create exactly ${sceneCount} shots covering this script like a professional commercial director.

SHOT VARIETY — use all of these throughout, varying like a real film:
- ECU: extreme close up — eyes, hands, skin texture, product detail
- CU: close up — face, emotional reaction, character moment
- MCU: medium close up — chest up, character speaking or reacting
- MS: medium shot — waist up, character active in environment  
- WS: wide shot — full environment, character visible but not dominant
- EWS: extreme wide — establishing shot, character tiny or absent, world-building
- POV: character's point of view, immersive
- INSERT: tight shot of product, object, or key detail
- CUTAWAY: atmospheric environment detail, texture, mood shot
- DUTCH: angled camera for tension or energy

Flow rule: Open with EWS or WS to establish world, build in with CU/ECU for emotion, use INSERT for product moments, vary throughout.

Return JSON array of exactly ${sceneCount} objects, no markdown:
[{
  "sceneIndex": 0,
  "shotType": "EWS",
  "scriptMoment": "exact words from script this covers",
  "action": "what the character is doing",
  "environment": "specific location and set details",
  "cameraMove": "static / slow push in / pull back / handheld / pan / tilt",
  "mood": "emotional tone",
  "isProductShot": false,
  "imagePrompt": "Complete cinematic image generation prompt, 70-90 words. Describe the scene fully — character, action, environment, lighting, camera angle, color grade. Cinematic, photorealistic, no text, no watermarks."
}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const shotList = parseJSON(extractText(message))
    return Response.json({ success: true, shotList, sceneCount })
  } catch (error) {
    console.error('Shot list error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateScenePrompts(request) {
  try {
    const { script, concept, direction, avatarLabel, sceneIndex, totalScenes } = await request.json()

    const words = script.fullScript.split(' ')
    const chunkSize = Math.floor(words.length / totalScenes)
    const sceneWords = words.slice(sceneIndex * chunkSize, (sceneIndex + 1) * chunkSize).join(' ')

    const prompt = `Generate 4 image prompts for scene ${sceneIndex + 1} of ${totalScenes}.
DIRECTION: ${direction.colorWorld}, ${direction.lighting}
AVATAR: ${avatarLabel}
SCENE: "${sceneWords}"
Vary camera angle. Each prompt max 60 words. No text or watermarks.
Return JSON array of 4 strings only, no markdown:
["prompt1","prompt2","prompt3","prompt4"]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const scenePrompts = parseJSON(extractText(message))
    return Response.json({ success: true, scenePrompts })
  } catch (error) {
    console.error('Scene prompts error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
