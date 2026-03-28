'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const S={approved:{l:'Approved',c:'#111111',bg:'#f8f8f8',b:'#111111',i:'✓'},revisions:{l:'Revisions',c:'#888888',bg:'#f8f8f8',b:'#cccccc',i:'✎'},declined:{l:'Declined',c:'#cccccc',bg:'#f8f8f8',b:'#eeeeee',i:'✕'},pending:{l:'Awaiting',c:'#aaaaaa',bg:'#f8f8f8',b:'#eeeeee',i:'○'}}

export default function ClientProfilePage({ params }) {
  const {clientId}=params
  const [client,setClient]=useState(null)
  const [campaigns,setCampaigns]=useState([])
  const [intake,setIntake]=useState(null)
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('briefs')
  useEffect(()=>{
    Promise.all([
      supabase.from('clients').select('*').eq('id',clientId).single(),
      supabase.from('campaigns').select('*').eq('client_id',clientId).eq('storyboard_complete',true).order('created_at',{ascending:false}),
      supabase.from('brand_intake').select('*').eq('client_id',clientId).maybeSingle()
    ])
    .then(([{data:c},{data:camp},{data:i}])=>{if(c)setClient(c);if(camp)setCampaigns(camp);if(i)setIntake(i)})
    .catch(e=>console.error('Supabase error:',e))
    .finally(()=>setLoading(false))
  },[clientId])
  if(loading)return(<div style={{minHeight:'100vh',background:'white',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'2px solid #eeeeee',borderTopColor:'#111111',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .shell{min-height:100vh;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:white;border-bottom:1px solid #eeeeee;position:sticky;top:0;z-index:100;}
      .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none;}
      .logo-mark{width:26px;height:26px;background:#111111;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
      .logo-text{font-size:13px;font-weight:500;color:#111111;}
      .logo-text em{color:#aaaaaa;font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:2px;}
      .nl{font-size:12px;font-weight:500;color:#aaaaaa;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all 0.15s;}
      .nl:hover{color:#111111;background:#f5f5f5;}
      .con{max-width:860px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.3s ease;}
      .hero{display:flex;align-items:flex-start;gap:18px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #f0f0f0;}
      .av{width:44px;height:44px;border-radius:50%;background:#f0f0f0;border:1px solid #eeeeee;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#888888;flex-shrink:0;}
      .hn{font-size:22px;font-weight:400;letter-spacing:-0.02em;color:#111111;margin-bottom:4px;}
      .hm{display:flex;gap:14px;flex-wrap:wrap;}
      .hmi{font-size:12px;color:#aaaaaa;font-weight:300;}
      .hmi a{color:#111111;text-decoration:none;}
      .ha{display:flex;gap:8px;margin-left:auto;}
      .bp{background:#111111;color:white;border:none;border-radius:7px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:5px;}
      .bp:hover{background:#333333;}
      .bs{background:white;color:#888888;border:1px solid #e5e5e5;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:5px;}
      .bs:hover{color:#111111;border-color:#111111;}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;}
      .sc{background:white;border:1px solid #eeeeee;border-radius:10px;padding:14px 18px;}
      .sn{font-family:'DM Mono',monospace;font-size:20px;font-weight:400;line-height:1;margin-bottom:4px;}
      .sl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;}
      .tabs{display:flex;gap:0;border-bottom:1px solid #eeeeee;margin-bottom:22px;}
      .tab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:#aaaaaa;transition:all 0.15s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;}
      .tab:hover{color:#111111;}
      .tab.a{color:#111111;border-bottom-color:#111111;}
      .camps{display:flex;flex-direction:column;gap:12px;}
      .cc{background:white;border:1px solid #eeeeee;border-radius:10px;padding:18px 22px;}
      .ct{font-size:14px;font-weight:500;color:#111111;margin-bottom:2px;}
      .cm{font-size:11px;color:#aaaaaa;font-weight:300;margin-bottom:14px;}
      .sbadge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid;}
      .sr{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;}
      .st{border-radius:5px;object-fit:cover;border:1px solid #eeeeee;}
      .sb{background:#f8f8f8;border-radius:8px;padding:12px 14px;margin-bottom:12px;}
      .sh{font-size:13px;color:#555555;font-style:italic;margin-bottom:4px;line-height:1.5;}
      .sf{font-size:12px;color:#aaaaaa;line-height:1.7;font-weight:300;}
      .rb{background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin-bottom:12px;}
      .rl{font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;}
      .rt{font-size:12px;color:#888888;line-height:1.6;font-weight:300;}
      .cas{display:flex;gap:7px;}
      .ig{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .ic{background:white;border:1px solid #eeeeee;border-radius:10px;padding:18px 20px;}
      .it{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;margin-bottom:12px;}
      .ir{display:grid;grid-template-columns:90px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid #f5f5f5;}
      .ir:last-child{border-bottom:none;}
      .ik{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#cccccc;}
      .iv{font-size:12px;color:#666666;line-height:1.5;font-weight:300;}
      .pimgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
      .pimg{width:56px;height:56px;border-radius:7px;object-fit:cover;border:1px solid #eeeeee;}
      .empty{text-align:center;padding:60px 0;color:#cccccc;font-size:14px;font-weight:300;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/" className="nav-logo"><div className="logo-mark">A</div><span className="logo-text">Alchemy <em>OS</em></span></a>
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
          {[{n:campaigns.length,l:'Briefs',c:'#111111'},{n:campaigns.filter(c=>c.client_status==='approved').length,l:'Approved',c:'#111111'},{n:campaigns.filter(c=>c.client_status==='revisions').length,l:'Revisions',c:'#888888'},{n:campaigns.filter(c=>!c.client_status||c.client_status==='pending').length,l:'Pending',c:'#cccccc'}].map(({n,l,c})=>(
            <div key={l} className="sc"><p className="sn" style={{color:c}}>{n}</p><p className="sl">{l}</p></div>
          ))}
        </div>
        <div className="tabs">
          {[['briefs',`Briefs (${campaigns.length})`],['brand','Brand Info']].map(([k,lbl])=>(
            <button key={k} className={`tab${tab===k?' a':''}`} onClick={()=>setTab(k)}>{lbl}</button>
          ))}
        </div>
        {tab==='briefs'&&(campaigns.length===0?<div className="empty">No briefs yet. <a href="/sample-brief" style={{color:'#111111'}}>Generate one →</a></div>:(
          <div className="camps">
            {campaigns.map(c=>{
              const s=S[c.client_status||'pending']
              const scenes=c.scenes||[]
              const isP=c.aspect_ratio==='9:16'
              return(
                <div key={c.id} className="cc">
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:12}}>
                    <div style={{flex:1}}>
                      <p className="ct">{c.concept_title||c.chosen_concept?.title||'Campaign'}</p>
                      <p className="cm">{new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {scenes.length} scenes{c.aspect_ratio?` · ${c.aspect_ratio}`:''}</p>
                    </div>
                    <span className="sbadge" style={{background:s.bg,borderColor:s.b,color:s.c}}>{s.i} {s.l}</span>
                  </div>
                  {scenes.length>0&&<div className="sr">{scenes.slice(0,8).map((sc,i)=>sc?.imageUrl&&<img key={i} src={sc.imageUrl} alt="" className="st" style={{width:isP?30:56,height:isP?48:30}}/>)}</div>}
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
          <div className="ig">
            <div className="ic"><p className="it">Brand Details</p>{[['Brand','brand_name'],['Website','website'],['Industry','industry'],['Location','location']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}</div>
            <div className="ic"><p className="it">Campaign Context</p>{[['Target','target_audience'],['Goals','campaign_goals'],['Budget','budget'],['Timeline','timeline']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}</div>
            {intake.product_image_urls?.length>0&&<div className="ic" style={{gridColumn:'1/-1'}}><p className="it">Product Images</p><div className="pimgs">{intake.product_image_urls.map((u,i)=><img key={i} src={u} alt="" className="pimg"/>)}</div></div>}
          </div>
        ))}
      </div>
    </div>
  </>)
}
