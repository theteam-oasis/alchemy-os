'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SampleBriefPage() {
  const [phase, setPhase] = useState('input')
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [productPageUrl, setProductPageUrl] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [productImageDataUrl, setProductImageDataUrl] = useState(null)
  const [clientProductImages, setClientProductImages] = useState([])
  const [selectedProductUrls, setSelectedProductUrls] = useState([])
  const [conceptProgress, setConceptProgress] = useState([
    { status: 'waiting', title: '', message: 'Waiting...' },
    { status: 'waiting', title: '', message: 'Waiting...' },
  ])
  const [overallMessage, setOverallMessage] = useState('')
  const [error, setError] = useState(null)
  const [doneClientId, setDoneClientId] = useState(null)
  const [doneSlug, setDoneSlug] = useState(null)
  const productInputRef = useRef(null)

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  const [brandIntake, setBrandIntake] = useState(null)

  useEffect(() => {
    if (!selectedClientId) { setClientProductImages([]); setBrandIntake(null); return }
    supabase.from('brand_intake').select('*').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.website) setWebsiteUrl(data.website)
          if (data.brand_name) setProductName(data.brand_name)
          if (data.website) setProductPageUrl(data.website)
          setClientProductImages(data.product_image_urls?.length ? data.product_image_urls : [])
          setBrandIntake(data)
        }
      })
  }, [selectedClientId])

  async function handleProductUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setProductImageDataUrl(await fileToDataUrl(file))
    setSelectedProductUrls([])
  }

  function toggleClientProductUrl(url) {
    setSelectedProductUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : prev.length >= 4 ? prev : [...prev, url]
    )
    setProductImageDataUrl(null)
  }

  async function handleGenerate() {
    if (!selectedClientId) { setError('Please select a client.'); return }
    if (!websiteUrl && !productName) { setError('Enter a website URL or product name.'); return }

    setPhase('generating')
    setError(null)
    setConceptProgress([
      { status: 'waiting', title: '', message: 'Waiting...' },
      { status: 'waiting', title: '', message: 'Waiting...' },
    ])

    try {
      // Step 1: Analyze
      setOverallMessage('Analyzing brand...')
      const analyzeRes = await fetch('/api/campaign/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, productPageUrl, productName, offerNotes }),
      })
      const analyzeJson = await analyzeRes.json()
      if (!analyzeJson.success) throw new Error(analyzeJson.error)
      const analysis = analyzeJson.analysis

      // Step 2: Generate 2 concepts
      setOverallMessage('Generating 2 campaign concepts...')
      const conceptsRes = await fetch('/api/campaign/concepts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          brandIntake,
          creativeKeywords: creativeKeywords.split(',').map(k => k.trim()).filter(Boolean),
          count: 2,
          previousConcepts: [],
        }),
      })
      const conceptsJson = await conceptsRes.json()
      if (!conceptsJson.success) throw new Error(conceptsJson.error)
      const concepts = conceptsJson.concepts.slice(0, 2)

      // Show titles
      setConceptProgress(concepts.map((c, i) => ({
        status: 'building', title: c.title, message: 'Building...'
      })))
      setOverallMessage('Building 2 campaigns in parallel...')

      // Step 3: Build both in parallel
      await Promise.allSettled(concepts.map(async (concept, idx) => {
        try {
          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { ...u[idx], status: 'building', message: 'Generating...' }
            return u
          })

          const res = await fetch('/api/campaign/sample-generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: selectedClientId,
              clientName: clients.find(c => c.id === selectedClientId)?.name,
              analysis, concept, conceptIdx: idx,
              websiteUrl, productName, offerNotes, aspectRatio,
              productImageUrl: selectedProductUrls[0] || null,
              productPageUrl,
            }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)
          if (json.clientSlug && !doneSlug) setDoneSlug(json.clientSlug)

          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { status: 'done', title: concept.title, message: 'Done ✓' }
            return u
          })
        } catch (e) {
          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { status: 'error', title: concept.title, message: e.message }
            return u
          })
        }
      }))

      setDoneClientId(selectedClientId)
      setPhase('done')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  const completedCount = conceptProgress.filter(c => c.status === 'done').length

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans','SF Pro Display',-apple-system,sans-serif; min-height: 100vh; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .shell { min-height: 100vh; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:20px 48px; border-bottom:1px solid #1a1a1a; }
        .logo { display:flex; align-items:center; gap:10px; }
        .logo-mark { width:28px; height:28px; background:#FFD60A; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#0a0a0a; }
        .logo-text { font-size:13px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#888; }
        .logo-text span { color:#FFD60A; }
        .nav { display:flex; gap:12px; }
        .nav-link { font-size:12px; color:#555; text-decoration:none; padding:6px 12px; border-radius:6px; border:1px solid #222; transition:all 0.15s; }
        .nav-link:hover { color:#aaa; border-color:#333; }
        .container { max-width:640px; margin:56px auto; padding:0 40px; width:100%; animation:fadeIn 0.3s ease; }
        .eyebrow { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#FFD60A; font-weight:600; margin-bottom:10px; }
        .title { font-size:34px; font-weight:800; color:#f0f0f0; margin-bottom:8px; line-height:1.2; }
        .subtitle { font-size:14px; color:#555; margin-bottom:12px; line-height:1.6; }
        .cost-badge { display:inline-flex; align-items:center; gap:6px; background:#111; border:1px solid #1e1e1e; border-radius:100px; padding:5px 12px; font-size:11px; color:#555; margin-bottom:32px; }
        .cost-badge span { color:#FFD60A; font-weight:600; }
        .section { margin-bottom:20px; }
        .label { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#555; font-weight:600; margin-bottom:8px; display:block; }
        .input, .textarea { background:#111; border:1px solid #222; border-radius:8px; color:#e8e8e8; font-size:14px; padding:12px 16px; outline:none; transition:border-color 0.15s; font-family:inherit; width:100%; }
        .input:focus, .textarea:focus { border-color:#FFD60A44; }
        .textarea { resize:vertical; min-height:72px; }
        .hint { font-size:11px; color:#444; margin-top:5px; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .client-box { background:#111; border:1px solid #1e1e1e; border-radius:10px; padding:16px; margin-bottom:20px; }
        .client-box-label { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#555; font-weight:600; margin-bottom:10px; }
        .pills { display:flex; flex-wrap:wrap; gap:8px; }
        .pill { padding:7px 14px; border-radius:100px; border:1px solid #2a2a2a; background:transparent; color:#666; font-size:13px; cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .pill:hover { border-color:#444; color:#aaa; }
        .pill.active { border-color:#FFD60A; color:#FFD60A; background:#FFD60A11; }
        .aspect-row { display:flex; gap:10px; }
        .aspect-btn { flex:1; padding:11px; border-radius:8px; border:1px solid #2a2a2a; background:transparent; color:#555; font-size:12px; cursor:pointer; transition:all 0.2s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
        .aspect-btn:hover { border-color:#444; }
        .aspect-btn.active { border-color:#FFD60A; color:#FFD60A; background:#FFD60A08; }
        .product-picker { background:#0e0e0e; border:1px solid #1e1e1e; border-radius:10px; padding:14px; }
        .pp-label { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#555; margin-bottom:10px; font-weight:600; display:flex; justify-content:space-between; }
        .pp-count { color:#FFD60A; }
        .pp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(68px,1fr)); gap:8px; margin-bottom:10px; }
        .pp-item { position:relative; border-radius:7px; overflow:hidden; border:2px solid #1e1e1e; cursor:pointer; transition:all 0.2s; aspect-ratio:1; }
        .pp-item:hover { border-color:#444; }
        .pp-item.selected { border-color:#FFD60A; }
        .pp-item img { width:100%; height:100%; object-fit:cover; display:block; }
        .pp-check { position:absolute; top:3px; right:3px; width:16px; height:16px; background:#FFD60A; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:700; color:#0a0a0a; }
        .divider { height:1px; background:#1e1e1e; margin:10px 0; }
        .pp-own { display:flex; align-items:center; gap:12px; cursor:pointer; }
        .pp-own-preview { width:40px; height:40px; border-radius:7px; object-fit:contain; background:#1a1a1a; border:1px solid #222; }
        .pp-own-placeholder { width:40px; height:40px; border-radius:7px; background:#1a1a1a; border:1px dashed #2a2a2a; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
        .pp-own-text { flex:1; font-size:12px; color:#666; }
        .pp-own-btn { font-size:11px; color:#FFD60A; border:1px solid #FFD60A44; border-radius:6px; padding:4px 10px; background:transparent; cursor:pointer; font-family:inherit; }
        .error-bar { background:#2a1010; border:1px solid #5a1a1a; border-radius:8px; padding:12px 16px; font-size:13px; color:#ff6b6b; margin-bottom:20px; }
        .gen-btn { width:100%; padding:17px; background:#FFD60A; color:#0a0a0a; border:none; border-radius:10px; font-size:16px; font-weight:800; cursor:pointer; transition:all 0.15s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:24px; }
        .gen-btn:hover { background:#ffe033; transform:translateY(-1px); }
        .gen-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .gen-btn-sub { font-size:11px; opacity:0.6; font-weight:400; }
        .gen-container { max-width:520px; margin:60px auto; padding:0 40px; animation:fadeIn 0.3s ease; }
        .gen-header { text-align:center; margin-bottom:36px; }
        .spinner { width:48px; height:48px; border:2px solid #FFD60A22; border-top-color:#FFD60A; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
        .gen-title { font-size:20px; font-weight:700; color:#f0f0f0; margin-bottom:5px; }
        .gen-sub { font-size:13px; color:#555; }
        .progress-wrap { background:#1a1a1a; border-radius:100px; height:3px; margin:16px 0; overflow:hidden; }
        .progress-fill { height:100%; background:#FFD60A; border-radius:100px; transition:width 0.5s; }
        .concept-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .cc { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:18px; position:relative; overflow:hidden; transition:border-color 0.3s; }
        .cc.building { border-color:#FFD60A44; }
        .cc.done { border-color:#4ade8044; }
        .cc.error { border-color:#ef444444; }
        .cc-shimmer { position:absolute; inset:0; background:linear-gradient(90deg,transparent,#FFD60A06,transparent); background-size:200% 100%; animation:shimmer 2s infinite; pointer-events:none; }
        .cc-num { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#444; font-weight:600; margin-bottom:6px; }
        .cc-title { font-size:13px; font-weight:600; color:#f0f0f0; margin-bottom:5px; min-height:18px; }
        .cc-status { font-size:11px; }
        .s-waiting { color:#333; }
        .s-building { color:#FFD60A; animation:pulse 1.5s infinite; }
        .s-done { color:#4ade80; }
        .s-error { color:#f87171; }
        .cc-check { position:absolute; top:14px; right:14px; width:20px; height:20px; background:#4ade8022; border:1px solid #4ade8066; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; color:#4ade80; }
        .done-container { max-width:480px; margin:80px auto; padding:0 40px; text-align:center; animation:fadeIn 0.4s ease; }
        .done-icon { font-size:48px; margin-bottom:18px; }
        .done-title { font-size:26px; font-weight:800; color:#f0f0f0; margin-bottom:8px; }
        .done-sub { font-size:14px; color:#555; margin-bottom:28px; line-height:1.6; }
        .done-btn { display:inline-block; padding:14px 36px; background:#FFD60A; color:#0a0a0a; border:none; border-radius:10px; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; text-decoration:none; transition:all 0.15s; }
        .done-btn:hover { background:#ffe033; }
        .done-link { display:block; margin-top:14px; font-size:12px; color:#444; cursor:pointer; background:none; border:none; font-family:inherit; }
        .done-link:hover { color:#666; }
      `}</style>

      <div className="shell">
        <header className="header">
          <div className="logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <span>Sample Builder</span></span>
          </div>
          <div className="nav">
            <a href="/campaign-builder" className="nav-link">Manual Builder</a>
            <a href="/auto-brief" className="nav-link">Full Brief (2K)</a>
          </div>
        </header>

        {phase === 'input' && (
          <div className="container">
            <p className="eyebrow">Sample Brief Machine</p>
            <h1 className="title">2 Sample Briefs, One Click</h1>
            <p className="subtitle">Auto-generates 2 complete campaign concepts with scripts, avatars and storyboards — built for prospecting at scale.</p>
            <div className="cost-badge">1K quality · <span>~$1.10 per run</span> · ~2 min</div>

            {error && <div className="error-bar">⚠ {error}</div>}

            {clients.length > 0 && (
              <div className="client-box">
                <p className="client-box-label">Client</p>
                <div className="pills">
                  {clients.map(c => (
                    <button key={c.id} className={`pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid2" style={{marginBottom:16}}>
              <div>
                <label className="label">Brand Website URL</label>
                <input className="input" type="url" placeholder="https://yourbrand.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
              </div>
              <div>
                <label className="label">Product / Service</label>
                <input className="input" placeholder="What are we advertising?" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
            </div>

            <div className="section">
              <label className="label">Product Page URL <span style={{color:'#555',fontWeight:400,textTransform:'none',letterSpacing:0}}>(paste the specific product page — this is what we analyze)</span></label>
              <input className="input" type="url" placeholder="https://yourbrand.com/products/your-product" value={productPageUrl} onChange={e => setProductPageUrl(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Offer or Context <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <textarea className="textarea" placeholder="Specific offer or campaign context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Creative Keywords <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <input className="input" placeholder="cinematic, premium, transformation..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Format</label>
              <div className="aspect-row">
                <button className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>🖥 16:9</button>
                <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>📱 9:16</button>
              </div>
            </div>

            <div className="section">
              <label className="label">Product Images <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <div className="product-picker">
                {clientProductImages.length > 0 && (
                  <>
                    <div className="pp-label">
                      <span>From Client Onboarding</span>
                      <span className="pp-count">{selectedProductUrls.length}/4</span>
                    </div>
                    <div className="pp-grid">
                      {clientProductImages.map((url, i) => (
                        <div key={i} className={`pp-item ${selectedProductUrls.includes(url) ? 'selected' : ''}`} onClick={() => toggleClientProductUrl(url)}>
                          <img src={url} alt={`Product ${i+1}`} />
                          {selectedProductUrls.includes(url) && <div className="pp-check">{selectedProductUrls.indexOf(url)+1}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="divider" />
                  </>
                )}
                <div className="pp-own" onClick={() => productInputRef.current?.click()}>
                  {productImageDataUrl
                    ? <img src={productImageDataUrl} alt="Uploaded" className="pp-own-preview" />
                    : <div className="pp-own-placeholder">📦</div>
                  }
                  <span className="pp-own-text">{productImageDataUrl ? 'Custom image uploaded' : clientProductImages.length > 0 ? 'Or upload your own' : 'Upload a product photo'}</span>
                  <button className="pp-own-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>{productImageDataUrl ? 'Change' : 'Upload'}</button>
                </div>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />
            </div>

            <button className="gen-btn" disabled={!selectedClientId || (!websiteUrl && !productName)} onClick={handleGenerate}>
              ⚡ Generate 2 Sample Briefs
              <span className="gen-btn-sub">~$1.10 · 1K · ~2 min</span>
            </button>
          </div>
        )}

        {phase === 'generating' && (
          <div className="gen-container">
            <div className="gen-header">
              <div className="spinner" />
              <h2 className="gen-title">Building 2 sample briefs...</h2>
              <p className="gen-sub">{overallMessage}</p>
            </div>
            <div className="progress-wrap">
              <div className="progress-fill" style={{ width: `${(completedCount / 2) * 100}%` }} />
            </div>
            <p style={{fontSize:11,color:'#444',marginBottom:16,textAlign:'center'}}>{completedCount} of 2 complete</p>
            <div className="concept-cards">
              {conceptProgress.map((cp, i) => (
                <div key={i} className={`cc ${cp.status}`}>
                  {cp.status === 'building' && <div className="cc-shimmer" />}
                  <p className="cc-num">Concept {i+1}</p>
                  <p className="cc-title">{cp.title || '—'}</p>
                  <p className={`cc-status s-${cp.status}`}>
                    {cp.status === 'waiting' ? 'Waiting...' :
                     cp.status === 'building' ? '● Generating...' :
                     cp.status === 'done' ? '✓ Complete' : `✕ ${cp.message}`}
                  </p>
                  {cp.status === 'done' && <div className="cc-check">✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="done-container">
            <div className="done-icon">🎬</div>
            <h2 className="done-title">{completedCount} briefs ready.</h2>
            <p className="done-sub">Sample campaigns built and saved. Open the brief to preview and share.</p>
            <a href={`/${doneSlug}/briefs`} className="done-btn">Open Sample Brief ↗</a>
            <button className="done-link" onClick={() => { setPhase('input'); setDoneClientId(null); setDoneSlug(null) }}>Generate another</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="done-container">
            <div className="done-icon">⚠️</div>
            <h2 className="done-title">Something went wrong</h2>
            <p className="done-sub">{error}</p>
            <button className="done-btn" style={{background:'transparent',color:'#FFD60A',border:'1px solid #FFD60A44'}} onClick={() => { setPhase('input'); setError(null) }}>Try Again</button>
          </div>
        )}
      </div>
    </>
  )
}
