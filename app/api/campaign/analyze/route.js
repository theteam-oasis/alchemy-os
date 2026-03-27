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
    return { html, text: html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)
    }
  } catch {
    return null
  }
}

function extractImages(html, baseUrl) {
  const images = new Set()
  const base = new URL(baseUrl)

  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi,
    /"og:image","content":"([^"]+)"/gi,
    /data-src=["']([^"'?#]+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
    /<img[^>]+src=["']([^"']*(?:cdn|product|hero|main|primary|1000|2000|800|large|full|detail)[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
    /"url":"(https?:[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      try {
        const raw = match[1].replace(/\\/g, '').split('?')[0]
        const imgUrl = raw.startsWith('http') ? raw : new URL(raw, base.origin).href
        if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i)
          && !imgUrl.match(/icon|logo|avatar|sprite|badge|placeholder|blank/i)
          && imgUrl.length < 500) {
          images.add(imgUrl)
        }
      } catch {}
    }
  }

  return [...images].slice(0, 8)
}

export async function POST(request) {
  try {
    const { productPageUrl, offerNotes, extractImagesOnly } = await request.json()

    if (!productPageUrl) {
      return Response.json({ success: false, error: 'Product page URL required' }, { status: 400 })
    }

    const scraped = await scrapeUrl(productPageUrl)
    if (!scraped) {
      return Response.json({ success: false, error: 'Could not fetch product page. Check the URL.' }, { status: 400 })
    }

    const productImages = extractImages(scraped.html, productPageUrl)

    // Fast path — just return images
    if (extractImagesOnly) {
      return Response.json({ success: true, productImages })
    }

    // Full analysis
    const prompt = `You are a senior brand strategist analyzing a product page for an ad campaign.

PRODUCT PAGE: ${productPageUrl}
PAGE CONTENT:
${scraped.text}

ADDITIONAL NOTES: ${offerNotes || 'None'}

Extract brand and product intelligence. Be specific and grounded in the actual page content.

Respond ONLY with valid JSON, no markdown:
{
  "brandName": "The brand name",
  "coreOffer": "What this brand sells",
  "heroProduct": "The specific product on this page",
  "targetCustomer": "Who this is for — be specific",
  "corePainPoint": "The core problem this solves",
  "desiredTransformation": "What changes after using this",
  "differentiators": ["what makes this unique"],
  "proofPoints": ["claims, stats, ingredients, testimonials from the page"],
  "websiteTone": "How the brand sounds",
  "keyPhrasing": ["memorable phrases from the page"],
  "visualCues": "Visual and aesthetic themes",
  "productCategory": "Market category",
  "productDetails": "Key product details, ingredients, features, specs"
}`

    // Retry up to 3 times on 529 overload
    let message
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        })
        break
      } catch (e) {
        if (attempt < 2 && e.message?.includes('529')) {
          console.log(`Overloaded, retrying in ${(attempt + 1) * 3}s...`)
          await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
        } else throw e
      }
    }

    const block = message.content.find(b => b.type === 'text')
    if (!block?.text) throw new Error('No response from Claude')

    const analysis = parseJSON(block.text)
    return Response.json({ success: true, analysis, productImages })
  } catch (error) {
    console.error('Analyze error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
