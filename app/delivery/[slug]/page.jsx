import { supabase } from '@/lib/supabase';
import DeliveryClient from './DeliveryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function getProject(id) {
  if (!supabase) return null;
  const col = isUUID(id) ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('portal_projects')
    .select('*')
    .eq(col, id)
    .single();
  if (error) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: 'Delivery' };

  const clientName = (project.client_name || '').replace(/\b\w/g, c => c.toUpperCase());
  const firstImage = (project.images || [])[0]?.url || null;
  const title = `Alchemy x ${clientName} — Final Assets`;

  return {
    metadataBase: new URL('https://scalewithalchemy.com'),
    title,
    description: `Final approved assets for ${clientName} by Alchemy Productions.`,
    openGraph: {
      title, type: 'website', siteName: 'Alchemy Productions',
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary', title,
      ...(firstImage ? { images: [firstImage] } : {}),
    },
  };
}

export default async function DeliveryPage({ params }) {
  const { slug } = await params;
  return <DeliveryClient slug={slug} />;
}
