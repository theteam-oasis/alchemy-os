import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Helper: extract text from Claude response safely ───
function extractText(message) {
  if (!message || !message.content || !message.content.length) {
    throw new Error('Empty response from Claude')
  }
  const block = message.content.find(b => b.type === 'text')
  if (!block || !block.text) {
    throw new Error('No text block in Claude response')
  }
  return block.text.trim()
}

// ─── Helper: parse JSON from Claude response, stripping markdown fences ───
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
  if (type === 'scene-prompts') return generateScenePrompts(request)

  return Response.json({ error: 'Unknown type' }, { status: 400 })
}

async function generateScripts(request) {
  try {
    const { concept, analysis, duration = 30, previousScripts = [] } = await request.json()

    const previousHooks = previousScripts.map(s => s.hook).join(' | ')
    const avoidBlock = previousScripts.length > 0
      ? `PREVIOUSLY GENERATED HOOKS TO AVOID: ${previousHooks}. Write completely fresh scripts with different openings and structures.`
      : ''

    const prompt = `You are a top advertising copywriter. Write 4 real, production-ready ad scripts for this campaign.

CAMPAIGN CONCEPT:
- Title: ${concept.title}
- Theme: ${concept.theme}
- Visual Universe: ${concept.visualUniverse}
- Metaphor Bridge: ${concept.metaphorBridge}
- Emotional Frame: ${concept.emotionalFrame}

BRAND CONTEXT:
- Product: ${analysis.heroProduct}
- Transformation: ${analysis.desiredTransformation}
- Key Phrases: ${analysis.keyPhrasing?.join(', ')}
- Tone: ${analysis.websiteTone}

DURATION: ${duration} seconds

${avoidBlock}

RULES:
1. These are REAL scripts — actual lines of narration/dialogue, not descriptions of what happens.
2. Each script must have a genuinely different structure/approach — not 4 versions of the same hook.
3. Respect the ${duration}-second format: ~${Math.round(duration * 2.5)} words of spoken content.
4. Ground the script in the brand's actual transformation and offer.
5. Each script must have: hook line, body (product truth), CTA.
6. Return EXACTLY 4 scripts.

Respond ONLY with valid JSON array of 4 objects, no markdown:
[
  {
    "title": "Script variation name",
    "hook": "Opening line — the first thing heard/seen",
    "body": "Middle section — the core message, product truth, transformation",
    "cta": "Closing call to action",
    "fullScript": "Complete script as one continuous piece, ready to hand to a voiceover artist",
    "mood": "Tone/energy of this variation",
    "approach": "What makes this structurally different from the others"
  }
]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(message)
    const scripts = parseJSON(text)
    return Response.json({ success: true, scripts })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateDirections(request) {
  try {
    const { concept, analysis } = await request.json()

    const prompt = `You are a visual director at a world-class production studio. Generate 4 distinct visual directions for this campaign.

CAMPAIGN CONCEPT:
- Title: ${concept.title}
- Visual Universe: ${concept.visualUniverse}
- Emotional Frame: ${concept.emotionalFrame}
- Metaphor Bridge: ${concept.metaphorBridge}

BRAND:
- Tone: ${analysis.websiteTone}
- Visual Cues from Site: ${analysis.visualCues}
- Product: ${analysis.heroProduct}

Each direction should feel like a completely different film — different cinematographer, different country, different era almost. They must be visually incompatible with each other.

Respond ONLY with valid JSON array of 4 objects, no markdown:
[
  {
    "title": "Short evocative direction title",
    "colorWorld": "Specific palette — e.g. 'bleached whites and terracotta' not just 'warm'",
    "lighting": "Specific lighting style and quality",
    "lensAndCamera": "Camera movement and lens feel",
    "environment": "Where this takes place and what it looks like",
    "texture": "Material feel — grain, glass, skin, fabric, etc.",
    "editingFeel": "Pacing and cut style",
    "designLanguage": "Graphic and motion design feel",
    "cinematicReference": "One real film, photographer, or director this evokes",
    "summary": "One line: what this direction feels like to watch"
  }
]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(message)
    const directions = parseJSON(text)
    return Response.json({ success: true, directions })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateAvatarPrompts(request) {
  try {
    const { concept, direction, analysis } = await request.json()

    const prompt = `You are a casting director and image prompt specialist. Generate 4 distinct avatar character prompts for this campaign.

CAMPAIGN: ${concept.title} — ${concept.theme}
VISUAL DIRECTION: ${direction.title} — ${direction.colorWorld}, ${direction.lighting}
BRAND TONE: ${analysis.websiteTone}
TARGET CUSTOMER: ${analysis.targetCustomer}

Generate 4 distinct avatar characters. Each should be a real, specific person — not a type. They should look like they belong in THIS campaign's visual world. Vary age, look, energy across the 4 options.

IMPORTANT: These prompts will be sent directly to an AI image generator. Make them rich and specific.

Respond ONLY with valid JSON array of 4 objects, no markdown:
[
  {
    "label": "Short character label e.g. 'The Minimalist'",
    "imagePrompt": "Complete image generation prompt: physical description, styling, expression, lighting, setting, camera angle — everything needed to generate a consistent character portrait. Style: editorial photography, ${direction.colorWorld} color grading, ${direction.lighting} lighting. No text. Ultra-realistic."
  }
]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(message)
    const avatarPrompts = parseJSON(text)
    return Response.json({ success: true, avatarPrompts })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function generateScenePrompts(request) {
  try {
    const { script, concept, direction, avatarLabel, sceneIndex, totalScenes } = await request.json()

    const sceneText = script.fullScript
    const wordsPerScene = Math.floor(sceneText.split(' ').length / totalScenes)
    const startWord = sceneIndex * wordsPerScene
    const sceneWords = sceneText.split(' ').slice(startWord, startWord + wordsPerScene).join(' ')

    const prompt = `You are a storyboard artist generating image prompts for scene ${sceneIndex + 1} of ${totalScenes} in an ad campaign.

CAMPAIGN: ${concept.title}
VISUAL DIRECTION: ${direction.title} — ${direction.colorWorld}, ${direction.lighting}, ${direction.environment}
LOCKED AVATAR: ${avatarLabel}
THIS SCENE COVERS: "${sceneWords}"

Generate 4 image prompt variations for this specific scene moment. All 4 must feature the SAME avatar character (${avatarLabel}) in different framings/angles. The avatar must remain visually consistent across all scenes.

Respond ONLY with valid JSON array of 4 image prompt strings, no markdown:
["prompt1", "prompt2", "prompt3", "prompt4"]

Each prompt must include:
- The avatar character description (consistent)
- Scene action matching the script moment
- Visual direction: ${direction.colorWorld}, ${direction.lighting}
- Camera framing (vary this across the 4 options)
- "No text, no watermarks, photorealistic editorial ad photography"`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(message)
    const scenePrompts = parseJSON(text)
    return Response.json({ success: true, scenePrompts })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
