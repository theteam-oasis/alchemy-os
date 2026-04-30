"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, X, Image, Film, Video, ArrowLeft, Save, Check, Sparkles, Link as LinkIcon, Copy, Clock, RefreshCw, MessageSquare, CheckCircle2, ExternalLink, Download } from "lucide-react";
import { breakdownScript } from "@/lib/script-breakdown";
import PortalChat from "@/components/PortalChat";
import { supabase } from "@/lib/supabase";

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

// Per-script video upload + preview + replace. Default ratio is 9:16 (vertical),
// since most UGC and Reel/Story ad formats are portrait. Team can flip to 16:9
// per video using the same pill toggle pattern as the image aspect-ratio chooser.
function ScriptVideo({ type, script, onUpload, onRemove, onSetRatio }) {
  const inputRef = useRef(null);
  const replaceRef = useRef(null);
  const url = script.videoUrl;
  const ratio = script.videoRatio || "9/16";
  const versionCount = (script.videoVersionHistory?.length || 0);
  const currentVersion = versionCount + (url ? 1 : 0);
  // Vertical ratios get a max-width so they don't dominate the page
  const maxWidth = ratio === "9/16" ? 280 : "100%";

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${G.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Video size={14} color={G.textSec} />
          <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: G.text, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Final Video
          </span>
          {url && currentVersion > 1 && (
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 980, background: "#E5F0FC", color: "#3E8ED0" }}>V{currentVersion}</span>
          )}
          {url && script.videoName && (
            <span style={{ ...mono, fontSize: 11, color: G.textTer, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{script.videoName}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {/* Aspect ratio toggle - same pill style as the Statics image ratio chooser */}
          <div style={{ display: "flex", gap: 3, background: "#F5F5F7", padding: 3, borderRadius: 980, border: `1px solid ${G.border}` }}>
            {[{ v: "9/16", l: "9:16" }, { v: "16/9", l: "16:9" }].map(r => (
              <button key={r.v} onClick={() => onSetRatio(r.v)}
                style={{ ...mono, padding: "4px 10px", borderRadius: 980, fontSize: 11, fontWeight: ratio === r.v ? 600 : 500, cursor: "pointer", border: "none", transition: "all 0.2s",
                  background: ratio === r.v ? G.gold : "transparent",
                  color: ratio === r.v ? "#fff" : G.textSec,
                }}>
                {r.l}
              </button>
            ))}
          </div>
          {url ? (
            <>
              <button onClick={() => replaceRef.current?.click()}
                style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <RefreshCw size={11} /> Replace
              </button>
              <button onClick={() => { if (confirm("Remove this video?")) onRemove(); }}
                style={{ ...mono, padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                <X size={11} />
              </button>
              <input ref={replaceRef} type="file" accept="video/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
            </>
          ) : (
            <button onClick={() => inputRef.current?.click()}
              style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Upload size={11} /> Upload video
            </button>
          )}
          <input ref={inputRef} type="file" accept="video/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        </div>
      </div>

      {script.videoUploading ? (() => {
        const pct = script.videoUploadProgress || 0;
        const sentMB = ((script.videoUploadBytes || 0) / 1024 / 1024).toFixed(1);
        const totalMB = ((script.videoUploadTotalBytes || 0) / 1024 / 1024).toFixed(1);
        const eta = script.videoUploadEtaSec;
        const etaText = eta == null ? "calculating..." : eta < 60 ? `${eta}s remaining` : `${Math.ceil(eta / 60)}m remaining`;
        return (
          <div style={{ width: "100%", maxWidth, margin: ratio === "9/16" ? "0 auto" : "0", aspectRatio: ratio, borderRadius: 10, border: `1px solid ${G.border}`, background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
            <RefreshCw size={22} color={G.textSec} style={{ animation: "spinKf 1s linear infinite" }} />
            <span style={{ ...mono, fontSize: 13, color: G.text, fontWeight: 600 }}>Uploading... {pct}%</span>
            <div style={{ width: "100%", maxWidth: 240, height: 6, background: "#E8E8ED", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: G.gold, transition: "width 0.2s ease" }} />
            </div>
            <span style={{ ...mono, fontSize: 11, color: G.textSec, fontVariantNumeric: "tabular-nums" }}>
              {sentMB} / {totalMB} MB · {etaText}
            </span>
            {script.videoUploadCanceller && (
              <button onClick={() => script.videoUploadCanceller()}
                style={{ ...mono, marginTop: 6, padding: "5px 14px", fontSize: 11, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                Cancel
              </button>
            )}
          </div>
        );
      })() : url ? (
        <div style={{ width: "100%", maxWidth, margin: ratio === "9/16" ? "0 auto" : "0" }}>
          <video src={url} controls preload="metadata"
            style={{ width: "100%", aspectRatio: ratio, objectFit: "contain", borderRadius: 10, background: "#000", display: "block" }} />
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()}
          style={{ width: "100%", maxWidth, margin: ratio === "9/16" ? "0 auto" : "0", aspectRatio: ratio, borderRadius: 10, border: `2px dashed ${G.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: G.textTer, cursor: "pointer", background: "#FAFAFA", padding: 16, textAlign: "center", boxSizing: "border-box" }}>
          <Video size={22} />
          <span style={{ ...mono, fontSize: 12, lineHeight: 1.35, maxWidth: 220 }}>Drop video here<br />or click to browse</span>
          <span style={{ ...mono, fontSize: 10, color: G.textTer, lineHeight: 1.4, maxWidth: 220 }}>MP4 · MOV · WebM<br />up to 5 GB · resumable</span>
        </div>
      )}
    </div>
  );
}

// Mood board section per script. Hero scripts get up to 6 frames, UGC gets 1.
// The team uploads reference images so the client can preview the visual direction
// before review. The mood board itself can be approved or sent back for revision
// (handled separately on the client side using item ID `moodboard-<scriptId>`).
// Cross-origin-safe download. Anchor[download] gets ignored for cross-origin
// images on most browsers (they navigate instead), so we fetch the bytes and
// build a same-origin blob URL.
async function downloadImage(url, filename) {
  try {
    const res = await fetch(url, { credentials: "omit" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || url.split("/").pop() || "frame.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) {
    console.error("[download]", e);
    // Fallback: just open the image in a new tab so the user can save manually.
    window.open(url, "_blank");
  }
}

function ScriptMoodBoard({ type, script, max, onUpload, onRemove, onSetRatio, feedback }) {
  const inputRef = useRef(null);
  const moodBoard = script.moodBoard || [];
  const remaining = max - moodBoard.length;
  const label = type === "hero" ? "Hero Mood Board" : "UGC Mood Frame";
  const sub = max === 1 ? "1 reference frame" : `${max} reference frames`;
  const status = feedback?.status;
  const comments = feedback?.comments?.length || 0;
  // Frame ratio is configurable per-script. Default 9:16 (vertical) since
  // that's the dominant ad format these days; team can flip to 16:9 for
  // widescreen YouTube/CTV references. The toggle pills always show one
  // option highlighted on first render (no unselected state).
  const ratio = script.moodBoardRatio || "9/16";

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${G.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image size={14} color={G.textSec} />
          <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.text, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
          <span style={{ ...mono, fontSize: 11, color: G.textTer }}>{moodBoard.length}/{max} · {sub}</span>
          {status && (
            <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 980, fontSize: 10, fontWeight: 700, background: fbClr[status] || G.textTer, color: "#fff" }}>
              {status === "approved" ? <CheckCircle2 size={10} /> : status === "rejected" ? <X size={10} /> : <RefreshCw size={10} />}
              {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Revision"}
            </span>
          )}
          {comments > 0 && (
            <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 980, fontSize: 10, fontWeight: 600, background: "#F5F5F7", color: G.textSec }}>
              <MessageSquare size={9} />{comments}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Aspect ratio toggle. Same pill pattern as the video ratio picker. */}
          {onSetRatio && (
            <div style={{ display: "flex", gap: 2, background: "#F5F5F7", padding: 2, borderRadius: 980, border: `1px solid ${G.border}` }}>
              {[{ v: "9/16", l: "9:16" }, { v: "16/9", l: "16:9" }].map((r) => (
                <button key={r.v} onClick={() => onSetRatio(r.v)}
                  style={{ ...mono, padding: "4px 10px", borderRadius: 980, fontSize: 11, fontWeight: ratio === r.v ? 700 : 500, cursor: "pointer", border: "none",
                    background: ratio === r.v ? G.text : "transparent",
                    color: ratio === r.v ? "#fff" : G.textSec,
                  }}>{r.l}</button>
              ))}
            </div>
          )}
          {/* Upload button removed — the empty dashed slots already act as
              click targets, so a redundant pill button just added noise. */}
        </div>
        <input ref={inputRef} type="file" multiple={max > 1} accept="image/*" style={{ display: "none" }}
          onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
      </div>
      {/* Render exactly `max` slots — each slot is either filled (image) or empty
          (upload box). Mirrors the client review layout but with placeholders
          instead of a single giant drop zone. Frames are capped at ~120px so
          they stay compact in the team workspace. */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${max}, minmax(0, 120px))`, gap: 8 }}>
        {Array.from({ length: max }).map((_, slotIdx) => {
          const img = moodBoard[slotIdx];
          if (img) {
            return (
              <div key={img.id} style={{ position: "relative", aspectRatio: ratio }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 10, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${G.border}`, position: "relative" }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <button onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.name || `frame.jpg`); }}
                    title="Download frame"
                    style={{ ...mono, position: "absolute", bottom: 4, right: 4, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px", fontSize: 9, fontWeight: 700, background: "rgba(0,0,0,0.72)", color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                    <Download size={9} /> Save
                  </button>
                </div>
                <button onClick={() => onRemove(img.id)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#888", color: "#fff", border: `2px solid #fff`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.18)", zIndex: 5 }}>
                  <X size={10} />
                </button>
              </div>
            );
          }
          // Empty slot — compact upload placeholder
          return (
            <div key={`slot-${slotIdx}`} onClick={() => inputRef.current?.click()}
              style={{ aspectRatio: ratio, borderRadius: 10, border: `1.5px dashed ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer, cursor: "pointer", background: "#FAFAFA" }}>
              <Upload size={14} />
            </div>
          );
        })}
      </div>
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
  const [heroScripts, setHeroScripts] = useState([{ id: "1", title: "Hero Video 1", content: "" }]);
  const [ugcScripts, setUgcScripts] = useState([{ id: "1", title: "UGC Video 1", content: "" }]);
  // Tab nav so the team can jump between asset types (mirrors the client portal UX)
  const [activeTab, setActiveTab] = useState("statics");
  // When the team clicks an image, this opens a modal showing its full preview
  // alongside every comment + status the client has left on it.
  const [feedbackModalImageId, setFeedbackModalImageId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState({});

  // Track whether the initial project data has been loaded so the auto-save
  // effect doesn't fire from the initial state (would overwrite real data with defaults)
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/portal/projects/${projectId}`).then(r => r.json()).then(data => {
      setProject(data);
      if (data.images?.length) setImages(data.images);
      if (data.imageRatio) setImageRatio(data.imageRatio);
      if (data.heroScripts?.length) setHeroScripts(data.heroScripts);
      if (data.ugcScripts?.length) setUgcScripts(data.ugcScripts);
      // mark hydrated on the next tick so the auto-save effect picks up future changes only
      setTimeout(() => { hydratedRef.current = true; }, 50);
    });
    fetch(`/api/portal/feedback?projectId=${projectId}`).then(r => r.json()).then(fb => setFeedback(fb || {})).catch(() => {});
  }, [projectId]);

  // Live-poll feedback so the team sees client approve/reject/revision marks
  // appear in (near) real-time without having to reload the page. 10s cadence.
  useEffect(() => {
    if (!projectId) return;
    const id = setInterval(() => {
      fetch(`/api/portal/feedback?projectId=${projectId}`)
        .then(r => r.json())
        .then(fb => setFeedback(fb || {}))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, [projectId]);

  // Auto-save: persist any change to images / scripts / ratio on a short debounce.
  // No more manual "Save" button - the team just uploads and the data flows through.
  useEffect(() => {
    if (!projectId || !hydratedRef.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/portal/projects/${projectId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images, imageRatio, heroScripts, ugcScripts }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) { console.error("auto-save failed", e); }
      finally { setSaving(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [projectId, images, imageRatio, heroScripts, ugcScripts]);

  const uploadFiles = async (files) => {
    const toUpload = Array.from(files);
    if (toUpload.length === 0) return;
    if (!projectId) {
      alert("This project hasn't been created yet. Reload the page from the team workspace.");
      console.error("[upload] missing projectId, refusing to upload");
      return;
    }

    // Direct uploads to Supabase support up to 50MB by default - the old 4MB
    // warning is no longer needed. Files much larger than that should be
    // compressed first, but most ad assets fit comfortably under 50MB.
    setUploading(true);

    // Upload directly from the browser to Supabase Storage. This bypasses the
    // Vercel API route's 4.5MB body limit, which is what was killing larger
    // uploads silently.
    const results = await Promise.all(
      toUpload.map(async (file) => {
        try {
          if (!supabase) throw new Error("Storage not configured");
          const ext = (file.name.split(".").pop() || "bin").toLowerCase();
          const path = `portal/${projectId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("brand-assets")
            .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
          if (upErr) {
            console.error("[upload] supabase failed", file.name, upErr);
            return { ok: false, name: file.name, error: upErr.message };
          }
          const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
          return { ok: true, image: { id: crypto.randomUUID(), url: publicUrl, name: file.name } };
        } catch (e) {
          console.error("[upload] threw", file.name, e);
          return { ok: false, name: file.name, error: e?.message || "Network error" };
        }
      })
    );

    const newImages = results.filter(r => r.ok).map(r => r.image);
    const failures = results.filter(r => !r.ok);

    if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
    setUploading(false);

    if (failures.length > 0) {
      alert(
        `${failures.length} of ${toUpload.length} upload(s) failed:\n\n` +
        failures.map(f => `• ${f.name}: ${f.error}`).join("\n") +
        "\n\nFiles over 4MB often fail. Try compressing them first."
      );
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); };
  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  // Replace an existing image with a new file. The OLD image (url, name, plus
  // a snapshot of the client feedback that triggered the swap) is pushed onto
  // a versionHistory array so we never lose the revision chain. Same image id
  // is preserved so all feedback / status / comments stay attached.
  const replaceImage = async (imageId, file) => {
    if (!projectId || !supabase) { alert("Storage not ready."); return; }
    if (!file) return;
    const current = images.find(i => i.id === imageId);
    if (!current) return;

    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `portal/${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (upErr) { console.error("[replace] upload failed", upErr); alert(`Upload failed: ${upErr.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);

      // Snapshot the current feedback at the moment of replacement so the chain
      // log shows what the client asked us to fix.
      const fb = feedback[imageId] || {};
      const archived = {
        version: (current.versionHistory?.length || 0) + 1,
        url: current.url,
        name: current.name,
        replacedAt: new Date().toISOString(),
        feedbackStatus: fb.status || null,
        feedbackComments: (fb.comments || []).map(c => ({ ...c })),
      };

      setImages(prev => prev.map(img => img.id !== imageId ? img : ({
        ...img,
        url: publicUrl,
        name: file.name,
        versionHistory: [...(img.versionHistory || []), archived],
      })));

      // Reset the image's status so it reads as "new revision pending review"
      // (do this in the background; UI updates from the optimistic state above)
      try {
        await fetch("/api/portal/feedback", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, itemId: imageId, status: null }),
        });
      } catch (e) { /* non-critical */ }
    } catch (e) {
      console.error("[replace] threw", e);
      alert(`Replace failed: ${e?.message || "Unknown error"}`);
    }
  };
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
    const label = type === "hero" ? "Hero Video" : "UGC Video";
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

  // Upload mood board images for a specific script. Hero scripts allow 6, UGC allows 1.
  const uploadScriptMoodBoard = async (type, scriptId, files) => {
    const max = type === "hero" ? 6 : 1;
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    const arr = Array.from(files);
    if (arr.length === 0) return;
    if (!projectId || !supabase) {
      alert("Storage not ready. Please reload the page.");
      return;
    }

    // Same direct-to-Supabase pattern as the main image uploader: skip the
    // Vercel API route so we don't hit the 4.5MB body limit on big frames.
    const results = await Promise.all(arr.map(async (file) => {
      try {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `portal/${projectId}/moodboard/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("brand-assets")
          .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (upErr) {
          console.error("[moodboard upload] failed", file.name, upErr);
          return { ok: false, name: file.name, error: upErr.message };
        }
        const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
        return { ok: true, image: { id: crypto.randomUUID(), url: publicUrl, name: file.name } };
      } catch (e) {
        console.error("[moodboard upload] threw", file.name, e);
        return { ok: false, name: file.name, error: e?.message || "Network error" };
      }
    }));

    const newImages = results.filter(r => r.ok).map(r => r.image);
    const failures = results.filter(r => !r.ok);
    if (newImages.length > 0) {
      setter(prev => prev.map(s => {
        if (s.id !== scriptId) return s;
        const existing = s.moodBoard || [];
        const combined = [...existing, ...newImages].slice(0, max);
        return { ...s, moodBoard: combined };
      }));
    }
    if (failures.length > 0) {
      alert(
        `${failures.length} mood board upload(s) failed:\n\n` +
        failures.map(f => `• ${f.name}: ${f.error}`).join("\n")
      );
    }
  };

  const removeMoodBoardImage = (type, scriptId, imageId) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.map(s => {
      if (s.id !== scriptId) return s;
      return { ...s, moodBoard: (s.moodBoard || []).filter(img => img.id !== imageId) };
    }));
  };

  // Upload (or replace) the rendered video for a script. Uses Supabase's TUS
  // resumable upload protocol with 6MB chunks - handles multi-GB renders cleanly.
  const uploadScriptVideo = async (type, scriptId, file) => {
    if (!file) return;
    if (!projectId || !supabase) { alert("Storage not ready."); return; }
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    const list = type === "hero" ? heroScripts : ugcScripts;
    const current = list.find(s => s.id === scriptId);
    if (!current) return;

    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = `portal/${projectId}/videos/${crypto.randomUUID()}.${ext}`;
    const totalBytes = file.size;
    const startedAt = Date.now();

    // Initialize upload status with file size + ETA placeholder
    setter(prev => prev.map(s => s.id !== scriptId ? s : ({
      ...s,
      videoUploading: true,
      videoUploadProgress: 0,
      videoUploadBytes: 0,
      videoUploadTotalBytes: totalBytes,
      videoUploadEtaSec: null,
      videoUploadCanceller: null,
    })));

    try {
      const tus = await import("tus-js-client");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseAnonKey;

      let uploadInstance;
      await new Promise((resolve, reject) => {
        uploadInstance = new tus.Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
          headers: {
            authorization: `Bearer ${token}`,
            "x-upsert": "true",
            apikey: supabaseAnonKey,
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "brand-assets",
            objectName: path,
            contentType: file.type,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6MB chunks
          onError: (e) => { console.error("[video tus] error", e); reject(e); },
          onProgress: (sent, total) => {
            const pct = Math.round((sent / total) * 100);
            const elapsed = (Date.now() - startedAt) / 1000;
            const speed = sent / Math.max(elapsed, 0.5); // bytes per second
            const remaining = total - sent;
            const eta = speed > 0 ? Math.ceil(remaining / speed) : null;
            setter(prev => prev.map(s => s.id !== scriptId ? s : ({
              ...s,
              videoUploadProgress: pct,
              videoUploadBytes: sent,
              videoUploadTotalBytes: total,
              videoUploadEtaSec: eta,
            })));
          },
          onSuccess: () => resolve(),
        });
        // Make the upload cancellable from the UI
        setter(prev => prev.map(s => s.id !== scriptId ? s : ({ ...s, videoUploadCanceller: () => uploadInstance.abort(true) })));
        uploadInstance.start();
      });

      const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);

      const archive = current.videoUrl ? [{
        version: (current.videoVersionHistory?.length || 0) + 1,
        url: current.videoUrl,
        name: current.videoName || "video",
        replacedAt: new Date().toISOString(),
        feedbackStatus: feedback[scriptId]?.status || null,
        feedbackComments: (feedback[scriptId]?.comments || []).map(c => ({ ...c })),
      }] : [];

      setter(prev => prev.map(s => s.id !== scriptId ? s : ({
        ...s,
        videoUrl: publicUrl,
        videoName: file.name,
        videoVersionHistory: [...(s.videoVersionHistory || []), ...archive],
        videoUploading: false,
        videoUploadProgress: 100,
      })));

      if (current.videoUrl) {
        try {
          await fetch("/api/portal/feedback", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, itemId: scriptId, status: null }),
          });
        } catch (e) { /* non-critical */ }
      }
    } catch (e) {
      const aborted = String(e?.message || "").toLowerCase().includes("abort");
      console.error("[video upload] threw", e);
      setter(prev => prev.map(s => s.id !== scriptId ? s : ({
        ...s,
        videoUploading: false,
        videoUploadProgress: 0,
        videoUploadBytes: 0,
        videoUploadTotalBytes: 0,
        videoUploadEtaSec: null,
        videoUploadCanceller: null,
      })));
      if (!aborted) {
        alert(`Video upload failed: ${e?.message || "Unknown error"}\n\nIf the file is over your Supabase bucket's size limit, bump it: Supabase Dashboard → Storage → brand-assets bucket → Edit → File size limit → set to 5368709120 (5 GB) → Save.`);
      }
    }
  };

  const removeScriptVideo = (type, scriptId) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.map(s => s.id !== scriptId ? s : ({ ...s, videoUrl: null, videoName: null })));
  };

  const setScriptVideoRatio = (type, scriptId, ratio) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.map(s => s.id !== scriptId ? s : ({ ...s, videoRatio: ratio })));
  };

  // Per-script mood-board frame ratio (separate from video ratio because the
  // team sometimes references widescreen images for a vertical final video).
  const setScriptMoodBoardRatio = (type, scriptId, ratio) => {
    const setter = type === "hero" ? setHeroScripts : setUgcScripts;
    setter(prev => prev.map(s => s.id !== scriptId ? s : ({ ...s, moodBoardRatio: ratio })));
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

  // When loaded in an iframe (?embed=1), hide the top nav so the team can't
  // navigate to other clients' portals from inside the team workspace iframe.
  const embedded = searchParams.get("embed") === "1";

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg }}>
      <style>{`@keyframes spinKf { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: embedded ? 1100 : 700, margin: "0 auto", padding: "0 24px" }}>

        {/* Nav (hidden when embedded inside the team workspace) */}
        {!embedded && (
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
            <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={14} style={{ color: G.gold }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
            </a>
            <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Create Project</span>
          </nav>
        )}

        {/* Header (hidden when embedded inside the team workspace - sidebar already shows the client + section title) */}
        <div style={{ marginBottom: embedded ? 14 : 40, marginTop: embedded ? 12 : 24 }}>
          {!embedded && (
            <>
              <button onClick={() => router.push("/portal")} style={{ ...mono, display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer", marginBottom: 24, transition: "all 0.2s" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <h1 style={{ ...hd, fontSize: 32, color: G.text, marginBottom: 8 }}>{project.clientName}</h1>
              <p style={{ ...mono, fontSize: 14, color: G.textSec }}>Upload assets for client review</p>
            </>
          )}
          {Object.keys(feedback).length > 0 && (() => {
            const vals = Object.values(feedback);
            const approved = vals.filter(f => f.status === "approved").length;
            const rejected = vals.filter(f => f.status === "rejected").length;
            const revision = vals.filter(f => f.status === "revision").length;
            const total = vals.length;
            if (total === 0) return null;
            return (
              <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
                {approved > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.approved + "12", color: fbClr.approved }}><CheckCircle2 size={14} />{approved} Approved</span>}
                {revision > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.revision + "12", color: fbClr.revision }}><RefreshCw size={14} />{revision} Revision</span>}
                {rejected > 0 && <span style={{ ...mono, display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: fbClr.rejected + "12", color: fbClr.rejected }}><X size={14} />{rejected} Rejected</span>}
                {/* Auto-save status indicator */}
                <span style={{ ...mono, marginLeft: "auto", fontSize: 12, color: G.textTer, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {saving ? <><RefreshCw size={11} style={{ animation: "spinKf 1s linear infinite" }} /> Saving...</> : saved ? <><Check size={11} color={G.success} /> Saved</> : <>Auto-saves on every change</>}
                </span>
              </div>
            );
          })()}
        </div>

        {/* ─── Asset-type tab nav (mirrors the client portal) ─── */}
        <div style={{ display: "flex", gap: 4, background: "#F5F5F7", padding: 4, borderRadius: 980, marginBottom: 24, border: `1px solid ${G.border}` }}>
          {[
            { key: "statics", label: "Statics", count: images.length },
            { key: "hero", label: "Hero Video", count: heroScripts.length },
            { key: "ugc", label: "UGC Video", count: ugcScripts.length },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ ...mono, flex: 1, padding: "10px 24px", borderRadius: 980, fontSize: 14, fontWeight: activeTab === t.key ? 600 : 500, cursor: "pointer", border: "none", transition: "all 0.2s",
                background: activeTab === t.key ? G.gold : "transparent",
                color: activeTab === t.key ? "#fff" : G.textSec,
              }}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* ─── Statics ─── */}
        {activeTab === "statics" && (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Image size={14} color={G.textSec} />
              Statics ({images.length})
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
                // Outer wrapper holds the X button and has NO overflow:hidden, so the X is never clipped
                <div key={img.id} style={{ position: "relative" }}>
                  <div
                    draggable
                    onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", idx); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const from = dragIdx; if (from !== null && from !== idx) reorderImage(from, idx); setDragIdx(null); }}
                    onDragEnd={() => setDragIdx(null)}
                    style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${dragIdx === idx ? G.gold : feedback[img.id]?.status ? fbClr[feedback[img.id].status] + "60" : G.border}`, cursor: "grab", opacity: dragIdx === idx ? 0.5 : 1, transition: "opacity 0.15s, border-color 0.15s", background: G.card }}>
                    {/* Click the image to open a feedback modal showing all client comments + status */}
                    <div onClick={() => setFeedbackModalImageId(img.id)}
                      style={{ width: "100%", aspectRatio: imageRatio, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", position: "relative" }}>
                      <img src={img.url} alt={img.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }} />
                      {/* Prominent client-feedback overlay. Status pill in the top-right with the
                          status color, comment count in bottom-left. The team needs to spot
                          what the client said at-a-glance, not squint at a tiny badge. */}
                      {feedback[img.id]?.status && (
                        <div style={{ position: "absolute", top: 8, right: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 980, fontSize: 11, fontWeight: 700, background: fbClr[feedback[img.id].status], color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", ...mono }}>
                          {feedback[img.id].status === "approved" ? <CheckCircle2 size={12} /> : feedback[img.id].status === "rejected" ? <X size={12} /> : <RefreshCw size={12} />}
                          {feedback[img.id].status === "approved" ? "Approved" : feedback[img.id].status === "rejected" ? "Rejected" : "Revision"}
                        </div>
                      )}
                      {feedback[img.id]?.comments?.length > 0 && (
                        <div style={{ position: "absolute", bottom: 8, left: 8, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 980, fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.78)", color: "#fff", ...mono }}>
                          <MessageSquare size={11} /> {feedback[img.id].comments.length}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "4px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ ...mono, fontSize: 11, color: G.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, flex: 1 }}>{img.name}</p>
                        {(img.versionHistory?.length || 0) > 0 && (
                          <span style={{ ...mono, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 980, background: "#E5F0FC", color: "#3E8ED0" }}>
                            V{(img.versionHistory.length || 0) + 1}
                          </span>
                        )}
                      </div>
                      <FeedbackBadge status={feedback[img.id]?.status} comments={feedback[img.id]?.comments} />
                      {/* Replace this image - opens file picker, archives the old version into versionHistory */}
                      <label style={{ ...mono, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", fontSize: 10, fontWeight: 600, background: "#F5F5F7", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                        <RefreshCw size={9} /> Replace
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceImage(img.id, f); e.target.value = ""; }} />
                      </label>
                    </div>
                  </div>
                  {/* X sits on the outer wrapper so it's never clipped by the card's overflow:hidden */}
                  <button onClick={() => removeImage(img.id)} style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", background: "#888", color: "#fff", border: `2px solid #fff`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.18)", zIndex: 5 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ─── Hero Scripts ─── */}
        {activeTab === "hero" && (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Film size={14} color={G.textSec} />
              Hero Videos ({heroScripts.length}/3)
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
                  <ScriptMoodBoard type="hero" script={s} max={6}
                    onUpload={(files) => uploadScriptMoodBoard("hero", s.id, files)}
                    onRemove={(imgId) => removeMoodBoardImage("hero", s.id, imgId)}
                    onSetRatio={(r) => setScriptMoodBoardRatio("hero", s.id, r)}
                    feedback={feedback[`moodboard-${s.id}`]}
                  />
                  <ScriptVideo type="hero" script={s}
                    onUpload={(file) => uploadScriptVideo("hero", s.id, file)}
                    onRemove={() => removeScriptVideo("hero", s.id)}
                    onSetRatio={(r) => setScriptVideoRatio("hero", s.id, r)}
                  />
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
        )}

        {/* ─── UGC Scripts ─── */}
        {activeTab === "ugc" && (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <Video size={14} color={G.textSec} />
              UGC Videos ({ugcScripts.length}/3)
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
                  <ScriptMoodBoard type="ugc" script={s} max={1}
                    onUpload={(files) => uploadScriptMoodBoard("ugc", s.id, files)}
                    onRemove={(imgId) => removeMoodBoardImage("ugc", s.id, imgId)}
                    onSetRatio={(r) => setScriptMoodBoardRatio("ugc", s.id, r)}
                    feedback={feedback[`moodboard-${s.id}`]}
                  />
                  <ScriptVideo type="ugc" script={s}
                    onUpload={(file) => uploadScriptVideo("ugc", s.id, file)}
                    onRemove={() => removeScriptVideo("ugc", s.id)}
                    onSetRatio={(r) => setScriptVideoRatio("ugc", s.id, r)}
                  />
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
        )}

        {/* The manual Save button was removed - changes auto-save on every edit. */}

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
      {/* Hide chat when embedded inside the team workspace (parent already renders DashboardChat) */}
      {projectId && !embedded && <PortalChat projectId={projectId} sender="team" brandName={project?.clientName || ""} />}

      {/* Click-an-image-to-see-feedback modal for the team. Shows the full image
          alongside every client comment + status. */}
      {feedbackModalImageId && (() => {
        const img = images.find(i => i.id === feedbackModalImageId);
        if (!img) return null;
        const fb = feedback[img.id] || {};
        const status = fb.status || null;
        const comments = (fb.comments || []).filter(c => typeof c.line !== "number");
        const statusColor = status === "approved" ? fbClr.approved : status === "rejected" ? fbClr.rejected : status === "revision" ? fbClr.revision : G.textTer;
        return (
          <div onClick={(e) => { if (e.target === e.currentTarget) setFeedbackModalImageId(null); }}
            style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 18, maxWidth: 1100, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "row", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              {/* Image side */}
              <div style={{ flex: 1.4, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, minHeight: 400 }}>
                <img src={img.url} alt={img.name} style={{ maxWidth: "100%", maxHeight: "84vh", objectFit: "contain", borderRadius: 8 }} />
              </div>
              {/* Feedback side */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", borderLeft: `1px solid ${G.border}`, minWidth: 320 }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Client Feedback</h3>
                    <p style={{ ...mono, fontSize: 11, color: G.textTer, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{img.name}</p>
                  </div>
                  <button onClick={() => setFeedbackModalImageId(null)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${G.border}` }}>
                  {status ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 980, background: statusColor + "18", color: statusColor, fontSize: 13, fontWeight: 700, ...mono }}>
                      {status === "approved" ? <><CheckCircle2 size={14} /> Approved</> : status === "rejected" ? <><X size={14} /> Rejected</> : <><RefreshCw size={14} /> Revision Requested</>}
                    </div>
                  ) : (
                    <span style={{ ...mono, fontSize: 12, color: G.textTer, fontStyle: "italic" }}>Client hasn&apos;t reviewed this yet</span>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }}>
                  {comments.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center" }}>
                      <MessageSquare size={24} color={G.textTer} style={{ marginBottom: 10, opacity: 0.5 }} />
                      <p style={{ ...mono, fontSize: 12, color: G.textTer }}>No comments yet</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {comments.map((c, i) => {
                        const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
                        return (
                          <div key={i} style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px", border: `1px solid ${G.border}` }}>
                            <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.55, whiteSpace: "pre-wrap", margin: 0 }}>{c.text}</p>
                            <span style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 4, display: "block" }}>
                              {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ padding: "12px 24px", borderTop: `1px solid ${G.border}`, display: "flex", gap: 8 }}>
                  <button onClick={() => { setFeedbackModalImageId(null); replaceImage && document.querySelector(`input[data-replace-id="${img.id}"]`)?.click(); }}
                    style={{ ...mono, flex: 1, padding: "9px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
