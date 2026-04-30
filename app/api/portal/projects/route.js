import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET() {
  const { data, error } = await supabase
    .from('portal_projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const projects = (data || []).map(p => ({
    id: p.id,
    slug: p.slug,
    clientId: p.client_id || null,
    clientName: p.client_name,
    images: p.images || [],
    heroScripts: p.hero_scripts || [],
    ugcScripts: p.ugc_scripts || [],
    createdAt: p.created_at,
  }))
  return NextResponse.json(projects)
}

export async function POST(req) {
  const body = await req.json()
  const clientName = body.clientName || 'Untitled Project'
  let slug = slugify(clientName)

  // Check for slug conflicts and append number if needed
  const { data: existing } = await supabase
    .from('portal_projects')
    .select('slug')
    .like('slug', `${slug}%`)
  if (existing && existing.length > 0) {
    const taken = new Set(existing.map(r => r.slug))
    if (taken.has(slug)) {
      let i = 2
      while (taken.has(`${slug}-${i}`)) i++
      slug = `${slug}-${i}`
    }
  }

  const insert = {
    client_name: clientName,
    slug,
    images: [],
    hero_scripts: [],
    ugc_scripts: [],
  }
  if (body.clientId) insert.client_id = body.clientId
  if (body.productId) insert.product_id = body.productId

  const { data, error } = await supabase
    .from('portal_projects')
    .insert(insert)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    clientId: data.client_id || null,
    clientName: data.client_name,
    images: data.images,
    heroScripts: data.hero_scripts,
    ugcScripts: data.ugc_scripts,
    createdAt: data.created_at,
  })
}
