// Express brand-guidelines auto-fill: takes a website URL, fetches the homepage,
// strips it down to readable text, and asks Claude to extract structured brand intake fields.
// The team is expected to upload product images themselves so they stay HQ.

export const dynamic = 'force-dynamic'

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = html.match(re)
  return m ? m[1] : null
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : null
}

function extractColors(html) {
  // Pull hex colors from inline styles or stylesheets referenced inline
  const colors = new Set()
  const re = /#[0-9a-fA-F]{6}\b/g
  const matches = html.match(re) || []
  for (const c of matches.slice(0, 100)) {
    // Skip pure black/white that are everywhere - keep them but cap volume
    colors.add(c.toUpperCase())
  }
  // Pick top 6 distinct
  return Array.from(colors).slice(0, 6)
}

export async function POST(req) {
  try {
    const { url } = await req.json()
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

    let target = url.trim()
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target

    // Fetch the homepage
    let html = ''
    try {
      const res = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlchemyBrandFetch/1.0)' },
        redirect: 'follow',
      })
      if (!res.ok) {
        return Response.json({ error: `Site returned ${res.status}` }, { status: 502 })
      }
      html = await res.text()
    } catch (e) {
      return Response.json({ error: 'Could not reach the site. Check the URL and try again.' }, { status: 502 })
    }

    const title = extractTitle(html)
    const description = extractMeta(html, 'description') || extractMeta(html, 'og:description')
    const ogTitle = extractMeta(html, 'og:title')
    const ogSiteName = extractMeta(html, 'og:site_name')
    const ogImage = extractMeta(html, 'og:image')
    const themeColor = extractMeta(html, 'theme-color')
    const text = stripHtml(html).slice(0, 12000)
    const colors = extractColors(html)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const prompt = `You are a brand strategist. Read the website content below and extract a structured brand profile to pre-fill a brand guidelines form. Return ONLY valid JSON, no commentary.

WEBSITE: ${target}
TITLE: ${title || ''}
META DESCRIPTION: ${description || ''}
OG TITLE: ${ogTitle || ''}
OG SITE NAME: ${ogSiteName || ''}
THEME COLOR: ${themeColor || ''}
DETECTED COLORS: ${colors.join(', ')}

TEXT CONTENT (truncated):
${text}

Return JSON in EXACTLY this shape (use empty string or empty array if you can't infer a field; never invent specifics):
{
  "brand_name": "string",
  "tagline": "string (a short brand promise, ideally from the site)",
  "story": "string (3-5 sentence brand story / about)",
  "personality_tags": ["pick 3-5 from: Bold, Minimal, Playful, Luxurious, Edgy, Warm, Technical, Organic, Rebellious, Sophisticated, Youthful, Timeless"],
  "industry": "string",
  "location": "string (city/country if mentioned)",
  "audience_description": "string (who the brand serves)",
  "age_range": "string (e.g. 25-34)",
  "competitors": "string (comma separated list of likely competitors)",
  "deepest_fears": "string (what their audience is worried about)",
  "deepest_desires": "string (what their audience wants)",
  "unique_features": ["3-5 short bullet points of what makes them different"],
  "voice_style": ["pick 1-3 from: Confident, Warm, Authoritative, Playful, Mysterious, Soothing, Energetic, Raw"],
  "music_mood": ["pick 1-3 from: Dreamy, Energetic, Calm, Aspirational, Moody, Uplifting, Cinematic, Playful, Intense, Nostalgic"],
  "music_genres": ["pick 1-3 from: Electronic, Indie, Lo-fi, Pop, R&B, Acoustic, Hip-hop, Ambient, House, Classical"],
  "brand_colors": "comma separated hex colors (use detected colors if reasonable)",
  "objective": "Brand Awareness | Conversions / Sales | Retargeting | Product Launch | Seasonal Campaign",
  "key_message": "string (the one sentence the brand wants people to walk away with)",
  "tone_formality": 50,
  "tone_mood": 50,
  "tone_intensity": 50
}`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const aiData = await aiRes.json()
    if (aiData.error) return Response.json({ error: aiData.error.message }, { status: 502 })

    const raw = (aiData.content || []).map(c => c.text || '').join('\n')
    let parsed = null
    try {
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const i = cleaned.indexOf('{'); const j = cleaned.lastIndexOf('}')
      if (i !== -1 && j > i) cleaned = cleaned.slice(i, j + 1)
      parsed = JSON.parse(cleaned)
    } catch (e) {
      return Response.json({ error: 'AI returned invalid JSON' }, { status: 502 })
    }

    // Always include website + ogImage (suggested logo/hero) and detected colors as fallback
    parsed.website = target
    if (ogImage) parsed.suggested_image = ogImage
    if (!parsed.brand_colors && colors.length > 0) parsed.brand_colors = colors.join(', ')

    return Response.json({ success: true, data: parsed })
  } catch (e) {
    console.error('scrape error:', e)
    return Response.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
