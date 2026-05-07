"use client";
// Team-side workspace at /team/[slug] - identical layout to the client hub
// (/client/[slug]) but the iframes load the team's upload/edit views so the
// team builds content while the client reviews it. Auto-provisions a creatives
// portal and an analytics dashboard so there are no "Generate" buttons.
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles, MessageSquare, Palette, BarChart3, FileText, ArrowRight,
  ExternalLink, Check, RefreshCw, X, Image as ImageIcon, Globe, Users,
  Target, Calendar, TrendingUp, Activity, ChevronRight, Briefcase,
  LogOut, Menu, ChevronLeft, Loader2, Settings, Eye, Trash2, Bell, CheckCircle2, MessageCircle, Film, Wand2,
} from "lucide-react";
import DashboardChat from "@/components/DashboardChat";
import SectionHeader from "@/components/SectionHeader";
import { SECTION_COPY } from "@/lib/sectionCopy";
import { BrandKitGrid } from "@/components/BrandKit";
import ProductSwitcher from "@/components/ProductSwitcher";
import { supabase } from "@/lib/supabase";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  ink: "#000000", inkSoft: "#00000008", inkBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759", info: "#007AFF",
  approve: "#30A46C", reject: "#E5484D", revision: "#3E8ED0",
  sidebar: "#F8F8FA",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function TeamWorkspacePage() {
  const params = useParams();
  const slug = params?.slug;
  const [client, setClient] = useState(null);
  const [intake, setIntake] = useState(null);
  const [portal, setPortal] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [feedback, setFeedback] = useState({ approved: 0, rejected: 0, revision: 0 });
  const [notFound, setNotFound] = useState(false);
  const [section, setSection] = useState("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Multi-product support: each client can have multiple products. The switcher
  // in the sidebar swaps the active product, which scopes Analytics + Creatives.
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);

  // Static Studio generation state - lifted UP from the StaticStudio component
  // so it persists across sidebar navigation. If the team clicks away mid-batch,
  // the in-flight fetches keep saving to the DB AND when they come back to
  // Static Studio they still see the running progress + final result.
  // Bumped after deleting the CSV so the dashboard-load effect re-runs and
  // walks its "no dashboard found -> auto-create placeholder" branch, which
  // gives the analytics view an empty row set that triggers the demo-data
  // fallback in MarketingDashboardView.
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const [genState, setGenState] = useState({
    generating: false,
    progress: { done: 0, total: 0 },
    results: null, // { generated, failed, images, failures, portalSlug }
    error: "",
    aspectRatio: "1:1",
    headlines: ["", "", "", "", ""],
    prompts: ["", "", "", "", ""],
    // One reference image URL per headline row. "" = no reference (fall back
    // to text-only prompt). Picked by the team from activeProduct.product_image_urls.
    headlineImageUrls: ["", "", "", "", ""],
    jobId: null, // server-side job id; polling resumes any time we have one
  });

  // Resume polling whenever we have an active jobId. This effect lives at the
  // PARENT level so polling runs regardless of which sidebar section is active
  // — the team can leave Static Studio mid-generation and progress still ticks
  // forward in the background. Even better: the orchestrator runs entirely on
  // Vercel via waitUntil(), so the job keeps generating even if the user closes
  // the browser tab. Coming back later, we'd need to restore jobId from URL/db
  // to resume the UI — for now polling continues for the lifetime of the page.
  useEffect(() => {
    if (!genState.jobId || !genState.generating) return;
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      try {
        const r = await fetch(`/api/static-generator/status?id=${genState.jobId}`);
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setGenState((s) => ({ ...s, generating: false, error: j?.error || `HTTP ${r.status}` }));
          return;
        }
        // Status can be: running | done | cancelled | error. Anything other
        // than 'running' means stop polling and surface the result.
        const isStillRunning = j.status === "running";
        setGenState((s) => ({
          ...s,
          progress: { done: (j.completed || 0) + (j.failed || 0), total: j.total || s.progress.total },
          results: {
            generated: j.completed || 0,
            failed: j.failed || 0,
            images: j.images || [],
            failures: j.failures || [],
            portalSlug: j.portalSlug,
          },
          generating: isStillRunning,
          error: j.error || s.error,
          status: j.status,
        }));
        if (isStillRunning) timer = setTimeout(tick, 2500);
      } catch (e) {
        if (!cancelled) timer = setTimeout(tick, 4000);
      }
    };
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [genState.jobId, genState.generating]);
  const [loadingMsg, setLoadingMsg] = useState("Loading workspace...");

  // Step 1: Resolve slug → client + brand intake. Runs once when slug changes.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoadingMsg("Loading workspace...");
      const { data: clients } = await supabase.from("clients").select("*");
      if (cancelled) return;
      const matched = (clients || []).find(c => slugify(c.name) === slug);
      if (!matched) { setNotFound(true); return; }
      setClient(matched);

      const { data: bi } = await supabase.from("brand_intake").select("*").eq("client_id", matched.id).maybeSingle();
      if (cancelled) return;
      if (bi) setIntake(bi);

      // Resume any in-flight Static Studio job for this client. The orchestrator
      // runs server-side via Vercel waitUntil(), so jobs keep generating even
      // when the team navigates away or fully reloads. On return, we look up
      // the most recent running job and re-attach the polling effect to it.
      const { data: runningJobs } = await supabase
        .from("static_gen_jobs")
        .select("id, total, completed, failed, images, failures, status, portal_slug, aspect_ratio, error")
        .eq("client_id", matched.id)
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const running = runningJobs?.[0];
      if (running) {
        setGenState((s) => ({
          ...s,
          generating: true,
          jobId: running.id,
          aspectRatio: running.aspect_ratio || s.aspectRatio,
          progress: { done: (running.completed || 0) + (running.failed || 0), total: running.total || 0 },
          results: {
            generated: running.completed || 0,
            failed: running.failed || 0,
            images: running.images || [],
            failures: running.failures || [],
            portalSlug: running.portal_slug,
          },
          error: running.error || "",
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Step 2: Each time the active product changes, fetch (or auto-create) THAT
  // product's portal_project + marketing_dashboard. Each product gets its own.
  // We fire as soon as the client loads (even before products) and gracefully
  // fall back to client-only filtering if activeProduct isn't ready yet.
  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    (async () => {
      // Reset previous product's data so the iframe doesn't flash stale content
      setPortal(null);
      setDashboard(null);

      // ── Portal (creatives) for this product ────────────────────────────
      let portalRow = null;
      {
        let q = supabase.from("portal_projects").select("*").eq("client_id", client.id);
        if (activeProduct?.id) q = q.eq("product_id", activeProduct.id);
        const { data: portals } = await q;
        portalRow = (portals || [])[0] || null;
      }
      // Fallback: if no product-scoped portal exists, look for an unlinked
      // legacy portal for this client and claim it for the active product.
      // This rescues data from before the products migration ran.
      if (!portalRow) {
        const { data: legacy } = await supabase
          .from("portal_projects")
          .select("*")
          .eq("client_id", client.id)
          .is("product_id", null);
        if (legacy && legacy.length > 0) {
          portalRow = legacy[0];
          // Claim it for this product so it doesn't drift back next reload
          await supabase.from("portal_projects").update({ product_id: activeProduct.id }).eq("id", portalRow.id);
        }
      }
      if (!portalRow) {
        setLoadingMsg(`Setting up creatives for ${activeProduct.name}...`);
        try {
          const r = await fetch("/api/portal/projects", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientName: `${client.name} - ${activeProduct.name}`,
              clientId: client.id,
              productId: activeProduct.id,
            }),
          });
          const j = await r.json();
          if (r.ok && j?.id) {
            const { data: refetched } = await supabase.from("portal_projects").select("*").eq("id", j.id).maybeSingle();
            portalRow = refetched || j;
          }
        } catch (e) { console.error("auto-create portal:", e); }
      }
      if (cancelled) return;
      if (portalRow) {
        setPortal({
          id: portalRow.id,
          slug: portalRow.slug,
          clientName: portalRow.client_name,
          images: portalRow.images || [],
          heroScripts: portalRow.hero_scripts || [],
          ugcScripts: portalRow.ugc_scripts || [],
        });
        const { data: fb } = await supabase.from("portal_feedback").select("status").eq("project_id", portalRow.id);
        if (!cancelled && fb) {
          const counts = { approved: 0, rejected: 0, revision: 0 };
          for (const r of fb) {
            if (r.status === "approved") counts.approved++;
            else if (r.status === "rejected") counts.rejected++;
            else if (r.status === "revision") counts.revision++;
          }
          setFeedback(counts);
        }
      }

      // ── Dashboard (analytics) for this product ─────────────────────────
      let dashRow = null;
      {
        let q = supabase.from("marketing_dashboards").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
        if (activeProduct?.id) q = q.eq("product_id", activeProduct.id);
        const { data: dashes } = await q;
        dashRow = (dashes || [])[0] || null;
      }
      // Fallback for legacy unlinked dashboards (the migration's UPDATE was a
      // no-op due to a name collision). Claim the first unlinked one.
      if (!dashRow) {
        const { data: legacy } = await supabase
          .from("marketing_dashboards")
          .select("*")
          .eq("client_id", client.id)
          .is("product_id", null)
          .order("created_at", { ascending: false });
        if (legacy && legacy.length > 0) {
          dashRow = legacy[0];
          await supabase.from("marketing_dashboards").update({ product_id: activeProduct.id }).eq("id", dashRow.id);
        }
      }
      if (!dashRow) {
        setLoadingMsg(`Setting up analytics for ${activeProduct.name}...`);
        try {
          const r = await fetch("/api/marketing-dashboards", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              productId: activeProduct.id,
              title: `${client.name} - ${activeProduct.name} Analytics`,
              fileName: "placeholder.csv",
              headers: ["Date", "Spend", "Revenue", "Impressions", "Clicks"],
              rows: [],
            }),
          });
          const j = await r.json();
          if (j?.success && j.dashboard) dashRow = j.dashboard;
        } catch (e) { console.error("auto-create dashboard:", e); }
      }
      if (cancelled) return;
      if (dashRow) setDashboard(dashRow);
    })();
    return () => { cancelled = true; };
  }, [client?.id, activeProduct?.id, dashboardRefreshKey]);

  // Load this client's products. The API auto-creates a "Main" product if
  // none exist (legacy data), so the switcher always has at least one.
  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    fetch(`/api/products?clientId=${client.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = d?.products || [];
        setProducts(list);
        if (list.length > 0 && !activeProduct) setActiveProduct(list[0]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [client?.id]);

  // The modal creates the product itself; we just need to add it to local
  // state and switch to it.
  const addProduct = (newProduct) => {
    if (!newProduct) return;
    setProducts((prev) => [...prev, newProduct]);
    setActiveProduct(newProduct);
  };

  // Wipe a product. Removes the row in `products` and (because of CASCADE
  // and our explicit delete chain) the linked portal_project, marketing
  // dashboards, and brand_intake also go away. After delete we switch the
  // user to whichever sibling product is left.
  const deleteProduct = async (p) => {
    if (!p?.id) return;
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Failed to delete: ${j?.error || res.status}`);
        return;
      }
      setProducts((prev) => {
        const remaining = prev.filter((x) => x.id !== p.id);
        if (activeProduct?.id === p.id) setActiveProduct(remaining[0] || null);
        return remaining;
      });
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  // Wipe the CSV-backed marketing dashboard for the active product. After
  // delete we bump dashboardRefreshKey so the dashboard-load useEffect re-
  // runs from scratch — its built-in "no dashboard found" branch will then
  // auto-create an empty placeholder, which MarketingDashboardView falls
  // back to demo/example data on. This reuses the same proven code path as
  // brand-new product creation, so we never end up stuck on a loading
  // spinner.
  const deleteDashboard = async () => {
    if (!dashboard?.slug) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this dashboard's CSV data? You'll need to re-upload to see analytics again.")) return;
    try {
      const res = await fetch(`/api/marketing-dashboards?slug=${encodeURIComponent(dashboard.slug)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        alert(`Failed to delete: ${j?.error || res.status}`);
        return;
      }
      setDashboard(null);
      setDashboardRefreshKey((k) => k + 1);
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  // Poll activity feed every 30s while the page is open. Track unread count
  // by comparing each item's createdAt to the last-viewed timestamp stored
  // locally. Opening the panel marks everything read.
  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/activity?clientId=${client.id}`);
        const data = await res.json();
        if (cancelled) return;
        const items = data?.activity || [];
        setActivity(items);
        const lastViewed = Number(localStorage.getItem(`team_activity_seen_${client.id}`) || 0);
        const unread = items.filter(a => new Date(a.createdAt).getTime() > lastViewed && a.actor === "client").length;
        setUnreadCount(unread);
      } catch (e) { /* network hiccups are fine */ }
    };
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [client?.id]);

  const markActivitySeen = () => {
    if (!client?.id) return;
    localStorage.setItem(`team_activity_seen_${client.id}`, String(Date.now()));
    setUnreadCount(0);
  };

  const totalAssets = portal ? (portal.images?.length || 0) + (portal.heroScripts?.length || 0) + (portal.ugcScripts?.length || 0) : 0;
  const pendingCount = totalAssets - (feedback.approved + feedback.revision + feedback.rejected);

  const sections = [
    { k: "analytics", lbl: "Analytics", icon: <BarChart3 size={16} /> },
    { k: "creatives", lbl: "Creatives", icon: <Film size={16} />, badge: pendingCount > 0 ? pendingCount : null },
    { k: "generator", lbl: "Static Studio", icon: <Wand2 size={16} /> },
    { k: "brand", lbl: "Brand Guidelines", icon: <Palette size={16} /> },
  ];

  if (notFound) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, padding: 24, textAlign: "center" }}>
      <h2 style={{ ...hd, fontSize: 32, color: G.text }}>Client Not Found</h2>
      <p style={{ color: G.textSec, fontSize: 15 }}>No client matches the slug &quot;{slug}&quot;.</p>
      <a href="/dashboard" style={{ marginTop: 12, color: G.ink, textDecoration: "none", borderBottom: `1px solid ${G.ink}`, fontSize: 13 }}>Back to Dashboard</a>
    </div>
  );

  if (!client) return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <Loader2 size={20} style={{ animation: "spinKf 1s linear infinite" }} color={G.textTer} />
      <p style={{ fontSize: 13, color: G.textTer }}>{loadingMsg}</p>
      <style>{`@keyframes spinKf { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initial = client.name?.[0]?.toUpperCase() || "•";
  const clientHubUrl = typeof window !== "undefined" ? `${window.location.origin}/client/${slug}` : "";

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, color: G.text }}>
      <style>{`
        @keyframes spinKf { to { transform: rotate(360deg); } }
        .tw-shell { display: flex; min-height: 100vh; }
        .tw-side { width: ${sidebarCollapsed ? "0px" : "240px"}; flex-shrink: 0; background: ${G.sidebar}; border-right: ${sidebarCollapsed ? "none" : `1px solid ${G.border}`}; display: flex; flex-direction: column; padding: ${sidebarCollapsed ? "0" : "22px 16px"}; position: sticky; top: 0; height: 100vh; transition: width 0.25s ease, padding 0.25s ease; overflow: hidden; }
        .tw-collapse-toggle { position: fixed; left: ${sidebarCollapsed ? 12 : 224}px; top: 18px; z-index: 110; width: 28px; height: 28px; border-radius: 8px; background: #fff; border: 1px solid ${G.border}; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${G.textSec}; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: left 0.25s ease; }
        .tw-collapse-toggle:hover { color: ${G.text}; border-color: ${G.textTer}; }
        @media (max-width: 880px) { .tw-collapse-toggle { display: none; } }
        .tw-main { flex: 1; min-width: 0; min-height: 100vh; }
        .tw-mobile-bar { display: none; }
        @media (max-width: 880px) {
          .tw-side { position: fixed; left: ${sidebarOpen ? "0" : "-260px"}; top: 0; bottom: 0; z-index: 100; transition: left 0.25s ease; box-shadow: ${sidebarOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none"}; }
          .tw-mobile-bar { display: flex; }
          .tw-overlay { display: ${sidebarOpen ? "block" : "none"}; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
        }
        .tw-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; color: ${G.textSec}; cursor: pointer; border: none; background: transparent; text-align: left; width: 100%; transition: all 0.15s; font-family: inherit; text-decoration: none; }
        .tw-nav-item:hover { background: ${G.bg}; color: ${G.text}; }
        .tw-nav-item.active { background: ${G.ink}; color: #fff; font-weight: 600; }
        .tw-nav-item .badge { margin-left: auto; background: ${G.reject}; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 980px; min-width: 18px; text-align: center; }
        .tw-nav-item.active .badge { background: rgba(255,255,255,0.25); }
      `}</style>

      <div className="tw-shell">
        <div className="tw-overlay" onClick={() => setSidebarOpen(false)}></div>

        {/* Desktop collapse / expand toggle so the team can go full-screen on the iframes */}
        <button className="tw-collapse-toggle" onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar - identical structure to client hub */}
        <aside className="tw-side">
          {/* Logo - clicking returns to the main CRM dashboard. No hover highlight, just clickable. */}
          <a href="/dashboard" title="Back to Dashboard"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 18, textDecoration: "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${G.ink}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={13} style={{ color: G.ink }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: G.text, letterSpacing: "0.05em", lineHeight: 1.1 }}>ALCHEMY</p>
              <p style={{ fontSize: 10, color: G.textTer, fontWeight: 400, lineHeight: 1.1, marginTop: 1 }}>Productions</p>
            </div>
          </a>

          {/* TEAM VIEW badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: G.ink, color: "#fff", borderRadius: 980, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, alignSelf: "flex-start" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }}></span>
            Team View
          </div>

          {/* Client identity card */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", background: G.bg, border: `1px solid ${G.border}`, borderRadius: 12, marginBottom: 22 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: G.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.name}</p>
              <p style={{ fontSize: 10, color: G.textTer, marginTop: 2 }}>Building this workspace</p>
            </div>
          </div>

          {/* Product switcher - only when this client has multiple products
              OR the team wants to add one. Always rendered so the team can
              add new products from the workspace. */}
          <ProductSwitcher
            products={products}
            activeId={activeProduct?.id}
            onChange={setActiveProduct}
            onAdd={addProduct}
            onDelete={deleteProduct}
            canAdd
            clientId={client?.id}
          />

          {/* Section nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textTer, padding: "6px 12px", marginBottom: 4 }}>Workspace</p>
            {sections.map(s => (
              <button key={s.k} className={`tw-nav-item${section === s.k ? " active" : ""}`} onClick={() => { setSection(s.k); setSidebarOpen(false); }}>
                {s.icon}
                <span>{s.lbl}</span>
                {s.badge && <span className="badge">{s.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Bottom: links */}
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${G.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <button className="tw-nav-item" onClick={() => { setActivityOpen(true); markActivitySeen(); }}>
              <Bell size={16} />
              <span>Activity</span>
              {unreadCount > 0 && <span className="badge" style={{ background: "#E5484D" }}>{unreadCount}</span>}
            </button>
            <a href={clientHubUrl} target="_blank" rel="noreferrer" className="tw-nav-item">
              <Eye size={16} />
              <span>Preview Client View</span>
              <ExternalLink size={11} style={{ marginLeft: "auto", opacity: 0.5 }} />
            </a>
            <a href="/dashboard" className="tw-nav-item">
              <ChevronLeft size={16} />
              <span>Back to CRM</span>
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="tw-main">
          {/* Mobile top bar */}
          <div className="tw-mobile-bar" style={{ alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${G.border}`, background: G.bg, position: "sticky", top: 0, zIndex: 50 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: G.text }}><Menu size={20} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, color: G.text }}>{sections.find(s => s.k === section)?.lbl}</span>
            <span style={{ width: 32 }} />
          </div>

          {/* Content */}
          {section === "analytics" && (
            // Fall back to /marketing/demo (the example-data dashboard) when
            // we don't have a real dashboard slug yet — happens right after
            // CSV delete, or on first load if the auto-create placeholder
            // hasn't returned. Stops the section ever getting stuck on a
            // loading spinner.
            <SectionFrame
              title="Analytics"
              subtitle={SECTION_COPY.analytics.subtitle}
              src={dashboard ? `/marketing/${dashboard.slug}?embed=1` : `/marketing/demo`}
              loadingMsg="Setting up analytics..."
              hubLink={clientHubUrl + "#analytics"}
              onDelete={dashboard && (dashboard.rows?.length > 0 || dashboard.file_name !== "placeholder.csv") ? deleteDashboard : null}
              deleteLabel="Delete CSV"
            />
          )}

          {section === "creatives" && (
            <SectionFrame
              title="Creatives"
              subtitle={SECTION_COPY.creatives.subtitle(feedback)}
              src={portal ? `/portal/create?id=${portal.id}&embed=1` : null}
              loadingMsg="Setting up creatives portal..."
              hubLink={clientHubUrl + "#creatives"}
            />
          )}

          {section === "brand" && (
            <TeamBrandSection
              client={client}
              intake={intake}
              clientHubUrl={clientHubUrl}
            />
          )}

          {section === "generator" && (
            <StaticStudio
              client={client}
              activeProduct={activeProduct}
              intake={intake}
              clientHubUrl={clientHubUrl}
              genState={genState}
              setGenState={setGenState}
              onGenerated={() => setSection("creatives")}
            />
          )}
        </main>
      </div>

      {/* Floating team chat - unified inbox across all client portals */}
      <DashboardChat />

      {/* Activity feed slide-out panel from the right */}
      {activityOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setActivityOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "flex-end" }}>
          <aside style={{ width: 420, maxWidth: "100vw", height: "100vh", background: "#fff", borderLeft: `1px solid ${G.border}`, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 2 }}>Activity</h3>
                <p style={{ fontSize: 12, color: G.textSec }}>Latest updates from {client.name}</p>
              </div>
              <button onClick={() => setActivityOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${G.border}`, color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
              {activity.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: G.textTer }}>
                  <Bell size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>No activity yet. Once the client reviews assets, every approval, revision, rejection, and comment will show up here.</p>
                </div>
              ) : (
                activity.map((a) => <ActivityItem key={a.id} item={a} />)
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// Team-side brand section: shows the existing brand kit (like the client side does)
// with edit and "add new product" affordances. No more dropping the team into the
// raw intake form by default.
function TeamBrandSection({ client, intake, clientHubUrl }) {
  const editUrl = `/brand-intake?clientId=${client.id}`;
  if (!intake) {
    return (
      <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <SectionTitle title="Brand Guidelines" subtitle={`Capture ${client.name}'s brand identity to drive every creative we make.`} hubLink={clientHubUrl + "#brand"} />
        <div style={{ padding: 60, background: G.card, border: `1px dashed ${G.border}`, borderRadius: 18, textAlign: "center" }}>
          <Palette size={36} color={G.textTer} style={{ marginBottom: 12 }} />
          <h3 style={{ ...hd, fontSize: 24, color: G.text, marginBottom: 6 }}>No Brand Guidelines yet</h3>
          <p style={{ fontSize: 13, color: G.textSec, maxWidth: 520, margin: "0 auto 22px" }}>
            Use Express Mode (paste a URL) to auto-fill, or fill the full form manually.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`${editUrl}&express=1`} style={btnPrimary}><Sparkles size={13} /> Express Mode</a>
            <a href={editUrl} style={btnSecondary}>Fill Manually</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionTitle
        title="Brand Guidelines"
        subtitle={`The foundation for every creative we build for ${client.name}.`}
        hubLink={clientHubUrl + "#brand"}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <a href={editUrl} style={btnSecondary}><Settings size={13} /> Edit Guidelines</a>
            <a href={`${editUrl}#product-images`} style={btnPrimary}><ArrowRight size={13} /> Add Product</a>
          </div>
        }
      />

      {/* The full brand kit grid is rendered by the shared <BrandKitGrid />.
          Edit /components/BrandKit.jsx to update both team and client views. */}
      <BrandKitGrid intake={intake} />
      {false && (
      <div style={{ display: "none" }}>
        {(intake.tagline || intake.story) && (
          <BrandCard fullWidth title="Brand Story">
            {intake.tagline && <p style={{ ...hd, fontSize: 26, color: G.text, marginBottom: 12, lineHeight: 1.25, fontStyle: "italic" }}>&ldquo;{intake.tagline}&rdquo;</p>}
            {intake.story && <p style={{ fontSize: 14, color: G.textSec, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{intake.story}</p>}
          </BrandCard>
        )}
        <BrandCard title="Brand Details">
          {[["Brand", intake.brand_name], ["Website", intake.website], ["Industry", intake.industry], ["Location", intake.location]].filter(([, v]) => v).map(([k, v]) => (
            <BrandRow key={k} label={k} value={v} />
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
            {[["Formality", intake.tone_formality], ["Mood", intake.tone_mood], ["Intensity", intake.tone_intensity]].filter(([, v]) => typeof v === "number").map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <p style={{ ...brandLabelStyle, marginBottom: 4 }}>{k}</p>
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
        {(intake.audience_description || intake.age_range || intake.competitors) && (
          <BrandCard fullWidth title="Audience & Market">
            {intake.age_range && <BrandRow label="Age Range" value={intake.age_range} />}
            {intake.audience_description && <BrandLongRow label="Audience" value={intake.audience_description} />}
            {intake.competitors && <BrandLongRow label="Competitors" value={intake.competitors} />}
            {intake.deepest_fears && <BrandLongRow label="Deep Fears" value={intake.deepest_fears} />}
            {intake.deepest_desires && <BrandLongRow label="Deep Desires" value={intake.deepest_desires} />}
          </BrandCard>
        )}
        {(intake.influencer_age || intake.influencer_gender || intake.influencer_style || intake.influencer_personality) && (
          <BrandCard fullWidth title="Spokesperson Profile">
            {[["Age", intake.influencer_age], ["Gender", intake.influencer_gender], ["Ethnicity", intake.influencer_ethnicity], ["Body Type", intake.influencer_body_type], ["Hair", [intake.influencer_hair_color, intake.influencer_hair_style].filter(Boolean).join(", ")], ["Style", intake.influencer_style], ["Personality", intake.influencer_personality], ["Notes", intake.influencer_notes]].filter(([, v]) => v).map(([k, v]) => (
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
            {intake.video_transitions && <BrandRow label="Transitions" value={intake.video_transitions} />}
            {intake.video_cuts && <BrandRow label="Cuts" value={intake.video_cuts} />}
            {intake.video_notes && <BrandLongRow label="Notes" value={intake.video_notes} />}
          </BrandCard>
        )}
        {(intake.objective || intake.key_message) && (
          <BrandCard fullWidth title="Strategy">
            {[["Objective", intake.objective], ["Audience", intake.target_audience], ["Goals", intake.campaign_goals]].filter(([, v]) => v).map(([k, v]) => (
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
          <BrandCard fullWidth title="Products">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              {intake.product_image_urls.map((u, i) => (
                <img key={i} src={u} alt="" style={{ width: 110, height: 110, borderRadius: 12, objectFit: "cover", border: `1px solid ${G.border}` }} />
              ))}
            </div>
            <a href={`${editUrl}#product-images`} style={btnSecondary}><ArrowRight size={13} /> Add new product</a>
          </BrandCard>
        )}
      </div>
      )}
    </div>
  );
}

// Single row in the activity feed. Color/icon per event type so the team can
// scan the log at a glance: green=approved, blue=revision, red=rejected, grey=comment.
function ActivityItem({ item }) {
  const t = item.type;
  const color = t === "approved" ? "#30A46C" : t === "rejected" ? "#E5484D" : t === "revision" ? "#3E8ED0" : "#86868B";
  const Icon = t === "approved" ? CheckCircle2 : t === "rejected" ? X : t === "revision" ? RefreshCw : MessageCircle;
  const ago = (() => {
    const ms = Date.now() - new Date(item.createdAt).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  })();
  return (
    <div style={{ padding: "12px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", gap: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: color + "18", color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: G.text, lineHeight: 1.45, margin: 0 }}>
          <span style={{ fontWeight: 600 }}>{item.senderName || (item.actor === "team" ? "Team" : "Client")}</span>{" "}
          <span style={{ color: G.textSec }}>{item.message.replace(/^(Approved|Rejected|Requested revision on|.+commented on)\s*/, (m) => m.toLowerCase().includes("commented") ? "commented on " : `${m.toLowerCase().split(" ")[0]} `)}</span>
          <span style={{ fontWeight: 600 }}>{item.itemLabel}</span>
        </p>
        {item.text && (
          <p style={{ marginTop: 6, padding: "8px 12px", background: "#F5F5F7", borderRadius: 8, borderLeft: `3px solid ${color}`, fontSize: 12, color: G.text, lineHeight: 1.55 }}>
            {typeof item.videoTimestamp === "number" && (
              <span style={{ fontWeight: 700, color: "#3E8ED0", marginRight: 4 }}>
                [{Math.floor(item.videoTimestamp / 60)}:{String(Math.floor(item.videoTimestamp % 60)).padStart(2, "0")}]
              </span>
            )}
            &ldquo;{item.text}&rdquo;
          </p>
        )}
        <p style={{ marginTop: 4, fontSize: 11, color: G.textTer }}>{ago}</p>
      </div>
    </div>
  );
}

// Wrapper around the shared SectionHeader that adds the team-specific
// "Client View" preview link and supports an extra `right` slot for buttons.
function SectionTitle({ title, subtitle, hubLink, right }) {
  return (
    <SectionHeader
      title={title}
      subtitle={subtitle}
      right={(right || hubLink) ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {right}
          {hubLink && (
            <a href={hubLink} target="_blank" rel="noreferrer" style={btnSecondary}>
              <Eye size={13} /> Client View <ExternalLink size={11} />
            </a>
          )}
        </div>
      ) : null}
    />
  );
}

const btnPrimary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: "#fff", background: G.ink, border: "none", borderRadius: 980, textDecoration: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" };
const btnSecondary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: G.text, background: "transparent", border: `1px solid ${G.border}`, borderRadius: 980, textDecoration: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" };
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

// Static Studio - team-side ad generator. Uses Gemini "Nano Banana" image gen
// to render N×M ads from headlines × image prompts, scoped to the active
// product's brand kit. Generated images land in the client's Creatives portal
// for review.
function StaticStudio({ client, activeProduct, intake, clientHubUrl, genState, setGenState, onGenerated }) {
  // All generation state lives in the parent (TeamWorkspacePage) so navigating
  // to other sections mid-generation doesn't reset progress or cancel chunks.
  const { headlines, prompts, aspectRatio, generating, progress, results, error, headlineImageUrls = ["", "", "", "", ""] } = genState;
  const patch = (p) => setGenState((s) => ({ ...s, ...p }));
  const setHeadlines = (updater) => setGenState((s) => ({ ...s, headlines: typeof updater === "function" ? updater(s.headlines) : updater }));
  const setPrompts = (updater) => setGenState((s) => ({ ...s, prompts: typeof updater === "function" ? updater(s.prompts) : updater }));
  const setHeadlineImageUrls = (updater) => setGenState((s) => ({ ...s, headlineImageUrls: typeof updater === "function" ? updater(s.headlineImageUrls || ["", "", "", "", ""]) : updater }));
  const setAspectRatio = (v) => patch({ aspectRatio: v });
  const setError = (v) => patch({ error: v });

  // Available product images for the picker. Drawn from the active product's
  // product_image_urls; falls back to brand_intake.product_image_urls when a
  // product hasn't seeded its own list yet.
  const availableRefImages = (
    activeProduct?.product_image_urls?.length
      ? activeProduct.product_image_urls
      : intake?.product_image_urls || []
  ).filter(Boolean);

  // Per-tile regenerate state. Each tile id maps to an in-flight AbortController
  // so a re-click cancels the previous attempt. Mirrors the proposal/create
  // pattern: AbortError on the cancelled fetch is silently swallowed and only
  // the latest controller's response is allowed to clear loading state.
  const [tileRegenerating, setTileRegenerating] = useState({}); // { [imageId]: bool }
  const tileAbortRef = useRef({});                               // { [imageId]: AbortController }
  const [stopping, setStopping] = useState(false);

  const validHeadlines = headlines.map((h) => h.trim()).filter(Boolean);
  const validPrompts = prompts.map((p) => p.trim()).filter(Boolean);
  // If both fields empty, the API derives 5 of each from the brand kit -> 25 ads.
  // If only one side is empty, the API still defaults the missing side to 5.
  const effectiveHeadlines = validHeadlines.length || 5;
  const effectivePrompts = validPrompts.length || 5;
  const totalAds = effectiveHeadlines * effectivePrompts;
  const usingDefaults = validHeadlines.length === 0 && validPrompts.length === 0;

  // Kick off a server-orchestrated job. The /start endpoint creates a job row,
  // returns immediately, and uses Vercel's waitUntil() to fan out chunk work
  // server-side. That means generation continues even if the team backgrounds
  // the tab, switches tabs, or closes the browser entirely. The parent's
  // polling effect (in TeamWorkspacePage) reads /status?id= every ~2.5s.
  const generate = async () => {
    setGenState((s) => ({
      ...s,
      generating: true,
      error: "",
      results: { generated: 0, failed: 0, images: [], failures: [], portalSlug: null },
      progress: { done: 0, total: totalAds },
      jobId: null,
    }));
    try {
      // Trim headlineImageUrls to match the validHeadlines we're actually
      // sending, so positions line up server-side. If the user filled fewer
      // headlines than the slot count, the missing positions just get "".
      const refsForValid = [];
      headlines.forEach((h, i) => {
        if (String(h || "").trim()) refsForValid.push(headlineImageUrls?.[i] || "");
      });
      const res = await fetch("/api/static-generator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          headlines: validHeadlines,
          imagePrompts: validPrompts,
          headlineImageUrls: refsForValid,
          aspectRatio,
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { data = { error: `Server returned non-JSON (HTTP ${res.status}).` }; }
      if (!res.ok || !data.jobId) {
        setGenState((s) => ({ ...s, generating: false, error: data?.error || `HTTP ${res.status}` }));
        return;
      }
      // Hand off to the polling effect by setting jobId.
      setGenState((s) => ({
        ...s,
        jobId: data.jobId,
        progress: { done: 0, total: data.total || totalAds },
      }));
    } catch (e) {
      setGenState((s) => ({ ...s, generating: false, error: e.message || "Network error" }));
    }
  };

  // Stop the in-flight job. Writes status='cancelled' to the job row; the
  // chunk worker checks status at the top of each chunk and bails out.
  // In-flight Gemini calls already mid-fetch will still finish (we don't
  // hard-abort to avoid orphaned uploads), but no new tasks will start.
  const stop = async () => {
    if (!genState.jobId) return;
    setStopping(true);
    try {
      await fetch("/api/static-generator/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: genState.jobId }),
      });
      // Optimistically flip generating off so the UI is responsive; the
      // polling effect will pick up the real 'cancelled' status next tick.
      setGenState((s) => ({ ...s, generating: false, status: "cancelled" }));
    } catch (e) {
      setError(`Stop failed: ${e.message}`);
    } finally {
      setStopping(false);
    }
  };

  // Regenerate a single tile (one cell of the headline × prompt grid). Mirrors
  // the proposal/create pattern: AbortController per tile, re-click cancels
  // the in-flight one, only the latest controller is allowed to clear state.
  const regenerateTile = async (img) => {
    if (!img?.id) return;
    // Recover headline + imagePrompt from the image name we wrote on save.
    // Format: `${headline.slice(0,30)} - ${imagePrompt.slice(0,30)}.{ext}`
    const baseName = String(img.name || "").replace(/\.(png|jpg|webp)$/i, "");
    const dashIdx = baseName.indexOf(" - ");
    const headlineSeed = dashIdx > 0 ? baseName.slice(0, dashIdx) : "";
    const promptSeed = dashIdx > 0 ? baseName.slice(dashIdx + 3) : "";

    // Find best matches in current state so the prompts are full-length, not
    // the 30-char truncations stored in the filename.
    const fullHeadline = headlines.find((h) => h && h.trim().startsWith(headlineSeed.trim().slice(0, 25))) || headlineSeed;
    const fullPrompt = prompts.find((p) => p && p.trim().startsWith(promptSeed.trim().slice(0, 25))) || promptSeed;

    if (!fullHeadline || !fullPrompt) {
      setError("Couldn't recover this tile's headline/prompt to regenerate.");
      return;
    }

    // Pick the reference image for this headline (if any)
    const headlineIndex = headlines.findIndex((h) => h && h === fullHeadline);
    const referenceImageUrl = headlineIndex >= 0 ? (headlineImageUrls?.[headlineIndex] || "") : "";

    // Cancel any in-flight regen for this tile
    if (tileAbortRef.current[img.id]) {
      try { tileAbortRef.current[img.id].abort(); } catch {}
    }
    const ac = new AbortController();
    tileAbortRef.current[img.id] = ac;

    setTileRegenerating((m) => ({ ...m, [img.id]: true }));
    setError("");
    try {
      const res = await fetch("/api/static-generator/regenerate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          headline: fullHeadline,
          imagePrompt: fullPrompt,
          imageId: img.id,
          aspectRatio,
          referenceImageUrl,
          jobId: genState.jobId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // Swap the tile in local state
      setGenState((s) => {
        const list = s.results?.images || [];
        const next = list.map((it) => (it.id === data.image.id ? data.image : it));
        return { ...s, results: { ...s.results, images: next } };
      });
    } catch (err) {
      if (err?.name === "AbortError") return; // newer click took over
      setError(`Regenerate failed: ${err.message}`);
    } finally {
      if (tileAbortRef.current[img.id] === ac) {
        setTileRegenerating((m) => { const n = { ...m }; delete n[img.id]; return n; });
        delete tileAbortRef.current[img.id];
      }
    }
  };

  const inputBase = {
    width: "100%", padding: "10px 14px", fontSize: 13,
    border: `1px solid ${G.border}`, borderRadius: 10, outline: "none",
    background: G.bg, color: G.text, boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionTitle
        title="Static Studio"
        subtitle={activeProduct
          ? `Generate ${activeProduct.name} ad creatives at scale. Headlines and visuals are optional - if blank, we derive them from the brand kit. The results land in the client's Creatives tab.`
          : `Generate ad creatives at scale. Headlines and visuals are optional - if blank, we derive them from the brand kit.`}
        hubLink={clientHubUrl + "#creatives"}
      />

      {!intake && (
        <div style={{ padding: 16, marginBottom: 20, background: "#FFF8E1", border: `1px solid #F5E2A1`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: "#7A5C0E", margin: 0 }}>
            ⚠️ Brand DNA not captured yet. Generations will be generic. Fill out Brand Guidelines first for on-brand results.
          </p>
        </div>
      )}

      {/* Headlines */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Headlines <span style={{ ...mono, fontSize: 11, fontWeight: 500, color: G.textTer, marginLeft: 6 }}>optional</span></p>
        <p style={{ fontSize: 12, color: G.textSec, marginBottom: 16 }}>
          Leave blank and we&apos;ll derive 5 from the brand kit. Anything you write here gives more control.
          {availableRefImages.length > 0 && (
            <> Optionally pick a product reference image per row — Gemini will use it as visual reference for that headline&apos;s ads.</>
          )}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {headlines.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <input value={h}
                onChange={(e) => setHeadlines((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                placeholder={`Headline ${i + 1}`}
                style={{ ...inputBase, flex: 1 }} />
              {availableRefImages.length > 0 && (
                <RefImagePicker
                  options={availableRefImages}
                  value={headlineImageUrls?.[i] || ""}
                  onChange={(url) => setHeadlineImageUrls((prev) => {
                    const next = [...(prev || ["", "", "", "", ""])];
                    next[i] = url;
                    return next;
                  })}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Image prompts */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Image direction <span style={{ ...mono, fontSize: 11, fontWeight: 500, color: G.textTer, marginLeft: 6 }}>optional</span></p>
        <p style={{ fontSize: 12, color: G.textSec, marginBottom: 16 }}>Leave blank and we&apos;ll derive 5 visuals from the brand kit (spokesperson, colors, mood). Or write your own for more control.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {prompts.map((p, i) => (
            <textarea key={i} value={p}
              onChange={(e) => setPrompts((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`Visual ${i + 1}`}
              rows={2}
              style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
          ))}
        </div>
      </div>

      {/* Format + generate row */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ ...hd, fontSize: 18, color: G.text, marginBottom: 6 }}>Ready to generate</p>
          <p style={{ fontSize: 12, color: G.textSec }}>
            {effectiveHeadlines} headline{effectiveHeadlines === 1 ? "" : "s"} × {effectivePrompts} visual{effectivePrompts === 1 ? "" : "s"} = <b>{totalAds}</b> ad{totalAds === 1 ? "" : "s"}
            {usingDefaults && <span style={{ color: G.textTer }}> · using brand-kit defaults</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Aspect ratio toggle */}
          <div style={{ display: "flex", gap: 3, background: "#F5F5F7", padding: 3, borderRadius: 980, border: `1px solid ${G.border}` }}>
            {[{ v: "1:1", l: "1:1" }, { v: "9:16", l: "9:16" }, { v: "16:9", l: "16:9" }].map((r) => (
              <button key={r.v} onClick={() => setAspectRatio(r.v)}
                style={{ padding: "6px 12px", borderRadius: 980, fontSize: 12, fontWeight: aspectRatio === r.v ? 600 : 500, cursor: "pointer", border: "none",
                  background: aspectRatio === r.v ? G.ink : "transparent",
                  color: aspectRatio === r.v ? "#fff" : G.textSec, fontFamily: "'Inter', sans-serif",
                }}>{r.l}</button>
            ))}
          </div>
          {generating ? (
            <>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, background: G.ink, color: "#fff", border: "none", borderRadius: 980, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
                <Loader2 size={14} style={{ animation: "spinKf 1s linear infinite" }} /> {progress.done}/{progress.total || totalAds}...
              </div>
              <button onClick={stop} disabled={stopping}
                title="Stop the running generation"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", fontSize: 13, fontWeight: 600, background: "transparent", color: G.reject, border: `1px solid ${G.reject}40`, borderRadius: 980, cursor: stopping ? "not-allowed" : "pointer", opacity: stopping ? 0.55 : 1, fontFamily: "'Inter', sans-serif" }}>
                <X size={14} /> {stopping ? "Stopping…" : "Stop"}
              </button>
            </>
          ) : (
            <button onClick={generate}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, background: G.ink, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <Wand2 size={14} /> Generate {totalAds} ads
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, marginBottom: 20, background: "#FEEBEC", border: `1px solid ${G.reject}40`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: G.reject, margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Generated</p>
              <p style={{ fontSize: 12, color: G.textSec }}>
                {results.generated} succeeded · {results.failed > 0 ? `${results.failed} failed · ` : ""}all queued in the client&apos;s Creatives portal.
              </p>
            </div>
            {!generating && (
              <button onClick={() => onGenerated?.()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: "#fff", background: G.ink, border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                View in Creatives <ArrowRight size={13} />
              </button>
            )}
          </div>
          {results.images?.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {results.images.map((img, i) => {
                const busy = !!tileRegenerating[img.id];
                return (
                  <div key={img.id || i} style={{ position: "relative", aspectRatio: aspectRatio.replace(":", "/"), borderRadius: 12, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${G.border}` }}>
                    <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: busy ? "blur(2px) brightness(0.6)" : "none", transition: "filter 0.2s" }} />
                    {/* Regenerate this tile */}
                    <button onClick={() => regenerateTile(img)}
                      title="Regenerate this image"
                      disabled={busy}
                      style={{ position: "absolute", top: 6, right: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, padding: 0, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 999, cursor: busy ? "wait" : "pointer", backdropFilter: "blur(8px)" }}>
                      <RefreshCw size={13} style={busy ? { animation: "spinKf 1s linear infinite" } : undefined} />
                    </button>
                    {busy && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
                        Regenerating…
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spinKf { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Compact dropdown thumbnail picker for the per-headline product reference
// image. Shows the currently-selected thumbnail (or a "+" placeholder) and
// pops a grid of the available product images on click. Stays small enough
// to sit inline next to the headline input without breaking row height.
function RefImagePicker({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} type="button"
        title={value ? "Change reference image" : "Pick a product reference image"}
        style={{
          width: 40, height: 40, padding: 0, borderRadius: 10,
          border: `1px solid ${G.border}`, background: value ? "#000" : G.bg,
          cursor: "pointer", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        {value
          ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <ImageIcon size={16} color={G.textTer} />
        }
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
          background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          borderRadius: 12, padding: 10, width: 260,
        }}>
          <p style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Reference image</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <button onClick={() => { onChange(""); setOpen(false); }} type="button"
              title="No reference (text only)"
              style={{ aspectRatio: "1/1", borderRadius: 8, border: value === "" ? `2px solid ${G.ink}` : `1px solid ${G.border}`, background: G.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: G.textSec, fontSize: 18 }}>
              <X size={16} />
            </button>
            {options.map((url) => (
              <button key={url} onClick={() => { onChange(url); setOpen(false); }} type="button"
                style={{ aspectRatio: "1/1", borderRadius: 8, border: value === url ? `2px solid ${G.ink}` : `1px solid ${G.border}`, padding: 0, overflow: "hidden", cursor: "pointer", background: "#000" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionFrame({ title, subtitle, src, loadingMsg, hubLink, onDelete, deleteLabel }) {
  return (
    <div style={{ padding: "32px 40px 0", maxWidth: 1400, margin: "0 auto" }}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        right={(
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            {onDelete && (
              <button onClick={onDelete}
                title={deleteLabel || "Delete"}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", fontSize: 12, fontWeight: 600, color: G.reject, background: "transparent", border: `1px solid ${G.reject}40`, borderRadius: 980, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = G.reject; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = G.reject; }}>
                <Trash2 size={13} /> {deleteLabel || "Delete"}
              </button>
            )}
            {hubLink && (
              <a href={hubLink} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: G.text, background: "transparent", border: `1px solid ${G.border}`, borderRadius: 980, textDecoration: "none" }}>
                <Eye size={13} /> Client View <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
      />
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, overflow: "hidden", marginBottom: 32 }}>
        {src ? (
          <iframe
            src={src}
            title={title}
            style={{ width: "100%", height: "calc(100vh - 180px)", minHeight: 720, border: "none", display: "block" }}
            allow="clipboard-write"
          />
        ) : (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 size={20} style={{ animation: "spinKf 1s linear infinite" }} color={G.textTer} />
            <p style={{ fontSize: 13, color: G.textTer, marginTop: 12 }}>{loadingMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
