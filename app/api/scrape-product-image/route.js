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

  // 4. Shopify product gallery — common pattern: data-product-id images, .product__media img
  const shopifyMatches = html.matchAll(/<img[^>]+(?:class=["'][^"']*product[^"']*["']|data-product[^=]*)[^>]+(?:src|data-src|srcset)=["']([^"']+)["']/gi)
  for (const m of shopifyMatches) {
    const u = m[1].split(/\s+/)[0] // first URL if srcset
    const abs = absolutize(decodeEntities(u), baseUrl)
    if (abs && /\.(jpe?g|png|webp)/i.test(abs)) candidates.push({ url: abs, source: "shopify product img", priority: 80 })
  }

  // 5. All <img> tags on the page that look like product photos.
  // Heuristic: filter out tiny icons (less than 200px width if specified) and
  // common non-product paths (logo, icon, badge, sprite, payment, social).
  const allImgMatches = html.matchAll(/<img[^>]+(?:src|data-src|data-zoom-image|data-large-image)=["']([^"']+)["'][^>]*>/gi)
  for (const m of allImgMatches) {
    const u = m[0]
    const srcMatch = m[1]
    if (!srcMatch) continue
    // Skip obvious non-product images
    if (/logo|icon|sprite|favicon|payment|social|cart|menu|nav|footer|header|avatar|profile/i.test(srcMatch)) continue
    if (/\.svg($|\?)/i.test(srcMatch)) continue
    // Skip tiny images (if width attribute present and small)
    const widthMatch = u.match(/width=["']?(\d+)/i)
    if (widthMatch && parseInt(widthMatch[1]) < 200) continue
    const abs = absolutize(decodeEntities(srcMatch.split(/\s+/)[0]), baseUrl)
    if (!abs) continue
    if (!/\.(jpe?g|png|webp)/i.test(abs)) continue
    // Boost priority if URL hints at product
    let priority = 50
    if (/product|main|hero|primary|featured/i.test(abs)) priority = 70
    candidates.push({ url: abs, source: "page img", priority })
  }

  // 6. srcset entries from picture/source tags (high-res versions)
  const srcsetMatches = html.matchAll(/<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi)
  for (const m of srcsetMatches) {
    const urls = m[1].split(",").map(s => s.trim().split(/\s+/)[0])
    for (const u of urls) {
      if (/logo|icon|sprite|favicon/i.test(u)) continue
      const abs = absolutize(decodeEntities(u), baseUrl)
      if (abs && /\.(jpe?g|png|webp)/i.test(abs)) {
        candidates.push({ url: abs, source: "picture srcset", priority: 60 })
      }
    }
  }

  // Deduplicate (and also dedupe near-duplicates with different size suffixes)
  const seen = new Set()
  const unique = []
  for (const c of candidates) {
    // Strip query strings and common Shopify size suffixes for dedup
    const stripped = c.url.split("?")[0].replace(/_(?:small|medium|large|grande|master|x?\d+x\d*|\d+x)\.(jpe?g|png|webp)$/i, ".$1")
    if (!seen.has(stripped)) {
      seen.add(stripped)
      unique.push(c)
    }
  }
  unique.sort((a, b) => b.priority - a.priority)
  // Cap at 20 candidates so we don't ship a huge payload
  return unique.slice(0, 20)
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
