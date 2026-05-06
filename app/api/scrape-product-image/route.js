export const runtime = 'nodejs'

function normalizeUrl(input) {
  let url = input.trim()
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url
  }
  return url
}

function absolutize(maybeUrl, baseUrl) {
  try {
    return new URL(maybeUrl, baseUrl).toString()
  } catch {
    return null
  }
}

// Decode common HTML entities in URLs
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"')
}

function extractBrandName(html, baseUrl) {
  // 1. og:site_name (most reliable)
  const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (ogSite?.[1]) return decodeEntities(ogSite[1]).trim()

  // 2. JSON-LD Organization or Product.brand
  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m[1].trim())
      const items = Array.isArray(json) ? json : (json["@graph"] || [json])
      for (const node of items) {
        // Organization name
        if (node["@type"] === "Organization" && node.name) return String(node.name).trim()
        // Product.brand.name
        if ((node["@type"] === "Product" || (Array.isArray(node["@type"]) && node["@type"].includes("Product"))) && node.brand) {
          if (typeof node.brand === "string") return node.brand.trim()
          if (node.brand?.name) return String(node.brand.name).trim()
        }
        // WebSite name
        if (node["@type"] === "WebSite" && node.name) return String(node.name).trim()
      }
    } catch {}
  }

  // 3. application-name meta
  const appName = html.match(/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i)
  if (appName?.[1]) return decodeEntities(appName[1]).trim()

  // 4. Hostname fallback (e.g. "raoptics.com" -> "Ra Optics")
  try {
    const host = new URL(baseUrl).hostname.replace(/^www\./, "")
    const root = host.split(".")[0]
    return root.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  } catch {
    return null
  }
}

function extractCandidates(html, baseUrl) {
  const candidates = []

  // 1. og:image (most reliable for ecommerce)
  const ogMatches = html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi)
  for (const m of ogMatches) {
    const abs = absolutize(decodeEntities(m[1]), baseUrl)
    if (abs) candidates.push({ url: abs, source: "og:image", priority: 100 })
  }
  const ogReverseMatches = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi)
  for (const m of ogReverseMatches) {
    const abs = absolutize(decodeEntities(m[1]), baseUrl)
    if (abs) candidates.push({ url: abs, source: "og:image", priority: 100 })
  }

  // 2. twitter:image
  const twMatches = html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi)
  for (const m of twMatches) {
    const abs = absolutize(decodeEntities(m[1]), baseUrl)
    if (abs) candidates.push({ url: abs, source: "twitter:image", priority: 90 })
  }

  // 3. JSON-LD Product schema
  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m[1].trim())
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        const flat = item["@graph"] ? item["@graph"] : [item]
        for (const node of flat) {
          if (node["@type"] === "Product" || (Array.isArray(node["@type"]) && node["@type"].includes("Product"))) {
            const img = node.image
            if (typeof img === "string") {
              const abs = absolutize(img, baseUrl)
              if (abs) candidates.push({ url: abs, source: "json-ld product", priority: 95 })
            } else if (Array.isArray(img)) {
              for (const i of img) {
                const u = typeof i === "string" ? i : i?.url
                if (u) {
                  const abs = absolutize(u, baseUrl)
                  if (abs) candidates.push({ url: abs, source: "json-ld product", priority: 95 })
                }
              }
            } else if (img && typeof img === "object" && img.url) {
              const abs = absolutize(img.url, baseUrl)
              if (abs) candidates.push({ url: abs, source: "json-ld product", priority: 95 })
            }
          }
        }
      }
    } catch {}
  }

  // 4. Shopify product page hint: og-image fallback (often first large img)
  // Skip — og:image already covers Shopify

  // Deduplicate
  const seen = new Set()
  const unique = []
  for (const c of candidates) {
    if (!seen.has(c.url)) {
      seen.add(c.url)
      unique.push(c)
    }
  }
  // Sort by priority
  unique.sort((a, b) => b.priority - a.priority)
  return unique
}

export async function POST(request) {
  try {
    const { url } = await request.json()
    if (!url) return Response.json({ error: "url required" }, { status: 400 })

    const targetUrl = normalizeUrl(url)

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlchemyBot/1.0; +https://scalewithalchemy.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch page: ${res.status}` }, { status: 400 })
    }

    const html = await res.text()
    const candidates = extractCandidates(html, targetUrl)
    const brandName = extractBrandName(html, targetUrl)

    if (candidates.length === 0) {
      return Response.json({ error: "No product image found on this page", brandName }, { status: 404 })
    }

    return Response.json({ success: true, imageUrl: candidates[0].url, source: candidates[0].source, candidates: candidates.slice(0, 5), brandName })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
