"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Loader2, Lock, GripVertical } from "lucide-react";

/* ── Koko brand tokens ── */
const K = {
  ink: "#0D0D0B",
  offWhite: "#F7F5F0",
  sand: "#C8BFA8",
  stone: "#8C8880",
  smoke: "#E4E0D8",
  charcoal: "#3A3834",
};

const font = {
  display: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.18em" },
  body: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400 },
  label: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "0.12em", fontSize: 9, textTransform: "uppercase" },
  quote: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, fontStyle: "italic" },
  caption: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400, letterSpacing: "0.06em", fontSize: 10 },
};

/* ── Grid layout — same puzzle as public page ── */
const columns = [
  [
    { idx: 0, label: "hero landscape", ratio: "9:16" },
    { idx: 1, label: "golden hour", ratio: "1:1" },
    { idx: 2, label: "texture", ratio: "1:1" },
  ],
  [
    { idx: 3, label: "location detail", ratio: "1:1" },
    { idx: 4, label: "back to camera", ratio: "9:16" },
    { idx: 5, label: "product in context", ratio: "1:1" },
  ],
  [
    { idx: 6, label: "co-ed lifestyle", ratio: "1:1" },
    { idx: 7, label: "candid / ease", ratio: "1:1" },
    { idx: 8, label: "silhouette", ratio: "9:16" },
  ],
  [
    { idx: 9, label: "the cave shot", ratio: "9:16" },
    { idx: 10, label: "blue hour", ratio: "1:1" },
    { idx: 11, label: "movement", ratio: "1:1" },
  ],
];

/* ── Admin image slot with drag-to-swap ── */
function AdminSlot({ index, label, ratio, image, uploading, onUpload, onRemove, dragIdx, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const fileRef = useRef(null);
  const [hover, setHover] = useState(false);
  const isDragTarget = dragIdx !== null && dragIdx !== index;

  return (
    <div
      draggable={!!image}
      onDragStart={() => image && onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => {
        e.preventDefault();
        // If dropping a file (not a slot drag)
        if (e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) onUpload(index, file);
          return;
        }
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !image && !uploading && fileRef.current?.click()}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio === "9:16" ? "9/16" : "1/1",
        background: image ? K.ink : "#1C1C18",
        overflow: "hidden",
        cursor: image ? "grab" : "pointer",
        outline: isDragTarget && hover ? `2px solid ${K.sand}` : "none",
        opacity: dragIdx === index ? 0.4 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {image ? (
        <>
          <img
            src={image}
            alt={label}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0, pointerEvents: "none" }}
          />
          {hover && dragIdx === null && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(13,13,11,0.5)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              backdropFilter: "blur(2px)",
            }}>
              <GripVertical size={20} color={K.offWhite} strokeWidth={1} />
              <span style={{ ...font.label, color: K.offWhite, fontSize: 8 }}>{label}</span>
              <span style={{ ...font.caption, color: K.stone, textTransform: "none" }}>drag to swap</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                style={{
                  background: "none", border: `1px solid ${K.offWhite}`, color: K.offWhite,
                  padding: "5px 16px", borderRadius: 2, cursor: "pointer",
                  ...font.label, fontSize: 9, marginTop: 2,
                }}
              >
                remove
              </button>
            </div>
          )}
          {isDragTarget && hover && (
            <div style={{
              position: "absolute", inset: 0,
              background: `rgba(200,191,168,0.15)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${K.sand}`,
            }}>
              <span style={{ ...font.label, color: K.offWhite, fontSize: 10 }}>drop to swap</span>
            </div>
          )}
        </>
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {uploading ? (
            <Loader2 size={18} color={K.sand} strokeWidth={1} style={{ animation: "spin 1s linear infinite" }} />
          ) : isDragTarget && hover ? (
            <>
              <span style={{ ...font.label, color: K.sand, fontSize: 9 }}>drop to move here</span>
            </>
          ) : (
            <>
              <Upload size={14} color={K.stone} strokeWidth={1} />
              <span style={{ ...font.label, color: K.stone, fontSize: 8 }}>{label}</span>
            </>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onUpload(index, e.target.files[0]); }}
      />
    </div>
  );
}

/* ── Main admin page ── */
export default function KokoMoodBoardAdmin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [images, setImages] = useState({});
  const [uploading, setUploading] = useState({});
  const [dragIdx, setDragIdx] = useState(null);

  function handleAuth(e) {
    e.preventDefault();
    if (password === "alchemy2024") {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  /* ── Load images ── */
  useEffect(() => {
    if (!authed) return;
    fetch("/api/mood-board?board=koko")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.images) {
          const map = {};
          d.images.forEach((img) => { map[img.slot] = img.url; });
          setImages(map);
        }
      })
      .catch(() => {});
  }, [authed]);

  /* ── Upload ── */
  const handleUpload = useCallback(async (index, file) => {
    setUploading((p) => ({ ...p, [index]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slot", index);
      form.append("board", "koko");
      const res = await fetch("/api/mood-board", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) setImages((p) => ({ ...p, [index]: data.url }));
    } catch (e) { console.error("Upload failed:", e); }
    setUploading((p) => ({ ...p, [index]: false }));
  }, []);

  /* ── Remove ── */
  const handleRemove = useCallback(async (index) => {
    setImages((p) => { const n = { ...p }; delete n[index]; return n; });
    try {
      await fetch("/api/mood-board", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: index, board: "koko" }),
      });
    } catch (e) { console.error("Delete failed:", e); }
  }, []);

  /* ── Drag to swap ── */
  const handleDragStart = useCallback((idx) => setDragIdx(idx), []);
  const handleDragOver = useCallback(() => {}, []);
  const handleDragEnd = useCallback(() => setDragIdx(null), []);

  const handleDrop = useCallback(async (toIdx) => {
    const fromIdx = dragIdx;
    setDragIdx(null);
    if (fromIdx === null || fromIdx === toIdx) return;

    // Optimistic swap in state
    setImages((prev) => {
      const next = { ...prev };
      const fromUrl = next[fromIdx];
      const toUrl = next[toIdx];
      if (fromUrl) next[toIdx] = fromUrl; else delete next[toIdx];
      if (toUrl) next[fromIdx] = toUrl; else delete next[fromIdx];
      return next;
    });

    // Persist swap
    try {
      await fetch("/api/mood-board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: "koko", fromSlot: fromIdx, toSlot: toIdx }),
      });
    } catch (e) { console.error("Swap failed:", e); }
  }, [dragIdx]);

  const filled = Object.keys(images).length;

  /* ── Password gate ── */
  if (!authed) {
    return (
      <div style={{ ...font.body, minHeight: "100vh", background: K.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={handleAuth} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 340, maxWidth: "90vw",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#1C1C18", border: `1px solid ${K.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color={K.sand} strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ ...font.display, color: K.offWhite, fontSize: 32, margin: 0, marginBottom: 6 }}>KOKO</h1>
            <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>mood board admin</p>
          </div>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
            style={{
              width: "100%", padding: "12px 16px", background: "#1C1C18",
              border: `1px solid ${pwError ? "#8B3A3A" : K.charcoal}`, borderRadius: 4,
              color: K.offWhite, fontSize: 14, outline: "none",
              ...font.body, letterSpacing: "0.05em",
            }}
          />
          <button type="submit" style={{
            width: "100%", padding: "12px 0", background: K.sand, color: K.ink,
            border: "none", borderRadius: 4, cursor: "pointer",
            ...font.label, fontSize: 11,
          }}>
            enter
          </button>
          {pwError && <p style={{ ...font.caption, color: "#8B3A3A", textTransform: "none" }}>incorrect password</p>}
        </form>
      </div>
    );
  }

  /* ── Admin view ── */
  return (
    <div style={{ background: K.ink, minHeight: "100vh", color: K.offWhite }}>

      {/* ── Header ── */}
      <header style={{ padding: "36px 48px 0", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ ...font.display, color: K.offWhite, fontSize: 36, lineHeight: 1, marginBottom: 4 }}>KOKO</h1>
            <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>mood board admin</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ ...font.label, color: K.sand, fontSize: 10 }}>{filled} / 12 images</span>
            <a href="/mood-board/koko" target="_blank" style={{ display: "block", ...font.caption, color: K.stone, marginTop: 6, textDecoration: "none", textTransform: "none" }}>
              view public board →
            </a>
          </div>
        </div>
        <div style={{ width: "100%", height: 1, background: K.charcoal, marginBottom: 8 }} />
        <p style={{ ...font.caption, color: K.stone, marginBottom: 24, textTransform: "none", letterSpacing: "0.02em" }}>
          click empty slots to upload — drag images to rearrange — hover to remove
        </p>
      </header>

      {/* ── Grid ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
              {col.map((slot) => (
                <AdminSlot
                  key={slot.idx}
                  index={slot.idx}
                  label={slot.label}
                  ratio={slot.ratio}
                  image={images[slot.idx]}
                  uploading={uploading[slot.idx]}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                  dragIdx={dragIdx}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 48px 40px" }}>
        <div style={{ borderTop: `1px solid ${K.charcoal}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p style={{ ...font.caption, color: K.stone, textTransform: "none" }}>
            changes save automatically
          </p>
          <p style={{ ...font.quote, color: K.charcoal, fontSize: 13 }}>
            "the art of ease."
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
