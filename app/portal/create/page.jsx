"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, X, Image, Film, Video, ArrowLeft, Save, Check, Sparkles, Link as LinkIcon, Copy, Clock, RefreshCw, MessageSquare, CheckCircle2, ExternalLink } from "lucide-react";
import { breakdownScript } from "@/lib/script-breakdown";
import PortalChat from "@/components/PortalChat";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000", goldSoft: "#00000008", goldBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

const inputStyle = { ...mono, width: "100%", padding: "12px 16px", fontSize: 14, border: `1px solid ${G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", transition: "border-color 0.15s" };
const labelStyle = { ...mono, fontSize: 13, fontWeight: 600, color: G.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 };
const fbClr = { approved: "#30A46C", rejected: "#E5484D", revision: "#3E8ED0" };

function FeedbackBadge({ status, comments }) {
  if (!status && (!comments || comments.length === 0)) return null;
  const c = fbClr[status];
  const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? X : status === "revision" ? RefreshCw : null;
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : status === "revision" ? "Revision" : null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {status && c && (
        <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 980, fontSize: 10, fontWeight: 700, background: c, color: "#fff" }}>
          <Icon size={10} />{label}
        </span>
      )}
      {comments && comments.length > 0 && (
        <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 980, fontSize: 10, fontWeight: 600, background: "#F5F5F7", color: G.textSec }}>
          <MessageSquare size={9} />{comments.length}
        </span>
      )}
    </div>
  );
}

export default function CreatePage() {
  return <Suspense fallback={<div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: G.textTer }}>Loading...</p></div>}><CreateProject /></Suspense>;
}

function CreateProject() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");
  const fileInputRef = useRef(null);

  const [project, setProject] = useState(null);
  const [images, setImages] = useState([]);
  const [imageRatio, setImageRatio] = useState("1/1");
  const [heroScripts, setHeroScripts] = useState([{ id: "1", title: "Hero Script 1", content: "" }]);
  const [ugcScripts, setUgcScripts] = useState([{ id: "1", title: "UGC Script 1", content: "" }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/portal/projects/${projectId}`).then(r => r.json()).then(data => {
      setProject(data);
      if (data.images?.length) setImages(data.images);
      if (data.imageRatio) setImageRatio(data.imageRatio);
      if (data.heroScripts?.length) setHeroScripts(data.heroScripts);
      if (data.ugcScripts?.length) setUgcScripts(data.ugcScripts);
    });
    fetch(`/api/portal/feedback?projectId=${projectId}`).then(r => r.json()).then(fb => setFeedback(fb || {})).catch(() => {});
  }, [projectId]);

  const uploadFiles = async (files) => {
    const toUpload = Array.from(files);
    if (toUpload.length === 0) return;
    setUploading(true);
    const newImages = [];
    for (const file of toUpload) {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      const res = await fetch("/api/portal/upload", { method: "POST", body: form });
      const data = await res.json();
      newImages.push({ id: crypto.randomUUID(), url: data.url, name: data.name });
    }
    setImages(prev => [...prev, ...newImages]);
    setUploading(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); };
  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));
  const reorderImage = (fromIdx, toIdx) => {
    setImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const addScript = (type) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    const label = type === "hero" ? "Hero Script" : "UGC Script";
    setter(prev => prev.length >= 3 ? prev : [...prev, { id: crypto.randomUUID(), title: `${label} ${prev.length + 1}`, content: "" }]);
  };

  const updateScript = (type, id, content) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const removeScript = (type, id) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.filter(s => s.id !== id));
  };

  const saveProject = async () => {
    setSaving(true);
    await fetch(`/api/portal/projects/${projectId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, imageRatio, heroScripts, ugcScripts }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const handleCopy = () => {
    const slug = project?.slug || projectId;
    navigator.clipboard.writeText(`${window.location.origin}/portal/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!project) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: G.textTer, fontSize: 15 }}>Loading project...</p>
    </div>
  );

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </a>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Create Project</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 40, marginTop: 24 }}>
          <button onClick={() => router.push("/portal")} style={{ ...mono, display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer", marginBottom: 24, transition: "all 0.2s" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ ...hd, fontSize: 32, color: G.text, marginBottom: 8 }}>{project.clientName}</h1>
          <p style={{ ...mono, fontSize: 14, color: G.textSec }}>Upload assets for client review</p>
          {Object.keys(feedback).length > 0 && (() => {
            const vals = Object.values(feedback);
            const approved = vals.filter(f => f.status === "approved").length;
            const rejected = vals.filter(f => f.status === "rejected").length;
            const revision = vals.filter(f => f.status === "revision").length;
            const total = vals.length;
            if (total === 0) return null;
            return (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {approved > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.approved + "12", color: fbClr.approved }}><CheckCircle2 size={14} />{approved} Approved</span>}
                {revision > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.revision + "12", color: fbClr.revision }}><RefreshCw size={14} />{revision} Revision</span>}
                {rejected > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.rejected + "12", color: fbClr.rejected }}><X size={14} />{rejected} Rejected</span>}
              </div>
            );
          })()}
        </div>

        {/* ─── Images ─── */}
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Image size={14} color={G.textSec} />
              Images ({images.length})
            </label>
            <div style={{ display: "flex", gap: 4, background: "#F5F5F7", padding: 3, borderRadius: 980, border: `1px solid ${G.border}` }}>
              {[{ v: "1/1", l: "1:1" }, { v: "9/16", l: "9:16" }, { v: "16/9", l: "16:9" }].map(r => (
                <button key={r.v} onClick={() => setImageRatio(r.v)}
                  style={{ ...mono, padding: "5px 14px", borderRadius: 980, fontSize: 12, fontWeight: imageRatio === r.v ? 600 : 500, cursor: "pointer", border: "none", transition: "all 0.2s",
                    background: imageRatio === r.v ? G.gold : "transparent",
                    color: imageRatio === r.v ? "#fff" : G.textSec,
                  }}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          <div onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragOver ? G.gold : G.goldBorder}`, borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: dragOver ? "#00000004" : "transparent", transition: "all 0.3s", marginBottom: images.length > 0 ? 16 : 0 }}>
            <Upload size={24} color={G.textTer} />
            <p style={{ ...mono, color: G.textSec, fontSize: 14, marginTop: 8 }}>{uploading ? "Uploading..." : "Click or drag images here"}</p>
            <p style={{ ...mono, color: G.textTer, fontSize: 12, marginTop: 4 }}>JPG, PNG, WebP</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => uploadFiles(e.target.files)} />
          </div>

          {images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {images.map((img, idx) => (
                <div key={img.id}
                  draggable
                  onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", idx); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const from = dragIdx; if (from !== null && from !== idx) reorderImage(from, idx); setDragIdx(null); }}
                  onDragEnd={() => setDragIdx(null)}
                  style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${dragIdx === idx ? G.gold : feedback[img.id]?.status ? fbClr[feedback[img.id].status] + "60" : G.border}`, cursor: "grab", opacity: dragIdx === idx ? 0.5 : 1, transition: "opacity 0.15s, border-color 0.15s" }}>
                  <img src={img.url} alt={img.name} style={{ width: "100%", aspectRatio: imageRatio, objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  <button onClick={() => removeImage(img.id)} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: G.text, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <X size={12} />
                  </button>
                  <div style={{ padding: "4px 8px" }}>
                    <p style={{ ...mono, fontSize: 11, color: G.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{img.name}</p>
                    <FeedbackBadge status={feedback[img.id]?.status} comments={feedback[img.id]?.comments} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Hero Scripts ─── */}
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Film size={14} color={G.textSec} />
              Hero Video Scripts ({heroScripts.length}/3)
            </label>
            {heroScripts.length < 3 && (
              <button onClick={() => addScript("hero")} style={{ ...mono, padding: "6px 16px", fontSize: 13, fontWeight: 500, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer" }}>+ Add</button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {heroScripts.map(s => {
              const bd = breakdownScript(s.content);
              return (
                <div key={s.id} style={{ border: `1px solid ${feedback[s.id]?.status ? fbClr[feedback[s.id].status] + "60" : G.border}`, borderRadius: 12, padding: 16, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...hd, fontSize: 18, color: G.text }}>{s.title}</span>
                      <FeedbackBadge status={feedback[s.id]?.status} comments={feedback[s.id]?.comments} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {bd.totalDuration > 0 && (
                        <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {bd.totalFormatted}
                        </span>
                      )}
                      <button onClick={() => removeScript("hero", s.id)} style={{ width: 22, height: 22, borderRadius: "50%", background: G.text, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={12} /></button>
                    </div>
                  </div>
                  <textarea value={s.content} onChange={(e) => updateScript("hero", s.id, e.target.value)} placeholder="Write or paste your hero video script here..."
                    style={{ ...inputStyle, minHeight: 160, resize: "vertical", lineHeight: 1.7 }} />
                  {bd.sections.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
                      <p style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Script Breakdown</p>
                      {bd.sections.map((sec, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < bd.sections.length - 1 ? `1px solid ${G.border}22` : "none" }}>
                          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: G.text, whiteSpace: "nowrap", flex: "0 0 70px" }}>{sec.startFormatted}–{sec.endFormatted}</span>
                          <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.textSec, flex: 1 }}>{sec.sceneDesc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── UGC Scripts ─── */}
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Video size={14} color={G.textSec} />
              UGC Video Scripts ({ugcScripts.length}/3)
            </label>
            {ugcScripts.length < 3 && (
              <button onClick={() => addScript("ugc")} style={{ ...mono, padding: "6px 16px", fontSize: 13, fontWeight: 500, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer" }}>+ Add</button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ugcScripts.map(s => {
              const bd = breakdownScript(s.content);
              return (
                <div key={s.id} style={{ border: `1px solid ${feedback[s.id]?.status ? fbClr[feedback[s.id].status] + "60" : G.border}`, borderRadius: 12, padding: 16, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...hd, fontSize: 18, color: G.text }}>{s.title}</span>
                      <FeedbackBadge status={feedback[s.id]?.status} comments={feedback[s.id]?.comments} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {bd.totalDuration > 0 && (
                        <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {bd.totalFormatted}
                        </span>
                      )}
                      <button onClick={() => removeScript("ugc", s.id)} style={{ width: 22, height: 22, borderRadius: "50%", background: G.text, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={12} /></button>
                    </div>
                  </div>
                  <textarea value={s.content} onChange={(e) => updateScript("ugc", s.id, e.target.value)} placeholder="Write or paste your UGC video script here..."
                    style={{ ...inputStyle, minHeight: 160, resize: "vertical", lineHeight: 1.7 }} />
                  {bd.sections.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
                      <p style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Script Breakdown</p>
                      {bd.sections.map((sec, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < bd.sections.length - 1 ? `1px solid ${G.border}22` : "none" }}>
                          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: G.text, whiteSpace: "nowrap", flex: "0 0 70px" }}>{sec.startFormatted}–{sec.endFormatted}</span>
                          <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.textSec, flex: 1 }}>{sec.sceneDesc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Save & Link ─── */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <button onClick={saveProject} disabled={saving} style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 40px", background: G.gold, color: "#fff", fontSize: 15, fontWeight: 600, borderRadius: 980, border: "none", cursor: "pointer", opacity: saving ? 0.5 : 1, transition: "all 0.2s" }}>
            {saved ? <><Check size={16} /> Saved!</> : saving ? "Saving..." : <><Save size={16} /> Save & Generate Client Link</>}
          </button>

          <div style={{ marginTop: 20, background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 20, maxWidth: 500, margin: "20px auto 0" }}>
            <label style={{ ...labelStyle, marginBottom: 10, justifyContent: "center" }}>
              <LinkIcon size={14} color={G.textSec} />
              Client Review Link
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#F5F5F7", borderRadius: 10, padding: "10px 12px 10px 16px", border: `1px solid ${G.border}` }}>
              <LinkIcon size={14} color={G.textSec} style={{ flexShrink: 0 }} />
              <span style={{ ...mono, flex: 1, fontSize: 13, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? `${window.location.origin}/portal/${project?.slug || projectId}` : ""}
              </span>
              <button onClick={handleCopy} style={{ ...mono, padding: "6px 12px", fontSize: 12, fontWeight: 600, background: copied ? G.success : G.gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "background 0.15s" }}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <a href={`/portal/${project?.slug || projectId}`} target="_blank" rel="noopener noreferrer"
              style={{ ...mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", fontSize: 14, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", textDecoration: "none", marginTop: 12 }}>
              <ExternalLink size={14} />
              Open Client Portal
            </a>
            <p style={{ ...mono, color: G.textTer, fontSize: 12, marginTop: 8 }}>Share this link with your client for review</p>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginTop: 40, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Productions</span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: G.textTer, ...mono, marginTop: 12, display: "block" }}>&copy; 2026 Alchemy Productions LLC. All rights reserved.</span>
        </footer>
      </div>
      {projectId && <PortalChat projectId={projectId} sender="team" brandName={project?.clientName || ""} />}
    </div>
  );
}
