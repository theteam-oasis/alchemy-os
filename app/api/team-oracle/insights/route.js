// Team-level performance insights pulled from every active client's marketing
// dashboard. Surfaces a punch list of "needs your attention" cards that the
// team can scan in a few seconds. Mirrors the Oracle Insights panel from the
// marketing dashboard, but aggregated.

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function rel(date) {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export async function GET() {
  try {
    // Pull active clients + their dashboards + recent feedback
    const [{ data: clients }, { data: dashboards }, { data: feedbacks }, { data: portals }] = await Promise.all([
      supabase.from("clients").select("id, name, status, stage, progress, assigned_to"),
      supabase.from("marketing_dashboards").select("id, client_id, title, headers, rows, updated_at").order("updated_at", { ascending: false }),
      supabase.from("portal_feedback").select("project_id, item_id, status, feedback_comments, updated_at").order("updated_at", { ascending: false }).limit(200),
      supabase.from("portal_projects").select("id, client_id, client_name"),
    ]);

    const clientById = Object.fromEntries((clients || []).map(c => [c.id, c]));
    const portalToClient = Object.fromEntries((portals || []).map(p => [p.id, p.client_id]));

    const insights = [];

    // 1. Pending revisions across all clients (highest priority)
    const revisionsByClient = {};
    for (const fb of feedbacks || []) {
      if (fb.status !== "revision") continue;
      const clientId = portalToClient[fb.project_id];
      if (!clientId) continue;
      revisionsByClient[clientId] = (revisionsByClient[clientId] || 0) + 1;
    }
    const revisionsList = Object.entries(revisionsByClient).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (revisionsList.length > 0) {
      const total = Object.values(revisionsByClient).reduce((a, b) => a + b, 0);
      insights.push({
        kind: "warn", icon: "🔄", priority: 1,
        headline: `${total} pending revision${total === 1 ? "" : "s"} across ${revisionsList.length} client${revisionsList.length === 1 ? "" : "s"}`,
        body: revisionsList.map(([id, n]) => `${clientById[id]?.name || "Unknown"} (${n})`).join(" · "),
      });
    }

    // 2. Awaiting review - assets uploaded but no client status set in 24h+
    let awaitingCount = 0;
    const awaitingByClient = {};
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const p of portals || []) {
      const allItems = [...(p.images || []), ...(p.hero_scripts || []), ...(p.ugc_scripts || [])];
      for (const item of allItems) {
        const fb = (feedbacks || []).find(f => f.project_id === p.id && f.item_id === item.id);
        if (!fb || (!fb.status && new Date(fb.updated_at).getTime() < dayAgo)) {
          awaitingCount++;
          awaitingByClient[p.client_id] = (awaitingByClient[p.client_id] || 0) + 1;
        }
      }
    }
    if (awaitingCount > 0) {
      const top = Object.entries(awaitingByClient).sort((a, b) => b[1] - a[1])[0];
      insights.push({
        kind: "info", icon: "⏰", priority: 2,
        headline: `${awaitingCount} item${awaitingCount === 1 ? "" : "s"} awaiting client review`,
        body: top ? `Most stale: ${clientById[top[0]]?.name || "Unknown"} (${top[1]} item${top[1] === 1 ? "" : "s"})` : null,
      });
    }

    // 3. Aggregate top performance metric across dashboards (latest dash per client)
    const latestPerClient = {};
    for (const d of dashboards || []) {
      if (!latestPerClient[d.client_id]) latestPerClient[d.client_id] = d;
    }
    let totalSpend = 0, totalRev = 0, dashCount = 0;
    for (const d of Object.values(latestPerClient)) {
      const headers = d.headers || [];
      const rows = d.rows || [];
      // Match Meta Ads / Google Ads / TikTok column names too — long suffixed
      // headers like "Amount spent (USD)", "Cost (USD)", "Purchase value".
      const findIdx = (...needles) => {
        for (const needle of needles) {
          const n = needle.toLowerCase();
          const i = headers.findIndex((h) => {
            const hl = String(h || "").toLowerCase().trim();
            return hl === n || hl.startsWith(n + " (") || hl.endsWith(" " + n);
          });
          if (i >= 0) return i;
        }
        for (const needle of needles) {
          const n = needle.toLowerCase();
          const i = headers.findIndex((h) => String(h || "").toLowerCase().includes(n));
          if (i >= 0) return i;
        }
        return -1;
      };
      const sumIdx = (i) => {
        if (i < 0) return 0;
        let total = 0;
        for (const r of rows) {
          const v = Number(String(r[i] ?? "").replace(/[$,€£%\s]/g, ""));
          if (Number.isFinite(v)) total += v;
        }
        return total;
      };
      const s = sumIdx(findIdx("amount spent", "spend", "cost"));
      const r = sumIdx(findIdx("revenue", "sales", "purchase value", "conversion value"));
      if (s > 0) { totalSpend += s; totalRev += r; dashCount++; }
    }
    if (dashCount > 0 && totalSpend > 0) {
      const blendedRoas = totalRev / totalSpend;
      insights.push({
        kind: "metric", icon: "💰", priority: 3,
        headline: `${blendedRoas.toFixed(2)}x blended ROAS across ${dashCount} client${dashCount === 1 ? "" : "s"}`,
        body: `$${(totalRev / 1000).toFixed(1)}k revenue on $${(totalSpend / 1000).toFixed(1)}k spend.`,
      });
    }

    // 4. Recent client activity (last 24h)
    const recentClient = (feedbacks || []).filter(fb => Date.now() - new Date(fb.updated_at).getTime() < dayAgo).length;
    if (recentClient > 0) {
      insights.push({
        kind: "metric", icon: "📈", priority: 4,
        headline: `${recentClient} client interaction${recentClient === 1 ? "" : "s"} in the last 24h`,
        body: "Includes status changes and comments on assets.",
      });
    }

    // 5. Unassigned clients
    const unassigned = (clients || []).filter(c => !c.assigned_to).length;
    if (unassigned > 0) {
      insights.push({
        kind: "tip", icon: "👤", priority: 5,
        headline: `${unassigned} client${unassigned === 1 ? "" : "s"} unassigned`,
        body: "Assign owners in the CRM to keep accountability clear.",
      });
    }

    insights.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    return Response.json({ insights: insights.slice(0, 6) });
  } catch (e) {
    console.error("[team-oracle/insights]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
