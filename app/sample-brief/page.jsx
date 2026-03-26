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

function parseJSON(text) {
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

export default function SampleBriefPage() {
  const [phase, setPhase] = useState('input')
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [productImageDataUrl, setProductImageDataUrl] = useState(null)
  const [clientProductImages, setClientProductImages] = useState([])
  const [selectedProductUrls, setSelectedProductUrls] = useState([])
  const [conceptProgress, setConceptProgress] = useState([
    { status: 'waiting', title: '', message: '' },
    { status: 'waiting', title: '', message: '' },
    { status: 'waiting', title: '', message: '' },
    { status: 'waiting', title: '', message: '' },
  ])
  const [overallMessage, setOverallMessage] = useState('')
  const [error, setError] = useState(null)
  const [doneClientId, setDoneClientId] = useState(null)
  const productInputRef = useRef(null)

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  useEffect(() => {
    if (!selectedClientId) { setClientProductImages([]); return }
    supabase.from('brand_intake').select('website, brand_name, product_image_urls').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.website) setWebsiteUrl(data.website)
          if (data.brand_name) setProductName(data.brand_name)
          if (data.product_image_urls?.length) setClientProductImages(data.product_image_urls)
          else setClientProductImages([])
        }
      })
  }, [selectedClientId])

  async function handleProductUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setProductImageDataUrl(dataUrl)
    setSelectedProductUrls([])
  }

  function toggleClientProductUrl(url) {
    setSelectedProductUrls(prev => {
      if (prev.includes(url)) return prev.filter(u => u !== url)
      if (prev.length >= 4) return prev
      return [...prev, url]
    })
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
      { status: 'waiting', title: '', message: 'Waiting...' },
      { status: 'waiting', title: '', message: 'Waiting...' },
    ])

    try {
      // Step 1: Analyze website + generate 4 concepts via Claude directly
      setOverallMessage('Analyzing brand and generating 4 campaign concepts...')

      const analyzeRes = await fetch('/api/campaign/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, productName, offerNotes }),
      })
      const analyzeJson = await analyzeRes.json()
      if (!analyzeJson.success) throw new Error(analyzeJson.error)
      const analysis = analyzeJson.analysis

      const conceptsRes = await fetch('/api/campaign/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          creativeKeywords: creativeKeywords.split(',').map(k => k.trim()).filter(Boolean),
          count: 4,
          previousConcepts: [],
        }),
      })
      const conceptsJson = await conceptsRes.json()
      if (!conceptsJson.success) throw new Error(conceptsJson.error)
      const concepts = conceptsJson.concepts

      // Show concept titles
      setConceptProgress(concepts.map((c, i) => ({
        status: 'building',
        title: c.title,
        message: 'Building...'
      })))

      setOverallMessage('Building all 4 campaigns in parallel...')

      // Step 2: Build all 4 concepts in parallel — one API call per concept
      const buildPromises = concepts.map(async (concept, conceptIdx) => {
        try {
          setConceptProgress(prev => {
            const updated = [...prev]
            updated[conceptIdx] = { ...updated[conceptIdx], status: 'building', message: 'Generating script, avatar & scenes...' }
            return updated
          })

          const res = await fetch('/api/campaign/sample-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: selectedClientId,
              analysis,
              concept,
              conceptIdx,
              websiteUrl,
              productName,
              offerNotes,
              creativeKeywords,
              aspectRatio,
              imageSize: '1K',
            }),
          })

          const json = await res.json()
          if (!json.success) throw new Error(json.error)

          setConceptProgress(prev => {
            const updated = [...prev]
            updated[conceptIdx] = { status: 'done', title: concept.title, message: 'Complete ✓' }
            return updated
          })

          return json.campaignId
        } catch (e) {
          console.error(`Concept ${conceptIdx} failed:`, e.message)
          setConceptProgress(prev => {
            const updated = [...prev]
            updated[conceptIdx] = { status: 'error', title: concept.title, message: e.message }
            return updated
          })
          return null
        }
      })

      await Promise.allSettled(buildPromises)
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
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shell { min-height: 100vh; }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 1px solid #1a1a1a; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-mark { width: 28px; height: 28px; background: #FFD60A; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0a0a0a; }
        .logo-text { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
        .logo-text span { color: #FFD60A; }
        .nav { display: flex; gap: 12px; }
        .nav-link { font-size: 12px; color: #555; text-decoration: none; padding: 6px 12px; border-radius: 6px; border: 1px solid #222; transition: all 0.15s; }
        .nav-link:hover { color: #aaa; border-color: #333; }
        .container { max-width: 680px; margin: 60px auto; padding: 0 40px; width: 100%; animation: fadeIn 0.3s ease; }
        .eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD60A; font-weight: 600; margin-bottom: 10px; }
        .title { font-size: 36px; font-weight: 800; color: #f0f0f0; margin-bottom: 8px; line-height: 1.2; }
        .subtitle { font-size: 14px; color: #555; margin-bottom: 40px; line-height: 1.6; }
        .cost-badge { display: inline-flex; align-items: center; gap: 6px; background: #111; border: 1px solid #1e1e1e; border-radius: 100px; padding: 5px 12px; font-size: 11px; color: #555; margin-bottom: 32px; }
        .cost-badge span { color: #FFD60A; font-weight: 600; }
        .section { margin-bottom: 24px; }
        .label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; margin-bottom: 8px; display: block; }
        .input, .textarea { background: #111; border: 1px solid #222; border-radius: 8px; color: #e8e8e8; font-size: 14px; padding: 12px 16px; outline: none; transition: border-color 0.15s; font-family: inherit; width: 100%; }
        .input:focus, .textarea:focus { border-color: #FFD60A44; }
        .textarea { resize: vertical; min-height: 72px; }
        .hint { font-size: 11px; color: #444; margin-top: 6px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .client-box { background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
        .client-box-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; margin-bottom: 10px; }
        .pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill { padding: 7px 14px; border-radius: 100px; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .pill:hover { border-color: #444; color: #aaa; }
        .pill.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A11; }
        .aspect-row { display: flex; gap: 10px; }
        .aspect-btn { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2a; background: transparent; color: #555; font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .aspect-btn:hover { border-color: #444; }
        .aspect-btn.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A08; }
        .product-picker { background: #0e0e0e; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px; }
        .product-picker-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 12px; font-weight: 600; display: flex; justify-content: space-between; }
        .product-picker-count { color: #FFD60A; }
        .product-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 12px; }
        .product-item { position: relative; border-radius: 8px; overflow: hidden; border: 2px solid #1e1e1e; cursor: pointer; transition: all 0.2s; aspect-ratio: 1; }
        .product-item:hover { border-color: #444; }
        .product-item.selected { border-color: #FFD60A; }
        .product-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .product-item-check { position: absolute; top: 3px; right: 3px; width: 16px; height: 16px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: #0a0a0a; }
        .divider { height: 1px; background: #1e1e1e; margin: 12px 0; }
        .product-own { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .product-own-preview { width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: #1a1a1a; border: 1px solid #222; }
        .product-own-placeholder { width: 44px; height: 44px; border-radius: 8px; background: #1a1a1a; border: 1px dashed #2a2a2a; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .product-own-text { flex: 1; font-size: 12px; color: #666; }
        .product-own-btn { font-size: 11px; color: #FFD60A; border: 1px solid #FFD60A44; border-radius: 6px; padding: 5px 10px; background: transparent; cursor: pointer; font-family: inherit; }
        .error-bar { background: #2a1010; border: 1px solid #5a1a1a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #ff6b6b; margin-bottom: 20px; }
        .gen-btn { width: 100%; padding: 18px; background: #FFD60A; color: #0a0a0a; border: none; border-radius: 10px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.15s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 28px; }
        .gen-btn:hover { background: #ffe033; transform: translateY(-1px); }
        .gen-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .gen-btn-sub { font-size: 11px; opacity: 0.6; font-weight: 400; }
        /* Generating */
        .gen-container { max-width: 680px; margin: 60px auto; padding: 0 40px; animation: fadeIn 0.3s ease; }
        .gen-header { text-align: center; margin-bottom: 40px; }
        .spinner { width: 52px; height: 52px; border: 2px solid #FFD60A22; border-top-color: #FFD60A; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 18px; }
        .gen-title { font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
        .gen-sub { font-size: 13px; color: #555; }
        .progress-bar-wrap { background: #1a1a1a; border-radius: 100px; height: 3px; margin: 20px 0; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #FFD60A; border-radius: 100px; transition: width 0.5s; }
        .concept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .concept-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 18px; position: relative; overflow: hidden; transition: border-color 0.3s; }
        .concept-card.building { border-color: #FFD60A44; }
        .concept-card.done { border-color: #4ade8044; }
        .concept-card.error { border-color: #ef444444; }
        .concept-card-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, #FFD60A06, transparent); background-size: 200% 100%; animation: shimmer 2s infinite; pointer-events: none; }
        .concept-num { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; margin-bottom: 6px; }
        .concept-title { font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 6px; min-height: 18px; }
        .concept-status { font-size: 11px; }
        .s-waiting { color: #333; }
        .s-building { color: #FFD60A; animation: pulse 1.5s infinite; }
        .s-done { color: #4ade80; }
        .s-error { color: #f87171; }
        .concept-check { position: absolute; top: 14px; right: 14px; width: 22px; height: 22px; background: #4ade8022; border: 1px solid #4ade8066; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #4ade80; }
        /* Done */
        .done-container { max-width: 520px; margin: 80px auto; padding: 0 40px; text-align: center; animation: fadeIn 0.4s ease; }
        .done-icon { font-size: 52px; margin-bottom: 20px; }
        .done-title { font-size: 28px; font-weight: 800; color: #f0f0f0; margin-bottom: 8px; }
        .done-sub { font-size: 14px; color: #555; margin-bottom: 28px; line-height: 1.6; }
        .done-btn { display: inline-block; padding: 15px 36px; background: #FFD60A; color: #0a0a0a; border: none; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; text-decoration: none; transition: all 0.15s; }
        .done-btn:hover { background: #ffe033; }
        .done-link { display: block; margin-top: 14px; font-size: 12px; color: #444; text-decoration: none; cursor: pointer; }
        .done-link:hover { color: #666; }
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

        {/* INPUT */}
        {phase === 'input' && (
          <div className="container">
            <p className="eyebrow">Sample Brief Machine</p>
            <h1 className="title">Auto-Generate 4 Sample Briefs</h1>
            <p className="subtitle">One click. Four complete campaign concepts with scripts, avatars and storyboards — built for prospecting at scale.</p>

            <div className="cost-badge">
              1K resolution · <span>~$2.20 per run</span> · ~3 min
            </div>

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

            <div className="grid2" style={{marginBottom:20}}>
              <div className="section" style={{marginBottom:0}}>
                <label className="label">Website URL</label>
                <input className="input" type="url" placeholder="https://yourbrand.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
              </div>
              <div className="section" style={{marginBottom:0}}>
                <label className="label">Product / Service</label>
                <input className="input" placeholder="What are we advertising?" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
            </div>

            <div className="section">
              <label className="label">Offer or Context <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <textarea className="textarea" placeholder="Specific offer, launch, or campaign context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Creative Keywords <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <input className="input" placeholder="cinematic, premium, transformation..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
              <p className="hint">Steers creative direction across all 4 concepts</p>
            </div>

            <div className="section">
              <label className="label">Format</label>
              <div className="aspect-row">
                <button className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>🖥 16:9 Landscape</button>
                <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>📱 9:16 Vertical</button>
              </div>
            </div>

            <div className="section">
              <label className="label">Product Images <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <div className="product-picker">
                {clientProductImages.length > 0 && (
                  <>
                    <div className="product-picker-label">
                      <span>From Client Onboarding</span>
                      <span className="product-picker-count">{selectedProductUrls.length}/4 selected</span>
                    </div>
                    <div className="product-picker-grid">
                      {clientProductImages.map((url, i) => (
                        <div key={i} className={`product-item ${selectedProductUrls.includes(url) ? 'selected' : ''}`} onClick={() => toggleClientProductUrl(url)}>
                          <img src={url} alt={`Product ${i+1}`} />
                          {selectedProductUrls.includes(url) && <div className="product-item-check">{selectedProductUrls.indexOf(url)+1}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="divider" />
                  </>
                )}
                <div className="product-own" onClick={() => productInputRef.current?.click()}>
                  {productImageDataUrl
                    ? <img src={productImageDataUrl} alt="Uploaded" className="product-own-preview" />
                    : <div className="product-own-placeholder">📦</div>
                  }
                  <span className="product-own-text">
                    {productImageDataUrl ? 'Custom image uploaded' : clientProductImages.length > 0 ? 'Or upload your own' : 'Upload a product photo'}
                  </span>
                  <button className="product-own-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>
                    {productImageDataUrl ? 'Change' : 'Upload'}
                  </button>
                </div>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />
            </div>

            <button className="gen-btn" disabled={!selectedClientId || (!websiteUrl && !productName)} onClick={handleGenerate}>
              ⚡ Generate 4 Sample Briefs
              <span className="gen-btn-sub">~$2.20 · 1K · ~3 min</span>
            </button>
          </div>
        )}

        {/* GENERATING */}
        {phase === 'generating' && (
          <div className="gen-container">
            <div className="gen-header">
              <div className="spinner" />
              <h2 className="gen-title">Building 4 sample briefs...</h2>
              <p className="gen-sub">{overallMessage || 'All 4 concepts generating in parallel'}</p>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${(completedCount / 4) * 100}%` }} />
            </div>
            <p style={{fontSize:11,color:'#444',marginBottom:20,textAlign:'center'}}>{completedCount} of 4 complete</p>

            <div className="concept-grid">
              {conceptProgress.map((cp, i) => (
                <div key={i} className={`concept-card ${cp.status}`}>
                  {cp.status === 'building' && <div className="concept-card-shimmer" />}
                  <p className="concept-num">Concept {i+1}</p>
                  <p className="concept-title">{cp.title || '—'}</p>
                  <p className={`concept-status s-${cp.status}`}>
                    {cp.status === 'waiting' ? 'Waiting...' :
                     cp.status === 'building' ? '● Generating...' :
                     cp.status === 'done' ? '✓ Complete' : `✕ ${cp.message}`}
                  </p>
                  {cp.status === 'done' && <div className="concept-check">✓</div>}
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
            <a href={`/brief/${doneClientId}`} className="done-btn">Open Sample Brief ↗</a>
            <button className="done-link" onClick={() => { setPhase('input'); setDoneClientId(null) }}>Generate another</button>
          </div>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div className="done-container">
            <div className="done-icon">⚠️</div>
            <h2 className="done-title">Something went wrong</h2>
            <p className="done-sub">{error}</p>
            <button className="done-btn" onClick={() => { setPhase('input'); setError(null) }}>Try Again</button>
          </div>
        )}
      </div>
    </>
  )
}
