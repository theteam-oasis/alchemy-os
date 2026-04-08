"use client";
import { useState, useEffect } from "react";

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

/* ── Read-only image tile ── */
function ImageTile({ label, ratio, image }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: ratio === "9:16" ? "9/16" : "1/1",
      background: "#1C1C18",
      overflow: "hidden",
    }}>
      {image ? (
        <img
          src={image}
          alt={label}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...font.label, color: K.charcoal, fontSize: 8 }}>{label}</span>
        </div>
      )}
    </div>
  );
}

/* ── Grid layout — 4 columns, each 1×9:16 + 2×1:1, all flush ── */
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

/* ── Public mood board — read-only ── */
export default function KokoMoodBoard() {
  const [images, setImages] = useState({});

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
          <div style={{ display: "flex", gap: 0 }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
                {col.map((slot) => (
                  <ImageTile
                    key={slot.idx}
                    label={slot.label}
                    ratio={slot.ratio}
                    image={images[slot.idx]}
                  />
                ))}
              </div>
            ))}
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
          <div style={{ textAlign: "right" }}>
            <p style={{ ...font.quote, color: K.charcoal, fontSize: 13, marginBottom: 6 }}>
              "out where the wild things are"
            </p>
            <a href="/mood-board/koko/admin" style={{ ...font.caption, color: K.charcoal, textDecoration: "none", textTransform: "none" }}>
              admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
