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
    const avoidBlock = previousScripts.length > 0
      ? `AVOID these hooks: ${previousScripts.map(s => s.hook).join(' | ')}`
      : ''

    const prompt = `Write 4 short ad scripts.

CONCEPT: ${concept.title} — ${concept.theme}
PRODUCT: ${analysis.heroProduct}
TRANSFORMATION: ${analysis.desiredTransformation}
TONE: ${analysis.websiteTone}
DURATION: ${duration}s (~${Math.round(duration * 2.3)} spoken words max)
${avoidBlock}

Rules: Real spoken lines only. Different structure per script. fullScript max 60 words.

Return JSON array only, no markdown:
[{"title":"","hook":"","body":"","cta":"","fullScript":"","mood":"","approach":""}]`

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

    const prompt = `Generate 4 avatar character portrait prompts for an ad campaign.

CAMPAIGN: ${concept.title}
VISUAL DIRECTION: ${direction.colorWorld}, ${direction.lighting}
TARGET: ${analysis.targetCustomer}
BRAND TONE: ${analysis.websiteTone}

CRITICAL RULES for image prompts:
- Every prompt MUST be a tight chest-up portrait shot only
- Character faces the camera directly or at a slight angle
- Clean neutral or softly blurred background — no environments, no action
- Very clearly shows face, hair, skin, outfit, expression
- Think: character selection screen in a video game
- 4 very different people: vary age, ethnicity, gender expression, style
- Each imagePrompt max 80 words

Return JSON array only, no markdown:
[{"label":"","imagePrompt":""}]`

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
    const { script, duration, concept, direction, avatarLabel } = await request.json()

    // Calculate scene count: 1 scene per 2-3 seconds of spoken content
    const sceneCount = Math.round(duration / 2.5)

    const prompt = `You are a film director creating a shot list for a ${duration}-second ad.

CAMPAIGN: ${concept.title} — ${concept.theme}
VISUAL DIRECTION: ${direction.title} — ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
AVATAR/CHARACTER: ${avatarLabel}
FULL SCRIPT: "${script.fullScript}"

Create exactly ${sceneCount} shots that cover this script cinematically.

SHOT VARIETY RULES — vary these throughout like a real film:
- ECU (extreme close up): eyes, hands, product detail, texture
- CU (close up): face, reaction, emotion
- MCU (medium close up): chest up, character speaking or reacting  
- MS (medium shot): waist up, character in environment
- WS (wide shot): full environment, character small in frame
- EWS (extreme wide): establishing the world, character tiny or absent
- POV: character's point of view
- INSERT: product, object, detail shot
- CUTAWAY: environmental detail, atmosphere

Each shot must:
- Reference the exact script words it covers
- Show the character (${avatarLabel}) doing something specific
- Have a specific camera angle and movement
- Build the cinematic world described in the visual direction

Return JSON array of exactly ${sceneCount} objects, no markdown:
[{
  "sceneIndex": 0,
  "shotType": "EWS",
  "scriptMoment": "exact words from script this covers",
  "action": "what the character is doing",
  "environment": "where this takes place",
  "cameraMove": "static / slow push / pull back / handheld / etc",
  "mood": "emotional tone of this shot",
  "imagePrompt": "full detailed image generation prompt for this scene — 60-80 words, cinematic, specific"
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
AVATAR: ${avatarLabel} — must appear consistently
SCENE MOMENT: "${sceneWords}"

Vary camera angle across 4. Each prompt max 60 words. No text or watermarks.

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
