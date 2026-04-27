'use client' // v5 - no compression, full quality images
import { useState, useEffect, useRef } from 'react'
import { supabase as sb } from '@/lib/supabase'

const STORAGE_KEY = 'stowic-brief-v4'
const ADMIN_PASSWORD = 'stowic2024'
const G = '#c8a96e'
const BG = '#09090b'
const CARD = '#0f0f0f'
const BORDER = '#1c1c1e'

const SCENES = [
  {
    id: 1, time: '0:00–0:06', title: 'Night Before. Packing',
    vo: '"Every trip starts the same way."',
    left: 'Sitting on a suitcase trying to force it shut. Clothes everywhere. Stressed.',
    right: 'Schedules a Stowic pickup on their phone. Bag already packed and waiting by the door. Pours a glass of wine.'
  },
  {
    id: 2, time: '0:06–0:14', title: 'Morning. Leaving for the Airport',
    vo: '"One person carries the weight of the journey. The other just... goes."',
    left: 'Lugging two heavy bags into a taxi, sweating, knocking into things.',
    right: 'Steps out the door with just a small bag over one shoulder. Unhurried. Composed.'
  },
  {
    id: 3, time: '0:14–0:22', title: 'At the Airport',
    vo: '"Check-in lines. Baggage fees. The scale that never works in your favor."',
    left: 'Stressed at the check-in counter. Repacking in the middle of the airport floor. People watching.',
    right: 'Walks straight through the terminal. Grabs a coffee. Breezes through security.'
  },
  {
    id: 4, time: '0:22–0:30', title: 'On the Plane / Landing',
    vo: '"And when you land. the wait isn\'t over."',
    left: 'Standing at baggage claim. Watching. Waiting. Bag comes out last, zipper broken.',
    right: 'Already in a cab. Phone shows a notification: "Your Stowic delivery has arrived." Smiles.'
  },
  {
    id: 5, time: '0:30–0:38', title: 'At the Destination',
    vo: '"Your bag arrived before you did. Waiting at your door. Just like it should be."',
    left: 'Finally arrives at hotel, exhausted, dragging the damaged bag.',
    right: 'Opens hotel room door. Bag is already inside. Steps onto the balcony. Takes it all in.'
  },
  {
    id: 6, time: '0:38–0:45', title: 'Logo Card',
    vo: '"Stowic. Door to door luggage shipping. So the only thing you carry. is the moment."',
    left: null, right: 'stowic.com'
  },
]

async function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

async function uploadToCloudinary(file) {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'Stowic')
    fd.append('cloud_name', 'drjsh0cvh')
    const res = await fetch('https://api.cloudinary.com/v1_1/drjsh0cvh/auto/upload', {
      method: 'POST',
      body: fd,
    })
    const j = await res.json()
    if (j.secure_url) return j.secure_url
    console.error('Cloudinary error:', j)
    return null
  } catch (e) { console.error('Cloudinary upload failed:', e.message); return null }
}



const REDIS_URL = 'https://vast-cockatoo-86777.upstash.io'
const REDIS_TOKEN = 'gQAAAAAAAVL5AAIncDIyMTEyMWZkMWM5ZmY0ZmE5Yjg3ZGY1ZWZhMzFjNzcyZHAyODY3Nzc'
const REDIS_KEY = 'stowic-brief'

async function uploadToStorage(dataUrl, path) {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const isAudio = mimeType.includes('audio') || mimeType.includes('mpeg')
    const ext = isAudio ? 'mp3' : mimeType.includes('jpeg') ? 'jpg' : 'png'
    const fullPath = `stowic/${path}.${ext}`
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0))
    const { error } = await sb.storage.from('brand-assets').upload(fullPath, bytes, { contentType: mimeType, upsert: true })
    if (error) throw error
    const { data } = sb.storage.from('brand-assets').getPublicUrl(fullPath)
    return data.publicUrl
  } catch (e) { console.error('Storage upload failed:', e.message); return null }
}

async function saveToBin(data) {
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', REDIS_KEY, JSON.stringify(data)]]),
    })
    const j = await res.json()
    return Array.isArray(j) && j[0]?.result === 'OK'
  } catch (e) { console.error('Redis save failed:', e.message); return false }
}

async function loadFromBin() {
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['GET', REDIS_KEY]]),
    })
    if (!res.ok) return null
    const j = await res.json()
    const val = j?.[0]?.result
    return val ? JSON.parse(val) : null
  } catch (e) { console.error('Redis load failed:', e.message); return null }
}

export default function StowicVideoBrief() {
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(null)

  const [logo, setLogo] = useState(null)
  const [avatarOld, setAvatarOld] = useState(null)
  const [avatarNew, setAvatarNew] = useState(null)
  const [sceneImages, setSceneImages] = useState({})
  const [voUrl, setVoUrl] = useState(null)
  const [voName, setVoName] = useState(null)
  const [musicUrl, setMusicUrl] = useState(null)
  const [musicName, setMusicName] = useState(null)
  const [playingVo, setPlayingVo] = useState(false)
  const [playingMusic, setPlayingMusic] = useState(false)

  const voRef = useRef(null)
  const musicRef = useRef(null)

  // File input refs
  const rLogo = useRef(null)
  const rAvatarOld = useRef(null)
  const rAvatarNew = useRef(null)
  const rVo = useRef(null)
  const rMusic = useRef(null)
  const rS1l = useRef(null); const rS1r = useRef(null)
  const rS2l = useRef(null); const rS2r = useRef(null)
  const rS3l = useRef(null); const rS3r = useRef(null)
  const rS4l = useRef(null); const rS4r = useRef(null)
  const rS5l = useRef(null); const rS5r = useRef(null)
  const sceneRefs = {
    s1l: rS1l, s1r: rS1r, s2l: rS2l, s2r: rS2r,
    s3l: rS3l, s3r: rS3r, s4l: rS4l, s4r: rS4r,
    s5l: rS5l, s5r: rS5r
  }

  useEffect(() => {
    setMounted(true)
    ;(async () => {
      // Try Supabase first, fall back to localStorage
      let d = await loadFromBin()
      if (!d) {
        try { const l = localStorage.getItem(STORAGE_KEY); if (l) d = JSON.parse(l) } catch {}
      }
      if (!d) return
      if (d.logo) setLogo(d.logo)
      if (d.avatarOld) setAvatarOld(d.avatarOld)
      if (d.avatarNew) setAvatarNew(d.avatarNew)
      if (d.sceneImages) setSceneImages(d.sceneImages)
      if (d.voUrl) setVoUrl(d.voUrl)
      if (d.voName) setVoName(d.voName)
      if (d.musicUrl) setMusicUrl(d.musicUrl)
      if (d.musicName) setMusicName(d.musicName)
    })()
  }, [])

  function getCurrentData() {
    return { logo, avatarOld, avatarNew, sceneImages, voUrl, voName, musicUrl, musicName }
  }

  // Use a ref to always have latest data for saving
  const dataRef = useRef({})
  useEffect(() => {
    dataRef.current = { logo, avatarOld, avatarNew, sceneImages, voUrl, voName, musicUrl, musicName }
  }, [logo, avatarOld, avatarNew, sceneImages, voUrl, voName, musicUrl, musicName])

  async function handleSave() {
    setSaved(false)
    const data = dataRef.current
    try {
      const res = await fetch('/api/stowic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        alert('Saved successfully!')
      } else {
        alert('Save failed: ' + (j.error || res.status))
      }
    } catch (e) {
      alert('Save error: ' + e.message)
    }
  }

  async function handleUpload(file, key, setter, nameSetter) {
    if (!file) return
    setUploading(key)
    // Show preview immediately
    const dataUrl = await fileToDataUrl(file)
    setter(dataUrl)
    if (nameSetter) nameSetter(file.name)
    // Upload to Cloudinary for permanent full-res URL
    const url = await uploadToCloudinary(file)
    if (url) setter(url)
    setUploading(null)
  }

  async function handleSceneUpload(file, sceneKey) {
    if (!file) return
    setUploading(sceneKey)
    const dataUrl = await fileToDataUrl(file)
    setSceneImages(prev => ({ ...prev, [sceneKey]: dataUrl }))
    const url = await uploadToCloudinary(file)
    if (url) setSceneImages(prev => ({ ...prev, [sceneKey]: url }))
    setUploading(null)
  }

  function trigger(ref) { ref?.current?.click() }

  const Btn = ({ onClick, children, color = G, disabled }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ width:'100%', padding:'9px 0', background:'#1a1a1a', border:`1px solid ${color}33`, borderRadius:7, color, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontFamily:'inherit', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  )

  const ImgSlot = ({ src, aspect = '9/16', placeholder }) => (
    src
      ? <img src={src} alt="" style={{ width:'100%', aspectRatio:aspect, objectFit:'cover', display:'block' }}/>
      : <div style={{ width:'100%', aspectRatio:aspect, background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, color:'#2a2a2a' }}>{placeholder}</span>
        </div>
  )

  if (!mounted) return null

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:${BG};color:#fff;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
      ::selection{background:${G};color:#000;}
    `}</style>

    {/* Hidden file inputs */}
    <div style={{display:'none'}}>
      <input ref={rLogo} type="file" accept="image/*" onChange={e=>handleUpload(e.target.files[0],'logo',setLogo)} />
      <input ref={rAvatarOld} type="file" accept="image/*" onChange={e=>handleUpload(e.target.files[0],'avatarOld',setAvatarOld)} />
      <input ref={rAvatarNew} type="file" accept="image/*" onChange={e=>handleUpload(e.target.files[0],'avatarNew',setAvatarNew)} />
      <input ref={rVo} type="file" accept="audio/*" onChange={e=>handleUpload(e.target.files[0],'vo',setVoUrl,setVoName)} />
      <input ref={rMusic} type="file" accept="audio/*" onChange={e=>handleUpload(e.target.files[0],'music',setMusicUrl,setMusicName)} />
      <input ref={rS1l} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s1l')} />
      <input ref={rS1r} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s1r')} />
      <input ref={rS2l} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s2l')} />
      <input ref={rS2r} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s2r')} />
      <input ref={rS3l} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s3l')} />
      <input ref={rS3r} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s3r')} />
      <input ref={rS4l} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s4l')} />
      <input ref={rS4r} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s4r')} />
      <input ref={rS5l} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s5l')} />
      <input ref={rS5r} type="file" accept="image/*" onChange={e=>handleSceneUpload(e.target.files[0],'s5r')} />
    </div>

    {/* Admin bar */}
    {isAdmin && (
      <div style={{position:'sticky',top:0,zIndex:100,background:G,padding:'10px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#000'}}>
          ⚡ Admin Mode {uploading ? `- uploading...` : '- all uploads auto-save'}
        </span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={handleSave} style={{background:'#000',color:G,border:'none',padding:'7px 20px',fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',borderRadius:6}}>
            {saved ? '✓ Saved!' : 'Save'}
          </button>
          <button onClick={()=>setIsAdmin(false)} style={{background:'rgba(0,0,0,0.2)',border:'none',color:'#000',padding:'7px 14px',fontSize:11,cursor:'pointer',borderRadius:6,fontWeight:600}}>Exit</button>
        </div>
      </div>
    )}

    {/* Admin login */}
    {showLogin && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowLogin(false)}>
        <div style={{background:'#111',border:`1px solid ${BORDER}`,borderRadius:16,padding:40,width:340}} onClick={e=>e.stopPropagation()}>
          <p style={{fontFamily:'DM Mono',fontSize:10,color:G,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:20}}>Admin Access</p>
          <input type="password" placeholder="Password" value={adminPass} onChange={e=>setAdminPass(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'){if(adminPass===ADMIN_PASSWORD){setIsAdmin(true);setShowLogin(false);setAdminPass('')}else alert('Wrong password')}}}
            style={{width:'100%',background:'#1a1a1a',border:`1px solid ${BORDER}`,borderRadius:8,padding:'12px 14px',color:'#fff',fontSize:14,outline:'none',marginBottom:14,fontFamily:'inherit'}}
            autoFocus/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{if(adminPass===ADMIN_PASSWORD){setIsAdmin(true);setShowLogin(false);setAdminPass('')}else alert('Wrong password')}}
              style={{flex:1,background:G,color:'#000',border:'none',borderRadius:8,padding:12,fontSize:12,fontWeight:700,cursor:'pointer'}}>Enter</button>
            <button onClick={()=>setShowLogin(false)} style={{padding:'12px 16px',background:'#1a1a1a',border:`1px solid ${BORDER}`,color:'#666',borderRadius:8,fontSize:12,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    )}

    {/* HERO */}
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'100px 40px 80px',textAlign:'center',position:'relative',borderBottom:`1px solid ${BORDER}`}}>
      <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 50% 50%, rgba(200,169,110,0.07) 0%, transparent 65%)`,pointerEvents:'none'}}/>
      {/* Logo */}
      <div style={{marginBottom:56}}>
        {logo
          ? <img src={logo} alt="Stowic" style={{height:52,objectFit:'contain',filter:'brightness(0) invert(1)'}}/>
          : <p style={{fontFamily:'Bebas Neue',fontSize:42,letterSpacing:'0.1em'}}>STOWIC</p>
        }
        {isAdmin && <Btn onClick={()=>trigger(rLogo)}>{uploading==='logo'?'Uploading...':'Upload Logo'}</Btn>}
      </div>
      <p style={{fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:G,marginBottom:20}}>Video Brief · 45-Second Ad</p>
      <h1 style={{fontFamily:'Bebas Neue',fontSize:'clamp(48px,9vw,110px)',letterSpacing:'0.02em',lineHeight:0.92,marginBottom:32}}>
        The Old Way<br/><span style={{color:G}}>vs.</span><br/>The Stowic Way
      </h1>
      <p style={{fontSize:16,color:'#666',fontWeight:300,maxWidth:520,lineHeight:1.7,marginBottom:52}}>
        A split-screen 45-second ad showing the contrast between carrying your luggage the old way and the Stowic experience. door to door.
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        {['45 Seconds','Split-Screen','16:9 Landscape','Door to Door'].map(t=>(
          <span key={t} style={{padding:'6px 16px',border:`1px solid ${BORDER}`,borderRadius:100,fontSize:11,color:'#555',letterSpacing:'0.05em'}}>{t}</span>
        ))}
      </div>
      <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
        <span style={{fontSize:9,color:'#2a2a2a',letterSpacing:'0.14em',textTransform:'uppercase'}}>Scroll</span>
        <div style={{width:1,height:28,background:`linear-gradient(to bottom, #2a2a2a, transparent)`}}/>
      </div>
    </div>

    {/* CHARACTERS */}
    <div style={{maxWidth:1100,margin:'0 auto',padding:'80px 40px'}}>
      <p style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:G,marginBottom:8}}>Campaign Characters</p>
      <h2 style={{fontFamily:'Bebas Neue',fontSize:52,letterSpacing:'0.02em',marginBottom:48}}>The Two Travelers</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* Old Way */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#ef4444'}}/>
            <span style={{fontFamily:'DM Mono',fontSize:10,color:'#ef4444',letterSpacing:'0.1em',textTransform:'uppercase'}}>The Old Way</span>
          </div>
          <ImgSlot src={avatarOld} aspect="3/4" placeholder="Avatar. Old Way"/>
          {isAdmin && <div style={{padding:'10px 14px',borderTop:`1px solid ${BORDER}`}}><Btn onClick={()=>trigger(rAvatarOld)} color="#ef4444">{uploading==='avatarOld'?'Uploading...':avatarOld?'Replace Avatar':'Upload Avatar'}</Btn></div>}
          <div style={{padding:'20px 24px'}}>
            <p style={{fontSize:13,color:'#555',lineHeight:1.7,fontWeight:300}}>Stressed. Overpacked. Always rushing. Pays baggage fees, waits at baggage claim, arrives exhausted.</p>
          </div>
        </div>
        {/* Stowic Way */}
        <div style={{background:CARD,border:`1px solid #2a2518`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:`1px solid #2a2518`,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:G}}/>
            <span style={{fontFamily:'DM Mono',fontSize:10,color:G,letterSpacing:'0.1em',textTransform:'uppercase'}}>The Stowic Way</span>
          </div>
          <ImgSlot src={avatarNew} aspect="3/4" placeholder="Avatar. Stowic Way"/>
          {isAdmin && <div style={{padding:'10px 14px',borderTop:`1px solid #2a2518`}}><Btn onClick={()=>trigger(rAvatarNew)}>{uploading==='avatarNew'?'Uploading...':avatarNew?'Replace Avatar':'Upload Avatar'}</Btn></div>}
          <div style={{padding:'20px 24px'}}>
            <p style={{fontSize:13,color:'#666',lineHeight:1.7,fontWeight:300}}>Composed. Unhurried. Already won. Stowic ships the bag door to door. she just shows up.</p>
          </div>
        </div>
      </div>
    </div>

    {/* STORYBOARD */}
    <div style={{borderTop:`1px solid ${BORDER}`}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 40px'}}>
        <p style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:G,marginBottom:8}}>Scene by Scene</p>
        <h2 style={{fontFamily:'Bebas Neue',fontSize:52,letterSpacing:'0.02em',marginBottom:12}}>Script & Storyboard</h2>
        <div style={{display:'flex',gap:24,marginBottom:56}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:'#ef4444'}}/><span style={{fontSize:12,color:'#555'}}>The Old Way</span></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:G}}/><span style={{fontSize:12,color:'#555'}}>The Stowic Way</span></div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          {SCENES.map(scene => {
            const lk = `s${scene.id}l`
            const rk = `s${scene.id}r`
            const isLogoCard = scene.left === null
            return (
              <div key={scene.id} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,overflow:'hidden'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'stretch',borderBottom:`1px solid ${BORDER}`}}>
                  <div style={{width:64,display:'flex',alignItems:'center',justifyContent:'center',borderRight:`1px solid ${BORDER}`}}>
                    <span style={{fontFamily:'Bebas Neue',fontSize:32,color:'#1e1e1e'}}>0{scene.id}</span>
                  </div>
                  <div style={{flex:1,padding:'16px 24px'}}>
                    <p style={{fontSize:15,fontWeight:500}}>{scene.title}</p>
                  </div>
                </div>
                {/* VO */}
                <div style={{padding:'14px 24px',borderBottom:`1px solid ${BORDER}`,background:'#080808'}}>
                  <p style={{fontFamily:'DM Mono',fontSize:9,color:'#333',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:5}}>Voiceover</p>
                  <p style={{fontSize:15,color:'#bbb',fontStyle:'italic',lineHeight:1.6}}>{scene.vo}</p>
                </div>

                {isLogoCard ? (
                  /* Logo card. just text, no image upload */
                  <div style={{padding:'32px 24px',textAlign:'center'}}>
                    <p style={{fontFamily:'Bebas Neue',fontSize:48,letterSpacing:'0.08em',color:'#1a1a1a',marginBottom:8}}>STOWIC</p>
                    <p style={{fontFamily:'DM Mono',fontSize:13,color:'#2a2a2a',letterSpacing:'0.1em'}}>stowic.com</p>
                  </div>
                ) : (
                  /* Split screen */
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                    {/* Left. Old Way */}
                    <div style={{borderRight:`1px solid ${BORDER}`}}>
                      <ImgSlot src={sceneImages[lk]} aspect="9/16" placeholder="Old Way"/>
                      {isAdmin && <div style={{padding:'8px 12px',borderTop:`1px solid ${BORDER}`}}><Btn onClick={()=>sceneRefs[lk]?.current?.click()} color="#ef4444">{uploading===lk?'Uploading...':'↑ Old Way'}</Btn></div>}
                      <div style={{padding:'16px 20px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#ef4444'}}/>
                          <span style={{fontFamily:'DM Mono',fontSize:9,color:'#ef4444',letterSpacing:'0.08em',textTransform:'uppercase'}}>Old Way</span>
                        </div>
                        <p style={{fontSize:13,color:'#555',lineHeight:1.65,fontWeight:300}}>{scene.left}</p>
                      </div>
                    </div>
                    {/* Right. Stowic Way */}
                    <div>
                      <ImgSlot src={sceneImages[rk]} aspect="9/16" placeholder="Stowic Way"/>
                      {isAdmin && <div style={{padding:'8px 12px',borderTop:`1px solid ${BORDER}`}}><Btn onClick={()=>sceneRefs[rk]?.current?.click()}>{uploading===rk?'Uploading...':'↑ Stowic Way'}</Btn></div>}
                      <div style={{padding:'16px 20px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:G}}/>
                          <span style={{fontFamily:'DM Mono',fontSize:9,color:G,letterSpacing:'0.08em',textTransform:'uppercase'}}>Stowic Way</span>
                        </div>
                        <p style={{fontSize:13,color:'#666',lineHeight:1.65,fontWeight:300}}>{scene.right}</p>
                      </div>
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
    <div style={{borderTop:`1px solid ${BORDER}`}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'80px 40px'}}>
        <p style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:G,marginBottom:8}}>Audio</p>
        <h2 style={{fontFamily:'Bebas Neue',fontSize:52,letterSpacing:'0.02em',marginBottom:48}}>Voiceover & Music</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* VO */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:28}}>
            <p style={{fontFamily:'DM Mono',fontSize:10,color:G,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Voiceover Track</p>
            <p style={{fontSize:13,color:'#444',fontWeight:300,marginBottom:16}}>{voName||'No file uploaded yet'}</p>
            {isAdmin && <div style={{marginBottom:12}}><Btn onClick={()=>trigger(rVo)}>{uploading==='vo'?'Uploading...':voUrl?'Replace MP3':'Upload MP3'}</Btn></div>}
            {voUrl && <>
              <audio ref={voRef} src={voUrl} onEnded={()=>setPlayingVo(false)}/>
              <button onClick={()=>{if(playingVo){voRef.current?.pause();setPlayingVo(false)}else{voRef.current?.play();setPlayingVo(true)}}}
                style={{width:'100%',padding:'12px',background:playingVo?G:'transparent',border:`1px solid ${playingVo?G:'#333'}`,borderRadius:8,color:playingVo?'#000':'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
                {playingVo?'⏸ Pause':'▶ Play Voiceover'}
              </button>
            </>}
          </div>
          {/* Music */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:28}}>
            <p style={{fontFamily:'DM Mono',fontSize:10,color:G,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Background Music</p>
            <p style={{fontSize:13,color:'#444',fontWeight:300,marginBottom:16}}>{musicName||'No file uploaded yet'}</p>
            {isAdmin && <div style={{marginBottom:12}}><Btn onClick={()=>trigger(rMusic)}>{uploading==='music'?'Uploading...':musicUrl?'Replace MP3':'Upload MP3'}</Btn></div>}
            {musicUrl && <>
              <audio ref={musicRef} src={musicUrl} onEnded={()=>setPlayingMusic(false)}/>
              <button onClick={()=>{if(playingMusic){musicRef.current?.pause();setPlayingMusic(false)}else{musicRef.current?.play();setPlayingMusic(true)}}}
                style={{width:'100%',padding:'12px',background:playingMusic?G:'transparent',border:`1px solid ${playingMusic?G:'#333'}`,borderRadius:8,color:playingMusic?'#000':'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
                {playingMusic?'⏸ Pause':'▶ Play Music'}
              </button>
            </>}
          </div>
        </div>
      </div>
    </div>

    {/* FOOTER */}
    <div style={{borderTop:`1px solid ${BORDER}`}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'40px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style={{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:'0.06em',marginBottom:2}}>STOWIC</p>
          <p style={{fontSize:11,color:'#333',fontWeight:300}}>Door to door luggage shipping</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <p style={{fontSize:11,color:'#2a2a2a'}}>Prepared for Stowic</p>
          <button onClick={()=>setShowLogin(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#1a1a1a',fontSize:20,padding:'4px 8px',lineHeight:1}}>···</button>
        </div>
      </div>
    </div>
  </>)
}
