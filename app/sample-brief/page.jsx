'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
function fileToDataUrl(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f)})}

export default function SampleBriefPage() {
  const [phase,setPhase]=useState('input')
  const [clients,setClients]=useState([])
  const [selectedClientId,setSelectedClientId]=useState(null)
  const [productPageUrl,setProductPageUrl]=useState('')
  const [offerNotes,setOfferNotes]=useState('')
  const [creativeKeywords,setCreativeKeywords]=useState('')
  const [aspectRatio,setAspectRatio]=useState('16:9')
  const [extractedImages,setExtractedImages]=useState([])
  const [selectedImageUrl,setSelectedImageUrl]=useState(null)
  const [uploadedImageDataUrl,setUploadedImageDataUrl]=useState(null)
  const [extracting,setExtracting]=useState(false)
  const [analysis,setAnalysis]=useState(null)
  const [conceptProgress,setConceptProgress]=useState([{status:'waiting',title:'',message:''},{status:'waiting',title:'',message:''}])
  const [overallMessage,setOverallMessage]=useState('')
  const [error,setError]=useState(null)
  const [doneClientId,setDoneClientId]=useState(null)
  const [doneSlug,setDoneSlug]=useState(null)
  const productInputRef=useRef(null)

  useEffect(()=>{supabase.from('clients').select('id,name').order('name').then(({data})=>{if(data)setClients(data)})},[])
  useEffect(()=>{if(!selectedClientId)return;supabase.from('brand_intake').select('website').eq('client_id',selectedClientId).maybeSingle().then(({data})=>{if(data?.website&&!productPageUrl)setProductPageUrl(data.website)})},[selectedClientId])
  useEffect(()=>{if(!productPageUrl||!productPageUrl.startsWith('http'))return;const t=setTimeout(()=>extractImages(productPageUrl),1500);return()=>clearTimeout(t)},[productPageUrl])

  async function extractImages(url){
    setExtracting(true);setExtractedImages([]);setSelectedImageUrl(null)
    try{const res=await fetch('/api/campaign/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productPageUrl:url,offerNotes:'',extractImagesOnly:true})});const j=await res.json();if(j.productImages?.length){setExtractedImages(j.productImages);setSelectedImageUrl(j.productImages[0])}}catch{}
    setExtracting(false)
  }

  async function handleProductUpload(e){const f=e.target.files?.[0];if(!f)return;setUploadedImageDataUrl(await fileToDataUrl(f));setSelectedImageUrl(null)}
  const effectiveProductImage=uploadedImageDataUrl||selectedImageUrl

  async function handleGenerate(){
    if(!productPageUrl){setError('Enter a product page URL.');return}
    setPhase('analyzing');setError(null)
    try{
      setOverallMessage('Analyzing product page...')
      const ar=await fetch('/api/campaign/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productPageUrl,offerNotes})})
      const aj=await ar.json();if(!aj.success)throw new Error(aj.error)
      const analysis=aj.analysis
      if(aj.productImages?.length&&!extractedImages.length){setExtractedImages(aj.productImages);if(!selectedImageUrl&&!uploadedImageDataUrl)setSelectedImageUrl(aj.productImages[0])}
      setAnalysis(analysis);setPhase('generating');setOverallMessage(`Building concepts for ${analysis.brandName||'brand'}...`)
      const cr=await fetch('/api/campaign/concepts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis,creativeKeywords:creativeKeywords.split(',').map(k=>k.trim()).filter(Boolean),count:2,previousConcepts:[]})})
      const cj=await cr.json();if(!cj.success)throw new Error(cj.error)
      const concepts=cj.concepts.slice(0,2)
      setConceptProgress(concepts.map(c=>({status:'building',title:c.title,message:'Generating...'})))
      const clientId=selectedClientId||null
      const clientName=selectedClientId?clients.find(c=>c.id===selectedClientId)?.name:analysis.brandName||'Brand'
      await Promise.allSettled(concepts.map(async(concept,idx)=>{
        try{
          const res=await fetch('/api/campaign/sample-generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,clientName,analysis,concept,conceptIdx:idx,productPageUrl,offerNotes,aspectRatio,productImageUrl:selectedImageUrl||null,uploadedProductImage:uploadedImageDataUrl||null})})
          const json=await res.json();if(!json.success)throw new Error(json.error)
          setConceptProgress(prev=>{const u=[...prev];u[idx]={status:'done',title:concept.title,message:'Complete'};return u})
          if(json.clientSlug&&!doneSlug)setDoneSlug(json.clientSlug)
          if(json.clientId&&!doneClientId)setDoneClientId(json.clientId)
        }catch(e){setConceptProgress(prev=>{const u=[...prev];u[idx]={status:'error',title:concept.title,message:e.message};return u})}
      }))
      setPhase('done')
    }catch(e){setError(e.message);setPhase('error')}
  }

  const completedCount=conceptProgress.filter(c=>c.status==='done').length
  const slugForUrl=doneSlug||(analysis?.brandName?analysis.brandName.toLowerCase().replace(/[^a-z0-9]+/g,'-'):null)

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      .shell{min-height:100vh;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:white;border-bottom:1px solid #eeeeee;position:sticky;top:0;z-index:100;}
      .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none;}
      .logo-mark{width:26px;height:26px;background:#111111;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
      .logo-text{font-size:13px;font-weight:500;color:#111111;letter-spacing:-0.01em;}
      .logo-text em{color:#aaaaaa;font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:2px;}
      .nav-link{font-size:12px;font-weight:500;color:#aaaaaa;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all 0.15s;}
      .nav-link:hover{color:#111111;background:#f5f5f5;}
      .container{max-width:560px;margin:0 auto;padding:52px 24px 80px;animation:fadeUp 0.3s ease;}
      .eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:12px;}
      .title{font-size:34px;font-weight:300;letter-spacing:-0.02em;line-height:1.1;color:#111111;margin-bottom:10px;}
      .title strong{font-weight:600;}
      .sub{font-size:14px;color:#888888;line-height:1.65;margin-bottom:14px;font-weight:300;}
      .pill-meta{display:inline-flex;align-items:center;gap:8px;background:#f5f5f5;border:1px solid #eeeeee;border-radius:100px;padding:4px 12px;font-size:11px;color:#aaaaaa;margin-bottom:40px;}
      .pill-meta span{color:#111111;font-weight:500;}
      .section{margin-bottom:18px;}
      .label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#aaaaaa;display:block;margin-bottom:7px;}
      .label em{font-size:10px;color:#cccccc;text-transform:none;letter-spacing:0;font-weight:400;margin-left:6px;font-style:normal;}
      .url-wrap{position:relative;}
      .input{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:11px 14px;outline:none;width:100%;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
      .input::placeholder{color:#cccccc;}
      .input:focus{border-color:#111111;}
      .textarea{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:11px 14px;outline:none;width:100%;resize:vertical;min-height:72px;line-height:1.6;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
      .textarea::placeholder{color:#cccccc;}
      .textarea:focus{border-color:#111111;}
      .input-hint{font-size:11px;color:#cccccc;margin-top:5px;}
      .url-badge{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;display:flex;align-items:center;gap:5px;}
      .url-spinner{width:11px;height:11px;border:1.5px solid #eeeeee;border-top-color:#111111;border-radius:50%;animation:spin 0.7s linear infinite;}
      .url-ok{color:#111111;font-weight:600;font-size:10px;}
      .card{background:white;border:1px solid #eeeeee;border-radius:10px;padding:16px;}
      .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
      .card-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;}
      .card-count{font-size:10px;color:#111111;font-weight:500;}
      .img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px;margin-bottom:12px;}
      .img-item{border-radius:6px;overflow:hidden;border:1.5px solid #eeeeee;cursor:pointer;transition:all 0.15s;aspect-ratio:1;background:#f8f8f8;position:relative;}
      .img-item:hover{border-color:#111111;}
      .img-item.selected{border-color:#111111;border-width:2px;}
      .img-item img{width:100%;height:100%;object-fit:cover;display:block;}
      .img-check{position:absolute;top:3px;right:3px;width:16px;height:16px;background:#111111;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .img-shimmer{aspect-ratio:1;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.8s ease-in-out infinite;border-radius:6px;}
      .divider{height:1px;background:#eeeeee;margin:12px 0;}
      .upload-row{display:flex;align-items:center;gap:12px;cursor:pointer;}
      .upload-box{width:40px;height:40px;border-radius:6px;background:#f5f5f5;border:1px dashed #dddddd;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
      .upload-preview{width:40px;height:40px;border-radius:6px;object-fit:contain;background:#f5f5f5;border:1px solid #eeeeee;}
      .upload-text{flex:1;font-size:12px;color:#aaaaaa;}
      .upload-btn{font-size:11px;color:#111111;border:1px solid #dddddd;border-radius:6px;padding:4px 10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
      .upload-btn:hover{background:#f5f5f5;}
      .selected-row{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f8f8f8;border:1px solid #eeeeee;border-radius:8px;margin-top:8px;}
      .selected-row img{width:32px;height:32px;border-radius:5px;object-fit:cover;}
      .selected-row-text{flex:1;font-size:11px;color:#aaaaaa;}
      .clear-btn{background:none;border:none;color:#cccccc;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif;}
      .clear-btn:hover{color:#888888;}
      .format-row{display:flex;gap:8px;}
      .format-btn{flex:1;padding:10px;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#aaaaaa;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:7px;}
      .format-btn:hover{border-color:#111111;color:#111111;}
      .format-btn.active{border-color:#111111;color:#111111;background:#f8f8f8;font-weight:600;}
      .client-wrap{background:#f8f8f8;border:1px solid #eeeeee;border-radius:10px;padding:14px 16px;}
      .client-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;margin-bottom:10px;}
      .pills{display:flex;flex-wrap:wrap;gap:6px;}
      .pill{padding:5px 12px;border-radius:100px;border:1px solid #e5e5e5;background:white;color:#aaaaaa;font-size:12px;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;}
      .pill:hover{border-color:#111111;color:#111111;}
      .pill.active{border-color:#111111;color:#111111;font-weight:500;}
      .error-bar{background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;font-size:13px;color:#dc2626;margin-bottom:20px;}
      .gen-btn{width:100%;padding:14px;background:#111111;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:28px;letter-spacing:-0.01em;}
      .gen-btn:hover{background:#333333;}
      .gen-btn:disabled{opacity:0.25;cursor:not-allowed;}
      .gen-btn-meta{font-size:11px;opacity:0.5;font-weight:400;}
      .gen-container{max-width:480px;margin:80px auto;padding:0 24px;animation:fadeUp 0.3s ease;text-align:center;}
      .gen-spinner{width:36px;height:36px;border:2px solid #eeeeee;border-top-color:#111111;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px;}
      .gen-title{font-size:20px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:6px;}
      .gen-sub{font-size:13px;color:#aaaaaa;margin-bottom:28px;font-weight:300;}
      .progress-track{background:#f0f0f0;border-radius:100px;height:2px;margin-bottom:8px;overflow:hidden;}
      .progress-fill{height:100%;background:#111111;border-radius:100px;transition:width 0.5s ease;}
      .progress-label{font-size:10px;color:#cccccc;margin-bottom:24px;font-family:'DM Mono',monospace;}
      .concept-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;}
      .cc{background:white;border:1px solid #eeeeee;border-radius:10px;padding:16px;position:relative;overflow:hidden;transition:border-color 0.25s;}
      .cc.building{border-color:#111111;}
      .cc.done{border-color:#111111;}
      .cc.error{border-color:#fecaca;}
      .cc-sweep{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.015),transparent);background-size:200%;animation:shimmer 2.5s ease-in-out infinite;}
      .cc-num{font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#cccccc;margin-bottom:5px;}
      .cc-title{font-size:12px;font-weight:500;color:#111111;margin-bottom:5px;min-height:18px;line-height:1.4;}
      .done-container{max-width:400px;margin:100px auto;padding:0 24px;text-align:center;animation:fadeUp 0.4s ease;}
      .done-icon{font-size:40px;margin-bottom:20px;}
      .done-title{font-size:26px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:8px;}
      .done-sub{font-size:14px;color:#aaaaaa;line-height:1.6;margin-bottom:28px;font-weight:300;}
      .done-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background:#111111;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;transition:background 0.15s;}
      .done-btn:hover{background:#333333;}
      .done-link{display:block;margin-top:14px;font-size:12px;color:#cccccc;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;}
      .done-link:hover{color:#888888;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/" className="nav-logo"><div className="logo-mark">A</div><span className="logo-text">Alchemy <em>OS</em></span></a>
        <div className="nav-links">
          <a href="/clients" className="nav-link">CRM</a>
          <a href="/campaign-builder" className="nav-link">Builder</a>
          <a href="/auto-brief" className="nav-link">Full Brief</a>
        </div>
      </nav>

      {(phase==='input'||phase==='error')&&(
        <div className="container">
          <p className="eyebrow">Sample Brief Machine</p>
          <h1 className="title"><strong>2 briefs.</strong> One click.</h1>
          <p className="sub">Paste a product URL. We scrape the page, extract images, and build two complete campaign concepts with scripts and storyboards.</p>
          <div className="pill-meta">1K quality · <span>~$1.10 per run</span> · ~2–3 min</div>

          {error&&<div className="error-bar">⚠ {error}</div>}

          <div className="section">
            <label className="label">Product Page URL</label>
            <div className="url-wrap">
              <input className="input" type="url" style={{paddingRight:90}} placeholder="https://brand.com/products/item"
                value={productPageUrl} onChange={e=>{setProductPageUrl(e.target.value);setExtractedImages([]);setSelectedImageUrl(null)}}/>
              {productPageUrl&&<div className="url-badge">
                {extracting?<><div className="url-spinner"/><span style={{fontSize:10,color:'#cccccc'}}>Scanning</span></>:extractedImages.length>0?<span className="url-ok">✓ {extractedImages.length} images</span>:null}
              </div>}
            </div>
            <p className="input-hint">We scrape this page for product details, brand voice, and images</p>
          </div>

          <div className="section">
            <label className="label">Product Image<em>auto-extracted · select or upload</em></label>
            <div className="card">
              {(extractedImages.length>0||extracting)&&(<>
                <div className="card-header">
                  <span className="card-label">From page</span>
                  {extractedImages.length>0&&<span className="card-count">{extractedImages.length} found</span>}
                </div>
                <div className="img-grid">
                  {extractedImages.map((url,i)=>(
                    <div key={i} className={`img-item ${selectedImageUrl===url&&!uploadedImageDataUrl?'selected':''}`} onClick={()=>{setSelectedImageUrl(url);setUploadedImageDataUrl(null)}}>
                      <img src={url} alt="" onError={e=>e.target.parentElement.style.display='none'}/>
                      {selectedImageUrl===url&&!uploadedImageDataUrl&&<div className="img-check">✓</div>}
                    </div>
                  ))}
                  {extracting&&!extractedImages.length&&Array(4).fill(null).map((_,i)=><div key={i} className="img-shimmer"/>)}
                </div>
                <div className="divider"/>
              </>)}
              <div className="upload-row" onClick={()=>productInputRef.current?.click()}>
                {uploadedImageDataUrl?<img src={uploadedImageDataUrl} alt="" className="upload-preview"/>:<div className="upload-box">📦</div>}
                <span className="upload-text">{uploadedImageDataUrl?'Custom image uploaded':extractedImages.length>0?'Or upload your own':'Upload a product image'}</span>
                <button className="upload-btn" onClick={e=>{e.stopPropagation();productInputRef.current?.click()}}>{uploadedImageDataUrl?'Change':'Upload'}</button>
              </div>
            </div>
            <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload}/>
            {effectiveProductImage&&(
              <div className="selected-row">
                <img src={effectiveProductImage} alt=""/>
                <span className="selected-row-text">{uploadedImageDataUrl?'Custom upload':'Page image'} · used in all scenes</span>
                <button className="clear-btn" onClick={()=>{setSelectedImageUrl(null);setUploadedImageDataUrl(null)}}>✕</button>
              </div>
            )}
          </div>

          <div className="section">
            <label className="label">Offer or Context<em>optional</em></label>
            <textarea className="textarea" placeholder="Specific offer, launch angle, or campaign context..." value={offerNotes} onChange={e=>setOfferNotes(e.target.value)}/>
          </div>

          <div className="section">
            <label className="label">Creative Keywords<em>optional</em></label>
            <input className="input" placeholder="cinematic, intimate, transformation, ritual..." value={creativeKeywords} onChange={e=>setCreativeKeywords(e.target.value)}/>
          </div>

          <div className="section">
            <label className="label">Format</label>
            <div className="format-row">
              <button className={`format-btn ${aspectRatio==='16:9'?'active':''}`} onClick={()=>setAspectRatio('16:9')}>⬛ 16:9 Landscape</button>
              <button className={`format-btn ${aspectRatio==='9:16'?'active':''}`} onClick={()=>setAspectRatio('9:16')}>▮ 9:16 Vertical</button>
            </div>
          </div>

          {clients.length>0&&(
            <div className="section">
              <div className="client-wrap">
                <p className="client-label">Link to client <span style={{color:'#dddddd',textTransform:'none',letterSpacing:0,fontWeight:300}}>· optional</span></p>
                <div className="pills">
                  <button className={`pill ${!selectedClientId?'active':''}`} onClick={()=>setSelectedClientId(null)}>No client</button>
                  {clients.map(c=><button key={c.id} className={`pill ${selectedClientId===c.id?'active':''}`} onClick={()=>setSelectedClientId(c.id)}>{c.name}</button>)}
                </div>
              </div>
            </div>
          )}

          <button className="gen-btn" disabled={!productPageUrl} onClick={handleGenerate}>
            ⚡ Generate 2 Sample Briefs
            <span className="gen-btn-meta">~$1.10 · 1K · ~2–3 min</span>
          </button>
        </div>
      )}

      {phase==='analyzing'&&(
        <div className="gen-container">
          <div className="gen-spinner"/>
          <h2 className="gen-title">Analyzing product page</h2>
          <p className="gen-sub">Extracting brand intelligence and images</p>
        </div>
      )}

      {phase==='generating'&&(
        <div className="gen-container">
          <div className="gen-spinner"/>
          <h2 className="gen-title">Building your briefs</h2>
          <p className="gen-sub">{overallMessage}</p>
          <div className="progress-track"><div className="progress-fill" style={{width:`${(completedCount/2)*100}%`}}/></div>
          <p className="progress-label">{completedCount} of 2 complete</p>
          <div className="concept-cards">
            {conceptProgress.map((cp,i)=>(
              <div key={i} className={`cc ${cp.status}`}>
                {cp.status==='building'&&<div className="cc-sweep"/>}
                <p className="cc-num">Concept {i+1}</p>
                <p className="cc-title">{cp.title||'—'}</p>
                <p style={{fontSize:11,color:cp.status==='error'?'#dc2626':cp.status==='done'?'#111111':'#aaaaaa',animation:cp.status==='building'?'pulse 1.5s infinite':'none'}}>
                  {cp.status==='waiting'&&'○ Waiting'}{cp.status==='building'&&'● Generating...'}{cp.status==='done'&&'✓ Complete'}{cp.status==='error'&&'✕ Error'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase==='done'&&(
        <div className="done-container">
          <div className="done-icon">🎬</div>
          <h2 className="done-title"><strong>{completedCount}</strong> {completedCount===1?'brief':'briefs'} ready.</h2>
          <p className="done-sub">Campaigns built and saved. Share the brief with your prospect.</p>
          {slugForUrl?<a href={`/${slugForUrl}/briefs`} className="done-btn">Open Brief ↗</a>:doneClientId?<a href={`/brief/${doneClientId}`} className="done-btn">Open Brief ↗</a>:<p style={{color:'#aaaaaa',fontSize:13}}>Find your briefs in the CRM.</p>}
          <button className="done-link" onClick={()=>{setPhase('input');setDoneClientId(null);setDoneSlug(null);setConceptProgress([{status:'waiting',title:'',message:''},{status:'waiting',title:'',message:''}]);setAnalysis(null)}}>Generate another →</button>
        </div>
      )}
    </div>
  </>)
}
