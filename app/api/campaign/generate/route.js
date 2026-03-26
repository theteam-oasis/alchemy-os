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

    const prompt = `Generate 4 avatar character image prompts for an ad campaign.

CAMPAIGN: ${concept.title}
VISUAL DIRECTION: ${direction.colorWorld}, ${direction.lighting}
TARGET: ${analysis.targetCustomer}

4 distinct characters, different age/look/energy. Each imagePrompt max 60 words, ready for image AI.

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

async function generateScenePrompts(request) {
  try {
    const { script, concept, direction, avatarLabel, sceneIndex, totalScenes } = await request.json()

    const words = script.fullScript.split(' ')
    const chunkSize = Math.floor(words.length / totalScenes)
    const sceneWords = words.slice(sceneIndex * chunkSize, (sceneIndex + 1) * chunkSize).join(' ')

    const prompt = `Generate 4 image prompts for scene ${sceneIndex + 1} of ${totalScenes}.

DIRECTION: ${direction.colorWorld}, ${direction.lighting}
AVATAR: ${avatarLabel} — must appear in all 4, consistent
SCENE: "${sceneWords}"

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
