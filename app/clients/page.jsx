'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUS_COLORS = {
  approved: { bg: '#16a34a22', border: '#16a34a66', text: '#4ade80' },
  revisions: { bg: '#d9770622', border: '#d9770666', text: '#fb923c' },
  declined: { bg: '#dc262622', border: '#dc262666', text: '#f87171' },
  pending: { bg: '#ffffff11', border: '#333', text: '#555' },
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: clientData }, { data: campaignData }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('campaigns').select('id, client_id, concept_title, client_status, storyboard_complete, created_at').eq('storyboard_complete', true).order('created_at', { ascending: false }),
    ])
    if (clientData) setClients(clientData)
    if (campaignData) setCampaigns(campaignData)
    setLoading(false)
  }

  function getCampaignsForClient(clientId) {
    return campaigns.filter(c => c.client_id === clientId)
  }

  function getClientStatus(clientId) {
    const ccs = getCampaignsForClient(clientId)
    if (!ccs.length) return 'no_briefs'
    if (ccs.some(c => c.client_status === 'approved')) return 'approved'
    if (ccs.some(c => c.client_status === 'revisions')) return 'revisions'
    if (ccs.some(c => c.client_status === 'declined')) return 'declined'
    if (ccs.some(c => c.client_status === 'pending')) return 'pending'
    return 'no_briefs'
  }

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans','SF Pro Display',-apple-system,sans-serif; min-height: 100vh; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .shell { min-height: 100vh; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:20px 48px; border-bottom:1px solid #1a1a1a; }
        .logo { display:flex; align-items:center; gap:10px; }
        .logo-mark { width:28px; height:28px; background:#FFD60A; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#0a0a0a; }
        .logo-text { font-size:13px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#888; }
        .logo-text span { color:#FFD60A; }
        .nav { display:flex; gap:10px; }
        .nav-link { font-size:12px; color:#555; text-decoration:none; padding:6px 12px; border-radius:6px; border:1px solid #222; transition:all 0.15s; }
        .nav-link:hover { color:#aaa; border-color:#333; }
        .nav-link.primary { background:#FFD60A; color:#0a0a0a; border-color:#FFD60A; font-weight:700; }
        .nav-link.primary:hover { background:#ffe033; }
        .container { max-width:1000px; margin:0 auto; padding:48px 40px; animation:fadeIn 0.3s ease; }
        .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:32px; }
        .page-title { font-size:28px; font-weight:800; color:#f0f0f0; }
        .page-sub { font-size:13px; color:#555; margin-top:4px; }
        .search-input { background:#111; border:1px solid #222; border-radius:8px; color:#e8e8e8; font-size:13px; padding:10px 14px; outline:none; font-family:inherit; width:220px; transition:border-color 0.15s; }
        .search-input:focus { border-color:#FFD60A44; }
        .clients-grid { display:flex; flex-direction:column; gap:10px; }
        .client-row { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:20px 24px; display:flex; align-items:center; gap:20px; cursor:pointer; transition:all 0.15s; text-decoration:none; }
        .client-row:hover { border-color:#333; background:#141414; }
        .client-avatar { width:42px; height:42px; border-radius:50%; background:#FFD60A22; border:1px solid #FFD60A44; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#FFD60A; flex-shrink:0; }
        .client-info { flex:1; }
        .client-name { font-size:15px; font-weight:600; color:#f0f0f0; margin-bottom:3px; }
        .client-meta { font-size:12px; color:#555; }
        .client-campaigns { display:flex; gap:6px; flex-wrap:wrap; }
        .campaign-chip { font-size:10px; padding:3px 10px; border-radius:100px; border:1px solid; font-weight:500; }
        .status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .client-arrow { color:#444; font-size:16px; }
        .empty { text-align:center; padding:80px 0; color:#444; font-size:14px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px; }
        .stat-card { background:#111; border:1px solid #1e1e1e; border-radius:10px; padding:16px 20px; }
        .stat-num { font-size:24px; font-weight:800; color:#f0f0f0; margin-bottom:4px; }
        .stat-label { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#555; font-weight:600; }
      `}</style>

      <div className="shell">
        <header className="header">
          <div className="logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <span>CRM</span></span>
          </div>
          <div className="nav">
            <a href="/sample-brief" className="nav-link">Sample Builder</a>
            <a href="/auto-brief" className="nav-link">Full Brief</a>
            <a href="/campaign-builder" className="nav-link">Manual Builder</a>
          </div>
        </header>

        <div className="container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Clients</h1>
              <p className="page-sub">{clients.length} clients · {campaigns.length} briefs generated</p>
            </div>
            <input className="search-input" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Stats */}
          {!loading && (
            <div className="stats-row">
              {[
                { num: campaigns.filter(c => c.client_status === 'approved').length, label: 'Approved' },
                { num: campaigns.filter(c => c.client_status === 'revisions').length, label: 'Needs Revisions' },
                { num: campaigns.filter(c => c.client_status === 'pending' || !c.client_status).length, label: 'Awaiting Review' },
                { num: campaigns.filter(c => c.client_status === 'declined').length, label: 'Declined' },
              ].map(({ num, label }) => (
                <div key={label} className="stat-card">
                  <p className="stat-num">{num}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="empty">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No clients found</div>
          ) : (
            <div className="clients-grid">
              {filtered.map(client => {
                const clientCampaigns = getCampaignsForClient(client.id)
                const status = getClientStatus(client.id)
                const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending
                return (
                  <a key={client.id} href={`/clients/${client.id}`} className="client-row">
                    <div className="client-avatar">{client.name?.[0]?.toUpperCase()}</div>
                    <div className="client-info">
                      <p className="client-name">{client.name}</p>
                      <p className="client-meta">
                        {clientCampaigns.length} brief{clientCampaigns.length !== 1 ? 's' : ''} generated
                        {client.email && ` · ${client.email}`}
                      </p>
                    </div>
                    <div className="client-campaigns">
                      {clientCampaigns.slice(0, 3).map(c => {
                        const s = STATUS_COLORS[c.client_status || 'pending']
                        return (
                          <span key={c.id} className="campaign-chip" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
                            {c.client_status || 'pending'}
                          </span>
                        )
                      })}
                      {clientCampaigns.length > 3 && <span className="campaign-chip" style={{ background: '#111', borderColor: '#333', color: '#555' }}>+{clientCampaigns.length - 3}</span>}
                    </div>
                    <div className="status-dot" style={{ background: statusColor.text }} />
                    <span className="client-arrow">→</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
