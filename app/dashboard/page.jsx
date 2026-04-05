"use client";
import { useState, useEffect } from "react";
import { Check, Sparkles, ArrowRight, RefreshCw, Lock, X, Loader2, ChevronRight, MessageSquare, Plus, Home, Copy, ChevronLeft, Edit3, Send, Download, Image } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase, createClient_db, getClients, updateClient_db, saveBrandIntake, saveBrandHub, lockBrandHub, addNote, getNotes, uploadProductImage, getBrandIntake, getBrandHub } from "../../lib/supabase";

const A = "#000";
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

// ─── Agency Dashboard ───
function Dashboard({ clients, onNew, onSelect }) {
  const sc = { onboarding: C.warning, reviewing: C.info, production: "#5856D6", delivered: C.success };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div><h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 4 }}>Dashboard</h1><p style={{ color: C.textSec, fontSize: 16 }}>Your agency command center</p></div>
        <Btn primary onClick={onNew} icon={<Plus size={16} />}>New Client</Btn>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
        {[{ l: "Total Clients", v: clients.length, c: C.text }, { l: "Active", v: clients.filter(c => c.status !== "delivered").length, c: C.info }, { l: "Delivered", v: clients.filter(c => c.status === "delivered").length, c: C.success }, { l: "This Month", v: clients.length, c: "#5856D6" }].map((s, i) => (
          <div key={i} style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ color: C.textSec, fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{s.l}</p>
            <p style={{ color: s.c, fontSize: 32, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "14px 24px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 11, color: C.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span style={{ flex: 2 }}>Client</span><span style={{ flex: 1.5 }}>Stage</span><span style={{ flex: 1 }}>Progress</span><span style={{ flex: 0.8 }}>Status</span><span style={{ flex: 0.5 }}>Date</span><span style={{ flex: 0.3 }}></span>
        </div>
        {clients.map((c, i) => (
          <div key={c.id} onClick={() => onSelect(c)} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: i < clients.length - 1 ? `1px solid ${C.borderLight}` : "none", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.bgSoft} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: (c.color || C.info) + "15", display: "flex", alignItems: "center", justifyContent: "center", color: c.color || C.info, fontSize: 14, fontWeight: 600 }}>{c.name[0]}</div>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{c.name}</span>
            </div>
            <span style={{ flex: 1.5, color: C.textSec, fontSize: 14 }}>{c.stage}</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bgSoft, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: sc[c.status] || C.info, width: `${c.progress}%` }} /></div>
              <span style={{ color: C.textTer, fontSize: 12, minWidth: 28 }}>{c.progress}%</span>
            </div>
            <div style={{ flex: 0.8 }}><span style={{ padding: "4px 12px", borderRadius: 980, fontSize: 12, fontWeight: 500, background: (sc[c.status] || C.info) + "12", color: sc[c.status] || C.info }}>{c.status}</span></div>
            <span style={{ flex: 0.5, color: C.textTer, fontSize: 13 }}>{c.date}</span>
            <div style={{ flex: 0.3, textAlign: "right" }}><ChevronRight size={16} style={{ color: C.textTer }} /></div>
          </div>
        ))}
        {clients.length === 0 && <div style={{ padding: 48, textAlign: "center", color: C.textSec }}><p style={{ marginBottom: 16, fontSize: 15 }}>No clients yet.</p><Btn small primary onClick={onNew} icon={<Plus size={14} />}>Add Your First Client</Btn></div>}
      </div>
    </div>
  );
}

// ─── PDF Export ───
function downloadClientPDF(client) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentW = pw - margin * 2;
  let y = 50;

  const checkPage = (needed = 40) => { if (y + needed > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 50; } };
  const heading = (text) => { checkPage(50); doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(29, 29, 31); doc.text(text, margin, y); y += 28; };
  const subheading = (text) => { checkPage(30); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(134, 134, 139); doc.text(text.toUpperCase(), margin, y); y += 18; };
  const body = (text, indent = 0) => { if (!text) return; checkPage(20); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 67); const lines = doc.splitTextToSize(String(text), contentW - indent); lines.forEach(line => { checkPage(14); doc.text(line, margin + indent, y); y += 14; }); y += 4; };
  const label = (l, v) => { if (!v) return; checkPage(18); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(134, 134, 139); doc.text(l + ":", margin, y); doc.setFont("helvetica", "normal"); doc.setTextColor(29, 29, 31); doc.text(String(v), margin + doc.getTextWidth(l + ":  "), y); y += 16; };
  const bullet = (text, indent = 12) => { if (!text) return; checkPage(16); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 67); doc.text("•", margin + indent, y); const lines = doc.splitTextToSize(String(text), contentW - indent - 16); lines.forEach((line, i) => { checkPage(14); doc.text(line, margin + indent + 16, y); y += 14; }); };
  const spacer = (s = 12) => { y += s; };

  // Title
  doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.setTextColor(29, 29, 31);
  doc.text(client.name, margin, y); y += 14;
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(134, 134, 139);
  doc.text("Brand Brief — Generated by ALCHEMY Studios", margin, y); y += 10;
  doc.setDrawColor(210, 210, 215); doc.line(margin, y, pw - margin, y); y += 24;

  const fd = client.formData;
  if (fd) {
    // Brand Identity
    heading("Brand Identity");
    label("Brand Name", fd.brandName);
    if (fd.tagline) label("Tagline", fd.tagline);
    if (fd.website) label("Website", fd.website);
    label("Objective", fd.objective);
    label("Target Age", fd.ageRange);
    if (fd.keyMessage) label("Key Message", fd.keyMessage);
    if (fd.competitors) label("Competitors", fd.competitors);
    if (fd.colors) label("Brand Colors", fd.colors);
    if (fd.personality?.length > 0) label("Personality", fd.personality.join(", "));
    spacer();

    // Brand Story
    if (fd.story) { heading("Brand Story"); body(fd.story); spacer(); }

    // Target Audience
    if (fd.audience || fd.deepestFears || fd.deepestDesires) {
      heading("Target Audience");
      if (fd.audience) body(fd.audience);
      if (fd.deepestFears) { spacer(6); subheading("Deepest Fears"); body(fd.deepestFears); }
      if (fd.deepestDesires) { spacer(6); subheading("Deepest Desires"); body(fd.deepestDesires); }
      spacer();
    }

    // AI Influencer
    if (fd.influencerAge || fd.influencerGender) {
      heading("AI Influencer");
      if (fd.influencerAge) label("Age", fd.influencerAge);
      if (fd.influencerGender) label("Gender", fd.influencerGender);
      if (fd.influencerEthnicity) label("Ethnicity", fd.influencerEthnicity);
      if (fd.influencerBodyType) label("Body Type", fd.influencerBodyType);
      if (fd.influencerHairColor) label("Hair Color", fd.influencerHairColor);
      if (fd.influencerHairStyle) label("Hair Style", fd.influencerHairStyle);
      if (fd.influencerBeautyLevel) { spacer(4); subheading("Beauty & Makeup"); body(fd.influencerBeautyLevel); }
      if (fd.influencerStyle) { spacer(4); subheading("Style & Vibe"); body(fd.influencerStyle); }
      if (fd.influencerPersonality) { spacer(4); subheading("Personality"); body(fd.influencerPersonality); }
      if (fd.influencerNotes) { spacer(4); subheading("Notes"); body(fd.influencerNotes); }
      spacer();
    }

    // Tone of Voice sliders
    heading("Tone of Voice");
    label("Formality", fd.formality <= 33 ? "Formal" : fd.formality >= 66 ? "Casual" : "Balanced");
    label("Mood", fd.mood <= 33 ? "Serious" : fd.mood >= 66 ? "Playful" : "Balanced");
    label("Intensity", fd.intensity <= 33 ? "Subtle" : fd.intensity >= 66 ? "Bold" : "Balanced");
    spacer();

    // Audio & Voice
    if (fd.voiceStyle?.length > 0 || fd.musicMood?.length > 0) {
      heading("Audio & Voice");
      if (fd.voiceStyle?.length > 0) label("Voice Style", fd.voiceStyle.join(", "));
      if (fd.voiceGender) label("Voice Gender", fd.voiceGender);
      if (fd.voiceAge) label("Voice Age", fd.voiceAge);
      if (fd.voiceNotes) body(fd.voiceNotes);
      if (fd.musicMood?.length > 0) { spacer(4); label("Music Mood", fd.musicMood.join(", ")); }
      if (fd.musicGenres?.length > 0) label("Music Genre", fd.musicGenres.join(", "));
      if (fd.musicNotes) body(fd.musicNotes);
      spacer();
    }

    // Video Direction
    if (fd.videoTransitions || fd.videoNotes) {
      heading("Video Direction");
      label("Transitions", fd.videoTransitions);
      label("Cut Speed", fd.videoCuts);
      label("Pace", fd.videoPace <= 33 ? "Slow & Cinematic" : fd.videoPace >= 66 ? "Fast & Energized" : "Balanced");
      label("Energy", fd.videoEnergy <= 33 ? "Calm & Atmospheric" : fd.videoEnergy >= 66 ? "High Energy" : "Balanced");
      if (fd.videoNotes) body(fd.videoNotes);
      spacer();
    }

    // Unique Features
    if (fd.uniqueFeatures?.filter(Boolean).length > 0) {
      heading("Unique Features & Benefits");
      fd.uniqueFeatures.filter(Boolean).forEach(f => bullet(f));
      spacer();
    }

    // Testimonials
    if (fd.testimonials?.filter(Boolean).length > 0) {
      heading("Customer Testimonials");
      fd.testimonials.filter(Boolean).forEach(t => { bullet('"' + t + '"'); spacer(2); });
      spacer();
    }
  }

  // Generated Guidelines
  const gl = client.guidelines;
  if (gl) {
    doc.addPage(); y = 50;
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(29, 29, 31);
    doc.text("Generated Brand Guidelines", margin, y); y += 12;
    doc.setDrawColor(210, 210, 215); doc.line(margin, y, pw - margin, y); y += 24;

    if (typeof gl.brandSummary === "string") { heading("Brand Summary"); body(gl.brandSummary); spacer(); }

    if (gl.toneOfVoice) {
      heading("Tone of Voice");
      if (gl.toneOfVoice.description) body(gl.toneOfVoice.description);
      if (gl.toneOfVoice.doList?.length > 0) { spacer(6); subheading("Do"); gl.toneOfVoice.doList.forEach(d => bullet(d)); }
      if (gl.toneOfVoice.dontList?.length > 0) { spacer(6); subheading("Don't"); gl.toneOfVoice.dontList.forEach(d => bullet(d)); }
      spacer();
    }

    if (gl.audiencePersona) {
      heading("Audience Persona");
      const ap = gl.audiencePersona;
      if (ap.name) label("Name", ap.name);
      if (ap.age) label("Age", ap.age);
      if (ap.description) body(ap.description);
      if (ap.painPoints?.length > 0) { spacer(6); subheading("Pain Points"); ap.painPoints.forEach(p => bullet(p)); }
      if (ap.aspirations?.length > 0) { spacer(6); subheading("Aspirations"); ap.aspirations.forEach(a => bullet(a)); }
      if (ap.deepestFears?.length > 0) { spacer(6); subheading("Deepest Fears"); ap.deepestFears.forEach(f => bullet(f)); }
      if (ap.deepestDesires?.length > 0) { spacer(6); subheading("Deepest Desires"); ap.deepestDesires.forEach(d => bullet(d)); }
      spacer();
    }

    if (gl.visualDirection) {
      heading("Visual Direction");
      if (gl.visualDirection.description) body(gl.visualDirection.description);
      if (gl.visualDirection.moodKeywords?.length > 0) label("Mood Keywords", gl.visualDirection.moodKeywords.join(", "));
      if (gl.visualDirection.colorUsage) { spacer(4); subheading("Color Usage"); body(gl.visualDirection.colorUsage); }
      spacer();
    }

    if (gl.copyDirection) {
      heading("Copy Direction");
      if (gl.copyDirection.taglineOptions?.length > 0) { subheading("Tagline Options"); gl.copyDirection.taglineOptions.forEach(t => bullet('"' + t + '"')); spacer(6); }
      if (gl.copyDirection.headlines?.length > 0) { subheading("Headlines"); gl.copyDirection.headlines.forEach(h => bullet(h)); spacer(6); }
      if (gl.copyDirection.hooks?.length > 0) { subheading("Hooks"); gl.copyDirection.hooks.forEach(h => bullet(h)); spacer(6); }
      if (gl.copyDirection.ctaExamples?.length > 0) { subheading("CTA Examples"); gl.copyDirection.ctaExamples.forEach(c => bullet(c)); }
    }
  }

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(174, 174, 178);
    doc.text(`${client.name} — Brand Brief | Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 30);
    doc.text("ALCHEMY Studios", pw - margin - doc.getTextWidth("ALCHEMY Studios"), doc.internal.pageSize.getHeight() - 30);
  }

  doc.save(`${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_Brand_Brief.pdf`);
}

// ─── Client Detail View ───
const ALL_STAGES = ["Intake Form", "Review Portal", "Brand Kit Locked", "Ad Production", "Delivered"];
const STAGE_STATUS = { "Intake Form": "onboarding", "Review Portal": "reviewing", "Brand Kit Locked": "reviewing", "Ad Production": "production", "Delivered": "delivered" };
const STAGE_PROGRESS = { "Intake Form": 15, "Review Portal": 40, "Brand Kit Locked": 65, "Ad Production": 80, "Delivered": 100 };

function ClientDetail({ client, onBack, onUpdate }) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(client.notes || []);
  const [stageOpen, setStageOpen] = useState(false);
  const sc = { onboarding: C.warning, reviewing: C.info, production: "#5856D6", delivered: C.success };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    const newNote = { text: note, date: new Date().toLocaleString(), id: Date.now() };
    setNotes(prev => [newNote, ...prev]);
    setNote("");
    await addNote(client.id, note);
  };

  const changeStage = (stage) => {
    onUpdate({ ...client, stage, status: STAGE_STATUS[stage] || "onboarding", progress: STAGE_PROGRESS[stage] || 15 });
    setStageOpen(false);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textSec, cursor: "pointer", fontSize: 14, fontFamily: "'Inter', sans-serif", marginBottom: 28 }}><ChevronLeft size={16} /> Back to Dashboard</button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: (client.color || C.info) + "12", display: "flex", alignItems: "center", justifyContent: "center", color: client.color || C.info, fontSize: 22, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{client.name[0]}</div>
          <div>
            <h1 style={{ ...hd, fontSize: 32, color: C.text, marginBottom: 4 }}>{client.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "4px 12px", borderRadius: 980, fontSize: 12, fontWeight: 500, background: (sc[client.status] || C.info) + "12", color: sc[client.status] || C.info }}>{client.status}</span>
              <span style={{ color: C.textTer, fontSize: 13 }}>Added {client.date}</span>
            </div>
          </div>
        </div>
        {client.formData && <Btn small onClick={() => downloadClientPDF(client)} icon={<Download size={14} />}>Download Brief</Btn>}
      </div>
      <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Pipeline Stage</h3>
          <div style={{ position: "relative" }}>
            <Btn small onClick={() => setStageOpen(!stageOpen)} icon={<Edit3 size={12} />}>Change Stage</Btn>
            {stageOpen && <div style={{ position: "absolute", top: "110%", right: 0, background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 4, zIndex: 10, minWidth: 180, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>{ALL_STAGES.map(s => <button key={s} onClick={() => changeStage(s)} style={{ display: "block", width: "100%", padding: "10px 14px", background: client.stage === s ? C.bgSoft : "transparent", border: "none", color: client.stage === s ? C.accent : C.textSec, fontSize: 14, cursor: "pointer", textAlign: "left", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontWeight: client.stage === s ? 600 : 400 }} onMouseEnter={e => { if (client.stage !== s) e.currentTarget.style.background = C.bgSoft; }} onMouseLeave={e => { if (client.stage !== s) e.currentTarget.style.background = "transparent"; }}>{s}{client.stage === s && " ✓"}</button>)}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>{ALL_STAGES.map((s, i) => { const stageIdx = ALL_STAGES.indexOf(client.stage); return <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= stageIdx ? (sc[client.status] || C.info) : C.bgSoft, transition: "background 0.3s" }} />; })}</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>{ALL_STAGES.map((s, i) => { const stageIdx = ALL_STAGES.indexOf(client.stage); return <span key={s} style={{ fontSize: 11, color: i <= stageIdx ? C.textSec : C.textTer, fontWeight: i === stageIdx ? 600 : 400, textAlign: "center", flex: 1 }}>{s}</span>; })}</div>
      </div>
      {client.formData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}>
              <h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>Brand Identity</h4>
              <div style={{ fontSize: 14, lineHeight: 2 }}>
                <p><span style={{ color: C.textTer }}>Brand:</span> <span style={{ color: C.text, fontWeight: 600 }}>{client.formData.brandName}</span></p>
                {client.formData.tagline && <p><span style={{ color: C.textTer }}>Tagline:</span> <span style={{ color: C.text }}>{client.formData.tagline}</span></p>}
                {client.formData.website && <p><span style={{ color: C.textTer }}>Website:</span> <span style={{ color: C.text }}>{client.formData.website}</span></p>}
                <p><span style={{ color: C.textTer }}>Objective:</span> <span style={{ color: C.text }}>{client.formData.objective}</span></p>
                <p><span style={{ color: C.textTer }}>Target:</span> <span style={{ color: C.text }}>{client.formData.ageRange}</span></p>
                {client.formData.keyMessage && <p><span style={{ color: C.textTer }}>Key Message:</span> <span style={{ color: C.text }}>{client.formData.keyMessage}</span></p>}
                {client.formData.competitors && <p><span style={{ color: C.textTer }}>Competitors:</span> <span style={{ color: C.text }}>{client.formData.competitors}</span></p>}
                {client.formData.personality?.length > 0 && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>{client.formData.personality.map((t, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 980, background: C.bgSoft, color: C.text, fontSize: 12, fontWeight: 500 }}>{t}</span>)}</div>}
              </div>
            </div>
            <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}>
              <h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>Assets & Colors</h4>
              {client.formData.productImages?.length > 0 ? <div style={{ marginBottom: 12 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>{client.formData.productImages.map((img, i) => <div key={i} style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.borderLight}`, position: "relative", cursor: "pointer" }} onClick={() => { const a = document.createElement("a"); a.href = `/api/download-image?url=${encodeURIComponent(img.url)}&name=${encodeURIComponent(img.name || `product_${i + 1}.jpg`)}`; a.download = img.name || `product_${i + 1}.jpg`; a.click(); }}><img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}><Download size={16} style={{ color: "#fff" }} /></div></div>)}</div><button onClick={() => { client.formData.productImages.forEach((img, i) => { const a = document.createElement("a"); a.href = `/api/download-image?url=${encodeURIComponent(img.url)}&name=${encodeURIComponent(img.name || `product_${i + 1}.jpg`)}`; a.download = img.name || `product_${i + 1}.jpg`; a.click(); }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "transparent", border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}><Image size={12} /> Download All Images</button></div> : <p style={{ color: C.textTer, fontSize: 14, marginBottom: 12 }}>No product images uploaded</p>}
              {client.formData.colors && <div><p style={{ color: C.textTer, fontSize: 13, marginBottom: 6 }}>Brand Colors</p><div style={{ display: "flex", gap: 6 }}>{parseColors(client.formData.colors).map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: c, border: `1px solid ${C.borderLight}` }} /><span style={{ fontSize: 9, color: C.textTer, fontFamily: "monospace" }}>{c}</span></div>)}</div></div>}
            </div>
          </div>
          {client.formData.story && <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Brand Story</h4><p style={{ color: C.text, fontSize: 14, lineHeight: 1.8 }}>{client.formData.story}</p></div>}
          <div style={{ display: "flex", gap: 16 }}>
            {(client.formData.audience || client.formData.deepestFears || client.formData.deepestDesires) && <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Target Audience</h4>{client.formData.audience && <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>{client.formData.audience}</p>}{client.formData.deepestFears && <div style={{ marginBottom: 12 }}><h5 style={{ color: C.danger, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Deepest Fears</h5><p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6 }}>{client.formData.deepestFears}</p></div>}{client.formData.deepestDesires && <div><h5 style={{ color: C.success, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Deepest Desires</h5><p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6 }}>{client.formData.deepestDesires}</p></div>}</div>}
            {(client.formData.influencerAge || client.formData.influencerGender) && <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>AI Influencer</h4><div style={{ fontSize: 14, lineHeight: 2 }}>{client.formData.influencerAge && <p><span style={{ color: C.textTer }}>Age:</span> <span style={{ color: C.text }}>{client.formData.influencerAge}</span></p>}{client.formData.influencerGender && <p><span style={{ color: C.textTer }}>Gender:</span> <span style={{ color: C.text }}>{client.formData.influencerGender}</span></p>}{client.formData.influencerEthnicity && <p><span style={{ color: C.textTer }}>Ethnicity:</span> <span style={{ color: C.text }}>{client.formData.influencerEthnicity}</span></p>}{client.formData.influencerBodyType && <p><span style={{ color: C.textTer }}>Body Type:</span> <span style={{ color: C.text }}>{client.formData.influencerBodyType}</span></p>}{client.formData.influencerHairColor && <p><span style={{ color: C.textTer }}>Hair:</span> <span style={{ color: C.text }}>{client.formData.influencerHairColor}</span></p>}{client.formData.influencerBeautyLevel && <p><span style={{ color: C.textTer }}>Beauty:</span> <span style={{ color: C.text }}>{client.formData.influencerBeautyLevel}</span></p>}</div>{client.formData.influencerStyle && <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>{client.formData.influencerStyle}</p>}{client.formData.influencerPersonality && <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{client.formData.influencerPersonality}</p>}{client.formData.influencerNotes && <p style={{ color: C.textTer, fontSize: 12, lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>{client.formData.influencerNotes}</p>}</div>}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {client.formData.uniqueFeatures?.filter(Boolean).length > 0 && <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Unique Features</h4>{client.formData.uniqueFeatures.filter(Boolean).map((f, i) => <p key={i} style={{ color: C.text, fontSize: 14, marginBottom: 6, lineHeight: 1.6 }}>• {f}</p>)}</div>}
            {client.formData.testimonials?.filter(Boolean).length > 0 && <div style={{ flex: 1, background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: "#5856D6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Testimonials</h4>{client.formData.testimonials.filter(Boolean).map((t, i) => <p key={i} style={{ color: C.textSec, fontSize: 13, marginBottom: 10, lineHeight: 1.6, fontStyle: "italic", borderLeft: "2px solid #5856D620", paddingLeft: 12 }}>"{t}"</p>)}</div>}
          </div>
          {client.guidelines && <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 24 }}><h4 style={{ fontSize: 13, color: C.text, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>Generated Brand Guidelines</h4>{typeof client.guidelines.brandSummary === 'string' && <div style={{ marginBottom: 16 }}><h5 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Brand Summary</h5><p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7 }}>{client.guidelines.brandSummary}</p></div>}{client.guidelines.toneOfVoice?.description && <div style={{ marginBottom: 16 }}><h5 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Tone of Voice</h5><p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7 }}>{client.guidelines.toneOfVoice.description}</p></div>}{client.guidelines.copyDirection?.taglineOptions && <div style={{ marginBottom: 16 }}><h5 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Tagline Options</h5>{client.guidelines.copyDirection.taglineOptions.map((t, i) => <p key={i} style={{ color: C.text, fontSize: 16, fontWeight: 500, fontFamily: "'Instrument Serif', serif", marginBottom: 4 }}>"{t}"</p>)}</div>}</div>}
        </div>
      ) : <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 48, textAlign: "center", marginBottom: 20 }}><p style={{ color: C.textTer, fontSize: 15 }}>No intake data yet.</p></div>}
      <div style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>Internal Notes</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add an internal note..." onKeyDown={e => { if (e.key === "Enter") handleAddNote(); }} style={{ flex: 1, background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none" }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.borderLight} />
          <Btn small primary onClick={handleAddNote} disabled={!note.trim()} icon={<Send size={12} />}>Add</Btn>
        </div>
        {notes.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{notes.map(n => <div key={n.id} style={{ padding: "14px 16px", background: C.bgSoft, borderRadius: 10 }}><p style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{n.text}</p><p style={{ color: C.textTer, fontSize: 12, marginTop: 6 }}>{n.date}</p></div>)}</div> : <p style={{ color: C.textTer, fontSize: 14, textAlign: "center", padding: 20 }}>No notes yet.</p>}
      </div>
    </div>
  );
}

// ─── Intake Form ───
function IntakeForm({ onSubmit }) {
  const [f, setF] = useState({ brandName: "", tagline: "", story: "", personality: [], formality: 50, mood: 50, intensity: 50, audience: "", ageRange: "25-34", competitors: "", deepestFears: "", deepestDesires: "", objective: OBJECTIVES[0], keyMessage: "", colors: "", website: "", productImages: [], voiceStyle: [], voiceGender: "Female", voiceAge: "20s-30s", voiceNotes: "", musicMood: [], musicGenres: [], musicNotes: "", videoPace: 50, videoEnergy: 50, videoTransitions: "Smooth", videoCuts: "Medium", videoNotes: "", uniqueFeatures: [""], testimonials: [""], influencerAge: "", influencerEthnicity: "", influencerGender: "", influencerHairColor: "", influencerHairStyle: "", influencerBodyType: "", influencerBeautyLevel: "", influencerStyle: "", influencerPersonality: "", influencerNotes: "" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = t => u("personality", f.personality.includes(t) ? f.personality.filter(x => x !== t) : [...f.personality, t]);
  const ready = f.brandName && f.story && f.personality.length >= 2;
  const pc = parseColors(f.colors);
  const chip = (active, color = C.accent) => ({ padding: "8px 18px", borderRadius: 980, border: `1px solid ${active ? color : C.borderLight}`, background: active ? color + "08" : "transparent", color: active ? color : C.textSec, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ ...hd, fontSize: 44, color: C.text, marginBottom: 8 }}>Brand Intake</h1>
      <p style={{ color: C.textSec, marginBottom: 48, fontSize: 16, lineHeight: 1.6 }}>Tell us about your brand. The more detail you provide, the sharper your generated guidelines will be.</p>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Brand Identity</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}><Input half label="Brand Name" value={f.brandName} onChange={v => u("brandName", v)} placeholder="e.g. Koko Swimwear" /><Input half label="Tagline" value={f.tagline} onChange={v => u("tagline", v)} placeholder="e.g. Made for the water" /></div><div style={{ marginTop: 16 }}><Input textarea label="Brand Story" value={f.story} onChange={v => u("story", v)} placeholder="Tell us your brand's origin, mission, and what makes it unique..." /></div><div style={{ marginTop: 20 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Brand Personality (pick 2-5)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TAGS.map(t => <button key={t} onClick={() => toggle(t)} style={chip(f.personality.includes(t))}>{t}</button>)}</div></div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Your AI Influencer</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Describe your perfect digital brand ambassador.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Age" value={f.influencerAge} onChange={v => u("influencerAge", v)} placeholder="e.g. Mid 20s" /><Input half label="Gender" value={f.influencerGender} onChange={v => u("influencerGender", v)} placeholder="e.g. Female" /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Ethnicity / Look" value={f.influencerEthnicity} onChange={v => u("influencerEthnicity", v)} placeholder="e.g. Mixed, Southeast Asian" /><Input half label="Body Type" value={f.influencerBodyType} onChange={v => u("influencerBodyType", v)} placeholder="e.g. Athletic, Slim" /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input half label="Hair Color" value={f.influencerHairColor} onChange={v => u("influencerHairColor", v)} placeholder="e.g. Dark brown" /><Input half label="Hair Style" value={f.influencerHairStyle} onChange={v => u("influencerHairStyle", v)} placeholder="e.g. Long beach waves" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Beauty Level & Makeup" value={f.influencerBeautyLevel} onChange={v => u("influencerBeautyLevel", v)} placeholder="Glammed up or natural?" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Style & Vibe" value={f.influencerStyle} onChange={v => u("influencerStyle", v)} placeholder="How do they carry themselves?" /></div><div style={{ marginBottom: 16 }}><Input textarea label="Personality & Character" value={f.influencerPersonality} onChange={v => u("influencerPersonality", v)} placeholder="Who are they as a person?" /></div><Input textarea label="Additional Notes / References" value={f.influencerNotes} onChange={v => u("influencerNotes", v)} placeholder="Celebrity references, mood descriptions, etc." /></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Tone of Voice</h3>{TONES.map(t => <div key={t.key} style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>{t.left}</span><span>{t.right}</span></div><input type="range" min={0} max={100} value={f[t.key]} onChange={e => u(t.key, Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div>)}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Target Audience</h3><Input textarea label="Describe Your Ideal Customer" value={f.audience} onChange={v => u("audience", v)} placeholder="Who are they? What do they care about?" /><div style={{ display: "flex", gap: 16, marginTop: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Age Range</label><select value={f.ageRange} onChange={e => u("ageRange", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{["18-24", "25-34", "35-44", "45-54", "55+"].map(a => <option key={a} value={a}>{a}</option>)}</select></div><Input half label="Competitors" value={f.competitors} onChange={v => u("competitors", v)} placeholder="e.g. Brand A, Brand B" /></div><div style={{ marginTop: 16 }}><Input textarea label="Avatar's Deepest Fears" value={f.deepestFears} onChange={v => u("deepestFears", v)} placeholder="What keeps your ideal customer up at night?" /></div><div style={{ marginTop: 16 }}><Input textarea label="Avatar's Deepest Desires" value={f.deepestDesires} onChange={v => u("deepestDesires", v)} placeholder="What transformation do they want?" /></div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Unique Features & Benefits</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>What makes your product better than the competition?</p><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>{(f.uniqueFeatures || []).map((feat, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgSoft, borderRadius: 10 }}><span style={{ color: C.text, fontSize: 14 }}>•</span><input value={feat} onChange={e => { const nf = [...f.uniqueFeatures]; nf[i] = e.target.value; u("uniqueFeatures", nf); }} style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none" }} placeholder="Enter a feature or benefit..." /><button onClick={() => u("uniqueFeatures", f.uniqueFeatures.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button></div>)}</div>{(f.uniqueFeatures || []).length < 8 && <button onClick={() => u("uniqueFeatures", [...(f.uniqueFeatures || []), ""])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.textSec, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><Plus size={14} /> Add feature</button>}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Customer Testimonials</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Paste your best customer quotes.</p><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>{(f.testimonials || []).map((test, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: C.bgSoft, borderRadius: 10 }}><span style={{ color: "#5856D6", fontSize: 18, lineHeight: 1, marginTop: 2 }}>"</span><textarea value={test} onChange={e => { const nt = [...f.testimonials]; nt[i] = e.target.value; u("testimonials", nt); }} style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none", resize: "none", minHeight: 40, lineHeight: 1.5 }} placeholder="Paste a review..." /><button onClick={() => u("testimonials", f.testimonials.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button></div>)}</div>{(f.testimonials || []).length < 10 && <button onClick={() => u("testimonials", [...(f.testimonials || []), ""])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.textSec, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><Plus size={14} /> Add testimonial</button>}</div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Product Images</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Upload up to 5 high-quality product photos — <span style={{ color: C.text, fontWeight: 600 }}>quality matters</span>.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{f.productImages.map((img, i) => <div key={i} style={{ width: 120, height: 120, borderRadius: 12, overflow: "hidden", position: "relative", border: `1px solid ${C.borderLight}` }}><img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button onClick={() => u("productImages", f.productImages.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, padding: 0 }}>✕</button></div>)}{f.productImages.length < 5 && <label style={{ width: 120, height: 120, borderRadius: 12, border: `2px dashed ${C.border}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: C.bgSoft }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent + "08", display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, fontSize: 18 }}>+</div><span style={{ fontSize: 12, color: C.textTer }}>{f.productImages.length === 0 ? "Add photos" : `${5 - f.productImages.length} left`}</span><input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { const files = Array.from(e.target.files || []); const toAdd = files.slice(0, 5 - f.productImages.length).map(file => ({ name: file.name, url: URL.createObjectURL(file), file })); u("productImages", [...f.productImages, ...toAdd]); e.target.value = ""; }} /></label>}</div></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Audio & Voice</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Define the voice and sound of your brand.</p><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Avatar Voice Style (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{VOICE_STYLES.map(v => { const active = (f.voiceStyle || []).includes(v); return <button key={v} onClick={() => u("voiceStyle", active ? f.voiceStyle.filter(x => x !== v) : [...(f.voiceStyle || []), v].slice(0, 3))} style={chip(active)}>{v}</button>; })}</div></div><div style={{ display: "flex", gap: 16, marginBottom: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Voice Gender</label><select value={f.voiceGender || ""} onChange={e => u("voiceGender", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{VOICE_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Voice Age</label><select value={f.voiceAge || ""} onChange={e => u("voiceAge", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{VOICE_AGES.map(a => <option key={a} value={a}>{a}</option>)}</select></div></div><Input textarea label="Voice Notes" value={f.voiceNotes || ""} onChange={v => u("voiceNotes", v)} placeholder="Describe the vibe of the voice." /><div style={{ marginTop: 20, marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Music Mood (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MUSIC_MOODS.map(m => { const active = (f.musicMood || []).includes(m); return <button key={m} onClick={() => u("musicMood", active ? f.musicMood.filter(x => x !== m) : [...(f.musicMood || []), m].slice(0, 3))} style={chip(active, "#5856D6")}>{m}</button>; })}</div></div><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 10 }}>Music Genre (pick 1-3)</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MUSIC_GENRES.map(g => { const active = (f.musicGenres || []).includes(g); return <button key={g} onClick={() => u("musicGenres", active ? f.musicGenres.filter(x => x !== g) : [...(f.musicGenres || []), g].slice(0, 3))} style={chip(active, C.info)}>{g}</button>; })}</div></div><Input textarea label="Music Notes" value={f.musicNotes || ""} onChange={v => u("musicNotes", v)} placeholder="Describe the sound." /></div>

      <div style={{ marginBottom: 40 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Video Pace & Timing</h3><p style={{ color: C.textTer, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>How should your video ads feel?</p><div style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>Slow & Cinematic</span><span>Fast & Energized</span></div><input type="range" min={0} max={100} value={f.videoPace || 50} onChange={e => u("videoPace", Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div><div style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSec, marginBottom: 8 }}><span>Calm & Atmospheric</span><span>High Energy & Dynamic</span></div><input type="range" min={0} max={100} value={f.videoEnergy || 50} onChange={e => u("videoEnergy", Number(e.target.value))} style={{ width: "100%", accentColor: C.accent, height: 4, cursor: "pointer" }} /></div><div style={{ display: "flex", gap: 16, marginBottom: 16 }}><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Transition Style</label><select value={f.videoTransitions || "Smooth"} onChange={e => u("videoTransitions", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{TRANSITION_STYLES.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div style={{ flex: "1 1 48%" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Cut Speed</label><select value={f.videoCuts || "Medium"} onChange={e => u("videoCuts", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{CUT_SPEEDS.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><Input textarea label="Video Direction Notes" value={f.videoNotes || ""} onChange={v => u("videoNotes", v)} placeholder="Describe the overall feel." /></div>

      <div style={{ marginBottom: 48 }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Campaign</h3><div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Objective</label><select value={f.objective} onChange={e => u("objective", e.target.value)} style={{ width: "100%", background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>{OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}</select></div><Input textarea label="Key Message" value={f.keyMessage} onChange={v => u("keyMessage", v)} placeholder="What's the one thing you want your audience to remember?" /><div style={{ display: "flex", gap: 16, marginTop: 16 }}><Input half label="Brand Colors (hex codes)" value={f.colors} onChange={v => u("colors", v)} placeholder="e.g. #1A1A2E, #E94560" /><Input half label="Website" value={f.website} onChange={v => u("website", v)} placeholder="e.g. kokobali.com" /></div>{pc.length > 0 && <div style={{ display: "flex", gap: 12, marginTop: 12, padding: 14, background: C.bgSoft, borderRadius: 12 }}>{pc.map((c, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: c, border: `1px solid ${C.borderLight}` }} /><span style={{ fontSize: 10, color: C.textTer, fontFamily: "monospace" }}>{c}</span></div>)}</div>}</div>

      <Btn primary onClick={() => onSubmit(f)} disabled={!ready} icon={<Sparkles size={16} />}>Generate Brand Guidelines</Btn>
      {!ready && <p style={{ color: C.textTer, fontSize: 13, marginTop: 8 }}>Fill in brand name, story, and pick at least 2 personality tags.</p>}
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

// ─── Main ───
export default function AlchemyOS() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState("client");
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  // Hydration-safe mount
  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== "undefined" && sessionStorage.getItem("alchemy_auth");
    if (saved === "true") { setAuthenticated(true); setIsAdmin(true); setView("dashboard"); }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    async function load() {
      const dbClients = await getClients();
      if (dbClients && dbClients.length > 0) {
        setClients(dbClients.map(c => ({ id: c.id, name: c.name, status: c.status, stage: c.stage, progress: c.progress, date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: c.color || '#007AFF' })));
      }
    }
    load();
  }, [mounted]);

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
    const r = await callClaude(`Regenerate ONLY the "${SECTION_LABELS[key]}" section based on client feedback.

BRAND INTAKE: ${JSON.stringify(formData, null, 2)}

CURRENT ${SECTION_LABELS[key].toUpperCase()}: ${JSON.stringify(currentData, null, 2)}

CLIENT FEEDBACK: "${feedbacks[key]}"

CRITICAL: Return ONLY the value — do NOT wrap it in {"${key}": ...}. Match the EXACT same JSON structure as CURRENT shown above. If current is a string, return a string. If current is an object with keys like description/doList/dontList, return that same object shape.`);
    if (r) {
      const unwrapped = (r && typeof r === 'object' && r[key] !== undefined) ? r[key] : r;
      setGuidelines(p => ({ ...p, [key]: unwrapped }));
      setStatuses(p => ({ ...p, [key]: "pending" }));
      setFeedbacks(p => ({ ...p, [key]: "" }));
    }
    setRegen(p => ({ ...p, [key]: false }));
  };

  const goHome = async () => {
    const dbClients = await getClients();
    if (dbClients && dbClients.length > 0) { setClients(dbClients.map(c => ({ id: c.id, name: c.name, status: c.status, stage: c.stage, progress: c.progress, date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: c.color || '#007AFF' }))); }
    setView("dashboard"); setSelectedClient(null); setCurrentClientId(null);
  };

  const updateClient = async (updated) => { setClients(p => p.map(c => c.id === updated.id ? updated : c)); setSelectedClient(updated); await updateClient_db(updated.id, { status: updated.status, stage: updated.stage, progress: updated.progress }); };

  const selectClient = async (c) => {
    const intake = await getBrandIntake(c.id);
    const hub = await getBrandHub(c.id);
    const clientNotes = await getNotes(c.id);
    setSelectedClient({ ...c, formData: intake || null, guidelines: hub?.guidelines || null, notes: (clientNotes || []).map(n => ({ id: n.id, text: n.note_text, date: new Date(n.created_at).toLocaleString() })) });
    setView("detail");
  };

  const newClient = () => { window.location.href = "/brand-intake"; };

  const handleLogin = () => {
    if (password === "alchemy 2024") {
      setAuthenticated(true); setIsAdmin(true); setView("dashboard"); setAuthError(false);
      sessionStorage.setItem("alchemy_auth", "true");
    } else { setAuthError(true); }
  };

  if (!mounted) return null;

  if (!authenticated) return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{fonts}</style>
      <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><Sparkles size={24} style={{ color: "#fff" }} /></div>
        <h1 style={{ ...hd, fontSize: 32, color: C.text, marginBottom: 8 }}>ALCHEMY Studios</h1>
        <p style={{ color: C.textSec, fontSize: 15, marginBottom: 32 }}>Enter password to continue</p>
        <input type="password" value={password} onChange={e => { setPassword(e.target.value); setAuthError(false); }} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} placeholder="Password" style={{ width: "100%", padding: "14px 18px", background: C.bgSoft, border: `1px solid ${authError ? C.danger : C.borderLight}`, borderRadius: 12, color: C.text, fontSize: 16, fontFamily: "'Inter', sans-serif", outline: "none", textAlign: "center", boxSizing: "border-box", marginBottom: 16 }} autoFocus />
        {authError && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>Incorrect password</p>}
        <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 980, border: "none", background: C.accent, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Enter</button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{fonts}{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.15; } 100% { transform: scale(0.8); opacity: 0.5; } } @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } * { box-sizing: border-box; margin: 0; padding: 0; } select option { background: #fff; color: #1D1D1F; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #D2D2D7; border-radius: 3px; } input:focus, textarea:focus, select:focus { border-color: #000 !important; outline: none; } ::placeholder { color: #AEAEB2; }`}</style>

      <div style={{ borderBottom: `1px solid ${C.borderLight}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: isAdmin ? "pointer" : "default" }} onClick={isAdmin ? goHome : undefined}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={16} style={{ color: "#fff" }} /></div>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>ALCHEMY <span style={{ fontWeight: 400, color: C.textSec }}>Studios</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isAdmin && (view === "client" || view === "detail") && <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textSec, cursor: "pointer", fontSize: 14, fontFamily: "'Inter', sans-serif" }}><Home size={14} /> Dashboard</button>}
          {view === "client" && screen === "review" && <span style={{ fontSize: 13, color: C.textSec }}>{SECTIONS.filter(s => statuses[s] === "approved").length}/{SECTIONS.length} approved</span>}
        </div>
      </div>

      <div style={{ maxWidth: view === "dashboard" || view === "detail" ? 960 : 720, margin: "0 auto", padding: "48px 24px", animation: "fadeIn 0.4s ease-out" }}>
        {view === "dashboard" && <Dashboard clients={clients} onNew={newClient} onSelect={selectClient} />}
        {view === "detail" && selectedClient && <ClientDetail client={selectedClient} onBack={() => { setView("dashboard"); setSelectedClient(null); }} onUpdate={updateClient} />}
        {view === "client" && <>
          {error && <div style={{ background: "#FFF2F2", border: `1px solid ${C.danger}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.danger, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><X size={16} /> {error}</div>}
          {screen === "intake" && <IntakeForm onSubmit={handleSubmit} />}
          {screen === "generating" && <Generating msgIndex={loadingMsg} />}
          {screen === "review" && <div>
            <h1 style={{ ...hd, fontSize: 44, color: C.text, marginBottom: 8 }}>Review & Approve</h1>
            <p style={{ color: C.textSec, marginBottom: 36, fontSize: 16, lineHeight: 1.6 }}>Review each section. Approve what works, request changes on what doesn't.</p>
            {SECTIONS.map(sec => <Section key={sec} sectionKey={sec} data={guidelines[sec]} status={statuses[sec]} feedback={feedbacks[sec] || ""} onFeedbackChange={v => setFeedbacks(p => ({ ...p, [sec]: v }))} onApprove={() => setStatuses(p => ({ ...p, [sec]: "approved" }))} onRequestChanges={() => setStatuses(p => ({ ...p, [sec]: statuses[sec] === "feedback" ? "pending" : "feedback" }))} onSubmitFeedback={() => handleRegen(sec)} isRegen={regen[sec]} formData={formData} />)}
            {allApproved && <div style={{ textAlign: "center", marginTop: 36, padding: 36, background: C.bgSoft, borderRadius: 16 }}><h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: C.text }}>All Sections Approved</h3><p style={{ color: C.textSec, fontSize: 15, marginBottom: 20 }}>Lock your brand kit to begin ad production.</p><Btn primary onClick={async () => { setScreen("locked"); if (currentClientId) { await lockBrandHub(currentClientId); await updateClient_db(currentClientId, { status: 'reviewing', stage: 'Brand Kit Locked', progress: 65 }); } }} icon={<Lock size={16} />}>Lock Brand Kit</Btn></div>}
          </div>}
          {screen === "locked" && <div style={{ textAlign: "center", paddingTop: 80 }}><div style={{ width: 80, height: 80, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><Lock size={32} style={{ color: C.text }} /></div><h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 12 }}>Brand Kit Locked</h1><p style={{ color: C.textSec, fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>Your brand guidelines are finalized.</p><div style={{ display: "flex", gap: 12, justifyContent: "center" }}><Btn primary onClick={async () => { setScreen("submitted"); if (currentClientId) { await updateClient_db(currentClientId, { status: 'production', stage: 'In Production', progress: 80 }); } }} icon={<Send size={16} />}>Submit for Ad Production</Btn><Btn onClick={() => { setScreen("review"); setStatuses(p => { const n = {...p}; SECTIONS.forEach(s => n[s] = "approved"); return n; }); }}>Review Brand Kit</Btn></div></div>}
          {screen === "submitted" && <div style={{ textAlign: "center", paddingTop: 60 }}><div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 32px" }}><div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: C.success + "10", animation: "pulse-ring 3s ease-in-out infinite" }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={40} style={{ color: C.success }} /></div></div><h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 12 }}>We've Got Everything</h1><p style={{ color: C.text, fontSize: 18, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 16px", fontWeight: 500 }}>Our team has received your brand kit and will now begin producing your ads.</p><p style={{ color: C.textSec, fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>We'll craft your AI influencer, generate ad creative across all formats, and build your full campaign.</p><div style={{ maxWidth: 480, margin: "0 auto 36px", background: C.card, boxShadow: C.cardShadow, borderRadius: 16, padding: 28, textAlign: "left" }}><h3 style={{ fontSize: 13, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>What happens next</h3><div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{[{ step: "1", title: "AI Influencer Creation", desc: "Custom digital avatar based on your specs", time: "24-48 hours" }, { step: "2", title: "Ad Creative Production", desc: "100+ ads across all formats", time: "3-5 days" }, { step: "3", title: "Internal QA Review", desc: "Quality and brand consistency check", time: "1-2 days" }, { step: "4", title: "Delivery", desc: "Complete ad library via Google Drive", time: "Same day" }].map(item => <div key={item.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{item.step}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><p style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>{item.title}</p><span style={{ color: C.textTer, fontSize: 12 }}>{item.time}</span></div><p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.4 }}>{item.desc}</p></div></div>)}</div></div><div style={{ maxWidth: 480, margin: "0 auto 36px", padding: 16, background: C.bgSoft, borderRadius: 12 }}><p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.5 }}>Questions? Reach out anytime. We're building something great for <span style={{ color: C.text, fontWeight: 600 }}>{formData?.brandName || "your brand"}</span>.</p></div>{isAdmin && <Btn onClick={goHome} icon={<Home size={16} />}>Back to Dashboard</Btn>}</div>}
        </>}
      </div>
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
