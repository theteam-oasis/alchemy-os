// Quick proactive insights pulled from this client's marketing dashboard.
// Mirrors the "Oracle Insights" panel from the marketing dashboard, but
// returns a small array of headline cards the chat panel can render at the
// top of the empty state. Tapping a card triggers an Oracle deep-dive.

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    // Pull every dashboard for this client and pick the one with actual data.
    // Previously we pulled "most recently updated" which gave us empty
    // placeholders (created right after a CSV delete or for a brand-new
    // product) even when an OTHER product had a fully populated CSV. The
    // insights tab then said "upload CSV" despite data being uploaded.
    const { data: dashes } = await supabase
      .from("marketing_dashboards")
      .select("id, slug, title, headers, rows, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });
    // Prefer the most recently updated dashboard that has rows. Fall back to
    // the most recent of any kind (which will trigger hasData:false below).
    const dash = (dashes || []).find((d) => Array.isArray(d.rows) && d.rows.length > 0)
      || (dashes || [])[0];

    const insights = [];

    if (!dash || !dash.rows?.length) {
      return Response.json({
        insights: [],
        hasData: false,
        dashboardSlug: dash?.slug || null,
      });
    }

    // Compute a few quick numbers. Column names are matched fuzzily so we
    // catch Meta Ads / Google Ads / TikTok Ads exports which use long
    // headers like "Amount spent (USD)", "Cost (USD)", "Reach", etc.
    const headers = dash.headers || [];
    const rows = dash.rows || [];

    const findIdx = (...needles) => {
      for (const needle of needles) {
        const n = needle.toLowerCase();
        const i = headers.findIndex((h) => {
          const hl = String(h || "").toLowerCase().trim();
          // Exact, "X (USD)", or "X (any unit)" matches all count.
          return hl === n || hl.startsWith(n + " (") || hl.endsWith(" " + n);
        });
        if (i >= 0) return i;
      }
      // Fall back to a partial substring match (last resort).
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

    const totalSpend = sumIdx(findIdx("amount spent", "spend", "cost"));
    const totalRevenue = sumIdx(findIdx("revenue", "sales", "purchase value", "conversion value"));
    const totalImpressions = sumIdx(findIdx("impressions"));
    const totalClicks = sumIdx(findIdx("link clicks", "clicks (all)", "clicks"));
    const totalConversions = sumIdx(findIdx("conversions", "purchases", "results", "leads"));
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    if (totalRevenue > 0 || totalSpend > 0) {
      insights.push({
        kind: "metric", icon: "💰",
        headline: `${totalRevenue >= 1000 ? "$" + (totalRevenue / 1000).toFixed(1) + "k" : "$" + totalRevenue.toFixed(0)} revenue · ${roas.toFixed(2)}x ROAS`,
        body: `On $${(totalSpend / 1000).toFixed(1)}k of ad spend across ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
      });
    }
    if (ctr > 0) {
      insights.push({
        kind: "metric", icon: "👁",
        headline: `${ctr.toFixed(2)}% CTR overall`,
        body: `${totalClicks.toLocaleString()} clicks on ${totalImpressions.toLocaleString()} impressions.`,
      });
    }
    if (cpa > 0) {
      insights.push({
        kind: "metric", icon: "🎯",
        headline: `$${cpa.toFixed(2)} per conversion`,
        body: `${totalConversions.toLocaleString()} conversions tracked. ${cpa < 25 ? "Healthy." : cpa < 60 ? "Workable." : "Watch this."}`,
      });
    }

    // ── Patterns: group rows by creative attribute and find top performers ──
    // We look for any of these grouping columns in the CSV. For each group we
    // aggregate spend + revenue + clicks + impressions and rank by ROAS,
    // falling back to CTR if revenue isn't present. Returns an array of
    // pattern blocks so the UI can render "Top hooks", "Top asset types",
    // "Top placements", etc.
    const PATTERN_COLUMNS = [
      { key: "Hook", needles: ["hook", "angle", "creative angle"] },
      { key: "Asset Type", needles: ["asset type", "ad type", "creative type", "format"] },
      { key: "Image Style", needles: ["image style", "visual style", "creative style", "style"] },
      { key: "Product", needles: ["product", "product name"] },
      { key: "Placement", needles: ["placement"] },
      { key: "Ad Set", needles: ["ad set name", "ad set", "campaign name", "campaign"] },
    ];
    const patterns = [];
    const spendIdx = findIdx("amount spent", "spend", "cost");
    const revIdx = findIdx("revenue", "sales", "purchase value", "conversion value");
    const clicksIdx = findIdx("link clicks", "clicks (all)", "clicks");
    const imprIdx = findIdx("impressions");

    for (const { key, needles } of PATTERN_COLUMNS) {
      const colIdx = findIdx(...needles);
      if (colIdx < 0) continue;
      // Group rows by the column value
      const groups = new Map();
      for (const r of rows) {
        const label = String(r[colIdx] ?? "").trim();
        if (!label) continue;
        if (!groups.has(label)) groups.set(label, { spend: 0, rev: 0, clicks: 0, imps: 0, count: 0 });
        const g = groups.get(label);
        const num = (i) => {
          if (i < 0) return 0;
          const v = Number(String(r[i] ?? "").replace(/[$,€£%\s]/g, ""));
          return Number.isFinite(v) ? v : 0;
        };
        g.spend += num(spendIdx);
        g.rev += num(revIdx);
        g.clicks += num(clicksIdx);
        g.imps += num(imprIdx);
        g.count += 1;
      }
      if (groups.size < 2) continue; // only one bucket -> not a pattern

      // Score: ROAS if we have revenue, else CTR, else just count.
      const scored = [...groups.entries()].map(([label, g]) => {
        const score = g.spend > 0 && g.rev > 0
          ? g.rev / g.spend
          : g.imps > 0 && g.clicks > 0
          ? (g.clicks / g.imps) * 100
          : g.count;
        const metric = g.spend > 0 && g.rev > 0
          ? `${(g.rev / g.spend).toFixed(2)}x ROAS`
          : g.imps > 0 && g.clicks > 0
          ? `${((g.clicks / g.imps) * 100).toFixed(2)}% CTR`
          : `${g.count} run${g.count === 1 ? "" : "s"}`;
        return { label, score, metric, spend: g.spend, count: g.count };
      }).sort((a, b) => b.score - a.score);

      // Skip pattern if everyone tied at 0.
      if (scored[0].score === 0) continue;

      patterns.push({
        kind: "pattern",
        title: `Top ${key.toLowerCase()}${key.endsWith("s") ? "" : "s"}`,
        column: key,
        rows: scored.slice(0, 3).map((s) => ({
          label: s.label.length > 50 ? s.label.slice(0, 50) + "…" : s.label,
          metric: s.metric,
          spend: s.spend > 0 ? `$${s.spend >= 1000 ? (s.spend / 1000).toFixed(1) + "k" : s.spend.toFixed(0)} spent` : null,
          count: s.count,
        })),
      });
    }

    // Belt-and-suspenders: if none of the standard metrics yielded an insight
    // (e.g. the CSV uses unfamiliar column names), surface a fallback so the
    // panel doesn't show "Loading insights..." forever.
    if (insights.length === 0 && patterns.length === 0) {
      insights.push({
        kind: "metric", icon: "📊",
        headline: `${rows.length.toLocaleString()} row${rows.length === 1 ? "" : "s"} of data ready`,
        body: `Click to ask Oracle anything about this dataset, or open the Analytics dashboard for the full breakdown.`,
      });
    }

    return Response.json({
      insights: insights.slice(0, 4),
      patterns: patterns.slice(0, 4),
      hasData: true,
      dashboardSlug: dash.slug,
    });
  } catch (e) {
    console.error("[client-oracle/insights]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
