// Client Oracle: an AI assistant for a single client. Unlike /api/team-oracle
// (which sees every client), this one is scoped strictly to the requested
// clientId - their brand kit, their products, their portal, their dashboard,
// their feedback. Safe to expose on the public client portal.

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safe(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v).slice(0, 400);
}

// Walks dashboard rows and sums every numeric-looking column so the Oracle
// has actual aggregates (total spend, total revenue, average CTR) rather
// than a bare row count. Without this it tends to tell the user to upload
// data even when the CSV is already loaded.
function summarizeDashboard(d) {
  const headers = d.headers || [];
  const rows = d.rows || [];
  if (rows.length === 0) return null;
  const totals = {};
  const hits = {};
  for (const row of rows) {
    headers.forEach((h, i) => {
      if (!h) return;
      const cell = row[i];
      if (cell == null || cell === "") return;
      // Strip currency, commas, percent signs
      const cleaned = String(cell).replace(/[$,€£%\s]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) {
        totals[h] = (totals[h] || 0) + n;
        hits[h] = (hits[h] || 0) + 1;
      }
    });
  }
  const lines = [];
  for (const h of headers) {
    if (hits[h] >= rows.length * 0.5) {
      // Mostly-numeric column. Show total + average.
      const avg = totals[h] / hits[h];
      const total = totals[h];
      // Heuristic: rate-style columns (CTR, CPC, frequency, ratio) are best
      // shown as averages, totals are misleading.
      const isRate = /rate|ratio|cpc|cpm|frequency|%|per\s/i.test(h);
      if (isRate) {
        lines.push(`- ${h}: avg ${avg.toFixed(2)} across ${hits[h]} rows`);
      } else {
        lines.push(`- ${h}: total ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} (avg ${avg.toFixed(2)} per row)`);
      }
    }
  }
  return lines;
}

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

async function buildClientContext(clientId) {
  const [{ data: client }, { data: intake }, { data: portals }, { data: dashboards }, { data: products }] = await Promise.all([
    supabase.from("clients").select("id, name, status, stage, progress, created_at").eq("id", clientId).maybeSingle(),
    supabase.from("brand_intake").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("portal_projects").select("id, slug, product_id, client_name, images, hero_scripts, ugc_scripts").eq("client_id", clientId),
    supabase.from("marketing_dashboards").select("id, slug, product_id, title, headers, rows, updated_at").eq("client_id", clientId).order("updated_at", { ascending: false }),
    supabase.from("products").select("id, name, description, target_market, problems_solved, unique_features, price_point, product_url").eq("client_id", clientId),
  ]);

  if (!client) return null;

  const projectIds = (portals || []).map(p => p.id);
  const { data: feedbacks } = projectIds.length > 0
    ? await supabase.from("portal_feedback").select("project_id, item_id, status, feedback_comments, updated_at").in("project_id", projectIds).order("updated_at", { ascending: false }).limit(60)
    : { data: [] };

  const intakeBlock = intake ? [
    `## Brand`,
    intake.brand_name ? `- Name: ${intake.brand_name}` : null,
    intake.tagline ? `- Tagline: "${intake.tagline}"` : null,
    intake.story ? `- Story: ${safe(intake.story)}` : null,
    intake.industry ? `- Industry: ${intake.industry}` : null,
    intake.location ? `- Location: ${intake.location}` : null,
    intake.audience_description ? `- Audience: ${safe(intake.audience_description)}` : null,
    intake.deepest_fears ? `- Deepest fears: ${safe(intake.deepest_fears)}` : null,
    intake.deepest_desires ? `- Deepest desires: ${safe(intake.deepest_desires)}` : null,
    intake.objective ? `- Objective: ${safe(intake.objective)}` : null,
    intake.key_message ? `- Key message: ${safe(intake.key_message)}` : null,
    intake.personality_tags?.length > 0 ? `- Personality: ${safe(intake.personality_tags)}` : null,
    intake.voice_gender ? `- Voice: ${intake.voice_gender}${intake.voice_age ? `, ${intake.voice_age}` : ""}` : null,
  ].filter(Boolean).join("\n") : "## Brand\n(no brand intake captured yet)";

  const productsBlock = (products || []).length > 0
    ? `## Products\n` + products.map(p => [
        `### ${p.name}`,
        p.description ? `- ${safe(p.description)}` : null,
        p.target_market ? `- Target market: ${safe(p.target_market)}` : null,
        p.problems_solved ? `- Problems solved: ${safe(p.problems_solved)}` : null,
        p.unique_features?.length > 0 ? `- Features: ${safe(p.unique_features)}` : null,
        p.price_point ? `- Price: ${p.price_point}` : null,
      ].filter(Boolean).join("\n")).join("\n\n")
    : "## Products\n(none captured)";

  const portalsBlock = (portals || []).length > 0
    ? `## Creatives portals\n` + portals.map(p => {
        const imgs = p.images?.length || 0;
        const hero = p.hero_scripts?.length || 0;
        const ugc = p.ugc_scripts?.length || 0;
        const heroTitles = (p.hero_scripts || []).map(s => s.title).filter(Boolean);
        const ugcTitles = (p.ugc_scripts || []).map(s => s.title).filter(Boolean);
        return [
          `### ${p.client_name || p.slug}`,
          `- ${imgs} statics, ${hero} hero scripts, ${ugc} UGC scripts`,
          heroTitles.length > 0 ? `- Hero titles: ${heroTitles.join("; ")}` : null,
          ugcTitles.length > 0 ? `- UGC titles: ${ugcTitles.join("; ")}` : null,
        ].filter(Boolean).join("\n");
      }).join("\n\n")
    : "## Creatives portals\n(none yet)";

  // Distinguish dashboards with real data vs empty placeholders. The Oracle
  // needs to see actual aggregates (totals, averages) so it can answer
  // "what's our spend?" without telling the user to upload data they
  // already uploaded.
  const dashboardsWithData = (dashboards || []).filter(d => (d.rows?.length || 0) > 0);
  const dashboardsBlock = (dashboards || []).length > 0
    ? `## Marketing dashboards (CSV data IS uploaded if any dashboard below has rows > 0; use the aggregates to answer performance questions)\n`
      + dashboards.map(d => {
          const rowCount = d.rows?.length || 0;
          const head = `### "${d.title}" (${d.headers?.length || 0} columns, ${rowCount} rows, last updated ${rel(d.updated_at)})`;
          if (rowCount === 0) return `${head}\n  (placeholder, no CSV data yet)`;
          const summary = summarizeDashboard(d) || [];
          return [head, ...summary].join("\n");
        }).join("\n\n")
    : "## Marketing dashboards\n(none yet)";

  const activityLines = [];
  for (const fb of feedbacks || []) {
    if (fb.status) activityLines.push(`- [${rel(fb.updated_at)}] ${fb.status} (item ${fb.item_id})`);
    for (const c of (fb.feedback_comments || []).slice(0, 2)) {
      const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
      activityLines.push(`- [${rel(c.date)}] ${who}: "${safe(c.text)}"`);
    }
    if (activityLines.length > 50) break;
  }
  const activityBlock = activityLines.length > 0
    ? `## Recent activity (newest first)\n` + activityLines.slice(0, 50).join("\n")
    : "## Recent activity\n(none yet)";

  return [
    `# ${client.name} — Live snapshot`,
    `Stage: ${client.stage || "n/a"} · Progress: ${client.progress || 0}%`,
    "",
    intakeBlock,
    "",
    productsBlock,
    "",
    portalsBlock,
    "",
    dashboardsBlock,
    "",
    activityBlock,
  ].join("\n");
}

export async function POST(req) {
  try {
    const { clientId, question, history } = await req.json();
    if (!clientId || !question) return Response.json({ error: "clientId + question required" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

    const context = await buildClientContext(clientId);
    if (!context) return Response.json({ error: "Client not found" }, { status: 404 });

    const systemPrompt = [
      "You are the Brand Oracle, an AI assistant inside this client's portal.",
      "You only have visibility into THIS specific client - their brand kit, products, creatives, dashboard, and recent activity.",
      "Answer the client's questions about their brand, their creative work, their performance data, or general brand-strategy advice using ONLY the snapshot below.",
      "Be warm, concise, and specific.",
      "FORMATTING RULES (critical):",
      "- Plain text only. NEVER use markdown.",
      "- No asterisks (** or *). No pound/hash headers (#, ##, ###).",
      "- No leading dashes (-). If you list things, use natural sentences or simple line breaks.",
      "- Numbered lists are fine as '1.', '2.', '3.' written naturally.",
      "- Write like a human in a chat - short paragraphs, clear language.",
      "If the snapshot doesn't have the answer, say so plainly. Do not invent data.",
      "",
      "─── LIVE SNAPSHOT (this client only) ───",
      context,
      "─── END SNAPSHOT ───",
    ].join("\n");

    const messages = [];
    if (Array.isArray(history)) {
      for (const m of history.slice(-12)) {
        if (m?.role && m?.content) messages.push({ role: m.role, content: String(m.content) });
      }
    }
    messages.push({ role: "user", content: String(question) });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return Response.json({ error: `Claude error ${res.status}: ${txt}` }, { status: 500 });
    }

    const data = await res.json();
    const answer = data?.content?.[0]?.text || "";
    return Response.json({ answer });
  } catch (e) {
    console.error("[client-oracle]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
