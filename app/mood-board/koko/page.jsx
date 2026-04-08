"use client";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Sun,
  Music,
  Palette,
  Type,
  Eye,
  MapPin,
  Film,
  Upload,
  X,
  ChevronDown,
  Sliders,
  Quote,
  Aperture,
  SunMedium,
  CloudSun,
} from "lucide-react";

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
  display: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.12em" },
  heading: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400, letterSpacing: "0.01em" },
  body: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400 },
  label: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "0.12em", fontSize: 9, textTransform: "uppercase" },
  quote: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, fontStyle: "italic" },
  caption: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400, letterSpacing: "0.08em", fontSize: 10 },
};

/* ── Reveal animation ── */
function Reveal({ children, as: Tag = "div", style = {}, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <Tag style={{
      ...style,
      filter: show ? "blur(0px)" : "blur(10px)",
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(14px)",
      transition: "filter 1s cubic-bezier(0.25,0.1,0.25,1), opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1)",
    }}>
      {children}
    </Tag>
  );
}

/* ── Image slot component ── */
function ImageSlot({ index, label, aspect = "3/4", span = 1, rowSpan = 1, image, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onUpload(index, file);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        gridColumn: `span ${span}`,
        gridRow: `span ${rowSpan}`,
        position: "relative",
        aspectRatio: aspect,
        background: image ? "transparent" : K.ink,
        border: dragOver ? `2px solid ${K.sand}` : `1px solid ${K.charcoal}`,
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: hover && !image ? `inset 0 0 0 1px ${K.sand}40` : "none",
      }}
      onClick={() => !image && fileRef.current?.click()}
    >
      {image ? (
        <>
          <img src={image} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {hover && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(13,13,11,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                style={{ background: "none", border: `1px solid ${K.offWhite}`, color: K.offWhite, padding: "8px 16px", borderRadius: 2, cursor: "pointer", ...font.label, fontSize: 10 }}
              >
                remove
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16 }}>
          <Upload size={18} color={K.stone} strokeWidth={1} />
          <span style={{ ...font.label, color: K.stone }}>{label}</span>
          <span style={{ ...font.caption, color: K.charcoal, textAlign: "center", textTransform: "none", letterSpacing: "0.02em" }}>
            drag & drop or click
          </span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) onUpload(index, e.target.files[0]); }} />
    </div>
  );
}

/* ── Section divider ── */
function SectionDivider({ number, title }) {
  return (
    <div style={{ borderTop: `1px solid ${K.sand}`, paddingTop: 16, marginBottom: 32 }}>
      <span style={{ ...font.label, color: K.stone, fontSize: 10 }}>{number} — {title}</span>
    </div>
  );
}

/* ── Main page ── */
export default function KokoMoodBoard() {
  const [images, setImages] = useState({});
  const [activeSection, setActiveSection] = useState(null);

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

  const imageSlots = [
    { label: "hero — wide environmental", aspect: "16/9", span: 2, rowSpan: 1 },
    { label: "back to camera", aspect: "3/4", span: 1, rowSpan: 1 },
    { label: "golden hour", aspect: "3/4", span: 1, rowSpan: 1 },
    { label: "movement", aspect: "4/5", span: 1, rowSpan: 1 },
    { label: "location detail", aspect: "4/5", span: 1, rowSpan: 1 },
    { label: "co-ed lifestyle", aspect: "16/9", span: 2, rowSpan: 1 },
    { label: "product in context", aspect: "1/1", span: 1, rowSpan: 1 },
    { label: "silhouette / mystery", aspect: "3/4", span: 1, rowSpan: 1 },
    { label: "texture — wet skin, sand", aspect: "1/1", span: 1, rowSpan: 1 },
    { label: "blue hour / cinematic", aspect: "16/9", span: 2, rowSpan: 1 },
    { label: "candid / ease", aspect: "4/5", span: 1, rowSpan: 1 },
  ];

  const colourSwatches = [
    { name: "ink", hex: "#0D0D0B", use: "primary text, borders, logo" },
    { name: "off white", hex: "#F7F5F0", use: "backgrounds, light product" },
    { name: "sand", hex: "#C8BFA8", use: "accents, dividers, warm neutral" },
    { name: "stone", hex: "#8C8880", use: "secondary text, captions" },
    { name: "smoke", hex: "#E4E0D8", use: "surface fills, table rows" },
    { name: "charcoal", hex: "#3A3834", use: "body text on light backgrounds" },
  ];

  const presetValues = [
    { setting: "exposure", value: "+0.15" },
    { setting: "contrast", value: "+24" },
    { setting: "highlights", value: "-35" },
    { setting: "shadows", value: "+20" },
    { setting: "temperature", value: "-200K" },
    { setting: "vibrance", value: "-18" },
    { setting: "saturation", value: "-12" },
    { setting: "grain", value: "28 / 44" },
    { setting: "shadows point", value: "+14" },
    { setting: "vignette", value: "-18" },
  ];

  return (
    <div style={{ background: K.offWhite, minHeight: "100vh", color: K.ink }}>

      {/* ── Header ── */}
      <header style={{ background: K.ink, padding: "64px 48px 56px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ ...font.label, color: K.stone, marginBottom: 40, fontSize: 10 }}>
              confidential — 2026
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 style={{ ...font.display, color: K.offWhite, fontSize: 72, lineHeight: 0.95, marginBottom: 20, letterSpacing: "0.18em" }}>
              KOKO
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p style={{ ...font.heading, color: K.offWhite, fontSize: 22, marginBottom: 8, fontWeight: 300 }}>
              mood board
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div style={{ width: 48, height: 1, background: K.sand, margin: "24px 0" }} />
          </Reveal>

          <Reveal delay={400}>
            <p style={{ ...font.quote, color: K.sand, fontSize: 17 }}>
              "the art of ease."
            </p>
          </Reveal>

          <Reveal delay={500}>
            <p style={{ ...font.body, color: K.stone, fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
              co-ed swimwear and lifestyle — Bali, Indonesia<br />
              swimwithkoko.com / @swimwithkoko
            </p>
          </Reveal>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 48px 80px" }}>

        {/* ── Brand statement ── */}
        <Reveal delay={200}>
          <div style={{ maxWidth: 680, marginBottom: 64 }}>
            <p style={{ ...font.quote, color: K.charcoal, fontSize: 20, lineHeight: 1.7 }}>
              every image should feel like it was captured, not produced. the swimwear is incidental to the story — which paradoxically makes it more desirable.
            </p>
          </div>
        </Reveal>

        {/* ── 01 Image Grid ── */}
        <SectionDivider number="01" title="image direction" />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 64,
        }}>
          {imageSlots.map((slot, i) => (
            <ImageSlot
              key={i}
              index={i}
              label={slot.label}
              aspect={slot.aspect}
              span={slot.span}
              rowSpan={slot.rowSpan}
              image={images[i]}
              onUpload={handleUpload}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {/* ── 02 Five principles ── */}
        <SectionDivider number="02" title="photography principles" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 64 }}>
          {[
            { icon: <MapPin size={16} strokeWidth={1} />, title: "location is the subject", desc: "if you cannot tell where the photo was taken, it does not belong on the grid" },
            { icon: <Aperture size={16} strokeWidth={1} />, title: "capture, never produce", desc: "chase conditions, not setups. the mist at Seseh, the light beam through the cave" },
            { icon: <Eye size={16} strokeWidth={1} />, title: "mystery over exposure", desc: "back to camera, eyes down, silhouette. the viewer should project themselves in" },
            { icon: <SunMedium size={16} strokeWidth={1} />, title: "ease in every frame", desc: "no poses that look like poses. movement over static. being, not performing" },
            { icon: <Film size={16} strokeWidth={1} />, title: "film over digital", desc: "grain, lifted shadows, warm amber highlights, cool blue-grey shadows. always" },
          ].map((p, i) => (
            <Reveal key={i} delay={100 + i * 80}>
              <div style={{ padding: "24px 20px", background: K.ink, borderRadius: 2, height: "100%" }}>
                <div style={{ color: K.sand, marginBottom: 14 }}>{p.icon}</div>
                <h4 style={{ ...font.heading, color: K.offWhite, fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>{p.title}</h4>
                <p style={{ ...font.body, color: K.stone, fontSize: 11, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── 03 Shot list ── */}
        <SectionDivider number="03" title="shot list — always vs never" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 64 }}>
          <div style={{ padding: "28px 24px", border: `1px solid ${K.sand}`, borderRadius: 2 }}>
            <span style={{ ...font.label, color: K.sand, display: "block", marginBottom: 20 }}>always</span>
            {[
              "wide environmental shots — person small against location",
              "back-to-camera with horizon, cliff, or landscape visible",
              "movement — walking, turning, wind in hair",
              "props with narrative — film camera, linen shirt, coconut",
              "golden hour and blue hour light",
              "wet skin, sand on feet, salt in hair — real",
              "full body with environment or tight with personality",
            ].map((item, i) => (
              <div key={i} style={{ ...font.body, color: K.charcoal, fontSize: 12, lineHeight: 1.5, padding: "8px 0", borderBottom: i < 6 ? `1px solid ${K.smoke}` : "none" }}>
                {item}
              </div>
            ))}
          </div>

          <div style={{ padding: "28px 24px", border: `1px solid ${K.smoke}`, borderRadius: 2, background: `${K.smoke}30` }}>
            <span style={{ ...font.label, color: K.stone, display: "block", marginBottom: 20 }}>never</span>
            {[
              "close-crop body shots with no face or location",
              "dark neutral backgrounds with no sense of place",
              "static posed shots that look like catalogue",
              "props that feel styled rather than lived",
              "harsh midday direct sun",
              "overly groomed, airbrushed, perfected",
              "cropped body with no story context",
            ].map((item, i) => (
              <div key={i} style={{ ...font.body, color: K.stone, fontSize: 12, lineHeight: 1.5, padding: "8px 0", borderBottom: i < 6 ? `1px solid ${K.smoke}` : "none" }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ── 04 Colour palette ── */}
        <SectionDivider number="04" title="colour palette" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 64 }}>
          {colourSwatches.map((s, i) => (
            <Reveal key={i} delay={i * 60}>
              <div>
                <div style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  background: s.hex,
                  borderRadius: 2,
                  border: s.hex === "#F7F5F0" ? `1px solid ${K.smoke}` : "none",
                  marginBottom: 10,
                }} />
                <span style={{ ...font.label, color: K.ink, display: "block", marginBottom: 4 }}>{s.name}</span>
                <span style={{ ...font.caption, color: K.stone, display: "block", textTransform: "uppercase" }}>{s.hex}</span>
                <span style={{ ...font.caption, color: K.stone, display: "block", marginTop: 4, textTransform: "none", letterSpacing: "0.02em", lineHeight: 1.5 }}>{s.use}</span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── 05 Koko preset ── */}
        <SectionDivider number="05" title="the koko preset — lightroom / capture one" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 64 }}>
          <div style={{ background: K.ink, borderRadius: 2, padding: "28px 24px" }}>
            <span style={{ ...font.label, color: K.sand, display: "block", marginBottom: 20 }}>settings</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {presetValues.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${K.charcoal}`, paddingRight: 16 }}>
                  <span style={{ ...font.body, color: K.stone, fontSize: 11 }}>{p.setting}</span>
                  <span style={{ ...font.body, color: K.offWhite, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "28px 24px", border: `1px solid ${K.sand}`, borderRadius: 2 }}>
            <span style={{ ...font.label, color: K.sand, display: "block", marginBottom: 20 }}>workflow</span>
            {[
              "1. import RAW/DNG into Lightroom",
              "2. apply Koko Master preset",
              "3. adjust exposure only (+/- 0.3 max)",
              "4. skin-heavy: nudge orange sat -5 to -10",
              "5. ocean/water: pull blue sat back -10",
              "6. export full res, JPEG, sRGB",
            ].map((step, i) => (
              <div key={i} style={{ ...font.body, color: K.charcoal, fontSize: 12, lineHeight: 1.5, padding: "10px 0", borderBottom: i < 5 ? `1px solid ${K.smoke}` : "none" }}>
                {step}
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 16, background: `${K.smoke}60`, borderRadius: 2 }}>
              <p style={{ ...font.body, color: K.stone, fontSize: 11, lineHeight: 1.6 }}>
                the lifted shadows (shadows point +14, blacks -28) are the most important values. they create the film look — rich but never crushed. do not change these between images.
              </p>
            </div>
          </div>
        </div>

        {/* ── 06 Mood & Tone ── */}
        <SectionDivider number="06" title="mood references" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 48 }}>
          {[
            { word: "raw", desc: "real conditions, real locations, nothing manufactured" },
            { word: "cinematic", desc: "every frame could be a still from a film" },
            { word: "effortless", desc: "no one is trying — they are just being" },
            { word: "discovered", desc: "the location feels found, not scouted" },
            { word: "timeless", desc: "no trend references, no date stamps, no era" },
          ].map((m, i) => (
            <Reveal key={i} delay={i * 60}>
              <div style={{ padding: "24px 20px", borderTop: `2px solid ${K.sand}` }}>
                <span style={{ ...font.heading, color: K.ink, fontSize: 16, display: "block", marginBottom: 8 }}>{m.word}</span>
                <p style={{ ...font.body, color: K.stone, fontSize: 11, lineHeight: 1.6 }}>{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Caption format ── */}
        <div style={{ background: K.ink, borderRadius: 2, padding: "40px 36px", marginBottom: 64 }}>
          <span style={{ ...font.label, color: K.stone, display: "block", marginBottom: 24 }}>caption format</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {["wild", "free", "still", "adrift", "found", "bare", "slow", "raw"].map((word, i) => (
              <p key={i} style={{ ...font.quote, color: K.offWhite, fontSize: 15 }}>
                {word}, <span style={{ color: K.stone }}>as all things should be.</span>
              </p>
            ))}
          </div>
          <div style={{ width: 48, height: 1, background: K.charcoal, margin: "28px 0 20px" }} />
          <p style={{ ...font.body, color: K.stone, fontSize: 11, lineHeight: 1.6, maxWidth: 480 }}>
            always lowercase. one sentence maximum. poetic, not literal. never product-first language. never explain what is in the image.
          </p>
        </div>

        {/* ── 07 Music ── */}
        <SectionDivider number="07" title="music & sound direction" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 48 }}>
          {[
            { artist: "Khruangbin", use: "reels, campaigns" },
            { artist: "Beach House", use: "slow edits, cinematic posts" },
            { artist: "Zimmer, Panama", use: "grid reels — the benchmark" },
            { artist: "Nick Drake", use: "quiet, intimate stories" },
            { artist: "Bon Iver", use: "escapes content, travel edits" },
            { artist: "Cigarettes After Sex", use: "dark, moody stories" },
            { artist: "Allah-Las", use: "Koko man content, surf-adjacent" },
            { artist: "Still Woozy", use: "lighter reels, summer energy" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${K.smoke}` }}>
              <span style={{ ...font.heading, color: K.ink, fontSize: 13 }}>{m.artist}</span>
              <span style={{ ...font.caption, color: K.stone, textTransform: "none", letterSpacing: "0.02em" }}>{m.use}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, background: `${K.smoke}60`, borderRadius: 2, marginBottom: 64 }}>
          <p style={{ ...font.body, color: K.stone, fontSize: 11 }}>
            never: chart music, anything trending on TikTok, anything that dates the content, anything that sounds like a swimwear brand.
          </p>
        </div>

        {/* ── 08 The benchmark ── */}
        <SectionDivider number="08" title="the benchmark — the cave shot" />

        <div style={{ background: K.ink, borderRadius: 2, padding: "40px 36px", marginBottom: 48 }}>
          <p style={{ ...font.quote, color: K.offWhite, fontSize: 17, lineHeight: 1.7, marginBottom: 28, maxWidth: 640 }}>
            this is the image every future Koko shoot is measured against. it has scale, mystery, location, ease, and narrative simultaneously.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { label: "scale", desc: "person small against vast natural environment" },
              { label: "mystery", desc: "back to camera, face unseen, viewer projects themselves in" },
              { label: "narrative", desc: "she found this place, she is exploring it" },
              { label: "light", desc: "a single unrepeatable beam. chase conditions like this" },
              { label: "ease", desc: "arm up naturally, not posed. being, not performing" },
              { label: "product", desc: "Koko visible without being the subject" },
            ].map((b, i) => (
              <div key={i}>
                <span style={{ ...font.label, color: K.sand, display: "block", marginBottom: 8 }}>{b.label}</span>
                <p style={{ ...font.body, color: K.stone, fontSize: 11, lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Typography reference ── */}
        <SectionDivider number="09" title="typography reference" />

        <div style={{ border: `1px solid ${K.sand}`, borderRadius: 2, padding: "28px 24px", marginBottom: 64 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr", gap: 0 }}>
            {[
              { role: "logo", font: "Helvetica / Futura", size: "tracking +200", use: "all brand touchpoints" },
              { role: "display", font: "Helvetica Light", size: "32-52pt", use: "campaign headlines" },
              { role: "heading", font: "Helvetica Regular", size: "18-24pt", use: "section titles" },
              { role: "body", font: "Helvetica Regular", size: "10-12pt", use: "captions, descriptions" },
              { role: "label", font: "Helvetica Bold", size: "8-9pt + tracking", use: "tags, categories, UI" },
              { role: "caption", font: "Helvetica", size: "8pt + tracking", use: "photo credits, footnotes" },
            ].map((t, i) => (
              <div key={i} style={{ display: "contents" }}>
                <span style={{ ...font.label, color: K.ink, padding: "10px 0", borderBottom: `1px solid ${K.smoke}` }}>{t.role}</span>
                <span style={{ ...font.body, color: K.charcoal, fontSize: 12, padding: "10px 0", borderBottom: `1px solid ${K.smoke}` }}>{t.font}</span>
                <span style={{ ...font.body, color: K.stone, fontSize: 12, padding: "10px 0", borderBottom: `1px solid ${K.smoke}` }}>{t.size}</span>
                <span style={{ ...font.body, color: K.stone, fontSize: 12, padding: "10px 0", borderBottom: `1px solid ${K.smoke}` }}>{t.use}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              "always sentence case",
              "never all caps in body",
              "tight tracking on body",
              "open tracking on labels",
              "off white text on dark — never pure white",
            ].map((rule, i) => (
              <span key={i} style={{ ...font.caption, color: K.stone, textTransform: "none", letterSpacing: "0.02em", lineHeight: 1.5 }}>
                — {rule}
              </span>
            ))}
          </div>
        </div>

        {/* ── Colourways ── */}
        <SectionDivider number="10" title="swimwear colourways" />

        <div style={{ display: "flex", gap: 12, marginBottom: 64 }}>
          {[
            { name: "sage", color: "#8A9A7B" },
            { name: "cream", color: "#F0E8D8" },
            { name: "black", color: "#0D0D0B" },
            { name: "slate", color: "#6B7280" },
            { name: "terracotta", color: "#C07850" },
          ].map((c, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ width: "100%", aspectRatio: "3/2", background: c.color, borderRadius: 2, border: c.name === "cream" ? `1px solid ${K.smoke}` : "none", marginBottom: 8 }} />
              <span style={{ ...font.label, color: K.ink }}>{c.name}</span>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${K.sand}`, paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span style={{ ...font.display, color: K.ink, fontSize: 28, letterSpacing: "0.18em" }}>KOKO</span>
            <p style={{ ...font.caption, color: K.stone, marginTop: 8, textTransform: "none", letterSpacing: "0.02em" }}>
              swimwithkoko.com — @swimwithkoko — Canggu, Bali, Indonesia
            </p>
          </div>
          <p style={{ ...font.quote, color: K.sand, fontSize: 14 }}>
            "out where the wild things are"
          </p>
        </div>

      </div>

      {/* ── Responsive overrides ── */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .koko-principles-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          header { padding: 40px 24px 40px !important; }
          header h1 { font-size: 48px !important; }
        }
      `}</style>
    </div>
  );
}
