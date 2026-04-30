import { supabase } from '@/lib/supabase'

// Strip null bytes + other unprintable C0 controls + UTF-8 BOM. Postgres
// JSONB rejects these with "unsupported Unicode escape sequence".
const CTRL_RE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g')
const BOM_RE = new RegExp('^\\uFEFF')
function sanitize(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.replace(CTRL_RE, '').replace(BOM_RE, '')
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[sanitize(k)] = sanitize(value[k])
    return out
  }
  return value
}

/**
 * POST /api/marketing-dashboards/add-product
 * Body: { slug, productName, headers, rows }
 *
 * Behavior:
 * - Loads the existing dashboard by slug
 * - Ensures both old and new datasets have a "Product" column
 *   - If existing rows have no Product column: injects it (with a default name from existing dashboard title)
 *   - If new rows have no Product column: injects it with `productName`
 * - Aligns new rows to the existing header order (extra columns ignored, missing ones get empty)
 * - Appends new rows to existing rows
 * - Updates the dashboard
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const slug = body.slug
    const productName = (body.productName || '').trim()
    const newHeaders = sanitize(body.headers || [])
    const newRows = sanitize(body.rows || [])

    if (!slug) return Response.json({ success: false, error: 'slug is required' }, { status: 400 })
    if (!productName) return Response.json({ success: false, error: 'productName is required' }, { status: 400 })
    if (!Array.isArray(newRows) || newRows.length === 0) return Response.json({ success: false, error: 'rows are required' }, { status: 400 })

    // Load the existing dashboard
    const { data: existing, error: fetchErr } = await supabase
      .from('marketing_dashboards')
      .select('*')
      .eq('slug', slug)
      .single()

    if (fetchErr) throw fetchErr
    if (!existing) return Response.json({ success: false, error: 'dashboard not found' }, { status: 404 })

    let mergedHeaders = [...(existing.headers || [])]
    let mergedRows = [...(existing.rows || [])]
    const defaultExistingProduct = (existing.title || existing.client_name || 'Primary').toString().trim()

    // 1. Ensure existing dataset has a Product column
    let productIdx = mergedHeaders.findIndex(h => h && h.toLowerCase() === 'product')
    if (productIdx === -1) {
      // Inject Product as the second column (after Date if exists, else first)
      const dateIdx = mergedHeaders.findIndex(h => h && h.toLowerCase() === 'date')
      const insertAt = dateIdx >= 0 ? dateIdx + 1 : 0
      mergedHeaders.splice(insertAt, 0, 'Product')
      mergedRows = mergedRows.map(r => {
        const copy = [...r]
        copy.splice(insertAt, 0, defaultExistingProduct)
        return copy
      })
      productIdx = insertAt
    }

    // 2. Build a column-name → index map for the new dataset
    const newHeaderMap = {}
    newHeaders.forEach((h, i) => { if (h != null) newHeaderMap[String(h).toLowerCase()] = i })

    // 3. Align each new row to the merged header order
    const alignedNewRows = newRows.map(r => {
      return mergedHeaders.map((h, idx) => {
        if (idx === productIdx) return productName
        const sourceIdx = newHeaderMap[String(h).toLowerCase()]
        if (sourceIdx === undefined) return ''
        return r[sourceIdx] != null ? r[sourceIdx] : ''
      })
    })

    // 4. If the new dataset has columns not in the existing one, add them as new columns
    const extraCols = newHeaders.filter(h =>
      h && !mergedHeaders.some(m => m.toLowerCase() === String(h).toLowerCase())
    )
    extraCols.forEach(extra => {
      const newColIdx = mergedHeaders.length
      mergedHeaders.push(extra)
      // Existing rows: empty value for the new column
      mergedRows = mergedRows.map(r => [...r, ''])
      // New rows: pull from the new dataset
      const sourceIdx = newHeaderMap[extra.toLowerCase()]
      alignedNewRows.forEach((row, i) => {
        const v = newRows[i]?.[sourceIdx]
        row[newColIdx] = v != null ? v : ''
      })
    })

    mergedRows = mergedRows.concat(alignedNewRows)

    const { data: updated, error: updateErr } = await supabase
      .from('marketing_dashboards')
      .update({
        headers: mergedHeaders,
        rows: mergedRows,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single()

    if (updateErr) throw updateErr
    return Response.json({
      success: true,
      dashboard: updated,
      added: { productName, rowsAdded: alignedNewRows.length, totalRows: mergedRows.length },
    })
  } catch (error) {
    console.error('Add product error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
