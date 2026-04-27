import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const slug = body.slug
    const client_name = body.clientName || body.client_name
    const project_description = body.projectDescription || body.project_description || ''
    const total_deliverables = body.totalDeliverables || body.total_deliverables || 0
    const static_urls = body.images || body.static_urls || []
    const video_links = body.videoLinks || body.video_links || []
    const package_name = body.packageName || body.package_name || ''
    const delivery_date = body.deliveryDate || body.delivery_date || null

    const { data, error } = await supabase
      .from('deliverables')
      .upsert({
        slug,
        client_name,
        project_description,
        total_deliverables,
        static_urls,
        video_links,
        package_name,
        delivery_date,
      }, { onConflict: 'slug' })
      .select()
      .single()

    if (error) throw error
    return Response.json({ success: true, deliverable: data })
  } catch (error) {
    console.error('Create deliverable error:', error)
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

    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) throw error
    return Response.json({ success: true, deliverable: data })
  } catch (error) {
    console.error('Get deliverable error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
