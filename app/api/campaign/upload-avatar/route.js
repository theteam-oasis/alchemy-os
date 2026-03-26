export const runtime = 'nodejs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { imageBase64, mimeType, campaignId } = await request.json()

    if (!imageBase64) {
      return Response.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64')
    const ext = mimeType?.includes('jpeg') ? 'jpg' : 'png'
    const filename = `avatars/${campaignId || Date.now()}-${Date.now()}.${ext}`

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('brand-assets')
      .upload(filename, buffer, {
        contentType: mimeType || 'image/png',
        upsert: true,
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(filename)

    return Response.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
