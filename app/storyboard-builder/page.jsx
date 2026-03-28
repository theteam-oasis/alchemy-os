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

function downloadImage(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export default function StoryboardBuilder() {
  const [aspectRatio, setAspectRatio] = useState('9:16')

  // Assets
  const [productImage, setProductImage] = useState(null) // dataUrl
  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarImage, setAvatarImage] = useState(null)
  const [avatarLocked, setAvatarLocked] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [envPrompt, setEnvPrompt] = useState('')
  const [envImage, setEnvImage] = useState(null)
  const [envLocked, setEnvLocked] = useState(false)
  const [envLoading, setEnvLoading] = useState(false)

  // Script + scenes
  const [script, setScript] = useState('')
  const [scenes, setScenes] = useState([]) // [{scriptLine, imagePrompt, usesProduct, usesAvatar, usesEnv}]
  const [scenesLoading, setScenesLoading] = useState(false)

  // Per-scene generation
  const [sceneImages, setSceneImages] = useState({}) // {idx: {options: [url1,url2], selected: 0|1|null, loading: false}}

  const productRef = useRef(null)

  async function handleProductUpload(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setProductImage(await fileToDataUrl(f))
  }

  async function generateAsset(type) {
    const prompt = type === 'avatar' ? avatarPrompt : envPrompt
    if (!prompt.trim()) return
    if (type === 'avatar') { setAvatarLoading(true); setAvatarLocked(false) }
    else { setEnvLoading(true); setEnvLocked(false) }
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
          hasProduct: !!productImage,
          hasAvatar: avatarLocked && !!avatarImage,
          hasEnv: envLocked && !!envImage,
          aspectRatio,
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
          productImage: scene.usesProduct && productImage ? productImage : null,
          avatarImage: scene.usesAvatar && avatarLocked && avatarImage ? avatarImage : null,
          envImage: scene.usesEnv && envLocked && envImage ? envImage : null,
        }),
      })
      const j = await res.json()
      if (j.options) {
        setSceneImages(prev => ({ ...prev, [idx]: { options: j.options, selected: null, loading: false } }))
      }
    } catch (e) { console.error(e) }
    setSceneImages(prev => ({ ...prev, [idx]: { ...prev[idx], loading: false } }))
  }

  const isPortrait = aspectRatio === '9:16'

  return (
    <>
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
        .page-header{margin-bottom:36px;}
        .page-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aaaaaa;margin-bottom:10px;}
        .page-title{font-size:32px;font-weight:300;letter-spacing:-0.02em;color:#111111;margin-bottom:6px;}
        .page-title strong{font-weight:600;}
        .page-sub{font-size:14px;color:#888888;font-weight:300;line-height:1.6;}

        /* Format toggle */
        .format-row{display:flex;gap:8px;margin-bottom:32px;}
        .fmt-btn{padding:9px 18px;background:white;border:1px solid #e5e5e5;border-radius:8px;color:#aaaaaa;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:6px;}
        .fmt-btn:hover{border-color:#111111;color:#111111;}
        .fmt-btn.active{border-color:#111111;color:#111111;background:#f8f8f8;font-weight:600;}

        /* Layout */
        .layout{display:grid;grid-template-columns:280px 1fr;gap:28px;align-items:start;}

        /* Sidebar — assets */
        .sidebar{display:flex;flex-direction:column;gap:16px;}
        .asset-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;}
        .asset-card.locked{border-color:#111111;}
        .asset-header{padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;}
        .asset-title{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#111111;}
        .locked-badge{font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:white;background:#111111;padding:2px 7px;border-radius:4px;}
        .asset-body{padding:14px 16px;}
        .asset-img-wrap{position:relative;margin-bottom:10px;}
        .asset-img{width:100%;border-radius:8px;object-fit:cover;display:block;border:1px solid #eeeeee;}
        .asset-img.portrait{aspect-ratio:3/4;}
        .asset-img.landscape{aspect-ratio:16/9;}
        .asset-placeholder{width:100%;background:#f8f8f8;border:1px dashed #dddddd;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#cccccc;font-size:12px;}
        .asset-placeholder.portrait{aspect-ratio:3/4;}
        .asset-placeholder.landscape{aspect-ratio:16/9;}
        .asset-input{background:white;border:1px solid #e5e5e5;border-radius:7px;color:#111111;font-size:13px;padding:9px 12px;outline:none;width:100%;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;resize:none;line-height:1.5;}
        .asset-input::placeholder{color:#cccccc;}
        .asset-input:focus{border-color:#111111;}
        .asset-actions{display:flex;gap:6px;margin-top:8px;}
        .btn-gen{flex:1;padding:9px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:5px;}
        .btn-gen:hover{background:#333333;}
        .btn-gen:disabled{opacity:0.3;cursor:not-allowed;}
        .btn-lock{padding:9px 12px;background:white;color:#111111;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
        .btn-lock:hover{border-color:#111111;}
        .btn-lock.locked{background:#111111;color:white;border-color:#111111;}
        .btn-unlock{padding:9px 12px;background:white;color:#888888;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;}
        .upload-area{border:1px dashed #dddddd;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:all 0.15s;background:#fafafa;}
        .upload-area:hover{border-color:#111111;background:#f5f5f5;}
        .upload-area img{width:100%;border-radius:6px;object-fit:contain;max-height:120px;}
        .upload-label{font-size:12px;color:#aaaaaa;margin-top:4px;}
        .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;}
        .spinner-dark{width:14px;height:14px;border:2px solid #eeeeee;border-top-color:#111111;border-radius:50%;animation:spin 0.7s linear infinite;}

        /* Main content */
        .content{display:flex;flex-direction:column;gap:24px;}

        /* Script section */
        .section-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;}
        .section-head{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;}
        .section-title{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#111111;}
        .section-body{padding:16px 20px;}
        .script-textarea{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:14px;padding:12px 14px;outline:none;width:100%;resize:vertical;min-height:110px;line-height:1.7;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;}
        .script-textarea::placeholder{color:#cccccc;}
        .script-textarea:focus{border-color:#111111;}
        .script-meta{display:flex;align-items:center;justify-content:space-between;margin-top:10px;}
        .script-hint{font-size:11px;color:#cccccc;}
        .btn-plan{padding:10px 20px;background:#111111;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;display:flex;align-items:center;gap:7px;}
        .btn-plan:hover{background:#333333;}
        .btn-plan:disabled{opacity:0.3;cursor:not-allowed;}

        /* Scenes */
        .scenes-list{display:flex;flex-direction:column;gap:12px;}
        .scene-card{background:white;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;}
        .scene-head{padding:14px 18px;border-bottom:1px solid #f5f5f5;display:flex;align-items:flex-start;gap:14px;}
        .scene-num{width:28px;height:28px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:11px;color:#888888;flex-shrink:0;margin-top:1px;}
        .scene-info{flex:1;}
        .scene-line{font-size:14px;color:#111111;line-height:1.6;font-weight:400;margin-bottom:5px;}
        .scene-prompt{font-size:11px;color:#aaaaaa;line-height:1.5;font-style:italic;}
        .scene-tags{display:flex;gap:5px;margin-top:5px;}
        .tag{font-size:9px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:2px 7px;border-radius:4px;border:1px solid;}
        .tag-product{color:#111111;border-color:#111111;background:#f0f0f0;}
        .tag-avatar{color:#555555;border-color:#cccccc;background:#f8f8f8;}
        .tag-env{color:#555555;border-color:#cccccc;background:#f8f8f8;}
        .scene-gen-btn{padding:8px 14px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;display:flex;align-items:center;gap:6px;flex-shrink:0;}
        .scene-gen-btn:hover{background:#333333;}
        .scene-gen-btn:disabled{opacity:0.3;cursor:not-allowed;}

        /* Scene images */
        .scene-images{padding:14px 18px;border-top:1px solid #f5f5f5;display:grid;gap:10px;}
        .scene-images.portrait{grid-template-columns:1fr 1fr;}
        .scene-images.landscape{grid-template-columns:1fr 1fr;}
        .scene-img-wrap{position:relative;border-radius:8px;overflow:hidden;border:2px solid #eeeeee;cursor:pointer;transition:all 0.15s;}
        .scene-img-wrap:hover{border-color:#111111;}
        .scene-img-wrap.selected{border-color:#111111;border-width:2.5px;}
        .scene-img-wrap img{width:100%;display:block;object-fit:cover;}
        .scene-img-wrap img.portrait{aspect-ratio:9/16;}
        .scene-img-wrap img.landscape{aspect-ratio:16/9;}
        .scene-img-overlay{position:absolute;bottom:0;left:0;right:0;padding:8px 10px;background:linear-gradient(transparent,rgba(0,0,0,0.6));display:flex;align-items:center;justify-content:space-between;}
        .img-option-label{font-size:10px;font-weight:600;color:white;letter-spacing:0.05em;}
        .img-select-check{width:18px;height:18px;border-radius:50%;background:#111111;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;}
        .scene-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:28px;color:#aaaaaa;font-size:13px;}
        .scene-loading-shimmer{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.8s ease-in-out infinite;border-radius:8px;}
        .scene-actions{display:flex;gap:7px;padding:10px 18px;border-top:1px solid #f5f5f5;}
        .btn-redo{padding:8px 14px;background:white;color:#888888;border:1px solid #e5e5e5;border-radius:7px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
        .btn-redo:hover{border-color:#111111;color:#111111;}
        .btn-download{padding:8px 14px;background:#111111;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;}
        .btn-download:hover{background:#333333;}
        .btn-download:disabled{opacity:0.3;cursor:not-allowed;}

        .empty-scenes{text-align:center;padding:48px 0;color:#cccccc;font-size:14px;font-weight:300;}
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
          <div className="page-header">
            <p className="page-eyebrow">Storyboard Builder</p>
            <h1 className="page-title"><strong>Scene by scene.</strong> Your script.</h1>
            <p className="page-sub">Lock your assets, paste your script, generate each scene individually with 2 options to choose from.</p>
          </div>

          {/* Format */}
          <div className="format-row">
            <button className={`fmt-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>▮ 9:16 Vertical</button>
            <button className={`fmt-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>⬛ 16:9 Landscape</button>
          </div>

          <div className="layout">
            {/* Sidebar */}
            <div className="sidebar">

              {/* Product */}
              <div className="asset-card">
                <div className="asset-header">
                  <span className="asset-title">Product</span>
                  {productImage && <span style={{fontSize:9,color:'#111111',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>Uploaded</span>}
                </div>
                <div className="asset-body">
                  <div className="upload-area" onClick={() => productRef.current?.click()}>
                    {productImage
                      ? <img src={productImage} alt="Product" style={{width:'100%',maxHeight:120,objectFit:'contain',borderRadius:6}}/>
                      : <><div style={{fontSize:24,marginBottom:6}}>📦</div><p className="upload-label">Click to upload product image</p></>
                    }
                  </div>
                  {productImage && (
                    <button className="btn-lock" style={{width:'100%',marginTop:8,textAlign:'center'}} onClick={() => setProductImage(null)}>Remove</button>
                  )}
                  <input ref={productRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload}/>
                </div>
              </div>

              {/* Avatar */}
              <div className={`asset-card ${avatarLocked ? 'locked' : ''}`}>
                <div className="asset-header">
                  <span className="asset-title">Avatar</span>
                  {avatarLocked && <span className="locked-badge">Locked</span>}
                </div>
                <div className="asset-body">
                  {avatarImage
                    ? <div className="asset-img-wrap"><img src={avatarImage} alt="Avatar" className={`asset-img portrait`}/></div>
                    : <div className={`asset-placeholder portrait`}><span>No avatar yet</span></div>
                  }
                  {!avatarLocked && <>
                    <textarea className="asset-input" rows={2} placeholder="Describe your avatar character..." value={avatarPrompt} onChange={e => setAvatarPrompt(e.target.value)}/>
                    <div className="asset-actions">
                      <button className="btn-gen" disabled={!avatarPrompt.trim() || avatarLoading} onClick={() => generateAsset('avatar')}>
                        {avatarLoading ? <><div className="spinner"/>Generating...</> : '⚡ Generate'}
                      </button>
                      {avatarImage && <button className="btn-lock" onClick={() => setAvatarLocked(true)}>Lock ✓</button>}
                    </div>
                  </>}
                  {avatarLocked && (
                    <div className="asset-actions" style={{marginTop:8}}>
                      <button className="btn-unlock" onClick={() => setAvatarLocked(false)} style={{width:'100%',textAlign:'center'}}>Unlock to edit</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Environment */}
              <div className={`asset-card ${envLocked ? 'locked' : ''}`}>
                <div className="asset-header">
                  <span className="asset-title">Environment</span>
                  {envLocked && <span className="locked-badge">Locked</span>}
                </div>
                <div className="asset-body">
                  {envImage
                    ? <div className="asset-img-wrap"><img src={envImage} alt="Environment" className={`asset-img ${isPortrait ? 'portrait' : 'landscape'}`}/></div>
                    : <div className={`asset-placeholder ${isPortrait ? 'portrait' : 'landscape'}`}><span>No environment yet</span></div>
                  }
                  {!envLocked && <>
                    <textarea className="asset-input" rows={2} placeholder="Describe the environment / setting..." value={envPrompt} onChange={e => setEnvPrompt(e.target.value)} style={{marginTop:10}}/>
                    <div className="asset-actions">
                      <button className="btn-gen" disabled={!envPrompt.trim() || envLoading} onClick={() => generateAsset('environment')}>
                        {envLoading ? <><div className="spinner"/>Generating...</> : '⚡ Generate'}
                      </button>
                      {envImage && <button className="btn-lock" onClick={() => setEnvLocked(true)}>Lock ✓</button>}
                    </div>
                  </>}
                  {envLocked && (
                    <div className="asset-actions" style={{marginTop:8}}>
                      <button className="btn-unlock" onClick={() => setEnvLocked(false)} style={{width:'100%',textAlign:'center'}}>Unlock to edit</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="content">
              {/* Script */}
              <div className="section-card">
                <div className="section-head">
                  <span className="section-title">Script</span>
                  {scenes.length > 0 && <span style={{fontSize:11,color:'#aaaaaa'}}>{scenes.length} scenes planned</span>}
                </div>
                <div className="section-body">
                  <textarea
                    className="script-textarea"
                    placeholder="Paste your voiceover script here. We'll divide it into scenes at 3-4 seconds each (max 15 scenes)..."
                    value={script}
                    onChange={e => setScript(e.target.value)}
                  />
                  <div className="script-meta">
                    <span className="script-hint">
                      {script.trim() ? `~${Math.min(15, Math.ceil(script.split(' ').length / 10))} scenes estimated` : 'Tip: 30s script ≈ 8–10 scenes'}
                    </span>
                    <button className="btn-plan" disabled={!script.trim() || scenesLoading} onClick={handlePlanScenes}>
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
                          <div className="scene-num">{idx + 1}</div>
                          <div className="scene-info">
                            <p className="scene-line">"{scene.scriptLine}"</p>
                            <p className="scene-prompt">{scene.imagePrompt}</p>
                            <div className="scene-tags">
                              {scene.usesProduct && productImage && <span className="tag tag-product">Product</span>}
                              {scene.usesAvatar && avatarLocked && <span className="tag tag-avatar">Avatar</span>}
                              {scene.usesEnv && envLocked && <span className="tag tag-env">Environment</span>}
                            </div>
                          </div>
                          <button
                            className="scene-gen-btn"
                            disabled={si?.loading}
                            onClick={() => generateScene(idx, false)}
                          >
                            {si?.loading ? <><div className="spinner"/>...</> : si?.options?.length ? '↺ Redo' : '⚡ Generate'}
                          </button>
                        </div>

                        {si?.loading && (
                          <div className="scene-loading">
                            <div className="spinner-dark"/>
                            Generating 2 options...
                          </div>
                        )}

                        {si?.options?.length > 0 && !si?.loading && (
                          <>
                            <div className={`scene-images ${isPortrait ? 'portrait' : 'landscape'}`}>
                              {si.options.map((imgUrl, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`scene-img-wrap ${si.selected === optIdx ? 'selected' : ''}`}
                                  onClick={() => setSceneImages(prev => ({ ...prev, [idx]: { ...prev[idx], selected: optIdx } }))}
                                >
                                  <img src={imgUrl} alt={`Option ${optIdx + 1}`} className={isPortrait ? 'portrait' : 'landscape'}/>
                                  <div className="scene-img-overlay">
                                    <span className="img-option-label">Option {optIdx + 1}</span>
                                    {si.selected === optIdx && <div className="img-select-check">✓</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="scene-actions">
                              <button className="btn-redo" onClick={() => generateScene(idx, true)}>↺ Redo</button>
                              <button
                                className="btn-download"
                                disabled={si.selected === null || si.selected === undefined}
                                onClick={() => {
                                  if (si.selected != null) downloadImage(si.options[si.selected], `scene-${idx + 1}.png`)
                                }}
                              >
                                ↓ Download Scene {idx + 1}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                !scenesLoading && <div className="empty-scenes">Paste your script and click "Plan Scenes" to get started</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
