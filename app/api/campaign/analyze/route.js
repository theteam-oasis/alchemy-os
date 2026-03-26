import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { websiteUrl, productName, offerNotes } = await request.json()

    // Attempt to fetch website content
    let websiteContent = ''
    try {
      const res = await fetch(websiteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlchemyOS/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      // Strip HTML tags, get readable text
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000)
    } catch {
      websiteContent = `Could not fetch website. Product: ${productName}. Notes: ${offerNotes}`
    }

    const prompt = `You are a senior brand strategist analyzing a brand for an ad campaign.

WEBSITE CONTENT:
${websiteContent}

PRODUCT/SERVICE: ${productName}
ADDITIONAL NOTES: ${offerNotes || 'None'}

Extract the following brand intelligence. Be specific and grounded in the actual website text — do not invent generic marketing language.

Respond ONLY with a valid JSON object, no markdown, no preamble:
{
  "coreOffer": "The single clearest thing this brand sells or does",
  "heroProduct": "The flagship product or service mentioned most",
  "targetCustomer": "Who this is clearly for based on site language",
  "corePainPoint": "The problem the customer has that this solves",
  "desiredTransformation": "What the customer's life looks like after using this",
  "differentiators": ["what makes this brand distinct from competitors", "..."],
  "proofPoints": ["claims, stats, testimonials, awards found on site", "..."],
  "websiteTone": "How the brand sounds: e.g. clinical, warm, rebellious, luxurious, playful",
  "keyPhrasing": ["memorable phrases or claims pulled directly from site", "..."],
  "visualCues": "What visual or aesthetic themes appear on the site",
  "productCategory": "What market/category this fits into"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()
    const analysis = JSON.parse(text)

    return Response.json({ success: true, analysis })
  } catch (error) {
    console.error('Analyze error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
