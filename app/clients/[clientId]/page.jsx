'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUS = {
  approved: { label: 'Approved', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', icon: '✓' },
  revisions: { label: 'Revisions', color: '#FB923C', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)', icon: '✎' },
  declined: { label: 'Declined', color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: '✕' },
  pending: { label: 'Awaiting Review', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', icon: '○' },
}

export default function ClientProfilePage({ params }) {
  const { clientId } = params
  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [intake, setIntake] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('briefs')

  useEffect(() => { loadData() }, [clientId])

  async function loadData() {
    const [{ data: c }, { data: camp }, { data: i }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('campaigns').select('*').eq('client_id', clientId).eq('storyboard_complete', true).order('created_at', { ascending: false }),
      supabase.from('brand_intake').select('*').eq('client_id', clientId).maybeSingle(),
    ])
    if (c) setClient(c)
    if (camp) setCampaigns(camp)
    if (i) setIntake(i)
    setLoading(false)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#080B14',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:36,height:36,border:'1.5px solid rgba(212,168,71,0.15)',borderTopColor:'#D4A847',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const approved = campaigns.filter(c => c.client_status === 'approved').length
  const revisions = campaigns.filter(c => c.client_status === 'revisions').length
  const pending = campaigns.filter(c => !c.client_status || c.client_status === 'pending').length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body,html{background:#080B14;color:rgba(255,255,255,0.92);font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 15% 0%,rgba(212,168,71,0.04) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 85% 100%,rgba(99,120,180,0.05) 0%,transparent 60%);pointer-events:none;z-index:0;animation:amb 20s ease-in-out infinite alternate;}
        @keyframes amb{0%{opacity:.8}100%{opacity:1;transform:scale(1.04) translate(-0.5%,0.5%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .shell{min-height:100vh;position:relative;z-index:1;}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(8,11,20,0.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .logo-mark{width:28px;height:28px;background:linear-gradient(135deg,#D4A847,#B8922E);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#080B14;box-shadow:0 0 16px rgba(212,168,71,0.25);}
        .logo-text{font-size:13px;font-weight:500;color:rgba(255,255,255,0.9);}
        .logo-text em{color:rgba(255,255,255,0.3);font-style:normal;font-weight:300;}
        .nav-links{display:flex;gap:4px;}
        .nav-link{font-size:12px;font-weight:500;color:rgba(255,255,255,0.3);text-decoration:none;padding:6px 12px;border-radius:8px;border:1px solid transparent;transition:all 0.2s;}
        .nav-link:hover{color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.08);}
        .container{max-width:900px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.35s ease;}

        /* Profile hero */
        .hero{display:flex;align-items:flex-start;gap:22px;margin-bottom:36px;}
        .avatar{width:56px;height:56px;border-radius:50%;background:rgba(212,168,71,0.08);border:1px solid rgba(212,168,71,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:rgba(212,168,71,0.8);flex-shrink:0;font-family:'DM Mono',monospace;}
        .hero-name{font-size:26px;font-weight:300;letter-spacing:-0.02em;color:rgba(255,255,255,0.95);margin-bottom:5px;}
        .hero-meta{display:flex;gap:16px;flex-wrap:wrap;}
        .hero-meta-item{font-size:12px;color:rgba(255,255,255,0.3);font-weight:300;}
        .hero-meta-item a{color:rgba(212,168,71,0.7);text-decoration:none;}
        .hero-actions{display:flex;gap:8px;margin-left:auto;}
        .btn-primary{background:linear-gradient(135deg,#D4A847,#B8922E);color:#080B14;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 0 1px rgba(212,168,71,0.3),0 4px 16px rgba(212,168,71,0.15);}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 0 0 1px rgba(212,168,71,0.4),0 6px 20px rgba(212,168,71,0.25);}
        .btn-secondary{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:9px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
        .btn-secondary:hover{color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.14);}

        /* Stats */
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px;}
        .stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px 18px;position:relative;}
        .stat-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);}
        .stat-num{font-family:'DM Mono',monospace;font-size:22px;font-weight:400;line-height:1;margin-bottom:5px;}
        .stat-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.25);}

        /* Tabs */
        .tabs{display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:24px;}
        .tab{padding:11px 20px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:rgba(255,255,255,0.3);transition:all 0.2s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;letter-spacing:-0.01em;}
        .tab:hover{color:rgba(255,255,255,0.6);}
        .tab.active{color:rgba(212,168,71,0.9);border-bottom-color:#D4A847;}

        /* Campaign cards */
        .campaigns{display:flex;flex-direction:column;gap:10px;}
        .campaign-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px 24px;position:relative;}
        .campaign-card::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);}
        .campaign-top{display:flex;align-items:flex-start;gap:16px;margin-bottom:14px;}
        .campaign-title{font-size:15px;font-weight:500;color:rgba(255,255,255,0.9);margin-bottom:3px;letter-spacing:-0.01em;}
        .campaign-meta{font-size:11px;color:rgba(255,255,255,0.3);font-weight:300;}
        .status-badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:100px;border:1px solid;flex-shrink:0;}
        .scenes-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
        .scene-thumb{border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.07);}
        .script-block{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;margin-bottom:14px;}
        .script-hook{font-size:13px;color:rgba(212,168,71,0.8);font-style:italic;margin-bottom:6px;line-height:1.5;}
        .script-full{font-size:12px;color:rgba(255,255,255,0.4);line-height:1.7;font-weight:300;}
        .revision-block{background:rgba(251,146,60,0.04);border:1px solid rgba(251,146,60,0.15);border-radius:8px;padding:12px 14px;margin-bottom:14px;}
        .revision-label{font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#FB923C;margin-bottom:5px;}
        .revision-text{font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;font-weight:300;}
        .card-actions{display:flex;gap:7px;}

        /* Brand info */
        .intake-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .intake-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;}
        .intake-title{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(212,168,71,0.6);margin-bottom:12px;}
        .intake-row{display:grid;grid-template-columns:100px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
        .intake-row:last-child{border-bottom:none;}
        .intake-key{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.2);}
        .intake-val{font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;font-weight:300;}
        .product-imgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
        .product-img{width:60px;height:60px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.07);}

        .empty{text-align:center;padding:60px 0;color:rgba(255,255,255,0.2);font-size:14px;font-weight:300;}
      `}</style>

      <div className="shell">
        <nav className="nav">
          <a href="/" className="nav-logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <em>OS</em></span>
          </a>
          <div className="nav-links">
            <a href="/clients" className="nav-link">← Clients</a>
            <a href={`/brief/${clientId}`} target="_blank" className="nav-link">View Brief ↗</a>
          </div>
        </nav>

        <div className="container">
          {/* Hero */}
          <div className="hero">
            <div className="avatar">{client?.name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1}}>
              <h1 className="hero-name">{client?.name}</h1>
              <div className="hero-meta">
                {client?.email && <span className="hero-meta-item">✉ {client.email}</span>}
                {intake?.website && <span className="hero-meta-item"><a href={intake.website} target="_blank">↗ {intake.website}</a></span>}
                <span className="hero-meta-item">{new Date(client?.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
              </div>
            </div>
            <div className="hero-actions">
              <a href="/sample-brief" className="btn-primary">+ New Brief</a>
              <a href={`/brief/${clientId}`} target="_blank" className="btn-secondary">Share ↗</a>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { num: campaigns.length, label: 'Briefs', color: 'rgba(255,255,255,0.9)' },
              { num: approved, label: 'Approved', color: '#34D399' },
              { num: revisions, label: 'Revisions', color: '#FB923C' },
              { num: pending, label: 'Pending', color: 'rgba(255,255,255,0.4)' },
            ].map(({ num, label, color }) => (
              <div key={label} className="stat-card">
                <p className="stat-num" style={{color}}>{num}</p>
                <p className="stat-label">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[['briefs', `Briefs (${campaigns.length})`], ['brand', 'Brand Info']].map(([key, label]) => (
              <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
            ))}
          </div>

          {/* Briefs tab */}
          {activeTab === 'briefs' && (
            campaigns.length === 0 ? (
              <div className="empty">No briefs yet. <a href="/sample-brief" style={{color:'rgba(212,168,71,0.7)'}}>Generate one →</a></div>
            ) : (
              <div className="campaigns">
                {campaigns.map(c => {
                  const s = STATUS[c.client_status || 'pending']
                  const scenes = c.scenes || []
                  const isPortrait = c.aspect_ratio === '9:16'
                  const thumbW = isPortrait ? 34 : 60
                  const thumbH = isPortrait ? 52 : 34
                  return (
                    <div key={c.id} className="campaign-card">
                      <div className="campaign-top">
                        <div style={{flex:1}}>
                          <p className="campaign-title">{c.concept_title || c.chosen_concept?.title || 'Campaign'}</p>
                          <p className="campaign-meta">
                            {new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            {' · '}{scenes.length} scenes{c.aspect_ratio ? ` · ${c.aspect_ratio}` : ''}
                          </p>
                        </div>
                        <span className="status-badge" style={{background:s.bg,borderColor:s.border,color:s.color}}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      {scenes.length > 0 && (
                        <div className="scenes-row">
                          {scenes.slice(0, 8).map((scene, i) => scene?.imageUrl && (
                            <img key={i} src={scene.imageUrl} alt="" className="scene-thumb" style={{width:thumbW,height:thumbH}} />
                          ))}
                        </div>
                      )}
                      {c.chosen_script?.hook && (
                        <div className="script-block">
                          <p className="script-hook">"{c.chosen_script.hook}"</p>
                          {c.chosen_script?.fullScript && <p className="script-full">{c.chosen_script.fullScript}</p>}
                        </div>
                      )}
                      {c.revision_notes && (
                        <div className="revision-block">
                          <p className="revision-label">✎ Client Notes</p>
                          <p className="revision-text">{c.revision_notes}</p>
                        </div>
                      )}
                      <div className="card-actions">
                        <a href={`/brief/${clientId}`} target="_blank" className="btn-secondary" style={{fontSize:11,padding:'6px 12px'}}>View Brief ↗</a>
                        <a href="/sample-brief" className="btn-secondary" style={{fontSize:11,padding:'6px 12px'}}>Regenerate</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* Brand tab */}
          {activeTab === 'brand' && (
            !intake ? <div className="empty">No brand data found.</div> : (
              <div className="intake-grid">
                <div className="intake-card">
                  <p className="intake-title">Brand Details</p>
                  {[['Brand','brand_name'],['Website','website'],['Industry','industry'],['Location','location']].filter(([,k])=>intake[k]).map(([l,k])=>(
                    <div key={l} className="intake-row"><span className="intake-key">{l}</span><span className="intake-val">{intake[k]}</span></div>
                  ))}
                </div>
                <div className="intake-card">
                  <p className="intake-title">Campaign Context</p>
                  {[['Target','target_audience'],['Goals','campaign_goals'],['Budget','budget'],['Timeline','timeline']].filter(([,k])=>intake[k]).map(([l,k])=>(
                    <div key={l} className="intake-row"><span className="intake-key">{l}</span><span className="intake-val">{intake[k]}</span></div>
                  ))}
                </div>
                {intake.product_image_urls?.length > 0 && (
                  <div className="intake-card" style={{gridColumn:'1/-1'}}>
                    <p className="intake-title">Product Images</p>
                    <div className="product-imgs">
                      {intake.product_image_urls.map((url, i) => <img key={i} src={url} alt="" className="product-img" />)}
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
