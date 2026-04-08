import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const TABLE = 'mood_board_locations';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const board = searchParams.get('board') || 'koko';

  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('board', board)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ success: false, error: error.message });
  }
  return NextResponse.json({ success: true, location: data || null });
}

export async function POST(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const formData = await request.formData();
  const board = formData.get('board') || 'koko';
  const name = formData.get('name') || '';
  const mapsUrl = formData.get('maps_url') || '';
  const file = formData.get('image');

  let imageUrl = formData.get('existing_image_url') || '';

  // Upload new image if provided
  if (file && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `mood-board/${board}/location-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ success: false, error: uploadError.message });

    const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
    imageUrl = urlData.publicUrl;
  }

  // Upsert location row
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('board', board)
    .single();

  const row = { board, name, maps_url: mapsUrl, image_url: imageUrl };

  if (existing) {
    await supabase.from(TABLE).update(row).eq('id', existing.id);
  } else {
    await supabase.from(TABLE).insert(row);
  }

  return NextResponse.json({ success: true, location: { ...row, image_url: imageUrl } });
}
