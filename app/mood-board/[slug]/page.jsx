import { supabase } from '@/lib/supabase';
import MoodBoardClient from './MoodBoardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMoodBoard(slug) {
  if (!supabase) return null;

  const [boardRes, imagesRes] = await Promise.all([
    supabase.from('mood_boards').select('*').eq('slug', slug).single(),
    supabase.from('mood_board_images').select('*').eq('board', slug).order('slot', { ascending: true }),
  ]);

  if (boardRes.error && boardRes.error.code !== 'PGRST116') return null;

  return {
    board: boardRes.data || { slug, brand_name: slug },
    images: imagesRes.data || [],
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getMoodBoard(slug);

  if (!data) return { title: 'Mood Board Not Found' };

  const brandName = data.board.brand_name || slug;
  const firstImage = data.images[0]?.url || null;
  const title = `${brandName} — Mood Board`;
  const description = `Creative mood board for ${brandName}. Photography direction, location, and visual references.`;

  return {
    metadataBase: new URL('https://scalewithalchemy.com'),
    title,
    description,
    openGraph: {
      title, description, type: 'website', siteName: 'Alchemy Productions',
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630, alt: `${brandName} Mood Board` }] } : {}),
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary',
      title, description,
      ...(firstImage ? { images: [firstImage] } : {}),
    },
  };
}

export default async function MoodBoardPage({ params }) {
  const { slug } = await params;
  const data = await getMoodBoard(slug);

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0D0B', fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <p style={{ color: '#8C8880', fontSize: 14 }}>mood board not found.</p>
      </div>
    );
  }

  return <MoodBoardClient board={data.board} images={data.images} />;
}
