'use client'

import { useState, useEffect, useCallback } from 'react'
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

// Extract base64 data from a data URL
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

// Generate image — optionally with a reference image for character consistency
async function generateImage(prompt, referenceDataUrl = null) {
  const body = { prompt }
  if (referenceDataUrl) {
    body.referenceImageBase64 = dataUrlToBase64(referenceDataUrl)
    body.referenceMimeType = getMimeType(referenceDataUrl)
  }
  const res = await fetch('/api/campaign/generate-image', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
          <div className="dot" /><span className="dot-label">{label}</span>
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
  const [avatarImages, setAvatarImages] = useState([null,null,null,null])
  const [avatarLabels, setAvatarLabels] = useState([])
  const [chosenAvatarIdx, setChosenAvatarIdx] = useState(null)
  const [avatarsLoading, setAvatarsLoading] = useState(false)
  const [shotList, setShotList] = useState([])
  const [scenes, setScenes] = useState([])
  const [currentScene, setCurrentScene] = useState(0)
  const [scenesLoading, setScenesLoading] = useState(false)
  const [scenesGenerated, setScenesGenerated] = useState(0)
  const [useOwnScript, setUseOwnScript] = useState(false)
  const [ownScriptText, setOwnScriptText] = useState('')
  const [error, setError] = useState(null)

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
    if (!selectedClientId) return
    supabase.from('brand_intake').select('*').eq('client_id', selectedClientId).maybeSingle()
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

  const lockedAvatarDataUrl = chosenAvatarIdx !== null ? avatarImages[chosenAvatarIdx] : null

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
        body: JSON.stringify({ concept: chosenConcept, analysis, duration: scriptDuration, previousScripts: scripts }),
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
      // Generate all 4 avatars in parallel — NO reference image, these are portraits
      const results = await Promise.allSettled(prompts.map(p => generateImage(p.imagePrompt)))
      setAvatarImages(results.map(r => r.status === 'fulfilled' ? r.value : null))
      save({ chosen_direction: chosenDirection })
    } catch (e) { setError(e.message) }
    finally { setAvatarsLoading(false) }
  }

  async function handleGenerateScenes() {
    if (chosenAvatarIdx === null) return
    setScenesLoading(true); setScenesGenerated(0); setCurrentScene(0)
    setStep(STEPS.SCENES)
    const avatarLabel = avatarLabels[chosenAvatarIdx] || 'Avatar'
    const avatarDataUrl = avatarImages[chosenAvatarIdx]
    save({ chosen_avatar: avatarDataUrl, avatars: avatarImages })

    try {
      // Step 1: Generate full shot list from script
      const shotRes = await fetch('/api/campaign/generate?type=shot-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: chosenScript, duration: scriptDuration,
          concept: chosenConcept, direction: chosenDirection, avatarLabel,
        }),
      })
      const shotJson = await shotRes.json()
      if (!shotJson.success) throw new Error(shotJson.error)

      const shots = shotJson.shotList
      setShotList(shots)
      setScenes(shots.map(() => ({ imageUrl: null, loading: true, shot: null })))

      // Step 2: Generate each scene image using avatar as reference
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        // Build cinematic prompt with shot type and avatar reference instruction
        const fullPrompt = `${shot.imagePrompt}

Shot type: ${shot.shotType}. Camera: ${shot.cameraMove}. 
The character in this scene is the SAME person as the reference portrait image provided.
Maintain exact facial features, hair, skin tone, and outfit from the reference.
Scene: ${shot.environment}. Action: ${shot.action}.
Photorealistic, cinematic, ${chosenDirection.colorWorld}, ${chosenDirection.lighting}. No text, no watermarks.`

        try {
          // Pass avatar portrait as reference image for character consistency
          const imageUrl = await generateImage(fullPrompt, avatarDataUrl)
          setScenes(prev => {
            const updated = [...prev]
            updated[i] = { imageUrl, loading: false, shot }
            return updated
          })
        } catch (e) {
          setScenes(prev => {
            const updated = [...prev]
            updated[i] = { imageUrl: null, loading: false, shot, error: e.message }
            return updated
          })
        }
        setScenesGenerated(i + 1)
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
        .action-row { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 24px; }
        .pulse-ring { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFD60A22; border-top-color: #FFD60A; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-msg { font-size: 14px; color: #555; letter-spacing: 0.05em; }
        .loading-sub { font-size: 12px; color: #333; margin-top: 8px; }
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
        /* Avatar grid — 4 portrait cards */
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
        /* Locked avatar strip */
        .locked-strip { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #111; border: 1px solid #1e1e1e; border-radius: 10px; margin-bottom: 24px; }
        .locked-portrait { width: 56px; height: 72px; border-radius: 8px; object-fit: cover; border: 2px solid #FFD60A; }
        .locked-info { flex: 1; }
        .locked-name { font-size: 13px; font-weight: 600; color: #e0e0e0; }
        .locked-sub { font-size: 11px; color: #555; margin-top: 2px; }
        .lock-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #FFD60A; border: 1px solid #FFD60A44; padding: 4px 10px; border-radius: 100px; }
        /* Scene storyboard grid */
        .storyboard-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 32px; }
        .scene-tile { border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; cursor: pointer; transition: all 0.2s; background: #111; }
        .scene-tile:hover { border-color: #333; }
        .scene-tile.active-tile { border-color: #FFD60A; }
        .scene-tile-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .scene-tile-shimmer { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .scene-tile-label { padding: 6px 8px; font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.06em; display: flex; justify-content: space-between; }
        .scene-tile-shot { color: #FFD60A; }
        /* Scene detail view */
        .scene-detail { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        .scene-detail-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .scene-detail-shimmer { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .scene-detail-body { padding: 20px 24px; }
        .scene-detail-row { display: grid; grid-template-columns: 100px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
        .scene-detail-row:last-child { border-bottom: none; }
        .scene-detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; padding-top: 1px; }
        .scene-detail-value { font-size: 12px; color: #888; line-height: 1.5; }
        /* Progress bar */
        .progress-bar-wrap { background: #1a1a1a; border-radius: 100px; height: 4px; margin: 16px 0; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #FFD60A; border-radius: 100px; transition: width 0.3s; }
        .error-bar { background: #2a1010; border: 1px solid #5a1a1a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #ff6b6b; margin-bottom: 20px; }
        .summary-strip { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
        .summary-chip { padding: 8px 16px; background: #111; border: 1px solid #1e1e1e; border-radius: 100px; font-size: 12px; color: #666; }
        .summary-chip strong { color: #aaa; }
        .storyboard-final { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 40px; }
        .storyboard-final-tile { border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; }
        .storyboard-final-tile img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .storyboard-final-label { padding: 8px 10px; font-size: 10px; color: #555; text-transform: uppercase; background: #111; }
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
                  {/* Mode toggle */}
                  <div className="form-group" style={{marginBottom:24}}>
                    <label className="form-label">Script Mode</label>
                    <div className="count-toggle">
                      <button className={`count-btn ${!useOwnScript ? 'active' : ''}`} onClick={() => setUseOwnScript(false)}>AI Generate</button>
                      <button className={`count-btn ${useOwnScript ? 'active' : ''}`} onClick={() => setUseOwnScript(true)}>Use My Own Script</button>
                    </div>
                  </div>

                  {useOwnScript ? (
                    /* Own script mode */
                    <div>
                      <div className="form-group" style={{marginBottom:16}}>
                        <label className="form-label">Ad Duration</label>
                        <div className="duration-options">
                          {[15,30,45,60].map(d => <button key={d} className={`duration-btn ${scriptDuration === d ? 'active' : ''}`} onClick={() => setScriptDuration(d)}>{d}s</button>)}
                        </div>
                      </div>
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
                        <button
                          className="btn-primary"
                          disabled={!ownScriptText.trim()}
                          onClick={() => {
                            const customScript = {
                              title: 'Custom Script',
                              hook: ownScriptText.split('.')[0] || ownScriptText.slice(0, 60),
                              body: ownScriptText,
                              cta: '',
                              fullScript: ownScriptText,
                              mood: 'Custom',
                              approach: 'User provided',
                            }
                            setChosenScript(customScript)
                            save({ chosen_script: customScript })
                            handleGenerateDirections()
                          }}
                        >
                          Use This Script →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* AI generate mode */
                    <div>
                      <div className="form-group" style={{marginBottom:24}}>
                        <label className="form-label">Ad Duration</label>
                        <div className="duration-options">
                          {[15,30,45,60].map(d => <button key={d} className={`duration-btn ${scriptDuration === d ? 'active' : ''}`} onClick={() => setScriptDuration(d)}>{d}s</button>)}
                        </div>
                      </div>
                      <div className="cards-grid">
                        {scripts.map((s,i) => <ScriptCard key={i} script={s} selected={chosenScript?.title === s.title} onClick={() => setChosenScript(s)} />)}
                      </div>
                      <div className="action-row">
                        <button className="btn-primary" disabled={!chosenScript} onClick={handleGenerateDirections}>Choose Visual Direction →</button>
                        <button className="btn-secondary" onClick={handleGenerateScripts}>Regenerate Scripts</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {scriptsLoading && <LoadingPulse message="Writing scripts..." />}
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
                <p className="step-sub">{avatarsLoading ? 'Generating character portraits...' : 'Pick one. This character will appear in every scene of your campaign.'}</p>
              </div>
              {chosenConcept && <div className="summary-strip"><div className="summary-chip"><strong>Concept:</strong> {chosenConcept.title}</div><div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div></div>}

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
                  <button className="btn-primary" disabled={chosenAvatarIdx === null} onClick={handleGenerateScenes}>Lock Character & Build Storyboard →</button>
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
                    ? `Generating storyboard... ${scenesGenerated} of ${shotList.length} scenes`
                    : `${scenes.length} scenes generated. Review your storyboard.`}
                </p>
              </div>

              {/* Locked character strip */}
              {lockedAvatarDataUrl && (
                <div className="locked-strip">
                  <img src={lockedAvatarDataUrl} alt="Locked character" className="locked-portrait" />
                  <div className="locked-info">
                    <p className="locked-name">{avatarLabels[chosenAvatarIdx] || 'Character'}</p>
                    <p className="locked-sub">Locked — appears in every scene</p>
                  </div>
                  <span className="lock-badge">🔒 Locked</span>
                </div>
              )}

              {/* Progress bar while generating */}
              {scenesLoading && shotList.length > 0 && (
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${(scenesGenerated / shotList.length) * 100}%` }} />
                </div>
              )}

              {/* Storyboard strip — all scenes */}
              {scenes.length > 0 && (
                <div className="storyboard-strip">
                  {scenes.map((scene, i) => (
                    <div key={i} className={`scene-tile ${currentScene === i ? 'active-tile' : ''}`} onClick={() => setCurrentScene(i)}>
                      {scene.loading
                        ? <div className="scene-tile-shimmer" />
                        : scene.imageUrl
                          ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className="scene-tile-img" />
                          : <div className="scene-tile-shimmer" />
                      }
                      <div className="scene-tile-label">
                        <span>Scene {i+1}</span>
                        {scene.shot && <span className="scene-tile-shot">{scene.shot.shotType}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current scene detail */}
              {scenes[currentScene] && (
                <div className="scene-detail">
                  {scenes[currentScene].loading
                    ? <div className="scene-detail-shimmer" />
                    : scenes[currentScene].imageUrl
                      ? <img src={scenes[currentScene].imageUrl} alt={`Scene ${currentScene+1}`} className="scene-detail-img" />
                      : <div className="scene-detail-shimmer" />
                  }
                  {scenes[currentScene].shot && (
                    <div className="scene-detail-body">
                      {[
                        ['Shot Type', scenes[currentScene].shot.shotType],
                        ['Script Moment', scenes[currentScene].shot.scriptMoment],
                        ['Action', scenes[currentScene].shot.action],
                        ['Environment', scenes[currentScene].shot.environment],
                        ['Camera', scenes[currentScene].shot.cameraMove],
                        ['Mood', scenes[currentScene].shot.mood],
                      ].map(([l,v]) => (
                        <div key={l} className="scene-detail-row">
                          <span className="scene-detail-label">{l}</span>
                          <span className="scene-detail-value">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
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
                <p className="step-sub">{scenes.length} scenes. Your campaign is ready.</p>
              </div>
              <div className="summary-strip">
                <div className="summary-chip"><strong>Concept:</strong> {chosenConcept?.title}</div>
                <div className="summary-chip"><strong>Script:</strong> {chosenScript?.title}</div>
                <div className="summary-chip"><strong>Direction:</strong> {chosenDirection?.title}</div>
                <div className="summary-chip"><strong>Character:</strong> {avatarLabels[chosenAvatarIdx]}</div>
                <div className="summary-chip"><strong>Scenes:</strong> {scenes.length}</div>
              </div>
              <div className="storyboard-final">
                {scenes.map((scene, i) => (
                  <div key={i} className="storyboard-final-tile">
                    {scene.imageUrl
                      ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} />
                      : <div style={{ aspectRatio:'16/9', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontSize:12 }}>No image</div>
                    }
                    <div className="storyboard-final-label">
                      Scene {i+1} {scene.shot && `· ${scene.shot.shotType}`}
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
                <button className="btn-primary" onClick={() => {
                  setStep(STEPS.INPUT); setCampaignId(null); setConcepts([]); setChosenConcept(null);
                  setScripts([]); setChosenScript(null); setDirections([]); setChosenDirection(null);
                  setAvatarImages([null,null,null,null]); setChosenAvatarIdx(null);
                  setShotList([]); setScenes([]); setAnalysis(null);
                  setUseOwnScript(false); setOwnScriptText('');
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
