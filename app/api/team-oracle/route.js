// Team Oracle: an AI assistant for the Alchemy team. It has read access to
// every client, intake, portal project, dashboard, and recent activity so
// the team can ask things like "which clients are stuck on revisions?",
// "summarize this week's approvals", "what's Muze's brand voice?", etc.
//
// We assemble a structured context summary, prepend it to the conversation,
// and call Claude. Non-streaming for simplicity in v1.

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safe(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v).slice(0, 280);
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

async function buildContext() {
  // Pull only the columns we need to keep the prompt small.
  const [{ data: clients }, { data: intakes }, { data: portals }, { data: dashboards }, { data: products }, { data: feedbacks }] = await Promise.all([
    supabase.from("clients").select("id, name, status, stage, progress, assigned_to, created_at").order("created_at", { ascending: false }),
    supabase.from("brand_intake").select("client_id, brand_name, tagline, industry, location, audience_description, age_range, objective, key_message, voice_gender, music_mood, personality_tags, deepest_fears, deepest_desires"),
    supabase.from("portal_projects").select("id, slug, client_id, product_id, client_name, images, hero_scripts, ugc_scripts"),
    supabase.from("marketing_dashboards").select("id, slug, client_id, product_id, title, headers, rows, updated_at").order("updated_at", { ascending: false }),
    supabase.from("products").select("id, client_id, name, description, target_market"),
    supabase.from("portal_feedback").select("project_id, item_id, status, feedback_comments, updated_at").order("updated_at", { ascending: false }).limit(100),
  ]);

  const clientById = Object.fromEntries((clients || []).map(c => [c.id, c]));
  const intakeByClient = Object.fromEntries((intakes || []).map(i => [i.client_id, i]));
  const productsByClient = {};
  for (const p of products || []) {
    if (!productsByClient[p.client_id]) productsByClient[p.client_id] = [];
    productsByClient[p.client_id].push(p);
  }
  const portalsByClient = {};
  for (const p of portals || []) {
    if (!portalsByClient[p.client_id]) portalsByClient[p.client_id] = [];
    portalsByClient[p.client_id].push(p);
  }
  const dashByClient = {};
  for (const d of dashboards || []) {
    if (!dashByClient[d.client_id]) dashByClient[d.client_id] = [];
    dashByClient[d.client_id].push(d);
  }

  // Per-client summary
  const clientSummaries = (clients || []).map(c => {
    const intake = intakeByClient[c.id] || {};
    const prods = productsByClient[c.id] || [];
    const cps = portalsByClient[c.id] || [];
    const ds = dashByClient[c.id] || [];
    const totalAssets = cps.reduce((sum, p) => sum + (p.images?.length || 0) + (p.hero_scripts?.length || 0) + (p.ugc_scripts?.length || 0), 0);
    return [
      `### ${c.name} (id: ${c.id})`,
      `- Stage: ${c.stage || "n/a"} | Progress: ${c.progress || 0}% | Status: ${c.status || "n/a"} | Assigned: ${c.assigned_to || "unassigned"}`,
      intake.brand_name ? `- Brand: ${intake.brand_name}${intake.tagline ? ` — "${intake.tagline}"` : ""}` : null,
      intake.industry ? `- Industry: ${intake.industry}${intake.location ? ` (${intake.location})` : ""}` : null,
      intake.audience_description ? `- Audience: ${safe(intake.audience_description)}` : null,
      intake.objective ? `- Objective: ${safe(intake.objective)}` : null,
      intake.key_message ? `- Key message: ${safe(intake.key_message)}` : null,
      intake.personality_tags?.length > 0 ? `- Personality: ${safe(intake.personality_tags)}` : null,
      prods.length > 0 ? `- Products: ${prods.map(p => p.name).join(", ")}` : null,
      cps.length > 0 ? `- Creatives portals: ${cps.length} (${totalAssets} total assets)` : null,
      ds.length > 0 ? `- Marketing dashboards: ${ds.length}${ds[0]?.title ? ` (latest: "${ds[0].title}")` : ""}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  // Recent activity from feedback rows
  const activityLines = [];
  for (const fb of feedbacks || []) {
    const portal = (portals || []).find(p => p.id === fb.project_id);
    const clientName = portal?.client_name || (portal?.client_id ? clientById[portal.client_id]?.name : "unknown");
    if (fb.status) {
      const itemLabel = (() => {
        if (!portal) return fb.item_id;
        const id = fb.item_id;
        if (id?.startsWith("moodboard-")) return "mood board";
        const hero = (portal.hero_scripts || []).find(s => s.id === id);
        if (hero) return hero.title || "Hero script";
        const ugc = (portal.ugc_scripts || []).find(s => s.id === id);
        if (ugc) return ugc.title || "UGC script";
        const img = (portal.images || []).find(i => i.id === id);
        if (img) return img.name || "an image";
        return "an item";
      })();
      activityLines.push(`- [${rel(fb.updated_at)}] ${clientName}: ${fb.status} ${itemLabel}`);
    }
    for (const c of (fb.feedback_comments || []).slice(0, 2)) {
      const who = c.senderName || (c.sender === "team" ? "Team" : "Client");
      activityLines.push(`- [${rel(c.date)}] ${clientName} — ${who}: "${safe(c.text)}"`);
    }
    if (activityLines.length > 80) break;
  }

  return [
    `# Alchemy OS Snapshot (live)`,
    `Total clients: ${clients?.length || 0}`,
    `Team roster: Andrew, Shalie, Bebon, Wak`,
    ``,
    `## Clients`,
    clientSummaries || "(none)",
    ``,
    `## Recent activity (newest first, last 80)`,
    activityLines.slice(0, 80).join("\n") || "(none)",
  ].join("\n");
}

export async function POST(req) {
  try {
    const { question, history } = await req.json();
    if (!question) return Response.json({ error: "question required" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

    const context = await buildContext();

    const systemPrompt = [
      "You are Alchemy Oracle, the AI copilot for the Alchemy Productions agency team.",
      "You have read access to a live snapshot of every client, brand intake, creatives portal, marketing dashboard, product, and recent feedback activity in the Alchemy OS platform.",
      "When the team asks questions, answer using ONLY the snapshot below. Be concise, specific, and actionable.",
      "Use bullet points and short sections for any list of clients or items.",
      "If the snapshot doesn't have the answer, say so plainly. Do not invent data.",
      "When summarizing activity, prefer recency and relevance. When asked 'who's stuck' or 'who needs attention', look at progress, stage, recent revisions, and unresolved comments.",
      "",
      "─── LIVE SNAPSHOT ───",
      context,
      "─── END SNAPSHOT ───",
    ].join("\n");

    // Build the conversation
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
    console.error("[team-oracle]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
