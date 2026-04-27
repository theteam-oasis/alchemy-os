"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles, MessageSquare, Palette, BarChart3, FileText, ArrowRight,
  ExternalLink, Check, RefreshCw, X, Image as ImageIcon, Globe, Users,
  Target, Calendar, TrendingUp, Activity, ChevronRight, Briefcase
} from "lucide-react";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  ink: "#000000", inkSoft: "#00000008", inkBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759", info: "#007AFF",
  approve: "#30A46C", reject: "#E5484D", revision: "#3E8ED0",
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

  // Check session auth
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`client_hub_auth_${slug}`);
      if (stored === "true") setAuthed(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !authed) return;
    fetch(`/api/client-portal/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setNotFound(true));
  }, [slug, authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    const expected = `${slug}2026`;
    if (password.trim().toLowerCase() === expected.toLowerCase()) {
      setAuthed(true);
      setAuthError(false);
      sessionStorage.setItem(`client_hub_auth_${slug}`, "true");
    } else {
      setAuthError(true);
    }
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
        <p style={{ fontSize: 14, color: G.textSec, marginBottom: 32 }}>Enter your password to access your client hub</p>
        <form onSubmit={handleLogin}>
          <input
            type="password" autoFocus value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
            placeholder="Password"
            style={{ width: "100%", padding: "14px 20px", fontSize: 15, border: `1px solid ${authError ? G.reject : G.border}`, borderRadius: 12, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", textAlign: "center", letterSpacing: "0.1em", fontFamily: "inherit" }}
          />
          {authError && <p style={{ fontSize: 13, color: G.reject, marginTop: 8 }}>Incorrect password</p>}
          <button type="submit" style={{ width: "100%", padding: "14px 0", marginTop: 16, fontSize: 15, fontWeight: 600, background: G.ink, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
            Enter Hub
          </button>
        </form>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: G.textTer }}>Loading...</p>
    </div>
  );

  const { client, intake, portals, dashboards, campaigns, feedback } = data;
  const portal = portals[0] || null; // primary portal (most clients have one)
  const totalAssets = portals.reduce((sum, p) => sum + (p.images?.length || 0) + (p.heroScripts?.length || 0) + (p.ugcScripts?.length || 0), 0);
  const totalDashboardRows = dashboards.reduce((sum, d) => sum + (d.rowCount || 0), 0);

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, color: G.text }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.ink }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em" }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </div>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{client.name}</span>
        </nav>

        {/* Hero */}
        <section style={{ padding: "48px 0 32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.inkBorder}`, background: G.inkSoft, marginBottom: 20 }}>
            <Briefcase size={14} style={{ color: G.ink }} />
            <span style={{ color: G.ink, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Client Hub</span>
          </div>
          <h1 style={{ ...hd, fontSize: 56, color: G.text, lineHeight: 1.05, marginBottom: 12 }}>
            Welcome, <span style={{ fontStyle: "italic" }}>{client.name}</span>
          </h1>
          <p style={{ fontSize: 16, color: G.textSec, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Your single hub for everything we&apos;re building together — feedback, brand, analytics, and creative briefs in one place.
          </p>
        </section>

        {/* KPI Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 48 }}>
          {[
            { label: "Assets in Review", value: totalAssets, sub: portal ? `Across ${portals.length} project${portals.length === 1 ? "" : "s"}` : "No portal yet" },
            { label: "Approved", value: feedback.approved, sub: "Items signed off", color: G.approve },
            { label: "Active Dashboards", value: dashboards.length, sub: `${totalDashboardRows.toLocaleString()} data points`, color: G.info },
            { label: "Creative Briefs", value: campaigns.length, sub: "Generated to date" },
          ].map((s, i) => (
            <div key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: "22px 24px" }}>
              <p style={{ color: G.textSec, fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ ...hd, fontSize: 40, color: s.color || G.text, lineHeight: 1, marginBottom: 6 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: G.textTer }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tools Section */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ ...hd, fontSize: 32, color: G.text, marginBottom: 4 }}>Your Tools</h2>
          <p style={{ fontSize: 14, color: G.textSec, marginBottom: 24 }}>Click any card to open the full tool</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

            {/* Feedback Portal */}
            {portal ? (
              <a href={`/portal/${portal.slug}`} target="_blank" rel="noreferrer"
                style={toolCardStyle({ active: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.ink, "#fff")}><MessageSquare size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={pillStyle(G.approve)}>● Live</span>
                    </div>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Feedback Portal</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Review draft assets, approve or request revisions, and chat with the team.
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 0", borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, marginBottom: 14 }}>
                  <div style={{ textAlign: "center" }}><p style={{ ...hd, fontSize: 22, color: G.text }}>{portal.images?.length || 0}</p><p style={{ fontSize: 10, color: G.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>Images</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ ...hd, fontSize: 22, color: G.text }}>{portal.heroScripts?.length || 0}</p><p style={{ fontSize: 10, color: G.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>Hero</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ ...hd, fontSize: 22, color: G.text }}>{portal.ugcScripts?.length || 0}</p><p style={{ fontSize: 10, color: G.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>UGC</p></div>
                </div>
                <div style={ctaRowStyle}>
                  <span>Open Portal</span>
                  <ArrowRight size={16} />
                </div>
              </a>
            ) : (
              <div style={toolCardStyle({ empty: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.bg, G.textTer, true)}><MessageSquare size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <span style={pillStyle(G.textTer)}>○ Coming soon</span>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4, marginTop: 4 }}>Feedback Portal</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Once your team uploads draft assets, you&apos;ll review them here.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Kit */}
            {intake ? (
              <a href={`#brand-kit`} onClick={(e) => { e.preventDefault(); document.getElementById("brand-kit")?.scrollIntoView({ behavior: "smooth" }); }}
                style={toolCardStyle({ active: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.ink, "#fff")}><Palette size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <span style={pillStyle(G.approve)}>● Complete</span>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4, marginTop: 4 }}>Brand Kit</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Your brand foundation — voice, audience, goals, and visual references.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {[intake.brand_name, intake.industry, intake.location].filter(Boolean).slice(0, 3).map((t, i) => (
                    <span key={i} style={tagStyle}>{t}</span>
                  ))}
                </div>
                <div style={ctaRowStyle}>
                  <span>View Brand</span>
                  <ArrowRight size={16} />
                </div>
              </a>
            ) : (
              <div style={toolCardStyle({ empty: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.bg, G.textTer, true)}><Palette size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <span style={pillStyle(G.textTer)}>○ Coming soon</span>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4, marginTop: 4 }}>Brand Kit</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Your brand identity will appear here once we capture it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing Dashboards */}
            {dashboards.length > 0 ? (
              <a href={`/marketing/${dashboards[0].slug}`} target="_blank" rel="noreferrer"
                style={toolCardStyle({ active: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.ink, "#fff")}><BarChart3 size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <span style={pillStyle(G.info)}>● Active</span>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4, marginTop: 4 }}>Marketing BI</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Live performance analytics with the Oracle AI copilot.
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 0", borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, marginBottom: 14 }}>
                  <div style={{ textAlign: "center" }}><p style={{ ...hd, fontSize: 22, color: G.text }}>{dashboards.length}</p><p style={{ fontSize: 10, color: G.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>Dashboards</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ ...hd, fontSize: 22, color: G.text }}>{totalDashboardRows.toLocaleString()}</p><p style={{ fontSize: 10, color: G.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>Data Points</p></div>
                </div>
                <div style={ctaRowStyle}>
                  <span>Open Dashboard</span>
                  <ArrowRight size={16} />
                </div>
              </a>
            ) : (
              <div style={toolCardStyle({ empty: true })}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={iconWrapStyle(G.bg, G.textTer, true)}><BarChart3 size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <span style={pillStyle(G.textTer)}>○ Coming soon</span>
                    <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4, marginTop: 4 }}>Marketing BI</p>
                    <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5 }}>
                      Performance analytics & AI insights will live here.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* All marketing dashboards (if more than one) */}
        {dashboards.length > 1 && (
          <div style={{ marginBottom: 60 }}>
            <h3 style={{ ...hd, fontSize: 24, color: G.text, marginBottom: 16 }}>All Dashboards</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dashboards.map(d => (
                <a key={d.id} href={`/marketing/${d.slug}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 14, textDecoration: "none", color: "inherit", transition: "all 0.2s", boxShadow: G.cardShadow }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = G.ink; e.currentTarget.style.transform = "translateX(2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = G.cardBorder; e.currentTarget.style.transform = "translateX(0)"; }}>
                  <div style={iconWrapStyle("#F5F5F7", G.ink)}><BarChart3 size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: G.text, marginBottom: 2 }}>{d.title}</p>
                    <p style={{ fontSize: 12, color: G.textTer }}>{d.rowCount.toLocaleString()} rows · {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <ChevronRight size={16} color={G.textTer} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Brand Kit Preview Section */}
        {intake && (
          <div id="brand-kit" style={{ marginBottom: 60, scrollMarginTop: 32 }}>
            <h3 style={{ ...hd, fontSize: 32, color: G.text, marginBottom: 4 }}>Brand Kit</h3>
            <p style={{ fontSize: 14, color: G.textSec, marginBottom: 24 }}>The foundation for everything we create together.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, marginBottom: 14 }}>Brand Details</p>
                {[["Brand", intake.brand_name], ["Website", intake.website], ["Industry", intake.industry], ["Location", intake.location]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}` }}>
                    <span style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ fontSize: 13, color: G.text, lineHeight: 1.5 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, marginBottom: 14 }}>Campaign Context</p>
                {[["Audience", intake.target_audience], ["Goals", intake.campaign_goals], ["Budget", intake.budget], ["Timeline", intake.timeline]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}` }}>
                    <span style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ fontSize: 13, color: G.text, lineHeight: 1.5 }}>{v}</span>
                  </div>
                ))}
              </div>
              {intake.product_image_urls?.length > 0 && (
                <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, marginBottom: 14 }}>Product Imagery</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {intake.product_image_urls.map((u, i) => (
                      <img key={i} src={u} alt="" style={{ width: 88, height: 88, borderRadius: 10, objectFit: "cover", border: `1px solid ${G.border}` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginTop: 60, marginBottom: 40, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.inkBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={10} style={{ color: G.textTer }} />
            </div>
            <span style={{ fontSize: 13, color: G.textTer }}>Alchemy Productions</span>
          </div>
          <p style={{ fontSize: 11, color: G.textTer }}>&copy; {new Date().getFullYear()} Alchemy Productions LLC. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

// ── Inline style helpers ──
function toolCardStyle({ active, empty }) {
  return {
    display: "flex", flexDirection: "column", padding: 24,
    background: G.card, border: `1px solid ${empty ? G.border : G.cardBorder}`,
    borderStyle: empty ? "dashed" : "solid",
    boxShadow: empty ? "none" : G.cardShadow,
    borderRadius: 20, transition: "all 0.25s ease",
    textDecoration: "none", color: "inherit",
    cursor: empty ? "default" : "pointer",
    opacity: empty ? 0.7 : 1,
    minHeight: 240,
    fontFamily: "inherit",
    onMouseEnter: undefined, onMouseLeave: undefined,
    // Hover handled via CSS-in-JS would need state; using subtle base style instead
  };
}
function iconWrapStyle(bg, color, soft = false) {
  return { width: 44, height: 44, borderRadius: 12, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: soft ? `1px solid ${G.border}` : "none" };
}
function pillStyle(color) {
  return { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color, padding: "3px 10px", borderRadius: 980, background: color + "15" };
}
const tagStyle = { fontSize: 11, fontWeight: 500, color: G.textSec, padding: "4px 10px", background: "#F5F5F7", borderRadius: 980, border: `1px solid ${G.border}` };
const ctaRowStyle = { marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: G.ink, paddingTop: 4 };
