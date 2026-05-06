import { supabase } from '@/lib/supabase'

// Read/write the per-account content library for the Potential Energy
// demo. The client posts the full payload after each user action (debounced).
// Keeping the server side dumb — single jsonb column, one row per account.

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    if (!accountId) {
      return Response.json({ success: false, error: 'accountId required' }, { status: 400 })
    }
    if (!supabase) {
      return Response.json({ success: false, error: 'no_supabase' }, { status: 500 })
    }
    const { data, error } = await supabase
      .from('marketing_demo_content')
      .select('payload, updated_at')
      .eq('account_id', accountId)
      .maybeSingle()
    if (error) throw error
    return Response.json({ success: true, payload: data?.payload || null, updated_at: data?.updated_at || null })
  } catch (e) {
    console.error('GET marketing-demo-content error:', e)
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const accountId = body.accountId
    const payload = body.payload
    if (!accountId || typeof payload !== 'object') {
      return Response.json({ success: false, error: 'accountId and payload required' }, { status: 400 })
    }
    if (!supabase) {
      return Response.json({ success: false, error: 'no_supabase' }, { status: 500 })
    }
    const { error } = await supabase
      .from('marketing_demo_content')
      .upsert(
        { account_id: accountId, payload, updated_at: new Date().toISOString() },
        { onConflict: 'account_id' }
      )
    if (error) throw error
    return Response.json({ success: true })
  } catch (e) {
    console.error('POST marketing-demo-content error:', e)
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
