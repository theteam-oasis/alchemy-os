"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles, MessageSquare, Palette, BarChart3, FileText, ArrowRight,
  ExternalLink, Check, RefreshCw, X, Image as ImageIcon, Globe, Users,
  Target, Calendar, TrendingUp, Activity, ChevronRight, Briefcase,
  LogOut, Menu, ChevronLeft, Loader2,
} from "lucide-react";
import PortalChat from "@/components/PortalChat";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  ink: "#000000", inkSoft: "#00000008", inkBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759", info: "#007AFF",
  approve: "#30A46C", reject: "#E5484D", revision: "#3E8ED0",
  sidebar: "#FAFAFA",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

export default function ClientHubPage() {
  const params = useParams();
  const slug = params?.slug;
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [section, setSection] = useState("analytics"); // analytics | creatives | brand
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile

  // Session auth
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`client_hub_auth_${slug}`);
      if (stored === "true") setAuthed(true);
    }
  }, [slug]);

  // Fetch hub data + auto-provision a dashboard if none + auto-auth linked portals
  useEffect(() => {
    if (!slug || !authed) return;
    fetch(`/api/client-portal/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(async d => {
        setData(d);
        if (typeof window !== "undefined" && d?.portals) {
          for (const p of d.portals) {
            if (p.id) localStorage.setItem(`portal_auth_${p.id}`, "true");
            if (p.slug) localStorage.setItem(`portal_auth_${p.slug}`, "true");
          }
        }
        if (d?.client?.id && (!d.dashboards || d.dashboards.length === 0)) {
          try {
            const res = await fetch("/api/marketing-dashboards", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: d.client.id,
                clientName: d.client.name,
                title: `${d.client.name} Analytics`,
                fileName: "placeholder.csv",
                headers: ["Date", "Spend", "Revenue", "Impressions", "Clicks"],
                rows: [],
              }),
            });
            if (res.ok) {
              const created = await res.json();
              if (created?.success && created.dashboard) {
                setData(prev => ({
                  ...prev,
                  dashboards: [{
                    id: created.dashboard.id,
                    slug: created.dashboard.slug,
                    title: created.dashboard.title,
                    fileName: created.dashboard.file_name,
                    rowCount: 0, columnCount: 5,
                    createdAt: created.dashboard.created_at || new Date().toISOString(),
                  }],
                }));
              }
            }
          } catch (e) { console.error("auto-provision dashboard:", e); }
        }
      })
      .catch(() => setNotFound(true));
  }, [slug, authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    const expected = `${slug}2026`;
    if (password.trim().toLowerCase() === expected.toLowerCase()) {
      setAuthed(true);
      setAuthError(false);
      localStorage.setItem(`client_hub_auth_${slug}`, "true");
    } else {
      setAuthError(true);
    }
  };

  const signOut = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`client_hub_auth_${slug}`);
    setAuthed(false);
    setData(null);
  };

  if (notFound) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, padding: 24, textAlign: "center" }}>
      <h2 style={{ ...hd, fontSize: 32, color: G.text }}>Client Not Found</h2>
      <p style={{ color: G.textSec, fontSize: 15 }}>We couldn&apos;t find a client at this link.</p>
    </div>
  );

  if (!authed) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${G.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} style={{ color: G.ink }} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: G.text, letterSpacing: "0.05em" }}>ALCHEMY</span>
        </div>
        <h2 style={{ ...hd, fontSize: 36, color: G.text, marginBottom: 8 }}>Welcome</h2>
        <p style={{ fontSize: 14, color: G.textSec, marginBottom: 32 }}>Enter your password to access your workspace</p>
        <form onSubmit={handleLogin}>
          <input
            type="password" autoFocus value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
            placeholder="Password"
            style={{ width: "100%", padding: "14px 20px", fontSize: 15, border: `1px solid ${authError ? G.reject : G.border}`, borderRadius: 12, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", textAlign: "center", letterSpacing: "0.1em", fontFamily: "inherit" }}
          />
          {authError && <p style={{ fontSize: 13, color: G.reject, marginTop: 8 }}>Incorrect password</p>}
          <button type="submit" style={{ width: "100%", padding: "14px 0", marginTop: 16, fontSize: 15, fontWeight: 600, background: G.ink, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
            Enter Workspace
          </button>
        </form>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={20} style={{ animation: "spinKf 1s linear infinite" }} color={G.textTer} />
      <style>{`@keyframes spinKf { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { client, intake, portals, dashboards, campaigns, feedback } = data;
  const portal = portals[0] || null;
  const totalAssets = portal ? (portal.images?.length || 0) + (portal.heroScripts?.length || 0) + (portal.ugcScripts?.length || 0) : 0;
  const pendingCount = totalAssets - (feedback.approved + feedback.revision + feedback.rejected);

  const sections = [
    { k: "analytics", lbl: "Analytics", icon: <BarChart3 size={16} /> },
    { k: "creatives", lbl: "Creatives", icon: <MessageSquare size={16} />, badge: pendingCount > 0 ? pendingCount : null },
    { k: "brand", lbl: "Brand Guidelines", icon: <Palette size={16} /> },
  ];

  // Brand initial avatar
  const initial = client.name?.[0]?.toUpperCase() || "•";

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, color: G.text }}>
      <style>{`
        @keyframes spinKf { to { transform: rotate(360deg); } }
        .ch-shell { display: flex; min-height: 100vh; }
        .ch-side { width: 240px; flex-shrink: 0; background: ${G.sidebar}; border-right: 1px solid ${G.border}; display: flex; flex-direction: column; padding: 22px 16px; position: sticky; top: 0; height: 100vh; }
        .ch-main { flex: 1; min-width: 0; min-height: 100vh; }
        .ch-mobile-bar { display: none; }
        @media (max-width: 880px) {
          .ch-side { position: fixed; left: ${sidebarOpen ? "0" : "-260px"}; top: 0; bottom: 0; z-index: 100; transition: left 0.25s ease; box-shadow: ${sidebarOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none"}; }
          .ch-mobile-bar { display: flex; }
          .ch-overlay { display: ${sidebarOpen ? "block" : "none"}; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
        }
        .ch-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; color: ${G.textSec}; cursor: pointer; border: none; background: transparent; text-align: left; width: 100%; transition: all 0.15s; font-family: inherit; }
        .ch-nav-item:hover { background: ${G.bg}; color: ${G.text}; }
        .ch-nav-item.active { background: ${G.ink}; color: #fff; font-weight: 600; }
        .ch-nav-item .badge { margin-left: auto; background: ${G.reject}; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 980px; min-width: 18px; text-align: center; }
        .ch-nav-item.active .badge { background: rgba(255,255,255,0.25); }
      `}</style>

      <div className="ch-shell">
        {/* Mobile overlay */}
        <div className="ch-overlay" onClick={() => setSidebarOpen(false)}></div>

        {/* Sidebar */}
        <aside className="ch-side">
          {/* Brand identity at top */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${G.ink}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={13} style={{ color: G.ink }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: G.text, letterSpacing: "0.05em", lineHeight: 1.1 }}>ALCHEMY</p>
              <p style={{ fontSize: 10, color: G.textTer, fontWeight: 400, lineHeight: 1.1, marginTop: 1 }}>Productions</p>
            </div>
          </div>

          {/* Client identity card */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", background: G.bg, border: `1px solid ${G.border}`, borderRadius: 12, marginBottom: 22 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: G.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.name}</p>
              <p style={{ fontSize: 10, color: G.textTer, marginTop: 2 }}>Client workspace</p>
            </div>
          </div>

          {/* Section nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, padding: "6px 12px", marginBottom: 4 }}>Workspace</p>
            {sections.map(s => (
              <button key={s.k} className={`ch-nav-item${section === s.k ? " active" : ""}`} onClick={() => { setSection(s.k); setSidebarOpen(false); }}>
                {s.icon}
                <span>{s.lbl}</span>
                {s.badge && <span className="badge">{s.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Sign out at bottom */}
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${G.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <button className="ch-nav-item" onClick={signOut}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="ch-main">
          {/* Mobile top bar */}
          <div className="ch-mobile-bar" style={{ alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${G.border}`, background: G.bg, position: "sticky", top: 0, zIndex: 50 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: G.text }}><Menu size={20} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, color: G.text }}>{sections.find(s => s.k === section)?.lbl}</span>
            <span style={{ width: 32 }} />
          </div>

          {/* Section content */}
          {section === "analytics" && (
            <AnalyticsSection
              client={client}
              dashboard={dashboards[0]}
              dashboards={dashboards}
              campaigns={campaigns}
              feedback={feedback}
              totalAssets={totalAssets}
            />
          )}

          {section === "creatives" && (
            <CreativesSection portal={portal} feedback={feedback} clientName={client.name} />
          )}

          {section === "brand" && (
            <BrandSection intake={intake} clientName={client.name} />
          )}
        </main>
      </div>

      {/* Floating chat - always available */}
      {portal && <PortalChat projectId={portal.id} sender="client" brandName={client?.name || ""} />}
    </div>
  );
}

// ───────────────────────────── Sections ─────────────────────────────

function AnalyticsSection({ client, dashboard, dashboards, campaigns, feedback, totalAssets }) {
  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1280, margin: "0 auto" }}>
      <SectionHeader title="Analytics" subtitle="Live performance data, KPIs and Oracle AI insights." />

      {/* Inline iframe of the marketing dashboard (full functionality) */}
      {dashboard ? (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, overflow: "hidden", minHeight: 800 }}>
          <iframe
            src={`/marketing/${dashboard.slug}?embed=1`}
            title={`${client.name} Analytics`}
            style={{ width: "100%", height: "calc(100vh - 180px)", minHeight: 720, border: "none", display: "block" }}
            allow="clipboard-write"
          />
        </div>
      ) : (
        <div style={{ padding: 40, background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, textAlign: "center" }}>
          <Loader2 size={24} style={{ animation: "spinKf 1s linear infinite" }} color={G.textTer} />
          <p style={{ fontSize: 13, color: G.textSec, marginTop: 10 }}>Setting up your analytics workspace...</p>
        </div>
      )}
    </div>
  );
}

function CreativesSection({ portal, feedback, clientName }) {
  if (!portal) {
    return (
      <div style={{ padding: "32px 40px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Creatives" subtitle="Review draft assets and approve or request revisions." />
        <div style={{ padding: 60, background: G.card, border: `1px dashed ${G.border}`, borderRadius: 18, textAlign: "center" }}>
          <MessageSquare size={36} color={G.textTer} style={{ marginBottom: 12 }} />
          <h3 style={{ ...hd, fontSize: 24, color: G.text, marginBottom: 6 }}>No creatives yet</h3>
          <p style={{ fontSize: 13, color: G.textSec, maxWidth: 460, margin: "0 auto" }}>Once your team uploads draft assets, they&apos;ll appear here for your review and approval.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: "32px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
      <SectionHeader
        title="Creatives"
        subtitle={`Review and approve assets. ${feedback.approved} approved · ${feedback.revision} revisions · ${feedback.rejected} rejected.`}
      />
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, overflow: "hidden", minHeight: 800 }}>
        <iframe
          src={`/portal/${portal.slug}?embed=1`}
          title={`${clientName} Creatives`}
          style={{ width: "100%", height: "calc(100vh - 180px)", minHeight: 720, border: "none", display: "block" }}
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}

function BrandSection({ intake, clientName }) {
  if (!intake) {
    return (
      <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <SectionHeader title="Brand Guidelines" subtitle="Your brand foundation - voice, audience, visual references." />
        <div style={{ padding: 60, background: G.card, border: `1px dashed ${G.border}`, borderRadius: 18, textAlign: "center" }}>
          <Palette size={36} color={G.textTer} style={{ marginBottom: 12 }} />
          <h3 style={{ ...hd, fontSize: 24, color: G.text, marginBottom: 6 }}>Brand Guidelines coming soon</h3>
          <p style={{ fontSize: 13, color: G.textSec, maxWidth: 460, margin: "0 auto" }}>Your brand identity will live here once we capture it together.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader title="Brand Guidelines" subtitle={`The foundation for everything we create for ${clientName}.`} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {(intake.tagline || intake.story) && (
          <BrandCard fullWidth title="Brand Story">
            {intake.tagline && <p style={{ ...hd, fontSize: 26, color: G.text, marginBottom: 12, lineHeight: 1.25, fontStyle: "italic" }}>&ldquo;{intake.tagline}&rdquo;</p>}
            {intake.story && <p style={{ fontSize: 14, color: G.textSec, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{intake.story}</p>}
          </BrandCard>
        )}

        <BrandCard title="Brand Details">
          {[["Brand", intake.brand_name], ["Website", intake.website], ["Industry", intake.industry], ["Location", intake.location]].filter(([, v]) => v).map(([k, v]) => (
            <BrandRow key={k} label={k} value={k === "Website" ? <a href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer" style={{ color: G.ink, textDecoration: "none", borderBottom: `1px solid ${G.inkBorder}` }}>{v}</a> : v} />
          ))}
        </BrandCard>

        {(intake.personality_tags?.length > 0 || typeof intake.tone_formality === "number") && (
          <BrandCard title="Personality & Tone">
            {intake.personality_tags?.length > 0 && (
              <div style={{ marginBottom: typeof intake.tone_formality === "number" ? 16 : 0 }}>
                <p style={brandLabelStyle}>Personality</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {intake.personality_tags.map((t, i) => <span key={i} style={tagStyle}>{t}</span>)}
                </div>
              </div>
            )}
            {[["Formality", intake.tone_formality, "Casual", "Formal"], ["Mood", intake.tone_mood, "Serious", "Playful"], ["Intensity", intake.tone_intensity, "Calm", "Bold"]].filter(([, v]) => typeof v === "number").map(([k, v, lo, hi]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...brandLabelStyle, marginBottom: 0 }}>{k}</span>
                  <span style={{ fontSize: 11, color: G.textTer }}>{lo} ↔ {hi}</span>
                </div>
                <div style={{ position: "relative", height: 6, background: "#F5F5F7", borderRadius: 999 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${v}%`, background: G.ink, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </BrandCard>
        )}

        {intake.brand_colors && (
          <BrandCard title="Brand Colors">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {String(intake.brand_colors).split(/[,\s]+/).filter(c => /^#?[0-9A-Fa-f]{3,8}$/.test(c)).map((c, i) => {
                const hex = c.startsWith("#") ? c : `#${c}`;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: hex, border: `1px solid ${G.border}` }} />
                    <span style={{ fontSize: 10, color: G.textTer, fontFamily: "monospace" }}>{hex}</span>
                  </div>
                );
              })}
            </div>
          </BrandCard>
        )}

        {(intake.audience_description || intake.age_range || intake.competitors || intake.deepest_fears || intake.deepest_desires) && (
          <BrandCard fullWidth title="Audience & Market">
            {intake.age_range && <BrandRow label="Age Range" value={intake.age_range} />}
            {intake.audience_description && <BrandLongRow label="Audience" value={intake.audience_description} />}
            {intake.competitors && <BrandLongRow label="Competitors" value={intake.competitors} />}
            {intake.deepest_fears && <BrandLongRow label="Deep Fears" value={intake.deepest_fears} />}
            {intake.deepest_desires && <BrandLongRow label="Deep Desires" value={intake.deepest_desires} />}
          </BrandCard>
        )}

        {(intake.influencer_age || intake.influencer_gender || intake.influencer_style || intake.influencer_personality || intake.influencer_notes) && (
          <BrandCard fullWidth title="Spokesperson Profile">
            {[
              ["Age", intake.influencer_age],
              ["Gender", intake.influencer_gender],
              ["Ethnicity", intake.influencer_ethnicity],
              ["Body Type", intake.influencer_body_type],
              ["Hair", [intake.influencer_hair_color, intake.influencer_hair_style].filter(Boolean).join(", ")],
              ["Style", intake.influencer_style],
              ["Personality", intake.influencer_personality],
              ["Notes", intake.influencer_notes],
            ].filter(([, v]) => v).map(([k, v]) => (
              String(v).length > 90 ? <BrandLongRow key={k} label={k} value={v} /> : <BrandRow key={k} label={k} value={v} />
            ))}
          </BrandCard>
        )}

        {(intake.voice_style?.length > 0 || intake.voice_gender || intake.voice_age || intake.voice_notes) && (
          <BrandCard title="Voice">
            {intake.voice_style?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={brandLabelStyle}>Style</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{intake.voice_style.map((t, i) => <span key={i} style={tagStyle}>{t}</span>)}</div>
              </div>
            )}
            {intake.voice_gender && <BrandRow label="Gender" value={intake.voice_gender} />}
            {intake.voice_age && <BrandRow label="Age" value={intake.voice_age} />}
            {intake.voice_notes && <BrandLongRow label="Notes" value={intake.voice_notes} />}
          </BrandCard>
        )}

        {(intake.music_mood?.length > 0 || intake.music_genres?.length > 0 || intake.music_notes) && (
          <BrandCard title="Music">
            {intake.music_mood?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={brandLabelStyle}>Mood</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{intake.music_mood.map((t, i) => <span key={i} style={tagStyle}>{t}</span>)}</div>
              </div>
            )}
            {intake.music_genres?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={brandLabelStyle}>Genres</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{intake.music_genres.map((t, i) => <span key={i} style={tagStyle}>{t}</span>)}</div>
              </div>
            )}
            {intake.music_notes && <BrandLongRow label="Notes" value={intake.music_notes} />}
          </BrandCard>
        )}

        {(typeof intake.video_pace === "number" || intake.video_transitions || intake.video_notes) && (
          <BrandCard title="Video Direction">
            {[["Pace", intake.video_pace, "Slow", "Fast"], ["Energy", intake.video_energy, "Calm", "Hyped"]].filter(([, v]) => typeof v === "number").map(([k, v, lo, hi]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...brandLabelStyle, marginBottom: 0 }}>{k}</span>
                  <span style={{ fontSize: 11, color: G.textTer }}>{lo} ↔ {hi}</span>
                </div>
                <div style={{ position: "relative", height: 6, background: "#F5F5F7", borderRadius: 999 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${v}%`, background: G.ink, borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {intake.video_transitions && <BrandRow label="Transitions" value={intake.video_transitions} />}
            {intake.video_cuts && <BrandRow label="Cuts" value={intake.video_cuts} />}
            {intake.video_notes && <BrandLongRow label="Notes" value={intake.video_notes} />}
          </BrandCard>
        )}

        {(intake.objective || intake.key_message || intake.target_audience || intake.campaign_goals) && (
          <BrandCard fullWidth title="Strategy">
            {[["Objective", intake.objective], ["Audience", intake.target_audience], ["Goals", intake.campaign_goals], ["Budget", intake.budget], ["Timeline", intake.timeline]].filter(([, v]) => v).map(([k, v]) => (
              String(v).length > 90 ? <BrandLongRow key={k} label={k} value={v} /> : <BrandRow key={k} label={k} value={v} />
            ))}
            {intake.key_message && <BrandLongRow label="Key Message" value={intake.key_message} />}
          </BrandCard>
        )}

        {intake.unique_features?.length > 0 && (
          <BrandCard fullWidth title="Unique Features">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {intake.unique_features.map((f, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#F5F5F7", borderRadius: 10, fontSize: 13, color: G.text, lineHeight: 1.6 }}>{f}</div>
              ))}
            </div>
          </BrandCard>
        )}

        {intake.testimonials?.length > 0 && (
          <BrandCard fullWidth title="Testimonials">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
              {intake.testimonials.map((t, i) => (
                <div key={i} style={{ padding: 14, background: "#F5F5F7", borderRadius: 10, fontSize: 13, color: G.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{t}</div>
              ))}
            </div>
          </BrandCard>
        )}

        {intake.product_image_urls?.length > 0 && (
          <BrandCard fullWidth title="Product Imagery">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {intake.product_image_urls.map((u, i) => (
                <img key={i} src={u} alt="" style={{ width: 110, height: 110, borderRadius: 12, objectFit: "cover", border: `1px solid ${G.border}` }} />
              ))}
            </div>
          </BrandCard>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ ...hd, fontSize: 36, color: G.text, marginBottom: 4 }}>{title}</h1>
      <p style={{ fontSize: 14, color: G.textSec, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

// ── Inline style helpers (for BrandCard etc.) ──
const tagStyle = { fontSize: 11, fontWeight: 500, color: G.textSec, padding: "4px 10px", background: "#F5F5F7", borderRadius: 980, border: `1px solid ${G.border}` };
const brandLabelStyle = { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: G.textTer, marginBottom: 6 };

function BrandCard({ title, children, fullWidth }) {
  return (
    <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, marginBottom: 14 }}>{title}</p>
      {children}
    </div>
  );
}

function BrandRow({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}`, alignItems: "start" }}>
      <span style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 13, color: G.text, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function BrandLongRow({ label, value }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${G.border}` }}>
      <p style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 13, color: G.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}
