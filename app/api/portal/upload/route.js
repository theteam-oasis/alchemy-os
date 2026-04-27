import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuid } from 'uuid'

export async function POST(req) {
  const formData = await req.formData()
  const file = formData.get('file')
  const projectId = formData.get('projectId')

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop()
  const path = `portal/${projectId}/${uuid()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(path)

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
  })
}
