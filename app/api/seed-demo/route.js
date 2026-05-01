// Seeds a fully populated demo client into Supabase so the team can show off
// Alchemy OS with realistic data — analytics charts, Oracle answers, Insights
// patterns, brand kit — even before any real client uploads anything.
//
// Idempotent: re-running this updates the existing demo client in place
// (matched by slug) instead of duplicating it. Hit GET or POST to seed.
//
// URL: /api/seed-demo

import { supabase } from "@/lib/supabase";
import { generateDemoMarketingData } from "@/lib/demo-marketing-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_CLIENT_NAME = "Lumen Skincare";
const DEMO_SLUG_PREFIX = "lumen-skincare";

// Build a Meta Ads-style CSV with ~85 rows across 7 weeks of data, with ad set
// names that encode hooks ("UGC Testimonial - Lookalike 1%", etc.) so the
// Oracle and Patterns engine can find creative-level winners.
function buildMetaAdsCsv() {
  const headers = [
    "Reporting starts", "Reporting ends", "Ad set name",
    "Reach", "Frequency", "Amount spent (USD)", "Impressions",
    "CPM (cost per 1,000 impressions) (USD)", "Link clicks",
    "CPC (cost per link click) (USD)", "CTR (link click-through rate)",
    "Clicks (all)", "Cost per unique link click (USD)",
    "Cost per post engagement (USD)", "Conversions",
    "Cost per result", "Purchase value", "ROAS",
  ];

  // Variants of the four name parts. Each ad set name is "Hook - Style - Audience"
  // so the patterns engine can break down by hook AND placement-style AND audience.
  const HOOKS = [
    { label: "UGC Testimonial", boost: 1.55, ctrBoost: 1.4 },
    { label: "Founder Story", boost: 1.30, ctrBoost: 1.15 },
    { label: "Before & After", boost: 1.45, ctrBoost: 1.25 },
    { label: "Product Demo", boost: 1.10, ctrBoost: 1.0 },
    { label: "Routine Reveal", boost: 1.20, ctrBoost: 1.1 },
    { label: "Promo / Discount", boost: 1.65, ctrBoost: 1.35 },
  ];
  const STYLES = [
    { label: "Studio", boost: 0.95 },
    { label: "Lifestyle", boost: 1.10 },
    { label: "Selfie UGC", boost: 1.20 },
    { label: "Animation", boost: 0.85 },
  ];
  const AUDIENCES = [
    { label: "Lookalike 1%", boost: 1.45 },
    { label: "Lookalike 3%", boost: 1.20 },
    { label: "Interest - Skincare", boost: 1.0 },
    { label: "Retargeting 30d", boost: 1.85 },
    { label: "Retargeting 180d", boost: 1.40 },
    { label: "Broad", boost: 0.85 },
  ];

  let seed = 7;
  const rand = () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rows = [];
  const startDate = new Date("2026-03-08"); // ~7 weeks ago from a fake "now"
  const numWeeks = 7;
  // Pick 14 active ad-set combinations to keep the dataset focused
  const adSets = [];
  for (let i = 0; i < 14; i++) {
    const hook = HOOKS[Math.floor(rand() * HOOKS.length)];
    const style = STYLES[Math.floor(rand() * STYLES.length)];
    const audience = AUDIENCES[Math.floor(rand() * AUDIENCES.length)];
    adSets.push({
      name: `${hook.label} - ${style.label} - ${audience.label}`,
      boost: hook.boost * style.boost * audience.boost,
      ctrBoost: hook.ctrBoost * (style.label === "Selfie UGC" ? 1.15 : 1.0),
    });
  }

  for (let w = 0; w < numWeeks; w++) {
    const start = new Date(startDate);
    start.setDate(startDate.getDate() + w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const dateStart = start.toISOString().slice(0, 10);
    const dateEnd = end.toISOString().slice(0, 10);

    for (const adSet of adSets) {
      const noise = 0.75 + rand() * 0.6;
      const growth = 1 + w * 0.04;
      const mult = adSet.boost * noise * growth;

      const reach = Math.round(2200 + 6800 * mult);
      const impressions = Math.round(reach * (1.05 + rand() * 0.25));
      const frequency = +(impressions / Math.max(reach, 1)).toFixed(3);
      const cpm = +(8 + rand() * 24).toFixed(2);
      const spend = +((impressions / 1000) * cpm).toFixed(2);
      const ctr = +(0.6 + adSet.ctrBoost * (0.8 + rand() * 1.4)).toFixed(2); // %
      const linkClicks = Math.max(1, Math.round((impressions * ctr) / 100));
      const cpc = +(spend / linkClicks).toFixed(2);
      const allClicks = Math.round(linkClicks * (4 + rand() * 4));
      const cpUnique = +(cpc * (0.92 + rand() * 0.16)).toFixed(2);
      const cpEngagement = +(0.18 + rand() * 0.4).toFixed(2);
      const conversions = Math.max(0, Math.round(linkClicks * (0.03 + rand() * 0.06)));
      const cpr = conversions > 0 ? +(spend / conversions).toFixed(2) : 0;
      const purchaseValue = conversions > 0 ? +(conversions * (38 + rand() * 65)).toFixed(2) : 0;
      const roas = spend > 0 ? +(purchaseValue / spend).toFixed(2) : 0;

      rows.push([
        dateStart, dateEnd, adSet.name,
        reach, frequency, spend, impressions,
        cpm, linkClicks, cpc, ctr,
        allClicks, cpUnique, cpEngagement, conversions,
        cpr, purchaseValue, roas,
      ]);
    }
  }
  return { headers, rows };
}

async function upsertClient() {
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("name", DEMO_CLIENT_NAME)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      name: DEMO_CLIENT_NAME,
      stage: "Active",
      status: "active",
      progress: 70,
      assigned_to: "Demo",
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function upsertBrandIntake(clientId) {
  const payload = {
    client_id: clientId,
    brand_name: "Lumen Skincare",
    tagline: "Skin that catches the light.",
    industry: "Skincare / Beauty",
    location: "Brooklyn, NY",
    story: "Lumen was founded by a former esthetician who got tired of greenwashed lines that didn't work. Every formula is pH-balanced, fragrance-free, and tested on melanin-rich skin first.",
    audience_description: "Women 28-44 who already use skincare but are graduating to higher performance products. Tired of complicated 12-step routines.",
    age_range: "28-44",
    deepest_fears: "Wasting money on products that don't work. Looking older than they feel. Reactive skin that flares from new products.",
    deepest_desires: "A simple routine that visibly works in two weeks. Skin that looks lit-from-within without makeup.",
    objective: "Drive first-time purchases of the Glow Serum (hero SKU), then upsell into the full ritual.",
    key_message: "Three products. One ritual. Two weeks to glow.",
    voice_gender: "Feminine, calm, confident",
    music_mood: "Warm, ambient, slightly editorial",
    voice_style: ["confident", "warm", "honest", "premium"],
    personality_tags: ["editorial", "minimal", "scientific", "warm"],
    brand_colors: "Sand beige, deep terracotta, soft cream, charcoal accents",
    influencer_age: 32,
    influencer_gender: "female",
    influencer_ethnicity: "mixed - East Asian / Latin",
    influencer_style: "natural editorial",
  };

  const { data: existing } = await supabase
    .from("brand_intake")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from("brand_intake").update(payload).eq("id", existing.id);
    return existing.id;
  }
  const { data: created, error } = await supabase
    .from("brand_intake")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function upsertProduct(clientId, name, description, problemsSolved, features) {
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("client_id", clientId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      client_id: clientId,
      name,
      description,
      problems_solved: problemsSolved,
      unique_features: features,
      target_market: "Women 28-44 with combination/sensitive skin",
      price_point: "$48 - $84",
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function upsertPortalProject(clientId, productId, productName) {
  const slug = `${DEMO_SLUG_PREFIX}-${productName.toLowerCase().replace(/\s+/g, "-")}`;
  const { data: existing } = await supabase
    .from("portal_projects")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("portal_projects")
    .insert({
      client_id: clientId,
      product_id: productId,
      client_name: `${DEMO_CLIENT_NAME} - ${productName}`,
      slug,
      images: [
        // Free Pexels skincare imagery - solid placeholder
        { id: crypto.randomUUID(), url: "https://images.pexels.com/photos/3762875/pexels-photo-3762875.jpeg?auto=compress&w=1200", name: `${productName} hero shot.jpg` },
        { id: crypto.randomUUID(), url: "https://images.pexels.com/photos/4938332/pexels-photo-4938332.jpeg?auto=compress&w=1200", name: `${productName} lifestyle.jpg` },
        { id: crypto.randomUUID(), url: "https://images.pexels.com/photos/3762871/pexels-photo-3762871.jpeg?auto=compress&w=1200", name: `${productName} routine.jpg` },
      ],
      hero_scripts: [],
      ugc_scripts: [],
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function upsertMarketingDashboard(clientId, productId, productName) {
  const slug = `${DEMO_SLUG_PREFIX}-${productName.toLowerCase().replace(/\s+/g, "-")}-meta`;
  const csv = buildMetaAdsCsv();
  const payload = {
    slug,
    client_id: clientId,
    product_id: productId,
    client_name: DEMO_CLIENT_NAME,
    title: `${productName} Meta Ads`,
    description: "Demo dataset showing 7 weeks of Meta Ads performance.",
    file_name: `${productName.toLowerCase()}-meta-ads.csv`,
    headers: csv.headers,
    rows: csv.rows,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("marketing_dashboards")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data;
}

export async function POST(req) { return seed(); }
export async function GET(req)  { return seed(); }

async function seed() {
  try {
    const clientId = await upsertClient();
    await upsertBrandIntake(clientId);

    const products = [
      {
        name: "Glow Serum",
        description: "Niacinamide + tranexamic acid serum for an even, lit-from-within tone.",
        problems_solved: "Dullness, uneven tone, post-acne pigmentation.",
        features: ["10% niacinamide", "tranexamic acid", "fragrance-free", "patch-tested"],
      },
      {
        name: "Renewal Cream",
        description: "Overnight bakuchiol cream that smooths and firms without retinol irritation.",
        problems_solved: "Fine lines, sensitivity from retinol, dry winter skin.",
        features: ["bakuchiol 1%", "ceramide complex", "non-comedogenic"],
      },
      {
        name: "Active Sunscreen",
        description: "Lightweight SPF 50 mineral sunscreen with no white cast.",
        problems_solved: "White cast on darker skin, greasy SPF, photoaging.",
        features: ["SPF 50", "mineral filters", "no white cast", "reef-safe"],
      },
    ];

    const created = [];
    for (const p of products) {
      const productId = await upsertProduct(clientId, p.name, p.description, p.problems_solved, p.features);
      const portalId = await upsertPortalProject(clientId, productId, p.name);
      const dashboard = await upsertMarketingDashboard(clientId, productId, p.name);
      created.push({ product: p.name, productId, portalId, dashboardSlug: dashboard.slug });
    }

    const teamSlug = DEMO_CLIENT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return Response.json({
      ok: true,
      message: "Demo client seeded. Visit the team workspace below to explore.",
      clientId,
      clientName: DEMO_CLIENT_NAME,
      teamUrl: `/team/${teamSlug}`,
      clientUrl: `/client/${teamSlug}`,
      products: created,
    });
  } catch (e) {
    console.error("[seed-demo]", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
