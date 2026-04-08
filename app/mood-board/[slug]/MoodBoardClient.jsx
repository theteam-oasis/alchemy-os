"use client";
import { useState, useEffect } from "react";
import { MapPin, Clock, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Wind, Droplets, Thermometer } from "lucide-react";

const K = {
  ink: "#0D0D0B", offWhite: "#F7F5F0", sand: "#C8BFA8",
  stone: "#8C8880", smoke: "#E4E0D8", charcoal: "#3A3834",
};
const font = {
  display: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.18em" },
  body: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400 },
  label: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "0.12em", fontSize: 9, textTransform: "uppercase" },
  quote: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, fontStyle: "italic" },
  caption: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400, letterSpacing: "0.06em", fontSize: 10 },
};

function Reveal({ children, style = {}, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ ...style, filter: show ? "blur(0)" : "blur(10px)", opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(14px)",
      transition: "filter 1s cubic-bezier(0.25,0.1,0.25,1), opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1)" }}>
      {children}
    </div>
  );
}

function ImageTile({ label, ratio, image }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio === "9:16" ? "9/16" : "1/1", background: "#1C1C18", overflow: "hidden" }}>
      {image ? (
        <img src={image} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...font.label, color: K.charcoal, fontSize: 8 }}>{label}</span>
        </div>
      )}
    </div>
  );
}

function WeatherIcon({ code, size = 14 }) {
  if (code <= 1) return <Sun size={size} strokeWidth={1.5} color={K.sand} />;
  if (code <= 3) return <Cloud size={size} strokeWidth={1.5} color={K.stone} />;
  if (code <= 48) return <CloudFog size={size} strokeWidth={1.5} color={K.stone} />;
  if (code <= 55) return <CloudDrizzle size={size} strokeWidth={1.5} color={K.stone} />;
  if (code <= 65) return <CloudRain size={size} strokeWidth={1.5} color={K.stone} />;
  if (code <= 77) return <CloudSnow size={size} strokeWidth={1.5} color={K.stone} />;
  if (code <= 82) return <CloudRain size={size} strokeWidth={1.5} color={K.stone} />;
  return <CloudLightning size={size} strokeWidth={1.5} color={K.stone} />;
}

const columns = [
  [{ idx: 0, label: "hero landscape", ratio: "9:16" }, { idx: 1, label: "golden hour", ratio: "1:1" }, { idx: 2, label: "texture", ratio: "1:1" }],
  [{ idx: 3, label: "location detail", ratio: "1:1" }, { idx: 4, label: "back to camera", ratio: "9:16" }, { idx: 5, label: "product in context", ratio: "1:1" }],
  [{ idx: 6, label: "co-ed lifestyle", ratio: "1:1" }, { idx: 7, label: "candid / ease", ratio: "1:1" }, { idx: 8, label: "silhouette", ratio: "9:16" }],
  [{ idx: 9, label: "the cave shot", ratio: "9:16" }, { idx: 10, label: "blue hour", ratio: "1:1" }, { idx: 11, label: "movement", ratio: "1:1" }],
];

const moodWords = ["raw", "cinematic", "effortless", "discovered", "timeless"];

export default function MoodBoardClient({ board, images: imageRows }) {
  const imageMap = {};
  imageRows.forEach((img) => { imageMap[img.slot] = img.url; });

  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (board.location_lat && board.location_lng) {
      fetch(`/api/mood-board/weather?lat=${board.location_lat}&lng=${board.location_lng}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setWeather(d.weather); })
        .catch(() => {});
    }
  }, [board.location_lat, board.location_lng]);

  const brandName = board.brand_name || board.slug;
  const hasLocation = board.location_name || board.location_image_url;

  return (
    <div style={{ background: K.ink, minHeight: "100vh", color: K.offWhite }}>

      {/* ── Header ── */}
      <header style={{ padding: "48px 48px 0", maxWidth: 1400, margin: "0 auto" }}>
        <Reveal delay={0}>
          <h1 style={{ ...font.display, color: K.offWhite, fontSize: 56, lineHeight: 1, marginBottom: 6 }}>
            {brandName.toUpperCase()}
          </h1>
          <p style={{ ...font.label, color: K.stone, fontSize: 10, marginBottom: 32 }}>mood board — 2026</p>
        </Reveal>

        {/* ── Info bar: location + weather + shoot time + mood words ── */}
        <Reveal delay={150}>
          <div style={{ borderTop: `1px solid ${K.charcoal}`, borderBottom: `1px solid ${K.charcoal}`, padding: "16px 0", marginBottom: 32, display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>

            {/* Location */}
            {board.location_name && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 24, borderRight: `1px solid ${K.charcoal}`, marginRight: 24 }}>
                <MapPin size={12} strokeWidth={1.5} color={K.sand} />
                {board.location_maps_url ? (
                  <a href={board.location_maps_url} target="_blank" rel="noopener noreferrer" style={{ ...font.body, color: K.offWhite, fontSize: 13, textDecoration: "none" }}>
                    {board.location_name}
                  </a>
                ) : (
                  <span style={{ ...font.body, color: K.offWhite, fontSize: 13 }}>{board.location_name}</span>
                )}
              </div>
            )}

            {/* Shoot time */}
            {board.shoot_time && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 24, borderRight: `1px solid ${K.charcoal}`, marginRight: 24 }}>
                <Clock size={12} strokeWidth={1.5} color={K.sand} />
                <span style={{ ...font.body, color: K.offWhite, fontSize: 13 }}>{board.shoot_time}</span>
              </div>
            )}

            {/* Weather */}
            {weather && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 24, borderRight: `1px solid ${K.charcoal}`, marginRight: 24 }}>
                <WeatherIcon code={weather.code} />
                <span style={{ ...font.body, color: K.offWhite, fontSize: 13 }}>{weather.temp}{weather.unit}</span>
                <span style={{ ...font.caption, color: K.stone, textTransform: "none" }}>{weather.condition}</span>
                <span style={{ ...font.caption, color: K.stone, textTransform: "none" }}>{weather.humidity}% humidity</span>
                <span style={{ ...font.caption, color: K.stone, textTransform: "none" }}>{weather.wind} km/h wind</span>
              </div>
            )}

            {/* Mood words */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {moodWords.map((word, i) => (
                <span key={i} style={{ ...font.quote, color: K.stone, fontSize: 13 }}>{word}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </header>

      {/* ── Location image (if exists) ── */}
      {board.location_image_url && (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px 12px" }}>
          <Reveal delay={200}>
            <div style={{ width: "100%", height: 200, overflow: "hidden", position: "relative" }}>
              <img src={board.location_image_url} alt={board.location_name || "Location"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          </Reveal>
        </div>
      )}

      {/* ── Image grid ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
        <Reveal delay={250}>
          <div style={{ display: "flex", gap: 0 }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
                {col.map((slot) => (
                  <ImageTile key={slot.idx} label={slot.label} ratio={slot.ratio} image={imageMap[slot.idx]} />
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── Footer ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 48px 40px" }}>
        <div style={{ borderTop: `1px solid ${K.charcoal}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span style={{ ...font.display, color: K.offWhite, fontSize: 20 }}>{brandName.toUpperCase()}</span>
            <p style={{ ...font.caption, color: K.stone, marginTop: 6, textTransform: "none" }}>
              mood board by Alchemy Studios
            </p>
          </div>
          <a href="/mood-board/create" style={{ ...font.caption, color: K.charcoal, textDecoration: "none", textTransform: "none" }}>
            admin
          </a>
        </div>
      </div>
    </div>
  );
}
