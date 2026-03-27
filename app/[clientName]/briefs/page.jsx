'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
function slugify(n){return(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

export default function BriefPage({ params }) {
  const { clientName } = params
  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState({})
  const [rev, setRev] = useState({})
  const [submitting, setSubmitting] = useState({})
  const [submitted, setSubmitted] = useState({})

  useEffect(()=>{loadData()},[clientName])

  async function loadData(){
    setLoading(true)
    try{
      const {data:all}=await supabase.from('clients').select('*')
      const m=all?.find(c=>slugify(c.name)===clientName)
      if(!m){setLoading(false);return}
      setClient(m)
      const {data:camp}=await supabase.from('campaigns').select('*').eq('client_id',m.id).eq('storyboard_complete',true).order('created_at',{ascending:false}).limit(4)
      if(camp){
        setCampaigns(camp)
        const sa={};const sr={}
        camp.forEach(c=>{if(c.client_status&&c.client_status!=='pending')sa[c.id]=c.client_status;if(c.revision_notes)sr[c.id]=c.revision_notes})
        setAction(sa);setRev(sr);setSubmitted(Object.fromEntries(Object.keys(sa).map(k=>[k,true])))
        camp.forEach(c=>fetch('/api/brief/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:c.id})}))
      }
    }catch(e){console.error(e)}
    setLoading(false)
  }

  async function submit(id){
    const s=action[id];if(!s)return
    setSubmitting(p=>({...p,[id]:true}))
    try{await fetch('/api/brief/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:id,clientStatus:s,revisionNotes:rev[id]||null})});setSubmitted(p=>({...p,[id]:true}))}catch(e){console.error(e)}
    setSubmitting(p=>({...p,[id]:false}))
  }

  if(loading)return(<div style={{minHeight:'100vh',background:'#f0f2f7',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,border:'2px solid rgba(99,102,241,0.15)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)
  if(!client||!campaigns.length)return(<div style={{minHeight:'100vh',background:'#f0f2f7',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}><p style={{color:'rgba(26,26,46,0.3)',fontSize:14,fontWeight:300}}>No briefs found for this client.</p></div>)

  const c=campaigns[active]
  const concept=c?.chosen_concept
  const script=c?.chosen_script
  const dir=c?.chosen_direction
  const scenes=c?.scenes||[]
  const isP=c?.aspect_ratio==='9:16'

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#f0f2f7;color:#1a1a2e;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 100% 80% at 10% -10%,rgba(199,210,254,0.6) 0%,transparent 50%),radial-gradient(ellipse 80% 60% at 90% 110%,rgba(216,180,254,0.4) 0%,transparent 50%),radial-gradient(ellipse 60% 80% at 50% 50%,rgba(255,255,255,0.5) 0%,transparent 70%);pointer-events:none;z-index:0;animation:drift 25s ease-in-out infinite alternate;}
      @keyframes drift{0%{opacity:.9;transform:scale(1)}100%{opacity:1;transform:scale(1.05) translate(-1%,1.5%)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .shell{min-height:100vh;position:relative;z-index:1;}
      .header{padding:32px 48px 0;border-bottom:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.45);backdrop-filter:blur(20px);}
      .agency{font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(99,102,241,0.7);margin-bottom:8px;display:flex;align-items:center;gap:7px;}
      .lm{width:18px;height:18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .client-name{font-size:26px;font-weight:300;letter-spacing:-0.02em;color:#0f0f23;margin-bottom:4px;}
      .client-sub{font-size:13px;color:rgba(26,26,46,0.4);margin-bottom:18px;font-weight:300;}
      .tabs{display:flex;gap:0;}
      .tab{padding:11px 22px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:rgba(26,26,46,0.4);transition:all 0.2s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;}
      .tab:hover{color:#1a1a2e;}
      .tab.act{color:#6366f1;border-bottom-color:#6366f1;}
      .tdot{width:6px;height:6px;border-radius:50%;}
      .body{max-width:1060px;margin:0 auto;padding:44px 48px 80px;animation:fadeUp 0.35s ease;}
      .eyebrow{font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(99,102,241,0.7);margin-bottom:10px;}
      .ctitle{font-size:26px;font-weight:300;letter-spacing:-0.02em;color:#0f0f23;margin-bottom:7px;}
      .ctheme{font-size:14px;color:rgba(26,26,46,0.5);line-height:1.65;margin-bottom:6px;font-weight:300;max-width:680px;}
      .cvisual{font-size:13px;color:rgba(26,26,46,0.35);line-height:1.6;margin-bottom:26px;max-width:680px;font-style:italic;font-weight:300;}
      .sbgrid{display:grid;gap:6px;}
      .sbgrid.l{grid-template-columns:repeat(5,1fr);}
      .sbgrid.p{grid-template-columns:repeat(6,1fr);}
      .sbt{border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.65);background:rgba(255,255,255,0.4);transition:all 0.2s;backdrop-filter:blur(10px);}
      .sbt:hover{border-color:rgba(99,102,241,0.3);transform:translateY(-2px);box-shadow:0 8px 20px rgba(100,100,150,0.15);}
      .sbt img{width:100%;display:block;object-fit:cover;}
      .sbt img.l{aspect-ratio:16/9;}
      .sbt img.p{aspect-ratio:9/16;}
      .sbtl{padding:5px 8px;display:flex;justify-content:space-between;}
      .sbn{font-size:9px;color:rgba(26,26,46,0.3);font-family:'DM Mono',monospace;}
      .sbs{font-size:9px;color:rgba(99,102,241,0.5);font-weight:600;letter-spacing:0.05em;}
      .sbte{display:flex;align-items:center;justify-content:center;color:rgba(26,26,46,0.15);font-size:10px;background:rgba(255,255,255,0.3);}
      .sbte.l{aspect-ratio:16/9;}
      .sbte.p{aspect-ratio:9/16;}
      .div{height:1px;background:rgba(26,26,46,0.07);margin:36px 0;}
      .block{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(99,102,241,0.6);margin-bottom:12px;}
      .glass{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:14px;padding:22px;box-shadow:0 4px 20px rgba(100,100,150,0.08);position:relative;overflow:hidden;margin-bottom:28px;}
      .glass::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent);}
      .sh{font-size:17px;color:rgba(99,102,241,0.8);font-style:italic;line-height:1.5;margin-bottom:12px;font-weight:300;}
      .sf{font-size:14px;color:rgba(26,26,46,0.5);line-height:2;font-weight:300;}
      .schips{display:flex;gap:7px;margin-top:12px;}
      .schip{font-size:10px;padding:3px 10px;border-radius:100px;border:1px solid rgba(26,26,46,0.1);color:rgba(26,26,46,0.4);}
      .twocol{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px;}
      .infocard{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:14px;padding:20px;box-shadow:0 4px 20px rgba(100,100,150,0.08);position:relative;overflow:hidden;}
      .infocard::before{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent);}
      .ir{display:grid;grid-template-columns:100px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid rgba(26,26,46,0.05);}
      .ir:last-child{border-bottom:none;}
      .ik{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(26,26,46,0.3);}
      .iv{font-size:12px;color:rgba(26,26,46,0.5);line-height:1.5;font-weight:300;}
      .avrow{display:flex;gap:22px;align-items:flex-start;margin-bottom:28px;}
      .avimg{width:108px;height:135px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,0.7);flex-shrink:0;box-shadow:0 4px 16px rgba(100,100,150,0.12);}
      .avlbl{font-size:14px;font-weight:500;color:#0f0f23;margin-bottom:6px;}
      .avdesc{font-size:13px;color:rgba(26,26,46,0.4);line-height:1.6;font-weight:300;}
      .ap{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:16px;padding:26px;margin-top:36px;box-shadow:0 4px 20px rgba(100,100,150,0.08);position:relative;overflow:hidden;}
      .ap::before{content:'';position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent);}
      .at{font-size:16px;font-weight:500;color:#0f0f23;margin-bottom:5px;letter-spacing:-0.01em;}
      .as{font-size:13px;color:rgba(26,26,46,0.4);margin-bottom:20px;font-weight:300;line-height:1.5;}
      .abtns{display:flex;gap:8px;margin-bottom:16px;}
      .abtn{flex:1;padding:12px;border-radius:10px;border:1px solid;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:5px;}
      .ba{border-color:rgba(16,185,129,0.25);color:rgba(16,185,129,0.8);background:rgba(16,185,129,0.05);}
      .ba:hover,.ba.sel{border-color:rgba(16,185,129,0.5);background:rgba(16,185,129,0.1);color:#10b981;}
      .br{border-color:rgba(245,158,11,0.25);color:rgba(245,158,11,0.8);background:rgba(245,158,11,0.05);}
      .br:hover,.br.sel{border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.1);color:#f59e0b;}
      .bd{border-color:rgba(239,68,68,0.25);color:rgba(239,68,68,0.8);background:rgba(239,68,68,0.05);}
      .bd:hover,.bd.sel{border-color:rgba(239,68,68,0.5);background:rgba(239,68,68,0.1);color:#ef4444;}
      .rta{width:100%;background:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.78);border-radius:10px;color:#0f0f23;font-size:13px;padding:11px 14px;outline:none;resize:vertical;min-height:80px;font-family:'DM Sans',sans-serif;line-height:1.6;margin-bottom:12px;transition:all 0.2s;}
      .rta::placeholder{color:rgba(26,26,46,0.3);}
      .rta:focus{border-color:rgba(99,102,241,0.35);box-shadow:0 0 0 3px rgba(99,102,241,0.08);}
      .subbtn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:10px;padding:11px 26px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;box-shadow:0 3px 14px rgba(99,102,241,0.25);}
      .subbtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.35);}
      .subbtn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}
      .subst{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.78);border-radius:12px;}
      .sico{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;}
      .stxt strong{display:block;font-size:13px;color:#0f0f23;margin-bottom:2px;font-weight:500;}
      .stxt span{font-size:12px;color:rgba(26,26,46,0.4);font-weight:300;}
      .chg{background:none;border:none;color:rgba(26,26,46,0.3);font-size:11px;cursor:pointer;margin-left:8px;font-family:'DM Sans',sans-serif;}
      .chg:hover{color:rgba(26,26,46,0.6);}
      .footer{padding:26px 48px;border-top:1px solid rgba(26,26,46,0.07);display:flex;align-items:center;justify-content:space-between;}
      .fl{display:flex;align-items:center;gap:8px;}
      .fm{width:18px;height:18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .fn{font-size:11px;color:rgba(26,26,46,0.35);font-weight:500;}
      .fnt{font-size:11px;color:rgba(26,26,46,0.2);}
    `}</style>
    <div className="shell">
      <div className="header">
        <p className="agency"><span className="lm">A</span>Alchemy OS — Campaign Brief</p>
        <h1 className="client-name">{client.name}</h1>
        <p className="client-sub">{campaigns.length} concept{campaigns.length!==1?'s':''} prepared for your review</p>
        {campaigns.length>1&&(
          <div className="tabs">
            {campaigns.map((camp,i)=>{
              const st=action[camp.id]||camp.client_status||'pending'
              const dc={approved:'#10b981',revisions:'#f59e0b',declined:'#ef4444',pending:'rgba(26,26,46,0.2)'}
              return(<button key={camp.id} className={`tab${active===i?' act':''}`} onClick={()=>setActive(i)}>
                Concept {i+1}{camp.concept_title?` — ${camp.concept_title}`:''}
                <span className="tdot" style={{background:dc[st]||dc.pending}}/>
              </button>)
            })}
          </div>
        )}
      </div>

      <div className="body" key={active}>
        <p className="eyebrow">Campaign Concept {active+1}</p>
        <h2 className="ctitle">{concept?.title}</h2>
        <p className="ctheme">{concept?.theme}</p>
        {concept?.visualUniverse&&<p className="cvisual">{concept.visualUniverse}</p>}

        {scenes.length>0&&(
          <div className={`sbgrid ${isP?'p':'l'}`}>
            {scenes.map((s,i)=>(
              <div key={i} className="sbt">
                {s?.imageUrl?<img src={s.imageUrl} alt="" className={isP?'p':'l'}/>:<div className={`sbte ${isP?'p':'l'}`}>Scene {i+1}</div>}
                <div className="sbtl"><span className="sbn">{i+1}</span>{s?.shot?.shotType&&<span className="sbs">{s.shot.shotType}</span>}</div>
              </div>
            ))}
          </div>
        )}

        <div className="div"/>

        {script&&(<>
          <div className="glass">
            <p className="block">Script</p>
            <p className="sh">"{script.hook}"</p>
            <p className="sf">{script.fullScript}</p>
            <div className="schips">
              {script.mood&&<span className="schip">{script.mood}</span>}
              <span className="schip">30s</span>
              {c.aspect_ratio&&<span className="schip">{c.aspect_ratio}</span>}
            </div>
          </div>
          <div className="div"/>
        </>)}

        {(c.website_analysis||dir)&&(<>
          <div className="twocol">
            {c.website_analysis&&(
              <div className="infocard">
                <p className="block">Brand Intelligence</p>
                {[['Target',c.website_analysis.targetCustomer],['Problem',c.website_analysis.corePainPoint],['Outcome',c.website_analysis.desiredTransformation],['Tone',c.website_analysis.websiteTone]].filter(([,v])=>v).map(([l,v])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{v}</span></div>))}
              </div>
            )}
            {dir&&(
              <div className="infocard">
                <p className="block">Visual Direction — {dir.title}</p>
                {[['Color',dir.colorWorld],['Lighting',dir.lighting],['Lens',dir.lensAndCamera],['Reference',dir.cinematicReference],['Environment',dir.environment]].filter(([,v])=>v).map(([l,v])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{v}</span></div>))}
              </div>
            )}
          </div>
          <div className="div"/>
        </>)}

        {c.chosen_avatar&&(<>
          <div className="avrow">
            <img src={c.chosen_avatar} alt="" className="avimg"/>
            <div>
              <p className="block">Campaign Character</p>
              <p className="avlbl">Locked Character Reference</p>
              <p className="avdesc">This character appears throughout all scenes, maintaining visual consistency across the campaign.</p>
            </div>
          </div>
          <div className="div"/>
        </>)}

        <div className="ap">
          <p className="at">Your Feedback</p>
          <p className="as">{campaigns.length>1?`Reviewing Concept ${active+1}. Use tabs above to switch.`:'Let us know how you would like to move forward.'}</p>
          {submitted[c.id]?(
            <div className="subst">
              <div className="sico" style={{background:action[c.id]==='approved'?'rgba(16,185,129,0.1)':action[c.id]==='revisions'?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${action[c.id]==='approved'?'rgba(16,185,129,0.3)':action[c.id]==='revisions'?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)'}`}}>
                {action[c.id]==='approved'?'✓':action[c.id]==='revisions'?'✎':'✕'}
              </div>
              <div className="stxt">
                <strong>{action[c.id]==='approved'?'Concept Approved':action[c.id]==='revisions'?'Revisions Requested':'Concept Declined'}</strong>
                {rev[c.id]&&<span>{rev[c.id]}</span>}
                <button className="chg" onClick={()=>setSubmitted(p=>({...p,[c.id]:false}))}>Change response</button>
              </div>
            </div>
          ):(
            <>
              <div className="abtns">
                <button className={`abtn ba${action[c.id]==='approved'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'approved'}))}>✓ Approve</button>
                <button className={`abtn br${action[c.id]==='revisions'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'revisions'}))}>✎ Request Revisions</button>
                <button className={`abtn bd${action[c.id]==='declined'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'declined'}))}>✕ Decline</button>
              </div>
              {(action[c.id]==='revisions'||action[c.id]==='declined')&&(
                <textarea className="rta" placeholder={action[c.id]==='revisions'?'What would you like us to change?':'Optional: why is this not the right fit?'}
                  value={rev[c.id]||''} onChange={e=>setRev(p=>({...p,[c.id]:e.target.value}))}/>
              )}
              <button className="subbtn" disabled={!action[c.id]||submitting[c.id]} onClick={()=>submit(c.id)}>
                {submitting[c.id]?'Submitting...':'Submit Feedback'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="footer">
        <div className="fl"><div className="fm">A</div><span className="fn">Alchemy Agency</span></div>
        <p className="fnt">Confidential — prepared exclusively for {client.name}.</p>
      </div>
    </div>
  </>)
}
