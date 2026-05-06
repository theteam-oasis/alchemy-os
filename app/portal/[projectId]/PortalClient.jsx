"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Check, X, Image, Film, Video, MessageSquare, CheckCircle2, RefreshCw, Sparkles, ChevronLeft, ChevronRight, ZoomIn, Clock, Download, Play, Pause, Maximize2 } from "lucide-react";
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

function FeedbackBox({ itemId, feedback, saving, onAddComment, onDeleteComment, viewerSender = "client" }) {
  const [text, setText] = useState("");
  // Only show general comments (without a line index) - line-specific comments appear inline in ScriptBreakdownView
  const comments = (feedback[itemId]?.comments || []).filter(c => typeof c.line !== "number");
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${G.border}` }}>
      <label style={{ ...mono, fontSize: 12, color: G.textSec, marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
        <MessageSquare size={11} /> General Feedback ({comments.length})
      </label>

      {/* Comment trail */}
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {comments.map((c, i) => {
            const canDelete = onDeleteComment && (c.sender || "client") === viewerSender;
            const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
            return (
              <div key={i} style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px", border: `1px solid ${G.border}`, position: "relative" }}>
                <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, paddingRight: canDelete ? 24 : 0 }}>{c.text}</p>
                <span style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 4, display: "block" }}>
                  {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                {canDelete && (
                  <button onClick={() => onDeleteComment(itemId, c.date)} title="Delete comment"
                    style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "#fff", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = clr.reject; e.currentTarget.style.borderColor = clr.reject; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textSec; }}>
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New feedback input */}
      <textarea
        placeholder="Add feedback..."
        value={text}
        onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        style={{ ...mono, width: "100%", padding: "10px 14px", fontSize: 13, border: `1px solid ${G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", resize: "none", minHeight: 56, lineHeight: 1.6, transition: "border-color 0.15s", overflow: "hidden" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        {text.trim() && (
          <button onClick={() => { onAddComment(itemId, text.trim()); setText(""); }}
            disabled={saving[itemId]}
            style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 16px", borderRadius: 980, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", border: "none", background: G.gold, color: "#fff", opacity: saving[itemId] ? 0.5 : 1 }}>
            <Check size={11} /> Submit Feedback
          </button>
        )}
        {saving[itemId] && <span style={{ ...mono, fontSize: 12, color: G.textTer }}>Saving...</span>}
      </div>
    </div>
  );
}

// Premium color palette
const clr = { approve: "#30A46C", reject: "#E5484D", revision: "#3E8ED0" };

function StatusBtns({ status, onApprove, onReject, onRevision }) {
  const btn = (active, color, icon, label, activeLabel, onClick) => ({
    onClick,
    style: { ...mono, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
      background: active ? color : "transparent", color: active ? "#fff" : color,
      border: `1px solid ${active ? color : `${color}30`}`,
    },
  });
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button {...btn(status === "approved", clr.approve, null, null, null, onApprove)}>
        <CheckCircle2 size={14} />Approve
      </button>
      <button {...btn(status === "rejected", clr.reject, null, null, null, onReject)}>
        <X size={14} />Reject
      </button>
      <button {...btn(status === "revision", clr.revision, null, null, null, onRevision)}>
        <RefreshCw size={14} />Revision
      </button>
    </div>
  );
}

function LineCommentBox({ lineIdx, selection, onSubmit, onCancel, saving }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);
  return (
    <div style={{ marginTop: 10, padding: 12, background: "#F5F5F7", borderRadius: 10, border: `1px solid ${G.border}` }}>
      {selection && (
        <div style={{ ...mono, fontSize: 12, color: G.textSec, marginBottom: 8, padding: "6px 10px", background: "#FFF8C5", borderRadius: 6, borderLeft: `3px solid #EAB308` }}>
          Commenting on: <span style={{ fontStyle: "italic", color: G.text }}>&ldquo;{selection}&rdquo;</span>
        </div>
      )}
      <textarea
        ref={textareaRef}
        placeholder={selection ? "Comment on highlighted text..." : "Comment on this line..."}
        value={text}
        onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        style={{ ...mono, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${G.border}`, borderRadius: 8, outline: "none", background: "#FFF", color: G.text, boxSizing: "border-box", resize: "none", minHeight: 48, lineHeight: 1.5, overflow: "hidden" }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim() || saving}
          style={{ ...mono, padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600, cursor: text.trim() && !saving ? "pointer" : "not-allowed", border: "none", background: G.gold, color: "#fff", opacity: text.trim() && !saving ? 1 : 0.4 }}>
          {saving ? "Saving..." : "Submit"}
        </button>
        <button onClick={onCancel}
          style={{ ...mono, padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${G.border}`, background: "transparent", color: G.textSec }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline video review player. The team uploads a rendered cut to each script;
// the client can watch it, click anywhere on the timeline (or hit "Comment at
// current time") to drop a timestamped comment. Comments are stored on the same
// portal_feedback row as the script with a `videoTimestamp` field, so they
// appear separately from line/general feedback.
function VideoReviewPlayer({ script, scriptId, feedback, onAddComment, onDeleteComment, viewerSender = "client" }) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [draftStamp, setDraftStamp] = useState(null);
  // Separate draft state for general (non-timestamped) feedback so the client
  // can leave overall thoughts on a video — pacing, hook, vibe, etc. — without
  // having to attach it to a specific second.
  const [generalDraft, setGeneralDraft] = useState("");
  const [generalOpen, setGeneralOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!script.videoUrl) return null;

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const requestFullscreen = () => {
    const el = wrapRef.current; if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };
  const onScrub = (e) => {
    const bar = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - bar.left) / bar.width;
    if (videoRef.current && Number.isFinite(duration)) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, pct * duration));
    }
  };

  const allComments = feedback?.[scriptId]?.comments || [];
  const videoComments = allComments
    .filter(c => typeof c.videoTimestamp === "number")
    .sort((a, b) => a.videoTimestamp - b.videoTimestamp);
  // General comments = anything attached to this script that ISN'T a per-line
  // script note (line) and ISN'T a video timestamp. We render these inside the
  // video player so video feedback lives in one place visually.
  const generalVideoComments = allComments
    .filter(c => typeof c.videoTimestamp !== "number" && typeof c.line !== "number")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const history = script.videoVersionHistory || [];
  const currentVersion = history.length + 1;

  const fmt = (s) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const seek = (t) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
  };

  const startCommentHere = () => {
    const v = videoRef.current; if (!v) return;
    setDraftStamp(v.currentTime);
  };

  const submitDraft = () => {
    if (draftText.trim() && typeof draftStamp === "number") {
      onAddComment(scriptId, draftText.trim(), { videoTimestamp: Math.round(draftStamp * 100) / 100 });
      setDraftText(""); setDraftStamp(null);
    }
  };

  const submitGeneral = () => {
    if (generalDraft.trim()) {
      // No meta -> stored as a plain comment (no line, no videoTimestamp)
      onAddComment(scriptId, generalDraft.trim());
      setGeneralDraft("");
      setGeneralOpen(false);
    }
  };

  // Cross-origin-safe download. Anchor[download] gets ignored for cross-origin
  // videos on most browsers, so we fetch and build a same-origin blob URL.
  const [downloading, setDownloading] = useState(false);
  const downloadVideo = async () => {
    if (!script.videoUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(script.videoUrl, { credentials: "omit" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = script.videoName || `${script.title || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error("[video download]", e);
      window.open(script.videoUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ marginTop: 14, padding: 16, background: "#FAFAFA", border: `1px solid ${G.border}`, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Video size={14} color={G.textSec} />
          <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: G.text, letterSpacing: "0.06em", textTransform: "uppercase" }}>Final Video</span>
          {currentVersion > 1 && (
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 980, background: "#E5F0FC", color: "#3E8ED0" }}>V{currentVersion}</span>
          )}
        </div>
        <button onClick={downloadVideo} disabled={downloading}
          title="Download this cut"
          style={{ ...mono, padding: "6px 12px", fontSize: 11, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 980, cursor: downloading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, opacity: downloading ? 0.6 : 1 }}>
          <Download size={11} /> {downloading ? "Preparing..." : "Download"}
        </button>
      </div>

      {/* Wistia-style custom player: jet-black big play button, minimal controls
          that fade in on hover, clickable timeline with comment pins.
          Aspect ratio comes from the team's choice (defaults to 9:16 vertical). */}
      <div ref={wrapRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: "relative", width: "100%", maxWidth: (script.videoRatio || "9/16") === "9/16" ? 360 : "100%", margin: (script.videoRatio || "9/16") === "9/16" ? "0 auto" : 0, borderRadius: 12, overflow: "hidden", background: "#000", aspectRatio: script.videoRatio || "9/16" }}>
        <video ref={videoRef} src={script.videoUrl} preload="metadata" playsInline
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", display: "block", cursor: "pointer" }} />

        {/* Big jet-black play button overlay - shown only when paused */}
        {!playing && (
          <button onClick={togglePlay} aria-label="Play"
            style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              width: 84, height: 84, borderRadius: "50%",
              background: "#000", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 28px rgba(0,0,0,0.45)", padding: 0,
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"; }}>
            {/* Slight nudge right so the triangle looks visually centered */}
            <Play size={32} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
          </button>
        )}

        {/* Bottom control bar - fades in on hover OR when paused */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "10px 14px 12px",
          background: "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))",
          opacity: hovered || !playing ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: hovered || !playing ? "auto" : "none",
        }}>
          {/* Scrubber + comment pins */}
          <div onClick={onScrub}
            style={{ position: "relative", height: 16, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", inset: "7px 0 7px 0", background: "rgba(255,255,255,0.25)", borderRadius: 999 }} />
            <div style={{ position: "absolute", left: 0, top: 7, bottom: 7, width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`, background: "#fff", borderRadius: 999 }} />
            {duration > 0 && videoComments.map((c, i) => {
              const left = `${Math.min(99, Math.max(0, (c.videoTimestamp / duration) * 100))}%`;
              return (
                <button key={i} onClick={(e) => { e.stopPropagation(); seek(c.videoTimestamp); }}
                  title={`${fmt(c.videoTimestamp)}: ${c.text}`}
                  style={{ position: "absolute", left, top: 1, width: 14, height: 14, borderRadius: "50%", background: clr.revision, border: "2px solid #fff", cursor: "pointer", padding: 0, transform: "translateX(-50%)" }} />
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, color: "#fff" }}>
            <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {playing ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
            </button>
            <span style={{ ...mono, fontSize: 11, fontWeight: 500, color: "#fff", opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>
              {fmt(currentTime)} / {fmt(duration)}
            </span>
            <button onClick={requestFullscreen} aria-label="Fullscreen"
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add a comment at the current playhead OR leave general feedback on the cut. */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {draftStamp === null && !generalOpen ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button onClick={startCommentHere}
              style={{ ...mono, padding: "7px 14px", fontSize: 12, fontWeight: 600, background: clr.revision, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={12} /> Comment at {fmt(currentTime)}
            </button>
            <button onClick={() => setGeneralOpen(true)}
              style={{ ...mono, padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={12} /> General feedback
            </button>
          </div>
        ) : draftStamp !== null ? (
          <div style={{ background: "#fff", border: `1px solid ${G.border}`, borderRadius: 10, padding: 10 }}>
            <div style={{ ...mono, fontSize: 11, color: G.textSec, marginBottom: 6 }}>
              Commenting at <span style={{ fontWeight: 700, color: G.text }}>{fmt(draftStamp)}</span>
            </div>
            <textarea value={draftText} onChange={(e) => { setDraftText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              autoFocus placeholder="What needs to change at this moment?"
              style={{ ...mono, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${G.border}`, borderRadius: 8, outline: "none", background: "#fff", color: G.text, boxSizing: "border-box", resize: "none", minHeight: 56, lineHeight: 1.5, overflow: "hidden" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={submitDraft} disabled={!draftText.trim()}
                style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: draftText.trim() ? "pointer" : "not-allowed", opacity: draftText.trim() ? 1 : 0.4 }}>
                Submit
              </button>
              <button onClick={() => { setDraftStamp(null); setDraftText(""); }}
                style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // General-feedback form. Same pattern as the timestamped one minus the time stamp pill.
          <div style={{ background: "#fff", border: `1px solid ${G.border}`, borderRadius: 10, padding: 10 }}>
            <div style={{ ...mono, fontSize: 11, color: G.textSec, marginBottom: 6 }}>General feedback on this cut</div>
            <textarea value={generalDraft} onChange={(e) => { setGeneralDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              autoFocus placeholder="Overall thoughts on pacing, hook, vibe, what's working, what's not..."
              style={{ ...mono, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${G.border}`, borderRadius: 8, outline: "none", background: "#fff", color: G.text, boxSizing: "border-box", resize: "none", minHeight: 72, lineHeight: 1.5, overflow: "hidden" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={submitGeneral} disabled={!generalDraft.trim()}
                style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: generalDraft.trim() ? "pointer" : "not-allowed", opacity: generalDraft.trim() ? 1 : 0.4 }}>
                Submit
              </button>
              <button onClick={() => { setGeneralOpen(false); setGeneralDraft(""); }}
                style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* General (non-timestamped) comments list. Rendered above the timestamp
          list so the team sees overall thoughts first. */}
      {generalVideoComments.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {generalVideoComments.map((c, i) => {
            const canDelete = onDeleteComment && (c.sender || "client") === viewerSender;
            const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
            return (
              <div key={`g-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "#fff", borderRadius: 8, border: `1px solid ${G.border}`, position: "relative" }}>
                <span style={{ ...mono, padding: "3px 10px", fontSize: 11, fontWeight: 700, background: G.text, color: "#fff", borderRadius: 980, flexShrink: 0 }}>
                  General
                </span>
                <div style={{ flex: 1, minWidth: 0, paddingRight: canDelete ? 24 : 0 }}>
                  <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
                  <span style={{ ...mono, fontSize: 10, color: G.textTer, marginTop: 3, display: "block" }}>
                    {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {canDelete && (
                  <button onClick={() => onDeleteComment(scriptId, c.date)} title="Delete comment"
                    style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#fff", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timestamped comment list - newest at top of the timeline = lowest timestamp */}
      {videoComments.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {videoComments.map((c, i) => {
            const canDelete = onDeleteComment && (c.sender || "client") === viewerSender;
            const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "#fff", borderRadius: 8, border: `1px solid ${G.border}`, position: "relative" }}>
                <button onClick={() => seek(c.videoTimestamp)}
                  style={{ ...mono, padding: "3px 10px", fontSize: 11, fontWeight: 700, background: clr.revision, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", flexShrink: 0 }}>
                  {fmt(c.videoTimestamp)}
                </button>
                <div style={{ flex: 1, minWidth: 0, paddingRight: canDelete ? 24 : 0 }}>
                  <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
                  <span style={{ ...mono, fontSize: 10, color: G.textTer, marginTop: 3, display: "block" }}>
                    {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {canDelete && (
                  <button onClick={() => onDeleteComment(scriptId, c.date)} title="Delete comment"
                    style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#fff", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Version history chain - same pattern as image VersionChain */}
      {history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setHistoryOpen(o => !o)}
            style={{ ...mono, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "#3E8ED0", background: "#E5F0FC", border: "none", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={11} /> Video revision history ({history.length} prior cut{history.length === 1 ? "" : "s"})
            </span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{historyOpen ? "Hide" : "Show"}</span>
          </button>
          {historyOpen && (
            <div style={{ marginTop: 8, padding: 10, background: "#fff", border: `1px solid ${G.border}`, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {[...history].reverse().map((v, i) => (
                <div key={i} style={{ paddingBottom: 10, borderBottom: i < history.length - 1 ? `1px solid ${G.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 980, background: "#FAFAFA", color: G.textSec, border: `1px solid ${G.border}` }}>V{v.version}</span>
                    <span style={{ ...mono, fontSize: 10, color: G.textTer }}>
                      Replaced {new Date(v.replacedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  {v.url && (
                    <video src={v.url} controls preload="metadata"
                      style={{ width: "100%", maxHeight: 220, borderRadius: 6, background: "#000", display: "block" }} />
                  )}
                  {(v.feedbackComments?.length > 0 || v.feedbackStatus) && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "#FAFAFA", borderLeft: `3px solid ${clr.revision}`, borderRadius: 6 }}>
                      {v.feedbackStatus && (
                        <p style={{ ...mono, fontSize: 10, color: clr.revision, fontWeight: 600, margin: 0, marginBottom: v.feedbackComments?.length > 0 ? 4 : 0 }}>
                          Status was: {v.feedbackStatus}
                        </p>
                      )}
                      {(v.feedbackComments || []).map((c, ci) => (
                        <p key={ci} style={{ ...mono, fontSize: 11, color: G.text, lineHeight: 1.5, margin: 0, marginTop: ci > 0 ? 4 : 0 }}>
                          {typeof c.videoTimestamp === "number" && <span style={{ fontWeight: 700, color: clr.revision }}>[{fmt(c.videoTimestamp)}] </span>}
                          &ldquo;{c.text}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Revision chain log: when an asset is replaced by the team, the prior version
// is archived into versionHistory along with a snapshot of the feedback that
// triggered the swap. Click "Version history" to expand the full chain.
function VersionChain({ item, kind = "image" }) {
  const [open, setOpen] = useState(false);
  const history = item?.versionHistory || [];
  if (history.length === 0) return null;
  const currentVersion = history.length + 1;

  return (
    <div style={{ padding: "0 8px 8px" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ ...mono, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "#3E8ED0", background: "#E5F0FC", border: "none", borderRadius: 8, cursor: "pointer" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={11} /> Revision history ({history.length} prior version{history.length === 1 ? "" : "s"})
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 10, background: "#FAFAFA", border: `1px solid ${G.border}`, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Most recent revisions first */}
          {[...history].reverse().map((v, i) => (
            <div key={i} style={{ paddingBottom: 10, borderBottom: i < history.length - 1 ? `1px solid ${G.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 980, background: "#fff", color: G.textSec, border: `1px solid ${G.border}` }}>V{v.version}</span>
                <span style={{ ...mono, fontSize: 10, color: G.textTer }}>
                  Replaced {new Date(v.replacedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              {kind === "image" && v.url && (
                <a href={v.url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                  <img src={v.url} alt={v.name || ""} style={{ width: "100%", maxHeight: 140, objectFit: "contain", borderRadius: 6, border: `1px solid ${G.border}`, background: "#fff" }} />
                </a>
              )}
              {/* Feedback that triggered the replacement */}
              {(v.feedbackComments?.length > 0 || v.feedbackStatus) && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff", borderLeft: `3px solid ${clr.revision}`, borderRadius: 6 }}>
                  {v.feedbackStatus && (
                    <p style={{ ...mono, fontSize: 10, color: clr.revision, fontWeight: 600, margin: 0, marginBottom: v.feedbackComments?.length > 0 ? 4 : 0 }}>
                      Status was: {v.feedbackStatus}
                    </p>
                  )}
                  {(v.feedbackComments || []).map((c, ci) => (
                    <p key={ci} style={{ ...mono, fontSize: 11, color: G.text, lineHeight: 1.5, margin: 0, marginTop: ci > 0 ? 4 : 0 }}>
                      &ldquo;{c.text}&rdquo;
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p style={{ ...mono, fontSize: 10, color: G.textTer, margin: 0, textAlign: "center" }}>
            Currently viewing V{currentVersion}
          </p>
        </div>
      )}
    </div>
  );
}

// Per-script mood board: team-uploaded reference frames the client can preview.
// Has its own approve / revise / reject status (stored under itemId `moodboard-<scriptId>`)
// and its own comment thread, separate from the script itself.
function MoodBoardSection({ script, max, status, comments, saving, onSetStatus, onAddComment, onDeleteComment, viewerSender = "client" }) {
  const moodBoard = script.moodBoard || [];
  const [showFeedback, setShowFeedback] = useState(false);
  const [text, setText] = useState("");
  const [lightbox, setLightbox] = useState(null); // image url for the on-page modal
  if (moodBoard.length === 0) return null;

  // Different framing for Hero vs UGC. UGC is selfie-style with one influencer,
  // so the reference frame is mostly about the talent and visual style. Hero is
  // a multi-scene cinematic spot, so the mood board is a 6-frame storyboard.
  const isUgc = max === 1;
  const sectionLabel = isUgc ? "Influencer & Style Reference" : "Mood Board";
  const sectionSub = isUgc
    ? "This is selfie-style content with one influencer talking direct-to-camera. Approve the talent, wardrobe, lighting, and overall vibe, or tell us what to change before we create the full video."
    : "A preview of the image direction and frames for the video. Approve the visual direction, casting, and scene composition, or tell us what to change before we create the full video.";

  return (
    <div style={{ marginTop: 14, marginBottom: 32, padding: 16, background: "#FAFAFA", border: `1px solid ${G.border}`, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
          <Image size={14} color={G.textSec} style={{ marginTop: 3, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: G.text, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              {sectionLabel}
            </span>
            <span style={{ ...mono, fontSize: 12, color: G.textSec, lineHeight: 1.5, display: "block" }}>{sectionSub}</span>
          </div>
        </div>
        <StatusBtns
          status={status}
          onApprove={() => onSetStatus("approved")}
          onReject={() => onSetStatus("rejected")}
          onRevision={() => onSetStatus("revision")}
        />
      </div>
      {/* Frames render in the ratio the team chose when uploading (9:16 default,
          flippable to 16:9). Each frame is capped at 220px so a single UGC frame
          doesn't take over the page in vertical mode. Click to expand. */}
      {(() => {
        const frameRatio = script.moodBoardRatio || "9/16";
        const frameMax = max === 1 ? (frameRatio === "9/16" ? 220 : 360) : 200;
        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(140px, ${frameMax}px))`, gap: 8, marginBottom: 12, justifyContent: max === 1 ? "center" : "start" }}>
            {moodBoard.map((img, i) => (
              <div key={img.id || i} style={{ position: "relative", aspectRatio: frameRatio, borderRadius: 10, overflow: "hidden", background: "#fff", border: `1px solid ${G.border}`, cursor: "zoom-in" }}
                onClick={() => setLightbox(img.url)}>
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        );
      })()}
      {/* In-page lightbox for mood board images - opens on the page, not a new tab */}
      {lightbox && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, cursor: "zoom-out" }}>
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <X size={20} />
          </button>
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
      {/* Existing comments - always shown so the team's notes stay visible */}
      {comments?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {comments.map((c, i) => {
            const canDelete = onDeleteComment && (c.sender || "client") === viewerSender;
            const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
            return (
              <div key={i} style={{ background: "#fff", border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px", position: "relative" }}>
                <p style={{ ...mono, fontSize: 12, color: G.text, lineHeight: 1.55, whiteSpace: "pre-wrap", margin: 0, paddingRight: canDelete ? 24 : 0 }}>{c.text}</p>
                <span style={{ ...mono, fontSize: 10, color: G.textTer, marginTop: 3, display: "block" }}>
                  {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                {canDelete && (
                  <button onClick={() => onDeleteComment(`moodboard-${script.id}`, c.date)} title="Delete comment"
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = clr.reject; e.currentTarget.style.borderColor = clr.reject; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textSec; }}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Add-comment box only appears once the user clicks Revision on the mood board */}
      {status !== "revision" ? null : !showFeedback ? (
        <button onClick={() => setShowFeedback(true)} style={{ ...mono, padding: "6px 14px", fontSize: 11, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <MessageSquare size={11} /> Tell us what to revise
        </button>
      ) : (
        <div>
          <textarea value={text} onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder="What works? What doesn't?" autoFocus
            style={{ ...mono, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${G.border}`, borderRadius: 8, outline: "none", background: "#fff", color: G.text, boxSizing: "border-box", resize: "none", minHeight: 56, lineHeight: 1.5, overflow: "hidden" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button disabled={!text.trim() || saving} onClick={() => { onAddComment(text.trim()); setText(""); setShowFeedback(false); }}
              style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.4 }}>
              {saving ? "Saving..." : "Submit"}
            </button>
            <button onClick={() => { setShowFeedback(false); setText(""); }}
              style={{ ...mono, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScriptBreakdownView({ content, scriptId, feedback, onAddComment, onDeleteComment, saving, viewerSender = "client" }) {
  const bd = breakdownScript(content);
  const [activeLine, setActiveLine] = useState(null); // { lineIdx, selection }
  const [submitting, setSubmitting] = useState(false);
  const [hoverLine, setHoverLine] = useState(null);
  const [selectionPopup, setSelectionPopup] = useState(null); // { lineIdx, text, x, y }

  // Empty script content: render nothing instead of a "No content yet" message,
  // since the video review surface above is the primary review tool.
  if (!bd.sections.length) return null;

  const lineComments = (feedback?.[scriptId]?.comments || []).filter(c => typeof c.line === "number");
  const commentsByLine = {};
  for (const c of lineComments) {
    if (!commentsByLine[c.line]) commentsByLine[c.line] = [];
    commentsByLine[c.line].push(c);
  }

  const handleMouseUp = (e, lineIdx) => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    const selText = sel?.toString().trim();
    if (selText && selText.length > 1 && selText.length < 300) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopup({ lineIdx, text: selText, x: rect.left + rect.width / 2, y: rect.top - 8 });
    } else {
      setSelectionPopup(null);
    }
  };

  const submitComment = async (text) => {
    if (!activeLine) return;
    setSubmitting(true);
    const payload = { text, line: activeLine.lineIdx };
    if (activeLine.selection) payload.selection = activeLine.selection;
    await onAddComment(scriptId, text, payload);
    setSubmitting(false);
    setActiveLine(null);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 24, padding: "10px 16px", background: "#F5F5F7", borderRadius: 10, border: `1px solid ${G.border}`, width: "fit-content" }}>
        <Clock size={13} color={G.textSec} />
        <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: G.text }}>Estimated Length: {bd.totalFormatted}</span>
      </div>
      <p style={{ ...mono, fontSize: 11, color: G.textTer, marginBottom: 16, fontStyle: "italic" }}>
        💡 Click a line to comment, or highlight any text to comment on a specific phrase.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {bd.sections.map((s, i) => {
          const comments = commentsByLine[i] || [];
          const isActive = activeLine?.lineIdx === i;
          const isHover = hoverLine === i;
          return (
            <div key={i}
              onMouseEnter={() => setHoverLine(i)}
              onMouseLeave={() => setHoverLine(null)}
              onMouseUp={(e) => handleMouseUp(e, i)}
              onClick={(e) => {
                // Ignore clicks inside the active comment box or existing comments
                if (e.target.closest("textarea, button, [data-no-line-click]")) return;
                // Only open line box if no text is selected (selection opens via its own button)
                if (typeof window !== "undefined" && !window.getSelection()?.toString().trim()) {
                  setActiveLine({ lineIdx: i, selection: null });
                }
              }}
              style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < bd.sections.length - 1 ? `1px solid ${G.border}` : "none", background: isHover || isActive ? "#FAFAFA" : "transparent", transition: "background 0.15s", borderRadius: 4, margin: "0 -8px", paddingLeft: 8, paddingRight: 8, cursor: "pointer" }}
            >
              <div style={{ flex: "0 0 80px", textAlign: "right" }}>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "#1D1D1F", background: "#F5F5F7", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {s.startFormatted}–{s.endFormatted}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{s.sceneDesc}</span>
                  {comments.length > 0 && (
                    <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 980, background: "#E5F0FC", color: "#3E8ED0", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                      <MessageSquare size={10} /> {comments.length}
                    </span>
                  )}
                </div>
                <p style={{ ...mono, color: "#6E6E73", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, cursor: "text", userSelect: "text" }}>
                  {s.text}
                </p>
                {/* Existing line comments */}
                {comments.length > 0 && (
                  <div data-no-line-click style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {comments.map((c, ci) => {
                      const canDelete = onDeleteComment && (c.sender || "client") === viewerSender;
                      const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
                      return (
                        <div key={ci} style={{ padding: "8px 12px", background: "#F5F5F7", borderRadius: 8, borderLeft: `3px solid ${c.sender === "team" ? "#34C759" : "#3E8ED0"}`, position: "relative" }}>
                          {c.selection && (
                            <div style={{ ...mono, fontSize: 11, color: G.textTer, marginBottom: 4, fontStyle: "italic" }}>
                              on &ldquo;{c.selection}&rdquo;
                            </div>
                          )}
                          <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", paddingRight: canDelete ? 24 : 0 }}>{c.text}</p>
                          <span style={{ ...mono, fontSize: 10, color: G.textTer, marginTop: 3, display: "block" }}>
                            {who} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {canDelete && (
                            <button onClick={() => onDeleteComment(scriptId, c.date)} title="Delete comment"
                              style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = clr.reject; e.currentTarget.style.borderColor = clr.reject; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textSec; }}>
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Active comment box for this line */}
                {isActive && (
                  <div data-no-line-click>
                    <LineCommentBox
                      lineIdx={i}
                      selection={activeLine.selection}
                      saving={submitting}
                      onSubmit={submitComment}
                      onCancel={() => setActiveLine(null)}
                    />
                  </div>
                )}
              </div>
              {/* Per-line Revise button - only visible on hover, sits on the right side */}
              <div data-no-line-click style={{ flex: "0 0 auto", alignSelf: "flex-start" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveLine({ lineIdx: i, selection: null }); }}
                  style={{ ...mono, opacity: isHover || isActive ? 1 : 0, transition: "opacity 0.15s", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 980, fontSize: 11, fontWeight: 600, background: clr.revision, color: "#fff", border: "none", cursor: isHover || isActive ? "pointer" : "default", whiteSpace: "nowrap", pointerEvents: isHover || isActive ? "auto" : "none" }}>
                  <RefreshCw size={11} /> Revise
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Floating "Comment on selection" button */}
      {selectionPopup && (
        <div
          style={{
            position: "fixed", left: selectionPopup.x, top: selectionPopup.y,
            transform: "translate(-50%, -100%)", zIndex: 500,
          }}
        >
          <button
            onClick={() => {
              setActiveLine({ lineIdx: selectionPopup.lineIdx, selection: selectionPopup.text });
              if (typeof window !== "undefined") window.getSelection()?.removeAllRanges();
              setSelectionPopup(null);
            }}
            style={{ ...mono, display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 980, background: G.gold, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}
          >
            <MessageSquare size={12} /> Comment on selection
          </button>
        </div>
      )}
    </div>
  );
}

function StatusMark({ status }) {
  const c = status === "approved" ? clr.approve : status === "rejected" ? clr.reject : status === "revision" ? clr.revision : null;
  if (!c) return null;
  const Icon = status === "approved" ? Check : status === "rejected" ? X : RefreshCw;
  const sz = status === "revision" ? 16 : 18;
  return (
    <div style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, background: c, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, boxShadow: `0 2px 8px ${c}44` }}>
      <Icon size={sz} strokeWidth={3} color="#fff" />
    </div>
  );
}

export default function ClientReview({ projectId: serverProjectId }) {
  const params = useParams();
  const projectId = serverProjectId || params.projectId;
  const [project, setProject] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState("images");
  const [saving, setSaving] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  // Client portal is now openly accessible - no password gate.
  // (Team routes are still middleware-protected.)
  const [authed, setAuthed] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [slug, setSlug] = useState(null);
  const [customPassword, setCustomPassword] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [zipping, setZipping] = useState(null);
  const [zipProgress, setZipProgress] = useState("");
  // One modal handles both Reject and Revision — both require the client to
  // explain WHY before the status flips, so the team has actionable feedback.
  // kind: "rejected" | "revision"
  const [feedbackModal, setFeedbackModal] = useState(null); // { itemId, kind }
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`portal_auth_${projectId}`);
      if (stored === "true") setAuthed(true);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    // Fetch project slug for password validation
    fetch(`/api/portal/projects/${projectId}`).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(data => {
      setSlug(data.slug || data.clientName?.toLowerCase().replace(/\s+/g, "") || projectId);
      if (data.password) setCustomPassword(data.password);
      if (authed) {
        setProject(data);
        fetch(`/api/portal/feedback?projectId=${projectId}`).then(r => r.json()).then(fb => setFeedback(fb));
        // If portal is linked to a client, propagate auth to the client hub so the
        // client doesn't have to log in again to access the unified BI hub.
        if (typeof window !== "undefined" && data.clientName) {
          const clientSlug = data.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          if (clientSlug) localStorage.setItem(`client_hub_auth_${clientSlug}`, "true");
        }
      }
    }).catch(() => setNotFound(true));
  }, [projectId, authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    const input = password.trim();
    const fallback = `${(slug || projectId).toLowerCase()}2026`;
    const valid = customPassword
      ? input === customPassword
      : input.toLowerCase() === fallback;
    if (valid) {
      setAuthed(true);
      setAuthError(false);
      localStorage.setItem(`portal_auth_${projectId}`, "true");
    } else {
      setAuthError(true);
    }
  };

  const applyStatus = async (itemId, val) => {
    setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], status: val } }));
    setExpandedItem(val === "revision" ? itemId : null);
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, itemId, status: val }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("[status] save failed", res.status, errBody);
      }
    } catch (e) {
      console.error("[status] save threw", e);
    }
    // Notify the parent (client hub) so the sidebar pending badge updates in real time
    try {
      if (typeof window !== "undefined" && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "creatives:status-change", itemId, status: val }, "*");
      }
    } catch (e) { /* postMessage to a different origin may throw; safe to ignore */ }
  };

  const setItemStatus = async (itemId, newStatus) => {
    const current = feedback[itemId]?.status;
    const val = current === newStatus ? null : newStatus;
    // Reject AND Revision both require a reason — the team can't act on a
    // bare "send back" with no context. Toggling OFF (val === null) skips
    // the modal and just clears the status.
    if ((newStatus === "rejected" || newStatus === "revision") && val === newStatus) {
      setFeedbackReason("");
      setFeedbackModal({ itemId, kind: newStatus });
      return;
    }
    await applyStatus(itemId, val);
  };

  const submitFeedback = async () => {
    if (!feedbackModal || !feedbackReason.trim()) return;
    setFeedbackSubmitting(true);
    const itemId = feedbackModal.itemId;
    const kind = feedbackModal.kind; // "rejected" | "revision"
    const reason = feedbackReason.trim();
    // Apply status FIRST so the decision persists even if the comment save
    // fails. Run both in parallel and don't let one failure block the other.
    const statusP = applyStatus(itemId, kind).catch(e => {
      console.error(`[${kind}] status save failed`, e);
    });
    const commentP = fetch("/api/portal/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, itemId, addComment: reason, sender: "client" }),
    }).then(r => r.json()).then(data => {
      if (data?.comments) {
        setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: data.comments } }));
      }
    }).catch(e => {
      console.error(`[${kind}] comment save failed`, e);
    });
    try {
      await Promise.all([statusP, commentP]);
    } finally {
      setFeedbackSubmitting(false);
      setFeedbackModal(null);
      setFeedbackReason("");
    }
  };

  const onAddComment = useCallback(async (itemId, text, meta) => {
    // Optimistic: append the comment to local state immediately so the UI feels
    // instant. Reconcile with the server's authoritative list once the request
    // returns. Restore on failure.
    const optimistic = {
      text,
      date: new Date().toISOString(),
      sender: "client",
      senderName: project?.clientName || "Client",
    };
    if (meta && typeof meta === "object") {
      if (typeof meta.line === "number") optimistic.line = meta.line;
      if (meta.selection) optimistic.selection = meta.selection;
      if (typeof meta.videoTimestamp === "number") optimistic.videoTimestamp = meta.videoTimestamp;
    }
    let snapshot;
    setFeedback(prev => {
      snapshot = prev[itemId]?.comments;
      return { ...prev, [itemId]: { ...prev[itemId], comments: [...(prev[itemId]?.comments || []), optimistic] } };
    });

    const body = { projectId, itemId, addComment: text, sender: "client", senderName: project?.clientName || "Client" };
    if (meta && typeof meta === "object") {
      if (typeof meta.line === "number") body.commentLine = meta.line;
      if (meta.selection) body.commentSelection = meta.selection;
      if (typeof meta.videoTimestamp === "number") body.commentVideoTimestamp = meta.videoTimestamp;
    }
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: data.comments } }));
    } catch (e) {
      console.error("[comment] save failed, restoring", e);
      if (snapshot) setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: snapshot } }));
    }
  }, [projectId, project?.clientName]);

  // Allow the client to delete their own comments. Optimistic UI: drop the
  // comment from state immediately so the click feels instant, then sync to
  // the server in the background. Restore on failure.
  const onDeleteComment = useCallback(async (itemId, commentDate) => {
    let snapshot;
    setFeedback(prev => {
      snapshot = prev[itemId]?.comments;
      const next = (prev[itemId]?.comments || []).filter(c => c.date !== commentDate);
      return { ...prev, [itemId]: { ...prev[itemId], comments: next } };
    });
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, itemId, removeCommentDate: commentDate }),
      });
      if (!res.ok) throw new Error("delete failed");
      // Reconcile with the server's authoritative list (cheap, doesn't block UI)
      const data = await res.json();
      setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: data.comments } }));
    } catch (e) {
      console.error("delete comment failed, restoring", e);
      if (snapshot) setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: snapshot } }));
    }
  }, [projectId]);

  const downloadAsZip = async (images, kind) => {
    if (!images || images.length === 0) {
      alert(kind === "approved" ? "No approved images yet." : "No images to download.");
      return;
    }
    setZipping(kind);
    setZipProgress(`0/${images.length}`);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let done = 0;
      const failures = [];
      const pad = String(images.length).length;
      const usedNames = new Set();

      // Sequential processing - guarantees order and uniqueness
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const seq = String(i + 1).padStart(pad, "0");
        let success = false;
        // Retry up to 3 times on failure
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            const url = `/api/download-image?url=${encodeURIComponent(img.url)}&name=image.png`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const ab = await resp.arrayBuffer();
            if (ab.byteLength === 0) throw new Error("Empty response");
            // Build a guaranteed-unique filename. If somehow it's taken, append a suffix.
            let filename = `${(project.clientName || "image").replace(/[\/\\]/g, "_")}-${seq}.png`;
            let dupe = 2;
            while (usedNames.has(filename)) {
              filename = `${(project.clientName || "image").replace(/[\/\\]/g, "_")}-${seq}-${dupe}.png`;
              dupe++;
            }
            usedNames.add(filename);
            zip.file(filename, ab);
            console.log(`[zip] added ${filename} (${ab.byteLength} bytes)`);
            success = true;
          } catch (e) {
            console.error(`Attempt ${attempt + 1} failed for image #${i + 1} (${img.url}):`, e.message);
            if (attempt === 2) failures.push({ idx: i + 1, url: img.url, error: e.message });
          }
        }
        done++;
        setZipProgress(`${done}/${images.length}`);
      }

      // Verify zip contents match what we added
      const filesInZip = Object.keys(zip.files).length;
      const expected = images.length - failures.length;
      console.log(`[zip] Final: ${filesInZip} files in zip, expected ${expected}, failures: ${failures.length}`);

      if (failures.length > 0) {
        console.error("Download failures:", failures);
        const failedList = failures.slice(0, 5).map(f => `#${f.idx}: ${f.error}`).join("\n");
        const proceed = confirm(
          `${failures.length} of ${images.length} image(s) failed to download:\n${failedList}\n\nDownload the ${filesInZip} that succeeded?`
        );
        if (!proceed) {
          setZipping(null);
          setZipProgress("");
          return;
        }
      } else if (filesInZip !== expected) {
        alert(`Warning: expected ${expected} files but zip contains ${filesInZip}. Some may have been deduplicated.`);
      }

      const content = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (metadata) => setZipProgress(`${Math.round(metadata.percent)}%`)
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${(project.clientName || "assets").replace(/[\/\\]/g, "_")}-${kind}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error("Zip error:", e);
      alert("Failed to create zip. Please try again.");
    } finally {
      setZipping(null);
      setZipProgress("");
    }
  };

  if (notFound) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <h2 style={{ ...hd, fontSize: 32, color: G.text }}>Project Not Found</h2>
      <p style={{ ...mono, color: G.textSec, fontSize: 15 }}>This link may be invalid or the project has been removed.</p>
    </div>
  );

  if (!authed) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, maxWidth: "calc(100vw - 48px)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} style={{ color: G.gold }} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY</span>
        </div>
        <h2 style={{ ...hd, fontSize: 28, color: G.text, marginBottom: 8 }}>Welcome</h2>
        <p style={{ ...mono, fontSize: 14, color: G.textSec, marginBottom: 32 }}>Enter your password to view assets</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
            placeholder="Password"
            autoFocus
            style={{
              ...mono, width: "100%", padding: "14px 20px", fontSize: 15,
              border: `1px solid ${authError ? "#E5484D" : G.border}`, borderRadius: 12,
              outline: "none", background: G.bg, color: G.text, boxSizing: "border-box",
              transition: "border-color 0.15s", textAlign: "center", letterSpacing: "0.1em",
            }}
          />
          {authError && <p style={{ ...mono, fontSize: 13, color: "#E5484D", marginTop: 8 }}>Incorrect password</p>}
          <button type="submit" style={{
            ...mono, width: "100%", padding: "14px 0", marginTop: 16, fontSize: 15,
            fontWeight: 600, background: G.gold, color: "#fff", border: "none",
            borderRadius: 980, cursor: "pointer", transition: "opacity 0.2s",
          }}>
            View Assets
          </button>
        </form>
      </div>
    </div>
  );

  if (!project) return <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: G.textTer }}>Loading...</p></div>;

  // Loops are filled-only — empty slots (no videoUrl) shouldn't count toward
  // the "items to review" total or the validIds set used for feedback dedup.
  const filledLoops = (project.loopVideos || []).filter(v => v.videoUrl);
  const totalItems = (project.images?.length || 0) + (project.heroScripts?.length || 0) + (project.ugcScripts?.length || 0) + filledLoops.length;
  const validIds = new Set([
    ...(project.images || []).map(x => x.id),
    ...(project.heroScripts || []).map(x => x.id),
    ...(project.ugcScripts || []).map(x => x.id),
    ...filledLoops.map(x => x.id),
  ]);
  const liveFeedback = Object.entries(feedback).filter(([id]) => validIds.has(id)).map(([, f]) => f);
  const approvedCount = liveFeedback.filter(f => f.status === "approved").length;
  const rejectedCount = liveFeedback.filter(f => f.status === "rejected").length;
  const revisionCount = liveFeedback.filter(f => f.status === "revision").length;
  const feedbackCount = liveFeedback.reduce((sum, f) => sum + (f.comments?.length || 0), 0);

  const tabs = [
    { key: "images", label: "Images", count: project.images?.length || 0 },
    { key: "hero", label: "Hero Videos", count: project.heroScripts?.length || 0 },
    { key: "ugc", label: "UGC Videos", count: project.ugcScripts?.length || 0 },
    { key: "loop", label: "Loops", count: filledLoops.length },
  ];

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </div>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>{project.clientName}</span>
        </nav>

        {/* Mobile-friendly: shrink the header chrome so images aren't pushed
            way below the fold on a phone. Stats stack 2-up instead of wrap-
            chaotic; tabs become a horizontal scroll strip with tighter padding. */}
        <style>{`
          @media (max-width: 768px) {
            .pc-header { padding: 20px 0 16px !important; }
            .pc-header h1 { font-size: 32px !important; }
            .pc-header .pc-pill { padding: 6px 14px !important; font-size: 11px !important; margin-bottom: 14px !important; }
            .pc-stats { gap: 8px !important; margin-bottom: 20px !important; }
            .pc-stats > div { flex: 1 1 calc(50% - 4px) !important; min-width: 0 !important; padding: 12px 14px !important; }
            .pc-stats > div p:first-child { font-size: 11px !important; }
            .pc-stats > div p:last-child { font-size: 28px !important; }
            .pc-tabs { overflow-x: auto; flex-wrap: nowrap !important; margin-bottom: 20px !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
            .pc-tabs::-webkit-scrollbar { display: none; }
            .pc-tabs button { flex: 0 0 auto !important; padding: 8px 14px !important; font-size: 12px !important; white-space: nowrap; }
          }
        `}</style>

        {/* Header */}
        <section className="pc-header" style={{ textAlign: "center", padding: "48px 0 40px" }}>
          <div className="pc-pill" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 24 }}>
            <Sparkles size={14} style={{ color: G.gold }} />
            <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>{project.clientName}&apos;s Assets</span>
          </div>
          <h1 style={{ ...hd, fontSize: 52, color: G.text, lineHeight: 1.1, marginBottom: 0 }}>Creative <span style={{ fontStyle: "italic" }}>Review</span></h1>
        </section>

        {/* Stats */}
        <div className="pc-stats" style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          {[{ label: "Total Assets", value: totalItems }, { label: "Approved", value: approvedCount, c: clr.approve }, { label: "Rejected", value: rejectedCount, c: clr.reject }, { label: "Revisions", value: revisionCount, c: clr.revision }, { label: "Feedback", value: feedbackCount }].map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: 120, background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 20, padding: "24px 28px" }}>
              <p style={{ ...mono, color: G.textSec, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
              <p style={{ ...hd, fontSize: 42, color: s.c || G.text }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="pc-tabs" style={{ display: "flex", gap: 4, background: "#F5F5F7", padding: 4, borderRadius: 980, marginBottom: 40, border: `1px solid ${G.border}` }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ ...mono, flex: 1, padding: "10px 24px", borderRadius: 980, fontSize: 14, fontWeight: activeTab === t.key ? 600 : 500, cursor: "pointer", border: "none", transition: "all 0.2s",
                background: activeTab === t.key ? G.gold : "transparent",
                color: activeTab === t.key ? "#fff" : G.textSec,
              }}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All", count: totalItems },
            { key: "approved", label: "Approved", count: approvedCount, color: clr.approve },
            { key: "revision", label: "Revisions", count: revisionCount, color: clr.revision },
            { key: "rejected", label: "Rejected", count: rejectedCount, color: clr.reject },
            { key: "pending", label: "Pending", count: totalItems - approvedCount - rejectedCount - revisionCount, color: G.textSec },
          ].map(f => {
            const active = statusFilter === f.key;
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 980, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  background: active ? (f.color || G.gold) : "transparent",
                  color: active ? "#fff" : (f.color || G.textSec),
                  border: `1px solid ${active ? (f.color || G.gold) : (f.color ? f.color + "30" : G.border)}`,
                }}>
                {f.label} ({f.count})
              </button>
            );
          })}
        </div>

        {/* ─── Images ─── */}
        {activeTab === "images" && (
          <div>
            <style>{`
              .portal-img-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
              @media (max-width: 768px) { .portal-img-grid { grid-template-columns: 1fr; gap: 16px; } }
            `}</style>
            {(!project.images || project.images.length === 0) ? (
              <div style={{ textAlign: "center", padding: 60, color: G.textTer }}><p>No images uploaded yet.</p></div>
            ) : (
              <div className="portal-img-grid">
                {project.images.filter(img => {
                  if (statusFilter === "all") return true;
                  const st = feedback[img.id]?.status || null;
                  if (statusFilter === "pending") return !st;
                  return st === statusFilter;
                }).map((img, idx) => {
                  const st = feedback[img.id]?.status;
                  const borderColor = st === "approved" ? clr.approve : st === "rejected" ? clr.reject : st === "revision" ? clr.revision : G.cardBorder;
                  const shadow = st ? `0 0 0 2px ${borderColor}` : G.cardShadow;
                  const commentCount = feedback[img.id]?.comments?.length || 0;
                  return (
                    <div key={img.id} style={{ background: G.card, border: `1px solid ${borderColor}`, boxShadow: shadow, borderRadius: 16, overflow: "hidden", transition: "all 0.2s" }}>
                      <div onClick={() => setLightboxIdx(project.images.findIndex(i => i.id === img.id))} style={{ position: "relative", cursor: "pointer" }}>
                        <StatusMark status={st} />
                        <a
                          href={`/api/download-image?url=${encodeURIComponent(img.url)}&name=${encodeURIComponent(`${project.clientName}-image-${project.images.findIndex(i => i.id === img.id) + 1}.png`)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D1D1F", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", zIndex: 3 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,1)"; e.currentTarget.style.transform = "scale(1.05)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          <Download size={14} />
                        </a>
                        <img src={img.url} alt="" style={{ width: "100%", aspectRatio: project.imageRatio || "1/1", objectFit: "cover", display: "block" }} />
                        {commentCount > 0 && (
                          <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", borderRadius: 980, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                            <MessageSquare size={10} color="#fff" />
                            <span style={{ ...mono, fontSize: 10, color: "#fff", fontWeight: 600 }}>{commentCount}</span>
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.4)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>
                          <ZoomIn size={14} color="#fff" />
                        </div>
                      </div>
                      <div style={{ padding: "8px 6px", display: "flex", gap: 4, justifyContent: "center" }}>
                        <button onClick={() => setItemStatus(img.id, "approved")} style={{ ...mono, flex: 1, padding: "5px 0", fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: `1px solid ${st === "approved" ? clr.approve : clr.approve + "30"}`, background: st === "approved" ? clr.approve : "transparent", color: st === "approved" ? "#fff" : clr.approve, transition: "all 0.15s" }}>Approve</button>
                        <button onClick={() => setItemStatus(img.id, "revision")} style={{ ...mono, flex: 1, padding: "5px 0", fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: `1px solid ${st === "revision" ? clr.revision : clr.revision + "30"}`, background: st === "revision" ? clr.revision : "transparent", color: st === "revision" ? "#fff" : clr.revision, transition: "all 0.15s" }}>Revise</button>
                        <button onClick={() => setItemStatus(img.id, "rejected")} style={{ ...mono, flex: 1, padding: "5px 0", fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: `1px solid ${st === "rejected" ? clr.reject : clr.reject + "30"}`, background: st === "rejected" ? clr.reject : "transparent", color: st === "rejected" ? "#fff" : clr.reject, transition: "all 0.15s" }}>Reject</button>
                      </div>
                      {/* Size variants live at the very bottom of the card so
                          all cards' approve/revise/reject buttons stay on the
                          same horizontal line in the grid. Only renders when
                          variants exist. */}
                      {(img.variants || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 8px 8px", justifyContent: "center" }}>
                          {img.variants.map(v => (
                            <a key={v.id} href={v.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                              style={{ ...mono, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 980, background: "#1D1D1F", color: "#fff", textDecoration: "none" }}
                              title={`Open ${v.dimensions} variant`}>
                              {v.dimensions.replace("x", "×")}
                            </a>
                          ))}
                        </div>
                      )}
                      <VersionChain item={img} kind="image" />
                      {expandedItem === img.id && (
                        <div style={{ padding: "0 6px 8px" }}>
                          <FeedbackBox itemId={img.id} feedback={feedback} saving={saving} onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {project.images && project.images.length > 0 && (
              <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => downloadAsZip(project.images.filter(img => feedback[img.id]?.status === "approved"), "approved")}
                  disabled={zipping}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 28px", borderRadius: 980,
                    background: clr.approve, color: "#fff", border: "none",
                    fontSize: 14, fontWeight: 600, cursor: zipping ? "wait" : "pointer",
                    transition: "opacity 0.2s", opacity: zipping ? 0.6 : 1, ...mono,
                  }}
                  onMouseEnter={e => { if (!zipping) e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { if (!zipping) e.currentTarget.style.opacity = "1"; }}
                >
                  <Download size={16} />
                  {zipping === "approved" ? `Zipping... ${zipProgress}` : `Download Approved (${project.images.filter(img => feedback[img.id]?.status === "approved").length})`}
                </button>
                <button
                  onClick={() => downloadAsZip(project.images, "all")}
                  disabled={zipping}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 28px", borderRadius: 980,
                    background: G.gold, color: "#fff", border: "none",
                    fontSize: 14, fontWeight: 600, cursor: zipping ? "wait" : "pointer",
                    transition: "opacity 0.2s", opacity: zipping ? 0.6 : 1, ...mono,
                  }}
                  onMouseEnter={e => { if (!zipping) e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { if (!zipping) e.currentTarget.style.opacity = "1"; }}
                >
                  <Download size={16} />
                  {zipping === "all" ? `Zipping... ${zipProgress}` : "Download All Images"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Lightbox ─── */}
        {lightboxIdx !== null && project.images?.[lightboxIdx] && (() => {
          const img = project.images[lightboxIdx];
          const st = feedback[img.id]?.status;
          const isExpanded = expandedItem === img.id;
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={(e) => { if (e.target === e.currentTarget) { setLightboxIdx(null); setExpandedItem(null); } }}>
              {/* Close */}
              <button onClick={() => { setLightboxIdx(null); setExpandedItem(null); }} style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <X size={20} color="#fff" />
              </button>
              {/* Prev */}
              {lightboxIdx > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); setExpandedItem(null); }} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <ChevronLeft size={24} color="#fff" />
                </button>
              )}
              {/* Next */}
              {lightboxIdx < project.images.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); setExpandedItem(null); }} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <ChevronRight size={24} color="#fff" />
                </button>
              )}
              {/* Content */}
              <style>{`
                .lb-wrap { display: flex; flex-direction: row; gap: 24px; max-width: 1100px; width: 90%; max-height: 90vh; align-items: flex-start; }
                .lb-img { flex: 1 1 60%; max-height: 85vh; object-fit: contain; border-radius: 16px; max-width: 100%; }
                .lb-panel { flex: 0 0 320px; background: ${G.card}; border-radius: 20px; padding: 24px; max-height: 85vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
                @media (max-width: 768px) {
                  .lb-wrap { flex-direction: column; align-items: center; width: 94%; max-height: 95vh; overflow-y: auto; gap: 16px; padding: 12px 0; }
                  .lb-img { flex: none; width: 100%; max-height: 60vh; border-radius: 12px; }
                  .lb-panel { flex: none; width: 100%; max-height: none; border-radius: 16px; padding: 20px; }
                }
              `}</style>
              <div className="lb-wrap" onClick={(e) => e.stopPropagation()}>
                <img src={img.url} alt="" className="lb-img" />
                <div className="lb-panel">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <p style={{ ...mono, fontSize: 12, color: G.textTer }}>{lightboxIdx + 1} of {project.images.length}</p>
                    <a
                      href={`/api/download-image?url=${encodeURIComponent(img.url)}&name=${encodeURIComponent(`${project.clientName}-image-${lightboxIdx + 1}.png`)}`}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#F5F5F7", border: `1px solid ${G.border}`, color: G.text, textDecoration: "none", fontSize: 12, fontWeight: 600, transition: "all 0.2s", ...mono }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#E8E8ED"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#F5F5F7"; }}
                    >
                      <Download size={12} /> Download
                    </a>
                  </div>
                  <StatusBtns status={st} onApprove={() => setItemStatus(img.id, "approved")} onReject={() => setItemStatus(img.id, "rejected")} onRevision={() => setItemStatus(img.id, "revision")} />
                  <div style={{ marginTop: 20 }}>
                    <FeedbackBox itemId={img.id} feedback={feedback} saving={saving} onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── Hero Scripts ─── */}
        {activeTab === "hero" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {(!project.heroScripts || project.heroScripts.length === 0) ? (
              <div style={{ textAlign: "center", padding: 60, color: G.textTer }}><p>No hero scripts uploaded yet.</p></div>
            ) : project.heroScripts.filter(script => {
              if (statusFilter === "all") return true;
              const st = feedback[script.id]?.status || null;
              if (statusFilter === "pending") return !st;
              return st === statusFilter;
            }).map(script => {
              const st = feedback[script.id]?.status;
              const isExpanded = expandedItem === script.id;
              const borderColor = st === "approved" ? clr.approve : st === "rejected" ? clr.reject : st === "revision" ? clr.revision : G.cardBorder;
              const shadow = st ? `0 0 0 2px ${borderColor}` : G.cardShadow;
              return (
                <div key={script.id} style={{ position: "relative", background: G.card, border: `1px solid ${borderColor}`, boxShadow: shadow, borderRadius: 20, padding: 28, transition: "all 0.2s" }}>
                  <StatusMark status={st} />
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ ...hd, fontSize: 22, color: G.text }}>{script.title}</span>
                  </div>
                  <MoodBoardSection
                    script={script}
                    max={6}
                    status={feedback[`moodboard-${script.id}`]?.status}
                    comments={feedback[`moodboard-${script.id}`]?.comments}
                    saving={saving[`moodboard-${script.id}`]}
                    onSetStatus={(val) => setItemStatus(`moodboard-${script.id}`, val)}
                    onAddComment={(text) => onAddComment(`moodboard-${script.id}`, text)}
                    onDeleteComment={onDeleteComment}
                    viewerSender="client"
                  />
                  <VideoReviewPlayer script={script} scriptId={script.id} feedback={feedback}
                    onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  <ScriptBreakdownView content={script.content} scriptId={script.id} feedback={feedback} onAddComment={onAddComment} onDeleteComment={onDeleteComment} saving={saving[script.id]} viewerSender="client" />
                  {/* General feedback box only appears when the user has clicked Revision (or has existing comments) */}
                  {(feedback[script.id]?.status === "revision" || (feedback[script.id]?.comments || []).filter(c => typeof c.line !== "number").length > 0) && (
                    <FeedbackBox itemId={script.id} feedback={feedback} saving={saving} onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  )}
                  {/* Approve / Revision / Reject buttons at the bottom of the script card */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${G.border}` }}>
                    <StatusBtns status={st} onApprove={() => setItemStatus(script.id, "approved")} onReject={() => setItemStatus(script.id, "rejected")} onRevision={() => setItemStatus(script.id, "revision")} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── UGC Scripts ─── */}
        {activeTab === "ugc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {(!project.ugcScripts || project.ugcScripts.length === 0) ? (
              <div style={{ textAlign: "center", padding: 60, color: G.textTer }}><p>No UGC scripts uploaded yet.</p></div>
            ) : project.ugcScripts.filter(script => {
              if (statusFilter === "all") return true;
              const st = feedback[script.id]?.status || null;
              if (statusFilter === "pending") return !st;
              return st === statusFilter;
            }).map(script => {
              const st = feedback[script.id]?.status;
              const isExpanded = expandedItem === script.id;
              const borderColor = st === "approved" ? clr.approve : st === "rejected" ? clr.reject : st === "revision" ? clr.revision : G.cardBorder;
              const shadow = st ? `0 0 0 2px ${borderColor}` : G.cardShadow;
              return (
                <div key={script.id} style={{ position: "relative", background: G.card, border: `1px solid ${borderColor}`, boxShadow: shadow, borderRadius: 20, padding: 28, transition: "all 0.2s" }}>
                  <StatusMark status={st} />
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ ...hd, fontSize: 22, color: G.text }}>{script.title}</span>
                  </div>
                  <MoodBoardSection
                    script={script}
                    max={1}
                    status={feedback[`moodboard-${script.id}`]?.status}
                    comments={feedback[`moodboard-${script.id}`]?.comments}
                    saving={saving[`moodboard-${script.id}`]}
                    onSetStatus={(val) => setItemStatus(`moodboard-${script.id}`, val)}
                    onAddComment={(text) => onAddComment(`moodboard-${script.id}`, text)}
                    onDeleteComment={onDeleteComment}
                    viewerSender="client"
                  />
                  <VideoReviewPlayer script={script} scriptId={script.id} feedback={feedback}
                    onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  <ScriptBreakdownView content={script.content} scriptId={script.id} feedback={feedback} onAddComment={onAddComment} onDeleteComment={onDeleteComment} saving={saving[script.id]} viewerSender="client" />
                  {/* General feedback box only appears when the user has clicked Revision (or has existing comments) */}
                  {(feedback[script.id]?.status === "revision" || (feedback[script.id]?.comments || []).filter(c => typeof c.line !== "number").length > 0) && (
                    <FeedbackBox itemId={script.id} feedback={feedback} saving={saving} onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  )}
                  {/* Approve / Revision / Reject buttons at the bottom of the script card */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${G.border}` }}>
                    <StatusBtns status={st} onApprove={() => setItemStatus(script.id, "approved")} onReject={() => setItemStatus(script.id, "rejected")} onRevision={() => setItemStatus(script.id, "revision")} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Loop Videos ─── Standalone clips, no scripts. */}
        {activeTab === "loop" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filledLoops.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: G.textTer }}><p>No loop videos uploaded yet.</p></div>
            ) : filledLoops.filter(v => {
              if (statusFilter === "all") return true;
              const st = feedback[v.id]?.status || null;
              if (statusFilter === "pending") return !st;
              return st === statusFilter;
            }).map(v => {
              const st = feedback[v.id]?.status;
              const borderColor = st === "approved" ? clr.approve : st === "rejected" ? clr.reject : st === "revision" ? clr.revision : G.cardBorder;
              const shadow = st ? `0 0 0 2px ${borderColor}` : G.cardShadow;
              return (
                <div key={v.id} style={{ position: "relative", background: G.card, border: `1px solid ${borderColor}`, boxShadow: shadow, borderRadius: 20, padding: 28, transition: "all 0.2s" }}>
                  <StatusMark status={st} />
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ ...hd, fontSize: 22, color: G.text }}>{v.title}</span>
                  </div>
                  <VideoReviewPlayer script={v} scriptId={v.id} feedback={feedback}
                    onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  {(feedback[v.id]?.status === "revision" || (feedback[v.id]?.comments || []).filter(c => typeof c.line !== "number").length > 0) && (
                    <FeedbackBox itemId={v.id} feedback={feedback} saving={saving} onAddComment={onAddComment} onDeleteComment={onDeleteComment} viewerSender="client" />
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${G.border}` }}>
                    <StatusBtns status={st} onApprove={() => setItemStatus(v.id, "approved")} onReject={() => setItemStatus(v.id, "rejected")} onRevision={() => setItemStatus(v.id, "revision")} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginTop: 80, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Productions</span>
            </div>
            <span style={{ fontSize: 12, color: G.textTer, ...mono }}>Creative Review</span>
          </div>
          <span style={{ fontSize: 11, color: G.textTer, ...mono }}>&copy; 2026 Alchemy Productions LLC. All rights reserved.</span>
        </footer>
      </div>
      {/* Hide the floating chat when embedded inside the client/team hub - the parent already renders one */}
      {typeof window !== "undefined" && window.parent === window && (
        <PortalChat projectId={projectId} sender="client" brandName={project?.clientName || ""} />
      )}
      {/* Rejection reason modal */}
      {feedbackModal && (() => {
        const isRevision = feedbackModal.kind === "revision";
        const accent = isRevision ? clr.revision : clr.reject;
        const ModalIcon = isRevision ? RefreshCw : X;
        const title = isRevision ? "What needs to change?" : "Why are you rejecting this?";
        const helper = isRevision
          ? "Tell the team what to fix so they can ship a revision. A note is required to send back for revision."
          : "Please share why this doesn't work so the team can adjust accordingly. A reason is required to reject.";
        const placeholder = isRevision
          ? "What should the team change? Be specific. Copy, layout, color, image, etc..."
          : "What's wrong with this asset? Be specific so the team can fix it...";
        const cta = isRevision ? "Send for Revision" : "Confirm Rejection";
        const ctaLoading = isRevision ? "Sending..." : "Rejecting...";
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget && !feedbackSubmitting) { setFeedbackModal(null); setFeedbackReason(""); } }}
            style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <div style={{ background: G.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ModalIcon size={22} color={accent} strokeWidth={3} />
                </div>
                <h3 style={{ ...hd, fontSize: 24, color: G.text, margin: 0 }}>{title}</h3>
              </div>
              <p style={{ ...mono, fontSize: 14, color: G.textSec, marginBottom: 16, lineHeight: 1.5 }}>{helper}</p>
              <textarea
                autoFocus
                value={feedbackReason}
                onChange={(e) => { setFeedbackReason(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder={placeholder}
                disabled={feedbackSubmitting}
                style={{ ...mono, width: "100%", padding: "12px 16px", fontSize: 14, border: `1px solid ${G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", resize: "none", minHeight: 96, lineHeight: 1.6, overflow: "hidden", marginBottom: 16 }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { if (!feedbackSubmitting) { setFeedbackModal(null); setFeedbackReason(""); } }}
                  disabled={feedbackSubmitting}
                  style={{ ...mono, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: feedbackSubmitting ? "not-allowed" : "pointer", border: `1px solid ${G.border}`, background: "transparent", color: G.textSec, opacity: feedbackSubmitting ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeedback}
                  disabled={!feedbackReason.trim() || feedbackSubmitting}
                  style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: feedbackReason.trim() && !feedbackSubmitting ? "pointer" : "not-allowed", border: "none", background: accent, color: "#fff", opacity: feedbackReason.trim() && !feedbackSubmitting ? 1 : 0.5 }}
                >
                  <ModalIcon size={14} strokeWidth={3} /> {feedbackSubmitting ? ctaLoading : cta}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
