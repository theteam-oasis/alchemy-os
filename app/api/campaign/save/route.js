import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { campaignId, clientId, data } = await request.json()

    if (campaignId) {
      // Update existing campaign
      const { error } = await supabase
        .from('campaigns')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', campaignId)

      if (error) throw error
      return Response.json({ success: true, campaignId })
    } else {
      // Create new campaign
      const { data: created, error } = await supabase
        .from('campaigns')
        .insert({ client_id: clientId, ...data })
        .select('id')
        .single()

      if (error) throw error
      return Response.json({ success: true, campaignId: created.id })
    }
  } catch (error) {
    console.error('Save campaign error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const campaignId = searchParams.get('campaignId')

    if (campaignId) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      if (error) throw error
      return Response.json({ success: true, campaign: data })
    }

    if (clientId) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ success: true, campaigns: data })
    }

    return Response.json({ error: 'Need clientId or campaignId' }, { status: 400 })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
