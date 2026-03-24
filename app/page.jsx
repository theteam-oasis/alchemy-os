"use client";
import { useState, useEffect } from "react";
import { Check, Sparkles, ArrowRight, RefreshCw, Lock, X, Loader2, ChevronRight, MessageSquare, Plus, Home, Copy, ChevronLeft, Edit3, Send } from "lucide-react";
import { supabase, createClient_db, getClients, updateClient_db, saveBrandIntake, saveBrandHub, lockBrandHub, addNote, getNotes, uploadProductImage } from "../lib/supabase";

const Y = "#FFD60A";
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');`;

const TAGS = ["Bold", "Minimal", "Playful", "Luxurious", "Edgy", "Warm", "Technical", "Organic", "Rebellious", "Sophisticated", "Youthful", "Timeless"];
const OBJECTIVES = ["Brand Awareness", "Conversions / Sales", "Retargeting", "Product Launch", "Seasonal Campaign"];
const VOICE_STYLES = ["Confident", "Warm", "Authoritative", "Playful", "Mysterious", "Soothing", "Energetic", "Raw"];
const VOICE_GENDERS = ["Female", "Male", "Non-binary", "No preference"];
const VOICE_AGES = ["Teens", "20s-30s", "30s-40s", "40s-50s", "Ageless"];
const MUSIC_MOODS = ["Dreamy", "Energetic", "Calm", "Aspirational", "Moody", "Uplifting", "Cinematic", "Playful", "Intense", "Nostalgic"];
const MUSIC_GENRES = ["Electronic", "Indie", "Lo-fi", "Pop", "R&B", "Acoustic", "Hip-hop", "Ambient", "House", "Classical"];
const TRANSITION_STYLES = ["Smooth", "Snappy", "Cinematic", "Jump cuts", "Whip pans"];
const CUT_SPEEDS = ["Slow", "Medium", "Fast", "Mixed"];
const TONES = [
  { label: "Formal to Casual", key: "formality", left: "Formal", right: "Casual" },
  { label: "Serious to Playful", key: "mood", left: "Serious", right: "Playful" },
  { label: "Subtle to Bold", key: "intensity", left: "Subtle", right: "Bold" },
];
const LOADING_MSGS = ["Analyzing brand identity...", "Mapping audience psychology...", "Crafting tone of voice...", "Building visual direction...", "Generating copy frameworks...", "Finalizing brand guidelines..."];
const SECTIONS = ["brandSummary", "toneOfVoice", "audiencePersona", "visualDirection", "copyDirection"];
const SECTION_LABELS = { brandSummary: "Brand Summary", toneOfVoice: "Tone of Voice", audiencePersona: "Audience Persona", visualDirection: "Visual Direction", copyDirection: "Copy Direction" };

const DEMO_CLIENTS = [
  { id: "d1", name: "Coral & Co", status: "reviewing", stage: "Review Portal", progress: 60, date: "Mar 22", color: "#FF6B6B" },
  { id: "d2", name: "Driftwood Surf", status: "production", stage: "Ad Production", progress: 85, date: "Mar 20", color: "#4ECDC4" },
  { id: "d3", name: "Lumina Skin", status: "delivered", stage: "Delivered", progress: 100, date: "Mar 18", color: "#A78BFA" },
  { id: "d4", name: "Viento Active", status: "onboarding", stage: "Intake Form", progress: 15, date: "Mar 23", color: "#F97316" },
];

const h = { fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" };

function parseColors(s) { return s ? (s.match(/#[0-9A-Fa-f]{3,8}/g) || []) : []; }

function Input({ label, value, onChange, placeholder, textarea, half }) {
  const sh = { width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", transition: "border-color 0.2s", resize: textarea ? "vertical" : undefined, minHeight: textarea ? 100 : undefined };
  return (
    <div style={{ flex: half ? "1 1 48%" : "1 1 100%", minWidth: half ? 200 : undefined }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {textarea ? <textarea style={sh} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => e.target.style.borderColor = Y} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
       : <input style={sh} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => e.target.style.borderColor = Y} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />}
    </div>
  );
}

function Btn({ children, onClick, primary, disabled, small, icon }) {
  return <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: small ? "8px 16px" : "14px 28px", borderRadius: 10, border: primary ? "none" : "1px solid #2A2A2A", cursor: disabled ? "not-allowed" : "pointer", background: primary ? Y : "transparent", color: primary ? "#0A0A0A" : "#ccc", fontSize: small ? 13 : 15, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s", opacity: disabled ? 0.4 : 1 }} onClick={disabled ? undefined : onClick}>{icon}{children}</button>;
}

async function callClaude(prompt) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (data.error) { console.error("Claude error:", data.error); return null; }
    return data.result;
  } catch (e) { console.error("Claude API error:", e); return null; }
}

// ─── Agency Dashboard ───
function Dashboard({ clients, onNew, onSelect }) {
  const sc = { onboarding: "#F97316", reviewing: Y, production: "#4ECDC4", delivered: "#22c55e" };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div><h1 style={{ ...h, fontSize: 36, marginBottom: 4 }}>Alchemy <span style={{ color: Y }}>Dashboard</span></h1><p style={{ color: "#888", fontSize: 15 }}>Your agency command center</p></div>
        <Btn primary onClick={onNew} icon={<Plus size={16} />}>New Client</Btn>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        {[{ l: "Total Clients", v: clients.length, c: "#fff" }, { l: "Active", v: clients.filter(c => c.status !== "delivered").length, c: Y }, { l: "Delivered", v: clients.filter(c => c.status === "delivered").length, c: "#22c55e" }, { l: "This Month", v: clients.length, c: "#4ECDC4" }].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "#131313", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{s.l}</p>
            <p style={{ color: s.c, fontSize: 28, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: "#131313", border: "1px solid #2A2A2A", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "12px 20px", borderBottom: "1px solid #1A1A1A", fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span style={{ flex: 2 }}>Client</span><span style={{ flex: 1.5 }}>Stage</span><span style={{ flex: 1 }}>Progress</span><span style={{ flex: 0.8 }}>Status</span><span style={{ flex: 0.5 }}>Date</span><span style={{ flex: 0.3 }}></span>
        </div>
        {clients.map((c, i) => (
          <div key={c.id} onClick={() => onSelect(c)} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < clients.length - 1 ? "1px solid #1A1A1A" : "none", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#1A1A1A"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.color + "20", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontSize: 13, fontWeight: 700 }}>{c.name[0]}</div>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{c.name}</span>
            </div>
            <span style={{ flex: 1.5, color: "#aaa", fontSize: 13 }}>{c.stage}</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#1A1A1A", overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: sc[c.status] || Y, width: `${c.progress}%` }} /></div>
              <span style={{ color: "#666", fontSize: 11, minWidth: 28 }}>{c.progress}%</span>
            </div>
            <div style={{ flex: 0.8 }}><span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (sc[c.status] || Y) + "18", color: sc[c.status] || Y }}>{c.status}</span></div>
            <span style={{ flex: 0.5, color: "#555", fontSize: 12 }}>{c.date}</span>
            <div style={{ flex: 0.3, textAlign: "right" }}><ChevronRight size={16} style={{ color: "#444" }} /></div>
          </div>
        ))}
        {clients.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#555" }}><p style={{ marginBottom: 12 }}>No clients yet.</p><Btn small primary onClick={onNew} icon={<Plus size={14} />}>Add First Client</Btn></div>}
      </div>
    </div>
  );
}

// ─── Client Detail View ───
const ALL_STAGES = ["Intake Form", "Review Portal", "Brand Kit Locked", "Ad Production", "Delivered"];
const STAGE_STATUS = { "Intake Form": "onboarding", "Review Portal": "reviewing", "Brand Kit Locked": "reviewing", "Ad Production": "production", "Delivered": "delivered" };
const STAGE_PROGRESS = { "Intake Form": 15, "Review Portal": 40, "Brand Kit Locked": 65, "Ad Production": 80, "Delivered": 100 };

function ClientDetail({ client, onBack, onUpdate }) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(client.notes || []);
  const [stageOpen, setStageOpen] = useState(false);
  const sc = { onboarding: "#F97316", reviewing: Y, production: "#4ECDC4", delivered: "#22c55e" };

  const addNote = () => {
    if (!note.trim()) return;
    const newNotes = [{ text: note, date: new Date().toLocaleString(), id: Date.now() }, ...notes];
    setNotes(newNotes);
    onUpdate({ ...client, notes: newNotes });
    setNote("");
  };

  const changeStage = (stage) => {
    onUpdate({ ...client, stage, status: STAGE_STATUS[stage] || "onboarding", progress: STAGE_PROGRESS[stage] || 15 });
    setStageOpen(false);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
        <ChevronLeft size={14} /> Back to Dashboard
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: (client.color || Y) + "20", border: `2px solid ${client.color || Y}40`, display: "flex", alignItems: "center", justifyContent: "center", color: client.color || Y, fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{client.name[0]}</div>
          <div>
            <h1 style={{ ...h, fontSize: 28, marginBottom: 4 }}>{client.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: (sc[client.status] || Y) + "18", color: sc[client.status] || Y }}>{client.status}</span>
              <span style={{ color: "#555", fontSize: 12 }}>Added {client.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage + Progress */}
      <div style={{ background: "#131313", border: "1px solid #2A2A2A", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...h, fontSize: 16 }}>Pipeline Stage</h3>
          <div style={{ position: "relative" }}>
            <Btn small onClick={() => setStageOpen(!stageOpen)} icon={<Edit3 size={12} />}>Change Stage</Btn>
            {stageOpen && (
              <div style={{ position: "absolute", top: "110%", right: 0, background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 10, padding: 4, zIndex: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {ALL_STAGES.map(s => (
                  <button key={s} onClick={() => changeStage(s)} style={{
                    display: "block", width: "100%", padding: "10px 14px", background: client.stage === s ? Y + "15" : "transparent",
                    border: "none", color: client.stage === s ? Y : "#ccc", fontSize: 13, cursor: "pointer", textAlign: "left",
                    borderRadius: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: client.stage === s ? 600 : 400,
                  }}
                    onMouseEnter={e => { if (client.stage !== s) e.currentTarget.style.background = "#222"; }}
                    onMouseLeave={e => { if (client.stage !== s) e.currentTarget.style.background = "transparent"; }}
                  >{s}{client.stage === s && " ✓"}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stage progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {ALL_STAGES.map((s, i) => {
            const stageIdx = ALL_STAGES.indexOf(client.stage);
            const done = i <= stageIdx;
            return <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: done ? (sc[client.status] || Y) : "#1A1A1A", transition: "background 0.3s" }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {ALL_STAGES.map((s, i) => {
            const stageIdx = ALL_STAGES.indexOf(client.stage);
            return <span key={s} style={{ fontSize: 10, color: i <= stageIdx ? "#aaa" : "#444", fontWeight: i === stageIdx ? 600 : 400, textAlign: "center", flex: 1 }}>{s}</span>;
          })}
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "#131313", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 12, color: "#666", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Client Info</h4>
          {client.formData ? (
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <p><span style={{ color: "#666" }}>Brand:</span> <span style={{ color: "#fff" }}>{client.formData.brandName}</span></p>
              {client.formData.tagline && <p><span style={{ color: "#666" }}>Tagline:</span> <span style={{ color: "#ccc" }}>{client.formData.tagline}</span></p>}
              {client.formData.website && <p><span style={{ color: "#666" }}>Website:</span> <span style={{ color: "#ccc" }}>{client.formData.website}</span></p>}
              <p><span style={{ color: "#666" }}>Objective:</span> <span style={{ color: "#ccc" }}>{client.formData.objective}</span></p>
              <p><span style={{ color: "#666" }}>Target:</span> <span style={{ color: "#ccc" }}>{client.formData.ageRange}</span></p>
              {client.formData.personality?.length > 0 && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>{client.formData.personality.map((t, i) => <span key={i} style={{ padding: "3px 10px", borderRadius: 12, background: Y + "15", color: Y, fontSize: 11 }}>{t}</span>)}</div>}
            </div>
          ) : (
            <p style={{ color: "#555", fontSize: 13 }}>No intake data yet</p>
          )}
        </div>
        <div style={{ flex: 1, background: "#131313", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 12, color: "#666", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Assets</h4>
          {client.formData?.productImages?.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {client.formData.productImages.map((img, i) => <div key={i} style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", border: "1px solid #2A2A2A" }}><img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
            </div>
          ) : <p style={{ color: "#555", fontSize: 13 }}>No assets uploaded</p>}
          {client.formData?.colors && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {parseColors(client.formData.colors).map((c, i) => <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.1)" }} />)}
            </div>
          )}
        </div>
      </div>

      {/* Internal Notes */}
      <div style={{ background: "#131313", border: "1px solid #2A2A2A", borderRadius: 14, padding: 24 }}>
        <h3 style={{ ...h, fontSize: 16, marginBottom: 16 }}>Internal Notes</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add an internal note about this client..."
            onKeyDown={e => { if (e.key === "Enter") addNote(); }}
            style={{ flex: 1, background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none" }}
            onFocus={e => e.target.style.borderColor = Y} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
          <Btn small primary onClick={addNote} disabled={!note.trim()} icon={<Send size={12} />}>Add</Btn>
        </div>
        {notes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map(n => (
              <div key={n.id} style={{ padding: "12px 16px", background: "#0A0A0A", borderRadius: 8, border: "1px solid #1A1A1A" }}>
                <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.5 }}>{n.text}</p>
                <p style={{ color: "#444", fontSize: 11, marginTop: 6 }}>{n.date}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 20 }}>No notes yet. Add notes to track conversations, feedback, or internal decisions.</p>
        )}
      </div>
    </div>
  );
}

// ─── Intake Form ───
function IntakeForm({ onSubmit }) {
  const [f, setF] = useState({ brandName: "Koko Swimwear", tagline: "Made for the water", story: "Koko is a Bali-born swimwear brand built for women who live between the ocean and the city. Founded in Canggu by a creative who got tired of seeing the same mass-produced swimwear everywhere — Koko designs pieces that are bold enough to turn heads on the beach but refined enough to wear to a sunset bar. Every piece is designed locally in Bali, using sustainable fabrics and ethical production. We're not just selling bikinis — we're selling the feeling of freedom, confidence, and living life on your own terms.", personality: ["Bold", "Luxurious", "Youthful", "Sophisticated"], formality: 72, mood: 65, intensity: 78, audience: "Women aged 22-35 who travel frequently, care about aesthetics, and live an active lifestyle. They follow fashion creators on Instagram and TikTok, spend time in places like Bali, Byron Bay, Tulum, and the South of France. They want to look incredible in photos but also need swimwear that actually stays on when they surf or swim. They shop DTC brands, care about sustainability but won't sacrifice style for it.", ageRange: "25-34", competitors: "Frankies Bikinis, Monday Swimwear, Triangl, Vitamin A", deepestFears: "Looking basic or blending in. Buying something that looks amazing online but cheap in person. Missing out on their best years by playing it safe. Being stuck in a boring routine while everyone else is living their dream life. Aging out of feeling confident in swimwear.", deepestDesires: "To feel like the most magnetic person on the beach. To have a wardrobe that makes getting dressed feel exciting, not stressful. To live a life that looks as good as it feels — travel, freedom, beauty, adventure. To feel confident in their own skin without trying too hard. To be part of a community of women who get it.", objective: OBJECTIVES[0], keyMessage: "Swimwear that makes you feel like the main character", colors: "#1A1A2E, #E94560, #FFD60A, #F5F5DC", website: "kokobali.com", productImages: [],
    voiceStyle: ["Confident", "Warm"], voiceGender: "Female", voiceAge: "20s-30s", voiceNotes: "Think: your cool older sister who's been everywhere. Not preachy, not try-hard. Natural, magnetic, slightly aspirational.",
    musicMood: ["Dreamy", "Energetic"], musicGenres: ["Electronic", "Indie"], musicNotes: "Golden hour beach vibes mixed with fashion-forward energy. Think Peggy Gou DJ set at a Tulum beach club.",
    videoPace: 65, videoEnergy: 70, videoTransitions: "Smooth", videoCuts: "Medium", videoNotes: "Start slow and atmospheric, build to an energetic middle, end on a confident hero shot. Match the pace to the music — let it breathe but keep it moving.",
    uniqueFeatures: ["Designed in Bali using locally sourced sustainable fabrics", "Stays on during surfing, swimming, and cliff jumping — actually functional", "Reversible designs — two looks in one piece", "Small-batch drops so you're not wearing the same bikini as everyone else", "Inclusive sizing without compromising on cut or design"],
    testimonials: ["I've never felt more confident on the beach. Every time I wear Koko I get asked where it's from. — @jessicatravel", "Finally a bikini that doesn't ride up when I actually swim. Game changer. — Sarah M.", "The quality is insane for the price. I own 4 sets now and they all still look brand new after a full summer. — @balibabe.co", "I wore my Koko set from the beach to a rooftop bar and got compliments both places. That's never happened before. — Mia R."],
    influencerAge: "Mid 20s",
    influencerEthnicity: "Mixed / ambiguous — could be Brazilian, Mediterranean, or Southeast Asian",
    influencerGender: "Female",
    influencerHairColor: "Dark brown with sun-kissed highlights",
    influencerHairStyle: "Long, natural beach waves — effortless not styled",
    influencerBodyType: "Athletic and toned but not fitness-model lean — real and aspirational",
    influencerBeautyLevel: "Naturally beautiful without heavy makeup — sun-kissed skin, minimal glam, looks like she just came from the water",
    influencerStyle: "Effortlessly cool — the kind of person who makes a simple bikini and sarong look editorial. Confident posture, magnetic energy, never posed or try-hard.",
    influencerPersonality: "Adventurous, warm, quietly confident. She's the friend who always knows the best hidden beach. She doesn't seek attention but naturally draws it.",
    influencerNotes: "Think someone you'd see on a Bali beach and want to know where she got her swimwear. Not a VS model — more like a well-traveled creative who happens to be stunning.",
  });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = t => u("personality", f.personality.includes(t) ? f.personality.filter(x => x !== t) : [...f.personality, t]);
  const ready = f.brandName && f.story && f.personality.length >= 2;
  const pc = parseColors(f.colors);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ ...h, fontSize: 36, marginBottom: 8 }}>Brand Intake <span style={{ color: Y }}>Form</span></h1>
      <p style={{ color: "#888", marginBottom: 36, fontSize: 15, lineHeight: 1.6 }}>Tell us about your brand. The more detail you provide, the sharper your generated guidelines will be.</p>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Brand Identity</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Input half label="Brand Name" value={f.brandName} onChange={v => u("brandName", v)} placeholder="e.g. Koko Swimwear" />
          <Input half label="Tagline" value={f.tagline} onChange={v => u("tagline", v)} placeholder="e.g. Made for the water" />
        </div>
        <div style={{ marginTop: 16 }}><Input textarea label="Brand Story" value={f.story} onChange={v => u("story", v)} placeholder="Tell us your brand's origin, mission, and what makes it unique..." /></div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Brand Personality (pick 2-5)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAGS.map(t => <button key={t} onClick={() => toggle(t)} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${f.personality.includes(t) ? Y : "#2A2A2A"}`, background: f.personality.includes(t) ? Y + "18" : "transparent", color: f.personality.includes(t) ? Y : "#888", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t}</button>)}
          </div>
        </div>
      </div>

      {/* AI Influencer */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your AI Influencer</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Describe your perfect digital brand ambassador. We'll create a custom AI influencer to represent your brand across all ad creative — <span style={{ color: Y, fontWeight: 600 }}>the more detail, the better</span>. Think of them as the face of your brand.</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <Input half label="Age" value={f.influencerAge || ""} onChange={v => u("influencerAge", v)} placeholder="e.g. Mid 20s, Early 30s" />
          <Input half label="Gender" value={f.influencerGender || ""} onChange={v => u("influencerGender", v)} placeholder="e.g. Female, Male, Non-binary" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <Input half label="Ethnicity / Look" value={f.influencerEthnicity || ""} onChange={v => u("influencerEthnicity", v)} placeholder="e.g. Mixed, Southeast Asian, Mediterranean" />
          <Input half label="Body Type" value={f.influencerBodyType || ""} onChange={v => u("influencerBodyType", v)} placeholder="e.g. Athletic, Slim, Curvy, Petite" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <Input half label="Hair Color" value={f.influencerHairColor || ""} onChange={v => u("influencerHairColor", v)} placeholder="e.g. Dark brown, Blonde, Black with highlights" />
          <Input half label="Hair Style" value={f.influencerHairStyle || ""} onChange={v => u("influencerHairStyle", v)} placeholder="e.g. Long beach waves, Short bob, Braids" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input textarea label="Beauty Level & Makeup" value={f.influencerBeautyLevel || ""} onChange={v => u("influencerBeautyLevel", v)} placeholder="Describe their look — are they glammed up or natural? Think makeup level, skin tone, freckles, tattoos, piercings, etc." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input textarea label="Style & Vibe" value={f.influencerStyle || ""} onChange={v => u("influencerStyle", v)} placeholder="How do they carry themselves? What's their energy? How do they dress beyond your product?" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input textarea label="Personality & Character" value={f.influencerPersonality || ""} onChange={v => u("influencerPersonality", v)} placeholder="Who are they as a person? What makes them magnetic? What kind of life do they live?" />
        </div>
        <div>
          <Input textarea label="Additional Notes / References" value={f.influencerNotes || ""} onChange={v => u("influencerNotes", v)} placeholder="Any other details, celebrity references, or mood descriptions. e.g. 'Think Hailey Bieber meets a surfer girl from Byron Bay'" />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Tone of Voice</h3>
        {TONES.map(t => <div key={t.key} style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 8 }}><span>{t.left}</span><span>{t.right}</span></div><input type="range" min={0} max={100} value={f[t.key]} onChange={e => u(t.key, Number(e.target.value))} style={{ width: "100%", accentColor: Y, height: 4, cursor: "pointer" }} /></div>)}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Target Audience</h3>
        <Input textarea label="Describe Your Ideal Customer" value={f.audience} onChange={v => u("audience", v)} placeholder="Who are they? What do they care about?" />
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <div style={{ flex: "1 1 48%" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Age Range</label>
            <select value={f.ageRange} onChange={e => u("ageRange", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {["18-24", "25-34", "35-44", "45-54", "55+"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Input half label="Competitors" value={f.competitors} onChange={v => u("competitors", v)} placeholder="e.g. Brand A, Brand B" />
        </div>
        <div style={{ marginTop: 16 }}>
          <Input textarea label="Avatar's Deepest Fears" value={f.deepestFears} onChange={v => u("deepestFears", v)} placeholder="What keeps your ideal customer up at night? What are they afraid of losing, missing out on, or never achieving? Be specific and emotional — this drives your ad copy." />
        </div>
        <div style={{ marginTop: 16 }}>
          <Input textarea label="Avatar's Deepest Desires" value={f.deepestDesires} onChange={v => u("deepestDesires", v)} placeholder="What does your ideal customer dream about? What transformation do they want? What would their perfect life look like? The more vivid, the better your ads will be." />
        </div>
      </div>

      {/* Unique Features & Benefits */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Unique Features & Benefits</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>What makes your product better than the competition? List your strongest selling points — these become the backbone of every ad. <span style={{ color: Y, fontWeight: 600 }}>Be specific.</span> "High quality" means nothing. "Hand-stitched in Bali using recycled ocean plastic" means everything.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {(f.uniqueFeatures || []).map((feat, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#131313", borderRadius: 8, border: "1px solid #2A2A2A" }}>
              <span style={{ color: Y, fontSize: 14, fontWeight: 700 }}>•</span>
              <input value={feat} onChange={e => { const nf = [...f.uniqueFeatures]; nf[i] = e.target.value; u("uniqueFeatures", nf); }}
                style={{ flex: 1, background: "transparent", border: "none", color: "#ccc", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none" }}
                placeholder="Enter a feature or benefit..." />
              <button onClick={() => u("uniqueFeatures", f.uniqueFeatures.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
            </div>
          ))}
        </div>
        {(f.uniqueFeatures || []).length < 8 && (
          <button onClick={() => u("uniqueFeatures", [...(f.uniqueFeatures || []), ""])}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px dashed #2A2A2A", borderRadius: 8, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = Y} onMouseLeave={e => e.currentTarget.style.borderColor = "#2A2A2A"}>
            <Plus size={14} /> Add feature
          </button>
        )}
      </div>

      {/* Testimonials / Social Proof */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Customer Testimonials</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Paste your best customer quotes, reviews, or DMs. Real words from real people are 10x more persuasive than anything AI can write — we'll weave these directly into your ads.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {(f.testimonials || []).map((test, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#131313", borderRadius: 8, border: "1px solid #2A2A2A" }}>
              <span style={{ color: "#A78BFA", fontSize: 18, lineHeight: 1, marginTop: 2 }}>"</span>
              <textarea value={test} onChange={e => { const nt = [...f.testimonials]; nt[i] = e.target.value; u("testimonials", nt); }}
                style={{ flex: 1, background: "transparent", border: "none", color: "#ccc", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", resize: "none", minHeight: 40, lineHeight: 1.5 }}
                placeholder="Paste a customer review, DM, or testimonial..." />
              <button onClick={() => u("testimonials", f.testimonials.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
            </div>
          ))}
        </div>
        {(f.testimonials || []).length < 10 && (
          <button onClick={() => u("testimonials", [...(f.testimonials || []), ""])}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px dashed #2A2A2A", borderRadius: 8, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#A78BFA"} onMouseLeave={e => e.currentTarget.style.borderColor = "#2A2A2A"}>
            <Plus size={14} /> Add testimonial
          </button>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Product Images</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Upload up to 5 high-quality product photos. These are the images your ads will be built from — <span style={{ color: Y, fontWeight: 600 }}>quality matters</span>. Use clean, well-lit shots of just the product on a plain or minimal background. No lifestyle shots, no collages.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {f.productImages.map((img, i) => (
            <div key={i} style={{ width: 120, height: 120, borderRadius: 10, overflow: "hidden", position: "relative", border: `1px solid ${Y}40`, background: "#161616" }}>
              <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => u("productImages", f.productImages.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "1px solid #555", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, padding: 0 }}>✕</button>
            </div>
          ))}
          {f.productImages.length < 5 && (
            <label style={{ width: 120, height: 120, borderRadius: 10, border: "2px dashed #2A2A2A", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "#111" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = Y} onMouseLeave={e => e.currentTarget.style.borderColor = "#2A2A2A"}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: Y + "15", display: "flex", alignItems: "center", justifyContent: "center", color: Y, fontSize: 18 }}>+</div>
              <span style={{ fontSize: 11, color: "#666" }}>{f.productImages.length === 0 ? "Add photos" : `${5 - f.productImages.length} left`}</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { const files = Array.from(e.target.files || []); const toAdd = files.slice(0, 5 - f.productImages.length).map(file => ({ name: file.name, url: URL.createObjectURL(file), file })); u("productImages", [...f.productImages, ...toAdd]); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      {/* Audio & Voice */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Audio & Voice</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Define the voice and sound of your brand. This shapes voiceovers, UGC-style narration, and the music that backs your video ads.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avatar Voice Style (pick 1-3)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VOICE_STYLES.map(v => { const active = (f.voiceStyle || []).includes(v); return <button key={v} onClick={() => u("voiceStyle", active ? f.voiceStyle.filter(x => x !== v) : [...(f.voiceStyle || []), v].slice(0, 3))} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? Y : "#2A2A2A"}`, background: active ? Y + "18" : "transparent", color: active ? Y : "#888", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v}</button>; })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: "1 1 48%" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Voice Gender</label>
            <select value={f.voiceGender || ""} onChange={e => u("voiceGender", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {VOICE_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 48%" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Voice Age</label>
            <select value={f.voiceAge || ""} onChange={e => u("voiceAge", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {VOICE_AGES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <Input textarea label="Voice Notes" value={f.voiceNotes || ""} onChange={v => u("voiceNotes", v)} placeholder="Describe the vibe of the voice. Think of a person, a character, or a reference — e.g. 'Like a cool best friend who's effortlessly put-together'" />

        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Music Mood (pick 1-3)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MUSIC_MOODS.map(m => { const active = (f.musicMood || []).includes(m); return <button key={m} onClick={() => u("musicMood", active ? f.musicMood.filter(x => x !== m) : [...(f.musicMood || []), m].slice(0, 3))} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? "#A78BFA" : "#2A2A2A"}`, background: active ? "#A78BFA18" : "transparent", color: active ? "#A78BFA" : "#888", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{m}</button>; })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Music Genre (pick 1-3)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MUSIC_GENRES.map(g => { const active = (f.musicGenres || []).includes(g); return <button key={g} onClick={() => u("musicGenres", active ? f.musicGenres.filter(x => x !== g) : [...(f.musicGenres || []), g].slice(0, 3))} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? "#4ECDC4" : "#2A2A2A"}`, background: active ? "#4ECDC418" : "transparent", color: active ? "#4ECDC4" : "#888", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g}</button>; })}
          </div>
        </div>

        <Input textarea label="Music Notes" value={f.musicNotes || ""} onChange={v => u("musicNotes", v)} placeholder="Describe the sound. Reference a song, artist, playlist, or vibe — e.g. 'Sunset beach DJ set meets fashion runway'" />
      </div>

      {/* Video Pace & Timing */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Video Pace & Timing</h3>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>How should your video ads feel? This controls the rhythm, energy, and editing style of all generated video content.</p>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 8 }}><span>Slow & Cinematic</span><span>Fast & Energized</span></div>
          <input type="range" min={0} max={100} value={f.videoPace || 50} onChange={e => u("videoPace", Number(e.target.value))} style={{ width: "100%", accentColor: "#FF6B6B", height: 4, cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 8 }}><span>Calm & Atmospheric</span><span>High Energy & Dynamic</span></div>
          <input type="range" min={0} max={100} value={f.videoEnergy || 50} onChange={e => u("videoEnergy", Number(e.target.value))} style={{ width: "100%", accentColor: "#FF6B6B", height: 4, cursor: "pointer" }} />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: "1 1 48%" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transition Style</label>
            <select value={f.videoTransitions || "Smooth"} onChange={e => u("videoTransitions", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {TRANSITION_STYLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 48%" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cut Speed</label>
            <select value={f.videoCuts || "Medium"} onChange={e => u("videoCuts", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {CUT_SPEEDS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <Input textarea label="Video Direction Notes" value={f.videoNotes || ""} onChange={v => u("videoNotes", v)} placeholder="Describe the overall feel — e.g. 'Start slow and atmospheric, build to an energetic middle, end on a confident hero shot'" />
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Campaign</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Objective</label>
          <select value={f.objective} onChange={e => u("objective", e.target.value)} style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <Input textarea label="Key Message" value={f.keyMessage} onChange={v => u("keyMessage", v)} placeholder="What's the one thing you want your audience to remember?" />
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <Input half label="Brand Colors (hex codes)" value={f.colors} onChange={v => u("colors", v)} placeholder="e.g. #1A1A2E, #E94560, #FFD60A" />
          <Input half label="Website" value={f.website} onChange={v => u("website", v)} placeholder="e.g. kokobali.com" />
        </div>
        {pc.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 12, padding: 12, background: "#131313", borderRadius: 10, border: "1px solid #1A1A1A" }}>
            {pc.map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: c, border: "1px solid rgba(255,255,255,0.1)" }} /><span style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>{c}</span></div>)}
          </div>
        )}
      </div>

      <Btn primary onClick={() => onSubmit(f)} disabled={!ready} icon={<Sparkles size={16} />}>Generate Brand Guidelines</Btn>
      {!ready && <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>Fill in brand name, story, and pick at least 2 personality tags.</p>}
    </div>
  );
}

// ─── Review Section ───
function Section({ sectionKey, data, status, onApprove, onRequestChanges, onSubmitFeedback, feedback, onFeedbackChange, isRegen, formData }) {
  const label = SECTION_LABELS[sectionKey];
  const approved = status === "approved";
  const reviewing = status === "feedback";
  const brandColors = parseColors(formData?.colors);

  const content = () => {
    if (!data) return <p style={{ color: "#555" }}>Not generated yet.</p>;
    if (sectionKey === "brandSummary") return (
      <div>
        <p style={{ color: "#ccc", lineHeight: 1.8, fontSize: 14 }}>{data}</p>
        {formData?.productImages?.length > 0 && <div style={{ marginTop: 20 }}><h5 style={{ color: Y, fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Product Assets</h5><div style={{ display: "flex", gap: 10 }}>{formData.productImages.map((img, i) => <div key={i} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #2A2A2A" }}><img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}</div></div>}
        {brandColors.length > 0 && <div style={{ marginTop: 20 }}><h5 style={{ color: Y, fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Brand Palette</h5><div style={{ display: "flex", gap: 8 }}>{brandColors.map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 48, height: 48, borderRadius: 10, background: c, border: "1px solid rgba(255,255,255,0.1)" }} /><span style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>{c}</span></div>)}</div></div>}
      </div>
    );
    if (sectionKey === "toneOfVoice") return (
      <div>
        <p style={{ color: "#ccc", lineHeight: 1.7, fontSize: 14, marginBottom: 16 }}>{data.description}</p>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}><h5 style={{ color: Y, fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Do</h5>{(data.doList || []).map((d, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>✓ {d}</p>)}</div>
          <div style={{ flex: 1 }}><h5 style={{ color: "#ff6b6b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Don't</h5>{(data.dontList || []).map((d, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>✗ {d}</p>)}</div>
        </div>
      </div>
    );
    if (sectionKey === "audiencePersona") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: Y + "20", display: "flex", alignItems: "center", justifyContent: "center", color: Y, fontWeight: 700, fontSize: 16 }}>{(data.name || "?")[0]}</div>
          <div><p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{data.name}</p><p style={{ color: "#888", fontSize: 12 }}>{data.age}</p></div>
        </div>
        <p style={{ color: "#ccc", lineHeight: 1.7, fontSize: 14, marginBottom: 12 }}>{data.description}</p>
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><h5 style={{ color: "#ff8888", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Pain Points</h5>{(data.painPoints || []).map((p, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>• {p}</p>)}</div>
          <div style={{ flex: 1 }}><h5 style={{ color: "#88ddaa", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Aspirations</h5>{(data.aspirations || []).map((a, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>• {a}</p>)}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1, padding: 16, borderRadius: 10, background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <h5 style={{ color: "#ff6b6b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>Deepest Fears</h5>
            {(data.deepestFears || []).map((f, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>• {f}</p>)}
          </div>
          <div style={{ flex: 1, padding: 16, borderRadius: 10, background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <h5 style={{ color: Y, fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>Deepest Desires</h5>
            {(data.deepestDesires || []).map((d, i) => <p key={i} style={{ color: "#aaa", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>• {d}</p>)}
          </div>
        </div>
      </div>
    );
    if (sectionKey === "visualDirection") return (
      <div>
        <p style={{ color: "#ccc", lineHeight: 1.7, fontSize: 14, marginBottom: 12 }}>{data.description}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{(data.moodKeywords || []).map((k, i) => <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa", fontSize: 12 }}>{k}</span>)}</div>
        <p style={{ color: "#888", fontSize: 13 }}><strong style={{ color: Y }}>Color Usage:</strong> {data.colorUsage}</p>
        {brandColors.length > 0 && <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "#0A0A0A", border: "1px solid #1A1A1A" }}><div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", height: 40, marginBottom: 8 }}>{brandColors.map((c, i) => <div key={i} style={{ flex: i === 0 ? 3 : 1, background: c }} />)}</div><p style={{ fontSize: 11, color: "#555" }}>Proportional palette preview</p></div>}
      </div>
    );
    if (sectionKey === "copyDirection") return (
      <div>
        {data.taglineOptions?.length > 0 && <div style={{ marginBottom: 16 }}><h5 style={{ color: Y, fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Tagline Options</h5>{data.taglineOptions.map((t, i) => <p key={i} style={{ color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>"{t}"</p>)}</div>}
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}><h5 style={{ color: "#88bbff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Headlines</h5>{(data.headlines || []).map((x, i) => <p key={i} style={{ color: "#ccc", fontSize: 13, marginBottom: 6 }}>• {x}</p>)}</div>
          <div style={{ flex: 1 }}><h5 style={{ color: "#dd88ff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Hooks</h5>{(data.hooks || []).map((x, i) => <p key={i} style={{ color: "#ccc", fontSize: 13, marginBottom: 6 }}>• {x}</p>)}</div>
        </div>
        {data.ctaExamples && <div style={{ marginTop: 16 }}><h5 style={{ color: "#ffbb88", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>CTA Examples</h5><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{data.ctaExamples.map((c, i) => <span key={i} style={{ padding: "8px 16px", borderRadius: 8, background: Y + "15", color: Y, fontSize: 13, fontWeight: 600 }}>{c}</span>)}</div></div>}
      </div>
    );
    return null;
  };

  return (
    <div style={{ background: "#131313", border: `1px solid ${approved ? Y + "40" : "#2A2A2A"}`, borderRadius: 14, padding: 28, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ ...h, fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
          {label}
          {approved && <span style={{ background: Y + "20", color: Y, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>APPROVED</span>}
          {isRegen && <Loader2 size={16} style={{ color: Y, animation: "spin 1s linear infinite" }} />}
        </h3>
        {!approved && !isRegen && <div style={{ display: "flex", gap: 8 }}><Btn small onClick={onApprove} icon={<Check size={14} />}>Approve</Btn><Btn small onClick={onRequestChanges} icon={<MessageSquare size={14} />}>{reviewing ? "Cancel" : "Request Changes"}</Btn></div>}
        {approved && !isRegen && <Btn small onClick={onRequestChanges} icon={<RefreshCw size={14} />}>Revise</Btn>}
      </div>
      {content()}
      {reviewing && (
        <div style={{ marginTop: 20, padding: 16, background: "#0A0A0A", borderRadius: 10, border: "1px solid #2A2A2A" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: Y, marginBottom: 8, textTransform: "uppercase" }}>Your Feedback</label>
          <textarea style={{ width: "100%", background: "#161616", border: "1px solid #2A2A2A", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: 80, resize: "vertical", outline: "none" }}
            value={feedback} onChange={e => onFeedbackChange(e.target.value)} placeholder="e.g. Make the tone more casual, emphasize sustainability..." />
          <div style={{ marginTop: 10 }}><Btn small primary onClick={onSubmitFeedback} disabled={!feedback.trim()} icon={<RefreshCw size={14} />}>Regenerate</Btn></div>
        </div>
      )}
    </div>
  );
}

// ─── Main ───
export default function AlchemyOS() {
  const [view, setView] = useState("dashboard");
  const [screen, setScreen] = useState("intake");
  const [formData, setFormData] = useState(null);
  const [guidelines, setGuidelines] = useState({});
  const [statuses, setStatuses] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [regen, setRegen] = useState({});
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // Load clients from Supabase on mount
  useEffect(() => {
    async function load() {
      const dbClients = await getClients();
      if (dbClients && dbClients.length > 0) {
        setClients(dbClients.map(c => ({
          id: c.id, name: c.name, status: c.status, stage: c.stage,
          progress: c.progress, date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          color: c.color || '#FFD60A',
        })));
      } else {
        // Show demo data if no DB or empty
        setClients(DEMO_CLIENTS);
      }
      setDbReady(true);
    }
    load();
  }, []);

  useEffect(() => { if (screen !== "generating") return; const iv = setInterval(() => setLoadingMsg(p => p + 1), 2500); return () => clearInterval(iv); }, [screen]);

  const allApproved = SECTIONS.every(s => statuses[s] === "approved");

  const handleSubmit = async (data) => {
    setFormData(data); setScreen("generating"); setError(null);

    // Save client + intake to Supabase
    const dbClient = await createClient_db(data.brandName);
    if (dbClient) {
      setCurrentClientId(dbClient.id);
      await saveBrandIntake(dbClient.id, data);
      await updateClient_db(dbClient.id, { status: 'onboarding', stage: 'Generating', progress: 25 });

      // Upload product images if any
      if (data.productImages?.length > 0) {
        const urls = [];
        for (const img of data.productImages) {
          if (img.file) {
            const url = await uploadProductImage(dbClient.id, img.file);
            if (url) urls.push(url);
          }
        }
        // Update intake with image URLs
        if (urls.length > 0 && supabase) {
          await supabase.from('brand_intake').update({ product_image_urls: urls }).eq('client_id', dbClient.id);
        }
      }
    }

    const r = await callClaude(`You are a senior brand strategist. Generate brand guidelines from this intake:
${JSON.stringify(data, null, 2)}
Tone sliders 0-100: formality(0=Formal,100=Casual):${data.formality}, mood(0=Serious,100=Playful):${data.mood}, intensity(0=Subtle,100=Bold):${data.intensity}

IMPORTANT: The client provided their avatar's deepest fears and deepest desires. Use these to create emotionally resonant, psychologically precise guidelines.

Return ONLY valid JSON: { "brandSummary": "2-3 paragraphs", "toneOfVoice": { "description": "...", "doList": ["5 items"], "dontList": ["5 items"] }, "audiencePersona": { "name": "...", "age": "...", "description": "...", "painPoints": ["4-5"], "aspirations": ["4-5"], "deepestFears": ["3-4 deep psychological fears derived from the client input - what keeps them up at night, what they dread"], "deepestDesires": ["3-4 deep desires and transformations they crave - what their ideal life looks like"] }, "visualDirection": { "description": "...", "moodKeywords": ["8-10"], "colorUsage": "..." }, "copyDirection": { "taglineOptions": ["3"], "headlines": ["5"], "hooks": ["5"], "ctaExamples": ["5"] } }`);
    if (r) {
      setGuidelines(r);
      const init = {}; SECTIONS.forEach(s => init[s] = "pending"); setStatuses(init);
      setScreen("review");
      // Save guidelines to Supabase
      if (currentClientId || dbClient?.id) {
        const cid = currentClientId || dbClient.id;
        await saveBrandHub(cid, r, init);
        await updateClient_db(cid, { status: 'reviewing', stage: 'Review Portal', progress: 50 });
      }
    } else { setError("Generation failed."); setScreen("intake"); }
  };

  const handleRegen = async (key) => {
    setRegen(p => ({ ...p, [key]: true }));
    const r = await callClaude(`Regenerate "${SECTION_LABELS[key]}" section. INTAKE: ${JSON.stringify(formData, null, 2)}. CURRENT: ${JSON.stringify(guidelines[key], null, 2)}. FEEDBACK: "${feedbacks[key]}". Return ONLY valid JSON with same structure.`);
    if (r) { setGuidelines(p => ({ ...p, [key]: r })); setStatuses(p => ({ ...p, [key]: "pending" })); setFeedbacks(p => ({ ...p, [key]: "" })); }
    setRegen(p => ({ ...p, [key]: false }));
  };

  const goHome = async () => {
    // Refresh clients from DB
    const dbClients = await getClients();
    if (dbClients && dbClients.length > 0) {
      setClients(dbClients.map(c => ({
        id: c.id, name: c.name, status: c.status, stage: c.stage,
        progress: c.progress, date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        color: c.color || '#FFD60A',
      })));
    }
    setView("dashboard");
    setSelectedClient(null);
    setCurrentClientId(null);
  };

  const updateClient = async (updated) => {
    setClients(p => p.map(c => c.id === updated.id ? updated : c));
    setSelectedClient(updated);
    // Persist stage/status changes to DB
    await updateClient_db(updated.id, { status: updated.status, stage: updated.stage, progress: updated.progress });
  };

  const selectClient = (c) => {
    if (c.id.startsWith && c.id.startsWith("d")) {
      newClient();
    } else {
      setSelectedClient(c);
      setView("detail");
    }
  };

  const newClient = () => { setView("client"); setScreen("intake"); setFormData(null); setGuidelines({}); setStatuses({}); setFeedbacks({}); setError(null); setSelectedClient(null); setCurrentClientId(null); };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#0A0A0A", color: "#fff", minHeight: "100vh" }}>
      <style>{fonts}{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.15; } 100% { transform: scale(0.8); opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #161616; color: #fff; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0A0A0A; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        input:focus, textarea:focus, select:focus { border-color: ${Y} !important; outline: none; }
      `}</style>

      <div style={{ borderBottom: "1px solid #1A1A1A", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={goHome}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: Y, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={18} style={{ color: "#0A0A0A" }} /></div>
          <span style={{ ...h, fontSize: 18 }}>Alchemy <span style={{ color: Y }}>OS</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {(view === "client" || view === "detail") && <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}><Home size={14} /> Dashboard</button>}
          {view === "client" && screen === "review" && <span style={{ fontSize: 13, color: "#888" }}>{SECTIONS.filter(s => statuses[s] === "approved").length}/{SECTIONS.length} approved</span>}
        </div>
      </div>

      <div style={{ maxWidth: view === "dashboard" || view === "detail" ? 960 : 860, margin: "0 auto", padding: "40px 24px", animation: "fadeIn 0.4s ease-out" }}>
        {view === "dashboard" && <Dashboard clients={clients} onNew={newClient} onSelect={selectClient} />}

        {view === "detail" && selectedClient && <ClientDetail client={selectedClient} onBack={() => { setView("dashboard"); setSelectedClient(null); }} onUpdate={updateClient} />}

        {view === "client" && <>
          {error && <div style={{ background: "#2a1010", border: "1px solid #ff4444", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ff8888", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><X size={16} /> {error}</div>}

          {screen === "intake" && <IntakeForm onSubmit={handleSubmit} />}
          {screen === "generating" && <Generating msgIndex={loadingMsg} />}

          {screen === "review" && <div>
            <h1 style={{ ...h, fontSize: 36, marginBottom: 8 }}>Review <span style={{ color: Y }}>& Approve</span></h1>
            <p style={{ color: "#888", marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>Review each section. Approve what works, request changes on what doesn't.</p>
            {SECTIONS.map(sec => <Section key={sec} sectionKey={sec} data={guidelines[sec]} status={statuses[sec]} feedback={feedbacks[sec] || ""} onFeedbackChange={v => setFeedbacks(p => ({ ...p, [sec]: v }))} onApprove={() => setStatuses(p => ({ ...p, [sec]: "approved" }))} onRequestChanges={() => setStatuses(p => ({ ...p, [sec]: statuses[sec] === "feedback" ? "pending" : "feedback" }))} onSubmitFeedback={() => handleRegen(sec)} isRegen={regen[sec]} formData={formData} />)}
            {allApproved && <div style={{ textAlign: "center", marginTop: 32, padding: 32, background: Y + "08", border: `1px solid ${Y}30`, borderRadius: 14 }}><h3 style={{ ...h, fontSize: 20, marginBottom: 8, color: Y }}>All Sections Approved</h3><p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>Lock your brand kit to begin ad production.</p><Btn primary onClick={async () => { setScreen("locked"); if (currentClientId) { await lockBrandHub(currentClientId); await updateClient_db(currentClientId, { status: 'reviewing', stage: 'Brand Kit Locked', progress: 65 }); } }} icon={<Lock size={16} />}>Lock Brand Kit</Btn></div>}
          </div>}

          {screen === "locked" && <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: Y + "15", border: `2px solid ${Y}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><Lock size={32} style={{ color: Y }} /></div>
            <h1 style={{ ...h, fontSize: 36, marginBottom: 12 }}>Brand Kit <span style={{ color: Y }}>Locked</span></h1>
            <p style={{ color: "#888", fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>Your brand guidelines are finalized and ready for ad production.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn primary onClick={async () => { setScreen("submitted"); if (currentClientId) { await updateClient_db(currentClientId, { status: 'production', stage: 'In Production', progress: 80 }); } }} icon={<Send size={16} />}>Submit for Ad Production</Btn>
              <Btn onClick={() => { setScreen("review"); setStatuses(p => { const n = {...p}; SECTIONS.forEach(s => n[s] = "approved"); return n; }); }}>Review Brand Kit</Btn>
            </div>
          </div>}

          {screen === "submitted" && <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 32px" }}>
              <div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: Y + "10", animation: "pulse-ring 3s ease-in-out infinite" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: Y + "15", border: `2px solid ${Y}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={40} style={{ color: Y }} />
              </div>
            </div>
            <h1 style={{ ...h, fontSize: 36, marginBottom: 12 }}>We've Got <span style={{ color: Y }}>Everything</span></h1>
            <p style={{ color: "#ccc", fontSize: 18, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 16px", fontWeight: 500 }}>
              Our team has received your brand kit and will now begin producing your ads.
            </p>
            <p style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 32px" }}>
              We'll craft your AI influencer, generate ad creative across all formats, and build out your full campaign. You'll receive a notification when everything is ready for review.
            </p>

            <div style={{ maxWidth: 480, margin: "0 auto 32px", background: "#131313", border: "1px solid #2A2A2A", borderRadius: 14, padding: 24, textAlign: "left" }}>
              <h3 style={{ ...h, fontSize: 14, color: Y, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>What happens next</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { step: "1", title: "AI Influencer Creation", desc: "We'll build your custom digital avatar based on your specifications", time: "24-48 hours" },
                  { step: "2", title: "Ad Creative Production", desc: "100+ ads across all formats — image, video, and copy", time: "3-5 days" },
                  { step: "3", title: "Internal QA Review", desc: "Our team reviews every ad for quality and brand consistency", time: "1-2 days" },
                  { step: "4", title: "Delivery", desc: "Your complete ad library delivered via Google Drive with a shareable link", time: "Same day" },
                ].map(item => (
                  <div key={item.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: Y + "15", border: `1px solid ${Y}40`, display: "flex", alignItems: "center", justifyContent: "center", color: Y, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{item.step}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{item.title}</p>
                        <span style={{ color: "#555", fontSize: 11 }}>{item.time}</span>
                      </div>
                      <p style={{ color: "#888", fontSize: 13, lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ maxWidth: 480, margin: "0 auto 32px", padding: 16, background: Y + "08", border: `1px solid ${Y}25`, borderRadius: 10 }}>
              <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
                Questions? Reply to your onboarding email or reach out anytime. We're building something great for <span style={{ color: Y, fontWeight: 600 }}>{formData?.brandName || "your brand"}</span>.
              </p>
            </div>

            <Btn onClick={goHome} icon={<Home size={16} />}>Back to Dashboard</Btn>
          </div>}
        </>}
      </div>
    </div>
  );
}

function Generating({ msgIndex }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div style={{ position: "relative", width: 100, height: 100, marginBottom: 40 }}>
        <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: Y + "15", animation: "pulse-ring 2s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: Y + "10", border: `2px solid ${Y}40`, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={32} style={{ color: Y }} /></div>
      </div>
      <h2 style={{ ...h, fontSize: 24, marginBottom: 12 }}>Building Your Brand</h2>
      <p style={{ color: Y, fontSize: 15, fontWeight: 500 }}>{LOADING_MSGS[msgIndex % LOADING_MSGS.length]}</p>
    </div>
  );
}
