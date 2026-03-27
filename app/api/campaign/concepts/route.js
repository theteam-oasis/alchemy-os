import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

export async function POST(request) {
  try {
    const { analysis, creativeKeywords, count = 4, previousConcepts = [], brandIntake } = await request.json()

    const previousTitles = previousConcepts.map(c => c.title).join(', ')
    const previousThemes = previousConcepts.map(c => c.theme).join(', ')
    const previousMetaphors = previousConcepts.map(c => c.metaphorBridge).join(', ')
    const previousVisuals = previousConcepts.map(c => c.visualUniverse).join(', ')

    const avoidBlock = previousConcepts.length > 0 ? `
PREVIOUSLY GENERATED — DO NOT REPEAT:
- Titles: ${previousTitles}
- Themes: ${previousThemes}
- Metaphors: ${previousMetaphors}
- Visuals: ${previousVisuals}
Generate entirely fresh directions.` : ''

    const keywordsBlock = creativeKeywords?.length > 0
      ? `CREATIVE KEYWORDS (use these to steer direction): ${creativeKeywords.join(', ')}`
      : ''

    // Extra context from onboarding form
    const intakeBlock = brandIntake ? `
ADDITIONAL CLIENT CONTEXT FROM ONBOARDING:
- Brand Personality: ${brandIntake.personality_tags?.join(', ') || 'N/A'}
- Brand Story: ${brandIntake.story || 'N/A'}
- Campaign Goals: ${brandIntake.campaign_goals || 'N/A'}
- Tone/Voice Preference: ${brandIntake.tone_voice || 'N/A'}
- Target Audience Detail: ${brandIntake.target_audience || 'N/A'}
- Competitors to differentiate from: ${brandIntake.competitors || 'N/A'}
` : ''

    const prompt = `You are a world-class creative director at a premium ad agency. Generate ${count} campaign concepts for this brand.

BRAND ANALYSIS:
- Brand: ${analysis.brandName || 'Unknown'}
- Core Offer: ${analysis.coreOffer}
- Hero Product: ${analysis.heroProduct}
- Target Customer: ${analysis.targetCustomer}
- Pain Point: ${analysis.corePainPoint}
- Transformation: ${analysis.desiredTransformation}
- Differentiators: ${analysis.differentiators?.join(', ')}
- Brand Tone: ${analysis.websiteTone}
- Key Phrases: ${analysis.keyPhrasing?.join(', ')}
- Visual Cues: ${analysis.visualCues}
- Product Details: ${analysis.productDetails || 'N/A'}
- Category: ${analysis.productCategory}
${intakeBlock}
${keywordsBlock}
${avoidBlock}

RULES:
1. Each concept must come from a COMPLETELY DIFFERENT creative territory — different emotional frame, visual world, metaphor. No overlap.
2. Every concept must be DEEPLY SPECIFIC to this brand. No generic ad ideas. If someone read the concept without the brand name, they should still be able to guess what category this is.
3. The visualUniverse must describe a specific aesthetic world — reference real directors, photographers, or visual movements (e.g. "Nan Goldin documentary intimacy", "Wes Anderson symmetry", "90s health magazine editorial"). Be specific.
4. The theme must articulate a tension, transformation, or insight that is TRUE for this brand's customer — not a tagline, a real human truth.
5. The emotionalFrame must describe the specific feeling we want the viewer to have at the END of the video — not during it.
6. Return EXACTLY ${count} concepts.

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble:
[{"title":"","theme":"","visualUniverse":"","metaphorBridge":"","emotionalFrame":"","whyItFits":"","siteAnchors":[]}]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()
    const concepts = parseJSON(text)

    if (!Array.isArray(concepts) || concepts.length !== count) {
      throw new Error(`Expected ${count} concepts, got ${concepts?.length}`)
    }

    return Response.json({ success: true, concepts })
  } catch (error) {
    console.error('Concepts error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
