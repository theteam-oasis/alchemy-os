"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";

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

/* ── Reveal ── */
function Reveal({ children, style = {}, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      ...style,
      filter: show ? "blur(0px)" : "blur(10px)",
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(14px)",
      transition: "filter 1s cubic-bezier(0.25,0.1,0.25,1), opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1)",
    }}>
      {children}
    </div>
  );
}

/* ── Image slot ── */
function ImageSlot({ index, label, ratio, image, uploading, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const aspectMap = { "1:1": "1/1", "9:16": "9/16", "16:9": "16/9" };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith("image/")) onUpload(index, file);
      }}
      onClick={() => !image && !uploading && fileRef.current?.click()}
      style={{
        position: "relative",
        aspectRatio: aspectMap[ratio],
        background: image ? "transparent" : K.ink,
        border: dragOver ? `2px solid ${K.sand}` : `1px solid rgba(200,191,168,0.12)`,
        borderRadius: 2,
        overflow: "hidden",
        cursor: image ? "default" : "pointer",
        transition: "border-color 0.3s ease",
      }}
    >
      {image ? (
        <>
          <img
            src={image}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }}
          />
          {hover && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(13,13,11,0.4)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              backdropFilter: "blur(2px)",
            }}>
              <span style={{ ...font.label, color: K.offWhite, fontSize: 8 }}>{label}</span>
              <span style={{ ...font.caption, color: K.stone, textTransform: "none", letterSpacing: "0.02em" }}>{ratio}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                style={{
                  background: "none", border: `1px solid ${K.offWhite}`, color: K.offWhite,
                  padding: "6px 18px", borderRadius: 2, cursor: "pointer",
                  ...font.label, fontSize: 9, marginTop: 4,
                }}
              >
                remove
              </button>
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
          ) : (
            <>
              <Upload size={14} color={K.stone} strokeWidth={1} />
              <span style={{ ...font.label, color: K.stone, fontSize: 8 }}>{label}</span>
              <span style={{ ...font.caption, color: K.charcoal, textTransform: "none", letterSpacing: "0.02em" }}>{ratio}</span>
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

/* ── Main ── */
export default function KokoMoodBoard() {
  const [images, setImages] = useState({});
  const [uploading, setUploading] = useState({});

  const slots = [
    { label: "hero — wide landscape", ratio: "16:9" },
    { label: "back to camera", ratio: "9:16" },
    { label: "golden hour", ratio: "1:1" },
    { label: "movement", ratio: "9:16" },
    { label: "co-ed lifestyle", ratio: "16:9" },
    { label: "location detail", ratio: "1:1" },
    { label: "product in context", ratio: "1:1" },
    { label: "silhouette", ratio: "9:16" },
    { label: "texture — skin, sand", ratio: "16:9" },
    { label: "candid / ease", ratio: "9:16" },
    { label: "blue hour", ratio: "1:1" },
    { label: "the cave shot", ratio: "16:9" },
  ];

  /* ── Load saved images ── */
  useEffect(() => {
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
  }, []);

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
      if (data.success) {
        setImages((p) => ({ ...p, [index]: data.url }));
      }
    } catch (e) {
      console.error("Upload failed:", e);
    }
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
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, []);

  const moodWords = ["raw", "cinematic", "effortless", "discovered", "timeless"];

  return (
    <div style={{ background: K.ink, minHeight: "100vh", color: K.offWhite }}>

      {/* ── Header ── */}
      <header style={{ padding: "48px 48px 0", maxWidth: 1400, margin: "0 auto" }}>
        <Reveal delay={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
            <div>
              <h1 style={{ ...font.display, color: K.offWhite, fontSize: 56, lineHeight: 1, marginBottom: 6 }}>KOKO</h1>
              <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>mood board — 2026</p>
            </div>
            <p style={{ ...font.quote, color: K.sand, fontSize: 16, textAlign: "right" }}>
              "the art of ease."
            </p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div style={{ width: "100%", height: 1, background: K.charcoal, marginBottom: 40 }} />
        </Reveal>
      </header>

      {/* ── Image grid ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
        <Reveal delay={250}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
          }}>
            {/* Row 1: 16:9 (span 2) | 9:16 | 1:1 */}
            <div style={{ gridColumn: "span 2" }}>
              <ImageSlot index={0} label={slots[0].label} ratio={slots[0].ratio} image={images[0]} uploading={uploading[0]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div>
              <ImageSlot index={1} label={slots[1].label} ratio={slots[1].ratio} image={images[1]} uploading={uploading[1]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ImageSlot index={2} label={slots[2].label} ratio={slots[2].ratio} image={images[2]} uploading={uploading[2]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>

            {/* Row 2: 9:16 | 16:9 (span 2) | 1:1 */}
            <div>
              <ImageSlot index={3} label={slots[3].label} ratio={slots[3].ratio} image={images[3]} uploading={uploading[3]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <ImageSlot index={4} label={slots[4].label} ratio={slots[4].ratio} image={images[4]} uploading={uploading[4]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ImageSlot index={5} label={slots[5].label} ratio={slots[5].ratio} image={images[5]} uploading={uploading[5]} onUpload={handleUpload} onRemove={handleRemove} />
              <ImageSlot index={6} label={slots[6].label} ratio={slots[6].ratio} image={images[6]} uploading={uploading[6]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>

            {/* Row 3: 9:16 | 16:9 (span 2) | 9:16 */}
            <div>
              <ImageSlot index={7} label={slots[7].label} ratio={slots[7].ratio} image={images[7]} uploading={uploading[7]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <ImageSlot index={8} label={slots[8].label} ratio={slots[8].ratio} image={images[8]} uploading={uploading[8]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div>
              <ImageSlot index={9} label={slots[9].label} ratio={slots[9].ratio} image={images[9]} uploading={uploading[9]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>

            {/* Row 4: 1:1 | 16:9 (span 3) */}
            <div>
              <ImageSlot index={10} label={slots[10].label} ratio={slots[10].ratio} image={images[10]} uploading={uploading[10]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
            <div style={{ gridColumn: "span 3" }}>
              <ImageSlot index={11} label={slots[11].label} ratio={slots[11].ratio} image={images[11]} uploading={uploading[11]} onUpload={handleUpload} onRemove={handleRemove} />
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Mood words ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 48px 0" }}>
        <Reveal delay={350}>
          <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
            {moodWords.map((word, i) => (
              <div key={i} style={{
                flex: 1, padding: "16px 0",
                borderTop: `1px solid ${K.charcoal}`,
                borderRight: i < moodWords.length - 1 ? `1px solid ${K.charcoal}` : "none",
                paddingRight: 16,
              }}>
                <span style={{ ...font.quote, color: K.offWhite, fontSize: 17 }}>{word}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p style={{ ...font.quote, color: K.stone, fontSize: 15, lineHeight: 1.8, maxWidth: 520, marginBottom: 48 }}>
            every image should feel like a memory rather than a photograph. you remember the mist, the warmth, the light on the water.
          </p>
        </Reveal>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${K.charcoal}`, paddingTop: 20, paddingBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span style={{ ...font.display, color: K.offWhite, fontSize: 20 }}>KOKO</span>
            <p style={{ ...font.caption, color: K.stone, marginTop: 6, textTransform: "none" }}>
              swimwithkoko.com — @swimwithkoko — Canggu, Bali
            </p>
          </div>
          <p style={{ ...font.quote, color: K.charcoal, fontSize: 13 }}>
            "out where the wild things are"
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          header { padding: 32px 20px 0 !important; }
        }
      `}</style>
    </div>
  );
}
