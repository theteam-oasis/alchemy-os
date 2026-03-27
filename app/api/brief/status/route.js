import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { campaignId, clientStatus, revisionNotes } = await request.json()

    if (!campaignId || !clientStatus) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase
      .from('campaigns')
      .update({
        client_status: clientStatus,
        revision_notes: revisionNotes || null,
        client_actioned_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    console.error('Brief status error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Mark campaign as viewed when brief is opened
export async function PATCH(request) {
  try {
    const { campaignId } = await request.json()

    await supabase
      .from('campaigns')
      .update({ client_viewed_at: new Date().toISOString() })
      .eq('id', campaignId)
      .is('client_viewed_at', null) // only set once

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
