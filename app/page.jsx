'use client'
import { useState, useRef } from 'react'

function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

function downloadImage(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.click()
}

// Upload a dataUrl to Supabase storage via a small API endpoint
async function uploadAsset(dataUrl, name) {
  try {
    const res = await fetch('/api/storyboard/upload-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, name }),
    })
    const j = await res.json()
    return j.url || null
  } catch { return null }
}

export default function StoryboardBuilder() {
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const sessionId = useRef(`sb-${Date.now()}`)

  // Assets
  const [productImage, setProductImage] = useState(null) // dataUrl (display only)
  const [productUrl, setProductUrl] = useState(null) // storage URL

  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarImage, setAvatarImage] = useState(null) // dataUrl (display)
  const [avatarUrl, setAvatarUrl] = useState(null) // storage URL
  const [avatarLocked, setAvatarLocked] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [envPrompt, setEnvPrompt] = useState('')
  const [envImage, setEnvImage] = useState(null) // dataUrl (display)
  const [envUrl, setEnvUrl] = useState(null) // storage URL
  const [envLocked, setEnvLocked] = useState(false)
  const [envLoading, setEnvLoading] = useState(false)
  const [envUploading, setEnvUploading] = useState(false)

  // Script + scenes
  const [script, setScript] = useState('')
  const [scenes, setScenes] = useState([])
  const [scenesLoading, setScenesLoading] = useState(false)

  // Per-scene state
  const [sceneImages, setSceneImages] = useState({})

  const productRef = useRef(null)

  async function handleProductUpload(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const dataUrl = await fileToDataUrl(f)
    setProductImage(dataUrl)
    setProductUrl(null)
    // Upload immediately
    const url = await uploadAsset(dataUrl, `${sessionId.current}/product`)
    setProductUrl(url || dataUrl) // fallback to dataUrl if upload fails
  }

  async function generateAsset(type) {
    const prompt = type === 'avatar' ? avatarPrompt : envPrompt
    if (!prompt.trim()) return
    if (type === 'avatar') { setAvatarLoading(true); setAvatarLocked(false); setAvatarUrl(null) }
    else { setEnvLoading(true); setEnvLocked(false); setEnvUrl(null) }
    try {
      const res = await fetch('/api/storyboard/generate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, aspectRatio }),
      })
      const j = await res.json()
      if (j.imageUrl) {
        if (type === 'avatar') setAvatarImage(j.imageUrl)
        else setEnvImage(j.imageUrl)
      }
    } catch (e) { console.error(e) }
    if (type === 'avatar') setAvatarLoading(false)
    else setEnvLoading(false)
  }

  function lockAsset(type) {
    if (type === 'avatar') {
      if (!avatarImage) return
      setAvatarLocked(true)
      setAvatarUrl(avatarImage)
    } else {
      if (!envImage) return
      setEnvLocked(true)
      setEnvUrl(envImage)
    }
  }

  async function handlePlanScenes() {
    if (!script.trim()) return
    setScenesLoading(true)
    setScenes([])
    setSceneImages({})
    try {
      const res = await fetch('/api/storyboard/plan-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          hasProduct: !!productUrl,
          hasAvatar: avatarLocked && !!avatarUrl,
          hasEnv: envLocked && !!envUrl,
          aspectRatio,
          avatarDescription: avatarPrompt || '',
          envDescription: envPrompt || '',
        }),
      })
      const j = await res.json()
      if (j.scenes) setScenes(j.scenes)
    } catch (e) { console.error(e) }
    setScenesLoading(false)
  }

  async function generateScene(idx, redo = false) {
    const scene = scenes[idx]
    if (!scene) return
    setSceneImages(prev => ({ ...prev, [idx]: { ...prev[idx], loading: true, options: redo ? [] : prev[idx]?.options || [] } }))
    try {
      const res = await fetch('/api/storyboard/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          sceneIndex: idx,
          aspectRatio,
          sessionId: sessionId.current,
          productImage: scene.usesProduct && productUrl ? productUrl : null,
          avatarImage: avatarLocked && avatarUrl ? avatarUrl : null,
          envImage: envLocked && envUrl ? envUrl : null,
          avatarDescription: avatarPrompt || '',
          envDescription: envPrompt || '',
        }),
      })
      const j = await res.json()
      if (j.options) {
        setSceneImages(prev => ({ ...prev, [idx]: { options: j.options, selected: null, loading: false } }))
      } else {
        setSceneImages(prev => ({ ...prev, [idx]: { ...prev[idx], loading: false, error: j.error } }))
      }
    } catch (e) {
      console.error(e)
      setSceneImages(prev => ({ ...prev, [idx]: { ...prev[idx], loading: false } }))
    }
  }

  const isPortrait = aspectRatio === '9:16'

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      .shell{min-height:100vh;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:white;border-bottom:1px solid #eeeeee;position:sticky;top:0;z-index:100;}
      .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none;}
      .logo-mark{width:26px;height:26px;background:#111111;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
      .logo-text{font-size:13px;font-weight:500;color:#111111;}
      .logo-text em{color:#aaaaaa;font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:2px;}
      .nav-link{font-size:12px;font-weight:500;color:#aaaaaa;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all 0.15s;}
      .nav-link:hover{color:#111111;background:#f5f5f5;}
      .nav-link.active{color:#111111;background:#f0f0f0;font-weight:600;}
      .main{max-width:1100px;margin:0 auto;padding:40px 40px 80px;animation:fadeUp 0.3s ease;}
      .page-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:10px;}
      .page-title{font-size:32px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:6px;}
      .page-title strong{font-weight:600;}
      .page-sub{font-size:14px;color:#888888;font-weight:300;line-height:1.6;margin-bottom:28px;}
      .format-row{display:flex;gap:8px;margin-bottom:32px;}
      .fmt-btn{padding:9px 18px;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#aaaaaa;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:6px;}
      .fmt-btn:hover{border-color:#111111;color:#111111;}
      .fmt-btn.active{border-color:#111111;color:#111111;background:#f8f8f8;font-weight:600;}
      .layout{display:grid;grid-template-columns:280px 1fr;gap:28px;align-items:start;}
      .sidebar{display:flex;flex-direction:column;gap:16px;}
      .asset-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;}
      .asset-card.locked{border-color:#111111;}
      .asset-header{padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;}
      .asset-title{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#111111;}
      .locked-badge{font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:white;background:#111111;padding:2px 7px;border-radius:4px;}
      .asset-body{padding:14px 16px;}
      .asset-img{width:100%;border-radius:8px;object-fit:cover;display:block;border:1px solid #eeeeee;margin-bottom:10px;}
      .asset-img.portrait{aspect-ratio:3/4;}
      .asset-img.landscape{aspect-ratio:16/9;}
      .asset-placeholder{width:100%;background:#f8f8f8;border:1px dashed #dddddd;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#cccccc;font-size:12px;margin-bottom:10px;}
      .asset-placeholder.portrait{aspect-ratio:3/4;}
      .asset-placeholder.landscape{aspect-ratio:16/9;}
      .asset-input{background:white;border:1px solid #e5e5e5;border-radius:7px;color:#111111;font-size:13px;padding:9px 12px;outline:none;width:100%;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;resize:none;line-height:1.5;margin-bottom:8px;}
      .asset-input::placeholder{color:#cccccc;}
      .asset-input:focus{border-color:#111111;}
      .asset-actions{display:flex;gap:6px;}
      .btn-gen{flex:1;padding:9px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:5px;}
      .btn-gen:hover{background:#333333;}
      .btn-gen:disabled{opacity:0.3;cursor:not-allowed;}
      .btn-lock{padding:9px 12px;background:white;color:#111111;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:4px;}
      .btn-lock:hover{border-color:#111111;}
      .btn-unlock{width:100%;margin-top:8px;padding:8px;background:white;color:#888888;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;}
      .btn-unlock:hover{border-color:#111111;color:#111111;}
      .upload-area{border:1px dashed #dddddd;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:all 0.15s;background:#fafafa;margin-bottom:0;}
      .upload-area:hover{border-color:#111111;background:#f5f5f5;}
      .upload-label{font-size:12px;color:#aaaaaa;margin-top:6px;}
      .spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;}
      .spinner-dark{width:13px;height:13px;border:2px solid #eeeeee;border-top-color:#111111;border-radius:50%;animation:spin 0.7s linear infinite;}
      .content{display:flex;flex-direction:column;gap:20px;}
      .section-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;}
      .section-head{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;}
      .section-title{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#111111;}
      .section-body{padding:16px 20px;}
      .script-textarea{width:100%;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:12px 14px;outline:none;resize:vertical;min-height:110px;line-height:1.7;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
      .script-textarea::placeholder{color:#cccccc;}
      .script-textarea:focus{border-color:#111111;}
      .script-meta{display:flex;align-items:center;justify-content:space-between;margin-top:10px;}
      .script-hint{font-size:11px;color:#cccccc;}
      .btn-plan{padding:10px 20px;background:#111111;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;gap:7px;}
      .btn-plan:hover{background:#333333;}
      .btn-plan:disabled{opacity:0.3;cursor:not-allowed;}
      .scenes-list{display:flex;flex-direction:column;gap:10px;}
      .scene-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;transition:border-color 0.15s;}
      .scene-head{padding:14px 18px;display:flex;align-items:flex-start;gap:14px;}
      .scene-num{width:28px;height:28px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:11px;color:#888888;flex-shrink:0;margin-top:2px;}
      .scene-info{flex:1;}
      .scene-line{font-size:14px;color:#111111;line-height:1.6;margin-bottom:4px;}
      .scene-prompt{font-size:11px;color:#aaaaaa;line-height:1.5;font-style:italic;margin-bottom:6px;}
      .scene-tags{display:flex;gap:5px;flex-wrap:wrap;}
      .tag{font-size:9px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:2px 7px;border-radius:4px;border:1px solid #dddddd;color:#888888;}
      .scene-gen-btn{padding:8px 16px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;display:flex;align-items:center;gap:6px;flex-shrink:0;transition:background 0.15s;}
      .scene-gen-btn:hover{background:#333333;}
      .scene-gen-btn:disabled{opacity:0.3;cursor:not-allowed;}
      .scene-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:32px;color:#aaaaaa;font-size:13px;border-top:1px solid #f5f5f5;}
      .scene-images{padding:14px 18px;border-top:1px solid #f5f5f5;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .scene-img-wrap{position:relative;border-radius:8px;overflow:hidden;border:2px solid #eeeeee;cursor:pointer;transition:all 0.15s;}
      .scene-img-wrap:hover{border-color:#888888;}
      .scene-img-wrap.selected{border-color:#111111;border-width:2.5px;}
      .scene-img-wrap img{width:100%;display:block;object-fit:cover;}
      .scene-img-wrap img.portrait{aspect-ratio:9/16;}
      .scene-img-wrap img.landscape{aspect-ratio:16/9;}
      .scene-img-overlay{position:absolute;bottom:0;left:0;right:0;padding:8px 10px;background:linear-gradient(transparent,rgba(0,0,0,0.55));display:flex;align-items:center;justify-content:space-between;}
      .img-label{font-size:10px;font-weight:600;color:white;letter-spacing:0.04em;}
      .img-check{width:18px;height:18px;border-radius:50%;background:#111111;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;}
      .scene-error{padding:12px 18px;border-top:1px solid #f5f5f5;font-size:12px;color:#dc2626;}
      .scene-actions{display:flex;gap:7px;padding:10px 18px;border-top:1px solid #f5f5f5;}
      .btn-redo{padding:8px 14px;background:white;color:#888888;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
      .btn-redo:hover{border-color:#111111;color:#111111;}
      .btn-download{padding:8px 16px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;}
      .btn-download:hover{background:#333333;}
      .btn-download:disabled{opacity:0.3;cursor:not-allowed;}
      .empty{text-align:center;padding:48px 0;color:#cccccc;font-size:14px;font-weight:300;}
      .lock-status{font-size:10px;color:#aaaaaa;margin-top:6px;text-align:center;}
    `}</style>

    <div className="shell">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="logo-mark">A</div>
          <span className="logo-text">Alchemy <em>OS</em></span>
        </a>
        <div className="nav-links">
          <a href="/clients" className="nav-link">CRM</a>
          <a href="/sample-brief" className="nav-link">Sample Brief</a>
          <a href="/auto-brief" className="nav-link">Full Brief</a>
          <a href="/storyboard-builder" className="nav-link active">Storyboard</a>
        </div>
      </nav>

      <div className="main">
        <p className="page-eyebrow">Storyboard Builder</p>
        <h1 className="page-title"><strong>Scene by scene.</strong> Your script.</h1>
        <p className="page-sub">Upload your product, generate and lock an avatar and environment, paste your script — then generate each scene individually with 2 options to choose from.</p>

        <div className="format-row">
          <button className={`fmt-btn ${aspectRatio==='9:16'?'active':''}`} onClick={()=>setAspectRatio('9:16')}>▮ 9:16 Vertical</button>
          <button className={`fmt-btn ${aspectRatio==='16:9'?'active':''}`} onClick={()=>setAspectRatio('16:9')}>⬛ 16:9 Landscape</button>
        </div>

        <div className="layout">
          {/* Sidebar */}
          <div className="sidebar">

            {/* Product */}
            <div className="asset-card">
              <div className="asset-header">
                <span className="asset-title">Product</span>
                {productUrl && <span style={{fontSize:9,color:'#111111',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>Ready</span>}
              </div>
              <div className="asset-body">
                <div className="upload-area" onClick={()=>productRef.current?.click()}>
                  {productImage
                    ? <img src={productImage} alt="Product" style={{width:'100%',maxHeight:130,objectFit:'contain',borderRadius:6}}/>
                    : <><div style={{fontSize:24,marginBottom:6}}>📦</div><p className="upload-label">Click to upload product image</p></>
                  }
                </div>
                {productImage && !productUrl && <p className="lock-status">Uploading...</p>}
                {productUrl && <p className="lock-status">✓ Uploaded — used in scenes</p>}
                {productImage && <button className="btn-unlock" onClick={()=>{setProductImage(null);setProductUrl(null)}}>Remove</button>}
                <input ref={productRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload}/>
              </div>
            </div>

            {/* Avatar */}
            <div className={`asset-card ${avatarLocked?'locked':''}`}>
              <div className="asset-header">
                <span className="asset-title">Avatar</span>
                {avatarLocked && <span className="locked-badge">Locked</span>}
              </div>
              <div className="asset-body">
                {avatarImage
                  ? <img src={avatarImage} alt="Avatar" className="asset-img portrait"/>
                  : <div className="asset-placeholder portrait"><span>No avatar yet</span></div>
                }
                {!avatarLocked && <>
                  <textarea className="asset-input" rows={2} placeholder="Describe your avatar character..." value={avatarPrompt} onChange={e=>setAvatarPrompt(e.target.value)}/>
                  <div className="asset-actions">
                    <button className="btn-gen" disabled={!avatarPrompt.trim()||avatarLoading} onClick={()=>generateAsset('avatar')}>
                      {avatarLoading ? <><div className="spinner"/>Generating...</> : '⚡ Generate'}
                    </button>
                    {avatarImage && (
                      <button className="btn-lock" onClick={()=>lockAsset('avatar')}>
                        Lock ✓
                      </button>
                    )}
                  </div>
                </>}
                {avatarLocked && <>
                  <p className="lock-status">✓ Locked</p>
                  <button className="btn-unlock" onClick={()=>{setAvatarLocked(false);setAvatarUrl(null)}}>Unlock to edit</button>
                </>}
              </div>
            </div>

            {/* Environment */}
            <div className={`asset-card ${envLocked?'locked':''}`}>
              <div className="asset-header">
                <span className="asset-title">Environment</span>
                {envLocked && <span className="locked-badge">Locked</span>}
              </div>
              <div className="asset-body">
                {envImage
                  ? <img src={envImage} alt="Environment" className={`asset-img ${isPortrait?'portrait':'landscape'}`}/>
                  : <div className={`asset-placeholder ${isPortrait?'portrait':'landscape'}`}><span>No environment yet</span></div>
                }
                {!envLocked && <>
                  <textarea className="asset-input" rows={2} placeholder="Describe the environment / setting..." value={envPrompt} onChange={e=>setEnvPrompt(e.target.value)} style={{marginTop:10}}/>
                  <div className="asset-actions">
                    <button className="btn-gen" disabled={!envPrompt.trim()||envLoading} onClick={()=>generateAsset('environment')}>
                      {envLoading ? <><div className="spinner"/>Generating...</> : '⚡ Generate'}
                    </button>
                    {envImage && (
                      <button className="btn-lock" onClick={()=>lockAsset('environment')}>
                        Lock ✓
                      </button>
                    )}
                  </div>
                </>}
                {envLocked && <>
                  <p className="lock-status">✓ Locked</p>
                  <button className="btn-unlock" onClick={()=>{setEnvLocked(false);setEnvUrl(null)}}>Unlock to edit</button>
                </>}
              </div>
            </div>

          </div>

          {/* Main */}
          <div className="content">

            {/* Script */}
            <div className="section-card">
              <div className="section-head">
                <span className="section-title">Script</span>
                {scenes.length>0 && <span style={{fontSize:11,color:'#aaaaaa'}}>{scenes.length} scenes</span>}
              </div>
              <div className="section-body">
                <textarea
                  className="script-textarea"
                  placeholder="Paste your voiceover script here. We'll divide it into scenes at 3–4 seconds each (max 15 scenes)..."
                  value={script}
                  onChange={e=>setScript(e.target.value)}
                />
                <div className="script-meta">
                  <span className="script-hint">
                    {script.trim() ? `~${Math.min(15,Math.ceil(script.split(' ').length/10))} scenes estimated` : 'Tip: 30s script ≈ 8–10 scenes'}
                  </span>
                  <button className="btn-plan" disabled={!script.trim()||scenesLoading} onClick={handlePlanScenes}>
                    {scenesLoading ? <><div className="spinner"/>Planning...</> : '→ Plan Scenes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Scenes */}
            {scenes.length > 0 ? (
              <div className="scenes-list">
                {scenes.map((scene, idx) => {
                  const si = sceneImages[idx]
                  return (
                    <div key={idx} className="scene-card">
                      <div className="scene-head">
                        <div className="scene-num">{idx+1}</div>
                        <div className="scene-info">
                          <p className="scene-line">"{scene.scriptLine}"</p>
                          <p className="scene-prompt">{scene.imagePrompt}</p>
                          <div className="scene-tags">
                            {scene.usesProduct && productUrl && <span className="tag">Product</span>}
                            {scene.usesAvatar && avatarLocked && <span className="tag">Avatar</span>}
                            {scene.usesEnv && envLocked && <span className="tag">Environment</span>}
                          </div>
                        </div>
                        <button
                          className="scene-gen-btn"
                          disabled={si?.loading}
                          onClick={()=>generateScene(idx, false)}
                        >
                          {si?.loading ? <><div className="spinner"/>...</> : si?.options?.length ? '↺ Redo' : '⚡ Generate'}
                        </button>
                      </div>

                      {si?.loading && (
                        <div className="scene-loading">
                          <div className="spinner-dark"/>
                          Generating 2 options at 2K...
                        </div>
                      )}

                      {si?.error && !si?.loading && (
                        <div className="scene-error">Error: {si.error}</div>
                      )}

                      {si?.options?.length > 0 && !si?.loading && (<>
                        <div className="scene-images">
                          {si.options.map((imgUrl, optIdx) => (
                            <div
                              key={optIdx}
                              className={`scene-img-wrap ${si.selected===optIdx?'selected':''}`}
                              onClick={()=>setSceneImages(prev=>({...prev,[idx]:{...prev[idx],selected:optIdx}}))}
                            >
                              <img src={imgUrl} alt={`Option ${optIdx+1}`} className={isPortrait?'portrait':'landscape'}/>
                              <div className="scene-img-overlay">
                                <span className="img-label">Option {optIdx+1}</span>
                                {si.selected===optIdx && <div className="img-check">✓</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="scene-actions">
                          <button className="btn-redo" onClick={()=>generateScene(idx,true)}>↺ Redo</button>
                          <button
                            className="btn-download"
                            disabled={si.selected==null||si.selected===undefined}
                            onClick={()=>{if(si.selected!=null)downloadImage(si.options[si.selected],`scene-${idx+1}.png`)}}
                          >
                            ↓ Download Scene {idx+1}
                          </button>
                        </div>
                      </>)}
                    </div>
                  )
                })}
              </div>
            ) : (
              !scenesLoading && <div className="empty">Paste your script and click "Plan Scenes" to get started</div>
            )}

          </div>
        </div>
      </div>
    </div>
  </>)
}
