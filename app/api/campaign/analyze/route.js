import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

async function scrapeUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlchemyOS/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    const { websiteUrl, productPageUrl, productName, offerNotes } = await request.json()

    // Scrape both URLs in parallel
    const [websiteContent, productContent] = await Promise.all([
      websiteUrl ? scrapeUrl(websiteUrl) : Promise.resolve(null),
      productPageUrl ? scrapeUrl(productPageUrl) : Promise.resolve(null),
    ])

    const contentBlock = [
      websiteContent ? `BRAND WEBSITE:\n${websiteContent}` : null,
      productContent ? `PRODUCT PAGE (${productPageUrl}):\n${productContent}` : null,
    ].filter(Boolean).join('\n\n---\n\n') || `Product: ${productName}. Notes: ${offerNotes}`

    const prompt = `You are a senior brand strategist analyzing a brand for an ad campaign.

${contentBlock}

PRODUCT/SERVICE BEING ADVERTISED: ${productName || 'See product page above'}
ADDITIONAL NOTES: ${offerNotes || 'None'}

Extract brand intelligence. Prioritize the product page content for product-specific details, and the brand website for tone, personality, and brand-level positioning.

Respond ONLY with a valid JSON object, no markdown fences:
{
  "coreOffer": "The single clearest thing this brand sells",
  "heroProduct": "The specific product being advertised",
  "targetCustomer": "Who this product is for — be specific",
  "corePainPoint": "The core problem this product solves",
  "desiredTransformation": "What changes in the customer life after using this",
  "differentiators": ["what makes this product unique"],
  "proofPoints": ["claims, stats, ingredients, testimonials found on the page"],
  "websiteTone": "How the brand sounds",
  "keyPhrasing": ["memorable phrases pulled from the pages"],
  "visualCues": "Visual and aesthetic themes from the site",
  "productCategory": "What market category this fits",
  "productDetails": "Specific product details, ingredients, features, or specs found on the product page"
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
