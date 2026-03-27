'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: c }, { data: camp }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('campaigns').select('id,client_id,concept_title,client_status,storyboard_complete,created_at').eq('storyboard_complete', true).order('created_at', { ascending: false }),
    ])
    if (c) setClients(c)
    if (camp) setCampaigns(camp)
    setLoading(false)
  }

  function clientCampaigns(id) { return campaigns.filter(c => c.client_id === id) }

  function clientStatus(id) {
    const cc = clientCampaigns(id)
    if (!cc.length) return 'empty'
    if (cc.some(c => c.client_status === 'approved')) return 'approved'
    if (cc.some(c => c.client_status === 'revisions')) return 'revisions'
    if (cc.some(c => c.client_status === 'declined')) return 'declined'
    return 'pending'
  }

  const statusConfig = {
    approved: { label: 'Approved', color: '#34D399', dot: '#34D399' },
    revisions: { label: 'Revisions', color: '#FB923C', dot: '#FB923C' },
    declined: { label: 'Declined', color: '#F87171', dot: '#F87171' },
    pending: { label: 'Pending', color: 'rgba(255,255,255,0.25)', dot: 'rgba(255,255,255,0.2)' },
    empty: { label: 'No briefs', color: 'rgba(255,255,255,0.15)', dot: 'rgba(255,255,255,0.1)' },
  }

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
  const stats = [
    { num: campaigns.filter(c => c.client_status === 'approved').length, label: 'Approved' },
    { num: campaigns.filter(c => c.client_status === 'revisions').length, label: 'Revisions' },
    { num: campaigns.filter(c => !c.client_status || c.client_status === 'pending').length, label: 'Awaiting' },
    { num: clients.length, label: 'Clients' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body,html{background:#080B14;color:rgba(255,255,255,0.92);font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 15% 0%,rgba(212,168,71,0.04) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 85% 100%,rgba(99,120,180,0.05) 0%,transparent 60%);pointer-events:none;z-index:0;animation:amb 20s ease-in-out infinite alternate;}
        @keyframes amb{0%{opacity:.8;transform:scale(1)}100%{opacity:1;transform:scale(1.04) translate(-0.5%,0.5%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .shell{min-height:100vh;position:relative;z-index:1;}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(8,11,20,0.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .logo-mark{width:28px;height:28px;background:linear-gradient(135deg,#D4A847 0%,#B8922E 100%);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#080B14;box-shadow:0 0 16px rgba(212,168,71,0.25);}
        .logo-text{font-size:13px;font-weight:500;color:rgba(255,255,255,0.9);}
        .logo-text em{color:rgba(255,255,255,0.3);font-style:normal;font-weight:300;}
        .nav-links{display:flex;gap:4px;}
        .nav-link{font-size:12px;font-weight:500;color:rgba(255,255,255,0.3);text-decoration:none;padding:6px 12px;border-radius:8px;border:1px solid transparent;transition:all 0.2s;}
        .nav-link:hover{color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.08);}
        .nav-link.active{color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.08);}
        .container{max-width:900px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.35s ease;}
        .page-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:32px;}
        .page-title{font-size:30px;font-weight:300;letter-spacing:-0.02em;color:rgba(255,255,255,0.95);}
        .page-sub{font-size:13px;color:rgba(255,255,255,0.3);margin-top:4px;font-weight:300;}
        .search{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;color:rgba(255,255,255,0.9);font-size:13px;padding:9px 14px;outline:none;font-family:'DM Sans',sans-serif;width:220px;transition:all 0.2s;}
        .search::placeholder{color:rgba(255,255,255,0.2);}
        .search:focus{border-color:rgba(212,168,71,0.3);background:rgba(255,255,255,0.05);}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px;}
        .stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;position:relative;}
        .stat-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);}
        .stat-num{font-family:'DM Mono',monospace;font-size:24px;font-weight:400;color:rgba(255,255,255,0.9);line-height:1;margin-bottom:5px;}
        .stat-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.25);}
        .clients-list{display:flex;flex-direction:column;gap:8px;}
        .client-row{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 22px;display:flex;align-items:center;gap:18px;cursor:pointer;transition:all 0.2s cubic-bezier(0.22,1,0.36,1);text-decoration:none;position:relative;}
        .client-row::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);}
        .client-row:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.3);}
        .client-avatar{width:38px;height:38px;border-radius:50%;background:rgba(212,168,71,0.08);border:1px solid rgba(212,168,71,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:rgba(212,168,71,0.8);flex-shrink:0;font-family:'DM Mono',monospace;}
        .client-name{font-size:14px;font-weight:500;color:rgba(255,255,255,0.9);margin-bottom:2px;letter-spacing:-0.01em;}
        .client-meta{font-size:11px;color:rgba(255,255,255,0.3);font-weight:300;}
        .client-chips{display:flex;gap:5px;flex-wrap:wrap;}
        .chip{font-size:9px;padding:3px 9px;border-radius:100px;border:1px solid;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;}
        .chip-approved{color:#34D399;border-color:rgba(52,211,153,0.25);background:rgba(52,211,153,0.06);}
        .chip-revisions{color:#FB923C;border-color:rgba(251,146,60,0.25);background:rgba(251,146,60,0.06);}
        .chip-declined{color:#F87171;border-color:rgba(248,113,113,0.25);background:rgba(248,113,113,0.06);}
        .chip-pending{color:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.1);background:transparent;}
        .status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .client-arrow{color:rgba(255,255,255,0.2);font-size:14px;margin-left:auto;}
        .empty{text-align:center;padding:80px 0;color:rgba(255,255,255,0.2);font-size:14px;font-weight:300;}
      `}</style>

      <div className="shell">
        <nav className="nav">
          <a href="/" className="nav-logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <em>OS</em></span>
          </a>
          <div className="nav-links">
            <a href="/clients" className="nav-link active">CRM</a>
            <a href="/sample-brief" className="nav-link">Sample Brief</a>
            <a href="/auto-brief" className="nav-link">Full Brief</a>
          </div>
        </nav>

        <div className="container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Clients</h1>
              <p className="page-sub">{clients.length} clients · {campaigns.length} briefs generated</p>
            </div>
            <input className="search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {!loading && (
            <div className="stats-row">
              {stats.map(({ num, label }) => (
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
            <div className="clients-list">
              {filtered.map(client => {
                const cc = clientCampaigns(client.id)
                const st = clientStatus(client.id)
                const sc = statusConfig[st]
                return (
                  <a key={client.id} href={`/clients/${client.id}`} className="client-row">
                    <div className="client-avatar">{client.name?.[0]?.toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <p className="client-name">{client.name}</p>
                      <p className="client-meta">{cc.length} brief{cc.length !== 1 ? 's' : ''}{client.email ? ` · ${client.email}` : ''}</p>
                    </div>
                    <div className="client-chips">
                      {cc.slice(0, 3).map(c => (
                        <span key={c.id} className={`chip chip-${c.client_status || 'pending'}`}>
                          {c.client_status || 'pending'}
                        </span>
                      ))}
                      {cc.length > 3 && <span className="chip chip-pending">+{cc.length - 3}</span>}
                    </div>
                    <div className="status-dot" style={{background: sc.dot}} />
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
