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

  if(loading)return(<div style={{minHeight:'100vh',background:'white',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'2px solid #eeeeee',borderTopColor:'#111111',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)
  if(!client||!campaigns.length)return(<div style={{minHeight:'100vh',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}><p style={{color:'#cccccc',fontSize:14,fontWeight:300}}>No briefs found for this client.</p></div>)

  const c=campaigns[active]
  const concept=c?.chosen_concept
  const script=c?.chosen_script
  const dir=c?.chosen_direction
  const scenes=c?.scenes||[]
  const isP=c?.aspect_ratio==='9:16'

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .shell{min-height:100vh;}
      /* Header */
      .header{padding:28px 48px 0;border-bottom:1px solid #eeeeee;background:white;position:sticky;top:0;z-index:100;}
      .agency{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:8px;display:flex;align-items:center;gap:7px;}
      .lm{width:18px;height:18px;background:#111111;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .client-name{font-size:24px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:3px;}
      .client-sub{font-size:12px;color:#aaaaaa;margin-bottom:16px;font-weight:300;}
      .tabs{display:flex;gap:0;}
      .tab{padding:10px 20px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:#aaaaaa;transition:all 0.15s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;}
      .tab:hover{color:#111111;}
      .tab.a{color:#111111;border-bottom-color:#111111;}
      .tdot{width:5px;height:5px;border-radius:50%;}
      /* Body */
      .body{max-width:1040px;margin:0 auto;padding:40px 48px 80px;animation:fadeUp 0.3s ease;}
      .eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:8px;}
      .ctitle{font-size:24px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:6px;}
      .ctheme{font-size:14px;color:#777777;line-height:1.65;margin-bottom:5px;font-weight:300;max-width:680px;}
      .cvisual{font-size:13px;color:#aaaaaa;line-height:1.6;margin-bottom:24px;max-width:680px;font-style:italic;font-weight:300;}
      /* Storyboard */
      .sbg{display:grid;gap:5px;}
      .sbg.l{grid-template-columns:repeat(5,1fr);}
      .sbg.p{grid-template-columns:repeat(6,1fr);}
      .sbt{border-radius:6px;overflow:hidden;border:1px solid #eeeeee;background:#f8f8f8;transition:all 0.15s;}
      .sbt:hover{border-color:#111111;}
      .sbt img{width:100%;display:block;object-fit:cover;}
      .sbt img.l{aspect-ratio:16/9;}
      .sbt img.p{aspect-ratio:9/16;}
      .sbtl{padding:5px 7px;display:flex;justify-content:space-between;}
      .sbn{font-size:9px;color:#cccccc;font-family:'DM Mono',monospace;}
      .sbs{font-size:9px;color:#aaaaaa;font-weight:600;letter-spacing:0.04em;}
      .sbte{display:flex;align-items:center;justify-content:center;color:#dddddd;font-size:10px;}
      .sbte.l{aspect-ratio:16/9;}
      .sbte.p{aspect-ratio:9/16;}
      /* Divider */
      .div{height:1px;background:#eeeeee;margin:32px 0;}
      /* Block label */
      .bl{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:12px;}
      /* Script */
      .script-wrap{background:#f8f8f8;border-radius:10px;padding:20px 22px;margin-bottom:24px;}
      .sh{font-size:16px;color:#333333;font-style:italic;line-height:1.5;margin-bottom:10px;font-weight:300;}
      .sf{font-size:14px;color:#777777;line-height:2;font-weight:300;}
      .schips{display:flex;gap:6px;margin-top:12px;}
      .schip{font-size:10px;padding:3px 9px;border-radius:100px;border:1px solid #eeeeee;color:#aaaaaa;}
      /* Info cards */
      .twocol{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px;}
      .infocard{background:white;border:1px solid #eeeeee;border-radius:10px;padding:18px 20px;}
      .ir{display:grid;grid-template-columns:100px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid #f5f5f5;}
      .ir:last-child{border-bottom:none;}
      .ik{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#cccccc;}
      .iv{font-size:12px;color:#666666;line-height:1.5;font-weight:300;}
      /* Avatar */
      .avrow{display:flex;gap:20px;align-items:flex-start;margin-bottom:28px;}
      .avimg{width:100px;height:125px;border-radius:8px;object-fit:cover;border:1px solid #eeeeee;flex-shrink:0;}
      .avlbl{font-size:13px;font-weight:500;color:#111111;margin-bottom:5px;}
      .avdesc{font-size:13px;color:#aaaaaa;line-height:1.6;font-weight:300;}
      /* Action panel */
      .ap{background:#f8f8f8;border-radius:12px;padding:24px;margin-top:32px;}
      .at{font-size:15px;font-weight:500;color:#111111;margin-bottom:4px;}
      .as{font-size:13px;color:#aaaaaa;margin-bottom:18px;font-weight:300;line-height:1.5;}
      .abtns{display:flex;gap:8px;margin-bottom:14px;}
      .abtn{flex:1;padding:11px;border-radius:8px;border:1px solid #e5e5e5;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:5px;background:white;color:#888888;}
      .abtn:hover{border-color:#111111;color:#111111;}
      .abtn.sel{border-color:#111111;color:#111111;background:white;font-weight:600;}
      .rta{width:100%;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:13px;padding:11px 14px;outline:none;resize:vertical;min-height:80px;font-family:'DM Sans',sans-serif;line-height:1.6;margin-bottom:12px;transition:border-color 0.15s;}
      .rta::placeholder{color:#cccccc;}
      .rta:focus{border-color:#111111;}
      .subbtn{background:#111111;color:white;border:none;border-radius:8px;padding:11px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;}
      .subbtn:hover{background:#333333;}
      .subbtn:disabled{opacity:0.25;cursor:not-allowed;}
      .subst{display:flex;align-items:center;gap:12px;padding:14px 16px;background:white;border:1px solid #eeeeee;border-radius:10px;}
      .sico{width:28px;height:28px;border-radius:50%;background:#f0f0f0;border:1px solid #eeeeee;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;}
      .stxt strong{display:block;font-size:13px;color:#111111;margin-bottom:2px;font-weight:500;}
      .stxt span{font-size:12px;color:#aaaaaa;font-weight:300;}
      .chg{background:none;border:none;color:#cccccc;font-size:11px;cursor:pointer;margin-left:8px;font-family:'DM Sans',sans-serif;}
      .chg:hover{color:#888888;}
      /* Footer */
      .footer{padding:24px 48px;border-top:1px solid #eeeeee;display:flex;align-items:center;justify-content:space-between;}
      .fl{display:flex;align-items:center;gap:8px;}
      .fm{width:18px;height:18px;background:#111111;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .fn{font-size:11px;color:#aaaaaa;font-weight:500;}
      .fnt{font-size:11px;color:#dddddd;}
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
              const dc={approved:'#111111',revisions:'#888888',declined:'#cccccc',pending:'#dddddd'}
              return(<button key={camp.id} className={`tab${active===i?' a':''}`} onClick={()=>setActive(i)}>
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
          <div className={`sbg ${isP?'p':'l'}`}>
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
          <div className="script-wrap">
            <p className="bl">Script</p>
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
                <p className="bl">Brand Intelligence</p>
                {[['Target',c.website_analysis.targetCustomer],['Problem',c.website_analysis.corePainPoint],['Outcome',c.website_analysis.desiredTransformation],['Tone',c.website_analysis.websiteTone]].filter(([,v])=>v).map(([l,v])=>(<div key={l} className="ir"><span className="ik">{l}</span><span className="iv">{v}</span></div>))}
              </div>
            )}
            {dir&&(
              <div className="infocard">
                <p className="bl">Visual Direction — {dir.title}</p>
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
              <p className="bl">Campaign Character</p>
              <p className="avlbl">Locked Character Reference</p>
              <p className="avdesc">This character appears consistently throughout all scenes, maintaining visual identity across the campaign.</p>
            </div>
          </div>
          <div className="div"/>
        </>)}

        <div className="ap">
          <p className="at">Your Feedback</p>
          <p className="as">{campaigns.length>1?`Reviewing Concept ${active+1}. Use the tabs above to switch between concepts.`:'Let us know how you would like to move forward.'}</p>
          {submitted[c.id]?(
            <div className="subst">
              <div className="sico">{action[c.id]==='approved'?'✓':action[c.id]==='revisions'?'✎':'✕'}</div>
              <div className="stxt">
                <strong>{action[c.id]==='approved'?'Concept Approved':action[c.id]==='revisions'?'Revisions Requested':'Concept Declined'}</strong>
                {rev[c.id]&&<span>{rev[c.id]}</span>}
                <button className="chg" onClick={()=>setSubmitted(p=>({...p,[c.id]:false}))}>Change response</button>
              </div>
            </div>
          ):(
            <>
              <div className="abtns">
                <button className={`abtn${action[c.id]==='approved'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'approved'}))}>✓ Approve</button>
                <button className={`abtn${action[c.id]==='revisions'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'revisions'}))}>✎ Request Revisions</button>
                <button className={`abtn${action[c.id]==='declined'?' sel':''}`} onClick={()=>setAction(p=>({...p,[c.id]:'declined'}))}>✕ Decline</button>
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
