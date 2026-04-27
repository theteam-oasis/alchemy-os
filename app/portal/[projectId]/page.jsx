import { supabase } from '@/lib/supabase';
import ClientReview from './PortalClient';

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
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    return { title: 'Review Portal' };
  }

  const clientName = (project.client_name || '').replace(/\b\w/g, c => c.toUpperCase());
  const firstImage = (project.images || [])[0]?.url || null;
  const title = `Alchemy x ${clientName}`;
  const description = `Review assets and provide feedback for ${clientName}. powered by Alchemy Productions.`;

  return {
    metadataBase: new URL('https://scalewithalchemy.com'),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Alchemy Productions',
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630, alt: `${clientName} Assets` }] } : {}),
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(firstImage ? { images: [firstImage] } : {}),
    },
  };
}

export default async function PortalPage({ params }) {
  const { projectId } = await params;
  return <ClientReview projectId={projectId} />;
}
