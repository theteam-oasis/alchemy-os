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

  const { data, error } = await supabase
    .from('portal_feedback')
    .select('*')
    .eq('project_id', projectId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Convert array to object keyed by item_id
  const feedback = {}
  for (const row of (data || [])) {
    // status field takes priority, fall back to approved boolean for old data
    let status = row.status || null
    if (!status && row.approved === true) status = 'approved'
    if (!status && row.approved === false) status = 'rejected'
    feedback[row.item_id] = {
      status,
      approved: row.approved,
      feedbackText: row.feedback_text,
      comments: row.feedback_comments || [],
      updatedAt: row.updated_at,
    }
  }
  return NextResponse.json(feedback)
}

export async function POST(req) {
  const body = await req.json()
  const { itemId, approved, feedbackText, addComment, status, sender, commentLine, commentSelection } = body
  const rawId = body.projectId
  if (!rawId || !itemId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const projectId = await resolveProjectId(rawId)
  if (!projectId) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // If adding a comment, fetch existing comments first and append
  if (addComment) {
    const { data: existing } = await supabase
      .from('portal_feedback')
      .select('feedback_comments')
      .eq('project_id', projectId)
      .eq('item_id', itemId)
      .single()

    const comments = existing?.feedback_comments || []
    const newComment = { text: addComment, date: new Date().toISOString() }
    if (sender) newComment.sender = sender
    if (typeof commentLine === 'number') newComment.line = commentLine
    if (commentSelection) newComment.selection = commentSelection
    comments.push(newComment)

    const { data, error } = await supabase
      .from('portal_feedback')
      .upsert({
        project_id: projectId,
        item_id: itemId,
        feedback_comments: comments,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,item_id' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      approved: data.approved,
      feedbackText: data.feedback_text,
      comments: data.feedback_comments || [],
      updatedAt: data.updated_at,
    })
  }

  const updates = { project_id: projectId, item_id: itemId, updated_at: new Date().toISOString() }
  if (approved !== undefined) updates.approved = approved === null ? null : approved
  if (feedbackText !== undefined) updates.feedback_text = feedbackText
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('portal_feedback')
    .upsert(updates, { onConflict: 'project_id,item_id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    status: data.status || null,
    approved: data.approved,
    feedbackText: data.feedback_text,
    comments: data.feedback_comments || [],
    updatedAt: data.updated_at,
  })
}
