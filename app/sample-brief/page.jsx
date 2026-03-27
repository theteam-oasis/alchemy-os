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
    { status: 'waiting', title: '', message: '' },
    { status: 'waiting', title: '', message: '' },
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
      const clientName = selectedClientId
        ? clients.find(c => c.id === selectedClientId)?.name
        : analysis.brandName || 'Brand'

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
          setConceptProgress(prev => {
            const u = [...prev]
            u[idx] = { status: 'done', title: concept.title, message: 'Complete' }
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}

        body,html {
          background: #f0f2f7;
          color: #1a1a2e;
          font-family: 'DM Sans', -apple-system, sans-serif;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 100% 80% at 10% -10%, rgba(199,210,254,0.6) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 90% 110%, rgba(216,180,254,0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,255,255,0.5) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          animation: drift 25s ease-in-out infinite alternate;
        }

        @keyframes drift {
          0% { transform: scale(1) translate(0,0); opacity: 0.9; }
          50% { transform: scale(1.05) translate(-1%,1.5%); opacity: 1; }
          100% { transform: scale(1) translate(1%,-1%); opacity: 0.9; }
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .shell { min-height:100vh; position:relative; z-index:1; }

        /* Nav */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.7);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }

        .logo-mark {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: white;
          box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        }

        .logo-text { font-size: 13px; font-weight: 500; color: #1a1a2e; letter-spacing: -0.01em; }
        .logo-text em { color: rgba(26,26,46,0.4); font-style: normal; font-weight: 300; }

        .nav-links { display:flex; gap:4px; }

        .nav-link {
          font-size: 12px; font-weight: 500;
          color: rgba(26,26,46,0.45);
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        .nav-link:hover {
          color: #1a1a2e;
          background: rgba(255,255,255,0.6);
          border-color: rgba(255,255,255,0.8);
        }

        /* Container */
        .container { max-width:580px; margin:0 auto; padding:52px 24px 80px; animation:fadeUp 0.4s ease; }

        .page-eyebrow {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(99,102,241,0.8);
          margin-bottom: 12px;
        }

        .page-title {
          font-size: 36px; font-weight: 300;
          letter-spacing: -0.025em; line-height: 1.1;
          color: #0f0f23;
          margin-bottom: 10px;
        }
        .page-title strong { font-weight: 600; }

        .page-sub {
          font-size: 14px; color: rgba(26,26,46,0.5);
          line-height: 1.65; margin-bottom: 16px; font-weight: 300;
        }

        .cost-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 11px; color: rgba(26,26,46,0.45);
          margin-bottom: 40px;
        }
        .cost-pill span { color: #6366f1; font-weight: 500; }

        /* Glass card wrapper */
        .glass {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 14px;
          box-shadow: 0 4px 24px rgba(100,100,150,0.08), 0 1px 0 rgba(255,255,255,0.9) inset;
          position: relative;
          overflow: hidden;
        }
        .glass::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
        }

        .section { margin-bottom: 18px; }

        .label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(26,26,46,0.4);
          display: block; margin-bottom: 8px;
        }
        .label-note { font-size: 10px; color: rgba(26,26,46,0.25); text-transform:none; letter-spacing:0; font-weight:400; margin-left:6px; }

        /* URL input */
        .url-wrap { position:relative; }

        .input {
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 10px;
          color: #0f0f23;
          font-size: 14px;
          padding: 11px 14px;
          outline: none;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 2px 8px rgba(100,100,150,0.06);
        }
        .input::placeholder { color: rgba(26,26,46,0.3); }
        .input:focus {
          border-color: rgba(99,102,241,0.4);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 2px 8px rgba(100,100,150,0.06);
        }

        .url-badge { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:10px; display:flex; align-items:center; gap:5px; }
        .url-spinner { width:11px; height:11px; border:1.5px solid rgba(99,102,241,0.2); border-top-color:#6366f1; border-radius:50%; animation:spin 0.7s linear infinite; }
        .url-ok { color:#10b981; font-weight:600; letter-spacing:0.04em; font-size:10px; }
        .input-hint { font-size:11px; color:rgba(26,26,46,0.3); margin-top:5px; }

        /* Image picker */
        .img-card { padding:16px; }
        .img-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .img-card-label { font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(26,26,46,0.35); }
        .img-card-count { font-size:10px; color:#6366f1; font-weight:500; }
        .img-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(68px,1fr)); gap:7px; margin-bottom:12px; }
        .img-item { border-radius:8px; overflow:hidden; border:2px solid rgba(255,255,255,0.6); cursor:pointer; transition:all 0.2s; aspect-ratio:1; background:rgba(255,255,255,0.4); position:relative; }
        .img-item:hover { border-color:rgba(99,102,241,0.4); transform:translateY(-1px); box-shadow:0 4px 12px rgba(100,100,150,0.15); }
        .img-item.selected { border-color:rgba(99,102,241,0.7); box-shadow:0 0 0 1px rgba(99,102,241,0.2); }
        .img-item img { width:100%; height:100%; object-fit:cover; display:block; }
        .img-check { position:absolute; top:3px; right:3px; width:16px; height:16px; background:#6366f1; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:700; color:white; }
        .img-shimmer { aspect-ratio:1; background:linear-gradient(90deg,rgba(255,255,255,0.3) 25%,rgba(255,255,255,0.6) 50%,rgba(255,255,255,0.3) 75%); background-size:200% 100%; animation:shimmer 1.8s ease-in-out infinite; border-radius:8px; }
        .img-divider { height:1px; background:rgba(26,26,46,0.06); margin:12px 0; }
        .img-upload-row { display:flex; align-items:center; gap:12px; cursor:pointer; }
        .img-upload-preview { width:40px; height:40px; border-radius:7px; object-fit:contain; background:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.8); }
        .img-upload-box { width:40px; height:40px; border-radius:7px; background:rgba(255,255,255,0.4); border:1px dashed rgba(26,26,46,0.2); display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
        .img-upload-text { flex:1; font-size:12px; color:rgba(26,26,46,0.4); }
        .img-upload-btn { font-size:11px; color:#6366f1; border:1px solid rgba(99,102,241,0.3); border-radius:6px; padding:4px 10px; background:rgba(99,102,241,0.06); cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .img-upload-btn:hover { background:rgba(99,102,241,0.12); }

        .selected-row { display:flex; align-items:center; gap:10px; padding:9px 12px; background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.2); border-radius:8px; margin-top:8px; }
        .selected-row img { width:34px; height:34px; border-radius:6px; object-fit:cover; }
        .selected-row-text { flex:1; font-size:11px; color:rgba(26,26,46,0.45); }
        .clear-btn { background:none; border:none; color:rgba(26,26,46,0.3); cursor:pointer; font-size:12px; font-family:'DM Sans',sans-serif; }
        .clear-btn:hover { color:rgba(26,26,46,0.6); }

        .textarea {
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 10px;
          color: #0f0f23;
          font-size: 14px;
          padding: 11px 14px;
          outline: none;
          width: 100%;
          resize: vertical;
          min-height: 72px;
          line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(100,100,150,0.06);
        }
        .textarea::placeholder { color: rgba(26,26,46,0.3); }
        .textarea:focus { border-color:rgba(99,102,241,0.4); background:rgba(255,255,255,0.8); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }

        /* Format */
        .format-row { display:flex; gap:8px; }
        .format-btn {
          flex:1; padding:11px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 10px;
          color: rgba(26,26,46,0.45);
          font-size: 12px; font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .format-btn:hover { background:rgba(255,255,255,0.7); color:#1a1a2e; }
        .format-btn.active { border-color:rgba(99,102,241,0.5); color:#6366f1; background:rgba(99,102,241,0.06); box-shadow:0 0 0 1px rgba(99,102,241,0.15); }

        /* Client pills */
        .client-section { padding:14px 16px; }
        .client-section-label { font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(26,26,46,0.3); margin-bottom:10px; }
        .pills { display:flex; flex-wrap:wrap; gap:6px; }
        .pill {
          padding: 5px 12px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.4);
          color: rgba(26,26,46,0.45);
          font-size: 12px; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .pill:hover { background:rgba(255,255,255,0.7); color:#1a1a2e; }
        .pill.active { border-color:rgba(99,102,241,0.5); color:#6366f1; background:rgba(99,102,241,0.08); }

        /* Error */
        .error-bar { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:13px; color:#dc2626; margin-bottom:20px; }

        /* Generate button */
        .gen-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px; font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 28px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3), 0 1px 0 rgba(255,255,255,0.2) inset;
          letter-spacing: -0.01em;
        }
        .gen-btn:hover { transform:translateY(-1px); box-shadow:0 8px 28px rgba(99,102,241,0.4); }
        .gen-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; box-shadow:none; }
        .gen-btn-meta { font-size:11px; opacity:0.65; font-weight:400; }

        /* Generating */
        .gen-container { max-width:500px; margin:80px auto; padding:0 24px; animation:fadeUp 0.4s ease; text-align:center; }
        .gen-spinner { width:44px; height:44px; border:2px solid rgba(99,102,241,0.15); border-top-color:#6366f1; border-radius:50%; animation:spin 0.9s linear infinite; margin:0 auto 20px; }
        .gen-title { font-size:22px; font-weight:300; letter-spacing:-0.02em; color:#0f0f23; margin-bottom:6px; }
        .gen-sub { font-size:13px; color:rgba(26,26,46,0.45); margin-bottom:28px; font-weight:300; }
        .progress-track { background:rgba(99,102,241,0.1); border-radius:100px; height:2px; margin-bottom:8px; overflow:hidden; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:100px; transition:width 0.5s cubic-bezier(0.22,1,0.36,1); }
        .progress-label { font-size:10px; color:rgba(26,26,46,0.3); margin-bottom:24px; font-family:'DM Mono',monospace; }
        .concept-cards { display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left; }
        .cc {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 12px;
          padding: 16px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
          box-shadow: 0 2px 12px rgba(100,100,150,0.08);
        }
        .cc.building { border-color:rgba(99,102,241,0.3); }
        .cc.done { border-color:rgba(16,185,129,0.3); }
        .cc.error { border-color:rgba(239,68,68,0.3); }
        .cc-sweep { position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(99,102,241,0.04),transparent); background-size:200%; animation:shimmer 2.5s ease-in-out infinite; }
        .cc-num { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:rgba(26,26,46,0.3); margin-bottom:5px; }
        .cc-title { font-size:12px; font-weight:500; color:#0f0f23; margin-bottom:5px; min-height:18px; line-height:1.4; }
        .cc-waiting { font-size:11px; color:rgba(26,26,46,0.3); }
        .cc-building { font-size:11px; color:#6366f1; animation:pulse 1.5s infinite; }
        .cc-done { font-size:11px; color:#10b981; }
        .cc-error { font-size:11px; color:#dc2626; }

        /* Done */
        .done-container { max-width:420px; margin:100px auto; padding:0 24px; text-align:center; animation:fadeUp 0.4s ease; }
        .done-icon { font-size:44px; margin-bottom:20px; }
        .done-title { font-size:28px; font-weight:300; letter-spacing:-0.02em; color:#0f0f23; margin-bottom:8px; }
        .done-sub { font-size:14px; color:rgba(26,26,46,0.45); line-height:1.6; margin-bottom:28px; font-weight:300; }
        .done-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 32px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:white; border:none; border-radius:12px;
          font-size:14px; font-weight:600; cursor:pointer;
          font-family:'DM Sans',sans-serif; text-decoration:none;
          transition:all 0.2s;
          box-shadow:0 4px 20px rgba(99,102,241,0.3);
        }
        .done-btn:hover { transform:translateY(-1px); box-shadow:0 8px 28px rgba(99,102,241,0.4); }
        .done-link { display:block; margin-top:16px; font-size:12px; color:rgba(26,26,46,0.3); cursor:pointer; background:none; border:none; font-family:'DM Sans',sans-serif; }
        .done-link:hover { color:rgba(26,26,46,0.6); }
      `}</style>

      <div className="shell">
        <nav className="nav">
          <a href="/" className="nav-logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">Alchemy <em>OS</em></span>
          </a>
          <div className="nav-links">
            <a href="/clients" className="nav-link">CRM</a>
            <a href="/campaign-builder" className="nav-link">Builder</a>
            <a href="/auto-brief" className="nav-link">Full Brief</a>
          </div>
        </nav>

        {(phase === 'input' || phase === 'error') && (
          <div className="container">
            <p className="page-eyebrow">Sample Brief Machine</p>
            <h1 className="page-title"><strong>2 briefs.</strong> One click.</h1>
            <p className="page-sub">Paste a product URL. We scrape the page, extract images, and build two complete campaign concepts with scripts and storyboards.</p>
            <div className="cost-pill">1K quality · <span>~$1.10 per run</span> · ~2–3 min</div>

            {error && <div className="error-bar">⚠ {error}</div>}

            <div className="section">
              <label className="label">Product Page URL</label>
              <div className="url-wrap">
                <input className="input" type="url" style={{paddingRight:90}} placeholder="https://brand.com/products/item"
                  value={productPageUrl} onChange={e => { setProductPageUrl(e.target.value); setExtractedImages([]); setSelectedImageUrl(null) }} />
                {productPageUrl && (
                  <div className="url-badge">
                    {extracting
                      ? <><div className="url-spinner" /><span style={{fontSize:10,color:'rgba(26,26,46,0.3)'}}>Scanning</span></>
                      : extractedImages.length > 0 ? <span className="url-ok">✓ {extractedImages.length} images</span> : null}
                  </div>
                )}
              </div>
              <p className="input-hint">We scrape this page for product details, brand voice, and images</p>
            </div>

            <div className="section">
              <label className="label">Product Image<span className="label-note">auto-extracted · select or upload</span></label>
              <div className="glass img-card">
                {(extractedImages.length > 0 || extracting) && (
                  <>
                    <div className="img-card-header">
                      <span className="img-card-label">From page</span>
                      {extractedImages.length > 0 && <span className="img-card-count">{extractedImages.length} found</span>}
                    </div>
                    <div className="img-grid">
                      {extractedImages.map((url, i) => (
                        <div key={i} className={`img-item ${selectedImageUrl === url && !uploadedImageDataUrl ? 'selected' : ''}`}
                          onClick={() => { setSelectedImageUrl(url); setUploadedImageDataUrl(null) }}>
                          <img src={url} alt="" onError={e => e.target.parentElement.style.display='none'} />
                          {selectedImageUrl === url && !uploadedImageDataUrl && <div className="img-check">✓</div>}
                        </div>
                      ))}
                      {extracting && !extractedImages.length && Array(4).fill(null).map((_, i) => <div key={i} className="img-shimmer" />)}
                    </div>
                    <div className="img-divider" />
                  </>
                )}
                <div className="img-upload-row" onClick={() => productInputRef.current?.click()}>
                  {uploadedImageDataUrl
                    ? <img src={uploadedImageDataUrl} alt="" className="img-upload-preview" />
                    : <div className="img-upload-box">📦</div>}
                  <span className="img-upload-text">{uploadedImageDataUrl ? 'Custom image uploaded' : extractedImages.length > 0 ? 'Or upload your own' : 'Upload a product image'}</span>
                  <button className="img-upload-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>{uploadedImageDataUrl ? 'Change' : 'Upload'}</button>
                </div>
              </div>
              <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductUpload} />
              {effectiveProductImage && (
                <div className="selected-row">
                  <img src={effectiveProductImage} alt="" />
                  <span className="selected-row-text">{uploadedImageDataUrl ? 'Custom upload' : 'Page image'} · used in all scenes</span>
                  <button className="clear-btn" onClick={() => { setSelectedImageUrl(null); setUploadedImageDataUrl(null) }}>✕</button>
                </div>
              )}
            </div>

            <div className="section">
              <label className="label">Offer or Context<span className="label-note">optional</span></label>
              <textarea className="textarea" placeholder="Specific offer, launch angle, or campaign context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Creative Keywords<span className="label-note">optional</span></label>
              <input className="input" placeholder="cinematic, intimate, transformation, ritual..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
            </div>

            <div className="section">
              <label className="label">Format</label>
              <div className="format-row">
                <button className={`format-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>⬛ 16:9 Landscape</button>
                <button className={`format-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>▮ 9:16 Vertical</button>
              </div>
            </div>

            {clients.length > 0 && (
              <div className="section">
                <div className="glass client-section">
                  <p className="client-section-label">Link to client <span style={{color:'rgba(26,26,46,0.2)',textTransform:'none',letterSpacing:0,fontWeight:300}}>· optional</span></p>
                  <div className="pills">
                    <button className={`pill ${!selectedClientId ? 'active' : ''}`} onClick={() => setSelectedClientId(null)}>No client</button>
                    {clients.map(c => (
                      <button key={c.id} className={`pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                    ))}
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

        {phase === 'analyzing' && (
          <div className="gen-container">
            <div className="gen-spinner" />
            <h2 className="gen-title">Analyzing product page</h2>
            <p className="gen-sub">Extracting brand intelligence and images</p>
          </div>
        )}

        {phase === 'generating' && (
          <div className="gen-container">
            <div className="gen-spinner" />
            <h2 className="gen-title">Building your briefs</h2>
            <p className="gen-sub">{overallMessage}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{width:`${(completedCount/2)*100}%`}} />
            </div>
            <p className="progress-label">{completedCount} of 2 complete</p>
            <div className="concept-cards">
              {conceptProgress.map((cp, i) => (
                <div key={i} className={`cc ${cp.status}`}>
                  {cp.status === 'building' && <div className="cc-sweep" />}
                  <p className="cc-num">Concept {i+1}</p>
                  <p className="cc-title">{cp.title || '—'}</p>
                  <p className={`cc-${cp.status}`}>
                    {cp.status === 'waiting' && '○ Waiting'}
                    {cp.status === 'building' && '● Generating...'}
                    {cp.status === 'done' && '✓ Complete'}
                    {cp.status === 'error' && `✕ Error`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="done-container">
            <div className="done-icon">🎬</div>
            <h2 className="done-title"><strong>{completedCount}</strong> {completedCount === 1 ? 'brief' : 'briefs'} ready.</h2>
            <p className="done-sub">Campaigns built and saved. Share the brief link with your prospect.</p>
            {slugForUrl
              ? <a href={`/${slugForUrl}/briefs`} className="done-btn">Open Brief ↗</a>
              : doneClientId
                ? <a href={`/brief/${doneClientId}`} className="done-btn">Open Brief ↗</a>
                : <p style={{color:'rgba(26,26,46,0.35)',fontSize:13}}>Find your briefs in the CRM.</p>}
            <button className="done-link" onClick={() => {
              setPhase('input'); setDoneClientId(null); setDoneSlug(null)
              setConceptProgress([{status:'waiting',title:'',message:''},{status:'waiting',title:'',message:''}])
              setAnalysis(null)
            }}>Generate another →</button>
          </div>
        )}
      </div>
    </>
  )
}
