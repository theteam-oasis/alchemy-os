import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

export async function POST(request) {
  try {
    const { websiteUrl, productName, offerNotes, brandIntake } = await request.json()

    // Build brand intake context from onboarding form
    const intakeContext = brandIntake ? `
CLIENT ONBOARDING DATA (filled in by the client — treat this as ground truth):
- Brand Name: ${brandIntake.brand_name || 'N/A'}
- Tagline: ${brandIntake.tagline || 'N/A'}
- Brand Story: ${brandIntake.story || 'N/A'}
- Personality Tags: ${brandIntake.personality_tags?.join(', ') || 'N/A'}
- Target Audience: ${brandIntake.target_audience || 'N/A'}
- Core Problem Solved: ${brandIntake.core_problem || 'N/A'}
- Key Differentiators: ${brandIntake.differentiators || 'N/A'}
- Tone/Voice: ${brandIntake.tone_voice || 'N/A'}
- Campaign Goals: ${brandIntake.campaign_goals || 'N/A'}
- Budget Range: ${brandIntake.budget || 'N/A'}
- Previous Campaign Notes: ${brandIntake.previous_campaigns || 'N/A'}
- Hero Product: ${brandIntake.hero_product || productName || 'N/A'}
- Price Point: ${brandIntake.price_point || 'N/A'}
- Competitors: ${brandIntake.competitors || 'N/A'}
- Customer Transformation: ${brandIntake.transformation || 'N/A'}
` : ''

    let websiteContent = ''
    try {
      const res = await fetch(websiteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlchemyOS/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000)
    } catch {
      websiteContent = `Could not fetch website. Product: ${productName}. Notes: ${offerNotes}`
    }

    const prompt = `You are a senior brand strategist analyzing a brand for an ad campaign.
${intakeContext}
WEBSITE CONTENT:
${websiteContent}

PRODUCT/SERVICE: ${productName}
ADDITIONAL NOTES: ${offerNotes || 'None'}

Extract brand intelligence. Prioritize the onboarding data above over the website scrape — the client knows their brand better than their website shows.

Respond ONLY with a valid JSON object, no markdown fences, no preamble:
{
  "coreOffer": "The single clearest thing this brand sells or does",
  "heroProduct": "The flagship product or service",
  "targetCustomer": "Who this is for — be specific",
  "corePainPoint": "The core problem this solves",
  "desiredTransformation": "What changes in the customer's life after using this",
  "differentiators": ["what makes this brand unique"],
  "proofPoints": ["claims, stats, testimonials, awards"],
  "websiteTone": "How the brand sounds",
  "keyPhrasing": ["memorable phrases from the brand"],
  "visualCues": "Visual and aesthetic themes",
  "productCategory": "What market category this fits"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content.find(b => b.type === 'text')
    if (!block || !block.text) throw new Error('No text response from Claude')

    const analysis = parseJSON(block.text)
    return Response.json({ success: true, analysis })
  } catch (error) {
    console.error('Analyze error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
