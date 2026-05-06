import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const slug = body.slug
    const brand_name = body.brandName || body.brand_name
    const static_urls = body.images || body.static_urls || []
    const video_url = body.videoUrl || body.video_url || null

    const { data, error } = await supabase
      .from('proposals')
      .upsert({ slug, brand_name, static_urls, video_url }, { onConflict: 'slug' })
      .select()
      .single()

    if (error) throw error
    return Response.json({ success: true, proposal: data })
  } catch (error) {
    console.error('Create proposal error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return Response.json({ success: false, error: 'slug query param is required' }, { status: 400 })
    }

    // Use maybeSingle() so "no row found" returns null instead of throwing.
    // This is the correct behavior for the slug-collision check on the create page.
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Get proposal error:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return Response.json({ success: false, notFound: true })
    }

    return Response.json({ success: true, proposal: data })
  } catch (error) {
    console.error('Get proposal exception:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
