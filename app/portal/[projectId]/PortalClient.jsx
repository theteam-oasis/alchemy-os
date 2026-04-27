"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Check, X, Image, Film, Video, MessageSquare, CheckCircle2, RefreshCw, Sparkles, ChevronLeft, ChevronRight, ZoomIn, Clock, Download } from "lucide-react";
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

function FeedbackBox({ itemId, feedback, saving, onAddComment }) {
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
          {comments.map((c, i) => (
            <div key={i} style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 14px", border: `1px solid ${G.border}` }}>
              <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{c.text}</p>
              <span style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 4, display: "block" }}>
                {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
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

function ScriptBreakdownView({ content, scriptId, feedback, onAddComment, saving }) {
  const bd = breakdownScript(content);
  const [activeLine, setActiveLine] = useState(null); // { lineIdx, selection }
  const [submitting, setSubmitting] = useState(false);
  const [hoverLine, setHoverLine] = useState(null);
  const [selectionPopup, setSelectionPopup] = useState(null); // { lineIdx, text, x, y }

  if (!bd.sections.length) return <p style={{ ...mono, color: "#6E6E73", fontSize: 15, lineHeight: 1.7 }}>No content yet.</p>;

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
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "8px 14px", background: "#F5F5F7", borderRadius: 10, border: `1px solid ${G.border}`, width: "fit-content" }}>
        <Clock size={13} color={G.textSec} />
        <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: G.text }}>Estimated Length: {bd.totalFormatted}</span>
      </div>
      <p style={{ ...mono, fontSize: 11, color: G.textTer, marginBottom: 12, fontStyle: "italic" }}>
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
                    {comments.map((c, ci) => (
                      <div key={ci} style={{ padding: "8px 12px", background: "#F5F5F7", borderRadius: 8, borderLeft: `3px solid ${c.sender === "team" ? "#34C759" : "#3E8ED0"}` }}>
                        {c.selection && (
                          <div style={{ ...mono, fontSize: 11, color: G.textTer, marginBottom: 4, fontStyle: "italic" }}>
                            on &ldquo;{c.selection}&rdquo;
                          </div>
                        )}
                        <p style={{ ...mono, fontSize: 13, color: G.text, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
                        <span style={{ ...mono, fontSize: 10, color: G.textTer, marginTop: 3, display: "block" }}>
                          {c.sender === "team" ? "Team" : "Client"} · {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
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
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [slug, setSlug] = useState(null);
  const [customPassword, setCustomPassword] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [zipping, setZipping] = useState(null);
  const [zipProgress, setZipProgress] = useState("");
  const [rejectModal, setRejectModal] = useState(null); // { itemId }
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

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
    await fetch("/api/portal/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, itemId, status: val }) });
  };

  const setItemStatus = async (itemId, newStatus) => {
    const current = feedback[itemId]?.status;
    const val = current === newStatus ? null : newStatus;
    // If rejecting (not toggling off), require a reason
    if (newStatus === "rejected" && val === "rejected") {
      setRejectReason("");
      setRejectModal({ itemId });
      return;
    }
    await applyStatus(itemId, val);
  };

  const submitRejection = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setRejectSubmitting(true);
    const itemId = rejectModal.itemId;
    const reason = rejectReason.trim();
    try {
      // Save the rejection reason as a comment first, then set status to rejected
      const res = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, itemId, addComment: reason, sender: "client" }),
      });
      const data = await res.json();
      setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: data.comments } }));
      await applyStatus(itemId, "rejected");
    } finally {
      setRejectSubmitting(false);
      setRejectModal(null);
      setRejectReason("");
    }
  };

  const onAddComment = useCallback(async (itemId, text, meta) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    const body = { projectId, itemId, addComment: text, sender: "client" };
    if (meta && typeof meta === "object") {
      if (typeof meta.line === "number") body.commentLine = meta.line;
      if (meta.selection) body.commentSelection = meta.selection;
    }
    const res = await fetch("/api/portal/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setFeedback(prev => ({ ...prev, [itemId]: { ...prev[itemId], comments: data.comments } }));
    setSaving(prev => ({ ...prev, [itemId]: false }));
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

  const totalItems = (project.images?.length || 0) + (project.heroScripts?.length || 0) + (project.ugcScripts?.length || 0);
  // Build a set of IDs that actually exist in the project, so orphaned feedback (pointing to deleted items) is excluded
  const validIds = new Set([
    ...(project.images || []).map(x => x.id),
    ...(project.heroScripts || []).map(x => x.id),
    ...(project.ugcScripts || []).map(x => x.id),
  ]);
  const liveFeedback = Object.entries(feedback).filter(([id]) => validIds.has(id)).map(([, f]) => f);
  const approvedCount = liveFeedback.filter(f => f.status === "approved").length;
  const rejectedCount = liveFeedback.filter(f => f.status === "rejected").length;
  const revisionCount = liveFeedback.filter(f => f.status === "revision").length;
  const feedbackCount = liveFeedback.reduce((sum, f) => sum + (f.comments?.length || 0), 0);

  const tabs = [
    { key: "images", label: "Images", count: project.images?.length || 0 },
    { key: "hero", label: "Hero Scripts", count: project.heroScripts?.length || 0 },
    { key: "ugc", label: "UGC Scripts", count: project.ugcScripts?.length || 0 },
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

        {/* Header */}
        <section style={{ textAlign: "center", padding: "48px 0 40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 24 }}>
            <Sparkles size={14} style={{ color: G.gold }} />
            <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>{project.clientName}&apos;s Assets</span>
          </div>
          <h1 style={{ ...hd, fontSize: 52, color: G.text, lineHeight: 1.1, marginBottom: 0 }}>Creative <span style={{ fontStyle: "italic" }}>Review</span></h1>
        </section>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          {[{ label: "Total Assets", value: totalItems }, { label: "Approved", value: approvedCount, c: clr.approve }, { label: "Rejected", value: rejectedCount, c: clr.reject }, { label: "Revisions", value: revisionCount, c: clr.revision }, { label: "Feedback", value: feedbackCount }].map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: 120, background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 20, padding: "24px 28px" }}>
              <p style={{ ...mono, color: G.textSec, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
              <p style={{ ...hd, fontSize: 42, color: s.c || G.text }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#F5F5F7", padding: 4, borderRadius: 980, marginBottom: 40, border: `1px solid ${G.border}` }}>
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
                      {expandedItem === img.id && (
                        <div style={{ padding: "0 6px 8px" }}>
                          <FeedbackBox itemId={img.id} feedback={feedback} saving={saving} onAddComment={onAddComment} />
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
                    <FeedbackBox itemId={img.id} feedback={feedback} saving={saving} onAddComment={onAddComment} />
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <span style={{ ...hd, fontSize: 22, color: G.text }}>{script.title}</span>
                    <StatusBtns status={st} onApprove={() => setItemStatus(script.id, "approved")} onReject={() => setItemStatus(script.id, "rejected")} onRevision={() => setItemStatus(script.id, "revision")} />
                  </div>
                  <ScriptBreakdownView content={script.content} scriptId={script.id} feedback={feedback} onAddComment={onAddComment} saving={saving[script.id]} />
                  <FeedbackBox itemId={script.id} feedback={feedback} saving={saving} onAddComment={onAddComment} />
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <span style={{ ...hd, fontSize: 22, color: G.text }}>{script.title}</span>
                    <StatusBtns status={st} onApprove={() => setItemStatus(script.id, "approved")} onReject={() => setItemStatus(script.id, "rejected")} onRevision={() => setItemStatus(script.id, "revision")} />
                  </div>
                  <ScriptBreakdownView content={script.content} scriptId={script.id} feedback={feedback} onAddComment={onAddComment} saving={saving[script.id]} />
                  <FeedbackBox itemId={script.id} feedback={feedback} saving={saving} onAddComment={onAddComment} />
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
      <PortalChat projectId={projectId} sender="client" brandName={project?.clientName || ""} />
      {/* Rejection reason modal */}
      {rejectModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !rejectSubmitting) { setRejectModal(null); setRejectReason(""); } }}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ background: G.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: clr.reject + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={22} color={clr.reject} strokeWidth={3} />
              </div>
              <h3 style={{ ...hd, fontSize: 24, color: G.text, margin: 0 }}>Why are you rejecting this?</h3>
            </div>
            <p style={{ ...mono, fontSize: 14, color: G.textSec, marginBottom: 16, lineHeight: 1.5 }}>
              Please share why this doesn&apos;t work so the team can adjust accordingly. A reason is required to reject.
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              placeholder="What's wrong with this asset? Be specific so the team can fix it..."
              disabled={rejectSubmitting}
              style={{ ...mono, width: "100%", padding: "12px 16px", fontSize: 14, border: `1px solid ${G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", resize: "none", minHeight: 96, lineHeight: 1.6, overflow: "hidden", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { if (!rejectSubmitting) { setRejectModal(null); setRejectReason(""); } }}
                disabled={rejectSubmitting}
                style={{ ...mono, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: rejectSubmitting ? "not-allowed" : "pointer", border: `1px solid ${G.border}`, background: "transparent", color: G.textSec, opacity: rejectSubmitting ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={!rejectReason.trim() || rejectSubmitting}
                style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: rejectReason.trim() && !rejectSubmitting ? "pointer" : "not-allowed", border: "none", background: clr.reject, color: "#fff", opacity: rejectReason.trim() && !rejectSubmitting ? 1 : 0.5 }}
              >
                <X size={14} strokeWidth={3} /> {rejectSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
