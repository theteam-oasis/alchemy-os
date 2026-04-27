'use client'
// Team-side per-client view at the clean URL /team/[slug]. Resolves the slug
// to the actual client UUID and renders the existing client profile component
// in place (no redirect), so the URL bar stays as /team/muze.
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ClientProfilePage from '../../clients/[clientId]/page'

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function TeamSlugPage() {
  const routeParams = useParams()
  const slug = routeParams?.slug
  const [clientId, setClientId] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('clients').select('id,name').order('created_at', { ascending: false })
      if (cancelled) return
      const match = (data || []).find(c => slugify(c.name) === slug)
      if (match) setClientId(match.id)
      else setNotFound(true)
    })()
    return () => { cancelled = true }
  }, [slug])

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <h2 style={{ fontSize: 24, color: '#111' }}>Client not found</h2>
      <p style={{ color: '#999', fontSize: 14 }}>No client matches the slug &quot;{slug}&quot;.</p>
      <a href="/dashboard" style={{ marginTop: 12, color: '#111', textDecoration: 'none', borderBottom: '1px solid #111', fontSize: 13 }}>Back to dashboard</a>
    </div>
  )

  if (!clientId) return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#aaa', fontSize: 14 }}>
      Loading team view...
    </div>
  )

  // Render the existing client profile component using the resolved id
  return <ClientProfilePage params={{ clientId }} />
}
