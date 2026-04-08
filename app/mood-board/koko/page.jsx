"use client";
import { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";

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
function ImageSlot({ index, label, image, onUpload, onRemove, style = {} }) {
  const fileRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
      onClick={() => !image && fileRef.current?.click()}
      style={{
        position: "relative",
        background: image ? "transparent" : K.ink,
        border: dragOver ? `2px solid ${K.sand}` : `1px solid rgba(200,191,168,0.15)`,
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.3s ease",
        ...style,
      }}
    >
      {image ? (
        <>
          <img src={image} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
          {hover && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(13,13,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                style={{ background: "none", border: `1px solid ${K.offWhite}`, color: K.offWhite, padding: "8px 20px", borderRadius: 2, cursor: "pointer", ...font.label, fontSize: 10 }}
              >
                remove
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Upload size={16} color={K.stone} strokeWidth={1} />
          <span style={{ ...font.label, color: K.stone, fontSize: 8 }}>{label}</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) onUpload(index, e.target.files[0]); }} />
    </div>
  );
}

/* ── Main ── */
export default function KokoMoodBoard() {
  const [images, setImages] = useState({});

  const handleUpload = (index, file) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => ({ ...prev, [index]: url }));
  };

  const handleRemove = (index) => {
    setImages((prev) => {
      const next = { ...prev };
      if (next[index]) URL.revokeObjectURL(next[index]);
      delete next[index];
      return next;
    });
  };

  const slots = [
    { label: "hero — wide environmental", gridArea: "1 / 1 / 3 / 3" },
    { label: "back to camera", gridArea: "1 / 3 / 2 / 4" },
    { label: "golden hour", gridArea: "1 / 4 / 2 / 5" },
    { label: "movement", gridArea: "2 / 3 / 3 / 4" },
    { label: "location detail", gridArea: "2 / 4 / 3 / 5" },
    { label: "co-ed lifestyle", gridArea: "3 / 1 / 4 / 3" },
    { label: "product in context", gridArea: "3 / 3 / 4 / 4" },
    { label: "silhouette", gridArea: "3 / 4 / 4 / 5" },
    { label: "texture — skin, sand", gridArea: "4 / 1 / 5 / 2" },
    { label: "blue hour", gridArea: "4 / 2 / 5 / 4" },
    { label: "candid / ease", gridArea: "4 / 4 / 5 / 5" },
    { label: "the cave shot", gridArea: "5 / 1 / 6 / 5" },
  ];

  const moodWords = ["raw", "cinematic", "effortless", "discovered", "timeless"];

  return (
    <div style={{ background: K.ink, minHeight: "100vh", color: K.offWhite }}>

      {/* ── Header ── */}
      <header style={{ padding: "56px 48px 0", maxWidth: 1400, margin: "0 auto" }}>
        <Reveal delay={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
            <div>
              <h1 style={{ ...font.display, color: K.offWhite, fontSize: 56, lineHeight: 1, marginBottom: 6 }}>KOKO</h1>
              <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>mood board — 2026</p>
            </div>
            <p style={{ ...font.quote, color: K.sand, fontSize: 16, textAlign: "right" }}>
              "the art of ease."
            </p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ width: "100%", height: 1, background: K.charcoal, marginBottom: 48 }} />
        </Reveal>
      </header>

      {/* ── Image grid ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
        <Reveal delay={300}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "280px 280px 300px 280px 320px",
            gap: 8,
          }}>
            {slots.map((slot, i) => (
              <ImageSlot
                key={i}
                index={i}
                label={slot.label}
                image={images[i]}
                onUpload={handleUpload}
                onRemove={handleRemove}
                style={{ gridArea: slot.gridArea }}
              />
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── Mood words ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "56px 48px 0" }}>
        <Reveal delay={400}>
          <div style={{ display: "flex", gap: 0, marginBottom: 48 }}>
            {moodWords.map((word, i) => (
              <div key={i} style={{ flex: 1, padding: "20px 0", borderTop: `1px solid ${K.charcoal}`, borderRight: i < moodWords.length - 1 ? `1px solid ${K.charcoal}` : "none", paddingRight: 20 }}>
                <span style={{ ...font.quote, color: K.offWhite, fontSize: 18 }}>{word}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Brand line ── */}
        <Reveal delay={500}>
          <p style={{ ...font.quote, color: K.stone, fontSize: 15, lineHeight: 1.8, maxWidth: 560, marginBottom: 56 }}>
            every image should feel like a memory rather than a photograph. you remember the mist, the warmth, the light on the water. not the product. not the pose.
          </p>
        </Reveal>

        {/* ── Colour strip ── */}
        <Reveal delay={550}>
          <div style={{ display: "flex", gap: 4, marginBottom: 56, height: 48 }}>
            {[K.ink, K.offWhite, K.sand, K.stone, K.smoke, K.charcoal].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c, borderRadius: 2, border: c === K.ink ? `1px solid ${K.charcoal}` : "none" }} />
            ))}
          </div>
        </Reveal>

        {/* ── Caption examples ── */}
        <Reveal delay={600}>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 64 }}>
            {["wild", "free", "still", "adrift", "found", "bare", "slow", "raw"].map((word, i) => (
              <p key={i} style={{ ...font.quote, color: K.offWhite, fontSize: 14 }}>
                {word}, <span style={{ color: K.charcoal }}>as all things should be.</span>
              </p>
            ))}
          </div>
        </Reveal>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${K.charcoal}`, paddingTop: 24, paddingBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
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
    </div>
  );
}
