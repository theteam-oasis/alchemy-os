import { supabase } from '@/lib/supabase';
import DeliverablesClient from './DeliverablesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDeliverable(slug) {
  if (supabase) {
    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!error && data) return data;
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://scalewithalchemy.com';
    const res = await fetch(`${baseUrl}/api/deliverables?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) return json.deliverable;
  } catch (e) {
    console.error('Deliverable fetch error:', e);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const deliverable = await getDeliverable(slug);

  if (!deliverable) {
    return { title: 'Deliverables Not Found' };
  }

  const clientName = deliverable.client_name;
  const firstImage = (deliverable.static_urls || [])[0] || null;
  const title = `${clientName}. Creative Deliverables`;
  const description = `Creative deliverables for ${clientName} by Alchemy Productions. High-quality images and videos ready for deployment.`;

  return {
    metadataBase: new URL('https://scalewithalchemy.com'),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Alchemy Productions',
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630, alt: `${clientName} Deliverables` }] } : {}),
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(firstImage ? { images: [firstImage] } : {}),
    },
  };
}

export default async function DeliverablePage({ params }) {
  const { slug } = await params;
  const deliverable = await getDeliverable(slug);

  if (!deliverable) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <p style={{ color: '#86868B', fontSize: 15 }}>Deliverables not found.</p>
      </div>
    );
  }

  return <DeliverablesClient deliverable={deliverable} />;
}
