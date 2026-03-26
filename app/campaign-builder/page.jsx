'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STEPS = {
  INPUT: 0,
  ANALYZING: 1,
  CONCEPTS: 2,
  SCRIPTS: 3,
  DIRECTIONS: 4,
  AVATAR: 5,
  SCENES: 6,
  STORYBOARD: 7,
}

const STEP_LABELS = [
  'Brand Input', 'Analysis', 'Concepts', 'Script',
  'Visual Direction', 'Avatar', 'Scenes', 'Storyboard',
]

async function autosave(campaignId, clientId, patch, onSave) {
  try {
    const res = await fetch('/api/campaign/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, clientId, data: patch }),
    })
    const json = await res.json()
    if (json.success && !campaignId && json.campaignId) onSave(json.campaignId)
  } catch (e) {
    console.error('Autosave failed', e)
  }
}

async function generateImage(prompt) {
  const res = await fetch('/api/campaign/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.imageUrl
}

function StepDots({ current }) {
  return (
    <div className="step-dots">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className={`dot-item ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          <div className="dot" />
          <span className="dot-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingPulse({ message }) {
  return (
    <div className="loading-state">
      <div className="pulse-ring" />
      <p className="loading-msg">{message}</p>
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
        <div className="concept-row">
          <span className="concept-label">Visual World</span>
          <span className="concept-value">{concept.visualUniverse}</span>
        </div>
        <div className="concept-row">
          <span className="concept-label">Metaphor</span>
          <span className="concept-value">{concept.metaphorBridge}</span>
        </div>
        <div className="concept-row">
          <span className="concept-label">Emotion</span>
          <span className="concept-value">{concept.emotionalFrame}</span>
        </div>
      </div>
      {concept.siteAnchors?.length > 0 && (
        <div className="concept-anchors">
          {concept.siteAnchors.slice(0, 2).map((a, i) => (
            <span key={i} className="anchor-tag">{a}</span>
          ))}
        </div>
      )}
      {selected && <div className="selected-check">✓</div>}
    </div>
  )
}

function ScriptCard({ script, selected, onClick }) {
  return (
    <div className={`script-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="script-header">
        <h3 className="script-title">{script.title}</h3>
        <span className="script-mood">{script.mood}</span>
      </div>
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
        <div className="direction-row">
          <span className="direction-label">Color</span>
          <span className="direction-value">{direction.colorWorld}</span>
        </div>
        <div className="direction-row">
          <span className="direction-label">Light</span>
          <span className="direction-value">{direction.lighting}</span>
        </div>
        <div className="direction-row">
          <span className="direction-label">Lens</span>
          <span className="direction-value">{direction.lensAndCamera}</span>
        </div>
        <div className="direction-row">
          <span className="direction-label">Ref</span>
          <span className="direction-value">{direction.cinematicReference}</span>
        </div>
      </div>
      {selected && <div className="selected-check">✓</div>}
    </div>
  )
}

function ImageGrid({ images, selectedIdx, onSelect, loading, loadingCount = 4 }) {
  const slots = loading ? Array(loadingCount).fill(null) : images
  return (
    <div className="image-grid">
      {slots.map((img, i) => (
        <div
          key={i}
          className={`image-slot ${!loading && selectedIdx === i ? 'selected' : ''} ${loading ? 'loading-slot' : ''}`}
          onClick={() => !loading && img && onSelect(i)}
        >
          {loading ? (
            <div className="img-loading-shimmer" />
          ) : img ? (
            <>
              <img src={img} alt={`Option ${i + 1}`} className="gen-image" />
              {selectedIdx === i && <div className="img-check">✓</div>}
            </>
          ) : (
            <div className="img-empty">Failed</div>
          )}
        </div>
      ))}
    </div>
  )
}

function AnalysisSummary({ analysis }) {
  const rows = [
    { label: 'Offer', value: analysis.coreOffer },
    { label: 'Customer', value: analysis.targetCustomer },
    { label: 'Problem', value: analysis.corePainPoint },
    { label: 'Transformation', value: analysis.desiredTransformation },
    { label: 'Tone', value: analysis.websiteTone },
    { label: 'Differentiators', value: analysis.differentiators?.join(', ') },
  ]
  return (
    <div className="analysis-card">
      <p className="analysis-title">Brand Intelligence Extracted</p>
      {rows.map(({ label, value }) => (
        <div key={label} className="analysis-row">
          <span className="analysis-label">{label}</span>
          <span className="analysis-value">{value}</span>
        </div>
      ))}
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
  const [analysis, setAnalysis] = useState(null)
  const [concepts, setConcepts] = useState([])
  const [chosenConcept, setChosenConcept] = useState(null)
  const [conceptsLoading, setConceptsLoading] = useState(false)
  const [scripts, setScripts] = useState([])
  const [chosenScript, setChosenScript] = useState(null)
  const [scriptDuration, setScriptDuration] = useState(30)
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [directions, setDirections] = useState([])
  const [chosenDirection, setChosenDirection] = useState(null)
  const [directionsLoading, setDirectionsLoading] = useState(false)
  const [avatarImages, setAvatarImages] = useState([null, null, null, null])
  const [avatarLabels, setAvatarLabels] = useState([])
  const [chosenAvatarIdx, setChosenAvatarIdx] = useState(null)
  const [avatarsLoading, setAvatarsLoading] = useState(false)
  const [sceneCount] = useState(4)
  const [scenes, setScenes] = useState([])
  const [currentScene, setCurrentScene] = useState(0)
  const [scenesLoading, setScenesLoading] = useState(false)
  const [error, setError] = useState(null)

  // Read clientId from URL on client side only (fixes hydration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientId = params.get('clientId')
    if (clientId) setSelectedClientId(clientId)
  }, [])

  // Load clients
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, status')
      .order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  // Load brand intake when client selected
  useEffect(() => {
    if (!selectedClientId) return
    supabase
      .from('brand_intake')
      .select('*')
      .eq('client_id', selectedClientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.website) setWebsiteUrl(data.website)
          if (data.brand_name) setProductName(data.brand_name)
        }
      })
  }, [selectedClientId])

  const save = useCallback((patch) => {
    autosave(campaignId, selectedClientId, patch, (id) => setCampaignId(id))
  }, [campaignId, selectedClientId])

  async function handleAnalyze() {
    if (!websiteUrl && !productName) {
      setError('Enter a website URL or product name to continue.')
      return
    }
    setError(null)
    setStep(STEPS.ANALYZING)
    try {
      const res = await fetch('/api/campaign/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, productName, offerNotes }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setAnalysis(json.analysis)
      save({ website_url: websiteUrl, product_name: productName, offer_notes: offerNotes, website_analysis: json.analysis })
      await handleGenerateConcepts(json.analysis)
    } catch (e) {
      setError(e.message)
      setStep(STEPS.INPUT)
    }
  }

  async function handleGenerateConcepts(analysisOverride) {
    const a = analysisOverride || analysis
    setConceptsLoading(true)
    setStep(STEPS.CONCEPTS)
    const keywords = creativeKeywords.split(',').map(k => k.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/campaign/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: a, creativeKeywords: keywords, count: conceptCount, previousConcepts: concepts }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConcepts(json.concepts)
      setChosenConcept(null)
      save({ concepts: json.concepts, creative_keywords: keywords })
    } catch (e) {
      setError(e.message)
    } finally {
      setConceptsLoading(false)
    }
  }

  async function handleGenerateScripts() {
    if (!chosenConcept) return
    setScriptsLoading(true)
    setStep(STEPS.SCRIPTS)
    try {
      const res = await fetch('/api/campaign/generate?type=scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, analysis, duration: scriptDuration, previousScripts: scripts }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setScripts(json.scripts)
      setChosenScript(null)
      save({ chosen_concept: chosenConcept, script_duration: scriptDuration, scripts: json.scripts })
    } catch (e) {
      setError(e.message)
    } finally {
      setScriptsLoading(false)
    }
  }

  async function handleGenerateDirections() {
    if (!chosenScript) return
    setDirectionsLoading(true)
    setStep(STEPS.DIRECTIONS)
    try {
      const res = await fetch('/api/campaign/generate?type=directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, analysis }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDirections(json.directions)
      setChosenDirection(null)
      save({ chosen_script: chosenScript, visual_directions: json.directions })
    } catch (e) {
      setError(e.message)
    } finally {
      setDirectionsLoading(false)
    }
  }

  async function handleGenerateAvatars() {
    if (!chosenDirection) return
    setAvatarsLoading(true)
    setAvatarImages([null, null, null, null])
    setChosenAvatarIdx(null)
    setStep(STEPS.AVATAR)
    try {
      const res = await fetch('/api/campaign/generate?type=avatar-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: chosenConcept, direction: chosenDirection, analysis }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const prompts = json.avatarPrompts
      setAvatarLabels(prompts.map(p => p.label))
      const imageResults = await Promise.allSettled(prompts.map(p => generateImage(p.imagePrompt)))
      setAvatarImages(imageResults.map(r => r.status === 'fulfilled' ? r.value : null))
      save({ chosen_direction: chosenDirection })
    } catch (e) {
      setError(e.message)
    } finally {
      setAvatarsLoading(false)
    }
  }

  async function handleGenerateScenes() {
    if (chosenAvatarIdx === null) return
    setScenesLoading(true)
    setScenes(Array(sceneCount).fill({ options: [], chosen: null }))
    setCurrentScene(0)
    setStep(STEPS.SCENES)
    const lockedAvatarLabel = avatarLabels[chosenAvatarIdx] || 'Avatar'
    save({ chosen_avatar: avatarImages[chosenAvatarIdx], avatars: avatarImages })
    try {
      for (let i = 0; i < sceneCount; i++) {
        const res = await fetch('/api/campaign/generate?type=scene-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: chosenScript, concept: chosenConcept, direction: chosenDirection, avatarLabel: lockedAvatarLabel, sceneIndex: i, totalScenes: sceneCount }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        const imageResults = await Promise.allSettled(json.scenePrompts.map(p => generateImage(p)))
        const images = imageResults.map(r => r.status === 'fulfilled' ? r.value : null)
        setScenes(prev => {
          const updated = [...prev]
          updated[i] = { options: images, chosen: null }
          return updated
        })
      }
      setScenesLoading(false)
    } catch (e) {
      setError(e.message)
      setScenesLoading(false)
    }
  }

  function handleChooseSceneImage(sceneIdx, imageIdx) {
    setScenes(prev => {
      const updated = [...prev]
      updated[sceneIdx] = { ...updated[sceneIdx], chosen: imageIdx }
      return updated
    })
  }

  function handleFinishStoryboard() {
    save({ scenes, storyboard_complete: true })
    setStep(STEPS.STORYBOARD)
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
        .cb-back-btn { background: none; border: 1px solid #2a2a2a; color: #666; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s; letter-spacing: 0.05em; }
        .cb-back-btn:hover { border-color: #444; color: #aaa; }
        .step-dots { display: flex; align-items: flex-start; gap: 0; padding: 0 40px; margin: 32px 0 0; }
        .dot-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; cursor: default; }
        .dot-item::before { content: ''; position: absolute; top: 6px; left: calc(50% + 6px); right: calc(-50% + 6px); height: 1px; background: #2a2a2a; }
        .dot-item:last-child::before { display: none; }
        .dot-item.done::before { background: #FFD60A44; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #2a2a2a; border: 1px solid #333; z-index: 1; transition: all 0.2s; }
        .dot-item.done .dot { background: #FFD60A44; border-color: #FFD60A88; }
        .dot-item.active .dot { background: #FFD60A; border-color: #FFD60A; box-shadow: 0 0 12px #FFD60A66; }
        .dot-label { font-size: 10px; color: #444; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
        .dot-item.active .dot-label { color: #FFD60A; }
        .dot-item.done .dot-label { color: #555; }
        .cb-content { flex: 1; padding: 48px 40px 80px; max-width: 1100px; margin: 0 auto; width: 100%; }
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
        .btn-primary { background: #FFD60A; color: #0a0a0a; border: none; border-radius: 8px; padding: 14px 32px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; letter-spacing: 0.03em; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #ffe033; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-secondary { background: transparent; color: #888; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px 24px; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-secondary:hover { border-color: #444; color: #aaa; }
        .action-row { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 24px; }
        .pulse-ring { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFD60A22; border-top-color: #FFD60A; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-msg { font-size: 14px; color: #555; letter-spacing: 0.05em; }
        .analysis-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
        .analysis-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #FFD60A; margin-bottom: 16px; font-weight: 600; }
        .analysis-row { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1a1a1a; }
        .analysis-row:last-child { border-bottom: none; }
        .analysis-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; padding-top: 1px; }
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
        .concept-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; padding-top: 2px; }
        .concept-value { font-size: 12px; color: #888; line-height: 1.5; }
        .concept-anchors { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
        .anchor-tag { font-size: 10px; padding: 3px 10px; border-radius: 100px; border: 1px solid #222; color: #555; letter-spacing: 0.05em; }
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
        .direction-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; padding-top: 2px; }
        .direction-value { font-size: 12px; color: #777; line-height: 1.4; }
        .selected-check { position: absolute; top: 14px; right: 14px; width: 24px; height: 24px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #0a0a0a; }
        .image-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px; }
        .image-slot { aspect-ratio: 1; border-radius: 10px; border: 2px solid #1e1e1e; overflow: hidden; cursor: pointer; position: relative; transition: all 0.2s; background: #111; }
        .image-slot:hover { border-color: #333; }
        .image-slot.selected { border-color: #FFD60A; }
        .image-slot.loading-slot { cursor: default; }
        .gen-image { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-loading-shimmer { width: 100%; height: 100%; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .img-check { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; background: #FFD60A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #0a0a0a; }
        .img-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #333; font-size: 12px; }
        .avatar-label { text-align: center; font-size: 11px; color: #555; margin-top: 8px; letter-spacing: 0.05em; text-transform: uppercase; }
        .avatar-item { display: flex; flex-direction: column; }
        .scene-nav { display: flex; gap: 8px; margin-bottom: 24px; }
        .scene-tab { padding: 8px 18px; border-radius: 6px; border: 1px solid #2a2a2a; background: transparent; color: #555; font-size: 12px; cursor: pointer; transition: all 0.15s; font-family: inherit; letter-spacing: 0.05em; position: relative; }
        .scene-tab.active { border-color: #FFD60A; color: #FFD60A; }
        .scene-tab.complete::after { content: '✓'; position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; background: #FFD60A; border-radius: 50%; font-size: 8px; color: #0a0a0a; display: flex; align-items: center; justify-content: center; line-height: 14px; text-align: center; }
        .storyboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 40px; }
        .storyboard-tile { cursor: pointer; border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; transition: all 0.2s; }
        .storyboard-tile:hover { border-color: #333; transform: scale(1.02); }
        .storyboard-tile img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
        .storyboard-tile-label { padding: 8px 10px; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; background: #111; }
        .error-bar { background: #2a1010; border: 1px solid #5a1a1a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #ff6b6b; margin-bottom: 20px; }
        .locked-avatar-strip { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #111; border: 1px solid #1e1e1e; border-radius: 10px; margin-bottom: 24px; }
        .locked-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #FFD60A; }
        .locked-avatar-info { flex: 1; }
        .locked-avatar-name { font-size: 13px; font-weight: 600; color: #e0e0e0; }
        .locked-avatar-sub { font-size: 11px; color: #555; margin-top: 2px; }
        .lock-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #FFD60A; border: 1px solid #FFD60A44; padding: 4px 10px; border-radius: 100px; }
        .summary-strip { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
        .summary-chip { padding: 8px 16px; background: #111; border: 1px solid #1e1e1e; border-radius: 100px; font-size: 12px; color: #666; }
        .summary-chip strong { color: #aaa; }
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
                <div className="form-group">
                  <label className="form-label">Number of Concepts</label>
                  <div className="count-toggle">
                    {[4, 6].map(n => (
                      <button key={n} className={`count-btn ${conceptCount === n ? 'active' : ''}`} onClick={() => setConceptCount(n)}>{n} concepts</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="action-row">
                <button className="btn-primary" onClick={handleAnalyze}>Analyze & Build →</button>
              </div>
            </div>
          )}

          {step === STEPS.ANALYZING && <LoadingPulse message="Reading the brand. Building intelligence..." />}

          {step === STEPS.CONCEPTS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 2</p>
                <h1 className="step-title">Campaign Concepts</h1>
                <p className="step-sub">{conceptsLoading ? 'Generating concepts...' : `${concepts.length} directions generated. Choose one.`}</p>
              </div>
              {analysis && !conceptsLoading && <AnalysisSummary analysis={analysis} />}
              {conceptsLoading ? <LoadingPulse message={`Generating ${conceptCount} distinct creative directions...`} /> : (
                <>
                  <div className="cards-grid" style={{ gridTemplateColumns: conceptCount === 6 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
                    {concepts.map((c, i) => <ConceptCard key={i} concept={c} selected={chosenConcept?.title === c.title} onClick={() => setChosenConcept(c)} />)}
                  </div>
                  <div className="action-row">
                    <button className="btn-primary" disabled={!chosenConcept} onClick={handleGenerateScripts}>Develop This Concept →</button>
                    <button className="btn-secondary" onClick={() => handleGenerateConcepts()}>Regenerate All</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === STEPS.SCRIPTS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 3</p>
                <h1 className="step-title">Script Variations</h1>
                <p className="step-sub">{scriptsLoading ? 'Writing scripts...' : 'Four distinct scripts. Pick the one that lands.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div></div>}
              {!scriptsLoading && (
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Ad Duration</label>
                  <div className="duration-options">
                    {[15, 30, 45, 60].map(d => <button key={d} className={`duration-btn ${scriptDuration === d ? 'active' : ''}`} onClick={() => setScriptDuration(d)}>{d}s</button>)}
                  </div>
                </div>
              )}
              {scriptsLoading ? <LoadingPulse message="Writing scripts..." /> : (
                <>
                  <div className="cards-grid">
                    {scripts.map((s, i) => <ScriptCard key={i} script={s} selected={chosenScript?.title === s.title} onClick={() => setChosenScript(s)} />)}
                  </div>
                  <div className="action-row">
                    <button className="btn-primary" disabled={!chosenScript} onClick={handleGenerateDirections}>Choose Visual Direction →</button>
                    <button className="btn-secondary" onClick={handleGenerateScripts}>Regenerate Scripts</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === STEPS.DIRECTIONS && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 4</p>
                <h1 className="step-title">Visual Direction</h1>
                <p className="step-sub">{directionsLoading ? 'Generating visual worlds...' : 'Choose the world your campaign lives in.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div><div className="summary-chip"><strong>Script:</strong> {chosenScript?.title}</div></div>}
              {directionsLoading ? <LoadingPulse message="Building four distinct visual worlds..." /> : (
                <>
                  <div className="cards-grid">
                    {directions.map((d, i) => <DirectionCard key={i} direction={d} selected={chosenDirection?.title === d.title} onClick={() => setChosenDirection(d)} />)}
                  </div>
                  <div className="action-row">
                    <button className="btn-primary" disabled={!chosenDirection} onClick={handleGenerateAvatars}>Cast the Avatar →</button>
                    <button className="btn-secondary" onClick={handleGenerateDirections}>Regenerate Directions</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === STEPS.AVATAR && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 5</p>
                <h1 className="step-title">Avatar Studio</h1>
                <p className="step-sub">{avatarsLoading ? 'Generating four avatar candidates...' : 'Choose one. This character appears in every scene.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div><div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div></div>}
              <div className="image-grid">
                {avatarImages.map((img, i) => (
                  <div key={i} className="avatar-item">
                    <div className={`image-slot ${!avatarsLoading && chosenAvatarIdx === i ? 'selected' : ''} ${avatarsLoading ? 'loading-slot' : ''}`} onClick={() => !avatarsLoading && img && setChosenAvatarIdx(i)}>
                      {avatarsLoading ? <div className="img-loading-shimmer" /> : img ? (<><img src={img} alt={`Avatar ${i + 1}`} className="gen-image" />{chosenAvatarIdx === i && <div className="img-check">✓</div>}</>) : <div className="img-empty">Failed to generate</div>}
                    </div>
                    {!avatarsLoading && avatarLabels[i] && <p className="avatar-label">{avatarLabels[i]}</p>}
                  </div>
                ))}
              </div>
              {!avatarsLoading && (
                <div className="action-row">
                  <button className="btn-primary" disabled={chosenAvatarIdx === null} onClick={handleGenerateScenes}>Lock Avatar & Build Scenes →</button>
                  <button className="btn-secondary" onClick={handleGenerateAvatars}>Regenerate Avatars</button>
                </div>
              )}
            </div>
          )}

          {step === STEPS.SCENES && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Step 6</p>
                <h1 className="step-title">Scene Builder</h1>
                <p className="step-sub">{scenesLoading ? `Generating ${sceneCount} scenes...` : 'Choose one image per scene.'}</p>
              </div>
              {chosenAvatarIdx !== null && avatarImages[chosenAvatarIdx] && (
                <div className="locked-avatar-strip">
                  <img src={avatarImages[chosenAvatarIdx]} alt="Locked avatar" className="locked-avatar-img" />
                  <div className="locked-avatar-info">
                    <p className="locked-avatar-name">{avatarLabels[chosenAvatarIdx] || 'Avatar'}</p>
                    <p className="locked-avatar-sub">Appears in every scene</p>
                  </div>
                  <span className="lock-badge">🔒 Locked</span>
                </div>
              )}
              {scenes.length > 0 && (
                <div className="scene-nav">
                  {scenes.map((scene, i) => <button key={i} className={`scene-tab ${currentScene === i ? 'active' : ''} ${scene.chosen !== null ? 'complete' : ''}`} onClick={() => setCurrentScene(i)}>Scene {i + 1}</button>)}
                </div>
              )}
              {scenes[currentScene] && <ImageGrid images={scenes[currentScene].options} selectedIdx={scenes[currentScene].chosen} onSelect={(idx) => handleChooseSceneImage(currentScene, idx)} loading={scenesLoading && (!scenes[currentScene]?.options?.length)} />}
              {scenesLoading && !scenes[currentScene]?.options?.length && <LoadingPulse message={`Generating scene ${currentScene + 1} of ${sceneCount}...`} />}
              {!scenesLoading && scenes.length > 0 && (
                <div className="action-row">
                  {currentScene < scenes.length - 1
                    ? <button className="btn-primary" onClick={() => setCurrentScene(s => s + 1)}>Next Scene →</button>
                    : <button className="btn-primary" disabled={scenes.some(s => s.chosen === null)} onClick={handleFinishStoryboard}>View Full Storyboard →</button>}
                  {currentScene > 0 && <button className="btn-secondary" onClick={() => setCurrentScene(s => s - 1)}>← Previous Scene</button>}
                </div>
              )}
            </div>
          )}

          {step === STEPS.STORYBOARD && (
            <div>
              <div className="step-heading">
                <p className="step-eyebrow">Complete</p>
                <h1 className="step-title">Full Storyboard</h1>
                <p className="step-sub">Your campaign is ready.</p>
              </div>
              <div className="summary-strip">
                <div className="summary-chip"><strong>Concept:</strong> {chosenConcept?.title}</div>
                <div className="summary-chip"><strong>Script:</strong> {chosenScript?.title}</div>
                <div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div>
                <div className="summary-chip"><strong>Avatar:</strong> {avatarLabels[chosenAvatarIdx]}</div>
              </div>
              <div className="storyboard-grid" style={{ gridTemplateColumns: `repeat(${Math.min(scenes.length, 4)}, 1fr)` }}>
                {scenes.map((scene, i) => {
                  const imgUrl = scene.chosen !== null ? scene.options[scene.chosen] : null
                  return (
                    <div key={i} className="storyboard-tile" onClick={() => { setCurrentScene(i); setStep(STEPS.SCENES) }}>
                      {imgUrl ? <img src={imgUrl} alt={`Scene ${i + 1}`} /> : <div style={{ aspectRatio: 1, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12 }}>No image</div>}
                      <div className="storyboard-tile-label">Scene {i + 1}</div>
                    </div>
                  )
                })}
              </div>
              {chosenScript && (
                <div className="analysis-card">
                  <p className="analysis-title">Campaign Script — {chosenScript.title}</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{chosenScript.fullScript}</p>
                </div>
              )}
              <div className="action-row">
                <button className="btn-primary" onClick={() => {
                  setStep(STEPS.INPUT); setCampaignId(null); setConcepts([]); setChosenConcept(null);
                  setScripts([]); setChosenScript(null); setDirections([]); setChosenDirection(null);
                  setAvatarImages([null, null, null, null]); setChosenAvatarIdx(null); setScenes([]); setAnalysis(null);
                }}>New Campaign</button>
                <button className="btn-secondary" onClick={() => setStep(STEPS.SCENES)}>← Back to Scenes</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
