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
      const { data: allClients } = await supabase.from('clients').select('*')
      const matched = allClients?.find(c => slugify(c.name) === clientName)
      if (!matched) { setLoading(false); return }
      setClient(matched)

      const { data: campaignData } = await supabase
        .from('campaigns').select('*')
        .eq('client_id', matched.id).eq('storyboard_complete', true)
        .order('created_at', { ascending: false }).limit(4)

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
        campaignData.forEach(c => {
          fetch('/api/brief/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id }) })
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
    <div style={{minHeight:'100vh',background:'#080B14',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:36,height:36,border:'1.5px solid rgba(212,168,71,0.15)',borderTopColor:'#D4A847',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!client || !campaigns.length) return (
    <div style={{minHeight:'100vh',background:'#080B14',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>
      <p style={{color:'rgba(255,255,255,0.2)',fontSize:14,fontWeight:300}}>No briefs found for this client.</p>
    </div>
  )

  const campaign = campaigns[activeConcept]
  const concept = campaign?.chosen_concept
  const script = campaign?.chosen_script
  const direction = campaign?.chosen_direction
  const scenes = campaign?.scenes || []
  const isPortrait = campaign?.aspect_ratio === '9:16'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body,html{background:#080B14;color:rgba(255,255,255,0.92);font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 15% 0%,rgba(212,168,71,0.05) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 85% 100%,rgba(99,120,180,0.06) 0%,transparent 60%);pointer-events:none;z-index:0;animation:amb 20s ease-in-out infinite alternate;}
        @keyframes amb{0%{opacity:.8;transform:scale(1)}100%{opacity:1;transform:scale(1.04) translate(-0.5%,0.5%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .shell{min-height:100vh;position:relative;z-index:1;}

        /* Header */
        .header{padding:36px 48px 0;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(8,11,20,0.6);backdrop-filter:blur(20px);}
        .header-agency{font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,168,71,0.7);margin-bottom:8px;display:flex;align-items:center;gap:8px;}
        .header-logo-mark{width:20px;height:20px;background:linear-gradient(135deg,#D4A847,#B8922E);border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#080B14;}
        .header-client{font-size:28px;font-weight:300;letter-spacing:-0.02em;color:rgba(255,255,255,0.95);margin-bottom:5px;}
        .header-sub{font-size:13px;color:rgba(255,255,255,0.3);margin-bottom:20px;font-weight:300;}

        /* Tabs */
        .tabs{display:flex;gap:0;margin-top:4px;}
        .tab{padding:12px 24px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:rgba(255,255,255,0.3);transition:all 0.2s;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif;position:relative;display:flex;align-items:center;gap:7px;letter-spacing:-0.01em;}
        .tab:hover{color:rgba(255,255,255,0.6);}
        .tab.active{color:rgba(255,255,255,0.9);border-bottom-color:#D4A847;}
        .tab-dot{width:6px;height:6px;border-radius:50%;}

        /* Body */
        .body{max-width:1100px;margin:0 auto;padding:48px 48px 80px;animation:fadeUp 0.35s ease;}

        /* Storyboard hero */
        .concept-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,168,71,0.7);margin-bottom:10px;}
        .concept-title{font-size:28px;font-weight:300;letter-spacing:-0.02em;color:rgba(255,255,255,0.95);margin-bottom:8px;}
        .concept-theme{font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;margin-bottom:8px;font-weight:300;max-width:700px;}
        .concept-visual{font-size:13px;color:rgba(255,255,255,0.25);line-height:1.6;margin-bottom:28px;max-width:700px;font-style:italic;font-weight:300;}

        /* Storyboard grid */
        .sb-grid{display:grid;gap:6px;margin-bottom:6px;}
        .sb-grid.landscape{grid-template-columns:repeat(5,1fr);}
        .sb-grid.portrait{grid-template-columns:repeat(6,1fr);}
        .sb-tile{border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);transition:all 0.2s;}
        .sb-tile:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.4);}
        .sb-tile img{width:100%;display:block;object-fit:cover;}
        .sb-tile img.l{aspect-ratio:16/9;}
        .sb-tile img.p{aspect-ratio:9/16;}
        .sb-tile-label{padding:5px 8px;display:flex;justify-content:space-between;align-items:center;}
        .sb-tile-num{font-size:9px;color:rgba(255,255,255,0.2);font-family:'DM Mono',monospace;}
        .sb-tile-shot{font-size:9px;color:rgba(212,168,71,0.4);font-weight:600;letter-spacing:0.05em;}
        .sb-tile-empty{background:rgba(255,255,255,0.02);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.08);font-size:10px;}
        .sb-tile-empty.l{aspect-ratio:16/9;}
        .sb-tile-empty.p{aspect-ratio:9/16;}

        /* Divider */
        .divider{height:1px;background:rgba(255,255,255,0.05);margin:40px 0;}

        /* Script */
        .script-block{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:24px;margin-bottom:32px;position:relative;}
        .script-block::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);}
        .block-label{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(212,168,71,0.6);margin-bottom:14px;}
        .script-hook{font-size:18px;color:rgba(212,168,71,0.85);font-style:italic;line-height:1.5;margin-bottom:14px;font-weight:300;}
        .script-full{font-size:14px;color:rgba(255,255,255,0.5);line-height:2;font-weight:300;}
        .script-chips{display:flex;gap:7px;margin-top:14px;}
        .script-chip{font-size:10px;padding:3px 10px;border-radius:100px;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.3);font-weight:400;}

        /* Info cards */
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;}
        .info-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px;position:relative;}
        .info-card::before{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);}
        .info-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
        .info-row:last-child{border-bottom:none;}
        .info-key{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.22);padding-top:1px;}
        .info-val{font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;font-weight:300;}

        /* Avatar */
        .avatar-row{display:flex;gap:24px;align-items:flex-start;margin-bottom:32px;}
        .avatar-img{width:110px;height:138px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,0.07);flex-shrink:0;}
        .avatar-label{font-size:14px;font-weight:500;color:rgba(255,255,255,0.8);margin-bottom:6px;}
        .avatar-desc{font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;font-weight:300;}

        /* Action panel */
        .action-panel{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px;margin-top:40px;position:relative;}
        .action-panel::before{content:'';position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent);}
        .action-title{font-size:16px;font-weight:500;color:rgba(255,255,255,0.9);margin-bottom:5px;letter-spacing:-0.01em;}
        .action-sub{font-size:13px;color:rgba(255,255,255,0.3);margin-bottom:22px;font-weight:300;line-height:1.5;}
        .action-btns{display:flex;gap:8px;margin-bottom:18px;}
        .action-btn{flex:1;padding:13px;border-radius:10px;border:1px solid;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;}
        .btn-approve{border-color:rgba(52,211,153,0.2);color:rgba(52,211,153,0.7);background:rgba(52,211,153,0.04);}
        .btn-approve:hover,.btn-approve.sel{border-color:rgba(52,211,153,0.45);background:rgba(52,211,153,0.1);color:#34D399;}
        .btn-revisions{border-color:rgba(251,146,60,0.2);color:rgba(251,146,60,0.7);background:rgba(251,146,60,0.04);}
        .btn-revisions:hover,.btn-revisions.sel{border-color:rgba(251,146,60,0.45);background:rgba(251,146,60,0.1);color:#FB923C;}
        .btn-decline{border-color:rgba(248,113,113,0.2);color:rgba(248,113,113,0.7);background:rgba(248,113,113,0.04);}
        .btn-decline:hover,.btn-decline.sel{border-color:rgba(248,113,113,0.45);background:rgba(248,113,113,0.1);color:#F87171;}
        .rev-textarea{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;color:rgba(255,255,255,0.9);font-size:13px;padding:12px 14px;outline:none;resize:vertical;min-height:88px;font-family:'DM Sans',sans-serif;line-height:1.6;margin-bottom:14px;transition:all 0.2s;}
        .rev-textarea::placeholder{color:rgba(255,255,255,0.18);}
        .rev-textarea:focus{border-color:rgba(212,168,71,0.3);background:rgba(255,255,255,0.05);}
        .submit-btn{background:linear-gradient(135deg,#D4A847,#B8922E);color:#080B14;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;box-shadow:0 0 0 1px rgba(212,168,71,0.3),0 4px 14px rgba(212,168,71,0.15);}
        .submit-btn:hover{transform:translateY(-1px);box-shadow:0 0 0 1px rgba(212,168,71,0.4),0 6px 20px rgba(212,168,71,0.25);}
        .submit-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}
        .submitted-state{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;}
        .submitted-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;}
        .submitted-text strong{display:block;font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:2px;font-weight:500;}
        .submitted-text span{font-size:12px;color:rgba(255,255,255,0.3);font-weight:300;}
        .change-btn{background:none;border:none;color:rgba(255,255,255,0.25);font-size:11px;cursor:pointer;margin-left:8px;font-family:'DM Sans',sans-serif;}
        .change-btn:hover{color:rgba(255,255,255,0.5);}

        /* Footer */
        .footer{padding:28px 48px;border-top:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;}
        .footer-logo{display:flex;align-items:center;gap:8px;}
        .footer-mark{width:20px;height:20px;background:linear-gradient(135deg,#D4A847,#B8922E);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#080B14;}
        .footer-name{font-size:11px;color:rgba(255,255,255,0.25);font-weight:500;letter-spacing:0.04em;}
        .footer-note{font-size:11px;color:rgba(255,255,255,0.12);}
      `}</style>

      <div className="shell">
        {/* Header */}
        <div className="header">
          <p className="header-agency">
            <span className="header-logo-mark">A</span>
            Alchemy OS — Campaign Brief
          </p>
          <h1 className="header-client">{client.name}</h1>
          <p className="header-sub">{campaigns.length} concept{campaigns.length !== 1 ? 's' : ''} prepared for your review</p>

          {campaigns.length > 1 && (
            <div className="tabs">
              {campaigns.map((c, i) => {
                const st = actionState[c.id] || c.client_status || 'pending'
                const dotColors = { approved: '#34D399', revisions: '#FB923C', declined: '#F87171', pending: 'rgba(255,255,255,0.15)' }
                return (
                  <button key={c.id} className={`tab ${activeConcept === i ? 'active' : ''}`} onClick={() => setActiveConcept(i)}>
                    Concept {i + 1}{c.concept_title ? ` — ${c.concept_title}` : ''}
                    <span className="tab-dot" style={{background: dotColors[st] || dotColors.pending}} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="body" key={activeConcept}>

          {/* Storyboard hero */}
          <p className="concept-eyebrow">Campaign Concept {activeConcept + 1}</p>
          <h2 className="concept-title">{concept?.title}</h2>
          <p className="concept-theme">{concept?.theme}</p>
          {concept?.visualUniverse && <p className="concept-visual">{concept.visualUniverse}</p>}

          {scenes.length > 0 && (
            <div className={`sb-grid ${isPortrait ? 'portrait' : 'landscape'}`}>
              {scenes.map((scene, i) => (
                <div key={i} className="sb-tile">
                  {scene?.imageUrl
                    ? <img src={scene.imageUrl} alt={`Scene ${i+1}`} className={isPortrait ? 'p' : 'l'} />
                    : <div className={`sb-tile-empty ${isPortrait ? 'p' : 'l'}`}>Scene {i+1}</div>
                  }
                  <div className="sb-tile-label">
                    <span className="sb-tile-num">{i+1}</span>
                    {scene?.shot?.shotType && <span className="sb-tile-shot">{scene.shot.shotType}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* Script */}
          {script && (
            <>
              <div className="script-block">
                <p className="block-label">Script</p>
                <p className="script-hook">"{script.hook}"</p>
                <p className="script-full">{script.fullScript}</p>
                <div className="script-chips">
                  {script.mood && <span className="script-chip">{script.mood}</span>}
                  <span className="script-chip">30s</span>
                  {campaign.aspect_ratio && <span className="script-chip">{campaign.aspect_ratio}</span>}
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
                    <p className="block-label">Brand Intelligence</p>
                    {[['Target', campaign.website_analysis.targetCustomer],['Problem', campaign.website_analysis.corePainPoint],['Transformation', campaign.website_analysis.desiredTransformation],['Tone', campaign.website_analysis.websiteTone]].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l} className="info-row"><span className="info-key">{l}</span><span className="info-val">{v}</span></div>
                    ))}
                  </div>
                )}
                {direction && (
                  <div className="info-card">
                    <p className="block-label">Visual Direction — {direction.title}</p>
                    {[['Color', direction.colorWorld],['Lighting', direction.lighting],['Lens', direction.lensAndCamera],['Reference', direction.cinematicReference],['Environment', direction.environment]].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l} className="info-row"><span className="info-key">{l}</span><span className="info-val">{v}</span></div>
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
              <div className="avatar-row">
                <img src={campaign.chosen_avatar} alt="Campaign character" className="avatar-img" />
                <div>
                  <p className="block-label">Campaign Character</p>
                  <p className="avatar-label">Locked Character Reference</p>
                  <p className="avatar-desc">This character appears consistently throughout all scenes, maintaining visual identity across the campaign.</p>
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
                  background: actionState[campaign.id] === 'approved' ? 'rgba(52,211,153,0.1)' : actionState[campaign.id] === 'revisions' ? 'rgba(251,146,60,0.1)' : 'rgba(248,113,113,0.1)',
                  border: `1px solid ${actionState[campaign.id] === 'approved' ? 'rgba(52,211,153,0.3)' : actionState[campaign.id] === 'revisions' ? 'rgba(251,146,60,0.3)' : 'rgba(248,113,113,0.3)'}`
                }}>
                  {actionState[campaign.id] === 'approved' ? '✓' : actionState[campaign.id] === 'revisions' ? '✎' : '✕'}
                </div>
                <div className="submitted-text">
                  <strong>{actionState[campaign.id] === 'approved' ? 'Concept Approved' : actionState[campaign.id] === 'revisions' ? 'Revisions Requested' : 'Concept Declined'}</strong>
                  {revisionText[campaign.id] && <span>{revisionText[campaign.id]}</span>}
                  <button className="change-btn" onClick={() => setSubmitted(p => ({...p, [campaign.id]: false}))}>Change response</button>
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
                  <textarea className="rev-textarea"
                    placeholder={actionState[campaign.id] === 'revisions' ? 'What would you like us to change?' : 'Optional: why is this not the right fit?'}
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
            <span className="footer-name">Alchemy Agency</span>
          </div>
          <p className="footer-note">Confidential — prepared exclusively for {client.name}.</p>
        </div>
      </div>
    </>
  )
}
