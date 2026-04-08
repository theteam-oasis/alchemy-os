import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const TABLE = 'mood_board_images';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const board = searchParams.get('board') || 'koko';

  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('board', board)
    .order('slot', { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, images: data || [] });
}

export async function POST(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const formData = await request.formData();
  const file = formData.get('file');
  const slot = parseInt(formData.get('slot'), 10);
  const board = formData.get('board') || 'koko';

  if (!file || isNaN(slot)) {
    return NextResponse.json({ success: false, error: 'Missing file or slot' });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `mood-board/${board}/slot-${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ success: false, error: uploadError.message });

  const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Remove old image for this slot
  await supabase.from(TABLE).delete().eq('board', board).eq('slot', slot);

  const { error: dbError } = await supabase.from(TABLE).insert({
    board,
    slot,
    url: publicUrl,
    filename: file.name,
  });

  if (dbError) return NextResponse.json({ success: false, error: dbError.message });
  return NextResponse.json({ success: true, url: publicUrl });
}

export async function DELETE(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const { slot, board = 'koko' } = await request.json();

  await supabase.from(TABLE).delete().eq('board', board).eq('slot', slot);
  return NextResponse.json({ success: true });
}
