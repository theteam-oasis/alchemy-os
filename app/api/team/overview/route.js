import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET() {
  const [clientsRes, intakeRes, portalsRes, dashRes, campaignsRes, feedbackRes] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('brand_intake').select('client_id,brand_name,product_image_urls'),
    supabase.from('portal_projects').select('id,slug,client_id,client_name,images,hero_scripts,ugc_scripts,created_at'),
    supabase.from('marketing_dashboards').select('id,slug,client_id,title,file_name,created_at'),
    supabase.from('campaigns').select('id,client_id,client_status,created_at,concept_title'),
    supabase.from('portal_feedback').select('project_id,status'),
  ])

  const clients = clientsRes.data || []
  const intakes = intakeRes.data || []
  const portals = (portalsRes.data || [])
  const dashboards = dashRes.data || []
  const campaigns = campaignsRes.data || []
  const feedback = feedbackRes.data || []

  // Group feedback by portal project_id
  const fbByProject = {}
  for (const f of feedback) {
    if (!fbByProject[f.project_id]) fbByProject[f.project_id] = { approved: 0, rejected: 0, revision: 0 }
    if (f.status === 'approved') fbByProject[f.project_id].approved++
    else if (f.status === 'rejected') fbByProject[f.project_id].rejected++
    else if (f.status === 'revision') fbByProject[f.project_id].revision++
  }

  // De-duplicate clients by slug, keeping the most recently created
  const seen = new Set()
  const uniq = []
  for (const c of clients) {
    const slug = slugify(c.name)
    if (seen.has(slug)) continue
    seen.add(slug)
    uniq.push({ ...c, _slug: slug })
  }

  const enriched = uniq.map(c => {
    const cid = c.id
    const intake = intakes.find(i => i.client_id === cid) || null
    const clientPortals = portals.filter(p => p.client_id === cid)
    const clientDashboards = dashboards.filter(d => d.client_id === cid)
    const clientCampaigns = campaigns.filter(ca => ca.client_id === cid)

    let approved = 0, rejected = 0, revision = 0
    let totalImages = 0, totalScripts = 0
    for (const p of clientPortals) {
      totalImages += (p.images || []).length
      totalScripts += (p.hero_scripts || []).length + (p.ugc_scripts || []).length
      const fb = fbByProject[p.id]
      if (fb) { approved += fb.approved; rejected += fb.rejected; revision += fb.revision }
    }

    return {
      id: c.id,
      name: c.name,
      slug: c._slug,
      email: c.email,
      createdAt: c.created_at,
      hasPortal: clientPortals.length > 0,
      portal: clientPortals[0] ? {
        id: clientPortals[0].id,
        slug: clientPortals[0].slug,
        images: totalImages,
        scripts: totalScripts,
      } : null,
      hasBrandKit: !!intake,
      brandKit: intake ? {
        brandName: intake.brand_name,
        productImages: (intake.product_image_urls || []).length,
      } : null,
      dashboards: clientDashboards.map(d => ({ id: d.id, slug: d.slug, title: d.title || d.file_name })),
      campaignCount: clientCampaigns.length,
      campaignApproved: clientCampaigns.filter(c => c.client_status === 'approved').length,
      feedback: { approved, rejected, revision },
    }
  })

  return NextResponse.json({
    clients: enriched,
    totals: {
      clients: enriched.length,
      portals: enriched.filter(c => c.hasPortal).length,
      brandKits: enriched.filter(c => c.hasBrandKit).length,
      dashboards: enriched.reduce((s, c) => s + c.dashboards.length, 0),
      briefs: enriched.reduce((s, c) => s + c.campaignCount, 0),
    },
  })
}
