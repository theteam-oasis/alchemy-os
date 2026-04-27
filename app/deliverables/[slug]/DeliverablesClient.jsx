"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import JSZip from "jszip";
import {
  Sparkles,
  Download,
  Image,
  Play,
  Package,
  Calendar,
  Hash,
  Check,
  ArrowDown,
  ExternalLink,
  Phone,
  Loader2,
  FolderDown,
} from "lucide-react";

/* ── Design tokens ── */
const G = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000",
  goldSoft: "#00000008",
  goldBorder: "#D2D2D7",
  text: "#1D1D1F",
  textSec: "#86868B",
  textTer: "#AEAEB2",
  border: "#E8E8ED",
  success: "#34C759",
};
const hd = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Reveal({
  children,
  as: Tag = "div",
  style = {},
  className = "",
  delay = 0,
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <Tag
      className={className}
      style={{
        ...style,
        filter: show ? "blur(0px)" : "blur(12px)",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0px)" : "translateY(18px)",
        transition:
          "filter 1.2s cubic-bezier(0.25,0.1,0.25,1), opacity 1.2s cubic-bezier(0.25,0.1,0.25,1), transform 1.2s cubic-bezier(0.25,0.1,0.25,1)",
      }}
    >
      {children}
    </Tag>
  );
}

function HeroBlurText({
  children,
  as: Tag = "span",
  style = {},
  className = "",
  staggerMs = 60,
}) {
  const text = typeof children === "string" ? children : "";
  const words = text.split(" ");
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <Tag
      className={className}
      style={{ ...style, display: "flex", flexWrap: "wrap", gap: "0 0.3em" }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            filter: show ? "blur(0px)" : "blur(14px)",
            opacity: show ? 1 : 0,
            transform: show ? "translateY(0px)" : "translateY(16px)",
            transition: `filter 1s cubic-bezier(0.25,0.1,0.25,1) ${
              i * staggerMs
            }ms, opacity 1s cubic-bezier(0.25,0.1,0.25,1) ${
              i * staggerMs
            }ms, transform 1s cubic-bezier(0.25,0.1,0.25,1) ${
              i * staggerMs
            }ms`,
          }}
        >
          {w}
        </span>
      ))}
    </Tag>
  );
}

function ScrollBlurText({
  children,
  blurMax = 8,
  stagger = true,
  as: Tag = "span",
  style = {},
  className = "",
}) {
  const text = typeof children === "string" ? children : null;
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);
  const tick = useCallback(() => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const raw =
        (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.5);
      progressRef.current = Math.min(1, Math.max(0, raw));
    }
    smoothRef.current +=
      (progressRef.current - smoothRef.current) * 0.08;
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005)
      smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current);
    raf.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => {
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [tick]);
  if (text && stagger) {
    const words = text.split(" ");
    return (
      <Tag
        ref={ref}
        className={className}
        style={{
          ...style,
          display: "flex",
          flexWrap: "wrap",
          gap: "0 0.3em",
        }}
      >
        {words.map((w, i) => {
          const s = (i / words.length) * 0.7;
          const e = s + 0.45;
          const wp = ease(
            Math.min(1, Math.max(0, (smooth - s) / (e - s)))
          );
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                filter: `blur(${blurMax * (1 - wp)}px)`,
                opacity: wp,
                transform: `translateY(${10 * (1 - wp)}px)`,
                willChange: "filter, opacity, transform",
              }}
            >
              {w}
            </span>
          );
        })}
      </Tag>
    );
  }
  const p = ease(smooth);
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        filter: `blur(${blurMax * (1 - p)}px)`,
        opacity: p,
        transform: `translateY(${16 * (1 - p)}px)`,
        willChange: "filter, opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

function BlurReveal({
  children,
  as: Tag = "div",
  style = {},
  blurMax = 6,
}) {
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);
  const tick = useCallback(() => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const raw =
        (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.45);
      progressRef.current = Math.min(1, Math.max(0, raw));
    }
    smoothRef.current +=
      (progressRef.current - smoothRef.current) * 0.08;
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005)
      smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current);
    raf.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => {
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [tick]);
  const p = ease(smooth);
  return (
    <Tag
      ref={ref}
      style={{
        ...style,
        filter: `blur(${blurMax * (1 - p)}px)`,
        opacity: p,
        transform: `translateY(${18 * (1 - p)}px)`,
        willChange: "filter, opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

/* ── Lightbox ── */
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        padding: 24,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

/* ── Download Helpers ── */
async function downloadImage(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

async function downloadAllAsZip(urls, clientName, setProgress) {
  const zip = new JSZip();
  const folder = zip.folder(`${clientName}-deliverables`);

  for (let i = 0; i < urls.length; i++) {
    setProgress(Math.round(((i + 1) / urls.length) * 100));
    try {
      const res = await fetch(urls[i]);
      const blob = await res.blob();
      const ext = urls[i].split(".").pop().split("?")[0] || "jpg";
      folder.file(`${clientName}-creative-${i + 1}.${ext}`, blob);
    } catch (err) {
      console.error(`Failed to fetch image ${i + 1}:`, err);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${clientName}-deliverables.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

/* ── Main Component ── */
export default function DeliverablesClient({ deliverable }) {
  const clientName = deliverable.client_name;
  const statics = deliverable.static_urls || [];
  const videos = deliverable.video_links || [];
  const totalDeliverables = deliverable.total_deliverables || statics.length + videos.length;
  const packageName = deliverable.package_name || "";
  const deliveryDate = deliverable.delivery_date;
  const description = deliverable.project_description || "";

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [downloading, setDownloading] = useState(null); // index of single image downloading
  const [zipProgress, setZipProgress] = useState(null); // null = not downloading, 0-100 = progress

  const formattedDate = deliveryDate
    ? new Date(deliveryDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt={`${clientName} deliverable`}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        {/* ── Nav ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${G.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: G.text,
                letterSpacing: "0.05em",
                ...mono,
              }}
            >
              ALCHEMY{" "}
              <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span>
            </span>
          </div>
          <span
            style={{
              fontSize: 13,
              color: G.textSec,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              ...mono,
            }}
          >
            Deliverables for {clientName}
          </span>
        </nav>

        {/* ── Hero ── */}
        <section style={{ textAlign: "center", padding: "48px 0 60px" }}>
          <Reveal delay={100}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 20px",
                borderRadius: 980,
                border: `1px solid ${G.goldBorder}`,
                background: G.goldSoft,
                marginBottom: 32,
              }}
            >
              <Package size={14} style={{ color: G.gold }} />
              <span
                style={{
                  color: G.gold,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  ...mono,
                }}
              >
                Deliverables
              </span>
            </div>
          </Reveal>

          <HeroBlurText
            as="h1"
            className="hero-proposal-title"
            style={{
              ...hd,
              fontSize: 58,
              color: G.text,
              lineHeight: 1.1,
              marginBottom: 16,
              justifyContent: "center",
            }}
            staggerMs={70}
          >
            {`Your Creative is Ready, ${clientName}.`}
          </HeroBlurText>

          <Reveal
            delay={500}
            as="p"
            style={{
              color: G.textSec,
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 540,
              margin: "0 auto",
              ...mono,
            }}
          >
            {description ||
              `Here are your completed deliverables. Click any image to view full resolution, or preview your videos below.`}
          </Reveal>
        </section>

        {/* ── Stats Bar ── */}
        {(totalDeliverables > 0 || packageName || formattedDate) && (
          <Reveal delay={600}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 32,
                flexWrap: "wrap",
                marginBottom: 60,
                padding: "24px 32px",
                background: G.card,
                border: `1px solid ${G.cardBorder}`,
                borderRadius: 16,
                boxShadow: G.cardShadow,
              }}
            >
              {totalDeliverables > 0 && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Hash size={14} color={G.textTer} />
                    <span
                      style={{
                        ...mono,
                        fontSize: 12,
                        color: G.textTer,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Total Deliverables
                    </span>
                  </div>
                  <span
                    style={{
                      ...hd,
                      fontSize: 28,
                      color: G.text,
                    }}
                  >
                    {totalDeliverables}
                  </span>
                </div>
              )}
              {packageName && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Package size={14} color={G.textTer} />
                    <span
                      style={{
                        ...mono,
                        fontSize: 12,
                        color: G.textTer,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Package
                    </span>
                  </div>
                  <span
                    style={{
                      ...hd,
                      fontSize: 28,
                      color: G.text,
                    }}
                  >
                    {packageName}
                  </span>
                </div>
              )}
              {formattedDate && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Calendar size={14} color={G.textTer} />
                    <span
                      style={{
                        ...mono,
                        fontSize: 12,
                        color: G.textTer,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Delivered
                    </span>
                  </div>
                  <span
                    style={{
                      ...hd,
                      fontSize: 28,
                      color: G.text,
                    }}
                  >
                    {formattedDate}
                  </span>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Image Deliverables ── */}
        {statics.length > 0 && (
          <section style={{ marginBottom: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <BlurReveal
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: 980,
                  border: `1px solid ${G.goldBorder}`,
                  background: G.goldSoft,
                  marginBottom: 20,
                }}
              >
                <Image size={14} style={{ color: G.gold }} />
                <span
                  style={{
                    color: G.gold,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    ...mono,
                  }}
                >
                  Static Creatives
                </span>
              </BlurReveal>
              <ScrollBlurText
                as="h2"
                style={{
                  ...hd,
                  fontSize: 38,
                  color: G.text,
                  lineHeight: 1.2,
                  marginBottom: 12,
                  justifyContent: "center",
                }}
              >
                {`Image Deliverables (${statics.length})`}
              </ScrollBlurText>
              <BlurReveal
                as="p"
                style={{
                  color: G.textSec,
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 480,
                  margin: "0 auto",
                  ...mono,
                }}
              >
                Click any image to view full resolution. Download individually or grab them all at once.
              </BlurReveal>
            </div>

            {/* Download All Button */}
            <BlurReveal style={{ textAlign: "center", marginBottom: 32 }}>
              <button
                onClick={async () => {
                  if (zipProgress !== null) return;
                  setZipProgress(0);
                  await downloadAllAsZip(statics, clientName.replace(/\s+/g, "-").toLowerCase(), setZipProgress);
                  setZipProgress(null);
                }}
                disabled={zipProgress !== null}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 32px",
                  borderRadius: 980,
                  background: G.gold,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: zipProgress !== null ? "wait" : "pointer",
                  transition: "opacity 0.2s",
                  ...mono,
                }}
                onMouseEnter={(e) => { if (zipProgress === null) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {zipProgress !== null ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Preparing Download... {zipProgress}%
                  </>
                ) : (
                  <>
                    <FolderDown size={16} />
                    Download All Images ({statics.length})
                  </>
                )}
              </button>
            </BlurReveal>

            <div className="proposal-grid">
              {statics.map((src, i) => (
                <BlurReveal
                  key={i}
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `1px solid ${G.cardBorder}`,
                    boxShadow: G.cardShadow,
                    background: G.card,
                    cursor: "zoom-in",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div
                    onClick={() => setLightboxSrc(src)}
                    onMouseEnter={(e) => {
                      e.currentTarget.parentElement.style.transform = "scale(1.02)";
                      e.currentTarget.parentElement.style.boxShadow =
                        "0 8px 32px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.parentElement.style.transform = "scale(1)";
                      e.currentTarget.parentElement.style.boxShadow = G.cardShadow;
                    }}
                    style={{
                      position: "relative",
                      paddingTop: "100%",
                      background: "#F5F5F7",
                    }}
                  >
                    <img
                      src={src}
                      alt={`${clientName} deliverable ${i + 1}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: G.textSec,
                        ...mono,
                      }}
                    >
                      Creative {i + 1}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDownloading(i);
                        const ext = src.split(".").pop().split("?")[0] || "jpg";
                        await downloadImage(src, `${clientName.replace(/\s+/g, "-").toLowerCase()}-creative-${i + 1}.${ext}`);
                        setDownloading(null);
                      }}
                      disabled={downloading === i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: G.gold,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: G.goldSoft,
                        border: `1px solid ${G.goldBorder}`,
                        cursor: downloading === i ? "wait" : "pointer",
                        transition: "background 0.15s",
                        ...mono,
                      }}
                    >
                      {downloading === i ? (
                        <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Download size={12} />
                      )}
                      {downloading === i ? "Saving..." : "Download"}
                    </button>
                  </div>
                </BlurReveal>
              ))}
            </div>
          </section>
        )}

        {/* ── Video Deliverables ── */}
        {videos.length > 0 && (
          <section style={{ marginBottom: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <BlurReveal
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: 980,
                  border: `1px solid ${G.goldBorder}`,
                  background: G.goldSoft,
                  marginBottom: 20,
                }}
              >
                <Play size={14} style={{ color: G.gold }} />
                <span
                  style={{
                    color: G.gold,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    ...mono,
                  }}
                >
                  Video Creative
                </span>
              </BlurReveal>
              <ScrollBlurText
                as="h2"
                style={{
                  ...hd,
                  fontSize: 38,
                  color: G.text,
                  lineHeight: 1.2,
                  marginBottom: 12,
                  justifyContent: "center",
                }}
              >
                {`Video Deliverables (${videos.length})`}
              </ScrollBlurText>
              <BlurReveal
                as="p"
                style={{
                  color: G.textSec,
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 480,
                  margin: "0 auto",
                  ...mono,
                }}
              >
                Preview your videos below. Click the link to access the full
                quality file on Google Drive.
              </BlurReveal>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 32,
              }}
            >
              {videos.map((video, i) => (
                <BlurReveal
                  key={i}
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${G.cardBorder}`,
                    boxShadow: G.cardShadow,
                    overflow: "hidden",
                    background: G.card,
                  }}
                >
                  {/* Video title bar */}
                  <div
                    style={{
                      padding: "16px 24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: `1px solid ${G.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: G.goldSoft,
                          border: `1px solid ${G.goldBorder}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Play size={14} style={{ color: G.gold }} />
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: G.text,
                            margin: 0,
                            ...mono,
                          }}
                        >
                          {video.title || `Video ${i + 1}`}
                        </p>
                      </div>
                    </div>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fff",
                        textDecoration: "none",
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: G.gold,
                        ...mono,
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.85")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      <ExternalLink size={13} />
                      Open in Drive
                    </a>
                  </div>

                  {/* Video embed */}
                  <div
                    style={{
                      position: "relative",
                      paddingTop: "56.25%",
                      background: "#000",
                    }}
                  >
                    <iframe
                      src={video.embedUrl}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                      title={video.title || `Video ${i + 1}`}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                </BlurReveal>
              ))}
            </div>
          </section>
        )}

        {/* ── Completion Badge ── */}
        <section style={{ marginBottom: 80, textAlign: "center" }}>
          <BlurReveal>
            <div
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "40px 48px",
                background: G.card,
                border: `1px solid ${G.cardBorder}`,
                borderRadius: 20,
                boxShadow: G.cardShadow,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `${G.success}12`,
                  border: `2px solid ${G.success}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={24} color={G.success} />
              </div>
              <div>
                <h3
                  style={{
                    ...hd,
                    fontSize: 24,
                    color: G.text,
                    marginBottom: 4,
                  }}
                >
                  All Deliverables Complete
                </h3>
                <p
                  style={{
                    ...mono,
                    fontSize: 14,
                    color: G.textSec,
                    maxWidth: 360,
                    margin: "0 auto",
                    lineHeight: 1.6,
                  }}
                >
                  Everything has been delivered. If you have any questions or
                  need revisions, don't hesitate to reach out.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <a
                  href="tel:9294627048"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 24px",
                    borderRadius: 980,
                    background: G.gold,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    ...mono,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.85")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = "1")
                  }
                >
                  <Phone size={14} />
                  Contact Us
                </a>
              </div>
            </div>
          </BlurReveal>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: `1px solid ${G.border}`,
            padding: "32px 0",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: `1.5px solid ${G.goldBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>
                Alchemy Productions
              </span>
            </div>
            <span style={{ fontSize: 12, color: G.textTer, ...mono }}>
              Confidential Deliverables for {clientName}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 20 }}>
              <a
                href="/terms"
                style={{
                  fontSize: 12,
                  color: G.textTer,
                  textDecoration: "none",
                  ...mono,
                }}
              >
                Terms of Service
              </a>
              <a
                href="/privacy"
                style={{
                  fontSize: 12,
                  color: G.textTer,
                  textDecoration: "none",
                  ...mono,
                }}
              >
                Privacy Policy
              </a>
            </div>
            <span style={{ fontSize: 11, color: G.textTer, ...mono }}>
              &copy; 2026 Alchemy Productions LLC. All rights reserved.
            </span>
          </div>
        </footer>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-proposal-title { font-size: 36px !important; }
        }
      `}</style>
    </>
  );
}
