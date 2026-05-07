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
import { supabase, uploadProductImage } from "@/lib/supabase";

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

  // Two-phase Static Studio state. Preview job runs first (5 distinct scene
  // images, no headline overlay). Each preview tile is then approved/revised/
  // exited; approved scenes spawn a per-scene variants job that renders 5 ad
  // variants (one per headline). Multiple variant jobs can run in parallel.
  const [genState, setGenState] = useState({
    aspectRatio: "1:1",
    headlines: ["", "", "", "", ""],
    productImageUrl: "", // single shared product reference for the whole batch

    // Preview phase
    previewJobId: null,
    previewStatus: "idle",     // idle | running | done | error | cancelled
    previewImages: [],          // 5 scene tiles
    previewProgress: { done: 0, total: 0 },
    previewError: "",
    previewPrompts: [],         // populated by /preview-start return
    previewShots: [],

    // Per-scene state (sceneIndex -> { ... })
    scenes: {},

    error: "",
  });

  // Poll the preview job. Lives at the parent so progress survives sidebar
  // navigation. Server-side waitUntil() keeps the job running even after tab
  // close — re-attaching on reload is left as future work.
  useEffect(() => {
    if (!genState.previewJobId || genState.previewStatus !== "running") return;
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      try {
        const r = await fetch(`/api/static-generator/status?id=${genState.previewJobId}`);
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setGenState((s) => ({ ...s, previewStatus: "error", previewError: j?.error || `HTTP ${r.status}` }));
          return;
        }
        const isRunning = j.status === "running";
        setGenState((s) => ({
          ...s,
          previewProgress: { done: (j.completed || 0) + (j.failed || 0), total: j.total || s.previewProgress.total },
          previewImages: j.images || s.previewImages,
          previewStatus: isRunning ? "running" : (j.status || "done"),
          previewError: j.error || s.previewError,
        }));
        if (isRunning) timer = setTimeout(tick, 2500);
      } catch (e) {
        if (!cancelled) timer = setTimeout(tick, 4000);
      }
    };
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [genState.previewJobId, genState.previewStatus]);

  // Poll each running variant job. We watch the set of jobIds and re-mount
  // when they change — each running job gets its own setTimeout chain.
  useEffect(() => {
    const runningEntries = Object.entries(genState.scenes || {})
      .filter(([, v]) => v?.variantJobId && v.variantStatus === "running");
    if (runningEntries.length === 0) return;
    const cancelledFlags = runningEntries.map(() => ({ v: false }));
    const timers = [];
    runningEntries.forEach(([sceneIndexStr, scene], i) => {
      const sceneIndex = Number(sceneIndexStr);
      const tick = async () => {
        try {
          const r = await fetch(`/api/static-generator/status?id=${scene.variantJobId}`);
          const j = await r.json();
          if (cancelledFlags[i].v) return;
          if (!r.ok) {
            setGenState((s) => ({
              ...s,
              scenes: { ...s.scenes, [sceneIndex]: { ...s.scenes[sceneIndex], variantStatus: "error", variantError: j?.error || `HTTP ${r.status}` } },
            }));
            return;
          }
          const isRunning = j.status === "running";
          setGenState((s) => ({
            ...s,
            scenes: {
              ...s.scenes,
              [sceneIndex]: {
                ...s.scenes[sceneIndex],
                variantImages: j.images || s.scenes[sceneIndex]?.variantImages || [],
                variantProgress: { done: (j.completed || 0) + (j.failed || 0), total: j.total || s.scenes[sceneIndex]?.variantProgress?.total || 5 },
                variantStatus: isRunning ? "running" : (j.status || "done"),
              },
            },
          }));
          if (isRunning) timers[i] = setTimeout(tick, 2500);
        } catch (e) {
          if (!cancelledFlags[i].v) timers[i] = setTimeout(tick, 4000);
        }
      };
      tick();
    });
    return () => {
      cancelledFlags.forEach((f) => { f.v = true; });
      timers.forEach((t) => t && clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.entries(genState.scenes || {}).filter(([, v]) => v?.variantJobId && v.variantStatus === "running").map(([k, v]) => `${k}:${v.variantJobId}`).join("|")]);
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
        .select("id, total, completed, failed, images, failures, status, portal_slug, aspect_ratio, error, input")
        .eq("client_id", matched.id)
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const running = runningJobs?.[0];
      if (running) {
        // Re-attach polling to the running preview job. (Variant jobs aren't
        // resumed on reload — they're scoped to the user's session approval
        // decisions.) Phase info lives in `input.phase`; treat anything other
        // than 'preview' as legacy and skip auto-attach.
        const phase = running.input?.phase;
        if (phase === "preview") {
          setGenState((s) => ({
            ...s,
            previewJobId: running.id,
            previewStatus: "running",
            aspectRatio: running.aspect_ratio || s.aspectRatio,
            previewProgress: { done: (running.completed || 0) + (running.failed || 0), total: running.total || 5 },
            previewImages: running.images || [],
            previewError: running.error || "",
            previewPrompts: running.input?.scenePrompts || [],
            previewShots: running.input?.shots || [],
            productImageUrl: running.input?.productImageUrl || s.productImageUrl,
          }));
        }
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
  const {
    headlines, aspectRatio, productImageUrl,
    previewJobId, previewStatus, previewImages, previewProgress, previewError, previewPrompts, previewShots,
    scenes, error,
  } = genState;
  const generating = previewStatus === "running";

  const patch = (p) => setGenState((s) => ({ ...s, ...p }));
  const setHeadlines = (updater) => setGenState((s) => ({ ...s, headlines: typeof updater === "function" ? updater(s.headlines) : updater }));
  const setAspectRatio = (v) => patch({ aspectRatio: v });
  const setError = (v) => patch({ error: v });
  const setProductImageUrl = (v) => patch({ productImageUrl: v });

  // Available product images for the single shared reference picker. Same
  // sources as before: active product → brand intake → session uploads.
  const [sessionUploads, setSessionUploads] = useState([]);
  const availableRefImages = [
    ...((activeProduct?.product_image_urls?.length
        ? activeProduct.product_image_urls
        : intake?.product_image_urls || []
      ).filter(Boolean)),
    ...sessionUploads,
  ];

  // Auto-populate the reference image with the first available product photo
  // when nothing's been picked yet. Reference is opt-out (cycle / X / paste).
  useEffect(() => {
    if (availableRefImages.length === 0) return;
    if (!productImageUrl) setProductImageUrl(availableRefImages[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRefImages.join("|")]);

  const cycleProductImage = (dir) => {
    if (availableRefImages.length === 0) return;
    const idx = availableRefImages.indexOf(productImageUrl);
    const nextIdx = idx < 0 ? (dir > 0 ? 0 : availableRefImages.length - 1) : (idx + dir + availableRefImages.length) % availableRefImages.length;
    setProductImageUrl(availableRefImages[nextIdx]);
  };

  const [stopping, setStopping] = useState(false);
  const [revisingPreview, setRevisingPreview] = useState({}); // { [sceneIndex]: true }
  const previewAbortRef = useRef({});
  // Per-tile state for variants: regen-in-flight + locally-cancelled. Local
  // cancel hides the tile from the polling-driven render; the underlying
  // server job keeps running for the OTHER tiles in that variant batch.
  const [variantBusy, setVariantBusy] = useState({}); // { [`${sceneIdx}:${variantIdx}`]: true }
  const variantAbortRef = useRef({});                  // { [key]: AbortController }
  const [cancelledPreviewSlots, setCancelledPreviewSlots] = useState({});         // { [sceneIndex]: true }
  const [cancelledVariantSlots, setCancelledVariantSlots] = useState({});         // { [`${sceneIdx}:${variantIdx}`]: true }
  // Click-any-image lightbox (mirrors /proposal/create pattern). Esc / click-
  // anywhere / click X all dismiss.
  const [enlargedImage, setEnlargedImage] = useState(null);
  useEffect(() => {
    if (!enlargedImage) return;
    const onKey = (e) => { if (e.key === "Escape") setEnlargedImage(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlargedImage]);

  const validHeadlines = headlines.map((h) => h.trim()).filter(Boolean);

  // PHASE 1 — Generate 5 distinct preview scenes via Claude + Gemini. Each
  // preview is a clean scene (no headline, no CTAs) that the team approves
  // before we spend credits on the variant pass.
  const generatePreviews = async () => {
    setGenState((s) => ({
      ...s,
      previewJobId: null,
      previewStatus: "running",
      previewImages: [],
      previewProgress: { done: 0, total: 5 },
      previewError: "",
      previewPrompts: [],
      previewShots: [],
      scenes: {},
      error: "",
    }));
    try {
      const res = await fetch("/api/static-generator/preview-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          aspectRatio,
          productImageUrl: productImageUrl || "",
          // Send the team's headlines so previews render with the FIRST
          // headline + full DR copy treatment. If empty, server falls back
          // to brand-kit-derived headlines.
          headlines: headlines || [],
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: `Server returned non-JSON (HTTP ${res.status}).` }; }
      if (!res.ok || !data.jobId) {
        setGenState((s) => ({ ...s, previewStatus: "error", previewError: data?.error || `HTTP ${res.status}` }));
        return;
      }
      setGenState((s) => ({
        ...s,
        previewJobId: data.jobId,
        previewProgress: { done: 0, total: data.total || 5 },
        previewPrompts: data.prompts || [],
        previewShots: data.shots || [],
      }));
    } catch (e) {
      setGenState((s) => ({ ...s, previewStatus: "error", previewError: e.message || "Network error" }));
    }
  };

  // PHASE 2 — Approve a scene → kick off variant generation (1 image per
  // headline overlaid on the same scene). Spawns its own job; multiple scene
  // approvals run their variant jobs in parallel.
  const approveScene = async (sceneImg) => {
    const sceneIndex = sceneImg.sceneIndex ?? null;
    const scenePrompt = sceneImg.scenePrompt || previewPrompts?.[sceneIndex] || "";
    const shot = sceneImg.shot || previewShots?.[sceneIndex] || "";
    if (!scenePrompt) {
      setError("Couldn't recover scene prompt for approval.");
      return;
    }
    // Optimistically mark scene as approving
    setGenState((s) => ({
      ...s,
      scenes: {
        ...s.scenes,
        [sceneIndex]: {
          ...s.scenes[sceneIndex],
          action: "approved",
          variantStatus: "running",
          variantJobId: null,
          variantImages: [],
          // 4 variants now (preview already covers headline[0])
          variantProgress: { done: 0, total: 4 },
          variantError: "",
          scenePrompt, shot,
          previewUrl: sceneImg.url,
          previewImg: sceneImg, // stash so the variant row can render preview as tile 0
        },
      },
    }));
    try {
      // Send headlines[1..] for variants — the preview already has headline[0]
      // baked in, so variants are the OTHER 4 headlines. Result: preview + 4
      // variants = 5 ads per scene, all on one line in the UI.
      const variantHeadlines = (validHeadlines.length ? validHeadlines : []).slice(1);
      const res = await fetch("/api/static-generator/approve-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          scenePrompt, shot,
          headlines: variantHeadlines,
          aspectRatio,
          productImageUrl: productImageUrl || "",
          parentJobId: previewJobId || null,
          approvedSceneIndex: sceneIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) {
        setGenState((s) => ({
          ...s,
          scenes: { ...s.scenes, [sceneIndex]: { ...s.scenes[sceneIndex], variantStatus: "error", variantError: data?.error || `HTTP ${res.status}` } },
        }));
        return;
      }
      setGenState((s) => ({
        ...s,
        scenes: { ...s.scenes, [sceneIndex]: { ...s.scenes[sceneIndex], variantJobId: data.jobId } },
      }));
    } catch (e) {
      setGenState((s) => ({
        ...s,
        scenes: { ...s.scenes, [sceneIndex]: { ...s.scenes[sceneIndex], variantStatus: "error", variantError: e.message || "Network error" } },
      }));
    }
  };

  // Revise a single preview scene — regenerate just that one preview with
  // the same scene prompt but a fresh attempt. Uses /regenerate-one with
  // headline="" so the preview stays scene-only. Works whether or not the
  // tile has finished its first render (`sceneImg` may be null during the
  // initial loading state — we recover the scene prompt from previewPrompts
  // which gets populated by /preview-start before the chunk worker fires).
  const revisePreview = async (sceneImg, sceneIndexHint = null) => {
    const sceneIndex = sceneImg?.sceneIndex ?? sceneIndexHint;
    if (sceneIndex == null) { setError("Couldn't determine which scene to revise."); return; }
    const scenePrompt = sceneImg?.scenePrompt || previewPrompts?.[sceneIndex] || "";
    if (!scenePrompt) { setError("Couldn't recover scene prompt to revise."); return; }
    if (previewAbortRef.current[sceneIndex]) {
      try { previewAbortRef.current[sceneIndex].abort(); } catch {}
    }
    const ac = new AbortController();
    previewAbortRef.current[sceneIndex] = ac;
    setRevisingPreview((m) => ({ ...m, [sceneIndex]: true }));
    setError("");
    try {
      const res = await fetch("/api/static-generator/regenerate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          headline: "", // preview = no headline
          imagePrompt: scenePrompt,
          imageId: sceneImg?.id, // may be undefined for refresh-during-loading
          aspectRatio,
          referenceImageUrl: productImageUrl || "",
          jobId: previewJobId,
          shot: sceneImg?.shot || previewShots?.[sceneIndex] || "",
          sceneIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setGenState((s) => {
        const list = s.previewImages || [];
        const tagged = { ...data.image, sceneIndex, shot: sceneImg?.shot || previewShots?.[sceneIndex] || data.image.shot, scenePrompt };
        // Try to swap by id first; fall back to swapping by sceneIndex; else
        // append. Covers the refresh-during-loading case where the slot has
        // no original tile yet and the chunk worker may also be writing to
        // the same sceneIndex — last-write-wins is fine here.
        const byId = list.findIndex((it) => it.id === data.image.id);
        if (byId >= 0) { const u = [...list]; u[byId] = tagged; return { ...s, previewImages: u }; }
        const bySceneIdx = list.findIndex((it) => it.sceneIndex === sceneIndex);
        if (bySceneIdx >= 0) { const u = [...list]; u[bySceneIdx] = tagged; return { ...s, previewImages: u }; }
        return { ...s, previewImages: [...list, tagged] };
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(`Revise failed: ${err.message}`);
    } finally {
      if (previewAbortRef.current[sceneIndex] === ac) {
        setRevisingPreview((m) => { const n = { ...m }; delete n[sceneIndex]; return n; });
        delete previewAbortRef.current[sceneIndex];
      }
    }
  };

  // Exit a scene — just mark it skipped in local state, no API call. The
  // preview tile stays visible but greyed out; no variant job is launched.
  const exitScene = (sceneImg) => {
    const sceneIndex = sceneImg.sceneIndex;
    setGenState((s) => ({
      ...s,
      scenes: { ...s.scenes, [sceneIndex]: { ...(s.scenes[sceneIndex] || {}), action: "exited" } },
    }));
  };

  // Regenerate ONE variant in an approved scene. Same /regenerate-one endpoint,
  // with the scene prompt + that variant's headline. AbortController per tile
  // mirrors the proposal/create pattern (re-click cancels the in-flight call).
  const regenerateVariant = async (sceneIndex, variantIndex, variantImg) => {
    const sceneState = genState.scenes?.[sceneIndex];
    const scenePrompt = variantImg?.scenePrompt || sceneState?.scenePrompt || "";
    // Recover the headline for this slot in priority order:
    //   1. The image's own stored headline (most accurate — comes from the
    //      chunk worker that actually rendered it)
    //   2. The matching headline from the variant batch (which may include
    //      server-derived defaults — peek at any sibling's image to learn it)
    //   3. The user-typed headline at this index
    //   4. A generic fallback so /regenerate-one never gets empty input
    const sibling = (sceneState?.variantImages || []).find((it) => it?.headlineIndex === variantIndex && it?.headline);
    const headline =
      variantImg?.headline
      || sibling?.headline
      || (validHeadlines[variantIndex] || "")
      || ["Designed for you.", "Built different.", "Try it once.", "Made better.", "The everyday upgrade."][variantIndex]
      || "Designed for you.";
    const shot = variantImg?.shot || sceneState?.shot || previewShots?.[sceneIndex] || "";
    const key = `${sceneIndex}:${variantIndex}`;
    if (!scenePrompt) { setError("Couldn't recover scene prompt for variant regen."); return; }

    if (variantAbortRef.current[key]) {
      try { variantAbortRef.current[key].abort(); } catch {}
    }
    const ac = new AbortController();
    variantAbortRef.current[key] = ac;
    setVariantBusy((m) => ({ ...m, [key]: true }));
    setError("");
    try {
      const res = await fetch("/api/static-generator/regenerate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          clientId: client.id,
          productId: activeProduct?.id || null,
          headline,
          imagePrompt: scenePrompt,
          imageId: variantImg?.id, // may be undefined → server appends instead of swapping
          aspectRatio,
          referenceImageUrl: productImageUrl || "",
          jobId: sceneState?.variantJobId || null,
          shot,
          sceneIndex,
          headlineIndex: variantIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // Swap the variant in local state — match by id; if not present, replace
      // by index (covers cancel-then-regen-empty-slot flow).
      setGenState((s) => {
        const list = s.scenes[sceneIndex]?.variantImages || [];
        const matched = list.findIndex((it) => it.id === data.image.id);
        const updated = [...list];
        if (matched >= 0) updated[matched] = { ...data.image, headlineIndex: variantIndex, sceneIndex, scenePrompt };
        else updated[variantIndex] = { ...data.image, headlineIndex: variantIndex, sceneIndex, scenePrompt };
        return {
          ...s,
          scenes: { ...s.scenes, [sceneIndex]: { ...s.scenes[sceneIndex], variantImages: updated } },
        };
      });
      // Clear any local-cancel mark for this slot so the new image renders.
      setCancelledVariantSlots((m) => { const n = { ...m }; delete n[key]; return n; });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(`Variant regen failed: ${err.message}`);
    } finally {
      if (variantAbortRef.current[key] === ac) {
        setVariantBusy((m) => { const n = { ...m }; delete n[key]; return n; });
        delete variantAbortRef.current[key];
      }
    }
  };

  // Locally cancel an in-flight slot (preview or variant). The server job
  // keeps generating other tiles; this one just gets greyed out so the user
  // can move on. If the actual image lands later, we suppress it via the
  // cancelled-flag set so the placeholder stays.
  const cancelPreviewSlot = (sceneIndex) => {
    setCancelledPreviewSlots((m) => ({ ...m, [sceneIndex]: true }));
  };
  const cancelVariantSlot = (sceneIndex, variantIndex) => {
    const key = `${sceneIndex}:${variantIndex}`;
    if (variantAbortRef.current[key]) {
      try { variantAbortRef.current[key].abort(); } catch {}
      delete variantAbortRef.current[key];
    }
    setCancelledVariantSlots((m) => ({ ...m, [key]: true }));
    setVariantBusy((m) => { const n = { ...m }; delete n[key]; return n; });
  };

  // Stop the in-flight job. Writes status='cancelled' to the job row; the
  // chunk worker checks status at the top of each chunk and bails out.
  // In-flight Gemini calls already mid-fetch will still finish (we don't
  // hard-abort to avoid orphaned uploads), but no new tasks will start.
  // Stop the in-flight preview job. Variant jobs (per-scene) keep running —
  // user can stop those individually if needed (future).
  const stop = async () => {
    if (!previewJobId) return;
    setStopping(true);
    try {
      await fetch("/api/static-generator/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: previewJobId }),
      });
      setGenState((s) => ({ ...s, previewStatus: "cancelled" }));
    } catch (e) {
      setError(`Stop failed: ${e.message}`);
    } finally {
      setStopping(false);
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

      {/* Reference image — single shared product photo for all 5 previews */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Product reference</p>
        <p style={{ fontSize: 12, color: G.textSec, marginBottom: 16 }}>
          Gemini uses this as the literal product in every generated ad. Cycle through your brand-kit photos or upload your own.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <RefImageRow
            rowIndex={0}
            options={availableRefImages}
            value={productImageUrl || ""}
            onChange={(url) => setProductImageUrl(url)}
            onUploaded={(url) => setSessionUploads((prev) => prev.includes(url) ? prev : [...prev, url])}
            onCycle={cycleProductImage}
            clientId={client?.id}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: G.text, fontWeight: 600, marginBottom: 4 }}>
              {productImageUrl ? "Reference set" : "No reference (text-only)"}
            </p>
            <p style={{ fontSize: 11, color: G.textTer }}>
              {availableRefImages.length} image{availableRefImages.length === 1 ? "" : "s"} on file{sessionUploads.length > 0 ? ` (incl. ${sessionUploads.length} fresh upload${sessionUploads.length === 1 ? "" : "s"})` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Headlines (used in phase 2 — one per variant) */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Headlines <span style={{ ...mono, fontSize: 11, fontWeight: 500, color: G.textTer, marginLeft: 6 }}>5 variants per approved scene</span></p>
        <p style={{ fontSize: 12, color: G.textSec, marginBottom: 16 }}>
          Used after you approve a preview. Each approved scene renders 5 ad variants — one per headline. Leave blank and we&apos;ll fill from the brand kit.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {headlines.map((h, i) => (
            <input key={i} value={h}
              onChange={(e) => setHeadlines((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`Headline ${i + 1}`}
              style={inputBase} />
          ))}
        </div>
      </div>

      {/* Format + generate row */}
      <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ ...hd, fontSize: 18, color: G.text, marginBottom: 6 }}>Phase 1 · Preview</p>
          <p style={{ fontSize: 12, color: G.textSec }}>
            5 distinct on-brand scenes (Bold Claim · Product Hero · Social Proof · Editorial · Lifestyle) — review before spending credits on the full batch.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                <Loader2 size={14} style={{ animation: "spinKf 1s linear infinite" }} /> {previewProgress.done}/{previewProgress.total || 5}...
              </div>
              <button onClick={stop} disabled={stopping}
                title="Stop the preview generation"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", fontSize: 13, fontWeight: 600, background: "transparent", color: G.reject, border: `1px solid ${G.reject}40`, borderRadius: 980, cursor: stopping ? "not-allowed" : "pointer", opacity: stopping ? 0.55 : 1, fontFamily: "'Inter', sans-serif" }}>
                <X size={14} /> {stopping ? "Stopping…" : "Stop"}
              </button>
            </>
          ) : (
            <button onClick={generatePreviews}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, background: G.ink, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <Wand2 size={14} /> Generate 5 previews
            </button>
          )}
        </div>
      </div>

      {(error || previewError) && (
        <div style={{ padding: 16, marginBottom: 20, background: "#FEEBEC", border: `1px solid ${G.reject}40`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: G.reject, margin: 0 }}>{error || previewError}</p>
        </div>
      )}

      {/* Preview tiles — 5 scene previews + Approve / Revise / Exit per tile */}
      {(previewImages?.length > 0 || generating) && (
        <div style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 18, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ ...hd, fontSize: 22, color: G.text, marginBottom: 4 }}>Preview scenes</p>
            <p style={{ fontSize: 12, color: G.textSec }}>
              Approve a scene to render 5 ad variants (one per headline). Revise to regenerate. Exit to skip.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const img = previewImages.find((i) => i.sceneIndex === idx) || null;
              const sceneState = scenes?.[idx] || {};
              const isExited = sceneState.action === "exited";
              const isApproved = sceneState.action === "approved";
              const isRevising = !!revisingPreview[idx];
              const isCancelled = !!cancelledPreviewSlots[idx];
              const shotLabel = img?.shot || previewShots?.[idx] || `Scene ${idx + 1}`;
              const showImage = img?.url && !isCancelled;
              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 8, opacity: isExited || isCancelled ? 0.45 : 1 }}>
                  <p style={{ fontSize: 10, color: G.textTer, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{shotLabel}</p>
                  <div style={{ position: "relative", aspectRatio: aspectRatio.replace(":", "/"), borderRadius: 12, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${isApproved ? G.success : G.border}` }}>
                    {showImage ? (
                      <img src={img.url} alt={shotLabel}
                        onClick={() => setEnlargedImage(img.url)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", filter: isRevising ? "blur(2px) brightness(0.6)" : "none", transition: "filter 0.2s", cursor: "zoom-in" }} />
                    ) : isCancelled ? (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>Cancelled</div>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer }}>
                        <Loader2 size={20} style={{ animation: "spinKf 1s linear infinite" }} />
                      </div>
                    )}
                    {/* Top-right buttons during loading: refresh + cancel.
                        Refresh fires /regenerate-one with the same scene
                        prompt so a stuck slot can be retried by hand. */}
                    {!showImage && !isCancelled && (
                      <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                        <button onClick={() => revisePreview(img, idx)} title="Refresh this tile"
                          disabled={isRevising}
                          style={{ width: 26, height: 26, padding: 0, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 999, cursor: isRevising ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <RefreshCw size={11} style={isRevising ? { animation: "spinKf 1s linear infinite" } : undefined} />
                        </button>
                        <button onClick={() => cancelPreviewSlot(idx)} title="Cancel this tile"
                          style={{ width: 26, height: 26, padding: 0, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {isRevising && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
                        Revising…
                      </div>
                    )}
                    {isApproved && (
                      <div style={{ position: "absolute", top: 6, left: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#fff", background: G.success, borderRadius: 999, letterSpacing: 0.3 }}>
                        APPROVED
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  {showImage && !isExited && !isApproved && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approveScene(img)}
                        style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 10px", fontSize: 12, fontWeight: 700, background: G.ink, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        <Check size={12} /> Approve · 4 more
                      </button>
                      <button onClick={() => revisePreview(img)}
                        title="Regenerate just this preview"
                        disabled={isRevising}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 8, cursor: isRevising ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                        <RefreshCw size={12} />
                      </button>
                      <button onClick={() => exitScene(img)}
                        title="Skip this scene"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px solid ${G.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {(isExited || isCancelled) && (
                    <button onClick={() => {
                      if (isExited) setGenState((s) => ({ ...s, scenes: { ...s.scenes, [idx]: { ...(s.scenes[idx] || {}), action: undefined } } }));
                      if (isCancelled) setCancelledPreviewSlots((m) => { const n = { ...m }; delete n[idx]; return n; });
                    }}
                      style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px dashed ${G.border}`, borderRadius: 8, cursor: "pointer" }}>
                      {isCancelled ? "Cancelled — restore" : "Skipped — restore"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Variant grids — one per approved scene */}
          {Object.entries(scenes || {}).filter(([, v]) => v?.action === "approved").map(([sceneIndexStr, sceneState]) => {
            const sceneIndex = Number(sceneIndexStr);
            const shotLabel = previewShots?.[sceneIndex] || `Scene ${sceneIndex + 1}`;
            const variantImages = sceneState.variantImages || [];
            const status = sceneState.variantStatus;
            return (
              <div key={sceneIndex} style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${G.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ ...hd, fontSize: 18, color: G.text, marginBottom: 2 }}>{shotLabel} · 5 ads</p>
                    <p style={{ fontSize: 12, color: G.textSec }}>
                      {status === "running"
                        ? <>Rendering 4 more… <Loader2 size={11} style={{ display: "inline", verticalAlign: "middle", animation: "spinKf 1s linear infinite" }} /> {sceneState.variantProgress?.done || 0}/{sceneState.variantProgress?.total || 4}</>
                        : status === "done"
                          ? `Preview + ${variantImages.length} variants ready in the Creatives portal.`
                          : status === "error"
                            ? <span style={{ color: G.reject }}>{sceneState.variantError}</span>
                            : "—"
                      }
                    </p>
                  </div>
                </div>
                {/* 5-column row — preview tile (column 0) + 4 variant tiles
                    (columns 1-4) so the scene's full headline set reads as
                    a coherent group of 5 ads on one line. */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {/* Column 0: the approved preview itself (uses headline[0]) */}
                  {(() => {
                    const previewImg = sceneState.previewImg || previewImages.find((it) => it.sceneIndex === sceneIndex);
                    return (
                      <div style={{ position: "relative", aspectRatio: aspectRatio.replace(":", "/"), borderRadius: 10, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${G.success}` }}>
                        {previewImg?.url ? (
                          <img src={previewImg.url} alt="" onClick={() => setEnlargedImage(previewImg.url)}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer, fontSize: 11 }}>—</div>
                        )}
                        <div style={{ position: "absolute", top: 6, left: 6, padding: "3px 7px", fontSize: 9, fontWeight: 700, color: "#fff", background: G.success, borderRadius: 999, letterSpacing: 0.3 }}>
                          PREVIEW
                        </div>
                      </div>
                    );
                  })()}
                  {Array.from({ length: 4 }).map((_, vi) => {
                    const variant = variantImages.find((it) => it.headlineIndex === vi) || variantImages[vi];
                    const key = `${sceneIndex}:${vi}`;
                    const busy = !!variantBusy[key];
                    const cancelled = !!cancelledVariantSlots[key];
                    const showImage = variant?.url && !cancelled;
                    return (
                      <div key={vi} style={{ position: "relative", aspectRatio: aspectRatio.replace(":", "/"), borderRadius: 10, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${G.border}`, opacity: cancelled ? 0.45 : 1 }}>
                        {showImage ? (
                          <img src={variant.url} alt={variant.name}
                            onClick={() => setEnlargedImage(variant.url)}
                            style={{ width: "100%", height: "100%", objectFit: "cover", filter: busy ? "blur(2px) brightness(0.6)" : "none", transition: "filter 0.2s", cursor: "zoom-in" }} />
                        ) : cancelled ? (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>Cancelled</div>
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.textTer, fontSize: 11 }}>
                            {status === "running" || busy ? <Loader2 size={16} style={{ animation: "spinKf 1s linear infinite" }} /> : "—"}
                          </div>
                        )}
                        {busy && showImage && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
                            Regenerating…
                          </div>
                        )}
                        {/* Top-right action cluster: refresh + cancel */}
                        {!cancelled && (
                          <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                            {showImage && (
                              <button onClick={() => regenerateVariant(sceneIndex, vi, variant)} title="Regenerate this variant"
                                disabled={busy}
                                style={{ width: 24, height: 24, padding: 0, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 999, cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <RefreshCw size={11} style={busy ? { animation: "spinKf 1s linear infinite" } : undefined} />
                              </button>
                            )}
                            {(showImage || status === "running" || busy) && (
                              <button onClick={() => cancelVariantSlot(sceneIndex, vi)} title="Cancel this tile"
                                style={{ width: 24, height: 24, padding: 0, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        )}
                        {cancelled && (
                          <button onClick={() => regenerateVariant(sceneIndex, vi, variant)} title="Re-render this variant"
                            style={{ position: "absolute", inset: "auto 6px 6px 6px", padding: "4px 8px", fontSize: 10, fontWeight: 600, background: "transparent", color: G.textSec, border: `1px dashed ${G.border}`, borderRadius: 6, cursor: "pointer" }}>
                            Re-render
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* View in Creatives — surfaces once any variant work has happened */}
          {!generating && (previewImages?.length > 0 || Object.keys(scenes || {}).length > 0) && (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onGenerated?.()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: "#fff", background: G.ink, border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                View in Creatives <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox — click any image to enlarge, click anywhere / Esc to close */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 32, cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={() => setEnlargedImage(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <X size={18} />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 20px 80px rgba(0,0,0,0.5)", cursor: "zoom-out" }}
          />
        </div>
      )}

      <style>{`@keyframes spinKf { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Per-headline reference image control. Big visible thumbnail with cycle
// arrows on either side so the team can flip through the brand-kit photos
// without opening a popover. Click the thumbnail to open the full picker
// (paste URL / upload / explicit no-reference). Mirrors the proposal
// `productRefUrl` UX but scoped per-row so each headline can use a
// different reference photo.
function RefImageRow({ rowIndex, options, value, onChange, onCycle, onUploaded, clientId }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {options.length > 1 && (
        <button type="button" onClick={() => onCycle(-1)}
          title="Previous reference image"
          style={{ width: 22, height: 56, padding: 0, background: "transparent", border: "none", color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
          <ChevronLeft size={18} />
        </button>
      )}
      <RefImagePicker
        options={options}
        value={value}
        onChange={onChange}
        onUploaded={onUploaded}
        clientId={clientId}
      />
      {options.length > 1 && (
        <button type="button" onClick={() => onCycle(1)}
          title="Next reference image"
          style={{ width: 22, height: 56, padding: 0, background: "transparent", border: "none", color: G.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

// Compact dropdown thumbnail picker for the per-headline product reference
// image. Always renders so the team can attach a reference even when the
// brand kit hasn't seeded any product images yet. The popover offers:
//   - existing options (from product.product_image_urls / brand_intake)
//   - a "no reference" choice (X)
//   - paste-a-URL field
//   - upload-a-file button (writes to Supabase brand-assets bucket)
function RefImagePicker({ options, value, onChange, onUploaded, clientId }) {
  const [open, setOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const ref = useRef(null);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleUpload = async (file) => {
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(clientId, file);
      if (url) {
        onChange(url);
        onUploaded?.(url);
        setOpen(false);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} type="button"
        title={value ? "Change reference image" : "Add a product reference image"}
        style={{
          width: 56, height: 56, padding: 0, borderRadius: 12,
          border: value ? `2px solid ${G.ink}` : `1px dashed ${G.border}`,
          background: value ? "#000" : G.bg,
          cursor: "pointer", overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        {value
          ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <ImageIcon size={16} color={G.textTer} />
              <span style={{ fontSize: 9, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em" }}>REF</span>
            </div>
          )
        }
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
          background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          borderRadius: 12, padding: 12, width: 280,
        }}>
          <p style={{ fontSize: 11, color: G.textTer, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Reference image</p>

          {/* No-reference + existing options grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
            <button onClick={() => { onChange(""); setOpen(false); }} type="button"
              title="No reference (text-only prompt)"
              style={{ aspectRatio: "1/1", borderRadius: 8, border: value === "" ? `2px solid ${G.ink}` : `1px solid ${G.border}`, background: G.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: G.textSec }}>
              <X size={16} />
            </button>
            {options.map((url) => (
              <button key={url} onClick={() => { onChange(url); setOpen(false); }} type="button"
                style={{ aspectRatio: "1/1", borderRadius: 8, border: value === url ? `2px solid ${G.ink}` : `1px solid ${G.border}`, padding: 0, overflow: "hidden", cursor: "pointer", background: "#000" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>

          {options.length === 0 && (
            <p style={{ fontSize: 11, color: G.textTer, marginBottom: 8, lineHeight: 1.5 }}>
              No product images on file yet. Paste a URL or upload one — it&apos;ll be used as the visual reference for this headline&apos;s ads.
            </p>
          )}

          {/* Paste URL */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="Paste image URL"
              style={{ flex: 1, padding: "7px 10px", fontSize: 12, border: `1px solid ${G.border}`, borderRadius: 8, outline: "none", fontFamily: "'Inter', sans-serif" }}
            />
            <button type="button"
              disabled={!pasteUrl.trim()}
              onClick={() => { onChange(pasteUrl.trim()); setPasteUrl(""); setOpen(false); }}
              style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, background: G.ink, color: "#fff", border: "none", borderRadius: 8, cursor: pasteUrl.trim() ? "pointer" : "not-allowed", opacity: pasteUrl.trim() ? 1 : 0.4, fontFamily: "'Inter', sans-serif" }}>
              Use
            </button>
          </div>

          {/* Upload file */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          <button type="button"
            disabled={uploading || !clientId}
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%", padding: "8px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 8, cursor: uploading ? "wait" : "pointer", fontFamily: "'Inter', sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {uploading ? <><Loader2 size={12} style={{ animation: "spinKf 1s linear infinite" }} /> Uploading…</> : <><ImageIcon size={12} /> Upload image</>}
          </button>
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
