import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const { dataUrl, name } = await request.json()
    if (!dataUrl || !name) return Response.json({ error: 'Missing dataUrl or name' }, { status: 400 })

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return Response.json({ error: 'Invalid dataUrl' }, { status: 400 })

    const mimeType = match[1]
    const buffer = Buffer.from(match[2], 'base64')
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const path = `storyboard-assets/${name}.${ext}`

    const { error } = await supabase.storage
      .from('brand-assets')
      .upload(path, buffer, { contentType: mimeType, upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
    return Response.json({ url: publicUrl })
  } catch (e) {
    console.error('Upload asset error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
