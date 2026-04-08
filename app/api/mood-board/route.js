import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const IMAGES_TABLE = 'mood_board_images';
const BOARDS_TABLE = 'mood_boards';

/* GET — fetch board metadata + images by slug */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || searchParams.get('board');

  if (!supabase || !slug) return NextResponse.json({ success: false, error: 'Missing slug or no database' });

  const [boardRes, imagesRes] = await Promise.all([
    supabase.from(BOARDS_TABLE).select('*').eq('slug', slug).single(),
    supabase.from(IMAGES_TABLE).select('*').eq('board', slug).order('slot', { ascending: true }),
  ]);

  const board = boardRes.data || null;
  const images = imagesRes.data || [];

  return NextResponse.json({ success: true, board, images });
}

/* POST — upload image to a slot (FormData: file, slot, board/slug) */
export async function POST(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const formData = await request.formData();
  const file = formData.get('file');
  const slot = parseInt(formData.get('slot'), 10);
  const slug = formData.get('slug') || formData.get('board');

  if (!file || isNaN(slot) || !slug) {
    return NextResponse.json({ success: false, error: 'Missing file, slot, or slug' });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `mood-board/${slug}/slot-${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ success: false, error: uploadError.message });

  const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  await supabase.from(IMAGES_TABLE).delete().eq('board', slug).eq('slot', slot);

  const { error: dbError } = await supabase.from(IMAGES_TABLE).insert({
    board: slug,
    slot,
    url: publicUrl,
    filename: file.name,
  });

  if (dbError) return NextResponse.json({ success: false, error: dbError.message });
  return NextResponse.json({ success: true, url: publicUrl });
}

/* PUT — create or update board metadata (JSON: slug, brand_name, location fields) */
export async function PUT(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const body = await request.json();
  const { slug, brand_name, location_name, location_maps_url, location_image_url } = body;

  if (!slug) return NextResponse.json({ success: false, error: 'Missing slug' });

  const row = {
    slug,
    brand_name: brand_name || '',
    location_name: location_name || '',
    location_maps_url: location_maps_url || '',
    location_image_url: location_image_url || '',
  };

  const { data, error } = await supabase
    .from(BOARDS_TABLE)
    .upsert(row, { onConflict: 'slug' })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, board: data });
}

/* PATCH — swap two image slots */
export async function PATCH(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const { slug, board, fromSlot, toSlot } = await request.json();
  const boardSlug = slug || board;
  if (fromSlot === undefined || toSlot === undefined || !boardSlug) {
    return NextResponse.json({ success: false, error: 'Missing params' });
  }

  const { data: rows } = await supabase
    .from(IMAGES_TABLE)
    .select('*')
    .eq('board', boardSlug)
    .in('slot', [fromSlot, toSlot]);

  const fromRow = rows?.find((r) => r.slot === fromSlot);
  const toRow = rows?.find((r) => r.slot === toSlot);

  if (fromRow && toRow) {
    await supabase.from(IMAGES_TABLE).update({ slot: -1 }).eq('id', fromRow.id);
    await supabase.from(IMAGES_TABLE).update({ slot: fromSlot }).eq('id', toRow.id);
    await supabase.from(IMAGES_TABLE).update({ slot: toSlot }).eq('id', fromRow.id);
  } else if (fromRow && !toRow) {
    await supabase.from(IMAGES_TABLE).update({ slot: toSlot }).eq('id', fromRow.id);
  }

  return NextResponse.json({ success: true });
}

/* DELETE — remove image from slot */
export async function DELETE(request) {
  if (!supabase) return NextResponse.json({ success: false, error: 'No database' });

  const { slot, slug, board } = await request.json();
  const boardSlug = slug || board;

  await supabase.from(IMAGES_TABLE).delete().eq('board', boardSlug).eq('slot', slot);
  return NextResponse.json({ success: true });
}
