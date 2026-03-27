'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
function slugify(n){return(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

export default function BriefPage({ params }) {
  const {clientName}=params
  const [client,setClient]=useState(null)
  const [campaigns,setCampaigns]=useState([])
  const [active,setActive]=useState(0)
  const [loading,setLoading]=useState(true)
  const [action,setAction]=useState({})
  const [rev,setRev]=useState({})
  const [submitting,setSubmitting]=useState({})
  const [submitted,setSubmitted]=useState({})
  const [lightbox,setLightbox]=useState(null) // {src, index}

  useEffect(()=>{loadData()},[clientName])

  async function loadData(){
    setLoading(true)
    try{
      const {data:all}=await supabase.from('clients').select('*')
      const m=all?.find(c=>slugify(c.name)===clientName)
      if(!m){setLoading(false);return}
      setClient(m)
      const {data:camp}=await supabase.from('campaigns').select('*').eq('client_id',m.id).eq('storyboard_complete',true).order('created_at',{ascending:false}).limit(6)
      if(camp){
        setCampaigns(camp)
        const sa={};const sr={}
        camp.forEach(c=>{
          if(c.client_status&&c.client_status!=='pending')sa[c.id]=c.client_status
          if(c.revision_notes)sr[c.id]=c.revision_notes
        })
        setAction(sa);setRev(sr)
        setSubmitted(Object.fromEntries(Object.keys(sa).map(k=>[k,true])))
        camp.forEach(c=>fetch('/api/brief/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:c.id})}))
      }
    }catch(e){console.error(e)}
    setLoading(false)
  }

  async function submit(id){
    const s=action[id];if(!s)return
    setSubmitting(p=>({...p,[id]:true}))
    try{
      await fetch('/api/brief/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:id,clientStatus:s,revisionNotes:rev[id]||null})})
      setSubmitted(p=>({...p,[id]:true}))
    }catch(e){console.error(e)}
    setSubmitting(p=>({...p,[id]:false}))
  }

  if(loading)return(<div style={{minHeight:'100vh',background:'white',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'2px solid #eeeeee',borderTopColor:'#111111',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)
  if(!client||!campaigns.length)return(<div style={{minHeight:'100vh',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}><p style={{color:'#cccccc',fontSize:14}}>No briefs found for this client.</p></div>)

  const c=campaigns[active]
  const concept=c?.chosen_concept
  const script=c?.chosen_script
  const dir=c?.chosen_direction
  const scenes=c?.scenes||[]
  const isP=c?.aspect_ratio==='9:16'
  const bigIdea=concept?.bigIdea||concept?.theme

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      .shell{min-height:100vh;}

      /* ── STICKY HEADER ── */
      .header{
        background:white;
        border-bottom:1px solid #eeeeee;
        position:sticky;top:0;z-index:100;
      }
      .header-top{
        display:flex;align-items:center;justify-content:space-between;
        padding:16px 48px;
        border-bottom:1px solid #f5f5f5;
      }
      .agency{display:flex;align-items:center;gap:8px;}
      .lm{width:22px;height:22px;background:#111111;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;}
      .agency-name{font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#aaaaaa;}
      .header-client-info{text-align:center;}
      .header-client-name{font-size:15px;font-weight:500;color:#111111;letter-spacing:-0.01em;}
      .header-client-sub{font-size:11px;color:#aaaaaa;margin-top:2px;}
      .header-right{display:flex;align-items:center;gap:8px;}
      .share-btn{font-size:12px;font-weight:500;color:#aaaaaa;background:white;border:1px solid #e5e5e5;border-radius:6px;padding:6px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
      .share-btn:hover{color:#111111;border-color:#111111;}

      /* Concept tabs */
      .tabs-bar{
        display:flex;
        padding:0 48px;
        overflow-x:auto;
        scrollbar-width:none;
        gap:0;
      }
      .tabs-bar::-webkit-scrollbar{display:none;}
      .tab{
        padding:12px 20px;
        font-size:12px;font-weight:500;
        cursor:pointer;
        white-space:nowrap;
        border-bottom:2px solid transparent;
        color:#aaaaaa;
        transition:all 0.15s;
        background:none;border-top:none;border-left:none;border-right:none;
        font-family:'DM Sans',sans-serif;
        display:flex;align-items:center;gap:7px;
        flex-shrink:0;
      }
      .tab:hover{color:#111111;}
      .tab.a{color:#111111;border-bottom-color:#111111;font-weight:600;}
      .tdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

      /* ── CONCEPT HERO ── */
      .concept-hero{
        padding:52px 48px 40px;
        border-bottom:1px solid #eeeeee;
        animation:fadeUp 0.3s ease;
      }
      .concept-number{font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#aaaaaa;margin-bottom:12px;}
      .concept-title{font-size:42px;font-weight:300;letter-spacing:-0.025em;line-height:1.05;color:#111111;margin-bottom:16px;max-width:800px;}
      .concept-title strong{font-weight:700;}

      .big-idea-block{
        background:#111111;color:white;
        border-radius:10px;
        padding:20px 24px;
        margin-bottom:20px;
        max-width:800px;
      }
      .big-idea-label{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;}
      .big-idea-text{font-size:17px;font-weight:300;line-height:1.6;color:white;}

      .concept-meta{display:flex;gap:24px;flex-wrap:wrap;}
      .concept-meta-item{font-size:12px;color:#888888;font-weight:300;}
      .concept-meta-item strong{color:#111111;font-weight:500;margin-right:4px;}

      /* ── STORYBOARD ── */
      .storyboard-section{padding:40px 48px;border-bottom:1px solid #eeeeee;}
      .section-label{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#aaaaaa;margin-bottom:20px;}

      /* Landscape: 4 per row. Portrait: 4 per row taller */
      .sb-grid{display:grid;gap:8px;}
      .sb-grid.landscape{grid-template-columns:repeat(4,1fr);}
      .sb-grid.portrait{grid-template-columns:repeat(4,1fr);}

      .sb-tile{
        border-radius:8px;overflow:hidden;
        border:1px solid #eeeeee;
        background:#f8f8f8;
        cursor:pointer;
        transition:all 0.2s;
        position:relative;
      }
      .sb-tile:hover{border-color:#111111;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.1);}
      .sb-tile img{width:100%;display:block;object-fit:cover;}
      .sb-tile img.l{aspect-ratio:16/9;}
      .sb-tile img.p{aspect-ratio:9/16;}
      .sb-tile-empty{display:flex;align-items:center;justify-content:center;color:#dddddd;font-size:11px;background:#f8f8f8;}
      .sb-tile-empty.l{aspect-ratio:16/9;}
      .sb-tile-empty.p{aspect-ratio:9/16;}
      .sb-tile-meta{padding:8px 10px;display:flex;align-items:center;justify-content:space-between;background:white;}
      .sb-tile-num{font-size:10px;color:#cccccc;font-family:'DM Mono',monospace;font-weight:400;}
      .sb-tile-shot{font-size:10px;color:#888888;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}
      .sb-tile-action{font-size:10px;color:#aaaaaa;font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}

      .zoom-hint{font-size:11px;color:#cccccc;margin-top:10px;text-align:right;}

      /* ── SCRIPT ── */
      .script-section{padding:40px 48px;border-bottom:1px solid #eeeeee;}
      .script-inner{max-width:720px;}
      .script-hook{font-size:28px;font-weight:300;color:#111111;font-style:italic;line-height:1.4;margin-bottom:20px;letter-spacing:-0.015em;}
      .script-full{font-size:16px;color:#555555;line-height:2.2;font-weight:300;margin-bottom:16px;}
      .script-chips{display:flex;gap:8px;flex-wrap:wrap;}
      .chip{font-size:11px;padding:4px 12px;border-radius:100px;border:1px solid #eeeeee;color:#888888;}

      /* ── TWO-COL INFO ── */
      .two-section{padding:40px 48px;border-bottom:1px solid #eeeeee;}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
      .info-card{background:#f8f8f8;border-radius:10px;padding:22px;}
      .info-card-label{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#aaaaaa;margin-bottom:14px;}
      .info-row{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:8px 0;border-bottom:1px solid #eeeeee;}
      .info-row:last-child{border-bottom:none;}
      .info-key{font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#cccccc;}
      .info-val{font-size:13px;color:#555555;line-height:1.5;font-weight:300;}

      /* ── AVATAR ── */
      .avatar-section{padding:40px 48px;border-bottom:1px solid #eeeeee;}
      .avatar-inner{display:flex;gap:28px;align-items:flex-start;max-width:720px;}
      .avatar-img{width:140px;height:175px;border-radius:10px;object-fit:cover;border:1px solid #eeeeee;flex-shrink:0;}
      .avatar-label{font-size:16px;font-weight:500;color:#111111;margin-bottom:8px;}
      .avatar-desc{font-size:13px;color:#888888;line-height:1.7;font-weight:300;}
      .avatar-archetype{display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#888888;background:#f0f0f0;border-radius:4px;padding:3px 8px;margin-bottom:10px;}

      /* ── ACTION PANEL ── */
      .action-section{padding:40px 48px 60px;}
      .action-inner{max-width:600px;}
      .action-title{font-size:20px;font-weight:400;color:#111111;margin-bottom:6px;letter-spacing:-0.01em;}
      .action-sub{font-size:13px;color:#aaaaaa;margin-bottom:22px;font-weight:300;line-height:1.6;}
      .action-btns{display:flex;gap:8px;margin-bottom:16px;}
      .abtn{flex:1;padding:14px;border-radius:8px;border:1px solid #e5e5e5;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;background:white;color:#888888;}
      .abtn:hover{border-color:#111111;color:#111111;}
      .abtn.sel{border-color:#111111;color:#111111;background:#f8f8f8;font-weight:600;}
      .rta{width:100%;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:12px 14px;outline:none;resize:vertical;min-height:88px;font-family:'DM Sans',sans-serif;line-height:1.6;margin-bottom:14px;transition:border-color 0.15s;}
      .rta::placeholder{color:#cccccc;}
      .rta:focus{border-color:#111111;}
      .subbtn{background:#111111;color:white;border:none;border-radius:8px;padding:14px 28px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;}
      .subbtn:hover{background:#333333;}
      .subbtn:disabled{opacity:0.25;cursor:not-allowed;}
      .submitted-card{display:flex;align-items:center;gap:14px;padding:16px 20px;background:#f8f8f8;border:1px solid #eeeeee;border-radius:10px;}
      .sub-icon{width:32px;height:32px;border-radius:50%;background:#111111;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;flex-shrink:0;}
      .sub-text strong{display:block;font-size:14px;color:#111111;margin-bottom:2px;font-weight:500;}
      .sub-text span{font-size:12px;color:#aaaaaa;font-weight:300;}
      .chg{background:none;border:none;color:#cccccc;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;margin-left:8px;}
      .chg:hover{color:#888888;}

      /* ── FOOTER ── */
      .footer{padding:24px 48px;border-top:1px solid #eeeeee;display:flex;align-items:center;justify-content:space-between;}
      .footer-logo{display:flex;align-items:center;gap:8px;}
      .footer-lm{width:20px;height:20px;background:#111111;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;}
      .footer-name{font-size:11px;font-weight:600;color:#aaaaaa;letter-spacing:0.04em;}
      .footer-note{font-size:11px;color:#dddddd;}

      /* ── LIGHTBOX ── */
      .lightbox{position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;cursor:pointer;}
      .lightbox img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:6px;}
      .lb-close{position:absolute;top:24px;right:28px;color:white;font-size:28px;cursor:pointer;opacity:0.6;line-height:1;}
      .lb-close:hover{opacity:1;}
    `}</style>

    {/* LIGHTBOX */}
    {lightbox&&(
      <div className="lightbox" onClick={()=>setLightbox(null)}>
        <span className="lb-close">✕</span>
        <img src={lightbox.src} alt="Scene"/>
      </div>
    )}

    <div className="shell">
      {/* STICKY HEADER */}
      <div className="header">
        <div className="header-top">
          <div className="agency">
            <div className="lm">A</div>
            <span className="agency-name">Alchemy Agency</span>
          </div>
          <div className="header-client-info">
            <p className="header-client-name">{client.name}</p>
            <p className="header-client-sub">{campaigns.length} concept{campaigns.length!==1?'s':''} · Campaign Brief</p>
          </div>
          <div className="header-right">
            <button className="share-btn" onClick={()=>{navigator.clipboard?.writeText(window.location.href);alert('Link copied')}}>Copy Link</button>
          </div>
        </div>

        {campaigns.length>1&&(
          <div className="tabs-bar">
            {campaigns.map((camp,i)=>{
              const st=action[camp.id]||camp.client_status||'pending'
              const dc={approved:'#111111',revisions:'#888888',declined:'#cccccc',pending:'#dddddd'}
              return(
                <button key={camp.id} className={`tab${active===i?' a':''}`} onClick={()=>{setActive(i);window.scrollTo({top:0,behavior:'smooth'})}}>
                  {`Concept ${i+1} — ${camp.concept_title||camp.chosen_concept?.title||'Untitled'}`}
                  <span className="tdot" style={{background:dc[st]||dc.pending}}/>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* CONCEPT HERO */}
      <div className="concept-hero" key={active}>
        <p className="concept-number">Campaign Concept {active+1} of {campaigns.length}</p>
        <h1 className="concept-title">
          {concept?.title?.split(' ').map((w,i,arr)=>
            i===arr.length-1?<strong key={i}>{w}</strong>:<span key={i}>{w} </span>
          )}
        </h1>

        {bigIdea&&(
          <div className="big-idea-block">
            <p className="big-idea-label">Big Idea</p>
            <p className="big-idea-text">{bigIdea}</p>
          </div>
        )}

        <div className="concept-meta">
          {concept?.emotionalFrame&&<span className="concept-meta-item"><strong>Feeling:</strong>{concept.emotionalFrame}</span>}
          {dir?.cinematicReference&&<span className="concept-meta-item"><strong>Reference:</strong>{dir.cinematicReference}</span>}
          {script?.mood&&<span className="concept-meta-item"><strong>Tone:</strong>{script.mood}</span>}
          {c.aspect_ratio&&<span className="concept-meta-item"><strong>Format:</strong>{c.aspect_ratio}</span>}
        </div>
      </div>

      {/* STORYBOARD */}
      {scenes.length>0&&(
        <div className="storyboard-section">
          <p className="section-label">Storyboard — {scenes.length} Scenes</p>
          <div className={`sb-grid ${isP?'portrait':'landscape'}`}>
            {scenes.map((scene,i)=>(
              <div key={i} className="sb-tile" onClick={()=>scene?.imageUrl&&setLightbox({src:scene.imageUrl,index:i})}>
                {scene?.imageUrl
                  ?<img src={scene.imageUrl} alt={`Scene ${i+1}`} className={isP?'p':'l'}/>
                  :<div className={`sb-tile-empty ${isP?'p':'l'}`}>Scene {i+1}</div>
                }
                <div className="sb-tile-meta">
                  <span className="sb-tile-num">{i+1}</span>
                  {scene?.shot?.shotType&&<span className="sb-tile-shot">{scene.shot.shotType}</span>}
                  {scene?.shot?.action&&<span className="sb-tile-action">{scene.shot.action}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="zoom-hint">Click any scene to enlarge</p>
        </div>
      )}

      {/* SCRIPT */}
      {script&&(
        <div className="script-section">
          <p className="section-label">Script — 30 Seconds</p>
          <div className="script-inner">
            <p className="script-hook">"{script.hook}"</p>
            <p className="script-full">{script.fullScript}</p>
            <div className="script-chips">
              {script.mood&&<span className="chip">{script.mood}</span>}
              <span className="chip">30s voiceover</span>
              {c.aspect_ratio&&<span className="chip">{c.aspect_ratio}</span>}
              {dir?.editingFeel&&<span className="chip">{dir.editingFeel}</span>}
            </div>
          </div>
        </div>
      )}

      {/* VISUAL DIRECTION + BRAND INTEL */}
      {(c.website_analysis||dir)&&(
        <div className="two-section">
          <p className="section-label">Creative Intelligence</p>
          <div className="two-col">
            {dir&&(
              <div className="info-card">
                <p className="info-card-label">Visual Direction — {dir.title}</p>
                {[
                  ['Color World',dir.colorWorld],
                  ['Lighting',dir.lighting],
                  ['Camera',dir.lensAndCamera],
                  ['Environment',dir.environment],
                  ['Texture',dir.texture],
                  ['Editing',dir.editingFeel],
                  ['Reference',dir.cinematicReference],
                ].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="info-row"><span className="info-key">{l}</span><span className="info-val">{v}</span></div>
                ))}
              </div>
            )}
            {c.website_analysis&&(
              <div className="info-card">
                <p className="info-card-label">Brand Intelligence</p>
                {[
                  ['Target',c.website_analysis.targetCustomer],
                  ['Pain Point',c.website_analysis.corePainPoint],
                  ['Transformation',c.website_analysis.desiredTransformation],
                  ['Differentiator',c.website_analysis.differentiators?.[0]],
                  ['Tone',c.website_analysis.websiteTone],
                  ['Category',c.website_analysis.productCategory],
                ].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="info-row"><span className="info-key">{l}</span><span className="info-val">{v}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AVATAR / CHARACTER */}
      {c.chosen_avatar&&(
        <div className="avatar-section">
          <p className="section-label">Campaign Character</p>
          <div className="avatar-inner">
            <img src={c.chosen_avatar} alt="Campaign character" className="avatar-img"/>
            <div>
              {dir?.customerArchetype&&<span className="avatar-archetype">{dir.customerArchetype}</span>}
              <p className="avatar-label">Locked Character Reference</p>
              <p className="avatar-desc">
                This character appears throughout all {scenes.length} scenes, maintaining visual and emotional consistency across the campaign. Every shot references this exact portrait to ensure cohesive identity.
              </p>
              {concept?.whyItFits&&(
                <p style={{fontSize:13,color:'#888888',marginTop:14,lineHeight:1.6,fontWeight:300,fontStyle:'italic'}}>"{concept.whyItFits}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTION PANEL */}
      <div className="action-section">
        <div className="action-inner">
          <h2 className="action-title">What do you think?</h2>
          <p className="action-sub">
            {campaigns.length>1
              ?`You're reviewing Concept ${active+1} — ${c.concept_title||''}. Use the tabs above to review each concept, then submit your feedback below.`
              :'Let us know how you want to move forward.'}
          </p>

          {submitted[c.id]?(
            <div className="submitted-card">
              <div className="sub-icon">{action[c.id]==='approved'?'✓':action[c.id]==='revisions'?'✎':'✕'}</div>
              <div className="sub-text">
                <strong>
                  {action[c.id]==='approved'?'Concept Approved ✓':action[c.id]==='revisions'?'Revisions Requested':'Concept Declined'}
                </strong>
                {rev[c.id]&&<span>{rev[c.id]}</span>}
                <button className="chg" onClick={()=>setSubmitted(p=>({...p,[c.id]:false}))}>Change response</button>
              </div>
            </div>
          ):(
            <>
              <div className="action-btns">
                <button className={`abtn${action[c.id]==='approved'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'approved'}))}>✓ Approve This Concept</button>
                <button className={`abtn${action[c.id]==='revisions'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'revisions'}))}>✎ Request Changes</button>
                <button className={`abtn${action[c.id]==='declined'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'declined'}))}>✕ Not the Right Fit</button>
              </div>
              {(action[c.id]==='revisions'||action[c.id]==='declined')&&(
                <textarea className="rta"
                  placeholder={action[c.id]==='revisions'?'Tell us what you would like to change or explore differently...':'What would make this work better? Any other direction you want to see?'}
                  value={rev[c.id]||''} onChange={e=>setRev(p=>({...p,[c.id]:e.target.value}))}/>
              )}
              {action[c.id]&&<button className="subbtn" disabled={submitting[c.id]} onClick={()=>submit(c.id)}>
                {submitting[c.id]?'Submitting...':'Submit Feedback'}
              </button>}
            </>
          )}
        </div>
      </div>

      <div className="footer">
        <div className="footer-logo">
          <div className="footer-lm">A</div>
          <span className="footer-name">Alchemy Agency</span>
        </div>
        <p className="footer-note">Confidential — prepared exclusively for {client.name}.</p>
      </div>
    </div>
  </>)
}
