'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const S = {
  approved:{l:'Approved',c:'#10b981',bg:'rgba(16,185,129,0.08)',b:'rgba(16,185,129,0.25)',i:'✓'},
  revisions:{l:'Revisions',c:'#f59e0b',bg:'rgba(245,158,11,0.08)',b:'rgba(245,158,11,0.25)',i:'✎'},
  declined:{l:'Declined',c:'#ef4444',bg:'rgba(239,68,68,0.08)',b:'rgba(239,68,68,0.25)',i:'✕'},
  pending:{l:'Awaiting Review',c:'rgba(26,26,46,0.4)',bg:'rgba(26,26,46,0.04)',b:'rgba(26,26,46,0.12)',i:'○'},
}

export default function ClientProfilePage({ params }) {
  const { clientId } = params
  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [intake, setIntake] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('briefs')

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').eq('id',clientId).single(),
      supabase.from('campaigns').select('*').eq('client_id',clientId).eq('storyboard_complete',true).order('created_at',{ascending:false}),
      supabase.from('brand_intake').select('*').eq('client_id',clientId).maybeSingle(),
    ]).then(([{data:c},{data:camp},{data:i}])=>{
      if(c)setClient(c); if(camp)setCampaigns(camp); if(i)setIntake(i); setLoading(false)
    })
  },[clientId])

  if(loading)return(<div style={{minHeight:'100vh',background:'#f0f2f7',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,border:'2px solid rgba(99,102,241,0.15)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#f0f2f7;color:#1a1a2e;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 100% 80% at 10% -10%,rgba(199,210,254,0.6) 0%,transparent 50%),radial-gradient(ellipse 80% 60% at 90% 110%,rgba(216,180,254,0.4) 0%,transparent 50%);pointer-events:none;z-index:0;animation:drift 25s ease-in-out infinite alternate;}
      @keyframes drift{0%{opacity:.9;transform:scale(1)}100%{opacity:1;transform:scale(1.05) translate(-1%,1.5%)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .shell{min-height:100vh;position:relative;z-index:1;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(255,255,255,0.55);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.75);position:sticky;top:0;z-index:100;}
      .logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none;}
      .lm{width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;box-shadow:0 2px 12px rgba(99,102,241,0.3);}
      .lt{font-size:13px;font-weight:500;color:#1a1a2e;}
      .lt em{color:rgba(26,26,46,0.35);font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:4px;}
      .nl{font-size:12px;font-weight:500;color:rgba(26,26,46,0.45);text-decoration:none;padding:6px 12px;border-radius:8px;border:1px solid transparent;transition:all 0.2s;}
      .nl:hover{color:#1a1a2e;background:rgba(255,255,255,0.65);border-color:rgba(255,255,255,0.85);}
      .con{max-width:860px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.4s ease;}
      .hero{display:flex;align-items:flex-start;gap:20px;margin-bottom:32px;}
      .av{width:52px;height:52px;border-radius:50%;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:#6366f1;flex-shrink:0;font-family:'DM Mono',monospace;}
      .hn{font-size:24px;font-weight:300;letter-spacing:-0.02em;color:#0f0f23;margin-bottom:5px;}
      .hm{display:flex;gap:14px;flex-wrap:wrap;}
      .hmi{font-size:12px;color:rgba(26,26,46,0.4);font-weight:300;}
      .hmi a{color:#6366f1;text-decoration:none;}
      .ha{display:flex;gap:8px;margin-left:auto;}
      .bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 3px 12px rgba(99,102,241,0.25);}
      .bp:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,0.35);}
      .bs{background:rgba(255,255,255,0.6);color:rgba(26,26,46,0.55);border:1px solid rgba(255,255,255,0.8);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
      .bs:hover{color:#1a1a2e;background:rgba(255,255,255,0.8);}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;}
      .sc{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:12px;padding:14px 18px;box-shadow:0 3px 14px rgba(100,100,150,0.07);}
      .sn{font-family:'DM Mono',monospace;font-size:20px;font-weight:400;line-height:1;margin-bottom:4px;}
      .sl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(26,26,46,0.35);}
      .tabs{display:flex;gap:0;border-bottom:1px solid rgba(26,26,46,0.08);margin-bottom:22px;}
      .tab{padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:rgba(26,26,46,0.4);transition:all 0.2s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;}
      .tab:hover{color:#1a1a2e;}
      .tab.act{color:#6366f1;border-bottom-color:#6366f1;}
      .camps{display:flex;flex-direction:column;gap:10px;}
      .cc{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:14px;padding:20px 24px;box-shadow:0 3px 14px rgba(100,100,150,0.07);position:relative;overflow:hidden;}
      .cc::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent);}
      .ct{font-size:14px;font-weight:500;color:#0f0f23;margin-bottom:2px;letter-spacing:-0.01em;}
      .cm{font-size:11px;color:rgba(26,26,46,0.4);font-weight:300;margin-bottom:14px;}
      .sbadge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid;}
      .sr{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;}
      .st{border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.6);}
      .sb{background:rgba(26,26,46,0.03);border:1px solid rgba(26,26,46,0.07);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
      .sh{font-size:13px;color:rgba(99,102,241,0.8);font-style:italic;margin-bottom:4px;line-height:1.5;}
      .sf{font-size:12px;color:rgba(26,26,46,0.4);line-height:1.7;font-weight:300;}
      .rb{background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
      .rl{font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;}
      .rt{font-size:12px;color:rgba(26,26,46,0.5);line-height:1.6;font-weight:300;}
      .cas{display:flex;gap:7px;}
      .intake-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .ic{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:12px;padding:18px 20px;box-shadow:0 3px 14px rgba(100,100,150,0.07);}
      .it{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(99,102,241,0.6);margin-bottom:12px;}
      .ir{display:grid;grid-template-columns:90px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid rgba(26,26,46,0.05);}
      .ir:last-child{border-bottom:none;}
      .ik{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(26,26,46,0.3);}
      .iv{font-size:12px;color:rgba(26,26,46,0.5);line-height:1.5;font-weight:300;}
      .pimgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
      .pimg{width:58px;height:58px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.7);}
      .empty{text-align:center;padding:60px 0;color:rgba(26,26,46,0.3);font-size:14px;font-weight:300;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/" className="logo-wrap"><div className="lm">A</div><span className="lt">Alchemy <em>OS</em></span></a>
        <div className="nav-links">
          <a href="/clients" className="nl">← Clients</a>
          <a href={`/brief/${clientId}`} target="_blank" className="nl">View Brief ↗</a>
        </div>
      </nav>
      <div className="con">
        <div className="hero">
          <div className="av">{client?.name?.[0]?.toUpperCase()}</div>
          <div style={{flex:1}}>
            <h1 className="hn">{client?.name}</h1>
            <div className="hm">
              {client?.email&&<span className="hmi">✉ {client.email}</span>}
              {intake?.website&&<span className="hmi"><a href={intake.website} target="_blank">↗ {intake.website}</a></span>}
              <span className="hmi">{new Date(client?.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
            </div>
          </div>
          <div className="ha">
            <a href="/sample-brief" className="bp">+ New Brief</a>
            <a href={`/brief/${clientId}`} target="_blank" className="bs">Share ↗</a>
          </div>
        </div>

        <div className="stats">
          {[{n:campaigns.length,l:'Briefs',c:'#0f0f23'},{n:campaigns.filter(c=>c.client_status==='approved').length,l:'Approved',c:'#10b981'},{n:campaigns.filter(c=>c.client_status==='revisions').length,l:'Revisions',c:'#f59e0b'},{n:campaigns.filter(c=>!c.client_status||c.client_status==='pending').length,l:'Pending',c:'rgba(26,26,46,0.5)'}].map(({n,l,c})=>(
            <div key={l} className="sc"><p className="sn" style={{color:c}}>{n}</p><p className="sl">{l}</p></div>
          ))}
        </div>

        <div className="tabs">
          {[['briefs',`Briefs (${campaigns.length})`],['brand','Brand Info']].map(([k,lbl])=>(
            <button key={k} className={`tab${tab===k?' act':''}`} onClick={()=>setTab(k)}>{lbl}</button>
          ))}
        </div>

        {tab==='briefs'&&(campaigns.length===0?<div className="empty">No briefs yet. <a href="/sample-brief" style={{color:'#6366f1'}}>Generate one →</a></div>:(
          <div className="camps">
            {campaigns.map(c=>{
              const s=S[c.client_status||'pending']
              const scenes=c.scenes||[]
              const isP=c.aspect_ratio==='9:16'
              return (
                <div key={c.id} className="cc">
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:14}}>
                    <div style={{flex:1}}>
                      <p className="ct">{c.concept_title||c.chosen_concept?.title||'Campaign'}</p>
                      <p className="cm">{new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {scenes.length} scenes{c.aspect_ratio?` · ${c.aspect_ratio}`:''}</p>
                    </div>
                    <span className="sbadge" style={{background:s.bg,borderColor:s.b,color:s.c}}>{s.i} {s.l}</span>
                  </div>
                  {scenes.length>0&&<div className="sr">{scenes.slice(0,8).map((sc,i)=>sc?.imageUrl&&<img key={i} src={sc.imageUrl} alt="" className="st" style={{width:isP?32:58,height:isP?50:32}}/>)}</div>}
                  {c.chosen_script?.hook&&<div className="sb"><p className="sh">"{c.chosen_script.hook}"</p>{c.chosen_script?.fullScript&&<p className="sf">{c.chosen_script.fullScript}</p>}</div>}
                  {c.revision_notes&&<div className="rb"><p className="rl">✎ Client Notes</p><p className="rt">{c.revision_notes}</p></div>}
                  <div className="cas">
                    <a href={`/brief/${clientId}`} target="_blank" className="bs" style={{fontSize:11,padding:'5px 11px'}}>View Brief ↗</a>
                    <a href="/sample-brief" className="bs" style={{fontSize:11,padding:'5px 11px'}}>Regenerate</a>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {tab==='brand'&&(!intake?<div className="empty">No brand data found.</div>:(
          <div className="intake-grid">
            <div className="ic">
              <p className="it">Brand Details</p>
              {[['Brand','brand_name'],['Website','website'],['Industry','industry'],['Location','location']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}
            </div>
            <div className="ic">
              <p className="it">Campaign Context</p>
              {[['Target','target_audience'],['Goals','campaign_goals'],['Budget','budget'],['Timeline','timeline']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}
            </div>
            {intake.product_image_urls?.length>0&&(
              <div className="ic" style={{gridColumn:'1/-1'}}>
                <p className="it">Product Images</p>
                <div className="pimgs">{intake.product_image_urls.map((u,i)=><img key={i} src={u} alt="" className="pimg"/>)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </>)
}
