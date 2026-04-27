import { supabase } from '@/lib/supabase'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'dashboard'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const client_id = body.clientId || body.client_id || null
    const client_name = body.clientName || body.client_name || ''
    const title = body.title || ''
    const description = body.description || ''
    const file_name = body.fileName || body.file_name || ''
    const headers = body.headers || []
    const rows = body.rows || []

    // Generate a unique slug if not provided
    let slug = body.slug
    if (!slug) {
      const base = slugify(`${client_name}-${title || file_name}`)
      // Append a short random suffix to avoid collisions
      const suffix = Math.random().toString(36).slice(2, 7)
      slug = `${base}-${suffix}`
    }

    const payload = {
      slug,
      client_id,
      client_name,
      title,
      description,
      file_name,
      headers,
      rows,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('marketing_dashboards')
      .upsert(payload, { onConflict: 'slug' })
      .select()
      .single()

    if (error) throw error
    return Response.json({ success: true, dashboard: data })
  } catch (error) {
    console.error('Create dashboard error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const clientId = searchParams.get('clientId')

    if (slug) {
      const { data, error } = await supabase
        .from('marketing_dashboards')
        .select('*')
        .eq('slug', slug)
        .single()
      if (error) throw error
      return Response.json({ success: true, dashboard: data })
    }

    if (clientId) {
      const { data, error } = await supabase
        .from('marketing_dashboards')
        .select('id, slug, client_id, client_name, title, description, file_name, created_at, updated_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ success: true, dashboards: data || [] })
    }

    // List all (summary only)
    const { data, error } = await supabase
      .from('marketing_dashboards')
      .select('id, slug, client_id, client_name, title, description, file_name, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return Response.json({ success: true, dashboards: data || [] })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const id = searchParams.get('id')
    if (!slug && !id) {
      return Response.json({ success: false, error: 'slug or id is required' }, { status: 400 })
    }
    const q = supabase.from('marketing_dashboards').delete()
    const { error } = slug ? await q.eq('slug', slug) : await q.eq('id', id)
    if (error) throw error
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
