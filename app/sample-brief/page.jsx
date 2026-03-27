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
  const [productPageUrl, setProductPageUrl] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [extractedImages, setExtractedImages] = useState([])
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState(null)
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

  useEffect(() => {
    if (!selectedClientId) return
    supabase.from('brand_intake').select('website').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => { if (data?.website && !productPageUrl) setProductPageUrl(data.website) })
  }, [selectedClientId])

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
        setSelectedImageUrl(json.productImages[0])
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
      setOverallMessage('Analyzing product page...')
      const analyzeRes = await fetch('/api/campaign/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPageUrl, offerNotes }),
      })
      const analyzeJson = await analyzeRes.json()
      if (!analyzeJson.success) throw new Error(analyzeJson.error)
      const analysis = analyzeJson.analysis
      if (analyzeJson.productImages?.length && !extractedImages.length) {
        setExtractedImages(analyzeJson.productImages)
        if (!selectedImageUrl && !uploadedImageDataUrl) setSelectedImageUrl(analyzeJson.productImages[0])
      }
      setAnalysis(analysis)
      setPhase('generating')
      setOverallMessage(`Building concepts for ${analysis.brandName || 'brand'}...`)
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
      const clientId = selectedClientId || null
      const clientName = selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : analysis.brandName || 'Brand'
      await Promise.allSettled(concepts.map(async (concept, idx) => {
        try {
          const res = await fetch('/api/campaign/sample-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId, clientName, analysis, concept, conceptIdx: idx,
              productPageUrl, offerNotes, aspectRatio,
              productImageUrl: selectedImageUrl || null,
              uploadedProductImage: uploadedImageDataUrl || null,
            }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)
          setConceptProgress(prev => { const u = [...prev]; u[idx] = { status: 'done', title: concept.title, message: 'Done' }; return u })
          if (json.clientSlug && !doneSlug) setDoneSlug(json.clientSlug)
          if (json.clientId && !doneClientId) setDoneClientId(json.clientId)
        } catch (e) {
          setConceptProgress(prev => { const u = [...prev]; u[idx] = { status: 'error', title: concept.title, message: e.message }; return u })
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,200;0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@300;400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080B14; color: rgba(255,255,255,0.92); font-family: 'DM Sans', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

        /* Ambient */
        .canvas { min-height: 100vh; position: relative; }
        .canvas::before {
          content: '';
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 15% 15%, rgba(124,58,237,0.07) 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 85% 75%, rgba(20,40,100,0.10) 0%, transparent 55%);
          animation: drift 20s ease-in-out infinite alternate;
          pointer-events: none; z-index: 0;
        }
        @keyframes drift {
          0% { transform: translate(0,0) scale(1); }
          50% { transform: translate(1.5%,1%) scale(1.02); }
          100% { transform: translate(-1%,1.5%) scale(0.99); }
        }

        /* Nav */
        .nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 60px;
          background: rgba(8,11,20,0.75);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-mark {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #7C3AED, #A855F7);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: white;
          box-shadow: 0 0 20px rgba(124,58,237,0.4);
        }
        .logo-text { font-size: 12px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.45); }
        .logo-text b { color: rgba(255,255,255,0.88); font-weight: 500; }
        .nav-links { display: flex; gap: 2px; }
        .nav-link { font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; padding: 6px 12px; border-radius: 8px; transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .nav-link:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); }

        /* Page */
        .page { max-width: 560px; margin: 0 auto; padding: 56px 24px 80px; position: relative; z-index: 1; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        /* Header */
        .page-eyebrow { font-size: 10px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: #7C3AED; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .page-eyebrow::before { content: ''; width: 18px; height: 1px; background: #7C3AED; opacity: 0.6; }
        .page-title { font-size: 36px; font-weight: 300; color: rgba(255,255,255,0.95); line-height: 1.15; margin-bottom: 10px; letter-spacing: -0.02em; }
        .page-title strong { font-weight: 500; }
        .page-sub { font-size: 14px; color: rgba(255,255,255,0.35); line-height: 1.65; margin-bottom: 20px; }
        .meta-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px; padding: 5px 14px; font-size: 11px;
          color: rgba(255,255,255,0.3); margin-bottom: 36px;
        }
        .meta-badge span { color: rgba(255,255,255,0.55); }

        /* Glass card */
        .card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.45);
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        /* Section */
        .section { margin-bottom: 20px; }
        .label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.28); margin-bottom: 8px; display: block; }
        .label-sub { font-weight: 400; text-transform: none; letter-spacing: 0; color: rgba(255,255,255,0.2); margin-left: 6px; font-size: 10px; }

        /* Input */
        .input-wrap { position: relative; }
        .input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; color: rgba(255,255,255,0.9); font-family: 'DM Sans',sans-serif;
          font-size: 14px; padding: 12px 16px; outline: none; width: 100%;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        .input:focus { border-color: rgba(124,58,237,0.45); background: rgba(255,255,255,0.05); box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
        .input::placeholder { color: rgba(255,255,255,0.18); }
        .textarea { resize: vertical; min-height: 80px; }
        .input-status { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 5px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 11px; height: 11px; border: 1.5px solid rgba(124,58,237,0.2); border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .hint { font-size: 11px; color: rgba(255,255,255,0.2); margin-top: 6px; }

        /* Image picker */
        .img-picker { padding: 18px; }
        .img-picker-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.25); font-weight: 500; }
        .img-picker-count { color: #7C3AED; font-size: 10px; }
        .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 14px; }
        .img-item {
          aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.06); transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          background: rgba(255,255,255,0.03);
        }
        .img-item:hover { border-color: rgba(255,255,255,0.15); transform: scale(1.03); }
        .img-item.selected { border-color: #7C3AED; box-shadow: 0 0 0 1px #7C3AED, 0 0 16px rgba(124,58,237,0.3); }
        .img-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .shimmer-box { background: linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%); background-size:200% 100%; animation:shimmer 1.8s ease-in-out infinite; border-radius:8px; }
        .img-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 14px 0; }
        .upload-row { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px; border-radius: 10px; transition: all 0.2s; }
        .upload-row:hover { background: rgba(255,255,255,0.03); }
        .upload-thumb { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .upload-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .upload-text { flex: 1; font-size: 12px; color: rgba(255,255,255,0.3); }
        .upload-btn { font-size: 11px; color: #7C3AED; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.25); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .upload-btn:hover { background: rgba(124,58,237,0.18); }
        .selected-preview { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.2); border-radius: 10px; margin-top: 10px; }
        .selected-preview img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }
        .selected-preview-text { flex: 1; font-size: 12px; color: rgba(255,255,255,0.5); }
        .selected-preview-clear { background: none; border: none; color: rgba(255,255,255,0.2); cursor: pointer; font-size: 14px; padding: 2px; }

        /* Aspect ratio */
        .aspect-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .aspect-btn { padding: 12px; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.35); font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s cubic-bezier(0.22,1,0.36,1); display: flex; align-items: center; justify-content: center; gap: 6px; }
        .aspect-btn:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
        .aspect-btn.active { border-color: rgba(124,58,237,0.5); background: rgba(124,58,237,0.08); color: rgba(255,255,255,0.9); box-shadow: 0 0 0 1px rgba(124,58,237,0.2); }

        /* Client section */
        .client-section { padding: 16px 20px; }
        .client-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.2); font-weight: 500; margin-bottom: 12px; }
        .pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .pill { padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.35); font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .pill:hover { border-color: rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); }
        .pill.active { border-color: rgba(124,58,237,0.5); color: rgba(255,255,255,0.9); background: rgba(124,58,237,0.1); }

        /* Error */
        .error-bar { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: rgba(239,68,68,0.9); margin-bottom: 20px; }

        /* Generate button */
        .gen-btn {
          width: 100%; padding: 16px; margin-top: 24px;
          background: linear-gradient(135deg, #7C3AED, #9333EA);
          border: none; border-radius: 12px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 0 32px rgba(124,58,237,0.3), 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center; gap: 10px;
          letter-spacing: 0.01em;
        }
        .gen-btn:hover { box-shadow: 0 0 48px rgba(124,58,237,0.45), 0 4px 16px rgba(0,0,0,0.4); transform: translateY(-1px); filter: brightness(1.08); }
        .gen-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }
        .gen-btn-meta { font-size: 11px; opacity: 0.55; font-weight: 400; }

        /* Analyzing/Generating */
        .gen-container { max-width: 500px; margin: 80px auto; padding: 0 24px; position: relative; z-index: 1; }
        .gen-header { text-align: center; margin-bottom: 40px; }
        .gen-spinner { width: 48px; height: 48px; border: 1.5px solid rgba(124,58,237,0.15); border-top-color: #7C3AED; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        .gen-title { font-size: 22px; font-weight: 300; color: rgba(255,255,255,0.9); margin-bottom: 6px; letter-spacing: -0.01em; }
        .gen-sub { font-size: 13px; color: rgba(255,255,255,0.3); }
        .progress-track { height: 1px; background: rgba(255,255,255,0.06); border-radius: 1px; margin: 20px 0; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7C3AED, #A855F7); border-radius: 1px; transition: width 0.6s cubic-bezier(0.22,1,0.36,1); box-shadow: 0 0 8px rgba(124,58,237,0.5); }
        .concept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .concept-card { padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.025); position: relative; overflow: hidden; transition: all 0.3s; }
        .concept-card.building { border-color: rgba(124,58,237,0.25); }
        .concept-card.done { border-color: rgba(16,185,129,0.25); background: rgba(16,185,129,0.04); }
        .concept-card.error { border-color: rgba(239,68,68,0.2); }
        .concept-card::before { content:''; position:absolute; top:0;left:10%;right:10%;height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent); }
        .concept-card-shimmer { position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(124,58,237,0.05),transparent);background-size:200% 100%;animation:shimmer 2.5s ease-in-out infinite;pointer-events:none; }
        .cc-num { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 6px; }
        .cc-title { font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.8); margin-bottom: 5px; min-height: 16px; line-height: 1.4; }
        .cc-status { font-size: 11px; }
        .s-waiting { color: rgba(255,255,255,0.2); }
        .s-building { color: #7C3AED; }
        .s-done { color: #10B981; }
        .s-error { color: #EF4444; font-size: 10px; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        .s-building { animation: pulse 1.8s ease-in-out infinite; }

        /* Done */
        .done-container { max-width: 420px; margin: 100px auto; padding: 0 24px; text-align: center; position: relative; z-index: 1; animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1); }
        .done-icon { font-size: 44px; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(124,58,237,0.4)); }
        .done-title { font-size: 28px; font-weight: 300; color: rgba(255,255,255,0.92); margin-bottom: 8px; letter-spacing: -0.02em; }
        .done-sub { font-size: 14px; color: rgba(255,255,255,0.3); line-height: 1.65; margin-bottom: 32px; }
        .done-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 36px; background: linear-gradient(135deg,#7C3AED,#9333EA); border: none; border-radius: 12px; color: white; font-family:inherit; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; box-shadow: 0 0 32px rgba(124,58,237,0.35); transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .done-btn:hover { box-shadow: 0 0 48px rgba(124,58,237,0.5); transform: translateY(-1px); filter: brightness(1.08); }
        .done-link { display: block; margin-top: 16px; font-size: 12px; color: rgba(255,255,255,0.2); cursor: pointer; background: none; border: none; font-family: inherit; transition: color 0.2s; }
        .done-link:hover { color: rgba(255,255,255,0.45); }
      `}</style>

      <div className="canvas">
        {/* NAV */}
        <nav className="nav">
          <a href="/" className="logo">
            <div className="logo-mark">A</div>
            <span className="logo-text"><b>Alchemy</b> OS</span>
          </a>
          <div className="nav-links">
            <a href="/clients" className="nav-link">CRM</a>
            <a href="/campaign-builder" className="nav-link">Builder</a>
            <a href="/auto-brief" className="nav-link">Full Brief</a>
          </div>
        </nav>

        {/* INPUT */}
        {(phase === 'input' || phase === 'error') && (
          <div className="page fade-up">
            <p className="page-eyebrow">Sample Brief Machine</p>
            <h1 className="page-title">2 briefs,<br /><strong>one URL.</strong></h1>
            <p className="page-sub">Paste a product page. We scrape it, extract images, and build 2 complete campaign concepts — scripts, storyboards, characters.</p>
            <div className="meta-badge">1K quality · <span>~$1.10 per run</span> · 2–3 min</div>

            {error && <div className="error-bar">⚠ {error}</div>}

            {/* URL */}
            <div className="section">
              <label className="label">Product Page URL</label>
              <div className="input-wrap">
                <input className="input" type="url" placeholder="https://brand.com/products/product-name" value={productPageUrl}
                  onChange={e => { setProductPageUrl(e.target.value); setExtractedImages([]); setSelectedImageUrl(null) }} style={{paddingRight: 100}} />
                {productPageUrl && (
                  <div className="input-status">
                    {extracting ? <><div className="spinner" /><span>Scanning</span></>
                      : extractedImages.length > 0 ? <span style={{color:'#10B981'}}>✓ {extractedImages.length} found</span>
                      : null}
                  </div>
                )}
              </div>
              <p className="hint">We scrape this page for product details, brand voice, and images</p>
            </div>

            {/* Image picker */}
            <div className="section">
              <label className="label">Product Image <span className="label-sub">auto-extracted — select or upload</span></label>
              <div className="card">
                <div className="img-picker">
                  {(extractedImages.length > 0 || extracting) && (
                    <>
                      <div className="img-picker-header">
                        <span>From Page</span>
                        {extractedImages.length > 0 && <span className="img-picker-count">{extractedImages.length} images</span>}
                      </div>
                      <div className="img-grid">
                        {extractedImages.map((url, i) => (
                          <div key={i} className={`img-item ${selectedImageUrl === url && !uploadedImageDataUrl ? 'selected' : ''}`}
                            onClick={() => { setSelectedImageUrl(url); setUploadedImageDataUrl(null) }}>
                            <img src={url} alt="" onError={e => e.target.parentElement.style.display='none'} />
                          </div>
                        ))}
                        {extracting && Array(4).fill(null).map((_, i) => <div key={i} className="shimmer-box" style={{aspectRatio:'1'}} />)}
                      </div>
                      <div className="img-divider" />
                    </>
                  )}
                  <div className="upload-row" onClick={() => productInputRef.current?.click()}>
                    <div className="upload-thumb">
                      {uploadedImageDataUrl ? <img src={uploadedImageDataUrl} alt="" /> : '📦'}
                    </div>
                    <span className="upload-text">
                      {uploadedImageDataUrl ? 'Custom image uploaded' : extractedImages.length > 0 ? 'Or upload your own' : 'Upload a product photo'}
                    </span>
                    <button className="upload-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>
                      {uploadedImageDataUrl ? 'Change' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />
              {effectiveProductImage && (
                <div className="selected-preview">
                  <img src={effectiveProductImage} alt="" />
                  <span className="selected-preview-text">{uploadedImageDataUrl ? 'Custom upload' : 'Page image'} — used in all scenes</span>
                  <button className="selected-preview-clear" onClick={() => { setSelectedImageUrl(null); setUploadedImageDataUrl(null) }}>✕</button>
                </div>
              )}
            </div>

            {/* Offer notes */}
            <div className="section">
              <label className="label">Offer or Context <span className="label-sub">optional</span></label>
              <textarea className="input textarea" placeholder="Specific offer, launch context, or campaign angle..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            {/* Keywords */}
            <div className="section">
              <label className="label">Creative Direction <span className="label-sub">optional keywords</span></label>
              <input className="input" placeholder="cinematic, intimate, transformation, ritual, luxury..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
            </div>

            {/* Format */}
            <div className="section">
              <label className="label">Format</label>
              <div className="aspect-row">
                {[['16:9','🖥','Landscape'],['9:16','📱','Vertical']].map(([val,icon,lbl]) => (
                  <button key={val} className={`aspect-btn ${aspectRatio === val ? 'active' : ''}`} onClick={() => setAspectRatio(val)}>
                    <span>{icon}</span> {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Client */}
            {clients.length > 0 && (
              <div className="section">
                <label className="label">Link to Client <span className="label-sub">optional — saves to their profile</span></label>
                <div className="card">
                  <div className="client-section">
                    <div className="pills">
                      <button className={`pill ${!selectedClientId ? 'active' : ''}`} onClick={() => setSelectedClientId(null)}>No client</button>
                      {clients.map(c => (
                        <button key={c.id} className={`pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button className="gen-btn" disabled={!productPageUrl} onClick={handleGenerate}>
              Generate 2 Sample Briefs
              <span className="gen-btn-meta">⚡ ~$1.10</span>
            </button>
          </div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div className="gen-container fade-up">
            <div className="gen-header">
              <div className="gen-spinner" />
              <h2 className="gen-title">Analyzing product page</h2>
              <p className="gen-sub">Extracting brand intelligence and visual context</p>
            </div>
          </div>
        )}

        {/* GENERATING */}
        {phase === 'generating' && (
          <div className="gen-container fade-up">
            <div className="gen-header">
              <div className="gen-spinner" />
              <h2 className="gen-title">Building briefs</h2>
              <p className="gen-sub">{overallMessage}</p>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{width:`${(completedCount/2)*100}%`}} />
            </div>
            <div className="concept-grid">
              {conceptProgress.map((cp, i) => (
                <div key={i} className={`concept-card ${cp.status}`}>
                  {cp.status === 'building' && <div className="concept-card-shimmer" />}
                  <p className="cc-num">Concept {i+1}</p>
                  <p className="cc-title">{cp.title || '—'}</p>
                  <p className={`cc-status s-${cp.status}`}>
                    {cp.status === 'waiting' ? '○ Waiting' :
                     cp.status === 'building' ? '● Generating' :
                     cp.status === 'done' ? '✓ Complete' :
                     `✕ ${cp.message?.slice(0,40)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="done-container">
            <div className="done-icon">✦</div>
            <h2 className="done-title">{completedCount} brief{completedCount !== 1 ? 's' : ''} ready.</h2>
            <p className="done-sub">Your sample campaigns are built and saved. Open the brief to preview and share with your prospect.</p>
            {slugForUrl
              ? <a href={`/${slugForUrl}/briefs`} className="done-btn">Open Brief ↗</a>
              : doneClientId ? <a href={`/brief/${doneClientId}`} className="done-btn">Open Brief ↗</a>
              : <p style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Saved — check the CRM.</p>}
            <button className="done-link" onClick={() => {
              setPhase('input'); setDoneClientId(null); setDoneSlug(null)
              setConceptProgress([{status:'waiting',title:'',message:'Waiting...'},{status:'waiting',title:'',message:'Waiting...'}])
              setAnalysis(null)
            }}>Generate another</button>
          </div>
        )}
      </div>
    </>
  )
}
