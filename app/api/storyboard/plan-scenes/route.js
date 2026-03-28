import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime = 'nodejs'
export const maxDuration = 60

function safeParseJSON(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    try { return JSON.parse(text.match(/(\[[\s\S]*\])/)?.[1] || '') } catch { return fallback }
  }
}

export async function POST(request) {
  try {
    const { script, hasProduct, hasAvatar, hasEnv, aspectRatio } = await request.json()

    // Count words to estimate duration (~2.5 words per second for voiceover)
    const wordCount = script.trim().split(/\s+/).length
    const estimatedSeconds = Math.round(wordCount / 2.5)
    const targetScenes = Math.min(15, Math.max(3, Math.ceil(estimatedSeconds / 3.5)))

    const result = safeParseJSON(await (async () => {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a storyboard director. Divide this voiceover script into exactly ${targetScenes} scenes.

SCRIPT: "${script}"

AVAILABLE ASSETS:
- Product image: ${hasProduct ? 'YES' : 'NO'}
- Avatar/character: ${hasAvatar ? 'YES' : 'NO'}
- Environment: ${hasEnv ? 'YES' : 'NO'}
- Format: ${aspectRatio}

Rules:
1. Each scene = 3-4 seconds of speech, so divide the script accordingly
2. scriptLine = the exact words spoken during that scene
3. imagePrompt = a specific visual description for that scene (10-15 words, cinematic)
4. usesProduct = true only if the product should naturally appear in this scene
5. usesAvatar = true only if the character should appear in this scene
6. usesEnv = true only if the environment should be used as the setting
7. Make image prompts specific and visually interesting — not generic
8. Scenes should tell a visual story that matches the spoken words

ONLY return JSON array of exactly ${targetScenes} scenes:
[{"scriptLine":"","imagePrompt":"","usesProduct":false,"usesAvatar":false,"usesEnv":false}]`
        }]
      })
      return msg.content[0].text
    })(), [])

    return Response.json({ scenes: result, sceneCount: result.length })
  } catch (e) {
    console.error('Plan scenes error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
