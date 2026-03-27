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
  const [phase, setPhase] = useState('input') // input | analyzing | generating | done | error
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [productPageUrl, setProductPageUrl] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')

  // Product images — extracted from page or uploaded
  const [extractedImages, setExtractedImages] = useState([]) // from page scrape
  const [selectedImageUrl, setSelectedImageUrl] = useState(null) // chosen from extracted
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState(null) // manual upload
  const [extracting, setExtracting] = useState(false)

  const [analysis, setAnalysis] = useState(null)
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

  // When client selected, pre-fill their website as product page URL
  useEffect(() => {
    if (!selectedClientId) return
    supabase.from('brand_intake').select('website').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => {
        if (data?.website && !productPageUrl) setProductPageUrl(data.website)
      })
  }, [selectedClientId])

  // Auto-extract images when URL is entered (debounced)
  useEffect(() => {
    if (!productPageUrl || !productPageUrl.startsWith('http')) return
    const timer = setTimeout(() => extractImages(productPageUrl), 1500)
    return () => clearTimeout(timer)
  }, [productPageUrl])

  async function extractImages(url) {
    setExtracting(true)
    setExtractedImages([])
    setSelectedImageUrl(null)
    try {
      const res = await fetch('/api/campaign/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPageUrl: url, offerNotes: '', extractImagesOnly: true }),
      })
      const json = await res.json()
      if (json.productImages?.length) {
        setExtractedImages(json.productImages)
        setSelectedImageUrl(json.productImages[0]) // auto-select first
      }
    } catch {}
    setExtracting(false)
  }

  async function handleProductUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedImageDataUrl(await fileToDataUrl(file))
    setSelectedImageUrl(null)
  }

  const effectiveProductImage = uploadedImageDataUrl || selectedImageUrl

  async function handleGenerate() {
    if (!productPageUrl) { setError('Enter a product page URL to continue.'); return }

    setPhase('analyzing')
    setError(null)

    try {
      // Step 1: Analyze product page
      setOverallMessage('Analyzing product page...')
      const analyzeRes = await fetch('/api/campaign/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPageUrl, offerNotes }),
      })
      const analyzeJson = await analyzeRes.json()
      if (!analyzeJson.success) throw new Error(analyzeJson.error)
      const analysis = analyzeJson.analysis

      // Grab images from analyze if not already extracted
      if (analyzeJson.productImages?.length && !extractedImages.length) {
        setExtractedImages(analyzeJson.productImages)
        if (!selectedImageUrl && !uploadedImageDataUrl) {
          setSelectedImageUrl(analyzeJson.productImages[0])
        }
      }

      setAnalysis(analysis)
      setPhase('generating')

      // Step 2: Generate 2 concepts
      setOverallMessage(`Generating campaign concepts for ${analysis.brandName || 'brand'}...`)
      const conceptsRes = await fetch('/api/campaign/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          creativeKeywords: creativeKeywords.split(',').map(k => k.trim()).filter(Boolean),
          count: 2,
          previousConcepts: [],
        }),
      })
      const conceptsJson = await conceptsRes.json()
      if (!conceptsJson.success) throw new Error(conceptsJson.error)
      const concepts = conceptsJson.concepts.slice(0, 2)

      setConceptProgress(concepts.map(c => ({ status: 'building', title: c.title, message: 'Generating...' })))
      setOverallMessage('Building both campaigns in parallel...')

      // Step 3: Build both concepts in parallel
      const clientId = selectedClientId || null
      const clientName = selectedClientId
        ? clients.find(c => c.id === selectedClientId)?.name
        : analysis.brandName || 'Brand'

      await Promise.allSettled(concepts.map(async (concept, idx) => {
        try {
          const res = await fetch('/api/campaign/sample-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId,
              clientName,
              analysis,
              concept,
              conceptIdx: idx,
              productPageUrl,
              offerNotes,
              aspectRatio,
              productImageUrl: selectedImageUrl || null,
              uploadedProductImage: uploadedImageDataUrl || null,
            }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)

          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { status: 'done', title: concept.title, message: 'Done ✓' }
            return u
          })
          if (json.clientSlug && !doneSlug) setDoneSlug(json.clientSlug)
          if (json.clientId && !doneClientId) setDoneClientId(json.clientId)
        } catch (e) {
          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { status: 'error', title: concept.title, message: e.message }
            return u
          })
        }
      }))

      setPhase('done')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  const completedCount = conceptProgress.filter(c => c.status === 'done').length
  const slugForUrl = doneSlug || (analysis?.brandName ? analysis.brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null)

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
        .nav { display:flex; gap:10px; }
        .nav-link { font-size:12px; color:#555; text-decoration:none; padding:6px 12px; border-radius:6px; border:1px solid #222; transition:all 0.15s; }
        .nav-link:hover { color:#aaa; border-color:#333; }

        /* Input phase */
        .container { max-width:640px; margin:52px auto; padding:0 40px; width:100%; animation:fadeIn 0.3s ease; }
        .eyebrow { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#FFD60A; font-weight:600; margin-bottom:10px; }
        .title { font-size:34px; font-weight:800; color:#f0f0f0; margin-bottom:8px; line-height:1.2; }
        .subtitle { font-size:14px; color:#555; margin-bottom:12px; line-height:1.6; }
        .cost-badge { display:inline-flex; align-items:center; gap:6px; background:#111; border:1px solid #1e1e1e; border-radius:100px; padding:5px 12px; font-size:11px; color:#555; margin-bottom:32px; }
        .cost-badge span { color:#FFD60A; font-weight:600; }

        .section { margin-bottom:20px; }
        .label { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#555; font-weight:600; margin-bottom:8px; display:block; }
        .label-optional { font-size:10px; color:#333; text-transform:none; letter-spacing:0; font-weight:400; margin-left:6px; }
        .input, .textarea { background:#111; border:1px solid #222; border-radius:8px; color:#e8e8e8; font-size:14px; padding:12px 16px; outline:none; transition:border-color 0.15s; font-family:inherit; width:100%; }
        .input:focus, .textarea:focus { border-color:#FFD60A44; }
        .textarea { resize:vertical; min-height:72px; }
        .hint { font-size:11px; color:#444; margin-top:5px; }

        /* URL input with loading */
        .url-wrap { position:relative; }
        .url-input { padding-right:80px; }
        .url-status { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:11px; color:#555; display:flex; align-items:center; gap:6px; }
        .url-spinner { width:12px; height:12px; border:1.5px solid #FFD60A22; border-top-color:#FFD60A; border-radius:50%; animation:spin 0.8s linear infinite; }

        /* Client pills — optional */
        .client-section { background:#0e0e0e; border:1px solid #1a1a1a; border-radius:10px; padding:14px 16px; margin-bottom:20px; }
        .client-section-label { font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#444; font-weight:600; margin-bottom:10px; }
        .pills { display:flex; flex-wrap:wrap; gap:6px; }
        .pill { padding:6px 12px; border-radius:100px; border:1px solid #2a2a2a; background:transparent; color:#555; font-size:12px; cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .pill:hover { border-color:#444; color:#888; }
        .pill.active { border-color:#FFD60A; color:#FFD60A; background:#FFD60A11; }
        .pill-none { color:#333; }

        /* Product image picker */
        .img-picker { background:#0e0e0e; border:1px solid #1e1e1e; border-radius:10px; padding:16px; }
        .img-picker-label { font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#555; margin-bottom:12px; font-weight:600; display:flex; justify-content:space-between; align-items:center; }
        .img-picker-status { color:#FFD60A; font-size:10px; }
        .img-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px; margin-bottom:12px; }
        .img-item { position:relative; border-radius:8px; overflow:hidden; border:2px solid #1e1e1e; cursor:pointer; transition:all 0.2s; aspect-ratio:1; background:#111; }
        .img-item:hover { border-color:#444; }
        .img-item.selected { border-color:#FFD60A; }
        .img-item img { width:100%; height:100%; object-fit:cover; display:block; }
        .img-check { position:absolute; top:4px; right:4px; width:18px; height:18px; background:#FFD60A; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#0a0a0a; }
        .img-shimmer { width:100%; aspect-ratio:1; background:linear-gradient(90deg,#111 25%,#1a1a1a 50%,#111 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:6px; }
        .img-divider { height:1px; background:#1a1a1a; margin:12px 0; }
        .img-upload-row { display:flex; align-items:center; gap:12px; cursor:pointer; }
        .img-upload-preview { width:44px; height:44px; border-radius:7px; object-fit:contain; background:#1a1a1a; border:1px solid #222; }
        .img-upload-placeholder { width:44px; height:44px; border-radius:7px; background:#1a1a1a; border:1px dashed #2a2a2a; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .img-upload-text { flex:1; font-size:12px; color:#555; }
        .img-upload-btn { font-size:11px; color:#FFD60A; border:1px solid #FFD60A44; border-radius:6px; padding:4px 10px; background:transparent; cursor:pointer; font-family:inherit; }

        /* Selected image preview */
        .selected-preview { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#111; border:1px solid #FFD60A33; border-radius:8px; margin-top:8px; }
        .selected-preview img { width:40px; height:40px; border-radius:6px; object-fit:cover; }
        .selected-preview-text { flex:1; font-size:12px; color:#888; }
        .selected-preview-clear { font-size:11px; color:#555; background:none; border:none; cursor:pointer; font-family:inherit; }
        .selected-preview-clear:hover { color:#888; }

        /* Aspect */
        .aspect-row { display:flex; gap:10px; }
        .aspect-btn { flex:1; padding:11px; border-radius:8px; border:1px solid #2a2a2a; background:transparent; color:#555; font-size:12px; cursor:pointer; transition:all 0.2s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
        .aspect-btn:hover { border-color:#444; }
        .aspect-btn.active { border-color:#FFD60A; color:#FFD60A; background:#FFD60A08; }

        /* Error */
        .error-bar { background:#2a1010; border:1px solid #5a1a1a; border-radius:8px; padding:12px 16px; font-size:13px; color:#ff6b6b; margin-bottom:20px; }

        /* Generate button */
        .gen-btn { width:100%; padding:17px; background:#FFD60A; color:#0a0a0a; border:none; border-radius:10px; font-size:16px; font-weight:800; cursor:pointer; transition:all 0.15s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:24px; }
        .gen-btn:hover { background:#ffe033; transform:translateY(-1px); }
        .gen-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .gen-btn-sub { font-size:11px; opacity:0.6; font-weight:400; }

        /* Analyzing / Generating phase */
        .gen-container { max-width:560px; margin:60px auto; padding:0 40px; animation:fadeIn 0.3s ease; }
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

        /* Done */
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
            <a href="/clients" className="nav-link">CRM</a>
            <a href="/campaign-builder" className="nav-link">Manual Builder</a>
            <a href="/auto-brief" className="nav-link">Full Brief (2K)</a>
          </div>
        </header>

        {/* INPUT */}
        {(phase === 'input' || phase === 'error') && (
          <div className="container">
            <p className="eyebrow">Sample Brief Machine</p>
            <h1 className="title">2 Sample Briefs, One Click</h1>
            <p className="subtitle">Paste a product page URL. We scrape the page, extract images, build 2 complete campaign concepts with scripts and storyboards.</p>
            <div className="cost-badge">1K quality · <span>~$1.10 per run</span> · ~2-3 min</div>

            {error && <div className="error-bar">⚠ {error}</div>}

            {/* Product page URL — primary input */}
            <div className="section">
              <label className="label">Product Page URL</label>
              <div className="url-wrap">
                <input
                  className="input url-input"
                  type="url"
                  placeholder="https://yourbrand.com/products/your-product"
                  value={productPageUrl}
                  onChange={e => { setProductPageUrl(e.target.value); setExtractedImages([]); setSelectedImageUrl(null) }}
                />
                {productPageUrl && (
                  <div className="url-status">
                    {extracting
                      ? <><div className="url-spinner" /><span>Scanning...</span></>
                      : extractedImages.length > 0
                        ? <span style={{color:'#4ade80'}}>✓ {extractedImages.length} images</span>
                        : null
                    }
                  </div>
                )}
              </div>
              <p className="hint">We scrape this page for product details, brand voice, and images</p>
            </div>

            {/* Product image picker — auto-populated from URL */}
            <div className="section">
              <label className="label">
                Product Image
                <span className="label-optional">(auto-extracted from page — select or upload your own)</span>
              </label>
              <div className="img-picker">
                {extractedImages.length > 0 && (
                  <>
                    <div className="img-picker-label">
                      <span>Extracted from Page</span>
                      <span className="img-picker-status">{extractedImages.length} found</span>
                    </div>
                    <div className="img-grid">
                      {extractedImages.map((url, i) => (
                        <div
                          key={i}
                          className={`img-item ${selectedImageUrl === url && !uploadedImageDataUrl ? 'selected' : ''}`}
                          onClick={() => { setSelectedImageUrl(url); setUploadedImageDataUrl(null) }}
                        >
                          <img src={url} alt={`Product ${i+1}`} onError={e => e.target.parentElement.style.display='none'} />
                          {selectedImageUrl === url && !uploadedImageDataUrl && <div className="img-check">✓</div>}
                        </div>
                      ))}
                      {extracting && Array(3).fill(null).map((_, i) => <div key={i} className="img-shimmer" />)}
                    </div>
                    <div className="img-divider" />
                  </>
                )}
                {extracting && !extractedImages.length && (
                  <>
                    <div className="img-picker-label"><span>Extracting images from page...</span></div>
                    <div className="img-grid">{Array(4).fill(null).map((_, i) => <div key={i} className="img-shimmer" />)}</div>
                    <div className="img-divider" />
                  </>
                )}
                <div className="img-upload-row" onClick={() => productInputRef.current?.click()}>
                  {uploadedImageDataUrl
                    ? <img src={uploadedImageDataUrl} alt="Uploaded" className="img-upload-preview" />
                    : <div className="img-upload-placeholder">📦</div>
                  }
                  <span className="img-upload-text">
                    {uploadedImageDataUrl ? 'Custom image uploaded' : extractedImages.length > 0 ? 'Or upload your own' : 'Upload a product photo'}
                  </span>
                  <button className="img-upload-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>
                    {uploadedImageDataUrl ? 'Change' : 'Upload'}
                  </button>
                </div>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />

              {/* Selected image confirmation */}
              {effectiveProductImage && (
                <div className="selected-preview">
                  <img src={effectiveProductImage} alt="Selected" />
                  <span className="selected-preview-text">
                    {uploadedImageDataUrl ? 'Using uploaded image' : 'Using extracted image'} — this will appear in scenes
                  </span>
                  <button className="selected-preview-clear" onClick={() => { setSelectedImageUrl(null); setUploadedImageDataUrl(null) }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* Offer notes */}
            <div className="section">
              <label className="label">Offer or Context <span className="label-optional">(optional)</span></label>
              <textarea className="textarea" placeholder="Any specific offer, launch, or campaign context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            {/* Creative keywords */}
            <div className="section">
              <label className="label">Creative Keywords <span className="label-optional">(optional)</span></label>
              <input className="input" placeholder="cinematic, premium, transformation, ritual..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
            </div>

            {/* Format */}
            <div className="section">
              <label className="label">Format</label>
              <div className="aspect-row">
                <button className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>🖥 16:9 Landscape</button>
                <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>📱 9:16 Vertical</button>
              </div>
            </div>

            {/* Optional client link */}
            {clients.length > 0 && (
              <div className="client-section">
                <p className="client-section-label">Link to Client <span style={{color:'#333',textTransform:'none',letterSpacing:0,fontWeight:400}}>(optional — saves briefs to their profile)</span></p>
                <div className="pills">
                  <button className={`pill pill-none ${!selectedClientId ? 'active' : ''}`} onClick={() => setSelectedClientId(null)}>No client</button>
                  {clients.map(c => (
                    <button key={c.id} className={`pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}

            <button className="gen-btn" disabled={!productPageUrl} onClick={handleGenerate}>
              ⚡ Generate 2 Sample Briefs
              <span className="gen-btn-sub">~$1.10 · 1K · ~2-3 min</span>
            </button>
          </div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div className="gen-container">
            <div className="gen-header">
              <div className="spinner" />
              <h2 className="gen-title">Analyzing product page...</h2>
              <p className="gen-sub">Scraping content and extracting brand intelligence</p>
            </div>
          </div>
        )}

        {/* GENERATING */}
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

        {/* DONE */}
        {phase === 'done' && (
          <div className="done-container">
            <div className="done-icon">🎬</div>
            <h2 className="done-title">{completedCount} briefs ready.</h2>
            <p className="done-sub">Sample campaigns built and saved. Open the brief to preview and share with prospects.</p>
            {slugForUrl
              ? <a href={`/${slugForUrl}/briefs`} className="done-btn">Open Sample Brief ↗</a>
              : doneClientId
                ? <a href={`/brief/${doneClientId}`} className="done-btn">Open Sample Brief ↗</a>
                : <p style={{color:'#555',fontSize:13}}>Briefs saved. Check the CRM to find them.</p>
            }
            <button className="done-link" onClick={() => {
              setPhase('input'); setDoneClientId(null); setDoneSlug(null)
              setConceptProgress([
                {status:'waiting',title:'',message:'Waiting...'},
                {status:'waiting',title:'',message:'Waiting...'},
              ])
              setAnalysis(null)
            }}>Generate another</button>
          </div>
        )}
      </div>
    </>
  )
}
