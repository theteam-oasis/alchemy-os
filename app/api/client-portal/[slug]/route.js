import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET(req, { params }) {
  const slug = params.slug
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  // Resolve client by slugified name
  const { data: clients } = await supabase.from('clients').select('*')
  const client = (clients || []).find(c => slugify(c.name) === slug)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Fetch all linked tools in parallel
  const [intakeRes, portalsRes, dashRes, campaignsRes] = await Promise.all([
    supabase.from('brand_intake').select('*').eq('client_id', client.id).maybeSingle(),
    supabase.from('portal_projects').select('*').eq('client_id', client.id),
    supabase.from('marketing_dashboards').select('id,slug,title,file_name,headers,rows,created_at').eq('client_id', client.id).order('created_at', { ascending: false }),
    supabase.from('campaigns').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
  ])

  const intake = intakeRes.data || null
  const portals = (portalsRes.data || []).map(p => ({
    id: p.id,
    slug: p.slug,
    clientName: p.client_name,
    images: p.images || [],
    heroScripts: p.hero_scripts || [],
    ugcScripts: p.ugc_scripts || [],
    createdAt: p.created_at,
  }))
  const dashboards = (dashRes.data || []).map(d => ({
    id: d.id,
    slug: d.slug,
    title: d.title || d.file_name || 'Dashboard',
    fileName: d.file_name,
    rowCount: Array.isArray(d.rows) ? d.rows.length : 0,
    columnCount: Array.isArray(d.headers) ? d.headers.length : 0,
    createdAt: d.created_at,
  }))
  const campaigns = (campaignsRes.data || []).map(c => ({
    id: c.id,
    title: c.concept_title || c.chosen_concept?.title || 'Campaign',
    status: c.client_status || 'pending',
    createdAt: c.created_at,
    sceneCount: (c.scenes || []).length,
    aspectRatio: c.aspect_ratio,
  }))

  // Aggregate feedback stats across portals
  let approvedCount = 0
  let revisionCount = 0
  let rejectedCount = 0
  if (portals.length > 0) {
    const portalIds = portals.map(p => p.id)
    const { data: fb } = await supabase
      .from('portal_feedback')
      .select('status,project_id,item_id')
      .in('project_id', portalIds)
    for (const r of (fb || [])) {
      if (r.status === 'approved') approvedCount++
      else if (r.status === 'revision') revisionCount++
      else if (r.status === 'rejected') rejectedCount++
    }
  }

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      slug,
      createdAt: client.created_at,
    },
    intake,
    portals,
    dashboards,
    campaigns,
    feedback: { approved: approvedCount, revision: revisionCount, rejected: rejectedCount },
  })
}
