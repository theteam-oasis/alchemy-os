'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function BriefPage({ params }) {
  const { clientId } = params

  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [activeConcept, setActiveConcept] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState({}) // { [campaignId]: 'approved'|'revisions'|'declined' }
  const [revisionText, setRevisionText] = useState({}) // { [campaignId]: string }
  const [submitting, setSubmitting] = useState({}) // { [campaignId]: bool }
  const [submitted, setSubmitted] = useState({}) // { [campaignId]: bool }

  useEffect(() => {
    loadData()
  }, [clientId])

  async function loadData() {
    setLoading(true)
    try {
      // Load client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
      setClient(clientData)

      // Load all complete campaigns for this client
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .eq('storyboard_complete', true)
        .order('created_at', { ascending: false })
        .limit(4)

      if (campaignData) {
        setCampaigns(campaignData)
        // Init action state from saved data
        const savedActions = {}
        const savedRevisions = {}
        campaignData.forEach(c => {
          if (c.client_status && c.client_status !== 'pending') {
            savedActions[c.id] = c.client_status
          }
          if (c.revision_notes) {
            savedRevisions[c.id] = c.revision_notes
          }
        })
        setActionState(savedActions)
        setRevisionText(savedRevisions)
        setSubmitted(Object.fromEntries(Object.keys(savedActions).map(k => [k, true])))
      }

      // Mark as viewed
      if (campaignData?.length) {
        campaignData.forEach(c => {
          fetch('/api/brief/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: c.id }),
          })
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(campaignId) {
    const status = actionState[campaignId]
    if (!status) return
    setSubmitting(prev => ({ ...prev, [campaignId]: true }))
    try {
      await fetch('/api/brief/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          clientStatus: status,
          revisionNotes: revisionText[campaignId] || null,
        }),
      })
      setSubmitted(prev => ({ ...prev, [campaignId]: true }))
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(prev => ({ ...prev, [campaignId]: false }))
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '2px solid #FFD60A22', borderTopColor: '#FFD60A', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#555', fontSize: 13, letterSpacing: '0.05em' }}>Loading brief...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#555', fontSize: 14 }}>No completed campaigns found for this client.</p>
      </div>
    )
  }

  const campaign = campaigns[activeConcept]
  if (!campaign) return null

  const concept = campaign.chosen_concept
  const script = campaign.chosen_script
  const direction = campaign.chosen_direction
  const scenes = campaign.scenes || []
  const aspectRatio = campaign.aspect_ratio || '16:9'
  const isVertical = aspectRatio === '9:16'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans', 'SF Pro Display', -apple-system, sans-serif; min-height: 100vh; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .brief-shell { min-height: 100vh; background: #0a0a0a; }

        /* Header */
        .brief-header { padding: 32px 48px 0; border-bottom: 1px solid #1a1a1a; }
        .brief-agency { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD60A; font-weight: 600; margin-bottom: 8px; }
        .brief-client-name { font-size: 32px; font-weight: 800; color: #f0f0f0; margin-bottom: 4px; }
        .brief-subtitle { font-size: 14px; color: #444; margin-bottom: 24px; }

        /* Concept tabs */
        .concept-tabs { display: flex; gap: 0; border-bottom: 1px solid #1a1a1a; }
        .concept-tab { padding: 14px 28px; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; color: #555; transition: all 0.15s; font-family: inherit; background: none; border-top: none; border-left: none; border-right: none; letter-spacing: 0.03em; position: relative; }
        .concept-tab:hover { color: #888; }
        .concept-tab.active { color: #FFD60A; border-bottom-color: #FFD60A; }
        .concept-tab-status { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; }
        .status-approved { background: #22c55e; }
        .status-revisions { background: #f59e0b; }
        .status-declined { background: #ef4444; }
        .status-pending { background: #333; }

        /* Main content */
        .brief-body { padding: 48px; max-width: 1100px; margin: 0 auto; animation: fadeIn 0.3s ease; }

        /* Section */
        .brief-section { margin-bottom: 48px; }
        .section-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD60A; font-weight: 600; margin-bottom: 16px; }
        .section-title { font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
        .section-text { font-size: 14px; color: #888; line-height: 1.8; }

        /* Hero concept card */
        .concept-hero { background: #111; border: 1px solid #1e1e1e; border-radius: 16px; padding: 32px; margin-bottom: 48px; }
        .concept-hero-title { font-size: 28px; font-weight: 800; color: #f0f0f0; margin-bottom: 8px; }
        .concept-hero-theme { font-size: 15px; color: #666; margin-bottom: 24px; line-height: 1.6; }
        .concept-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .concept-meta-item { }
        .concept-meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; margin-bottom: 6px; }
        .concept-meta-value { font-size: 13px; color: #aaa; line-height: 1.5; }

        /* Divider */
        .divider { height: 1px; background: #1a1a1a; margin: 40px 0; }

        /* Two col layout */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .info-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 24px; }
        .info-card-title { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; font-weight: 600; margin-bottom: 16px; }
        .info-row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #444; font-weight: 600; padding-top: 1px; }
        .info-value { font-size: 12px; color: #888; line-height: 1.5; }

        /* Avatar */
        .avatar-section { display: flex; gap: 32px; align-items: flex-start; }
        .avatar-img { width: 160px; height: 200px; border-radius: 12px; object-fit: cover; border: 1px solid #1e1e1e; flex-shrink: 0; }
        .avatar-img-placeholder { width: 160px; height: 200px; border-radius: 12px; background: #111; border: 1px solid #1e1e1e; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #333; font-size: 32px; }
        .avatar-details { flex: 1; }

        /* Script */
        .script-box { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 28px; }
        .script-hook { font-size: 18px; color: #FFD60A; font-style: italic; line-height: 1.5; margin-bottom: 20px; font-weight: 500; }
        .script-full { font-size: 14px; color: #888; line-height: 2; white-space: pre-wrap; }
        .script-meta { display: flex; gap: 12px; margin-top: 16px; }
        .script-chip { font-size: 11px; padding: 4px 12px; border-radius: 100px; border: 1px solid #222; color: #555; }

        /* Storyboard */
        .storyboard-grid { display: grid; gap: 8px; margin-bottom: 8px; }
        .storyboard-grid.landscape { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        .storyboard-grid.portrait { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
        .storyboard-tile { border-radius: 8px; overflow: hidden; border: 1px solid #1e1e1e; background: #111; }
        .storyboard-tile img { width: 100%; display: block; object-fit: cover; }
        .storyboard-tile img.landscape { aspect-ratio: 16/9; }
        .storyboard-tile img.portrait { aspect-ratio: 9/16; }
        .storyboard-tile-label { padding: 6px 8px; font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
        .storyboard-tile-shot { color: #FFD60A88; }
        .storyboard-empty { aspect-ratio: 16/9; background: #111; display: flex; align-items: center; justify-content: center; color: #333; font-size: 11px; }

        /* Shot list */
        .shot-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #1e1e1e; border-radius: 12px; overflow: hidden; }
        .shot-row { display: grid; grid-template-columns: 60px 80px 1fr 120px; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #1a1a1a; align-items: center; transition: background 0.1s; }
        .shot-row:last-child { border-bottom: none; }
        .shot-row:hover { background: #111; }
        .shot-num { font-size: 11px; color: #444; font-weight: 600; }
        .shot-type { font-size: 11px; color: #FFD60A; font-weight: 700; letter-spacing: 0.05em; }
        .shot-moment { font-size: 12px; color: #777; line-height: 1.4; }
        .shot-camera { font-size: 11px; color: #555; font-style: italic; }
        .shot-list-header { display: grid; grid-template-columns: 60px 80px 1fr 120px; gap: 16px; padding: 10px 16px; background: #0e0e0e; border-bottom: 1px solid #1e1e1e; }
        .shot-list-header span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; font-weight: 600; }

        /* Action panel */
        .action-panel { background: #0e0e0e; border: 1px solid #1e1e1e; border-radius: 16px; padding: 32px; margin-top: 48px; }
        .action-panel-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
        .action-panel-sub { font-size: 13px; color: #555; margin-bottom: 28px; }
        .action-buttons { display: flex; gap: 12px; margin-bottom: 24px; }
        .action-btn { flex: 1; padding: 16px; border-radius: 10px; border: 1px solid; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-btn-approve { border-color: #16a34a44; color: #4ade80; background: #16a34a11; }
        .action-btn-approve:hover, .action-btn-approve.selected { border-color: #16a34a; background: #16a34a22; }
        .action-btn-revisions { border-color: #d9770644; color: #fb923c; background: #d9770611; }
        .action-btn-revisions:hover, .action-btn-revisions.selected { border-color: #d97706; background: #d9770622; }
        .action-btn-decline { border-color: #dc262644; color: #f87171; background: #dc262611; }
        .action-btn-decline:hover, .action-btn-decline.selected { border-color: #dc2626; background: #dc262622; }
        .revision-box { width: 100%; background: #111; border: 1px solid #222; border-radius: 8px; color: #e8e8e8; font-size: 14px; padding: 14px 16px; outline: none; resize: vertical; min-height: 100px; font-family: inherit; line-height: 1.6; margin-bottom: 16px; }
        .revision-box:focus { border-color: #FFD60A44; }
        .submit-btn { background: #FFD60A; color: #0a0a0a; border: none; border-radius: 8px; padding: 14px 32px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .submit-btn:hover { background: #ffe033; }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .submitted-state { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 10px; background: #111; border: 1px solid #1e1e1e; }
        .submitted-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .submitted-text { font-size: 13px; color: #888; }
        .submitted-text strong { color: #e0e0e0; display: block; margin-bottom: 2px; }

        /* Footer */
        .brief-footer { padding: 40px 48px; border-top: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { display: flex; align-items: center; gap: 10px; }
        .footer-logo-mark { width: 24px; height: 24px; background: #FFD60A; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #0a0a0a; }
        .footer-logo-text { font-size: 12px; color: #444; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
        .footer-note { font-size: 11px; color: #333; }
      `}</style>

      <div className="brief-shell">
        {/* Header */}
        <div className="brief-header">
          <p className="brief-agency">Alchemy — Campaign Brief</p>
          <h1 className="brief-client-name">{client?.name || 'Client'}</h1>
          <p className="brief-subtitle">
            {campaigns.length} concept{campaigns.length !== 1 ? 's' : ''} prepared for your review
            {campaign.created_at && ` · ${new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </p>

          {/* Concept tabs */}
          {campaigns.length > 1 && (
            <div className="concept-tabs">
              {campaigns.map((c, i) => {
                const status = actionState[c.id] || c.client_status || 'pending'
                return (
                  <button key={c.id} className={`concept-tab ${activeConcept === i ? 'active' : ''}`} onClick={() => setActiveConcept(i)}>
                    Concept {i + 1}{c.chosen_concept?.title ? ` — ${c.chosen_concept.title}` : ''}
                    <span className={`concept-tab-status ${status !== 'pending' ? `status-${status}` : 'status-pending'}`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="brief-body" key={activeConcept}>

          {/* Concept hero */}
          {concept && (
            <div className="concept-hero">
              <p className="section-label">Campaign Concept</p>
              <h2 className="concept-hero-title">{concept.title}</h2>
              <p className="concept-hero-theme">{concept.theme}</p>
              <div className="concept-meta">
                <div className="concept-meta-item">
                  <p className="concept-meta-label">Visual Universe</p>
                  <p className="concept-meta-value">{concept.visualUniverse}</p>
                </div>
                <div className="concept-meta-item">
                  <p className="concept-meta-label">Metaphor</p>
                  <p className="concept-meta-value">{concept.metaphorBridge}</p>
                </div>
                <div className="concept-meta-item">
                  <p className="concept-meta-label">Emotional Frame</p>
                  <p className="concept-meta-value">{concept.emotionalFrame}</p>
                </div>
              </div>
            </div>
          )}

          {/* Brand analysis */}
          {campaign.website_analysis && (
            <div className="brief-section">
              <p className="section-label">Brand Intelligence</p>
              <div className="two-col">
                <div className="info-card">
                  <p className="info-card-title">Audience & Market</p>
                  {[
                    ['Target Customer', campaign.website_analysis.targetCustomer],
                    ['Core Pain Point', campaign.website_analysis.corePainPoint],
                    ['Transformation', campaign.website_analysis.desiredTransformation],
                    ['Product Category', campaign.website_analysis.productCategory],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span className="info-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="info-card">
                  <p className="info-card-title">Brand Voice</p>
                  {[
                    ['Core Offer', campaign.website_analysis.coreOffer],
                    ['Tone', campaign.website_analysis.websiteTone],
                    ['Key Differentiators', campaign.website_analysis.differentiators?.join(', ')],
                    ['Key Phrases', campaign.website_analysis.keyPhrasing?.slice(0,3).join(', ')],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span className="info-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Visual direction */}
          {campaign.chosen_direction && (
            <div className="brief-section">
              <p className="section-label">Visual Direction</p>
              <h3 className="section-title">{campaign.chosen_direction.title}</h3>
              <p className="section-text" style={{marginBottom:20}}>{campaign.chosen_direction.summary}</p>
              <div className="two-col">
                <div className="info-card">
                  <p className="info-card-title">Cinematography</p>
                  {[
                    ['Color World', campaign.chosen_direction.colorWorld],
                    ['Lighting', campaign.chosen_direction.lighting],
                    ['Lens & Camera', campaign.chosen_direction.lensAndCamera],
                    ['Texture', campaign.chosen_direction.texture],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span className="info-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="info-card">
                  <p className="info-card-title">Production Feel</p>
                  {[
                    ['Environment', campaign.chosen_direction.environment],
                    ['Editing Feel', campaign.chosen_direction.editingFeel],
                    ['Design Language', campaign.chosen_direction.designLanguage],
                    ['Cinematic Reference', campaign.chosen_direction.cinematicReference],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span className="info-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Avatar */}
          {campaign.chosen_avatar && (
            <div className="brief-section">
              <p className="section-label">Campaign Character</p>
              <div className="avatar-section">
                <img src={campaign.chosen_avatar} alt="Campaign avatar" className="avatar-img" />
                <div className="avatar-details">
                  <h3 className="section-title" style={{marginBottom:16}}>Locked Character</h3>
                  <p className="section-text">This character appears consistently across all scenes of the campaign, maintaining visual identity and brand coherence throughout the ad.</p>
                  {campaign.chosen_direction && (
                    <div style={{marginTop:20}}>
                      <div className="info-row"><span className="info-label">Color Grade</span><span className="info-value">{campaign.chosen_direction.colorWorld}</span></div>
                      <div className="info-row"><span className="info-label">Lighting</span><span className="info-value">{campaign.chosen_direction.lighting}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Script */}
          {script && (
            <div className="brief-section">
              <p className="section-label">Script</p>
              <div className="script-box">
                <p className="script-hook">"{script.hook}"</p>
                <p className="script-full">{script.fullScript}</p>
                <div className="script-meta">
                  {script.mood && <span className="script-chip">{script.mood}</span>}
                  {script.estimatedDuration && <span className="script-chip">{script.estimatedDuration}</span>}
                  {campaign.aspect_ratio && <span className="script-chip">{campaign.aspect_ratio}</span>}
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Storyboard */}
          {scenes.length > 0 && (
            <div className="brief-section">
              <p className="section-label">Full Storyboard — {scenes.length} Scenes</p>
              <div className={`storyboard-grid ${isVertical ? 'portrait' : 'landscape'}`}>
                {scenes.map((scene, i) => (
                  <div key={i} className="storyboard-tile">
                    {scene.imageUrl
                      ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className={isVertical ? 'portrait' : 'landscape'} />
                      : <div className="storyboard-empty">Scene {i+1}</div>
                    }
                    <div className="storyboard-tile-label">
                      <span>Scene {i+1}</span>
                      {scene.shot && <span className="storyboard-tile-shot">{scene.shot.shotType}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shot list */}
          {scenes.length > 0 && scenes[0]?.shot && (
            <div className="brief-section">
              <p className="section-label">Shot List</p>
              <div className="shot-list">
                <div className="shot-list-header">
                  <span>#</span>
                  <span>Shot</span>
                  <span>Script Moment</span>
                  <span>Camera</span>
                </div>
                {scenes.map((scene, i) => scene.shot && (
                  <div key={i} className="shot-row">
                    <span className="shot-num">{i+1}</span>
                    <span className="shot-type">{scene.shot.shotType}</span>
                    <span className="shot-moment">{scene.shot.scriptMoment || scene.shot.action}</span>
                    <span className="shot-camera">{scene.shot.cameraMove}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Action panel */}
          <div className="action-panel">
            <p className="action-panel-title">Your Feedback</p>
            <p className="action-panel-sub">
              {campaigns.length > 1
                ? `Review each concept using the tabs above and submit your feedback for Concept ${activeConcept + 1} below.`
                : 'Let us know how you'd like to move forward with this concept.'}
            </p>

            {submitted[campaign.id] ? (
              <div className="submitted-state">
                <div className={`submitted-icon ${
                  actionState[campaign.id] === 'approved' ? 'status-approved' :
                  actionState[campaign.id] === 'revisions' ? 'status-revisions' : 'status-declined'
                }`} style={{
                  background: actionState[campaign.id] === 'approved' ? '#16a34a33' :
                    actionState[campaign.id] === 'revisions' ? '#d9770633' : '#dc262633'
                }}>
                  {actionState[campaign.id] === 'approved' ? '✓' :
                   actionState[campaign.id] === 'revisions' ? '✎' : '✕'}
                </div>
                <div className="submitted-text">
                  <strong>
                    {actionState[campaign.id] === 'approved' ? 'Concept Approved' :
                     actionState[campaign.id] === 'revisions' ? 'Revisions Requested' : 'Concept Declined'}
                  </strong>
                  {revisionText[campaign.id] && <span>{revisionText[campaign.id]}</span>}
                  <button style={{background:'none',border:'none',color:'#555',fontSize:11,cursor:'pointer',marginLeft:8,fontFamily:'inherit'}}
                    onClick={() => setSubmitted(prev => ({...prev, [campaign.id]: false}))}>
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="action-buttons">
                  <button
                    className={`action-btn action-btn-approve ${actionState[campaign.id] === 'approved' ? 'selected' : ''}`}
                    onClick={() => setActionState(prev => ({...prev, [campaign.id]: 'approved'}))}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className={`action-btn action-btn-revisions ${actionState[campaign.id] === 'revisions' ? 'selected' : ''}`}
                    onClick={() => setActionState(prev => ({...prev, [campaign.id]: 'revisions'}))}
                  >
                    ✎ Request Revisions
                  </button>
                  <button
                    className={`action-btn action-btn-decline ${actionState[campaign.id] === 'declined' ? 'selected' : ''}`}
                    onClick={() => setActionState(prev => ({...prev, [campaign.id]: 'declined'}))}
                  >
                    ✕ Decline
                  </button>
                </div>

                {(actionState[campaign.id] === 'revisions' || actionState[campaign.id] === 'declined') && (
                  <textarea
                    className="revision-box"
                    placeholder={actionState[campaign.id] === 'revisions'
                      ? "What would you like us to change? Please be as specific as possible..."
                      : "Optional: let us know why this concept isn't the right fit..."}
                    value={revisionText[campaign.id] || ''}
                    onChange={e => setRevisionText(prev => ({...prev, [campaign.id]: e.target.value}))}
                  />
                )}

                <button
                  className="submit-btn"
                  disabled={!actionState[campaign.id] || submitting[campaign.id]}
                  onClick={() => handleSubmit(campaign.id)}
                >
                  {submitting[campaign.id] ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="brief-footer">
          <div className="footer-logo">
            <div className="footer-logo-mark">A</div>
            <span className="footer-logo-text">Alchemy Agency</span>
          </div>
          <p className="footer-note">This brief is confidential and prepared exclusively for {client?.name}.</p>
        </div>
      </div>
    </>
  )
}
