import { supabase } from '@/lib/supabase';
import ProposalClient from './ProposalClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProposal(slug) {
  // Try direct Supabase first
  if (supabase) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!error && data) return data;
  }

  // Fallback to API route
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://scalewithalchemy.com';
    const res = await fetch(`${baseUrl}/api/proposal?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) return json.proposal;
  } catch (e) {
    console.error('Proposal fetch error:', e);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const proposal = await getProposal(slug);

  if (!proposal) {
    return { title: 'Proposal Not Found' };
  }

  const brandName = proposal.brand_name;
  const firstImage = (proposal.static_urls || [])[0] || null;
  const title = `${brandName} A.I. Ads Proposal`;
  const description = `A custom creative proposal for ${brandName} by Alchemy Studios. High-converting, beautiful Meta ads powered by A.I.`;

  return {
    metadataBase: new URL('https://scalewithalchemy.com'),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Alchemy Studios',
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630, alt: `${brandName} Creative Preview` }] } : {}),
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(firstImage ? { images: [firstImage] } : {}),
    },
  };
}

export default async function DynamicProposalPage({ params }) {
  const { slug } = await params;
  const proposal = await getProposal(slug);

  if (!proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <p style={{ color: '#86868B', fontSize: 15 }}>Proposal not found.</p>
      </div>
    );
  }

  return <ProposalClient proposal={proposal} />;
}
