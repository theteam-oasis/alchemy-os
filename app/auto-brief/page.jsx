'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
function fileToDataUrl(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f)})}
function slugify(n){return(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

export default function AutoBriefPage() {
  const [phase, setPhase] = useState('input') // input | running | done | error
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [productPageUrl, setProductPageUrl] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [productImageUrl, setProductImageUrl] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [extractedImages, setExtractedImages] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [imageSource, setImageSource] = useState('none') // 'client' | 'scraped' | 'none'

  const [progress, setProgress] = useState([])
  const [conceptStatus, setConceptStatus] = useState([
    {status:'waiting',title:''},
    {status:'waiting',title:''},
    {status:'waiting',title:''},
    {status:'waiting',title:''},
  ])
  const [analysis, setAnalysis] = useState(null)
  const [doneClientSlug, setDoneClientSlug] = useState(null)
  const [error, setError] = useState(null)
  const productInputRef = useRef(null)

  useEffect(()=>{
    getSupabase().from('clients').select('id,name').order('name').then(({data})=>{
      if(!data)return
      // Deduplicate by name — keep first occurrence (alphabetically sorted)
      const seen=new Set()
      const deduped=data.filter(c=>{
        const key=c.name?.trim().toLowerCase()
        if(seen.has(key))return false
        seen.add(key)
        return true
      })
      setClients(deduped)
    })
  },[])

  useEffect(()=>{
    if(!selectedClientId)return
    // Reset image state when client changes
    setExtractedImages([])
    setSelectedImageUrl(null)
    setUploadedImage(null)
    getSupabase().from('brand_intake').select('website, product_image_urls').eq('client_id',selectedClientId).maybeSingle()
      .then(({data})=>{
        if(!data)return
        // Priority 1: client uploaded images from brand_intake
        if(data.product_image_urls?.length){
          setExtractedImages(data.product_image_urls)
          setSelectedImageUrl(data.product_image_urls[0])
          setImageSource('client')
        }
        // Priority 2: website URL for scraping (only if no uploaded images)
        if(data.website&&!productPageUrl){
          setProductPageUrl(data.website)
        }
      })
  },[selectedClientId])

  useEffect(()=>{
    if(!productPageUrl||!productPageUrl.startsWith('http'))return
    const t=setTimeout(()=>extractImages(productPageUrl),1500)
    return()=>clearTimeout(t)
  },[productPageUrl])

  async function extractImages(url){
    setExtracting(true);setExtractedImages([]);setSelectedImageUrl(null)
    try{
      const res=await fetch('/api/campaign/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productPageUrl:url,extractImagesOnly:true})})
      const j=await res.json()
      if(j.productImages?.length){setExtractedImages(j.productImages);setSelectedImageUrl(j.productImages[0]);setImageSource('scraped')}
    }catch{}
    setExtracting(false)
  }

  async function handleUpload(e){const f=e.target.files?.[0];if(!f)return;const d=await fileToDataUrl(f);setUploadedImage(d);setSelectedImageUrl(null)}
  const effectiveImage = uploadedImage || selectedImageUrl

  async function handleGenerate(){
    if(!productPageUrl||!selectedClientId){setError('Select a client and enter a product URL.');return}
    setPhase('running');setError(null);setProgress([])
    setConceptStatus([{status:'waiting',title:''},{status:'waiting',title:''},{status:'waiting',title:''},{status:'waiting',title:''}])

    const clientName = clients.find(c=>c.id===selectedClientId)?.name||'Client'

    try{
      const res = await fetch('/api/campaign/auto-generate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          clientId:selectedClientId,
          clientName,
          productPageUrl,
          offerNotes,
          creativeKeywords,
          aspectRatio,
          productImageUrl: selectedImageUrl||null,
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while(true){
        const {done,value} = await reader.read()
        if(done)break
        buffer += decoder.decode(value, {stream:true})
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for(const line of lines){
          if(line.startsWith('data:')){
            try{
              const data = JSON.parse(line.slice(5))
              const eventLine = lines.find(l=>l.startsWith('event:'))
              const event = eventLine?.slice(7)?.trim()

              if(event==='progress'){
                setProgress(p=>[...p.slice(-4),{message:data.message,conceptIdx:data.conceptIdx}])
                if(data.conceptIdx!==undefined){
                  setConceptStatus(prev=>{const u=[...prev];if(u[data.conceptIdx])u[data.conceptIdx]={...u[data.conceptIdx],status:'building'};return u})
                }
              }
              if(event==='concepts_complete'){
                // Set concept titles
                setConceptStatus(prev=>data.concepts.map((c,i)=>({status:prev[i]?.status||'waiting',title:c.title})))
              }
              if(event==='concept_complete'){
                setConceptStatus(prev=>{const u=[...prev];u[data.conceptIdx]={...u[data.conceptIdx],status:'done',title:data.conceptTitle};return u})
              }
              if(event==='concept_error'){
                setConceptStatus(prev=>{const u=[...prev];u[data.conceptIdx]={...u[data.conceptIdx],status:'error'};return u})
              }
              if(event==='analysis_complete'){
                setAnalysis(data.analysis)
              }
              if(event==='complete'){
                const slug = slugify(clientName)
                setDoneClientSlug(slug)
                setPhase('done')
              }
              if(event==='error'){
                setError(data.message);setPhase('error')
              }
            }catch{}
          }
        }
      }
    }catch(e){setError(e.message);setPhase('error')}
  }

  const completedCount = conceptStatus.filter(c=>c.status==='done').length

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      .shell{min-height:100vh;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:white;border-bottom:1px solid #eeeeee;position:sticky;top:0;z-index:100;}
      .nl{display:flex;align-items:center;gap:9px;text-decoration:none;}
      .lm{width:26px;height:26px;background:#111111;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
      .lt{font-size:13px;font-weight:500;color:#111111;}
      .lt em{color:#aaaaaa;font-style:normal;font-weight:300;}
      .navlinks{display:flex;gap:2px;}
      .navlink{font-size:12px;font-weight:500;color:#aaaaaa;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all 0.15s;}
      .navlink:hover{color:#111111;background:#f5f5f5;}
      .navlink.a{color:#111111;background:#f0f0f0;font-weight:600;}

      /* Input */
      .container{max-width:600px;margin:0 auto;padding:52px 24px 80px;animation:fadeUp 0.3s ease;}
      .eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:12px;}
      .title{font-size:34px;font-weight:300;letter-spacing:-0.02em;line-height:1.1;color:#111111;margin-bottom:10px;}
      .title strong{font-weight:600;}
      .sub{font-size:14px;color:#888888;line-height:1.65;margin-bottom:14px;font-weight:300;}
      .cost-pill{display:inline-flex;align-items:center;gap:8px;background:#f5f5f5;border:1px solid #eeeeee;border-radius:100px;padding:4px 12px;font-size:11px;color:#aaaaaa;margin-bottom:40px;}
      .cost-pill span{color:#111111;font-weight:500;}
      .section{margin-bottom:18px;}
      .label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#aaaaaa;display:block;margin-bottom:7px;}
      .label em{font-size:10px;color:#cccccc;text-transform:none;letter-spacing:0;font-weight:400;margin-left:6px;font-style:normal;}
      .input{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:11px 14px;outline:none;width:100%;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
      .input::placeholder{color:#cccccc;}
      .input:focus{border-color:#111111;}
      .textarea{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:11px 14px;outline:none;width:100%;resize:vertical;min-height:72px;line-height:1.6;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
      .textarea::placeholder{color:#cccccc;}
      .textarea:focus{border-color:#111111;}
      .hint{font-size:11px;color:#cccccc;margin-top:5px;}
      .url-wrap{position:relative;}
      .url-badge{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;display:flex;align-items:center;gap:5px;}
      .url-spin{width:11px;height:11px;border:1.5px solid #eeeeee;border-top-color:#111111;border-radius:50%;animation:spin 0.7s linear infinite;}
      .url-ok{color:#111111;font-weight:600;}

      /* Client selector */
      .client-select{display:flex;flex-direction:column;gap:6px;}
      .client-option{display:flex;align-items:center;gap:12px;padding:12px 16px;background:white;border:1px solid #e5e5e5;border-radius:8px;cursor:pointer;transition:all 0.15s;}
      .client-option:hover{border-color:#111111;}
      .client-option.selected{border-color:#111111;background:#f8f8f8;}
      .client-radio{width:16px;height:16px;border-radius:50%;border:1.5px solid #cccccc;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
      .client-option.selected .client-radio{border-color:#111111;background:#111111;}
      .client-radio-dot{width:6px;height:6px;border-radius:50%;background:white;}
      .client-name-text{font-size:13px;font-weight:500;color:#111111;}

      /* Image picker */
      .card{background:white;border:1px solid #eeeeee;border-radius:10px;padding:16px;}
      .card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
      .card-lbl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;}
      .card-cnt{font-size:10px;color:#111111;font-weight:500;}
      .img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;margin-bottom:12px;}
      .img-item{border-radius:6px;overflow:hidden;border:1.5px solid #eeeeee;cursor:pointer;transition:all 0.15s;aspect-ratio:1;background:#f8f8f8;position:relative;}
      .img-item:hover{border-color:#111111;}
      .img-item.sel{border-color:#111111;border-width:2px;}
      .img-item img{width:100%;height:100%;object-fit:cover;display:block;}
      .img-check{position:absolute;top:3px;right:3px;width:16px;height:16px;background:#111111;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;}
      .img-shimmer{aspect-ratio:1;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.8s ease-in-out infinite;border-radius:6px;}
      .div{height:1px;background:#eeeeee;margin:12px 0;}
      .upload-row{display:flex;align-items:center;gap:12px;cursor:pointer;}
      .upload-box{width:40px;height:40px;border-radius:6px;background:#f5f5f5;border:1px dashed #dddddd;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
      .upload-prev{width:40px;height:40px;border-radius:6px;object-fit:contain;background:#f5f5f5;border:1px solid #eeeeee;}
      .upload-text{flex:1;font-size:12px;color:#aaaaaa;}
      .upload-btn{font-size:11px;color:#111111;border:1px solid #dddddd;border-radius:6px;padding:4px 10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;}
      .upload-btn:hover{background:#f5f5f5;}
      .sel-row{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f8f8f8;border:1px solid #eeeeee;border-radius:8px;margin-top:8px;}
      .sel-row img{width:32px;height:32px;border-radius:5px;object-fit:cover;}
      .sel-row-text{flex:1;font-size:11px;color:#aaaaaa;}
      .clear{background:none;border:none;color:#cccccc;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif;}

      /* Format */
      .format-row{display:flex;gap:8px;}
      .fmt-btn{flex:1;padding:10px;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#aaaaaa;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:7px;}
      .fmt-btn:hover{border-color:#111111;color:#111111;}
      .fmt-btn.a{border-color:#111111;color:#111111;background:#f8f8f8;font-weight:600;}

      .error-bar{background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;font-size:13px;color:#dc2626;margin-bottom:20px;}

      .gen-btn{width:100%;padding:14px;background:#111111;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:28px;letter-spacing:-0.01em;}
      .gen-btn:hover{background:#333333;}
      .gen-btn:disabled{opacity:0.25;cursor:not-allowed;}
      .gen-btn-meta{font-size:11px;opacity:0.5;font-weight:400;}

      /* Running state */
      .run-container{max-width:580px;margin:0 auto;padding:52px 24px 80px;animation:fadeUp 0.3s ease;}
      .run-header{margin-bottom:36px;}
      .run-title{font-size:26px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:6px;}
      .run-sub{font-size:13px;color:#aaaaaa;font-weight:300;}
      .run-brand{font-weight:500;color:#111111;}

      .progress-log{background:#f8f8f8;border-radius:8px;padding:14px 16px;margin-bottom:28px;min-height:56px;}
      .progress-line{font-size:12px;color:#888888;line-height:1.8;font-family:'DM Mono',monospace;}
      .progress-line.latest{color:#111111;font-weight:500;}

      .concepts-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .cc{background:white;border:1px solid #eeeeee;border-radius:10px;padding:16px;position:relative;overflow:hidden;transition:border-color 0.2s;}
      .cc.building{border-color:#111111;}
      .cc.done{border-color:#111111;background:#fafafa;}
      .cc.error{border-color:#fecaca;}
      .cc-sweep{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.015),transparent);background-size:200%;animation:shimmer 2.5s ease-in-out infinite;}
      .cc-num{font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#cccccc;margin-bottom:5px;}
      .cc-title{font-size:13px;font-weight:500;color:#111111;margin-bottom:4px;min-height:18px;line-height:1.4;}
      .cc-status{font-size:11px;}

      .overall-progress{margin-top:24px;}
      .op-track{background:#f0f0f0;border-radius:100px;height:2px;margin-bottom:8px;overflow:hidden;}
      .op-fill{height:100%;background:#111111;border-radius:100px;transition:width 0.5s ease;}
      .op-label{font-size:10px;color:#cccccc;font-family:'DM Mono',monospace;}

      /* Done */
      .done-container{max-width:480px;margin:100px auto;padding:0 24px;text-align:center;animation:fadeUp 0.4s ease;}
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
        <a href="/" className="nl"><div className="lm">A</div><span className="lt">Alchemy <em>OS</em></span></a>
        <div className="navlinks">
          <a href="/clients" className="navlink">CRM</a>
          <a href="/sample-brief" className="navlink">Sample Brief</a>
          <a href="/auto-brief" className="navlink a">Full Brief</a>
        </div>
      </nav>

      {/* INPUT */}
      {(phase==='input'||phase==='error')&&(
        <div className="container">
          <p className="eyebrow">Full Brief</p>
          <h1 className="title"><strong>4 concepts.</strong> Full production.</h1>
          <p className="sub">Deep brand analysis, 4 complete campaign concepts, 8 scenes each at 2K quality. Everything a client needs to make a decision.</p>
          <div className="cost-pill">2K quality · <span>~$4.30 per run</span> · ~8–12 min</div>

          {error&&<div className="error-bar">⚠ {error}</div>}

          {/* Client selector — required */}
          <div className="section">
            <label className="label">Client <em>required</em></label>
            {clients.length===0?(
              <p style={{fontSize:13,color:'#aaaaaa'}}>No clients found. <a href="/clients" style={{color:'#111111'}}>Add one in the CRM →</a></p>
            ):(
              <>
                <input
                  className="input"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={e=>setClientSearch(e.target.value)}
                  style={{marginBottom:8}}
                />
                <div className="client-select" style={{maxHeight:280,overflowY:'auto'}}>
                  {clients
                    .filter(c=>c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                    .map(c=>(
                      <div key={c.id} className={`client-option ${selectedClientId===c.id?'selected':''}`} onClick={()=>setSelectedClientId(c.id)}>
                        <div className="client-radio">
                          {selectedClientId===c.id&&<div className="client-radio-dot"/>}
                        </div>
                        <span className="client-name-text">{c.name}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>

          {/* URL */}
          <div className="section">
            <label className="label">Product Page URL</label>
            <div className="url-wrap">
              <input className="input" type="url" style={{paddingRight:90}} placeholder="https://brand.com/products/item"
                value={productPageUrl} onChange={e=>{setProductPageUrl(e.target.value);setExtractedImages([]);setSelectedImageUrl(null)}}/>
              {productPageUrl&&<div className="url-badge">
                {extracting?<><div className="url-spin"/><span style={{fontSize:10,color:'#cccccc'}}>Scanning</span></>:extractedImages.length>0?<span className="url-ok">✓ {extractedImages.length} images</span>:null}
              </div>}
            </div>
            <p className="hint">We do a deep scrape of this page for brand intelligence</p>
          </div>

          {/* Product image */}
          <div className="section">
            <label className="label">Product Image<em>auto-extracted or upload</em></label>
            <div className="card">
              {(extractedImages.length>0||extracting)&&(<>
                <div className="card-hdr">
                  <span className="card-lbl">{imageSource==='client'?'Client images':'From page'}</span>
                  {extractedImages.length>0&&<span className="card-cnt">{extractedImages.length} found</span>}
                </div>
                <div className="img-grid">
                  {extractedImages.map((url,i)=>(
                    <div key={i} className={`img-item ${selectedImageUrl===url&&!uploadedImage?'sel':''}`} onClick={()=>{setSelectedImageUrl(url);setUploadedImage(null)}}>
                      <img src={url} alt="" onError={e=>e.target.parentElement.style.display='none'}/>
                      {selectedImageUrl===url&&!uploadedImage&&<div className="img-check">✓</div>}
                    </div>
                  ))}
                  {extracting&&!extractedImages.length&&Array(4).fill(null).map((_,i)=><div key={i} className="img-shimmer"/>)}
                </div>
                <div className="div"/>
              </>)}
              <div className="upload-row" onClick={()=>productInputRef.current?.click()}>
                {uploadedImage?<img src={uploadedImage} alt="" className="upload-prev"/>:<div className="upload-box">📦</div>}
                <span className="upload-text">{uploadedImage?'Custom image uploaded':extractedImages.length>0?'Or upload your own':'Upload a product image'}</span>
                <button className="upload-btn" onClick={e=>{e.stopPropagation();productInputRef.current?.click()}}>{uploadedImage?'Change':'Upload'}</button>
              </div>
            </div>
            <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload}/>
            {effectiveImage&&(
              <div className="sel-row">
                <img src={effectiveImage} alt=""/>
                <span className="sel-row-text">{uploadedImage?'Custom upload':'Page image'} · appears in scenes</span>
                <button className="clear" onClick={()=>{setSelectedImageUrl(null);setUploadedImage(null)}}>✕</button>
              </div>
            )}
          </div>

          {/* Offer notes */}
          <div className="section">
            <label className="label">Campaign Context<em>optional</em></label>
            <textarea className="textarea" placeholder="Specific offer, launch, angles to explore, anything the creative team should know..." value={offerNotes} onChange={e=>setOfferNotes(e.target.value)}/>
          </div>

          {/* Keywords */}
          <div className="section">
            <label className="label">Creative Direction<em>optional</em></label>
            <input className="input" placeholder="e.g. documentary, emotional, humour, cinematic, product-focused..." value={creativeKeywords} onChange={e=>setCreativeKeywords(e.target.value)}/>
          </div>

          {/* Format */}
          <div className="section">
            <label className="label">Format</label>
            <div className="format-row">
              <button className={`fmt-btn ${aspectRatio==='16:9'?'a':''}`} onClick={()=>setAspectRatio('16:9')}>⬛ 16:9 Landscape</button>
              <button className={`fmt-btn ${aspectRatio==='9:16'?'a':''}`} onClick={()=>setAspectRatio('9:16')}>▮ 9:16 Vertical</button>
            </div>
          </div>

          <button className="gen-btn" disabled={!productPageUrl||!selectedClientId} onClick={handleGenerate}>
            ⚡ Generate Full Brief
            <span className="gen-btn-meta">4 concepts · 2K · ~8–12 min</span>
          </button>
        </div>
      )}

      {/* RUNNING */}
      {phase==='running'&&(
        <div className="run-container">
          <div className="run-header">
            <h1 className="run-title">Building your brief</h1>
            {analysis&&<p className="run-sub">Analyzing <span className="run-brand">{analysis.brandName}</span> — generating 4 Super Bowl-caliber concepts</p>}
          </div>

          <div className="progress-log">
            {progress.slice(-3).map((p,i)=>(
              <p key={i} className={`progress-line ${i===Math.min(progress.length,3)-1?'latest':''}`}>→ {p.message}</p>
            ))}
            {progress.length===0&&<p className="progress-line">→ Starting up...</p>}
          </div>

          <div className="concepts-grid">
            {conceptStatus.map((cs,i)=>(
              <div key={i} className={`cc ${cs.status}`}>
                {cs.status==='building'&&<div className="cc-sweep"/>}
                <p className="cc-num">Concept {i+1}</p>
                <p className="cc-title">{cs.title||'—'}</p>
                <p className="cc-status" style={{color:cs.status==='error'?'#dc2626':cs.status==='done'?'#111111':'#aaaaaa',animation:cs.status==='building'?'pulse 1.5s infinite':'none'}}>
                  {cs.status==='waiting'&&'○ Waiting'}
                  {cs.status==='building'&&'● Building...'}
                  {cs.status==='done'&&'✓ Complete'}
                  {cs.status==='error'&&'✕ Error'}
                </p>
              </div>
            ))}
          </div>

          <div className="overall-progress">
            <div className="op-track"><div className="op-fill" style={{width:`${(completedCount/4)*100}%`}}/></div>
            <p className="op-label">{completedCount} of 4 concepts complete · this takes 8–12 minutes</p>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase==='done'&&(
        <div className="done-container">
          <div className="done-icon">🎬</div>
          <h2 style={{fontSize:26,fontWeight:300,letterSpacing:'-0.02em',color:'#111111',marginBottom:8}}><strong>{completedCount}</strong> concepts ready.</h2>
          <p style={{fontSize:14,color:'#aaaaaa',lineHeight:1.6,marginBottom:28,fontWeight:300}}>Full brief complete. Open the client brief link to review all concepts.</p>
          {doneClientSlug&&<a href={`/${doneClientSlug}/briefs`} className="done-btn">Open Client Brief ↗</a>}
          <button className="done-link" onClick={()=>{setPhase('input');setDoneClientSlug(null);setConceptStatus([{status:'waiting',title:''},{status:'waiting',title:''},{status:'waiting',title:''},{status:'waiting',title:''}]);setProgress([]);setAnalysis(null)}}>Generate another →</button>
        </div>
      )}
    </div>
  </>)
}
