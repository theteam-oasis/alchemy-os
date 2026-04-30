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

    // Pull the most recent dashboard for this client (any product)
    const { data: dashes } = await supabase
      .from("marketing_dashboards")
      .select("id, slug, title, headers, rows, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const dash = dashes?.[0];

    const insights = [];

    if (!dash || !dash.rows?.length) {
      // No data yet - return an "empty" payload so the UI can render a single
      // upload-CTA card instead of clickable insights that don't exist yet.
      return Response.json({
        insights: [],
        hasData: false,
        dashboardSlug: dash?.slug || null,
      });
    }

    // Compute a few quick numbers
    const headers = dash.headers || [];
    const rows = dash.rows || [];
    const idx = (name) => headers.findIndex((h) => String(h).toLowerCase() === name.toLowerCase());
    const sum = (col) => {
      const i = idx(col);
      if (i < 0) return 0;
      let total = 0;
      for (const r of rows) {
        const v = Number(String(r[i] ?? "").replace(/[$,]/g, ""));
        if (Number.isFinite(v)) total += v;
      }
      return total;
    };

    const totalSpend = sum("Spend") || sum("Cost");
    const totalRevenue = sum("Revenue") || sum("Sales");
    const totalImpressions = sum("Impressions");
    const totalClicks = sum("Clicks");
    const totalConversions = sum("Conversions") || sum("Purchases");
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

    return Response.json({ insights: insights.slice(0, 4), hasData: true, dashboardSlug: dash.slug });
  } catch (e) {
    console.error("[client-oracle/insights]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
