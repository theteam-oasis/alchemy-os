'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STEPS = {
  INPUT: 0, ANALYZING: 1, CONCEPTS: 2, SCRIPTS: 3,
  DIRECTIONS: 4, AVATAR: 5, SCENES: 6, STORYBOARD: 7,
}
const STEP_LABELS = ['Brand Input','Analysis','Concepts','Script','Visual Direction','Avatar','Scenes','Storyboard']

async function autosave(campaignId, clientId, patch, onSave) {
  try {
    const res = await fetch('/api/campaign/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, clientId, data: patch }),
    })
    const json = await res.json()
    if (json.success && !campaignId && json.campaignId) onSave(json.campaignId)
  } catch (e) { console.error('Autosave failed', e) }
}

function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null
  const parts = dataUrl.split(',')
  return parts.length > 1 ? parts[1] : null
}

function getMimeType(dataUrl) {
  if (!dataUrl) return 'image/png'
  const match = dataUrl.match(/data:([^;]+);/)
  return match ? match[1] : 'image/png'
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function generateImage(prompt, options = {}) {
  const { avatarImageUrl, productImageUrl, aspectRatio = '16:9', imageSize = '2K' } = options
  const body = { prompt, aspectRatio, imageSize }
  if (avatarImageUrl) body.avatarImageUrl = avatarImageUrl
  if (productImageUrl) body.productImageUrl = productImageUrl
  const res = await fetch('/api/campaign/generate-image', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.imageUrl
}

// Run promises in batches of N in parallel
async function batchGenerate(items, batchSize, fn) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

function downloadImage(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename || 'scene.png'
  a.click()
}

function StepDots({ current }) {
  return (
    <div className="step-dots">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className={`dot-item ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          <div className="dot" /><span className="dot-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingPulse({ message, sub }) {
  return (
    <div className="loading-state">
      <div className="pulse-ring" />
      <p className="loading-msg">{message}</p>
      {sub && <p className="loading-sub">{sub}</p>}
    </div>
  )
}

function ConceptCard({ concept, selected, onClick }) {
  return (
    <div className={`concept-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="concept-top">
        <h3 className="concept-title">{concept.title}</h3>
        <p className="concept-theme">{concept.theme}</p>
      </div>
      <div className="concept-divider" />
      <div className="concept-body">
        <div className="concept-row"><span className="concept-label">Visual World</span><span className="concept-value">{concept.visualUniverse}</span></div>
        <div className="concept-row"><span className="concept-label">Metaphor</span><span className="concept-value">{concept.metaphorBridge}</span></div>
        <div className="concept-row"><span className="concept-label">Emotion</span><span className="concept-value">{concept.emotionalFrame}</span></div>
      </div>
      {concept.siteAnchors?.length > 0 && (
        <div className="concept-anchors">{concept.siteAnchors.slice(0,2).map((a,i) => <span key={i} className="anchor-tag">{a}</span>)}</div>
      )}
      {selected && <div className="selected-check">✓</div>}
    </div>
  )
}

function ScriptCard({ script, selected, onClick }) {
  return (
    <div className={`script-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="script-header"><h3 className="script-title">{script.title}</h3><span className="script-mood">{script.mood}</span></div>
      <p className="script-hook">"{script.hook}"</p>
      <div className="script-divider" />
      <p className="script-body">{script.body}</p>
      <p className="script-cta">→ {script.cta}</p>
      {selected && <div className="selected-check">✓</div>}
    </div>
  )
}

function DirectionCard({ direction, selected, onClick }) {
  return (
    <div className={`direction-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <h3 className="direction-title">{direction.title}</h3>
      <p className="direction-summary">{direction.summary}</p>
      <div className="direction-grid">
        <div className="direction-row"><span className="direction-label">Color</span><span className="direction-value">{direction.colorWorld}</span></div>
        <div className="direction-row"><span className="direction-label">Light</span><span className="direction-value">{direction.lighting}</span></div>
        <div className="direction-row"><span className="direction-label">Lens</span><span className="direction-value">{direction.lensAndCamera}</span></div>
        <div className="direction-row"><span className="direction-label">Ref</span><span className="direction-value">{direction.cinematicReference}</span></div>
      </div>
      {selected && <div className="selected-check">✓</div>}
    </div>
  )
}

export default function CampaignBuilder() {
  const [step, setStep] = useState(STEPS.INPUT)
  const [campaignId, setCampaignId] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [creativeKeywords, setCreativeKeywords] = useState('')
  const [conceptCount, setConceptCount] = useState(4)
  const [productImageDataUrl, setProductImageDataUrl] = useState(null)
  const [clientProductImages, setClientProductImages] = useState([]) // URLs from brand_intake
  const [selectedProductUrls, setSelectedProductUrls] = useState([]) // up to 4 selected
  const [analysis, setAnalysis] = useState(null)
  const [concepts, setConcepts] = useState([])
  const [chosenConcept, setChosenConcept] = useState(null)
  const [conceptsLoading, setConceptsLoading] = useState(false)
  const [scripts, setScripts] = useState([])
  const [chosenScript, setChosenScript] = useState(null)
  const [scriptDuration, setScriptDuration] = useState(30)
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [useOwnScript, setUseOwnScript] = useState(false)
  const [ownScriptText, setOwnScriptText] = useState('')
  const [directions, setDirections] = useState([])
  const [chosenDirection, setChosenDirection] = useState(null)
  const [directionsLoading, setDirectionsLoading] = useState(false)
  const [avatarImages, setAvatarImages] = useState([null,null,null,null])
  const [avatarLabels, setAvatarLabels] = useState([])
  const [chosenAvatarIdx, setChosenAvatarIdx] = useState(null)
  const [lockedAvatarUrl, setLockedAvatarUrl] = useState(null) // Supabase URL after upload
  const [avatarsLoading, setAvatarsLoading] = useState(false)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [shotList, setShotList] = useState([])
  const [scenes, setScenes] = useState([])
  const [currentScene, setCurrentScene] = useState(0)
  const [scenesLoading, setScenesLoading] = useState(false)
  const [scenesGenerated, setScenesGenerated] = useState(0)
  const [error, setError] = useState(null)
  const productInputRef = useRef(null)

  const BATCH_SIZE = 4 // Max parallel image generations

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientId = params.get('clientId')
    if (clientId) setSelectedClientId(clientId)
  }, [])

  useEffect(() => {
    supabase.from('clients').select('id, name, status').order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  useEffect(() => {
    if (!selectedClientId) { setClientProductImages([]); return }
    supabase.from('brand_intake').select('*').eq('client_id', selectedClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.website) setWebsiteUrl(data.website)
          if (data.brand_name) setProductName(data.brand_name)
          if (data.product_image_urls?.length) setClientProductImages(data.product_image_urls)
        }
      })
  }, [selectedClientId])

  const save = useCallback((patch) => {
    autosave(campaignId, selectedClientId, patch, (id) => setCampaignId(id))
  }, [campaignId, selectedClientId])

  const lockedAvatarDataUrl = chosenAvatarIdx !== null ? avatarImages[chosenAvatarIdx] : null

  // Auto-regenerate scripts when duration changes (if scripts already exist)
  useEffect(() => {
    if (step === STEPS.SCRIPTS && scripts.length > 0 && !scriptsLoading && !useOwnScript) {
      handleGenerateScripts()
    }
  }, [scriptDuration])

  async function handleProductImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setProductImageDataUrl(dataUrl)
    setSelectedProductUrls([]) // clear client selections when uploading own
  }

  function toggleClientProductUrl(url) {
    setSelectedProductUrls(prev => {
      if (prev.includes(url)) return prev.filter(u => u !== url)
      if (prev.length >= 4) return prev // max 4
      return [...prev, url]
    })
    setProductImageDataUrl(null) // clear manual upload when selecting client images
  }

  // Convert first selected product URL to base64 for use as reference
  async function getProductDataUrl() {
    if (productImageDataUrl) return productImageDataUrl
    if (selectedProductUrls.length === 0) return null
    try {
      const res = await fetch(selectedProductUrls[0])
      const blob = await res.blob()
      return await fileToDataUrl(blob)
    } catch { return null }
  }

  async function handleAnalyze() {
    if (!websiteUrl && !productName) { setError('Enter a website URL or product name.'); return }
    setError(null); setStep(STEPS.ANALYZING)
    try {
      const res = await fetch('/api/campaign/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, productName, offerNotes }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setAnalysis(json.analysis)
      save({ website_url: websiteUrl, product_name: productName, website_analysis: json.analysis })
      await handleGenerateConcepts(json.analysis)
    } catch (e) { setError(e.message); setStep(STEPS.INPUT) }
  }

  async function handleGenerateConcepts(analysisOverride) {
    const a = analysisOverride || analysis
    setConceptsLoading(true); setStep(STEPS.CONCEPTS)
    const keywords = creativeKeywords.split(',').map(k => k.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/campaign/concepts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: a, creativeKeywords: keywords, count: conceptCount, previousConcepts: concepts }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConcepts(json.concepts); setChosenConcept(null)
      save({ concepts: json.concepts })
    } catch (e) { setError(e.message) }
    finally { setConceptsLoading(false) }
  }

  async function handleGenerateScripts() {
    if (!chosenConcept) return
    setScriptsLoading(true); setStep(STEPS.SCRIPTS)
    try {
      const res = await fetch('/api/campaign/generate?type=scripts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, analysis, duration: scriptDuration, previousScripts: [] }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setScripts(json.scripts); setChosenScript(null)
      save({ chosen_concept: chosenConcept, scripts: json.scripts })
    } catch (e) { setError(e.message) }
    finally { setScriptsLoading(false) }
  }

  async function handleGenerateDirections() {
    if (!chosenScript) return
    setDirectionsLoading(true); setStep(STEPS.DIRECTIONS)
    try {
      const res = await fetch('/api/campaign/generate?type=directions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, analysis }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDirections(json.directions); setChosenDirection(null)
      save({ chosen_script: chosenScript, visual_directions: json.directions })
    } catch (e) { setError(e.message) }
    finally { setDirectionsLoading(false) }
  }

  async function handleGenerateAvatars() {
    if (!chosenDirection) return
    setAvatarsLoading(true); setAvatarImages([null,null,null,null]); setChosenAvatarIdx(null)
    setStep(STEPS.AVATAR)
    try {
      const res = await fetch('/api/campaign/generate?type=avatar-prompts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, direction: chosenDirection, analysis }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const prompts = json.avatarPrompts
      setAvatarLabels(prompts.map(p => p.label))

      // Generate all 4 avatars in parallel — portrait format, no product reference
      const results = await Promise.allSettled(
        prompts.map(p => generateImage(p.imagePrompt, { aspectRatio: '3:4', imageSize: '2K' }))
      )
      setAvatarImages(results.map(r => r.status === 'fulfilled' ? r.value : null))
      save({ chosen_direction: chosenDirection })
    } catch (e) { setError(e.message) }
    finally { setAvatarsLoading(false) }
  }

  // Upload chosen avatar to Supabase storage and get a URL
  // This avoids 413 errors from sending large base64 in every scene request
  async function uploadAvatarToStorage(dataUrl) {
    try {
      const base64 = dataUrlToBase64(dataUrl)
      const mimeType = getMimeType(dataUrl)
      const res = await fetch('/api/campaign/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, campaignId }),
      })
      const json = await res.json()
      if (json.success) return json.url
      return null
    } catch { return null }
  }

  async function handleGenerateScenes() {
    if (chosenAvatarIdx === null) return
    setScenesLoading(true); setScenesGenerated(0); setCurrentScene(0)
    setStep(STEPS.SCENES)
    const avatarLabel = avatarLabels[chosenAvatarIdx] || 'Avatar'
    const avatarDataUrl = avatarImages[chosenAvatarIdx]
    save({ chosen_avatar: avatarDataUrl, avatars: avatarImages, aspect_ratio: aspectRatio })

    // Upload avatar to Supabase storage to get a URL (avoids 413 on scene requests)
    let avatarUrl = lockedAvatarUrl
    if (!avatarUrl && avatarDataUrl) {
      avatarUrl = await uploadAvatarToStorage(avatarDataUrl)
      if (avatarUrl) setLockedAvatarUrl(avatarUrl)
    }

    // Resolve product URL
    const resolvedProductDataUrl = await getProductDataUrl()
    // Use first selected client product URL directly if available (already a URL)
    const productUrl = selectedProductUrls[0] || null

    try {
      // Step 1: Generate full shot list
      const shotRes = await fetch('/api/campaign/generate?type=shot-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: chosenScript, duration: scriptDuration,
          concept: chosenConcept, direction: chosenDirection,
          avatarLabel, hasProduct: !!resolvedProductDataUrl, aspectRatio,
        }),
      })
      const shotJson = await shotRes.json()
      if (!shotJson.success) throw new Error(shotJson.error)

      const shots = shotJson.shotList
      setShotList(shots)
      setScenes(shots.map(shot => ({ imageUrl: null, loading: true, shot })))

      // Step 2: Generate images in batches of BATCH_SIZE
      for (let i = 0; i < shots.length; i += BATCH_SIZE) {
        const batch = shots.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((shot, batchIdx) => {
          const globalIdx = i + batchIdx
          const fullPrompt = `${shot.imagePrompt}

Character: ${avatarLabel} — maintain exact facial features, hair, skin tone, and outfit from the reference portrait.
Shot type: ${shot.shotType}. Camera movement: ${shot.cameraMove}.
${shot.isProductShot && productImageDataUrl ? 'Feature the product prominently in this shot — maintain exact product appearance from reference.' : ''}
Photorealistic, cinematic, ${chosenDirection.colorWorld}, ${chosenDirection.lighting}. No text, no watermarks.`

          const imgOptions = {
            avatarImageUrl: avatarUrl || undefined,
            aspectRatio,
            imageSize: '2K',
          }
          // Add product URL for product shots
          if (shot.isProductShot && (productUrl || resolvedProductDataUrl)) {
            // Prefer direct URL, fall back to uploaded data URL
            if (productUrl) {
              imgOptions.productImageUrl = productUrl
            } else if (resolvedProductDataUrl) {
              // Upload it too to get a URL
              imgOptions.productImageUrl = productUrl
            }
          }

          return generateImage(fullPrompt, imgOptions).then(imageUrl => {
            setScenes(prev => {
              const updated = [...prev]
              updated[globalIdx] = { ...updated[globalIdx], imageUrl, loading: false }
              return updated
            })
            setScenesGenerated(prev => prev + 1)
          }).catch(err => {
            setScenes(prev => {
              const updated = [...prev]
              updated[globalIdx] = { ...updated[globalIdx], imageUrl: null, loading: false, error: err.message }
              return updated
            })
            setScenesGenerated(prev => prev + 1)
          })
        })

        // Wait for this batch to finish before starting the next
        await Promise.allSettled(batchPromises)
      }

      setScenesLoading(false)
    } catch (e) {
      setError(e.message); setScenesLoading(false)
    }
  }

  function handleFinishStoryboard() {
    save({ scenes, storyboard_complete: true })
    setStep(STEPS.STORYBOARD)
  }

  function handleReset() {
    setStep(STEPS.INPUT); setCampaignId(null); setConcepts([]); setChosenConcept(null);
    setScripts([]); setChosenScript(null); setDirections([]); setChosenDirection(null);
    setAvatarImages([null,null,null,null]); setChosenAvatarIdx(null); setLockedAvatarUrl(null);
    setShotList([]); setScenes([]); setAnalysis(null);
    setUseOwnScript(false); setOwnScriptText(''); setProductImageDataUrl(null);
    setSelectedProductUrls([]); setClientProductImages([]);
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans', 'SF Pro Display', -apple-system, sans-serif; min-height: 100vh; }
        .cb-shell { min-height: 100vh; background: #0a0a0a; display: flex; flex-direction: column; }
        .cb-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid #1e1e1e; position: sticky; top: 0; background: #0a0a0a; z-index: 100; }
        .cb-logo { display: flex; align-items: center; gap: 10px; }
        .cb-logo-mark { width: 28px; height: 28px; background: #FFD60A; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0a0a0a; }
        .cb-logo-text { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
        .cb-logo-text span { color: #FFD60A; }
        .cb-back-btn { background: none; border: 1px solid #2a2a2a; color: #666; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .cb-back-btn:hover { border-color: #444; color: #aaa; }
        .step-dots { display: flex; align-items: flex-start; padding: 0 40px; margin: 32px 0 0; }
        .dot-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
        .dot-item::before { content: ''; position: absolute; top: 6px; left: calc(50% + 6px); right: calc(-50% + 6px); height: 1px; background: #2a2a2a; }
        .dot-item:last-child::before { display: none; }
        .dot-item.done::before { background: #FFD60A44; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #2a2a2a; border: 1px solid #333; z-index: 1; transition: all 0.2s; }
        .dot-item.done .dot { background: #FFD60A44; border-color: #FFD60A88; }
        .dot-item.active .dot { background: #FFD60A; border-color: #FFD60A; box-shadow: 0 0 12px #FFD60A66; }
        .dot-label { font-size: 10px; color: #444; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
        .dot-item.active .dot-label { color: #FFD60A; }
        .dot-item.done .dot-label { color: #555; }
        .cb-content { flex: 1; padding: 48px 40px 80px; max-width: 1200px; margin: 0 auto; width: 100%; }
        .step-heading { margin-bottom: 32px; }
        .step-eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD60A; margin-bottom: 8px; font-weight: 600; }
        .step-title { font-size: 28px; font-weight: 700; color: #f0f0f0; line-height: 1.2; }
        .step-sub { font-size: 14px; color: #555; margin-top: 8px; line-height: 1.6; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; }
        .form-input, .form-textarea { background: #111; border: 1px solid #222; border-radius: 8px; color: #e8e8e8; font-size: 14px; padding: 12px 16px; outline: none; transition: border-color 0.15s; font-family: inherit; width: 100%; }
        .form-input:focus, .form-textarea:focus { border-color: #FFD60A44; }
        .form-textarea { resize: vertical; min-height: 80px; }
        .client-selector { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 32px; }
        .client-selector-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 12px; font-weight: 600; }
        .client-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .client-pill { padding: 8px 16px; border-radius: 100px; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .client-pill:hover { border-color: #444; color: #aaa; }
        .client-pill.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A11; }
        .keywords-hint { font-size: 11px; color: #444; margin-top: 6px; }
        .count-toggle { display: flex; gap: 8px; }
        .count-btn { padding: 8px 20px; border-radius: 6px; border: 1px solid #2a2a2a; background: transparent; color: #555; font-size: 14px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .count-btn.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A11; }
        .duration-options { display: flex; gap: 8px; }
        .duration-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #2a2a2a; background: transparent; color: #555; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: center; }
        .duration-btn.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A11; }
        .btn-primary { background: #FFD60A; color: #0a0a0a; border: none; border-radius: 8px; padding: 14px 32px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #ffe033; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-secondary { background: transparent; color: #888; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px 24px; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-secondary:hover { border-color: #444; color: #aaa; }
        .btn-ghost { background: transparent; color: #555; border: none; padding: 8px 12px; font-size: 12px; cursor: pointer; font-family: inherit; transition: color 0.15s; border-radius: 6px; }
        .btn-ghost:hover { color: #aaa; background: #1a1a1a; }
        .action-row { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 24px; }
        .pulse-ring { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFD60A22; border-top-color: #FFD60A; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-msg { font-size: 14px; color: #555; letter-spacing: 0.05em; }
        .loading-sub { font-size: 12px; color: #333; }
        .analysis-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
        .analysis-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #FFD60A; margin-bottom: 16px; font-weight: 600; }
        .analysis-row { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1a1a1a; }
        .analysis-row:last-child { border-bottom: none; }
        .analysis-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; }
        .analysis-value { font-size: 13px; color: #aaa; line-height: 1.5; }
        .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
        .concept-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative; }
        .concept-card:hover { border-color: #333; }
        .concept-card.selected { border-color: #FFD60A; background: #FFD60A08; }
        .concept-top { margin-bottom: 16px; }
        .concept-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
        .concept-theme { font-size: 13px; color: #666; line-height: 1.5; }
        .concept-divider { height: 1px; background: #1e1e1e; margin-bottom: 16px; }
        .concept-body { display: flex; flex-direction: column; gap: 10px; }
        .concept-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
        .concept-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; }
        .concept-value { font-size: 12px; color: #888; line-height: 1.5; }
        .concept-anchors { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
        .anchor-tag { font-size: 10px; padding: 3px 10px; border-radius: 100px; border: 1px solid #222; color: #555; }
        .script-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative; }
        .script-card:hover { border-color: #333; }
        .script-card.selected { border-color: #FFD60A; background: #FFD60A08; }
        .script-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .script-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }
        .script-mood { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; border: 1px solid #222; border-radius: 100px; padding: 3px 10px; }
        .script-hook { font-size: 15px; color: #FFD60A; font-style: italic; line-height: 1.5; margin-bottom: 14px; }
        .script-divider { height: 1px; background: #1e1e1e; margin-bottom: 14px; }
        .script-body { font-size: 12px; color: #777; line-height: 1.7; margin-bottom: 12px; }
        .script-cta { font-size: 12px; color: #555; }
        .direction-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative; }
        .direction-card:hover { border-color: #333; }
        .direction-card.selected { border-color: #FFD60A; background: #FFD60A08; }
        .direction-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
        .direction-summary { font-size: 13px; color: #666; margin-bottom: 16px; line-height: 1.5; }
        .direction-grid { display: flex; flex-direction: column; gap: 8px; }
        .direction-row { display: grid; grid-template-columns: 50px 1fr; gap: 12px; }
        .direction-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; }
        .direction-value { font-size: 12px; color: #777; line-height: 1.4; }
        .selected-check { position: absolute; top: 14px; right: 14px; width: 24px; height: 24px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #0a0a0a; }
        /* Product upload */
        .product-upload-box { border: 1px dashed #2a2a2a; border-radius: 10px; padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: border-color 0.15s; background: #0e0e0e; }
        .product-upload-box:hover { border-color: #444; }
        .product-upload-box.has-image { border-color: #FFD60A44; }
        .product-preview { width: 60px; height: 60px; border-radius: 8px; object-fit: contain; background: #1a1a1a; }
        .product-upload-text { flex: 1; }
        .product-upload-title { font-size: 13px; color: #888; font-weight: 500; }
        .product-upload-sub { font-size: 11px; color: #444; margin-top: 3px; }
        .product-upload-btn { font-size: 11px; color: #FFD60A; border: 1px solid #FFD60A44; border-radius: 6px; padding: 6px 12px; background: transparent; cursor: pointer; font-family: inherit; }
        /* Product image picker */
        .product-picker { background: #0e0e0e; border: 1px solid #1e1e1e; border-radius: 12px; padding: 20px; }
        .product-picker-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
        .product-picker-count { color: #FFD60A; font-size: 11px; }
        .product-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 14px; }
        .product-picker-item { position: relative; border-radius: 8px; overflow: hidden; border: 2px solid #1e1e1e; cursor: pointer; transition: all 0.2s; aspect-ratio: 1; }
        .product-picker-item:hover { border-color: #444; }
        .product-picker-item.selected { border-color: #FFD60A; }
        .product-picker-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .product-picker-check { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #0a0a0a; }
        .product-picker-divider { height: 1px; background: #1e1e1e; margin: 14px 0; }
        .product-own-upload { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .product-own-preview { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; background: #1a1a1a; border: 1px solid #222; }
        .product-own-placeholder { width: 48px; height: 48px; border-radius: 8px; background: #1a1a1a; border: 1px dashed #2a2a2a; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .product-own-text { flex: 1; font-size: 12px; color: #666; }
        .product-own-btn { font-size: 11px; color: #FFD60A; border: 1px solid #FFD60A44; border-radius: 6px; padding: 5px 10px; background: transparent; cursor: pointer; font-family: inherit; white-space: nowrap; }
        /* Aspect ratio selector */
        .aspect-selector { display: flex; gap: 12px; margin-bottom: 32px; }
        .aspect-btn { flex: 1; padding: 16px; border-radius: 10px; border: 1px solid #2a2a2a; background: #111; color: #555; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .aspect-btn:hover { border-color: #444; }
        .aspect-btn.active { border-color: #FFD60A; color: #FFD60A; background: #FFD60A08; }
        .aspect-icon { font-size: 24px; }
        .aspect-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
        .aspect-desc { font-size: 10px; color: #444; }
        .aspect-btn.active .aspect-desc { color: #FFD60A88; }
        /* Avatar grid */
        .avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .avatar-card { cursor: pointer; border-radius: 12px; overflow: hidden; border: 2px solid #1e1e1e; transition: all 0.2s; position: relative; background: #111; }
        .avatar-card:hover { border-color: #333; }
        .avatar-card.selected { border-color: #FFD60A; }
        .avatar-card.loading-card { cursor: default; }
        .avatar-portrait { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
        .avatar-portrait-shimmer { width: 100%; aspect-ratio: 3/4; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .avatar-label-box { padding: 10px 12px; background: #0e0e0e; border-top: 1px solid #1e1e1e; }
        .avatar-label-text { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
        .avatar-check { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #0a0a0a; }
        .avatar-failed { width: 100%; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; color: #333; font-size: 12px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        /* Locked strip */
        .locked-strip { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #111; border: 1px solid #1e1e1e; border-radius: 10px; margin-bottom: 24px; }
        .locked-portrait { width: 56px; height: 72px; border-radius: 8px; object-fit: cover; border: 2px solid #FFD60A; }
        .locked-info { flex: 1; }
        .locked-name { font-size: 13px; font-weight: 600; color: #e0e0e0; }
        .locked-sub { font-size: 11px; color: #555; margin-top: 2px; }
        .lock-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #FFD60A; border: 1px solid #FFD60A44; padding: 4px 10px; border-radius: 100px; }
        /* Storyboard strip */
        .storyboard-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-bottom: 24px; }
        .scene-tile { border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; cursor: pointer; transition: all 0.2s; background: #111; }
        .scene-tile:hover { border-color: #333; }
        .scene-tile.active-tile { border-color: #FFD60A; }
        .scene-tile-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .scene-tile-img.vertical { aspect-ratio: 9/16; }
        .scene-tile-shimmer { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .scene-tile-shimmer.vertical { aspect-ratio: 9/16; }
        .scene-tile-label { padding: 5px 7px; font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
        .scene-tile-shot { color: #FFD60A88; }
        /* Scene detail */
        .scene-detail { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; overflow: hidden; margin-bottom: 24px; position: relative; }
        .scene-detail-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .scene-detail-img.vertical { aspect-ratio: 9/16; max-height: 600px; width: auto; margin: 0 auto; display: block; }
        .scene-detail-shimmer { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .scene-detail-shimmer.vertical { aspect-ratio: 9/16; }
        .scene-download-btn { position: absolute; top: 12px; right: 12px; background: #0a0a0aaa; border: 1px solid #333; color: #aaa; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; font-family: inherit; backdrop-filter: blur(4px); transition: all 0.15s; }
        .scene-download-btn:hover { background: #FFD60A; color: #0a0a0a; border-color: #FFD60A; }
        .scene-detail-body { padding: 20px 24px; }
        .scene-detail-row { display: grid; grid-template-columns: 100px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
        .scene-detail-row:last-child { border-bottom: none; }
        .scene-detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; }
        .scene-detail-value { font-size: 12px; color: #888; line-height: 1.5; }
        /* Progress */
        .progress-bar-wrap { background: #1a1a1a; border-radius: 100px; height: 4px; margin: 12px 0 20px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #FFD60A; border-radius: 100px; transition: width 0.3s; }
        .progress-text { font-size: 11px; color: #444; margin-bottom: 4px; }
        .error-bar { background: #2a1010; border: 1px solid #5a1a1a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #ff6b6b; margin-bottom: 20px; }
        .summary-strip { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
        .summary-chip { padding: 8px 16px; background: #111; border: 1px solid #1e1e1e; border-radius: 100px; font-size: 12px; color: #666; }
        .summary-chip strong { color: #aaa; }
        /* Final storyboard */
        .storyboard-final { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 40px; }
        .storyboard-final-tile { border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; position: relative; }
        .storyboard-final-tile img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .storyboard-final-tile img.vertical { aspect-ratio: 9/16; }
        .storyboard-final-label { padding: 8px 10px; font-size: 10px; color: #555; text-transform: uppercase; background: #111; display: flex; justify-content: space-between; align-items: center; }
        .tile-dl-btn { font-size: 10px; color: #555; cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid #222; background: transparent; font-family: inherit; transition: all 0.15s; }
        .tile-dl-btn:hover { color: #FFD60A; border-color: #FFD60A44; }
      `}</style>

      <div className="cb-shell">
        <header className="cb-header">
          <div className="cb-logo">
            <div className="cb-logo-mark">A</div>
            <span className="cb-logo-text">Alchemy <span>Campaign</span></span>
          </div>
          {step > STEPS.INPUT && (
            <button className="cb-back-btn" onClick={() => setStep(s => Math.max(s - 1, STEPS.INPUT))}>← Back</button>
          )}
        </header>

        <StepDots current={step} />

        <main className="cb-content">
          {error && <div className="error-bar">⚠ {error}</div>}

          {/* STEP 0: Brand Input */}
          {step === STEPS.INPUT && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 1</p>
                <h1 className="step-title">Brand Input</h1>
                <p className="step-sub">Connect a client or enter brand details manually.</p>
              </div>

              {clients.length > 0 && (
                <div className="client-selector">
                  <p className="client-selector-label">Select Client</p>
                  <div className="client-pills">
                    <button className={`client-pill ${!selectedClientId ? 'active' : ''}`} onClick={() => setSelectedClientId(null)}>No client</button>
                    {clients.map(c => (
                      <button key={c.id} className={`client-pill ${selectedClientId === c.id ? 'active' : ''}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Website URL</label>
                  <input className="form-input" type="url" placeholder="https://yourbrand.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product / Service</label>
                  <input className="form-input" placeholder="What are we advertising?" value={productName} onChange={e => setProductName(e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Offer or Context <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
                  <textarea className="form-textarea" placeholder="Any specific offer, launch, or context..." value={offerNotes} onChange={e => setOfferNotes(e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Creative Keywords <span style={{color:'#333',fontWeight:400}}>(optional)</span></label>
                  <input className="form-input" placeholder="ritual, cinematic, rebellion, luxury..." value={creativeKeywords} onChange={e => setCreativeKeywords(e.target.value)} />
                  <p className="keywords-hint">Comma-separated words to steer creative direction</p>
                </div>

                {/* Product image picker */}
                <div className="form-group full">
                  <label className="form-label">Product Images <span style={{color:'#333',fontWeight:400}}>(optional — up to 4, will appear in scenes)</span></label>

                  <div className="product-picker">
                    {/* Client images from onboarding */}
                    {clientProductImages.length > 0 && (
                      <>
                        <div className="product-picker-label">
                          <span>From Client Onboarding</span>
                          <span className="product-picker-count">{selectedProductUrls.length}/4 selected</span>
                        </div>
                        <div className="product-picker-grid">
                          {clientProductImages.map((url, i) => (
                            <div
                              key={i}
                              className={`product-picker-item ${selectedProductUrls.includes(url) ? 'selected' : ''}`}
                              onClick={() => toggleClientProductUrl(url)}
                            >
                              <img src={url} alt={`Product ${i+1}`} />
                              {selectedProductUrls.includes(url) && (
                                <div className="product-picker-check">{selectedProductUrls.indexOf(url) + 1}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="product-picker-divider" />
                      </>
                    )}

                    {/* Upload own image */}
                    <div className="product-own-upload" onClick={() => productInputRef.current?.click()}>
                      {productImageDataUrl
                        ? <img src={productImageDataUrl} alt="Uploaded" className="product-own-preview" />
                        : <div className="product-own-placeholder">📦</div>
                      }
                      <span className="product-own-text">
                        {productImageDataUrl ? 'Custom image uploaded' : clientProductImages.length > 0 ? 'Or upload your own image' : 'Upload a product photo'}
                      </span>
                      <button className="product-own-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click() }}>
                        {productImageDataUrl ? 'Change' : 'Upload'}
                      </button>
                    </div>
                  </div>

                  <input ref={productInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleProductImageUpload} />
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Concepts</label>
                  <div className="count-toggle">
                    {[4,6].map(n => <button key={n} className={`count-btn ${conceptCount === n ? 'active' : ''}`} onClick={() => setConceptCount(n)}>{n} concepts</button>)}
                  </div>
                </div>
              </div>

              <div className="action-row">
                <button className="btn-primary" onClick={handleAnalyze}>Analyze & Build →</button>
              </div>
            </div>
          )}

          {step === STEPS.ANALYZING && <LoadingPulse message="Reading the brand. Building intelligence..." />}

          {/* STEP 2: Concepts */}
          {step === STEPS.CONCEPTS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 2</p>
                <h1 className="step-title">Campaign Concepts</h1>
                <p className="step-sub">{conceptsLoading ? 'Generating...' : `${concepts.length} directions. Choose one.`}</p>
              </div>
              {analysis && !conceptsLoading && (
                <div className="analysis-card">
                  <p className="analysis-title">Brand Intelligence</p>
                  {[['Offer', analysis.coreOffer],['Customer', analysis.targetCustomer],['Problem', analysis.corePainPoint],['Transformation', analysis.desiredTransformation],['Tone', analysis.websiteTone]].map(([l,v]) => (
                    <div key={l} className="analysis-row"><span className="analysis-label">{l}</span><span className="analysis-value">{v}</span></div>
                  ))}
                </div>
              )}
              {conceptsLoading ? <LoadingPulse message="Generating creative directions..." /> : (
                <>
                  <div className="cards-grid" style={{ gridTemplateColumns: conceptCount === 6 ? 'repeat(3,1fr)' : 'repeat(2,1fr)' }}>
                    {concepts.map((c,i) => <ConceptCard key={i} concept={c} selected={chosenConcept?.title === c.title} onClick={() => setChosenConcept(c)} />)}
                  </div>
                  <div className="action-row">
                    <button className="btn-primary" disabled={!chosenConcept} onClick={handleGenerateScripts}>Develop This Concept →</button>
                    <button className="btn-secondary" onClick={() => handleGenerateConcepts()}>Regenerate All</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Scripts */}
          {step === STEPS.SCRIPTS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 3</p>
                <h1 className="step-title">Script</h1>
                <p className="step-sub">{scriptsLoading ? 'Writing scripts...' : 'Generate AI scripts or paste your own.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div></div>}

              {!scriptsLoading && (
                <>
                  <div className="form-group" style={{marginBottom:24}}>
                    <label className="form-label">Script Mode</label>
                    <div className="count-toggle">
                      <button className={`count-btn ${!useOwnScript ? 'active' : ''}`} onClick={() => setUseOwnScript(false)}>AI Generate</button>
                      <button className={`count-btn ${useOwnScript ? 'active' : ''}`} onClick={() => setUseOwnScript(true)}>Use My Own Script</button>
                    </div>
                  </div>

                  <div className="form-group" style={{marginBottom:24}}>
                    <label className="form-label">Ad Duration</label>
                    <div className="duration-options">
                      {[15,30,45,60].map(d => (
                        <button key={d} className={`duration-btn ${scriptDuration === d ? 'active' : ''}`} onClick={() => setScriptDuration(d)}>{d}s</button>
                      ))}
                    </div>
                    <p className="keywords-hint">Scripts are word-count calibrated to match this duration exactly</p>
                  </div>

                  {useOwnScript ? (
                    <div>
                      <div className="form-group" style={{marginBottom:24}}>
                        <label className="form-label">Your Script</label>
                        <textarea
                          className="form-textarea"
                          style={{minHeight:160, fontSize:14, lineHeight:1.7}}
                          placeholder="Paste your script here..."
                          value={ownScriptText}
                          onChange={e => setOwnScriptText(e.target.value)}
                        />
                        <p className="keywords-hint">This script will be used for the shot list and scene generation.</p>
                      </div>
                      <div className="action-row">
                        <button className="btn-primary" disabled={!ownScriptText.trim()} onClick={() => {
                          const customScript = {
                            title: 'Custom Script',
                            hook: ownScriptText.split('.')[0] || ownScriptText.slice(0,60),
                            body: ownScriptText,
                            cta: '',
                            fullScript: ownScriptText,
                            mood: 'Custom',
                            approach: 'User provided',
                            estimatedDuration: `${scriptDuration}s`,
                          }
                          setChosenScript(customScript)
                          save({ chosen_script: customScript })
                          handleGenerateDirections()
                        }}>
                          Use This Script →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="cards-grid">
                        {scripts.map((s,i) => <ScriptCard key={i} script={s} selected={chosenScript?.title === s.title} onClick={() => setChosenScript(s)} />)}
                      </div>
                      {scripts.length === 0 && !scriptsLoading && (
                        <div style={{textAlign:'center',padding:'40px 0'}}>
                          <button className="btn-primary" onClick={handleGenerateScripts}>Generate Scripts →</button>
                        </div>
                      )}
                      {scripts.length > 0 && (
                        <div className="action-row">
                          <button className="btn-primary" disabled={!chosenScript} onClick={handleGenerateDirections}>Choose Visual Direction →</button>
                          <button className="btn-secondary" onClick={handleGenerateScripts}>Regenerate Scripts</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {scriptsLoading && <LoadingPulse message={`Writing ${scriptDuration}s scripts...`} sub={`~${Math.round(scriptDuration * 2.3)} spoken words each`} />}
            </div>
          )}

          {/* STEP 4: Directions */}
          {step === STEPS.DIRECTIONS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 4</p>
                <h1 className="step-title">Visual Direction</h1>
                <p className="step-sub">{directionsLoading ? 'Generating visual worlds...' : 'Choose the world your campaign lives in.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div><div className="summary-chip"><strong>Script:</strong> {chosenScript?.title}</div></div>}
              {directionsLoading ? <LoadingPulse message="Building visual worlds..." /> : (
                <>
                  <div className="cards-grid">
                    {directions.map((d,i) => <DirectionCard key={i} direction={d} selected={chosenDirection?.title === d.title} onClick={() => setChosenDirection(d)} />)}
                  </div>
                  <div className="action-row">
                    <button className="btn-primary" disabled={!chosenDirection} onClick={handleGenerateAvatars}>Cast the Character →</button>
                    <button className="btn-secondary" onClick={handleGenerateDirections}>Regenerate Directions</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 5: Avatar */}
          {step === STEPS.AVATAR && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 5</p>
                <h1 className="step-title">Choose Your Character</h1>
                <p className="step-sub">{avatarsLoading ? 'Generating character portraits...' : 'Pick one. This character appears in every scene.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div><div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div></div>}

              {/* Aspect ratio selector — set here before scene generation */}
              {!avatarsLoading && (
                <div className="form-group" style={{marginBottom:28}}>
                  <label className="form-label">Video Format</label>
                  <div className="aspect-selector">
                    <button className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>
                      <span className="aspect-icon">🖥</span>
                      <span className="aspect-label">16:9</span>
                      <span className="aspect-desc">Landscape · YouTube · TV</span>
                    </button>
                    <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>
                      <span className="aspect-icon">📱</span>
                      <span className="aspect-label">9:16</span>
                      <span className="aspect-desc">Vertical · Reels · TikTok</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="avatar-grid">
                {avatarImages.map((img, i) => (
                  <div key={i} className={`avatar-card ${!avatarsLoading && chosenAvatarIdx === i ? 'selected' : ''} ${avatarsLoading ? 'loading-card' : ''}`} onClick={() => !avatarsLoading && img && setChosenAvatarIdx(i)}>
                    {avatarsLoading
                      ? <div className="avatar-portrait-shimmer" />
                      : img
                        ? <img src={img} alt={avatarLabels[i] || `Avatar ${i+1}`} className="avatar-portrait" />
                        : <div className="avatar-failed">Failed</div>
                    }
                    <div className="avatar-label-box">
                      <p className="avatar-label-text">{avatarsLoading ? '...' : (avatarLabels[i] || `Character ${i+1}`)}</p>
                    </div>
                    {!avatarsLoading && chosenAvatarIdx === i && <div className="avatar-check">✓</div>}
                  </div>
                ))}
              </div>

              {!avatarsLoading && (
                <div className="action-row">
                  <button className="btn-primary" disabled={chosenAvatarIdx === null} onClick={handleGenerateScenes}>
                    Lock Character & Build Storyboard ({aspectRatio}) →
                  </button>
                  <button className="btn-secondary" onClick={handleGenerateAvatars}>Regenerate Characters</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Scenes */}
          {step === STEPS.SCENES && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 6</p>
                <h1 className="step-title">Scene Builder</h1>
                <p className="step-sub">
                  {scenesLoading
                    ? `Building storyboard in ${aspectRatio} — ${scenesGenerated} of ${shotList.length} scenes complete`
                    : `${scenes.length} scenes · ${aspectRatio} format · 2K resolution`}
                </p>
              </div>

              {lockedAvatarDataUrl && (
                <div className="locked-strip">
                  <img src={lockedAvatarDataUrl} alt="Locked character" className="locked-portrait" />
                  <div className="locked-info">
                    <p className="locked-name">{avatarLabels[chosenAvatarIdx] || 'Character'}</p>
                    <p className="locked-sub">Locked — reference image used in every scene</p>
                  </div>
                  <span className="lock-badge">🔒 {aspectRatio}</span>
                </div>
              )}

              {scenesLoading && shotList.length > 0 && (
                <>
                  <p className="progress-text">{scenesGenerated} / {shotList.length} scenes · generating {BATCH_SIZE} at a time</p>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${(scenesGenerated / shotList.length) * 100}%` }} />
                  </div>
                </>
              )}

              {scenes.length > 0 && (
                <div className="storyboard-strip">
                  {scenes.map((scene, i) => (
                    <div key={i} className={`scene-tile ${currentScene === i ? 'active-tile' : ''}`} onClick={() => setCurrentScene(i)}>
                      {scene.loading
                        ? <div className={`scene-tile-shimmer ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                        : scene.imageUrl
                          ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className={`scene-tile-img ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                          : <div className={`scene-tile-shimmer ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                      }
                      <div className="scene-tile-label">
                        <span>{i+1}</span>
                        {scene.shot && <span className="scene-tile-shot">{scene.shot.shotType}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {scenes[currentScene] && (
                <div className="scene-detail">
                  {scenes[currentScene].loading
                    ? <div className={`scene-detail-shimmer ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                    : scenes[currentScene].imageUrl
                      ? <img src={scenes[currentScene].imageUrl} alt={`Scene ${currentScene+1}`} className={`scene-detail-img ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                      : <div className={`scene-detail-shimmer ${aspectRatio === '9:16' ? 'vertical' : ''}`} />
                  }
                  {!scenes[currentScene].loading && scenes[currentScene].imageUrl && (
                    <button className="scene-download-btn" onClick={() => downloadImage(scenes[currentScene].imageUrl, `scene-${currentScene+1}-${aspectRatio.replace(':','x')}.png`)}>
                      ↓ Download
                    </button>
                  )}
                  {scenes[currentScene].shot && (
                    <div className="scene-detail-body">
                      {[
                        ['Shot Type', scenes[currentScene].shot.shotType],
                        ['Script Moment', scenes[currentScene].shot.scriptMoment],
                        ['Action', scenes[currentScene].shot.action],
                        ['Environment', scenes[currentScene].shot.environment],
                        ['Camera', scenes[currentScene].shot.cameraMove],
                        ['Mood', scenes[currentScene].shot.mood],
                      ].map(([l,v]) => v && (
                        <div key={l} className="scene-detail-row">
                          <span className="scene-detail-label">{l}</span>
                          <span className="scene-detail-value">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!scenesLoading && scenes.length > 0 && (
                <div className="action-row">
                  <button className="btn-primary" disabled={scenes.some(s => s.loading)} onClick={handleFinishStoryboard}>View Full Storyboard →</button>
                  {currentScene > 0 && <button className="btn-secondary" onClick={() => setCurrentScene(s => s - 1)}>← Prev</button>}
                  {currentScene < scenes.length - 1 && <button className="btn-secondary" onClick={() => setCurrentScene(s => s + 1)}>Next →</button>}
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Storyboard */}
          {step === STEPS.STORYBOARD && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Complete</p>
                <h1 className="step-title">Full Storyboard</h1>
                <p className="step-sub">{scenes.length} scenes · {aspectRatio} · 2K</p>
              </div>
              <div className="summary-strip">
                <div className="summary-chip"><strong>Concept:</strong> {chosenConcept?.title}</div>
                <div className="summary-chip"><strong>Script:</strong> {chosenScript?.title}</div>
                <div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div>
                <div className="summary-chip"><strong>Character:</strong> {avatarLabels[chosenAvatarIdx]}</div>
                <div className="summary-chip"><strong>Format:</strong> {aspectRatio}</div>
                <div className="summary-chip"><strong>Scenes:</strong> {scenes.length}</div>
              </div>
              <div className="storyboard-final">
                {scenes.map((scene, i) => (
                  <div key={i} className="storyboard-final-tile">
                    {scene.imageUrl
                      ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className={aspectRatio === '9:16' ? 'vertical' : ''} />
                      : <div style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontSize:12 }}>No image</div>
                    }
                    <div className="storyboard-final-label">
                      <span>Scene {i+1} {scene.shot && `· ${scene.shot.shotType}`}</span>
                      {scene.imageUrl && (
                        <button className="tile-dl-btn" onClick={() => downloadImage(scene.imageUrl, `scene-${i+1}.png`)}>↓</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {chosenScript && (
                <div className="analysis-card">
                  <p className="analysis-title">Script — {chosenScript.title}</p>
                  <p style={{ fontSize:14, color:'#888', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{chosenScript.fullScript}</p>
                </div>
              )}
              <div className="action-row">
                <button className="btn-primary" onClick={handleReset}>New Campaign</button>
                <button className="btn-secondary" onClick={() => setStep(STEPS.SCENES)}>← Back to Scenes</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
