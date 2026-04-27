"use client";
import { useState, useEffect } from "react";
import { Check, Sparkles, RefreshCw, Lock, X, Loader2, MessageSquare, Plus, Home, Send } from "lucide-react";
import { supabase, createClient_db, updateClient_db, saveBrandIntake, saveBrandHub, lockBrandHub, uploadProductImage } from "../../lib/supabase";

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');`;
const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  card: "#FFFFFF", cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  accent: "#000000", accentSoft: "#00000010",
  success: "#34C759", warning: "#FF9500", danger: "#FF3B30", info: "#007AFF",
};

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

const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.01em" };

function parseColors(s) { return s ? (s.match(/#[0-9A-Fa-f]{3,8}/g) || []) : []; }

function Input({ label, value, onChange, placeholder, textarea, half }) {
  const sh = { width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', -apple-system, sans-serif", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", resize: textarea ? "vertical" : undefined, minHeight: textarea ? 100 : undefined };
  return (
    <div style={{ flex: half ? "1 1 48%" : "1 1 100%", minWidth: half ? 200 : undefined }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>{label}</label>
      {textarea ? <textarea style={sh} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }} onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }} />
       : <input style={sh} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }} onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }} />}
    </div>
  );
}

function Btn({ children, onClick, primary, disabled, small, icon }) {
  return <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: small ? "8px 18px" : "12px 28px", borderRadius: 980, border: primary ? "none" : `1px solid ${C.border}`, cursor: disabled ? "not-allowed" : "pointer", background: primary ? C.accent : C.bg, color: primary ? "#fff" : C.text, fontSize: small ? 13 : 15, fontWeight: 500, fontFamily: "'Inter', -apple-system, sans-serif", transition: "all 0.2s", opacity: disabled ? 0.35 : 1 }} onClick={disabled ? undefined : onClick}>{icon}{children}</button>;
}

async function callClaude(prompt) {
  try {
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    if (data.error) { console.error("Claude error:", data.error); return null; }
    return data.result;
  } catch (e) { console.error("Claude API error:", e); return null; }
}

function IntakeForm({ onSubmit }) {
  const [f, setF] = useState({ brandName: "", tagline: "", story: "", personality: [], formality: 50, mood: 50, intensity: 50, audience: "", ageRange: "25-34", competitors: "", deepestFears: "", deepestDesires: "", objective: OBJECTIVES[0], keyMessage: "", colors: "", website: "", productImages: [], voiceStyle: [], voiceGender: "Female", voiceAge: "20s-30s", voiceNotes: "", musicMood: [], musicGenres: [], musicNotes: "", videoPace: 50, videoEnergy: 50, videoTransitions: "Smooth", videoCuts: "Medium", videoNotes: "", uniqueFeatures: [""], testimonials: [""], influencerAge: "", influencerEthnicity: "", influencerGender: "", influencerHairColor: "", influencerHairStyle: "", influencerBodyType: "", influencerBeautyLevel: "", influencerStyle: "", influencerPersonality: "", influencerNotes: "" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = t => u("personality", f.personality.includes(t) ? f.personality.filter(x => x !== t) : [...f.personality, t]);
  const ready = f.brandName && f.story && f.personality.length >= 2;
  const pc = parseColors(f.colors);
  const chip = (active, color = C.accent) => ({ padding: "8px 18px", borderRadius: 980, border: `1px solid ${active ? color : C.borderLight}`, background: active ? color + "08" : "transparent", color: active ? color : C.textSec, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" });

  // Express auto-fill from a website URL
  const [expressUrl, setExpressUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapeSuccess, setScrapeSuccess] = useState(false);

  const runExpress = async () => {
    if (!expressUrl.trim() || scraping) return;
    setScraping(true); setScrapeError(""); setScrapeSuccess(false);
    try {
      const res = await fetch("/api/brand-intake/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: expressUrl.trim() }) });
      const data = await res.json();
      if (!res.ok || data.error) { setScrapeError(data.error || "Could not scrape that site."); return; }
      const d = data.data || {};
      setF(p => ({
        ...p,
        brandName: d.brand_name || p.brandName,
        tagline: d.tagline || p.tagline,
        story: d.story || p.story,
        personality: Array.isArray(d.personality_tags) && d.personality_tags.length ? d.personality_tags.filter(t => TAGS.includes(t)) : p.personality,
        audience: d.audience_description || p.audience,
        ageRange: d.age_range || p.ageRange,
        competitors: d.competitors || p.competitors,
        deepestFears: d.deepest_fears || p.deepestFears,
        deepestDesires: d.deepest_desires || p.deepestDesires,
        uniqueFeatures: Array.isArray(d.unique_features) && d.unique_features.length ? d.unique_features : p.uniqueFeatures,
        voiceStyle: Array.isArray(d.voice_style) ? d.voice_style.filter(v => VOICE_STYLES.includes(v)) : p.voiceStyle,
        musicMood: Array.isArray(d.music_mood) ? d.music_mood.filter(v => MUSIC_MOODS.includes(v)) : p.musicMood,
        musicGenres: Array.isArray(d.music_genres) ? d.music_genres.filter(v => MUSIC_GENRES.includes(v)) : p.musicGenres,
        colors: d.brand_colors || p.colors,
        objective: OBJECTIVES.includes(d.objective) ? d.objective : p.objective,
        keyMessage: d.key_message || p.keyMessage,
        website: d.website || expressUrl.trim(),
        formality: typeof d.tone_formality === "number" ? d.tone_formality : p.formality,
        mood: typeof d.tone_mood === "number" ? d.tone_mood : p.mood,
        intensity: typeof d.tone_intensity === "number" ? d.tone_intensity : p.intensity,
      }));
      setScrapeSuccess(true);
    } catch (e) {
      setScrapeError("Network error. Try again.");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ ...hd, fontSize: 44, color: C.text, marginBottom: 8 }}>Brand Guidelines</h1>
      <p style={{ color: C.textSec, marginBottom: 24, fontSize: 16, lineHeight: 1.6 }}>Tell us about your brand. The more detail you provide, the sharper your generated guidelines will be.</p>

      {/* Express auto-fill banner */}
      <div style={{ background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)", color: "#fff", borderRadius: 16, padding: 22, marginBottom: 36, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Express Mode</span>
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, marginBottom: 14 }}>
          Drop in a website URL and we&apos;ll auto-fill the entire form by scraping the brand&apos;s site. You&apos;ll still upload your own product photos so they stay HQ.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={expressUrl} onChange={e => { setExpressUrl(e.target.value); setScrapeError(""); }}
            onKeyDown={e => { if (e.key === "Enter") runExpress(); }}
            placeholder="https://yourbrand.com" disabled={scraping}
            style={{ flex: "1 1 240px", padding: "11px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, outline: "none", background: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'Inter', sans-serif" }}
          />
          <button onClick={runExpress} disabled={!expressUrl.trim() || scraping}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", fontSize: 13, fontWeight: 600, background: "#fff", color: "#000", border: "none", borderRadius: 980, cursor: expressUrl.trim() && !scraping ? "pointer" : "not-allowed", opacity: expressUrl.trim() && !scraping ? 1 : 0.5, fontFamily: "'Inter', sans-serif" }}>
            {scraping ? <><Loader2 size={14} className="spin" /> Scraping...</> : <><Sparkles size={14} /> Auto-fill</>}
          </button>
        </div>
        {scrapeError && <p style={{ fontSize: 12, color: "#FF8A85", marginTop: 10 }}>{scrapeError}</p>}
        {scrapeSuccess && <p style={{ fontSize: 12, color: "#5DD893", marginTop: 10 }}>✓ Form pre-filled. Review below and add product images.</p>}
      </div>
      <style>{`.spin { animation: spinKf 1s linear infinite; } @keyframes spinKf { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Brand Identity</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}><Input half label="Brand Name" value={f.brandName} onChange={v => u("brandName", v)} placeholder="e.g. Koko Swimwear" /><Input half label="Tagline" value={f.tagline} onChange={v => u("tagline", v)} placeholder="e.g. Made for the water" /></div><div style={{ marginTop: 16 }}><Input textarea label="Brand Story" value={f.story} onChange={v => u("story", v)} placeholder="Tell us your brand's origin, mission, and what makes it unique..." /></div><div style={{ marginTop: 20 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Brand Personality (pick 2-5)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TAGS.map(t => <button key={t} onClick={() => toggle(t)} style={chip(f.personality.includes(t))}>{t}</button>)}</div></div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Your AI Influencer</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Describe your perfect digital brand ambassador.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Age" value={f.influencerAge} onChange={v => u("influencerAge", v)} placeholder="e.g. Mid 20s" /><Input half label="Gender" value={f.influencerGender} onChange={v => u("influencerGender", v)} placeholder="e.g. Female" /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Ethnicity / Look" value={f.influencerEthnicity} onChange={v => u("influencerEthnicity", v)} placeholder="e.g. Mixed, Southeast Asian" /><Input half label="Body Type" value={f.influencerBodyType} onChange={v => u("influencerBodyType", v)} placeholder="e.g. Athletic, Slim" /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Hair Color" value={f.influencerHairColor} onChange={v => u("influencerHairColor", v)} placeholder="e.g. Dark brown" /><Input half label="Hair Style" value={f.influencerHairStyle} onChange={v => u("influencerHairStyle", v)} placeholder="e.g. Long beach waves" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Beauty Level & Makeup" value={f.influencerBeautyLevel} onChange={v => u("influencerBeautyLevel", v)} placeholder="Glammed up or natural?" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Style & Vibe" value={f.influencerStyle} onChange={v => u("influencerStyle", v)} placeholder="How do they carry themselves?" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Personality & Character" value={f.influencerPersonality} onChange={v => u("influencerPersonality", v)} placeholder="Who are they as a person?" /></div><Input textarea label="Additional Notes / References" value={f.influencerNotes} onChange={v => u("influencerNotes", v)} placeholder="Celebrity references, mood descriptions, etc." /></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Tone of Voice</h3>{TONES.map(t => <div key={t.key} style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>{t.left}</span><span>{t.right}</span></div><input type="range" min={0} max={100} value={f[t.key]} onChange={e => u(t.key, Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div>)}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Target Audience</h3><Input textarea label="Describe Your Ideal Customer" value={f.audience} onChange={v => u("audience", v)} placeholder="Who are they? What do they care about?" /><div style={{ display: "flex", gap: 16, marginTop: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Age Range</label><select value={f.ageRange} onChange={e => u("ageRange", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{["18-24", "25-34", "35-44", "45-54", "55+"].map(a => <option key={a} value={a}>{a}</option>)}</select></div><Input half label="Competitors" value={f.competitors} onChange={v => u("competitors", v)} placeholder="e.g. Brand A, Brand B" /></div><div style={{ marginTop: 16 }}><Input textarea label="Avatar's Deepest Fears" value={f.deepestFears} onChange={v => u("deepestFears", v)} placeholder="What keeps your ideal customer up at night?" /></div><div style={{ marginTop: 16 }}><Input textarea label="Avatar's Deepest Desires" value={f.deepestDesires} onChange={v => u("deepestDesires", v)} placeholder="What transformation do they want?" /></div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Unique Features & Benefits</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>What makes your product better than the competition?</p><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>{(f.uniqueFeatures || []).map((feat, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgSoft, borderRadius: 10 }}><span style={{ color: C.text, fontSize: 14 }}>•</span><input value={feat} onChange={e => { const nf = [...f.uniqueFeatures]; nf[i] = e.target.value; u("uniqueFeatures", nf); }} style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none" }} placeholder="Enter a feature or benefit..." /><button onClick={() => u("uniqueFeatures", f.uniqueFeatures.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button></div>)}</div>{(f.uniqueFeatures || []).length < 8 && <button onClick={() => u("uniqueFeatures", [...(f.uniqueFeatures || []), ""])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.textSec, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><Plus size={14} /> Add feature</button>}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Customer Testimonials</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Paste your best customer quotes.</p><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>{(f.testimonials || []).map((test, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: C.bgSoft, borderRadius: 10 }}><span style={{ color: "#5856D6", fontSize: 18, lineHeight: 1, marginTop: 2 }}>"</span><textarea value={test} onChange={e => { const nt = [...f.testimonials]; nt[i] = e.target.value; u("testimonials", nt); }} style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none", resize: "none", minHeight: 40, lineHeight: 1.5 }} placeholder="Paste a review..." /><button onClick={() => u("testimonials", f.testimonials.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button></div>)}</div>{(f.testimonials || []).length < 10 && <button onClick={() => u("testimonials", [...(f.testimonials || []), ""])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.textSec, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><Plus size={14} /> Add testimonial</button>}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Product Images</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Upload up to 5 high-quality product photos. <span style={{ color: C.text, fontWeight: 600 }}>quality matters</span>.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{f.productImages.map((img, i) => <div key={i} style={{ width: 120, height: 120, borderRadius: 12, overflow: "hidden", position: "relative", border: `1px solid ${C.borderLight}` }}><img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button onClick={() => u("productImages", f.productImages.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, padding: 0 }}>✕</button></div>)}{f.productImages.length < 5 && <label style={{ width: 120, height: 120, borderRadius: 12, border: `2px dashed ${C.border}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: C.bgSoft }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent + "08", display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, fontSize: 18 }}>+</div><span style={{ fontSize: 12, color: C.textTer }}>{f.productImages.length === 0 ? "Add photos" : `${5 - f.productImages.length} left`}</span><input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { const files = Array.from(e.target.files || []); const toAdd = files.slice(0, 5 - f.productImages.length).map(file => ({ name: file.name, url: URL.createObjectURL(file), file })); u("productImages", [...f.productImages, ...toAdd]); e.target.value = ""; }} /></label>}</div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Audio & Voice</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Define the voice and sound of your brand.</p><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Avatar Voice Style (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{VOICE_STYLES.map(v => { const active = (f.voiceStyle || []).includes(v); return <button key={v} onClick={() => u("voiceStyle", active ? f.voiceStyle.filter(x => x !== v) : [...(f.voiceStyle || []), v].slice(0, 3))} style={chip(active)}>{v}</button>; })}</div></div><div style={{ display: "flex", gap: 16, marginBottom: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Voice Gender</label><select value={f.voiceGender || ""} onChange={e => u("voiceGender", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{VOICE_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Voice Age</label><select value={f.voiceAge || ""} onChange={e => u("voiceAge", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{VOICE_AGES.map(a => <option key={a} value={a}>{a}</option>)}</select></div></div><Input textarea label="Voice Notes" value={f.voiceNotes || ""} onChange={v => u("voiceNotes", v)} placeholder="Describe the vibe of the voice." /><div style={{ marginTop: 20, marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Music Mood (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MUSIC_MOODS.map(m => { const active = (f.musicMood || []).includes(m); return <button key={m} onClick={() => u("musicMood", active ? f.musicMood.filter(x => x !== m) : [...(f.musicMood || []), m].slice(0, 3))} style={chip(active, "#5856D6")}>{m}</button>; })}</div></div><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Music Genre (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MUSIC_GENRES.map(g => { const active = (f.musicGenres || []).includes(g); return <button key={g} onClick={() => u("musicGenres", active ? f.musicGenres.filter(x => x !== g) : [...(f.musicGenres || []), g].slice(0, 3))} style={chip(active, C.info)}>{g}</button>; })}</div></div><Input textarea label="Music Notes" value={f.musicNotes || ""} onChange={v => u("musicNotes", v)} placeholder="Describe the sound." /></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Video Pace & Timing</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>How should your video ads feel?</p><div style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>Slow & Cinematic</span><span>Fast & Energized</span></div><input type="range" min={0} max={100} value={f.videoPace || 50} onChange={e => u("videoPace", Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div><div style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>Calm & Atmospheric</span><span>High Energy & Dynamic</span></div><input type="range" min={0} max={100} value={f.videoEnergy || 50} onChange={e => u("videoEnergy", Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div><div style={{ display: "flex", gap: 16, marginBottom: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Transition Style</label><select value={f.videoTransitions || "Smooth"} onChange={e => u("videoTransitions", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{TRANSITION_STYLES.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Cut Speed</label><select value={f.videoCuts || "Medium"} onChange={e => u("videoCuts", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{CUT_SPEEDS.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><Input textarea label="Video Direction Notes" value={f.videoNotes || ""} onChange={v => u("videoNotes", v)} placeholder="Describe the overall feel." /></div>

      <div style={{ marginBottom: 48 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Campaign</h3><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Objective</label><select value={f.objective} onChange={e => u("objective", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}</select></div><Input textarea label="Key Message" value={f.keyMessage} onChange={v => u("keyMessage", v)} placeholder="What's the one thing you want your audience to remember?" /><div style={{ display: "flex", gap: 16, marginTop: 16 }}><Input half label="Brand Colors (hex codes)" value={f.colors} onChange={v => u("colors", v)} placeholder="e.g. #1A1A2E, #E94560" /><Input half label="Website" value={f.website} onChange={v => u("website", v)} placeholder="e.g. kokobali.com" /></div>{pc.length > 0 && <div style={{ display: "flex", gap: 12, marginTop: 12, padding: 14, background: C.bgSoft, borderRadius: 12 }}>{pc.map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: c, border: `1px solid ${C.borderLight}` }} /><span style={{ fontSize: 10, color: C.textTer, fontFamily: "monospace" }}>{c}</span></div>)}</div>}</div>

      <Btn primary onClick={() => onSubmit(f)} disabled={!ready} icon={<Sparkles size={16} />}>Generate Brand Guidelines</Btn>
      {!ready && <p style={{ color: C.textTer, fontSize: 13, marginTop: 8 }}>Fill in brand name, story, and pick at least 2 personality tags.</p>}
    </div>
  );
}

function Generating({ msgIndex }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div style={{ position: "relative", width: 100, height: 100, marginBottom: 40 }}>
        <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: C.accent + "08", animation: "pulse-ring 2s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={32} style={{ color: C.text }} /></div>
      </div>
      <h2 style={{ ...hd, fontSize: 28, color: C.text, marginBottom: 12 }}>Building Your Brand</h2>
      <p style={{ color: C.textSec, fontSize: 16, fontWeight: 500 }}>{LOADING_MSGS[msgIndex % LOADING_MSGS.length]}</p>
    </div>
  );
}

function Section({ sectionKey, data, status, onApprove, onRequestChanges, onSubmitFeedback, feedback, onFeedbackChange, isRegen, formData }) {
  const label = SECTION_LABELS[sectionKey];
  const approved = status === "approved";
  const reviewing = status === "feedback";
  const brandColors = parseColors(formData?.colors);

  const content = () => {
    if (!data) return <p style={{ color: C.textTer }}>Not generated yet.</p>;
    if (sectionKey === "brandSummary") { const text = typeof data === 'string' ? data : (data.brandSummary || JSON.stringify(data)); return (<div><p style={{ color: C.text, lineHeight: 1.8, fontSize: 15 }}>{text}</p>{formData?.productImages?.length > 0 && <div style={{ marginTop: 20 }}><h5 style={{ color: C.textSec, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>Product Assets</h5><div style={{ display: "flex", gap: 10 }}>{formData.productImages.map((img, i) => <div key={i} style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.borderLight}` }}><img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}</div></div>}{brandColors.length > 0 && <div style={{ marginTop: 20 }}><h5 style={{ color: C.textSec, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>Brand Palette</h5><div style={{ display: "flex", gap: 8 }}>{brandColors.map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 48, height: 48, borderRadius: 12, background: c, border: `1px solid ${C.borderLight}` }} /><span style={{ fontSize: 10, color: C.textTer, fontFamily: "monospace" }}>{c}</span></div>)}</div></div>}</div>); }
    if (sectionKey === "toneOfVoice") { const d = data.description ? data : (data.toneOfVoice || data); return (<div><p style={{ color: C.text, lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>{d.description || ''}</p><div style={{ display: "flex", gap: 24 }}><div style={{ flex: 1 }}><h5 style={{ color: C.success, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Do</h5>{(d.doList || []).map((x, i) => <p key={i} style={{ color: C.textSec, fontSize: 14, marginBottom: 4 }}>✓ {x}</p>)}</div><div style={{ flex: 1 }}><h5 style={{ color: C.danger, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Don't</h5>{(d.dontList || []).map((x, i) => <p key={i} style={{ color: C.textSec, fontSize: 14, marginBottom: 4 }}>✗ {x}</p>)}</div></div></div>); }
    if (sectionKey === "audiencePersona") { const d = data.name ? data : (data.audiencePersona || data); return (<div><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, fontWeight: 700, fontSize: 16 }}>{(d.name || "?")[0]}</div><div><p style={{ color: C.text, fontWeight: 600, fontSize: 16 }}>{d.name || ''}</p><p style={{ color: C.textTer, fontSize: 13 }}>{d.age || ''}</p></div></div><p style={{ color: C.text, lineHeight: 1.7, fontSize: 15, marginBottom: 12 }}>{d.description || ''}</p><div style={{ display: "flex", gap: 24, marginBottom: 16 }}><div style={{ flex: 1 }}><h5 style={{ color: C.danger, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Pain Points</h5>{(d.painPoints || []).map((p, i) => <p key={i} style={{ color: C.textSec, fontSize: 14, marginBottom: 4 }}>• {p}</p>)}</div><div style={{ flex: 1 }}><h5 style={{ color: C.success, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Aspirations</h5>{(d.aspirations || []).map((a, i) => <p key={i} style={{ color: C.textSec, fontSize: 14, marginBottom: 4 }}>• {a}</p>)}</div></div><div style={{ display: "flex", gap: 24 }}><div style={{ flex: 1, padding: 16, borderRadius: 12, background: C.bgSoft }}><h5 style={{ color: C.danger, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Deepest Fears</h5>{(d.deepestFears || []).map((f, i) => <p key={i} style={{ color: C.textSec, fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>• {f}</p>)}</div><div style={{ flex: 1, padding: 16, borderRadius: 12, background: C.bgSoft }}><h5 style={{ color: C.success, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Deepest Desires</h5>{(d.deepestDesires || []).map((x, i) => <p key={i} style={{ color: C.textSec, fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>• {x}</p>)}</div></div></div>); }
    if (sectionKey === "visualDirection") { const d = data.description ? data : (data.visualDirection || data); return (<div><p style={{ color: C.text, lineHeight: 1.7, fontSize: 15, marginBottom: 12 }}>{d.description || ''}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{(d.moodKeywords || []).map((k, i) => <span key={i} style={{ padding: "6px 14px", borderRadius: 980, background: C.bgSoft, color: C.textSec, fontSize: 13 }}>{k}</span>)}</div><p style={{ color: C.textSec, fontSize: 14 }}><strong style={{ color: C.text }}>Color Usage:</strong> {d.colorUsage || ''}</p>{brandColors.length > 0 && <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: C.bgSoft }}><div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", height: 40, marginBottom: 8 }}>{brandColors.map((c, i) => <div key={i} style={{ flex: i === 0 ? 3 : 1, background: c }} />)}</div><p style={{ fontSize: 12, color: C.textTer }}>Proportional palette preview</p></div>}</div>); }
    if (sectionKey === "copyDirection") { const d = data.taglineOptions ? data : (data.copyDirection || data); return (<div>{(d.taglineOptions || []).length > 0 && <div style={{ marginBottom: 16 }}><h5 style={{ color: C.textSec, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Tagline Options</h5>{(d.taglineOptions || []).map((t, i) => <p key={i} style={{ color: C.text, fontSize: 18, fontWeight: 400, fontFamily: "'Instrument Serif', serif", marginBottom: 6 }}>"{t}"</p>)}</div>}<div style={{ display: "flex", gap: 24 }}><div style={{ flex: 1 }}><h5 style={{ color: C.info, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Headlines</h5>{(d.headlines || []).map((x, i) => <p key={i} style={{ color: C.text, fontSize: 14, marginBottom: 6 }}>• {x}</p>)}</div><div style={{ flex: 1 }}><h5 style={{ color: "#5856D6", fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Hooks</h5>{(d.hooks || []).map((x, i) => <p key={i} style={{ color: C.text, fontSize: 14, marginBottom: 6 }}>• {x}</p>)}</div></div>{(d.ctaExamples || []).length > 0 && <div style={{ marginTop: 16 }}><h5 style={{ color: C.warning, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>CTA Examples</h5><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(d.ctaExamples || []).map((c, i) => <span key={i} style={{ padding: "8px 18px", borderRadius: 980, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 500 }}>{c}</span>)}</div></div>}</div>); }
    return null;
  };

  return (
    <div style={{ background: C.card, boxShadow: approved ? `0 0 0 2px ${C.success}30, ${C.cardShadow}` : C.cardShadow, borderRadius: 16, padding: 28, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>{label}{approved && <span style={{ background: C.success + "15", color: C.success, padding: "3px 12px", borderRadius: 980, fontSize: 12, fontWeight: 600 }}>APPROVED</span>}{isRegen && <Loader2 size={16} style={{ color: C.textSec, animation: "spin 1s linear infinite" }} />}</h3>
        {!approved && !isRegen && <div style={{ display: "flex", gap: 8 }}><Btn small onClick={onApprove} icon={<Check size={14} />}>Approve</Btn><Btn small onClick={onRequestChanges} icon={<MessageSquare size={14} />}>{reviewing ? "Cancel" : "Request Changes"}</Btn></div>}
        {approved && !isRegen && <Btn small onClick={onRequestChanges} icon={<RefreshCw size={14} />}>Revise</Btn>}
      </div>
      {content()}
      {reviewing && <div style={{ marginTop: 20, padding: 20, background: C.bgSoft, borderRadius: 12 }}><label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Your Feedback</label><textarea style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", minHeight: 80, resize: "vertical", outline: "none" }} value={feedback} onChange={e => onFeedbackChange(e.target.value)} placeholder="e.g. Make the tone more casual..." /><div style={{ marginTop: 10 }}><Btn small primary onClick={onSubmitFeedback} disabled={!feedback.trim()} icon={<RefreshCw size={14} />}>Regenerate</Btn></div></div>}
    </div>
  );
}

export default function BrandIntakePage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState("intake");
  const [formData, setFormData] = useState(null);
  const [guidelines, setGuidelines] = useState({});
  const [statuses, setStatuses] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [regen, setRegen] = useState({});
  const [error, setError] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (screen !== "generating") return; const iv = setInterval(() => setLoadingMsg(p => p + 1), 2500); return () => clearInterval(iv); }, [screen]);

  const allApproved = SECTIONS.every(s => statuses[s] === "approved");

  const handleSubmit = async (data) => {
    setFormData(data); setScreen("generating"); setError(null);
    const dbClient = await createClient_db(data.brandName);
    if (dbClient) {
      setCurrentClientId(dbClient.id);
      await saveBrandIntake(dbClient.id, data);
      await updateClient_db(dbClient.id, { status: 'onboarding', stage: 'Generating', progress: 25 });
      if (data.productImages?.length > 0) { const urls = []; for (const img of data.productImages) { if (img.file) { const url = await uploadProductImage(dbClient.id, img.file); if (url) urls.push(url); } } if (urls.length > 0 && supabase) { await supabase.from('brand_intake').update({ product_image_urls: urls }).eq('client_id', dbClient.id); } }
    }
    const r = await callClaude(`You are a senior brand strategist. Generate brand guidelines from this intake:\n${JSON.stringify(data, null, 2)}\nTone sliders 0-100: formality(0=Formal,100=Casual):${data.formality}, mood(0=Serious,100=Playful):${data.mood}, intensity(0=Subtle,100=Bold):${data.intensity}\n\nIMPORTANT: Use the avatar's deepest fears and desires to create emotionally resonant guidelines.\n\nReturn ONLY valid JSON: { "brandSummary": "2-3 paragraphs", "toneOfVoice": { "description": "...", "doList": ["5 items"], "dontList": ["5 items"] }, "audiencePersona": { "name": "...", "age": "...", "description": "...", "painPoints": ["4-5"], "aspirations": ["4-5"], "deepestFears": ["3-4 fears"], "deepestDesires": ["3-4 desires"] }, "visualDirection": { "description": "...", "moodKeywords": ["8-10"], "colorUsage": "..." }, "copyDirection": { "taglineOptions": ["3"], "headlines": ["5"], "hooks": ["5"], "ctaExamples": ["5"] } }`);
    if (r) {
      setGuidelines(r); const init = {}; SECTIONS.forEach(s => init[s] = "pending"); setStatuses(init); setScreen("review");
      if (currentClientId || dbClient?.id) { const cid = currentClientId || dbClient.id; await saveBrandHub(cid, r, init); await updateClient_db(cid, { status: 'reviewing', stage: 'Review Portal', progress: 50 }); }
    } else { setError("Generation failed. Please try again."); setScreen("intake"); }
  };

  const handleRegen = async (key) => {
    setRegen(p => ({ ...p, [key]: true }));
    const currentData = guidelines[key];
    const r = await callClaude(`Regenerate ONLY the "${SECTION_LABELS[key]}" section based on client feedback.\n\nBRAND INTAKE: ${JSON.stringify(formData, null, 2)}\n\nCURRENT ${SECTION_LABELS[key].toUpperCase()}: ${JSON.stringify(currentData, null, 2)}\n\nCLIENT FEEDBACK: "${feedbacks[key]}"\n\nCRITICAL: Return ONLY the value. do NOT wrap it in {"${key}": ...}. Match the EXACT same JSON structure as CURRENT shown above. If current is a string, return a string. If current is an object with keys like description/doList/dontList, return that same object shape.`);
    if (r) {
      const unwrapped = (r && typeof r === 'object' && r[key] !== undefined) ? r[key] : r;
      setGuidelines(p => ({ ...p, [key]: unwrapped }));
      setStatuses(p => ({ ...p, [key]: "pending" }));
      setFeedbacks(p => ({ ...p, [key]: "" }));
    } else {
      setStatuses(p => ({ ...p, [key]: "pending" }));
      setError("Regeneration failed. Please try again.");
    }
    setRegen(p => ({ ...p, [key]: false }));
  };

  if (!mounted) return null;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{fonts}{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.15; } 100% { transform: scale(0.8); opacity: 0.5; } } @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ borderBottom: `1px solid ${C.borderLight}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={16} style={{ color: "#fff" }} /></div>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>ALCHEMY <span style={{ fontWeight: 400, color: C.textSec }}>Productions</span></span>
        </div>
        {screen === "review" && <span style={{ fontSize: 13, color: C.textSec }}>{SECTIONS.filter(s => statuses[s] === "approved").length}/{SECTIONS.length} approved</span>}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", animation: "fadeIn 0.4s ease-out" }}>
        {error && <div style={{ background: "#FFF2F2", border: `1px solid ${C.danger}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.danger, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><X size={16} /> {error}</div>}
        {screen === "intake" && <IntakeForm onSubmit={handleSubmit} />}
        {screen === "generating" && <Generating msgIndex={loadingMsg} />}
        {screen === "review" && <div>
          <h1 style={{ ...hd, fontSize: 44, color: C.text, marginBottom: 8 }}>Review & Approve</h1>
          <p style={{ color: C.textSec, marginBottom: 36, fontSize: 16, lineHeight: 1.6 }}>Review each section. Approve what works, request changes on what doesn't.</p>
          {SECTIONS.map(sec => <Section key={sec} sectionKey={sec} data={guidelines[sec]} status={statuses[sec]} feedback={feedbacks[sec] || ""} onFeedbackChange={v => setFeedbacks(p => ({ ...p, [sec]: v }))} onApprove={() => setStatuses(p => ({ ...p, [sec]: "approved" }))} onRequestChanges={() => setStatuses(p => ({ ...p, [sec]: p[sec] === "feedback" ? "pending" : "feedback" }))} onSubmitFeedback={() => handleRegen(sec)} isRegen={regen[sec]} formData={formData} />)}
          {allApproved && <div style={{ textAlign: "center", marginTop: 36, padding: 36, background: C.bgSoft, borderRadius: 16 }}><h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: C.text }}>All Sections Approved</h3><p style={{ color: C.textSec, fontSize: 15, marginBottom: 20 }}>Lock your brand kit to begin ad production.</p><Btn primary onClick={async () => { setScreen("locked"); if (currentClientId) { await lockBrandHub(currentClientId); await updateClient_db(currentClientId, { status: 'reviewing', stage: 'Brand Kit Locked', progress: 65 }); } }} icon={<Lock size={16} />}>Lock Brand Kit</Btn></div>}
        </div>}
        {screen === "locked" && <div style={{ textAlign: "center", paddingTop: 80 }}><div style={{ width: 80, height: 80, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><Lock size={32} style={{ color: C.text }} /></div><h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 12 }}>Brand Kit Locked</h1><p style={{ color: C.textSec, fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>Your brand guidelines are finalized.</p><div style={{ display: "flex", gap: 12, justifyContent: "center" }}><Btn primary onClick={async () => { setScreen("submitted"); if (currentClientId) { await updateClient_db(currentClientId, { status: 'production', stage: 'In Production', progress: 80 }); } }} icon={<Send size={16} />}>Submit for Ad Production</Btn><Btn onClick={() => { setScreen("review"); setStatuses(p => { const n = {...p}; SECTIONS.forEach(s => n[s] = "approved"); return n; }); }}>Review Brand Kit</Btn></div></div>}
        {screen === "submitted" && <div style={{ textAlign: "center", paddingTop: 60 }}><div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 32px" }}><div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: C.success + "10", animation: "pulse-ring 3s ease-in-out infinite" }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={40} style={{ color: C.success }} /></div></div><h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 12 }}>We've Got Everything</h1><p style={{ color: C.text, fontSize: 18, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 16px", fontWeight: 500 }}>Our team has received your brand kit and will now begin producing your ads.</p><p style={{ color: C.textSec, fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>We'll craft your AI influencer, generate ad creative across all formats, and build your full campaign.</p><div style={{ maxWidth: 480, margin: "0 auto 36px", background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 28, textAlign: "left" }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>What happens next</h3><div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{[{ step: "1", title: "AI Influencer Creation", desc: "Custom digital avatar based on your specs", time: "24-48 hours" }, { step: "2", title: "Ad Creative Production", desc: "100+ ads across all formats", time: "3-5 days" }, { step: "3", title: "Internal QA Review", desc: "Quality and brand consistency check", time: "1-2 days" }, { step: "4", title: "Delivery", desc: "Complete ad library via Google Drive", time: "Same day" }].map(item => <div key={item.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{item.step}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><p style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>{item.title}</p><span style={{ color: C.textTer, fontSize: 12 }}>{item.time}</span></div><p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.4 }}>{item.desc}</p></div></div>)}</div></div><div style={{ maxWidth: 480, margin: "0 auto 36px", padding: 16, background: C.bgSoft, borderRadius: 12 }}><p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.5 }}>Questions? Reach out anytime. We're building something great for <span style={{ color: C.text, fontWeight: 600 }}>{formData?.brandName || "your brand"}</span>.</p></div></div>}
      </div>
    </div>
  );
}
