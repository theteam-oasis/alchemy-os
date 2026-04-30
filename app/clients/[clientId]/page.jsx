'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Palette, BarChart3, MessageSquare, Sparkles, ExternalLink, Copy, Check, Plus, ArrowRight } from 'lucide-react'
import DashboardChat from '../../../components/DashboardChat'
const S={approved:{l:'Approved',c:'#111111',bg:'#f8f8f8',b:'#111111',i:'✓'},revisions:{l:'Revisions',c:'#888888',bg:'#f8f8f8',b:'#cccccc',i:'✎'},declined:{l:'Declined',c:'#cccccc',bg:'#f8f8f8',b:'#eeeeee',i:'✕'},pending:{l:'Awaiting',c:'#aaaaaa',bg:'#f8f8f8',b:'#eeeeee',i:'○'}}

export default function ClientProfilePage({ params }) {
  const {clientId}=params
  const [client,setClient]=useState(null)
  const [campaigns,setCampaigns]=useState([])
  const [intake,setIntake]=useState(null)
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('marketing')
  const [portal,setPortal]=useState(null)
  const [portalLoading,setPortalLoading]=useState(false)
  const [linkMode,setLinkMode]=useState(false)
  const [allPortals,setAllPortals]=useState([])
  const [dashboards,setDashboards]=useState([])
  const [dashboardsLoading,setDashboardsLoading]=useState(false)
  const [copied,setCopied]=useState(null)
  const copyToClipboard=(text,key)=>{ if(typeof window==='undefined')return; navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1500); }
  const clientSlug=client?.name?(client.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')):''
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
  // Check if a portal project already exists for this client
  useEffect(()=>{
    fetch('/api/portal/projects').then(r=>r.json()).then(projects=>{
      const linked=projects.find(p=>p.clientId===clientId)
      if(linked)setPortal(linked)
      setAllPortals(projects.filter(p=>!p.clientId))
    })
  },[clientId])
  // Load marketing dashboards for this client
  useEffect(()=>{
    setDashboardsLoading(true)
    fetch(`/api/marketing-dashboards?clientId=${clientId}`)
      .then(r=>r.json())
      .then(j=>{ if(j.success) setDashboards(j.dashboards||[]) })
      .catch(()=>{})
      .finally(()=>setDashboardsLoading(false))
  },[clientId])
  const generatePortal=async()=>{
    if(!client)return
    setPortalLoading(true)
    const res=await fetch('/api/portal/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientName:client.name,clientId})})
    const p=await res.json()
    setPortal(p)
    setPortalLoading(false)
  }
  const linkExistingPortal=async(projectId)=>{
    setPortalLoading(true)
    await fetch(`/api/portal/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId})})
    const res=await fetch(`/api/portal/projects/${projectId}`)
    const p=await res.json()
    setPortal(p)
    setLinkMode(false)
    setPortalLoading(false)
  }
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

      /* Tool Hub */
      .tool-hub{margin-bottom:32px;}
      .tool-hub-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
      .tool-hub-title{font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;}
      .tool-hub-link{font-size:12px;font-weight:500;color:#111;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border-bottom:1px solid transparent;transition:border-color 0.15s;}
      .tool-hub-link:hover{border-color:#111;}
      .tool-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
      @media (max-width:900px){.tool-grid{grid-template-columns:repeat(2,1fr);}}
      .tool-card{position:relative;background:#fff;border:1px solid #eeeeee;border-radius:14px;padding:18px;cursor:pointer;transition:all 0.2s ease;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:14px;min-height:148px;overflow:hidden;}
      .tool-card:hover{border-color:#111;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.06);}
      .tool-card.active{border-color:#111;background:#fafafa;}
      .tool-card.empty-state{border-style:dashed;border-color:#e5e5e5;}
      .tool-card.empty-state:hover{border-color:#111;border-style:solid;}
      .tool-icon-wrap{width:36px;height:36px;border-radius:10px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .tool-card.empty-state .tool-icon-wrap{background:#f5f5f5;color:#aaa;}
      .tool-card-name{font-size:14px;font-weight:600;color:#111;margin-bottom:3px;letter-spacing:-0.01em;}
      .tool-card-desc{font-size:11px;color:#aaa;font-weight:400;line-height:1.5;}
      .tool-card-stat{font-family:'DM Mono',monospace;font-size:11px;color:#888;margin-top:auto;padding-top:8px;border-top:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;}
      .tool-card-status{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;}
      .tool-card-status.live{color:#16a34a;}
      .tool-card-status.empty{color:#aaa;}
      .tool-card-arrow{width:24px;height:24px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0;transform:translateX(-4px);transition:all 0.2s ease;}
      .tool-card:hover .tool-card-arrow{opacity:1;transform:translateX(0);}
      .tool-card-actions{display:flex;gap:6px;margin-top:8px;}
      .tool-mini-btn{flex:1;font-size:10px;font-weight:600;padding:6px 8px;border-radius:6px;border:1px solid #eee;background:#fff;color:#666;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;text-decoration:none;text-align:center;display:inline-flex;align-items:center;justify-content:center;gap:4px;}
      .tool-mini-btn:hover{border-color:#111;color:#111;}
      .tool-mini-btn.primary{background:#111;color:#fff;border-color:#111;}
      .tool-mini-btn.primary:hover{background:#333;border-color:#333;color:#fff;}

      /* Client portal banner */
      .cp-banner{background:linear-gradient(135deg,#111 0%,#333 100%);border-radius:14px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:#fff;}
      .cp-banner-text{flex:1;min-width:0;}
      .cp-banner-title{font-size:15px;font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
      .cp-banner-sub{font-size:12px;opacity:0.7;font-weight:400;}
      .cp-banner-actions{display:flex;gap:6px;flex-shrink:0;}
      .cp-btn{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:6px;padding:7px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:4px;}
      .cp-btn:hover{background:rgba(255,255,255,0.25);}
      .cp-btn.primary{background:#fff;color:#111;border-color:#fff;}
      .cp-btn.primary:hover{background:#f5f5f5;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/dashboard" className="nav-logo"><div className="logo-mark">A</div><span className="logo-text">Alchemy <em>OS</em></span></a>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',background:'#111',color:'#fff',borderRadius:980,fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#22c55e'}}></span>
            Team View
          </span>
          <div className="nav-links">
            <a href="/dashboard" className="nl">← Dashboard</a>
            <a href={`/client/${clientSlug}`} target="_blank" className="nl">Client View ↗</a>
            <a href={`/brief/${clientId}`} target="_blank" className="nl">View Brief ↗</a>
          </div>
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

        {/* Client Portal Banner */}
        <div className="cp-banner">
          <div style={{display:'flex',alignItems:'center',gap:14,flex:1,minWidth:0}}>
            <div style={{width:42,height:42,borderRadius:10,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div className="cp-banner-text">
              <p className="cp-banner-title">Client Hub</p>
              <p className="cp-banner-sub">Single sign-on portal where {client?.name||'this client'} can access all their tools in one place</p>
            </div>
          </div>
          <div className="cp-banner-actions">
            <button onClick={()=>copyToClipboard(`${typeof window!=='undefined'?window.location.origin:''}/client/${clientSlug}`,'cp')} className="cp-btn">
              {copied==='cp'?<><Check size={11}/> Copied</>:<><Copy size={11}/> Copy Link</>}
            </button>
            <a href={`/client/${clientSlug}`} target="_blank" rel="noreferrer" className="cp-btn primary">
              <ExternalLink size={11}/> Open
            </a>
          </div>
        </div>

        {/* Tool Hub */}
        <div className="tool-hub">
          <div className="tool-hub-h">
            <span className="tool-hub-title">Linked Tools</span>
          </div>
          <div className="tool-grid">
            {/* Creatives card */}
            <div className={`tool-card${tab==='portal'?' active':''}${!portal?' empty-state':''}`} onClick={()=>setTab('portal')}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div className="tool-icon-wrap"><MessageSquare size={18}/></div>
                <div className="tool-card-arrow"><ArrowRight size={12}/></div>
              </div>
              <div>
                <p className="tool-card-name">Creatives</p>
                <p className="tool-card-desc">{portal?'Asset review & approval':'Set up client review workflow'}</p>
              </div>
              <div className="tool-card-stat">
                {portal?(<>
                  <span>{portal.images?.length||0} images · {(portal.heroScripts?.length||0)+(portal.ugcScripts?.length||0)} scripts</span>
                  <span className="tool-card-status live">● Live</span>
                </>):(
                  <span className="tool-card-status empty">○ Not setup</span>
                )}
              </div>
            </div>

            {/* Brand Kit card */}
            <div className={`tool-card${tab==='brand'?' active':''}${!intake?' empty-state':''}`} onClick={()=>setTab('brand')}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div className="tool-icon-wrap"><Palette size={18}/></div>
                <div className="tool-card-arrow"><ArrowRight size={12}/></div>
              </div>
              <div>
                <p className="tool-card-name">Brand Kit</p>
                <p className="tool-card-desc">{intake?'Brand identity & guidelines':'Capture brand details'}</p>
              </div>
              <div className="tool-card-stat">
                {intake?(<>
                  <span>{intake.brand_name||client?.name}</span>
                  <span className="tool-card-status live">● Complete</span>
                </>):(
                  <span className="tool-card-status empty">○ Not setup</span>
                )}
              </div>
            </div>

            {/* Analytics card */}
            <div className={`tool-card${tab==='marketing'?' active':''}${dashboards.length===0?' empty-state':''}`} onClick={()=>setTab('marketing')}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div className="tool-icon-wrap"><BarChart3 size={18}/></div>
                <div className="tool-card-arrow"><ArrowRight size={12}/></div>
              </div>
              <div>
                <p className="tool-card-name">Analytics</p>
                <p className="tool-card-desc">{dashboards.length>0?'Performance analytics & Oracle AI':'Upload data for live BI'}</p>
              </div>
              <div className="tool-card-stat">
                {dashboards.length>0?(<>
                  <span>{dashboards.length} dashboard{dashboards.length===1?'':'s'}</span>
                  <span className="tool-card-status live">● Active</span>
                </>):(
                  <span className="tool-card-status empty">○ Not setup</span>
                )}
              </div>
            </div>

            {/* Briefs / Campaigns card */}
            <div className={`tool-card${tab==='briefs'?' active':''}${campaigns.length===0?' empty-state':''}`} onClick={()=>setTab('briefs')}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div className="tool-icon-wrap"><FileText size={18}/></div>
                <div className="tool-card-arrow"><ArrowRight size={12}/></div>
              </div>
              <div>
                <p className="tool-card-name">Creative Briefs</p>
                <p className="tool-card-desc">{campaigns.length>0?'Generated campaigns & storyboards':'Generate first campaign'}</p>
              </div>
              <div className="tool-card-stat">
                {campaigns.length>0?(<>
                  <span>{campaigns.length} brief{campaigns.length===1?'':'s'}</span>
                  <span className="tool-card-status live">● Active</span>
                </>):(
                  <span className="tool-card-status empty">○ Not setup</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tabs">
          {[['briefs',`Briefs (${campaigns.length})`],['brand','Brand Info'],['portal','Creatives'],['marketing',`Marketing${dashboards.length?` (${dashboards.length})`:''}`]].map(([k,lbl])=>(
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
        {tab==='brand'&&(!intake?(
          <div className="cc" style={{textAlign:'center',padding:'40px 22px'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'#f8f8f8',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:20,border:'1px solid #eee'}}>🎨</div>
            <p style={{fontSize:16,fontWeight:500,color:'#111',marginBottom:4}}>No Brand Guidelines Yet</p>
            <p style={{fontSize:12,color:'#aaa',fontWeight:300,marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>Generate brand guidelines for this client. Use Express Mode to auto-fill from their website, or fill out the form manually.</p>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              <a href={`/brand-intake?clientId=${clientId}&express=1`} className="bp" style={{textDecoration:'none',fontSize:13,display:'inline-flex',alignItems:'center',gap:6,background:'#000',color:'#fff'}}>
                <Sparkles size={13}/> Express Mode (auto-fill)
              </a>
              <a href={`/brand-intake?clientId=${clientId}`} className="bs" style={{textDecoration:'none',fontSize:13}}>Fill Manually</a>
            </div>
          </div>
        ):(
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div>
                <p style={{fontSize:14,fontWeight:500,color:'#111',marginBottom:2}}>Brand Guidelines</p>
                <p style={{fontSize:12,color:'#aaa',fontWeight:300}}>Foundation for everything we create</p>
              </div>
              <div style={{display:'flex',gap:6}}>
                {intake.website&&<a href={intake.website.startsWith('http')?intake.website:`https://${intake.website}`} target="_blank" rel="noreferrer" className="bs" style={{fontSize:11,padding:'5px 11px'}}>Visit Site ↗</a>}
                <a href={`/brand-intake?clientId=${clientId}`} className="bs" style={{fontSize:11,padding:'5px 11px'}}>Edit</a>
              </div>
            </div>
            <div className="ig">
              <div className="ic"><p className="it">Brand Details</p>{[['Brand','brand_name'],['Website','website'],['Industry','industry'],['Location','location'],['Tagline','tagline']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}</div>
              <div className="ic"><p className="it">Campaign Context</p>{[['Target','target_audience'],['Goals','campaign_goals'],['Budget','budget'],['Timeline','timeline'],['Objective','objective']].filter(([,k])=>intake[k]).map(([l,k])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{intake[k]}</span></div>))}</div>
              {intake.brand_colors&&<div className="ic"><p className="it">Brand Colors</p><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>{String(intake.brand_colors).split(/[,\s]+/).filter(c=>/^#?[0-9A-Fa-f]{3,8}$/.test(c)).map((c,i)=>{const hex=c.startsWith('#')?c:`#${c}`;return(<div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><div style={{width:36,height:36,borderRadius:8,background:hex,border:'1px solid #eee'}}/><span style={{fontSize:9,color:'#aaa',fontFamily:'monospace'}}>{hex}</span></div>);})}</div></div>}
              {intake.personality_tags?.length>0&&<div className="ic"><p className="it">Personality</p><div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>{intake.personality_tags.map((t,i)=><span key={i} style={{fontSize:11,padding:'4px 10px',background:'#f5f5f5',borderRadius:980,color:'#666'}}>{t}</span>)}</div></div>}
              {intake.product_image_urls?.length>0&&<div className="ic" style={{gridColumn:'1/-1'}}><p className="it">Product Images</p><div className="pimgs">{intake.product_image_urls.map((u,i)=><img key={i} src={u} alt="" className="pimg"/>)}</div></div>}
            </div>
          </div>
        ))}
        {tab==='marketing'&&(
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div>
                <p style={{fontSize:14,fontWeight:500,color:'#111',marginBottom:2}}>Analytics</p>
                <p style={{fontSize:12,color:'#aaa',fontWeight:300}}>Private, data-driven dashboards with AI analysis</p>
              </div>
              <a href={`/marketing/create?clientId=${clientId}`} className="bp" style={{textDecoration:'none',fontSize:13}}>+ New Dashboard</a>
            </div>
            {dashboardsLoading?(
              <div className="cc" style={{textAlign:'center',padding:'32px',color:'#aaa',fontSize:13}}>Loading...</div>
            ):dashboards.length===0?(
              <div className="cc" style={{textAlign:'center',padding:'40px 22px'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#f8f8f8',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:20,border:'1px solid #eee'}}>📊</div>
                <p style={{fontSize:16,fontWeight:500,color:'#111',marginBottom:4}}>No dashboards yet</p>
                <p style={{fontSize:12,color:'#aaa',fontWeight:300,marginBottom:24}}>Upload a CSV of marketing data to create your first dashboard. Includes Oracle AI copilot.</p>
                <a href={`/marketing/create?clientId=${clientId}`} className="bp" style={{textDecoration:'none',fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}>+ Create Dashboard</a>
              </div>
            ):(
              <div className="camps">
                {dashboards.map(d=>(
                  <div key={d.id} className="cc" style={{display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:40,height:40,borderRadius:8,background:'#f8f8f8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📊</div>
                    <div style={{flex:1,minWidth:0}}>
                      <p className="ct" style={{marginBottom:2}}>{d.title||d.file_name||'Dashboard'}</p>
                      <p className="cm" style={{marginBottom:0}}>
                        {new Date(d.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {d.file_name||'CSV'}
                      </p>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/marketing/${d.slug}`);}} className="bs" style={{fontSize:11,padding:'5px 11px'}}>Copy Link</button>
                      <a href={`/marketing/${d.slug}`} target="_blank" className="bp" style={{fontSize:11,padding:'5px 11px',textDecoration:'none'}}>Open →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==='portal'&&(
          <div>
            {portal?(
              <div className="cc" style={{textAlign:'center',padding:'32px 22px'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:20}}>✓</div>
                <p style={{fontSize:16,fontWeight:500,color:'#111',marginBottom:4}}>Portal Active</p>
                <p style={{fontSize:12,color:'#aaa',fontWeight:300,marginBottom:20}}>
                  {portal.images?.length||0} images · {(portal.heroScripts?.length||0)+(portal.ugcScripts?.length||0)} scripts
                </p>
                <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                  <a href={`/portal/create?id=${portal.id}`} className="bp" style={{textDecoration:'none',fontSize:13}}>Manage Assets →</a>
                  <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/portal/${portal.slug}`);}} className="bs" style={{fontSize:13}}>Copy Client Link</button>
                  <a href={`/portal/${portal.slug}`} target="_blank" className="bs" style={{textDecoration:'none',fontSize:13}}>Preview ↗</a>
                </div>
                <p style={{fontSize:11,color:'#ccc',marginTop:16,fontFamily:"'DM Mono',monospace"}}>{typeof window!=='undefined'?`${window.location.origin}/portal/${portal.slug}`:''}</p>
                <p style={{fontSize:11,color:'#ccc',marginTop:4}}>Password: <span style={{color:'#888',fontFamily:"'DM Mono',monospace"}}>{portal.slug}2026</span></p>
              </div>
            ):(
              <div className="cc" style={{textAlign:'center',padding:'40px 22px'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#f8f8f8',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:20,border:'1px solid #eee'}}>📋</div>
                <p style={{fontSize:16,fontWeight:500,color:'#111',marginBottom:4}}>No Creatives Yet</p>
                <p style={{fontSize:12,color:'#aaa',fontWeight:300,marginBottom:24}}>Generate a portal to upload assets and collect client feedback</p>
                <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                  <button onClick={generatePortal} disabled={portalLoading} className="bp" style={{fontSize:13,opacity:portalLoading?0.5:1}}>
                    {portalLoading?'Creating...':'+ Generate Portal'}
                  </button>
                  <button onClick={()=>setLinkMode(!linkMode)} className="bs" style={{fontSize:13}}>
                    {linkMode?'Cancel':'Link Existing'}
                  </button>
                </div>
                {linkMode&&(
                  <div style={{marginTop:20,textAlign:'left'}}>
                    {allPortals.length===0?(
                      <p style={{fontSize:12,color:'#aaa',textAlign:'center'}}>No unlinked portals available</p>
                    ):(
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <p style={{fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#ccc',marginBottom:4}}>Unlinked Portals</p>
                        {allPortals.map(p=>(
                          <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1px solid #eee',borderRadius:8}}>
                            <div>
                              <p style={{fontSize:13,fontWeight:500,color:'#111'}}>{p.clientName}</p>
                              <p style={{fontSize:11,color:'#aaa'}}>{p.images?.length||0} images · /portal/{p.slug}</p>
                            </div>
                            <button onClick={()=>linkExistingPortal(p.id)} className="bp" style={{fontSize:11,padding:'5px 12px'}}>Link</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    {/* Floating team chat (unified inbox across all client portals) */}
    <DashboardChat />
  </>)
}
