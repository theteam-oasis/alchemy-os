'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STORAGE_KEY = 'stowic-brief-v1'
const BUCKET = 'brand-assets'

const SCENES = [
  { id: 1, time: '0:00–0:06', title: 'Night Before — Packing', vo: '"Every trip starts the same way."', left: 'Sitting on a suitcase trying to force it shut. Clothes everywhere. Stressed.', right: 'Schedules a Stowic pickup on their phone. Bag already packed and waiting by the door. Pours a glass of wine.' },
  { id: 2, time: '0:06–0:14', title: 'Morning — Leaving', vo: '"One person carries the weight of the journey. The other just... goes."', left: 'Lugging two heavy bags into a taxi, sweating, knocking into things.', right: 'Steps out the door with just a small bag over one shoulder. Unhurried. Composed.' },
  { id: 3, time: '0:14–0:22', title: 'At the Airport', vo: '"Check-in lines. Baggage fees. The scale that never works in your favor."', left: 'Stressed at the check-in counter. Repacking in the middle of the airport floor.', right: 'Walks straight through the terminal. Grabs a coffee. Breezes through security.' },
  { id: 4, time: '0:22–0:30', title: 'On the Plane / Landing', vo: '"And when you land — the wait isn\'t over."', left: 'Standing at baggage claim. Watching. Waiting. Bag comes out last, zipper broken.', right: 'Already in a cab. Phone shows: "Your Stowic delivery has arrived." Smiles.' },
  { id: 5, time: '0:30–0:38', title: 'At the Destination', vo: '"Your bag arrived before you did. Waiting at your door. Just like it should be."', left: 'Finally arrives at hotel, exhausted, dragging the damaged bag.', right: 'Opens hotel room door. Bag already inside. Steps onto the balcony. Takes it all in.' },
  { id: 6, time: '0:38–0:45', title: 'Logo Card', vo: '"Stowic. Door to door luggage shipping. So the only thing you carry — is the moment."', left: null, right: 'stowic.com' },
]

function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

async function uploadFile(dataUrl, path) {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('png') ? 'png' : mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('mp4') ? 'mp4' : 'bin'
    const fullPath = `stowic-brief/${path}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(fullPath, Buffer.from ? Buffer.from(match[2], 'base64') : Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)), { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
    return publicUrl
  } catch (e) { console.error('Upload failed:', e.message); return null }
}

async function saveToSupabase(data) {
  try {
    const { error } = await supabase.from('stowic_brief').upsert({ id: 1, data: JSON.stringify(data) })
    if (error) throw error
  } catch { /* silent */ }
}

async function loadFromSupabase() {
  try {
    const { data } = await supabase.from('stowic_brief').select('data').eq('id', 1).single()
    if (data?.data) return JSON.parse(data.data)
  } catch { /* silent */ }
  return null
}

export default function StowicVideoBrief() {
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Assets
  const [avatarOld, setAvatarOld] = useState(null)
  const [avatarNew, setAvatarNew] = useState(null)
  const [logo, setLogo] = useState(null)
  const [storyboardImages, setStoryboardImages] = useState(Array(10).fill(null))
  const [voiceoverUrl, setVoiceoverUrl] = useState(null)
  const [musicUrl, setMusicUrl] = useState(null)
  const [voiceoverName, setVoiceoverName] = useState(null)
  const [musicName, setMusicName] = useState(null)
  const [playingVo, setPlayingVo] = useState(false)
  const [playingMusic, setPlayingMusic] = useState(false)

  const voRef = useRef(null)
  const musicRef = useRef(null)
  const fileRefs = useRef({})

  useEffect(() => {
    setMounted(true)
    // Load from localStorage first (fast)
    try {
      const local = localStorage.getItem(STORAGE_KEY)
      if (local) applyData(JSON.parse(local))
    } catch {}
    // Then try Supabase
    loadFromSupabase().then(d => { if (d) { applyData(d); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} } })
  }, [])

  function applyData(d) {
    if (!d) return
    if (d.avatarOld) setAvatarOld(d.avatarOld)
    if (d.avatarNew) setAvatarNew(d.avatarNew)
    if (d.logo) setLogo(d.logo)
    if (d.storyboardImages) setStoryboardImages(d.storyboardImages)
    if (d.voiceoverUrl) setVoiceoverUrl(d.voiceoverUrl)
    if (d.voiceoverName) setVoiceoverName(d.voiceoverName)
    if (d.musicUrl) setMusicUrl(d.musicUrl)
    if (d.musicName) setMusicName(d.musicName)
  }

  function getCurrentData() {
    return { avatarOld, avatarNew, logo, storyboardImages, voiceoverUrl, voiceoverName, musicUrl, musicName }
  }

  async function handleSave() {
    setSaving(true)
    const data = getCurrentData()
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
    await saveToSupabase(data)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleImageUpload(key, file, index = null) {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    const path = index !== null ? `${key}-${index}` : key
    const url = await uploadFile(dataUrl, path) || dataUrl
    if (key === 'avatarOld') setAvatarOld(url)
    else if (key === 'avatarNew') setAvatarNew(url)
    else if (key === 'logo') setLogo(url)
    else if (key === 'storyboard') {
      setStoryboardImages(prev => { const n = [...prev]; n[index] = url; return n })
    }
    else if (key === 'voiceover') { setVoiceoverUrl(url); setVoiceoverName(file.name) }
    else if (key === 'music') { setMusicUrl(url); setMusicName(file.name) }
  }

  function AdminUploadZone({ fieldKey, value, label, index = null, accept = 'image/*', aspect = '1/1' }) {
    if (!isAdmin) return null
    return (
      <div
        onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept=accept; r.onchange=e=>handleImageUpload(fieldKey, e.target.files[0], index); r.click() }}
        style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', cursor:'pointer', zIndex:10, borderRadius:'inherit' }}
      >
        <span style={{ color:'white', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Upload {label}</span>
      </div>
    )
  }

  if (!mounted) return null

  const ADMIN_PASSWORD = 'stowic2024'

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body,html{background:#0a0a0a;color:#ffffff;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      ::selection{background:#c8a96e;color:#000;}
    `}</style>

    {/* Admin bar */}
    {isAdmin && (
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'#c8a96e', padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#000' }}>Admin Mode — Click any image to replace</span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSave} style={{ background:'#000', color:'#c8a96e', border:'none', padding:'6px 16px', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', borderRadius:4 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save All'}
          </button>
          <button onClick={() => setIsAdmin(false)} style={{ background:'none', border:'1px solid #000', color:'#000', padding:'6px 12px', fontSize:11, cursor:'pointer', borderRadius:4 }}>Exit</button>
        </div>
      </div>
    )}

    {/* Admin login modal */}
    {showAdminLogin && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#111', border:'1px solid #333', borderRadius:12, padding:32, width:320 }}>
          <p style={{ fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#666', marginBottom:16 }}>Admin Access</p>
          <input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && adminPass===ADMIN_PASSWORD) { setIsAdmin(true); setShowAdminLogin(false); setAdminPass('') } }}
            style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:6, padding:'10px 12px', color:'white', fontSize:14, outline:'none', marginBottom:12, fontFamily:'inherit' }}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { if (adminPass===ADMIN_PASSWORD) { setIsAdmin(true); setShowAdminLogin(false); setAdminPass('') } else alert('Wrong password') }}
              style={{ flex:1, background:'#c8a96e', color:'#000', border:'none', borderRadius:6, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Enter</button>
            <button onClick={() => setShowAdminLogin(false)} style={{ padding:'10px 16px', background:'none', border:'1px solid #333', color:'#666', borderRadius:6, fontSize:12, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    )}

    <div style={{ paddingTop: isAdmin ? 40 : 0 }}>

      {/* HERO */}
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', textAlign:'center', position:'relative', borderBottom:'1px solid #1a1a1a' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 60%, rgba(200,169,110,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div style={{ position:'relative', width:120, height:60, marginBottom:48 }}>
          {logo
            ? <img src={logo} alt="Stowic" style={{ width:'100%', height:'100%', objectFit:'contain', filter:'brightness(0) invert(1)' }}/>
            : <div style={{ fontFamily:'Bebas Neue', fontSize:36, letterSpacing:'0.1em', color:'white' }}>STOWIC</div>
          }
          {isAdmin && (
            <div onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='image/*'; r.onchange=e=>handleImageUpload('logo',e.target.files[0]); r.click() }}
              style={{ position:'absolute', inset:0, background:'rgba(200,169,110,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'#c8a96e', letterSpacing:'0.1em' }}>UPLOAD</span>
            </div>
          )}
        </div>

        <p style={{ fontFamily:'DM Mono', fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c8a96e', marginBottom:20 }}>Video Brief — 45 Second Ad</p>
        <h1 style={{ fontFamily:'Bebas Neue', fontSize:'clamp(52px, 10vw, 120px)', letterSpacing:'0.02em', lineHeight:0.9, marginBottom:24, animation:'fadeUp 0.8s ease' }}>
          The Old Way<br/><span style={{ color:'#c8a96e' }}>vs.</span><br/>The Stowic Way
        </h1>
        <p style={{ fontSize:16, color:'#888', fontWeight:300, maxWidth:480, lineHeight:1.7, marginBottom:48 }}>
          A split-screen 45-second ad showing the contrast between the old way of traveling with luggage and the Stowic experience.
        </p>

        {/* Format badge */}
        <div style={{ display:'flex', gap:12 }}>
          {['45 Seconds', 'Split-Screen', '16:9 Landscape'].map(t => (
            <span key={t} style={{ padding:'6px 16px', border:'1px solid #2a2a2a', borderRadius:100, fontSize:11, color:'#666', fontWeight:500, letterSpacing:'0.06em' }}>{t}</span>
          ))}
        </div>

        {/* Scroll hint */}
        <div style={{ position:'absolute', bottom:40, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, color:'#333', letterSpacing:'0.12em', textTransform:'uppercase' }}>Scroll</span>
          <div style={{ width:1, height:32, background:'linear-gradient(to bottom, #333, transparent)' }}/>
        </div>
      </div>

      {/* CHARACTERS */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 40px' }}>
        <p style={{ fontFamily:'DM Mono', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c8a96e', marginBottom:8 }}>Campaign Characters</p>
        <h2 style={{ fontFamily:'Bebas Neue', fontSize:48, letterSpacing:'0.02em', marginBottom:48 }}>The Two Travelers</h2>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {/* Old Way */}
          <div style={{ background:'#0f0f0f', border:'1px solid #1a1a1a', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#ff4444' }}/>
              <span style={{ fontFamily:'DM Mono', fontSize:11, letterSpacing:'0.1em', color:'#666', textTransform:'uppercase' }}>The Old Way</span>
            </div>
            <div style={{ position:'relative' }}>
              {avatarOld
                ? <img src={avatarOld} alt="Old Way" style={{ width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' }}/>
                : <div style={{ width:'100%', aspectRatio:'3/4', background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#333', fontSize:13 }}>{isAdmin ? 'Click to upload' : 'Character reference'}</span>
                  </div>
              }
              {isAdmin && (
                <div onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='image/*'; r.onchange=e=>handleImageUpload('avatarOld',e.target.files[0]); r.click() }}
                  style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#c8a96e', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Upload Avatar</span>
                </div>
              )}
            </div>
            <div style={{ padding:'20px 24px' }}>
              <p style={{ fontSize:13, color:'#666', lineHeight:1.7, fontWeight:300 }}>Stressed. Overpacked. Always rushing. Pays baggage fees, waits at baggage claim, arrives exhausted.</p>
            </div>
          </div>

          {/* Stowic Way */}
          <div style={{ background:'#0f0f0f', border:'1px solid #2a2a1a', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #2a2a1a', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#c8a96e' }}/>
              <span style={{ fontFamily:'DM Mono', fontSize:11, letterSpacing:'0.1em', color:'#c8a96e', textTransform:'uppercase' }}>The Stowic Way</span>
            </div>
            <div style={{ position:'relative' }}>
              {avatarNew
                ? <img src={avatarNew} alt="Stowic Way" style={{ width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' }}/>
                : <div style={{ width:'100%', aspectRatio:'3/4', background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#333', fontSize:13 }}>{isAdmin ? 'Click to upload' : 'Character reference'}</span>
                  </div>
              }
              {isAdmin && (
                <div onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='image/*'; r.onchange=e=>handleImageUpload('avatarNew',e.target.files[0]); r.click() }}
                  style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#c8a96e', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Upload Avatar</span>
                </div>
              )}
            </div>
            <div style={{ padding:'20px 24px' }}>
              <p style={{ fontSize:13, color:'#888', lineHeight:1.7, fontWeight:300 }}>Composed. Unhurried. Already won. Stowic ships the bag door to door — she just shows up.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SCRIPT + STORYBOARD */}
      <div style={{ borderTop:'1px solid #1a1a1a', borderBottom:'1px solid #1a1a1a' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 40px' }}>
          <p style={{ fontFamily:'DM Mono', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c8a96e', marginBottom:8 }}>Scene by Scene</p>
          <h2 style={{ fontFamily:'Bebas Neue', fontSize:48, letterSpacing:'0.02em', marginBottom:16 }}>Script & Storyboard</h2>
          <p style={{ fontSize:14, color:'#555', marginBottom:56, fontWeight:300 }}>Split-screen format · LEFT = The Old Way · RIGHT = The Stowic Way</p>

          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {SCENES.map((scene, i) => {
              const imgIndex = i < 10 ? i : null
              const img = imgIndex !== null ? storyboardImages[imgIndex] : null
              return (
                <div key={scene.id} style={{ background:'#0f0f0f', border:'1px solid #1a1a1a', borderRadius:12, overflow:'hidden' }}>
                  {/* Scene header */}
                  <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', borderBottom:'1px solid #1a1a1a' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #1a1a1a', padding:'16px 0' }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:28, color:'#222' }}>0{scene.id}</span>
                    </div>
                    <div style={{ padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <p style={{ fontFamily:'DM Mono', fontSize:10, color:'#c8a96e', letterSpacing:'0.1em', marginBottom:4 }}>{scene.time}</p>
                        <p style={{ fontSize:14, fontWeight:500, color:'white' }}>{scene.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* VO */}
                  <div style={{ padding:'16px 24px', borderBottom:'1px solid #1a1a1a', background:'#080808' }}>
                    <p style={{ fontFamily:'DM Mono', fontSize:10, color:'#444', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Voiceover</p>
                    <p style={{ fontSize:15, color:'#ccc', fontStyle:'italic', lineHeight:1.6 }}>{scene.vo}</p>
                  </div>

                  {/* Storyboard image */}
                  {imgIndex !== null && (
                    <div style={{ position:'relative' }}>
                      {img
                        ? <img src={img} alt={`Scene ${scene.id}`} style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', display:'block' }}/>
                        : <div style={{ width:'100%', aspectRatio:'16/9', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
                            <span style={{ color:'#222', fontSize:32, fontFamily:'Bebas Neue', letterSpacing:'0.1em' }}>Scene {scene.id}</span>
                            {isAdmin && <span style={{ color:'#333', fontSize:11, letterSpacing:'0.08em' }}>Click to upload storyboard</span>}
                          </div>
                      }
                      {isAdmin && (
                        <div onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='image/*'; r.onchange=e=>handleImageUpload('storyboard',e.target.files[0],imgIndex); r.click() }}
                          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: img ? 0 : 1, transition:'opacity 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity=1}
                          onMouseLeave={e => e.currentTarget.style.opacity = img ? 0 : 1}>
                          <span style={{ color:'#c8a96e', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Upload Scene {scene.id}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Split screen */}
                  {(scene.left || scene.right) && (
                    <div style={{ display:'grid', gridTemplateColumns: scene.left ? '1fr 1fr' : '1fr', gap:0 }}>
                      {scene.left && (
                        <div style={{ padding:'20px 24px', borderRight:'1px solid #1a1a1a' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:'#ff4444' }}/>
                            <span style={{ fontFamily:'DM Mono', fontSize:9, color:'#ff4444', letterSpacing:'0.1em', textTransform:'uppercase' }}>Old Way</span>
                          </div>
                          <p style={{ fontSize:13, color:'#666', lineHeight:1.7, fontWeight:300 }}>{scene.left}</p>
                        </div>
                      )}
                      <div style={{ padding:'20px 24px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#c8a96e' }}/>
                          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'#c8a96e', letterSpacing:'0.1em', textTransform:'uppercase' }}>Stowic Way</span>
                        </div>
                        <p style={{ fontSize:13, color:'#888', lineHeight:1.7, fontWeight:300 }}>{scene.right}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AUDIO */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 40px' }}>
        <p style={{ fontFamily:'DM Mono', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c8a96e', marginBottom:8 }}>Audio</p>
        <h2 style={{ fontFamily:'Bebas Neue', fontSize:48, letterSpacing:'0.02em', marginBottom:48 }}>Voiceover & Music</h2>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Voiceover */}
          <div style={{ background:'#0f0f0f', border:'1px solid #1a1a1a', borderRadius:12, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', justify:'space-between', marginBottom:20 }}>
              <div>
                <p style={{ fontFamily:'DM Mono', fontSize:10, color:'#c8a96e', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Voiceover</p>
                <p style={{ fontSize:13, color:'#666', fontWeight:300 }}>{voiceoverName || (isAdmin ? 'Upload MP3 file' : 'No file uploaded')}</p>
              </div>
              {isAdmin && (
                <button onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='audio/*'; r.onchange=e=>handleImageUpload('voiceover',e.target.files[0]); r.click() }}
                  style={{ padding:'7px 14px', background:'#1a1a1a', border:'1px solid #333', borderRadius:6, color:'#c8a96e', fontSize:11, fontWeight:700, letterSpacing:'0.08em', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Upload
                </button>
              )}
            </div>
            {voiceoverUrl && (
              <>
                <audio ref={voRef} src={voiceoverUrl} onEnded={() => setPlayingVo(false)} style={{ display:'none' }}/>
                <button onClick={() => { if (playingVo) { voRef.current?.pause(); setPlayingVo(false) } else { voRef.current?.play(); setPlayingVo(true) } }}
                  style={{ width:'100%', padding:'12px', background: playingVo ? '#c8a96e' : '#1a1a1a', border:`1px solid ${playingVo ? '#c8a96e' : '#333'}`, borderRadius:8, color: playingVo ? '#000' : '#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
                  {playingVo ? '⏸ Pause Voiceover' : '▶ Play Voiceover'}
                </button>
              </>
            )}
          </div>

          {/* Music */}
          <div style={{ background:'#0f0f0f', border:'1px solid #1a1a1a', borderRadius:12, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <p style={{ fontFamily:'DM Mono', fontSize:10, color:'#c8a96e', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Background Music</p>
                <p style={{ fontSize:13, color:'#666', fontWeight:300 }}>{musicName || (isAdmin ? 'Upload MP3 file' : 'No file uploaded')}</p>
              </div>
              {isAdmin && (
                <button onClick={() => { const r = document.createElement('input'); r.type='file'; r.accept='audio/*'; r.onchange=e=>handleImageUpload('music',e.target.files[0]); r.click() }}
                  style={{ padding:'7px 14px', background:'#1a1a1a', border:'1px solid #333', borderRadius:6, color:'#c8a96e', fontSize:11, fontWeight:700, letterSpacing:'0.08em', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Upload
                </button>
              )}
            </div>
            {musicUrl && (
              <>
                <audio ref={musicRef} src={musicUrl} onEnded={() => setPlayingMusic(false)} style={{ display:'none' }}/>
                <button onClick={() => { if (playingMusic) { musicRef.current?.pause(); setPlayingMusic(false) } else { musicRef.current?.play(); setPlayingMusic(true) } }}
                  style={{ width:'100%', padding:'12px', background: playingMusic ? '#c8a96e' : '#1a1a1a', border:`1px solid ${playingMusic ? '#c8a96e' : '#333'}`, borderRadius:8, color: playingMusic ? '#000' : '#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
                  {playingMusic ? '⏸ Pause Music' : '▶ Play Music'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop:'1px solid #1a1a1a', padding:'48px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:1100, margin:'0 auto' }}>
        <div>
          <p style={{ fontFamily:'Bebas Neue', fontSize:24, letterSpacing:'0.05em', color:'white', marginBottom:4 }}>STOWIC</p>
          <p style={{ fontSize:12, color:'#444', fontWeight:300 }}>Door to door luggage shipping</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <p style={{ fontSize:11, color:'#333' }}>Prepared by Alchemy Agency</p>
          <button onClick={() => setShowAdminLogin(true)} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.15, fontSize:10, color:'white', letterSpacing:'0.08em' }}>•••</button>
        </div>
      </div>

    </div>
  </>)
}
