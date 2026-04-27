import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Get all projects with their latest message
  const { data: projects, error: pErr } = await supabase
    .from('portal_projects')
    .select('id, slug, client_name, client_id')
    .order('created_at', { ascending: false })

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const result = []
  for (const p of (projects || [])) {
    // Get messages for this project
    const { data: messages } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('project_id', p.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const msgs = (messages || []).reverse()
    const unreadCount = msgs.filter(m => m.sender === 'client').length
    const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null

    if (msgs.length > 0) {
      result.push({
        projectId: p.id,
        slug: p.slug,
        clientName: p.client_name,
        clientId: p.client_id || null,
        messages: msgs,
        lastMessage,
        unreadCount,
      })
    }
  }

  // Sort by last message time, most recent first
  result.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at))

  return NextResponse.json(result)
}
