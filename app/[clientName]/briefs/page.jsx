'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function BriefPage({ params }) {
  const { clientName } = params
  const [client, setClient] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [activeConcept, setActiveConcept] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState({})
  const [revisionText, setRevisionText] = useState({})
  const [submitting, setSubmitting] = useState({})
  const [submitted, setSubmitted] = useState({})

  useEffect(() => { loadData() }, [clientName])

  async function loadData() {
    setLoading(true)
    try {
      // Find client by slug matching their name
      const { data: allClients } = await supabase.from('clients').select('*')
      const matched = allClients?.find(c => slugify(c.name) === clientName)
      if (!matched) { setLoading(false); return }
      setClient(matched)

      const { data: campaignData } = await supabase
        .from('campaigns').select('*')
        .eq('client_id', matched.id)
        .eq('storyboard_complete', true)
        .order('created_at', { ascending: false })
        .limit(4)

      if (campaignData) {
        setCampaigns(campaignData)
        const savedActions = {}
        const savedRevisions = {}
        campaignData.forEach(c => {
          if (c.client_status && c.client_status !== 'pending') savedActions[c.id] = c.client_status
          if (c.revision_notes) savedRevisions[c.id] = c.revision_notes
        })
        setActionState(savedActions)
        setRevisionText(savedRevisions)
        setSubmitted(Object.fromEntries(Object.keys(savedActions).map(k => [k, true])))

        // Mark viewed
        campaignData.forEach(c => {
          fetch('/api/brief/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: c.id }),
          })
        })
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleSubmit(campaignId) {
    const status = actionState[campaignId]
    if (!status) return
    setSubmitting(prev => ({ ...prev, [campaignId]: true }))
    try {
      await fetch('/api/brief/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, clientStatus: status, revisionNotes: revisionText[campaignId] || null }),
      })
      setSubmitted(prev => ({ ...prev, [campaignId]: true }))
    } catch (e) { console.error(e) }
    setSubmitting(prev => ({ ...prev, [campaignId]: false }))
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:44, height:44, border:'2px solid #FFD60A22', borderTopColor:'#FFD60A', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!client || !campaigns.length) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#555', fontSize:14 }}>No briefs found for this client.</p>
    </div>
  )

  const campaign = campaigns[activeConcept]
  const concept = campaign?.chosen_concept
  const script = campaign?.chosen_script
  const direction = campaign?.chosen_direction
  const scenes = campaign?.scenes || []
  const isVertical = campaign?.aspect_ratio === '9:16'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #e8e8e8; font-family: 'DM Sans','SF Pro Display',-apple-system,sans-serif; min-height: 100vh; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        .shell { min-height: 100vh; }
        .header { padding: 28px 48px 0; border-bottom: 1px solid #1a1a1a; }
        .agency { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#FFD60A; font-weight:600; margin-bottom:6px; }
        .client-name { font-size:30px; font-weight:800; color:#f0f0f0; margin-bottom:4px; }
        .subtitle { font-size:13px; color:#444; margin-bottom:20px; }
        .tabs { display:flex; gap:0; border-bottom:1px solid #1a1a1a; margin-top:4px; }
        .tab { padding:12px 24px; font-size:13px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; color:#555; transition:all 0.15s; background:none; border-top:none; border-left:none; border-right:none; font-family:inherit; position:relative; }
        .tab:hover { color:#888; }
        .tab.active { color:#FFD60A; border-bottom-color:#FFD60A; }
        .tab-dot { position:absolute; top:8px; right:8px; width:7px; height:7px; border-radius:50%; }
        .dot-approved { background:#4ade80; }
        .dot-revisions { background:#fb923c; }
        .dot-declined { background:#f87171; }
        .dot-pending { background:#333; }
        .body { max-width:1100px; margin:0 auto; padding:48px 48px 80px; animation:fadeIn 0.3s ease; }

        /* Storyboard hero — top of page */
        .storyboard-hero { margin-bottom:48px; }
        .concept-eyebrow { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#FFD60A; font-weight:600; margin-bottom:8px; }
        .concept-title-big { font-size:26px; font-weight:800; color:#f0f0f0; margin-bottom:6px; }
        .concept-big-idea { font-size:14px; color:#666; line-height:1.6; margin-bottom:24px; max-width:700px; }
        .storyboard-grid { display:grid; gap:8px; margin-bottom:8px; }
        .storyboard-grid.landscape { grid-template-columns: repeat(5, 1fr); }
        .storyboard-grid.portrait { grid-template-columns: repeat(5, 1fr); }
        .storyboard-tile { border-radius:8px; overflow:hidden; border:1px solid #1e1e1e; background:#111; }
        .storyboard-tile img { width:100%; display:block; object-fit:cover; }
        .storyboard-tile img.landscape { aspect-ratio:16/9; }
        .storyboard-tile img.portrait { aspect-ratio:9/16; }
        .tile-label { padding:5px 8px; font-size:9px; color:#444; text-transform:uppercase; letter-spacing:0.05em; display:flex; justify-content:space-between; }
        .tile-shot { color:#FFD60A66; }
        .tile-empty { aspect-ratio:16/9; background:#111; display:flex; align-items:center; justify-content:center; color:#222; font-size:11px; }
        .tile-empty.portrait { aspect-ratio:9/16; }

        /* Divider */
        .divider { height:1px; background:#1a1a1a; margin:40px 0; }

        /* Info cards */
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:32px; }
        .info-card { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:22px; }
        .info-card-label { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:#FFD60A; font-weight:600; margin-bottom:14px; }
        .info-row { display:grid; grid-template-columns:110px 1fr; gap:10px; padding:8px 0; border-bottom:1px solid #1a1a1a; }
        .info-row:last-child { border-bottom:none; }
        .info-label { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:#444; font-weight:600; padding-top:1px; }
        .info-value { font-size:12px; color:#888; line-height:1.5; }

        /* Avatar */
        .avatar-section { display:flex; gap:24px; align-items:flex-start; margin-bottom:32px; }
        .avatar-img { width:120px; height:150px; border-radius:10px; object-fit:cover; border:1px solid #1e1e1e; flex-shrink:0; }
        .avatar-details { flex:1; }

        /* Script */
        .script-box { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:24px; margin-bottom:32px; }
        .script-hook { font-size:17px; color:#FFD60A; font-style:italic; line-height:1.5; margin-bottom:16px; font-weight:500; }
        .script-full { font-size:14px; color:#888; line-height:2; white-space:pre-wrap; }
        .script-chips { display:flex; gap:8px; margin-top:14px; }
        .chip { font-size:10px; padding:3px 10px; border-radius:100px; border:1px solid #222; color:#555; }

        /* Action panel */
        .action-panel { background:#0e0e0e; border:1px solid #1e1e1e; border-radius:14px; padding:28px; margin-top:48px; }
        .action-title { font-size:15px; font-weight:700; color:#f0f0f0; margin-bottom:5px; }
        .action-sub { font-size:13px; color:#555; margin-bottom:24px; }
        .action-btns { display:flex; gap:10px; margin-bottom:20px; }
        .action-btn { flex:1; padding:14px; border-radius:10px; border:1px solid; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px; }
        .btn-approve { border-color:#16a34a44; color:#4ade80; background:#16a34a11; }
        .btn-approve:hover, .btn-approve.sel { border-color:#16a34a; background:#16a34a22; }
        .btn-revisions { border-color:#d9770644; color:#fb923c; background:#d9770611; }
        .btn-revisions:hover, .btn-revisions.sel { border-color:#d97706; background:#d9770622; }
        .btn-decline { border-color:#dc262644; color:#f87171; background:#dc262611; }
        .btn-decline:hover, .btn-decline.sel { border-color:#dc2626; background:#dc262622; }
        .revision-textarea { width:100%; background:#111; border:1px solid #222; border-radius:8px; color:#e8e8e8; font-size:13px; padding:12px 14px; outline:none; resize:vertical; min-height:90px; font-family:inherit; line-height:1.6; margin-bottom:14px; }
        .revision-textarea:focus { border-color:#FFD60A44; }
        .submit-btn { background:#FFD60A; color:#0a0a0a; border:none; border-radius:8px; padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .submit-btn:hover { background:#ffe033; }
        .submit-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .submitted-state { display:flex; align-items:center; gap:12px; padding:14px 18px; border-radius:10px; background:#111; border:1px solid #1e1e1e; }
        .submitted-icon { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
        .submitted-text strong { display:block; font-size:13px; color:#e0e0e0; margin-bottom:2px; }
        .submitted-text span { font-size:12px; color:#666; }
        .change-btn { background:none; border:none; color:#444; font-size:11px; cursor:pointer; margin-left:8px; font-family:inherit; }
        .change-btn:hover { color:#888; }

        /* Footer */
        .footer { padding:32px 48px; border-top:1px solid #1a1a1a; display:flex; align-items:center; justify-content:space-between; }
        .footer-logo { display:flex; align-items:center; gap:8px; }
        .footer-mark { width:22px; height:22px; background:#FFD60A; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#0a0a0a; }
        .footer-text { font-size:11px; color:#444; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; }
        .footer-note { font-size:11px; color:#2a2a2a; }
      `}</style>

      <div className="shell">
        {/* Header */}
        <div className="header">
          <p className="agency">Alchemy — Campaign Brief</p>
          <h1 className="client-name">{client.name}</h1>
          <p className="subtitle">
            {campaigns.length} concept{campaigns.length !== 1 ? 's' : ''} prepared for your review
          </p>

          {campaigns.length > 1 && (
            <div className="tabs">
              {campaigns.map((c, i) => {
                const s = actionState[c.id] || c.client_status || 'pending'
                return (
                  <button key={c.id} className={`tab ${activeConcept === i ? 'active' : ''}`} onClick={() => setActiveConcept(i)}>
                    Concept {i+1}{c.concept_title ? ` — ${c.concept_title}` : ''}
                    <span className={`tab-dot dot-${s}`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="body" key={activeConcept}>

          {/* STORYBOARD HERO — TOP */}
          <div className="storyboard-hero">
            <p className="concept-eyebrow">Campaign Concept {activeConcept + 1}</p>
            <h2 className="concept-title-big">{concept?.title}</h2>
            <p className="concept-big-idea">{concept?.theme}</p>
            {concept?.visualUniverse && <p style={{fontSize:13,color:'#555',marginBottom:24}}>{concept.visualUniverse}</p>}

            {/* Full storyboard grid */}
            {scenes.length > 0 && (
              <div className={`storyboard-grid ${isVertical ? 'portrait' : 'landscape'}`}>
                {scenes.map((scene, i) => (
                  <div key={i} className="storyboard-tile">
                    {scene.imageUrl
                      ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className={isVertical ? 'portrait' : 'landscape'} />
                      : <div className={`tile-empty ${isVertical ? 'portrait' : ''}`}>Scene {i+1}</div>
                    }
                    <div className="tile-label">
                      <span>{i+1}</span>
                      {scene.shot && <span className="tile-shot">{scene.shot.shotType}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Script */}
          {script && (
            <>
              <div className="script-box">
                <p style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#FFD60A',fontWeight:600,marginBottom:14}}>Script</p>
                <p className="script-hook">"{script.hook}"</p>
                <p className="script-full">{script.fullScript}</p>
                <div className="script-chips">
                  {script.mood && <span className="chip">{script.mood}</span>}
                  <span className="chip">30s</span>
                  {campaign.aspect_ratio && <span className="chip">{campaign.aspect_ratio}</span>}
                </div>
              </div>
              <div className="divider" />
            </>
          )}

          {/* Brand intelligence + Visual direction */}
          {(campaign.website_analysis || direction) && (
            <>
              <div className="two-col">
                {campaign.website_analysis && (
                  <div className="info-card">
                    <p className="info-card-label">Brand Intelligence</p>
                    {[
                      ['Target', campaign.website_analysis.targetCustomer],
                      ['Problem', campaign.website_analysis.corePainPoint],
                      ['Transformation', campaign.website_analysis.desiredTransformation],
                      ['Tone', campaign.website_analysis.websiteTone],
                    ].filter(([,v]) => v).map(([l,v]) => (
                      <div key={l} className="info-row"><span className="info-label">{l}</span><span className="info-value">{v}</span></div>
                    ))}
                  </div>
                )}
                {direction && (
                  <div className="info-card">
                    <p className="info-card-label">Visual Direction — {direction.title}</p>
                    {[
                      ['Color', direction.colorWorld],
                      ['Lighting', direction.lighting],
                      ['Lens', direction.lensAndCamera],
                      ['Reference', direction.cinematicReference],
                      ['Environment', direction.environment],
                    ].filter(([,v]) => v).map(([l,v]) => (
                      <div key={l} className="info-row"><span className="info-label">{l}</span><span className="info-value">{v}</span></div>
                    ))}
                  </div>
                )}
              </div>
              <div className="divider" />
            </>
          )}

          {/* Avatar */}
          {campaign.chosen_avatar && (
            <>
              <div className="avatar-section">
                <img src={campaign.chosen_avatar} alt="Campaign character" className="avatar-img" />
                <div className="avatar-details">
                  <p style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#FFD60A',fontWeight:600,marginBottom:10}}>Campaign Character</p>
                  <p style={{fontSize:15,fontWeight:600,color:'#f0f0f0',marginBottom:8}}>Locked Character</p>
                  <p style={{fontSize:13,color:'#666',lineHeight:1.6}}>This character appears consistently across all scenes, maintaining visual identity throughout the campaign.</p>
                </div>
              </div>
              <div className="divider" />
            </>
          )}

          {/* Concept details */}
          {concept && (
            <>
              <div className="two-col">
                <div className="info-card">
                  <p className="info-card-label">Creative Strategy</p>
                  {[
                    ['Metaphor', concept.metaphorBridge],
                    ['Emotion', concept.emotionalFrame],
                    ['Why It Fits', concept.whyItFits],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="info-row"><span className="info-label">{l}</span><span className="info-value">{v}</span></div>
                  ))}
                </div>
                <div className="info-card">
                  <p className="info-card-label">Shot List — {scenes.length} Scenes</p>
                  {scenes.slice(0,6).map((scene, i) => scene.shot && (
                    <div key={i} className="info-row">
                      <span className="info-label">{i+1} · {scene.shot.shotType}</span>
                      <span className="info-value">{scene.shot.action || scene.shot.environment}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="divider" />
            </>
          )}

          {/* Action panel */}
          <div className="action-panel">
            <p className="action-title">Your Feedback</p>
            <p className="action-sub">
              {campaigns.length > 1
                ? `Reviewing Concept ${activeConcept + 1}. Use the tabs above to switch between concepts.`
                : 'Let us know how you would like to move forward.'}
            </p>

            {submitted[campaign.id] ? (
              <div className="submitted-state">
                <div className="submitted-icon" style={{
                  background: actionState[campaign.id] === 'approved' ? '#16a34a33' : actionState[campaign.id] === 'revisions' ? '#d9770633' : '#dc262633'
                }}>
                  {actionState[campaign.id] === 'approved' ? '✓' : actionState[campaign.id] === 'revisions' ? '✎' : '✕'}
                </div>
                <div className="submitted-text">
                  <strong>{actionState[campaign.id] === 'approved' ? 'Concept Approved' : actionState[campaign.id] === 'revisions' ? 'Revisions Requested' : 'Concept Declined'}</strong>
                  {revisionText[campaign.id] && <span>{revisionText[campaign.id]}</span>}
                  <button className="change-btn" onClick={() => setSubmitted(prev => ({...prev, [campaign.id]: false}))}>Change</button>
                </div>
              </div>
            ) : (
              <>
                <div className="action-btns">
                  <button className={`action-btn btn-approve ${actionState[campaign.id] === 'approved' ? 'sel' : ''}`} onClick={() => setActionState(p => ({...p, [campaign.id]: 'approved'}))}>✓ Approve</button>
                  <button className={`action-btn btn-revisions ${actionState[campaign.id] === 'revisions' ? 'sel' : ''}`} onClick={() => setActionState(p => ({...p, [campaign.id]: 'revisions'}))}>✎ Request Revisions</button>
                  <button className={`action-btn btn-decline ${actionState[campaign.id] === 'declined' ? 'sel' : ''}`} onClick={() => setActionState(p => ({...p, [campaign.id]: 'declined'}))}>✕ Decline</button>
                </div>
                {(actionState[campaign.id] === 'revisions' || actionState[campaign.id] === 'declined') && (
                  <textarea className="revision-textarea"
                    placeholder={actionState[campaign.id] === 'revisions' ? 'What would you like us to change? Please be specific...' : 'Optional: why is this not the right fit?'}
                    value={revisionText[campaign.id] || ''}
                    onChange={e => setRevisionText(p => ({...p, [campaign.id]: e.target.value}))}
                  />
                )}
                <button className="submit-btn" disabled={!actionState[campaign.id] || submitting[campaign.id]} onClick={() => handleSubmit(campaign.id)}>
                  {submitting[campaign.id] ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="footer">
          <div className="footer-logo">
            <div className="footer-mark">A</div>
            <span className="footer-text">Alchemy Agency</span>
          </div>
          <p className="footer-note">Confidential — prepared exclusively for {client.name}.</p>
        </div>
      </div>
    </>
  )
}
