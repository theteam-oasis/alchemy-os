import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime = 'nodejs'
export const maxDuration = 60

function safeParseJSON(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    try { return JSON.parse(text.match(/(\[[\s\S]*\])/)?.[1] || '') }
    catch { return fallback }
  }
}

export async function POST(request) {
  try {
    const { script, hasProduct, hasAvatar, hasEnv, aspectRatio, avatarDescription, envDescription } = await request.json()

    const wordCount = script.trim().split(/\s+/).length
    const estimatedSeconds = Math.round(wordCount / 2.5)
    const targetScenes = Math.min(15, Math.max(3, Math.ceil(estimatedSeconds / 3.5)))

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a storyboard director. Divide this voiceover script into exactly ${targetScenes} scenes.

SCRIPT: "${script}"

LOCKED ASSETS:
- Product image: ${hasProduct ? 'YES. will be passed as reference' : 'NO'}
- Character/Avatar: ${hasAvatar ? `YES. "${avatarDescription || 'the character'}". always reference this person by name/description` : 'NO'}
- Environment: ${hasEnv ? `YES. "${envDescription || 'the setting'}". use this as the setting when relevant` : 'NO'}
- Format: ${aspectRatio}

RULES:
1. Each scene = 3-4 seconds of speech. Divide script words proportionally.
2. scriptLine = the exact words spoken in that scene
3. imagePrompt = specific visual action for that scene (12-15 words). 
   - CRITICAL: When the character appears, describe them doing the specific action. use their description, not "a figure" or "a person"
   - CRITICAL: When the environment is used, reference its specific qualities. not "a room" or "a space"
   - Make it cinematic and specific to the script moment
4. usesAvatar = true for ANY scene where a person appears. default to true unless it's a pure product or abstract shot
5. usesEnv = true for ANY scene where the setting is shown
6. usesProduct = true only when product naturally appears
7. Scenes must tell a cohesive visual story. the same character across all scenes

ONLY return JSON array of exactly ${targetScenes} scenes (no markdown):
[{"scriptLine":"","imagePrompt":"","usesProduct":false,"usesAvatar":false,"usesEnv":false}]`
      }]
    })

    const result = safeParseJSON(msg.content[0].text, [])
    return Response.json({ scenes: result, sceneCount: result.length })
  } catch (e) {
    console.error('Plan scenes error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
