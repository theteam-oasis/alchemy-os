import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Check if the id is a UUID or a slug
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function mapProject(data) {
  return {
    id: data.id,
    slug: data.slug,
    clientId: data.client_id || null,
    clientName: data.client_name,
    password: data.password || null,
    images: data.images || [],
    imageRatio: data.image_ratio || "1/1",
    heroScripts: data.hero_scripts || [],
    ugcScripts: data.ugc_scripts || [],
    createdAt: data.created_at,
  }
}

export async function GET(req, context) {
  const id = context.params.id
  const col = isUUID(id) ? 'id' : 'slug'
  const { data, error } = await supabase
    .from('portal_projects')
    .select('*')
    .eq(col, id)
    .single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(mapProject(data))
}

export async function PUT(req, context) {
  const id = context.params.id
  const col = isUUID(id) ? 'id' : 'slug'
  const body = await req.json()
  const updates = {}
  if (body.images !== undefined) updates.images = body.images
  if (body.heroScripts !== undefined) updates.hero_scripts = body.heroScripts
  if (body.ugcScripts !== undefined) updates.ugc_scripts = body.ugcScripts
  if (body.clientName !== undefined) updates.client_name = body.clientName
  if (body.imageRatio !== undefined) updates.image_ratio = body.imageRatio
  if (body.clientId !== undefined) updates.client_id = body.clientId
  if (body.password !== undefined) updates.password = body.password

  const { data, error } = await supabase
    .from('portal_projects')
    .update(updates)
    .eq(col, id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapProject(data))
}

export async function DELETE(req, context) {
  const id = context.params.id
  const col = isUUID(id) ? 'id' : 'slug'
  await supabase.from('portal_projects').delete().eq(col, id)
  return NextResponse.json({ ok: true })
}
