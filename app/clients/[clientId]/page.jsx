'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUS = {
  approved: { label: 'Approved', bg: '#16a34a22', border: '#16a34a66', text: '#4ade80', icon: '✓' },
  revisions: { label: 'Revisions Requested', bg: '#d9770622', border: '#d9770666', text: '#fb923c', icon: '✎' },
  declined: { label: 'Declined', bg: '#dc262622', border: '#dc262666', text: '#f87171', icon: '✕' },
  pending: { label: 'Awaiting Review', bg: '#ffffff11', border: '#333', text: '#555', icon: '○' },
}

export default function ClientProfilePage({ params }) {
  const { clientId } = params
  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [intake, setIntake] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('briefs')

  useEffect(() => {
    loadData()
  }, [clientId])

  async function loadData() {
    const [{ data: clientData }, { data: campaignData }, { data: intakeData }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('campaigns').select('*').eq('client_id', clientId).eq('storyboard_complete', true).order('created_at', { ascending: false }),
      supabase.from('brand_intake').select('*').eq('client_id', clientId).maybeSingle(),
    ])
    if (clientData) setClient(clientData)
    if (campaignData) setCampaigns(campaignData)
    if (intakeData) setIntake(intakeData)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 44, height: 44, border: '2px solid #FFD60A22', borderTopColor: '#FFD60A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const approved = campaigns.filter(c => c.client_status === 'approved')
  const pending = campaigns.filter(c => !c.client_status || c.client_status === 'pending')
  const revisions = campaigns.filter(c => c.client_status === 'revisions')
  const declined = campaigns.filter(c => c.client_status === 'declined')

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
        .container { max-width:1000px; margin:0 auto; padding:48px 40px; animation:fadeIn 0.3s ease; }

        /* Profile hero */
        .profile-hero { display:flex; align-items:flex-start; gap:24px; margin-bottom:40px; }
        .profile-avatar { width:64px; height:64px; border-radius:50%; background:#FFD60A22; border:2px solid #FFD60A44; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; color:#FFD60A; flex-shrink:0; }
        .profile-info { flex:1; }
        .profile-name { font-size:28px; font-weight:800; color:#f0f0f0; margin-bottom:6px; }
        .profile-meta { font-size:13px; color:#555; display:flex; gap:16px; flex-wrap:wrap; }
        .profile-actions { display:flex; gap:10px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
        .btn-primary { background:#FFD60A; color:#0a0a0a; border:none; }
        .btn-primary:hover { background:#ffe033; }
        .btn-secondary { background:transparent; color:#888; border:1px solid #2a2a2a; }
        .btn-secondary:hover { border-color:#444; color:#aaa; }

        /* Stats row */
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:32px; }
        .stat-card { background:#111; border:1px solid #1e1e1e; border-radius:10px; padding:14px 18px; }
        .stat-num { font-size:22px; font-weight:800; color:#f0f0f0; margin-bottom:3px; }
        .stat-label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#555; font-weight:600; }

        /* Tabs */
        .tabs { display:flex; gap:0; border-bottom:1px solid #1a1a1a; margin-bottom:28px; }
        .tab { padding:12px 20px; font-size:13px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; color:#555; transition:all 0.15s; background:none; border-top:none; border-left:none; border-right:none; font-family:inherit; }
        .tab:hover { color:#888; }
        .tab.active { color:#FFD60A; border-bottom-color:#FFD60A; }

        /* Campaign cards */
        .campaigns-list { display:flex; flex-direction:column; gap:12px; }
        .campaign-card { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:20px 24px; }
        .campaign-card-top { display:flex; align-items:center; gap:16px; margin-bottom:12px; }
        .campaign-title { font-size:15px; font-weight:600; color:#f0f0f0; flex:1; }
        .status-badge { font-size:11px; padding:4px 12px; border-radius:100px; border:1px solid; font-weight:600; }
        .campaign-meta { font-size:12px; color:#555; margin-bottom:16px; }
        .campaign-scenes { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
        .scene-thumb { width:60px; height:34px; border-radius:5px; object-fit:cover; border:1px solid #1e1e1e; }
        .scene-thumb.portrait { width:34px; height:52px; }
        .revision-box { background:#0e0e0e; border:1px solid #1e1e1e; border-radius:8px; padding:14px 16px; margin-bottom:16px; }
        .revision-label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#fb923c; font-weight:600; margin-bottom:6px; }
        .revision-text { font-size:13px; color:#888; line-height:1.6; }
        .campaign-actions { display:flex; gap:8px; }
        .script-box { background:#0e0e0e; border:1px solid #1e1e1e; border-radius:8px; padding:14px 16px; margin-bottom:16px; }
        .script-label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#555; font-weight:600; margin-bottom:6px; }
        .script-text { font-size:13px; color:#777; line-height:1.7; font-style:italic; }

        /* Brand intake */
        .intake-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .intake-card { background:#111; border:1px solid #1e1e1e; border-radius:10px; padding:18px 20px; }
        .intake-card-title { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#555; font-weight:600; margin-bottom:12px; }
        .intake-row { display:grid; grid-template-columns:110px 1fr; gap:10px; padding:8px 0; border-bottom:1px solid #1a1a1a; }
        .intake-row:last-child { border-bottom:none; }
        .intake-label { font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:#444; font-weight:600; }
        .intake-value { font-size:12px; color:#888; line-height:1.5; }
        .product-images { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .product-img { width:64px; height:64px; border-radius:8px; object-fit:cover; border:1px solid #1e1e1e; }
        .empty { text-align:center; padding:60px 0; color:#444; font-size:14px; }
      `}</style>

      <div className="shell">
        <header className="header">
          <div className="logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <span>CRM</span></span>
          </div>
          <div className="nav">
            <a href="/clients" className="nav-link">← All Clients</a>
            <a href={`/brief/${clientId}`} target="_blank" className="nav-link">View Client Brief ↗</a>
          </div>
        </header>

        <div className="container">
          {/* Profile hero */}
          <div className="profile-hero">
            <div className="profile-avatar">{client?.name?.[0]?.toUpperCase()}</div>
            <div className="profile-info">
              <h1 className="profile-name">{client?.name}</h1>
              <div className="profile-meta">
                {client?.email && <span>✉ {client.email}</span>}
                {client?.phone && <span>📞 {client.phone}</span>}
                {intake?.website && <a href={intake.website} target="_blank" style={{color:'#FFD60A',textDecoration:'none'}}>🌐 {intake.website}</a>}
                <span>📅 {new Date(client?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="profile-actions">
              <a href={`/sample-brief`} className="btn btn-primary">+ New Brief</a>
              <a href={`/brief/${clientId}`} target="_blank" className="btn btn-secondary">Share Brief ↗</a>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card"><p className="stat-num">{campaigns.length}</p><p className="stat-label">Total Briefs</p></div>
            <div className="stat-card"><p className="stat-num" style={{color:'#4ade80'}}>{approved.length}</p><p className="stat-label">Approved</p></div>
            <div className="stat-card"><p className="stat-num" style={{color:'#fb923c'}}>{revisions.length}</p><p className="stat-label">Revisions</p></div>
            <div className="stat-card"><p className="stat-num" style={{color:'#555'}}>{pending.length}</p><p className="stat-label">Pending</p></div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[
              { key: 'briefs', label: `Briefs (${campaigns.length})` },
              { key: 'brand', label: 'Brand Info' },
            ].map(t => (
              <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {/* Briefs tab */}
          {activeTab === 'briefs' && (
            campaigns.length === 0 ? (
              <div className="empty">No briefs generated yet. <a href="/sample-brief" style={{color:'#FFD60A'}}>Generate one →</a></div>
            ) : (
              <div className="campaigns-list">
                {campaigns.map(campaign => {
                  const s = STATUS[campaign.client_status || 'pending']
                  const scenes = campaign.scenes || []
                  const isPortrait = campaign.aspect_ratio === '9:16'
                  return (
                    <div key={campaign.id} className="campaign-card">
                      <div className="campaign-card-top">
                        <div style={{flex:1}}>
                          <p className="campaign-title">{campaign.concept_title || campaign.chosen_concept?.title || 'Campaign'}</p>
                          <p className="campaign-meta">
                            {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}{scenes.length} scenes
                            {campaign.aspect_ratio && ` · ${campaign.aspect_ratio}`}
                          </p>
                        </div>
                        <span className="status-badge" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
                          {s.icon} {s.label}
                        </span>
                      </div>

                      {/* Scene thumbnails */}
                      {scenes.length > 0 && (
                        <div className="campaign-scenes">
                          {scenes.slice(0, 8).map((scene, i) => scene.imageUrl && (
                            <img key={i} src={scene.imageUrl} alt={`Scene ${i+1}`} className={`scene-thumb ${isPortrait ? 'portrait' : ''}`} />
                          ))}
                        </div>
                      )}

                      {/* Script */}
                      {campaign.chosen_script?.fullScript && (
                        <div className="script-box">
                          <p className="script-label">Script</p>
                          <p className="script-text">"{campaign.chosen_script.fullScript}"</p>
                        </div>
                      )}

                      {/* Revision notes */}
                      {campaign.revision_notes && (
                        <div className="revision-box">
                          <p className="revision-label">✎ Client Revision Notes</p>
                          <p className="revision-text">{campaign.revision_notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="campaign-actions">
                        <a href={`/brief/${clientId}`} target="_blank" className="btn btn-secondary" style={{fontSize:11}}>View Brief ↗</a>
                        <a href={`/sample-brief`} className="btn btn-secondary" style={{fontSize:11}}>Regenerate</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* Brand Info tab */}
          {activeTab === 'brand' && (
            !intake ? (
              <div className="empty">No brand intake data found for this client.</div>
            ) : (
              <div className="intake-grid">
                <div className="intake-card">
                  <p className="intake-card-title">Brand Details</p>
                  {[
                    ['Brand Name', intake.brand_name],
                    ['Website', intake.website],
                    ['Industry', intake.industry],
                    ['Location', intake.location],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="intake-row">
                      <span className="intake-label">{l}</span>
                      <span className="intake-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="intake-card">
                  <p className="intake-card-title">Campaign Context</p>
                  {[
                    ['Target', intake.target_audience],
                    ['Goals', intake.campaign_goals],
                    ['Budget', intake.budget],
                    ['Timeline', intake.timeline],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="intake-row">
                      <span className="intake-label">{l}</span>
                      <span className="intake-value">{v}</span>
                    </div>
                  ))}
                </div>
                {intake.product_image_urls?.length > 0 && (
                  <div className="intake-card" style={{gridColumn:'1/-1'}}>
                    <p className="intake-card-title">Product Images</p>
                    <div className="product-images">
                      {intake.product_image_urls.map((url, i) => (
                        <img key={i} src={url} alt={`Product ${i+1}`} className="product-img" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
