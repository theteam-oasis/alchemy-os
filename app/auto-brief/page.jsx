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

const STAGES = [
  { key: 'analyzing', label: 'Analyzing brand', icon: '🔍' },
  { key: 'concepts', label: 'Building 4 campaign concepts', icon: '💡' },
  { key: 'images', label: 'Generating avatars', icon: '👤' },
  { key: 'scenes', label: 'Building storyboards', icon: '🎬' },
  { key: 'saving', label: 'Saving to database', icon: '💾' },
]

export default function AutoBriefPage() {
  const [phase, setPhase] = useState('input') // input | generating | done | error
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [productImageDataUrl, setProductImageDataUrl] = useState(null)
  const [progress, setProgress] = useState([])
  const [conceptProgress, setConceptProgress] = useState([null, null, null, null])
  const [currentStage, setCurrentStage] = useState('')
  const [error, setError] = useState(null)
  const [doneClientId, setDoneClientId] = useState(null)
  const productInputRef = useRef(null)

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  useEffect(() => {
    if (!selectedClientId) return
    supabase.from('brand_intake').select('website, brand_name').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.website) setWebsiteUrl(data.website)
          if (data.brand_name) setProductName(data.brand_name)
        }
      })
  }, [selectedClientId])

  async function handleProductUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setProductImageDataUrl(dataUrl)
  }

  async function handleGenerate() {
    if (!selectedClientId && !productName) {
      setError('Select a client or enter a product name.')
      return
    }

    // If no client selected, we need one — create a temp approach
    const clientId = selectedClientId
    if (!clientId) {
      setError('Please select a client to link the briefs to.')
      return
    }

    setPhase('generating')
    setProgress([])
    setConceptProgress([null, null, null, null])
    setError(null)

    try {
      const res = await fetch('/api/campaign/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          websiteUrl,
          productName,
          offerNotes,
          creativeKeywords,
          aspectRatio,
        }),
      })

      if (!res.ok) throw new Error('Generation failed to start')
      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.step) {
                setCurrentStage(data.step)
                setProgress(prev => [...prev, { 
                  time: new Date().toLocaleTimeString(), 
                  message: data.message,
                  conceptIdx: data.conceptIdx
                }])
              }

              if (data.conceptTitle !== undefined) {
                // concept_complete event
                setConceptProgress(prev => {
                  const updated = [...prev]
                  updated[data.conceptIdx] = { title: data.conceptTitle, status: 'done' }
                  return updated
                })
              }

              if (data.error && data.conceptIdx !== undefined) {
                setConceptProgress(prev => {
                  const updated = [...prev]
                  updated[data.conceptIdx] = { title: `Concept ${data.conceptIdx + 1}`, status: 'error' }
                  return updated
                })
              }

              if (data.clientId && data.successCount !== undefined) {
                // complete event
                setDoneClientId(data.clientId)
                setPhase('done')
              }

              if (data.message && !data.step && !data.clientId) {
                setError(data.message)
                setPhase('error')
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans','SF Pro Display',-apple-system,sans-serif; min-height: 100vh; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .shell { min-height: 100vh; display: flex; flex-direction: column; }

        /* Header */
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 1px solid #1a1a1a; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-mark { width: 28px; height: 28px; background: #FFD60A; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0a0a0a; }
        .logo-text { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
        .logo-text span { color: #FFD60A; }
        .header-nav { display: flex; gap: 16px; }
        .nav-link { font-size: 12px; color: #555; text-decoration: none; padding: 6px 12px; border-radius: 6px; border: 1px solid #222; transition: all 0.15s; }
        .nav-link:hover { color: #aaa; border-color: #333; }

        /* Input phase */
        .input-container { max-width: 680px; margin: 60px auto; padding: 0 40px; width: 100%; animation: fadeIn 0.3s ease; }
        .page-eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD60A; font-weight: 600; margin-bottom: 10px; }
        .page-title { font-size: 36px; font-weight: 800; color: #f0f0f0; margin-bottom: 8px; line-height: 1.2; }
        .page-sub { font-size: 14px; color: #555; margin-bottom: 40px; line-height: 1.6; }

        .form-section { margin-bottom: 28px; }
        .form-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; margin-bottom: 8px; display: block; }
        .form-input, .form-textarea { background: #111; border: 1px solid #222; border-radius: 8px; color: #e8e8e8; font-size: 14px; padding: 12px 16px; outline: none; transition: border-color 0.15s; font-family: inherit; width: 100%; }
        .form-input:focus, .form-textarea:focus { border-color: #FFD60A44; }
        .form-textarea { resize: vertical; min-height: 80px; }
        .form-hint { font-size: 11px; color: #444; margin-top: 6px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* Client pills */
        .client-box { background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px; margin-bottom: 28px; }
        .client-box-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; margin-bottom: 12px; }
        .client-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .client-pill { padding: 7px 14px; border-radius: 100px; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .client-pill:hover { border-color: #444; color: #aaa; }
        .client-pill.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A11; }

        /* Aspect toggle */
        .aspect-row { display: flex; gap: 10px; }
        .aspect-btn { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2a; background: transparent; color: #555; font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .aspect-btn:hover { border-color: #444; }
        .aspect-btn.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A08; }

        /* Product upload */
        .product-upload { border: 1px dashed #2a2a2a; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.15s; background: #0e0e0e; }
        .product-upload:hover { border-color: #444; }
        .product-upload.has-img { border-color: #FFD60A44; }
        .product-preview { width: 52px; height: 52px; border-radius: 8px; object-fit: contain; background: #1a1a1a; }
        .product-placeholder { width: 52px; height: 52px; border-radius: 8px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .product-text { flex: 1; }
        .product-title { font-size: 13px; color: #888; font-weight: 500; }
        .product-sub { font-size: 11px; color: #444; margin-top: 2px; }
        .product-btn { font-size: 11px; color: #FFD60A; border: 1px solid #FFD60A44; border-radius: 6px; padding: 5px 10px; background: transparent; cursor: pointer; font-family: inherit; white-space: nowrap; }

        /* Generate button */
        .generate-btn { width: 100%; padding: 18px; background: #FFD60A; color: #0a0a0a; border: none; border-radius: 10px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.15s; font-family: inherit; letter-spacing: 0.02em; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 32px; }
        .generate-btn:hover { background: #ffe033; transform: translateY(-1px); }
        .generate-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .generate-btn-cost { font-size: 11px; opacity: 0.6; font-weight: 400; }

        /* Error */
        .error-bar { background: #2a1010; border: 1px solid #5a1a1a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #ff6b6b; margin-bottom: 20px; }

        /* Generating phase */
        .generating-container { max-width: 680px; margin: 60px auto; padding: 0 40px; width: 100%; animation: fadeIn 0.3s ease; }
        .generating-header { text-align: center; margin-bottom: 48px; }
        .generating-spinner { width: 56px; height: 56px; border: 2px solid #FFD60A22; border-top-color: #FFD60A; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        .generating-title { font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
        .generating-sub { font-size: 13px; color: #555; }

        /* Concept progress cards */
        .concept-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px; }
        .concept-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
        .concept-card.done { border-color: #FFD60A44; }
        .concept-card.error { border-color: #5a1a1a; }
        .concept-card-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, #FFD60A08 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 2s infinite; }
        .concept-card-num { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; margin-bottom: 8px; }
        .concept-card-title { font-size: 14px; font-weight: 600; color: #f0f0f0; margin-bottom: 4px; min-height: 20px; }
        .concept-card-status { font-size: 11px; }
        .status-building { color: #FFD60A; animation: pulse 1.5s infinite; }
        .status-done { color: #4ade80; }
        .status-error { color: #f87171; }
        .status-waiting { color: #444; }
        .concept-card-check { position: absolute; top: 16px; right: 16px; width: 24px; height: 24px; background: #4ade8022; border: 1px solid #4ade8066; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #4ade80; }

        /* Live log */
        .live-log { background: #0e0e0e; border: 1px solid #1a1a1a; border-radius: 10px; padding: 16px; max-height: 200px; overflow-y: auto; }
        .live-log-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; margin-bottom: 12px; }
        .log-item { display: flex; gap: 10px; margin-bottom: 8px; animation: fadeIn 0.2s ease; }
        .log-time { font-size: 10px; color: #333; white-space: nowrap; padding-top: 1px; }
        .log-msg { font-size: 12px; color: #666; line-height: 1.4; }
        .log-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFD60A; margin-top: 5px; flex-shrink: 0; }

        /* Done phase */
        .done-container { max-width: 560px; margin: 80px auto; padding: 0 40px; text-align: center; animation: fadeIn 0.4s ease; }
        .done-icon { font-size: 56px; margin-bottom: 24px; }
        .done-title { font-size: 28px; font-weight: 800; color: #f0f0f0; margin-bottom: 8px; }
        .done-sub { font-size: 14px; color: #555; margin-bottom: 32px; line-height: 1.6; }
        .done-btn { display: inline-block; padding: 16px 40px; background: #FFD60A; color: #0a0a0a; border: none; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; text-decoration: none; transition: all 0.15s; }
        .done-btn:hover { background: #ffe033; transform: translateY(-1px); }
        .done-secondary { display: inline-block; margin-top: 16px; font-size: 13px; color: #555; cursor: pointer; text-decoration: none; }
        .done-secondary:hover { color: #888; }
      `}</style>

      <div className="shell">
        <header className="header">
          <div className="logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <span>Auto Brief</span></span>
          </div>
          <div className="header-nav">
            <a href="/campaign-builder" className="nav-link">Manual Builder</a>
          </div>
        </header>

        {/* INPUT PHASE */}
        {phase === 'input' && (
          <div className="input-container">
            <p className="page-eyebrow">One-Click Brief Machine</p>
            <h1 className="page-title">Auto-Generate 4 Concepts</h1>
            <p className="page-sub">Enter brand details and we'll automatically build 4 complete campaign briefs — concepts, scripts, avatars, and full storyboards — ready for client review.</p>

            {error && <div className="error-bar">⚠ {error}</div>}

            {/* Client selector */}
            {clients.length > 0 && (
              <div className="client-box">
                <p className="client-box-label">Select Client</p>
                <div className="client-pills">
                  {clients.map(c => (
                    <button key={c.id} className={`client-pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-grid" style={{marginBottom:20}}>
              <div className="form-section" style={{marginBottom:0}}>
                <label className="form-label">Website URL</label>
                <input className="form-input" type="url" placeholder="https://yourbrand.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
              </div>
              <div className="form-section" style={{marginBottom:0}}>
                <label className="form-label">Product / Service</label>
                <input className="form-input" placeholder="What are we advertising?" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Offer or Context <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <textarea className="form-textarea" placeholder="Any specific offer, launch details, or campaign context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            <div className="form-section">
              <label className="form-label">Creative Keywords <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <input className="form-input" placeholder="ritual, cinematic, rebellion, luxury, transformation..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
              <p className="form-hint">Comma-separated — steers creative direction across all 4 concepts</p>
            </div>

            <div className="form-section">
              <label className="form-label">Video Format</label>
              <div className="aspect-row">
                <button className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>🖥 16:9 — Landscape</button>
                <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>📱 9:16 — Vertical</button>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Product Image <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
              <div className={`product-upload ${productImageDataUrl ? 'has-img' : ''}`} onClick={() => productInputRef.current?.click()}>
                {productImageDataUrl
                  ? <img src={productImageDataUrl} alt="Product" className="product-preview" />
                  : <div className="product-placeholder">📦</div>
                }
                <div className="product-text">
                  <p className="product-title">{productImageDataUrl ? 'Product image ready' : 'Upload product photo'}</p>
                  <p className="product-sub">Used as visual reference across all storyboard scenes</p>
                </div>
                <button className="product-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>
                  {productImageDataUrl ? 'Change' : 'Upload'}
                </button>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />
            </div>

            <button className="generate-btn" disabled={!selectedClientId || (!websiteUrl && !productName)} onClick={handleGenerate}>
              ⚡ Auto-Generate 4 Briefs
              <span className="generate-btn-cost">~$4.30 · ~3-5 min</span>
            </button>
          </div>
        )}

        {/* GENERATING PHASE */}
        {phase === 'generating' && (
          <div className="generating-container">
            <div className="generating-header">
              <div className="generating-spinner" />
              <h2 className="generating-title">Building your briefs...</h2>
              <p className="generating-sub">All 4 concepts are generating in parallel. This takes 3-5 minutes.</p>
            </div>

            {/* 4 concept cards */}
            <div className="concept-cards">
              {[0,1,2,3].map(i => {
                const cp = conceptProgress[i]
                return (
                  <div key={i} className={`concept-card ${cp?.status === 'done' ? 'done' : cp?.status === 'error' ? 'error' : ''}`}>
                    {!cp && <div className="concept-card-shimmer" />}
                    <p className="concept-card-num">Concept {i+1}</p>
                    <p className="concept-card-title">{cp?.title || '—'}</p>
                    <p className={`concept-card-status ${
                      !cp ? 'status-waiting' :
                      cp.status === 'done' ? 'status-done' :
                      cp.status === 'error' ? 'status-error' : 'status-building'
                    }`}>
                      {!cp ? 'Waiting...' :
                       cp.status === 'done' ? '✓ Complete' :
                       cp.status === 'error' ? '✕ Failed' : '● Building...'}
                    </p>
                    {cp?.status === 'done' && <div className="concept-card-check">✓</div>}
                  </div>
                )
              })}
            </div>

            {/* Live log */}
            <div className="live-log">
              <p className="live-log-title">Live Progress</p>
              {progress.slice(-8).map((p, i) => (
                <div key={i} className="log-item">
                  <div className="log-dot" />
                  <span className="log-time">{p.time}</span>
                  <span className="log-msg">{p.message}</span>
                </div>
              ))}
              {progress.length === 0 && <p className="log-msg" style={{color:'#333'}}>Starting...</p>}
            </div>
          </div>
        )}

        {/* DONE PHASE */}
        {phase === 'done' && (
          <div className="done-container">
            <div className="done-icon">🎬</div>
            <h2 className="done-title">Briefs ready.</h2>
            <p className="done-sub">
              4 complete campaign concepts have been built and saved. Your client brief is ready to share.
            </p>
            <a href={`/brief/${doneClientId}`} className="done-btn">
              Open Client Brief ↗
            </a>
            <br />
            <a href={`/brief/${doneClientId}`} target="_blank" rel="noopener noreferrer" className="done-secondary">
              Copy shareable link →
            </a>
            <br />
            <button className="done-secondary" style={{background:'none',border:'none',cursor:'pointer',marginTop:8}} onClick={() => {
              setPhase('input')
              setProgress([])
              setConceptProgress([null,null,null,null])
              setDoneClientId(null)
            }}>
              Generate new briefs
            </button>
          </div>
        )}

        {/* ERROR PHASE */}
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
