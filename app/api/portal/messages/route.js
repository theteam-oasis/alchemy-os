import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

async function resolveProjectId(input) {
  if (isUUID(input)) return input
  const { data } = await supabase.from('portal_projects').select('id').eq('slug', input).single()
  return data?.id || null
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const rawId = searchParams.get('projectId')
  if (!rawId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const projectId = await resolveProjectId(rawId)
  if (!projectId) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const after = searchParams.get('after') // ISO timestamp for polling

  let query = supabase
    .from('portal_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (after) {
    query = query.gt('created_at', after)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const { message, sender } = body
  const rawId = body.projectId
  if (!rawId || !message || !sender) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['team', 'client'].includes(sender)) return NextResponse.json({ error: 'Invalid sender' }, { status: 400 })

  const projectId = await resolveProjectId(rawId)
  if (!projectId) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('portal_messages')
    .insert({ project_id: projectId, sender, message })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
