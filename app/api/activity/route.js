import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Derive an activity feed from existing portal_feedback rows. We don't have a
// dedicated activity_log table yet, so this synthesizes events from:
//   - status changes (approved / rejected / revision)         -> updated_at timestamp
//   - feedback comments                                       -> comment.date timestamp
// Items are labeled using their project (hero/ugc script titles, image names,
// mood board references). Returns newest-first, capped at 200 entries.

function lookupItemLabel(project, itemId) {
  if (!project || !itemId) return { label: 'an item', kind: 'unknown' }
  if (itemId.startsWith('moodboard-')) {
    const scriptId = itemId.slice('moodboard-'.length)
    const hero = (project.hero_scripts || []).find(s => s.id === scriptId)
    if (hero) return { label: `${hero.title} mood board`, kind: 'moodboard' }
    const ugc = (project.ugc_scripts || []).find(s => s.id === scriptId)
    if (ugc) return { label: `${ugc.title} mood frame`, kind: 'moodboard' }
    return { label: 'a mood board', kind: 'moodboard' }
  }
  const hero = (project.hero_scripts || []).find(s => s.id === itemId)
  if (hero) return { label: hero.title, kind: 'hero' }
  const ugc = (project.ugc_scripts || []).find(s => s.id === itemId)
  if (ugc) return { label: ugc.title, kind: 'ugc' }
  const img = (project.images || []).find(i => i.id === itemId)
  if (img) return { label: img.name || 'an image', kind: 'image' }
  return { label: 'an item', kind: 'unknown' }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const { data: projects } = await supabase
      .from('portal_projects')
      .select('id, slug, client_name, hero_scripts, ugc_scripts, images')
      .eq('client_id', clientId)
    if (!projects?.length) return NextResponse.json({ activity: [] })

    const projectIds = projects.map(p => p.id)
    const { data: feedbacks } = await supabase
      .from('portal_feedback')
      .select('*')
      .in('project_id', projectIds)
      .order('updated_at', { ascending: false })
      .limit(200)

    const activity = []
    for (const fb of feedbacks || []) {
      const project = projects.find(p => p.id === fb.project_id)
      const { label, kind } = lookupItemLabel(project, fb.item_id)

      if (fb.status) {
        activity.push({
          id: `${fb.project_id}-${fb.item_id}-status-${fb.updated_at}`,
          type: fb.status,
          actor: 'client',
          itemRef: fb.item_id,
          itemKind: kind,
          itemLabel: label,
          projectId: fb.project_id,
          createdAt: fb.updated_at,
          message: `${fb.status === 'approved' ? 'Approved' : fb.status === 'rejected' ? 'Rejected' : 'Requested revision on'} ${label}`,
        })
      }

      for (const c of fb.feedback_comments || []) {
        if (!c?.date) continue
        const who = c.senderName || (c.sender === 'team' ? 'Team' : 'Client')
        activity.push({
          id: `${fb.project_id}-${fb.item_id}-comment-${c.date}`,
          type: 'comment',
          actor: c.sender || 'client',
          senderName: c.senderName || null,
          itemRef: fb.item_id,
          itemKind: kind,
          itemLabel: label,
          projectId: fb.project_id,
          createdAt: c.date,
          message: `${who} commented on ${label}`,
          text: c.text,
          videoTimestamp: typeof c.videoTimestamp === 'number' ? c.videoTimestamp : null,
          line: typeof c.line === 'number' ? c.line : null,
        })
      }
    }

    activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return NextResponse.json({ activity: activity.slice(0, 200) })
  } catch (e) {
    console.error('[activity] error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
