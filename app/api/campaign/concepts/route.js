import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

export async function POST(request) {
  try {
    const { analysis, creativeKeywords, count = 4, previousConcepts = [] } = await request.json()

    const previousTitles = previousConcepts.map(c => c.title).join(', ')
    const previousThemes = previousConcepts.map(c => c.theme).join(', ')
    const previousMetaphors = previousConcepts.map(c => c.metaphorBridge).join(', ')
    const previousVisuals = previousConcepts.map(c => c.visualUniverse).join(', ')

    const avoidBlock = previousConcepts.length > 0 ? `
PREVIOUSLY GENERATED — DO NOT REPEAT OR CLOSELY RESEMBLE:
- Titles used: ${previousTitles}
- Themes used: ${previousThemes}
- Metaphors used: ${previousMetaphors}
- Visual universes used: ${previousVisuals}
Generate entirely fresh directions from different creative territories.` : ''

    const keywordsBlock = creativeKeywords?.length > 0
      ? `CREATIVE KEYWORDS TO INFLUENCE DIRECTION (do not ignore these): ${creativeKeywords.join(', ')}`
      : ''

    const prompt = `You are a world-class creative director at a premium ad agency. Your job is to generate ${count} campaign concepts for this brand.

BRAND ANALYSIS:
- Core Offer: ${analysis.coreOffer}
- Hero Product: ${analysis.heroProduct}
- Target Customer: ${analysis.targetCustomer}
- Pain Point: ${analysis.corePainPoint}
- Transformation: ${analysis.desiredTransformation}
- Differentiators: ${analysis.differentiators?.join(', ')}
- Proof Points: ${analysis.proofPoints?.join(', ')}
- Brand Tone: ${analysis.websiteTone}
- Key Phrases from Site: ${analysis.keyPhrasing?.join(', ')}
- Visual Cues: ${analysis.visualCues}
- Product Category: ${analysis.productCategory}

${keywordsBlock}

${avoidBlock}

CRITICAL RULES:
1. Each concept must come from a COMPLETELY DIFFERENT creative territory.
2. Ground every concept in the actual brand data above — not generic ad ideas.
3. DO NOT use F1/racing/speed metaphors unless the brand is clearly automotive or performance-tech.
4. Be SPECIFIC and CINEMATIC. Each concept should feel like a different film genre.
5. Return EXACTLY ${count} concepts — not fewer, not more.

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble, no explanation — raw JSON only:
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
