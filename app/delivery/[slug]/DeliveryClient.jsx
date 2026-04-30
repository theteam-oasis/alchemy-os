"use client";
import { useState, useEffect } from "react";
import { Sparkles, Image, Film, Video, Download, Check, ChevronLeft, ChevronRight, X, Lock } from "lucide-react";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000", goldSoft: "#00000008", goldBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

export default function DeliveryClient({ slug }) {
  const [project, setProject] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("images");
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [projectSlug, setProjectSlug] = useState(null);
  const [customPassword, setCustomPassword] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`delivery_auth_${slug}`);
      if (stored === "true") setAuthed(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/portal/projects/${slug}`).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(data => {
      setProjectSlug(data.slug || slug);
      if (data.password) setCustomPassword(data.password);
      if (authed) {
        setProject(data);
        fetch(`/api/portal/feedback?projectId=${slug}`).then(r => r.json()).then(fb => setFeedback(fb));
      }
    }).catch(() => setNotFound(true));
  }, [slug, authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    const input = password.trim();
    const fallback = `${(projectSlug || slug).toLowerCase()}2026`;
    const valid = customPassword ? input === customPassword : input.toLowerCase() === fallback;
    if (valid) {
      setAuthed(true);
      setAuthError(false);
      sessionStorage.setItem(`delivery_auth_${slug}`, "true");
    } else {
      setAuthError(true);
    }
  };

  const downloadImage = async (url, name) => {
    try {
      const res = await fetch(`/api/download-image?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || "image.jpg")}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name || "image.jpg";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  if (notFound) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <h2 style={{ ...hd, fontSize: 32, color: G.text }}>Not Found</h2>
      <p style={{ ...mono, color: G.textSec, fontSize: 15 }}>This delivery link may be invalid.</p>
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
        <h2 style={{ ...hd, fontSize: 28, color: G.text, marginBottom: 8 }}>Your Assets Are Ready</h2>
        <p style={{ ...mono, fontSize: 14, color: G.textSec, marginBottom: 32 }}>Enter your password to access your final deliverables</p>
        <form onSubmit={handleLogin}>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(false); }} placeholder="Password" autoFocus
            style={{ ...mono, width: "100%", padding: "14px 20px", fontSize: 15, border: `1px solid ${authError ? "#E5484D" : G.border}`, borderRadius: 12, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", textAlign: "center", letterSpacing: "0.1em" }} />
          {authError && <p style={{ ...mono, fontSize: 13, color: "#E5484D", marginTop: 8 }}>Incorrect password</p>}
          <button type="submit" style={{ ...mono, width: "100%", padding: "14px 0", marginTop: 16, fontSize: 15, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer" }}>Access Deliverables</button>
        </form>
      </div>
    </div>
  );

  if (!project) return <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: G.textTer }}>Loading...</p></div>;

  // Filter to only approved assets
  const approvedImages = (project.images || []).filter(img => feedback[img.id]?.status === "approved");
  const approvedHero = (project.heroScripts || []).filter(s => feedback[s.id]?.status === "approved");
  const approvedUgc = (project.ugcScripts || []).filter(s => feedback[s.id]?.status === "approved");
  const totalApproved = approvedImages.length + approvedHero.length + approvedUgc.length;
  const clientName = (project.clientName || "").replace(/\b\w/g, c => c.toUpperCase());
  const ratio = project.imageRatio || "1/1";

  // Lightbox for images
  const lbImg = lightboxIdx !== null ? approvedImages[lightboxIdx] : null;

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg }}>
      <style>{`
        .delivery-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
        @media (max-width: 768px) { .delivery-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px" }}>
        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </div>
          <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: G.text }}>{clientName}</span>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: "center", padding: "48px 0 40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, background: G.success + "12", marginBottom: 24 }}>
            <Check size={14} style={{ color: G.success }} />
            <span style={{ color: G.success, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Approved & Ready</span>
          </div>
          <h1 style={{ ...hd, fontSize: 48, color: G.text, lineHeight: 1.1, marginBottom: 12 }}>Your <span style={{ fontStyle: "italic" }}>Final</span> Assets</h1>
          <p style={{ color: G.textSec, fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto", ...mono }}>{totalApproved} approved asset{totalApproved !== 1 ? "s" : ""} ready for download</p>
        </section>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {[
            { k: "images", l: "Images", icon: <Image size={14} />, count: approvedImages.length },
            { k: "hero", l: "Hero Videos", icon: <Film size={14} />, count: approvedHero.length },
            { k: "ugc", l: "UGC Videos", icon: <Video size={14} />, count: approvedUgc.length },
          ].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)}
              style={{
                ...mono, display: "flex", alignItems: "center", gap: 6,
                padding: "10px 24px", borderRadius: 980, fontSize: 13, fontWeight: activeTab === t.k ? 600 : 500,
                cursor: "pointer", border: `1px solid ${activeTab === t.k ? G.gold : G.border}`,
                background: activeTab === t.k ? G.gold : "transparent",
                color: activeTab === t.k ? "#fff" : G.textSec,
                transition: "all 0.2s",
              }}>
              {t.icon} {t.l} ({t.count})
            </button>
          ))}
        </div>

        {/* Images Tab */}
        {activeTab === "images" && (
          approvedImages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: G.textTer }}>
              <Image size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ ...mono, fontSize: 15 }}>No approved images yet</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => approvedImages.forEach((img, i) => setTimeout(() => downloadImage(img.url, img.name || `image_${i+1}.jpg`), i * 300))}
                  style={{ ...mono, display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer" }}>
                  <Download size={14} /> Download All Images
                </button>
              </div>
              <div className="delivery-grid">
                {approvedImages.map((img, i) => (
                  <div key={img.id} style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${G.border}`, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <img src={img.url} alt="" style={{ width: "100%", aspectRatio: ratio, objectFit: "cover", display: "block" }} onClick={() => setLightboxIdx(i)} />
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: G.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={12} strokeWidth={3} color="#fff" />
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.name); }}
                      style={{ position: "absolute", bottom: 8, right: 8, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {/* Hero Scripts Tab */}
        {activeTab === "hero" && (
          approvedHero.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: G.textTer }}>
              <Film size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ ...mono, fontSize: 15 }}>No approved hero scripts yet</p>
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {approvedHero.map(s => (
                <div key={s.id} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 20, padding: 32, position: "relative" }}>
                  <div style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", background: G.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={14} strokeWidth={3} color="#fff" />
                  </div>
                  <h3 style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ ...mono, fontSize: 12, color: G.textTer, marginBottom: 16 }}>Approved Hero Script</p>
                  <div style={{ background: "#F8F8FA", borderRadius: 12, padding: 20 }}>
                    <p style={{ ...mono, fontSize: 14, color: G.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{s.content}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(s.content); }}
                    style={{ ...mono, display: "flex", alignItems: "center", gap: 6, marginTop: 16, padding: "8px 16px", fontSize: 12, fontWeight: 500, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                    Copy Script
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* UGC Scripts Tab */}
        {activeTab === "ugc" && (
          approvedUgc.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: G.textTer }}>
              <Video size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ ...mono, fontSize: 15 }}>No approved UGC scripts yet</p>
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {approvedUgc.map(s => (
                <div key={s.id} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 20, padding: 32, position: "relative" }}>
                  <div style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", background: G.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={14} strokeWidth={3} color="#fff" />
                  </div>
                  <h3 style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ ...mono, fontSize: 12, color: G.textTer, marginBottom: 16 }}>Approved UGC Script</p>
                  <div style={{ background: "#F8F8FA", borderRadius: 12, padding: 20 }}>
                    <p style={{ ...mono, fontSize: 14, color: G.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{s.content}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(s.content); }}
                    style={{ ...mono, display: "flex", alignItems: "center", gap: 6, marginTop: 16, padding: "8px 16px", fontSize: 12, fontWeight: 500, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 980, cursor: "pointer" }}>
                    Copy Script
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Lightbox */}
        {lbImg && (
          <div onClick={() => setLightboxIdx(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <button onClick={() => setLightboxIdx(null)} style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            {lightboxIdx > 0 && <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }} style={{ position: "absolute", left: 20, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={24} /></button>}
            {lightboxIdx < approvedImages.length - 1 && <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }} style={{ position: "absolute", right: 20, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={24} /></button>}
            <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 24, maxWidth: "90vw", maxHeight: "85vh", alignItems: "center" }}>
              <img src={lbImg.url} alt="" style={{ maxWidth: "70vw", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" }} />
              <div style={{ width: 200, flexShrink: 0 }}>
                <button onClick={() => downloadImage(lbImg.url, lbImg.name)}
                  style={{ ...mono, display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, background: "#fff", color: G.text, border: "none", borderRadius: 980, cursor: "pointer", width: "100%" }}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginTop: 80, marginBottom: 40 }}>
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
    </div>
  );
}
