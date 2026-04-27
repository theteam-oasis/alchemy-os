// Shared demo dataset used by /marketing/demo and as the empty-state fallback
// for any dashboard that hasn't had real data uploaded yet.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoMarketingData() {
  const rand = mulberry32(42);
  const adSets = [
    { name: "UGC Testimonials - Lookalike 1%", boost: 1.4, product: "Glow Serum", assetType: "UGC", hook: "Testimonial" },
    { name: "Studio Shots - Broad", boost: 1.0, product: "Glow Serum", assetType: "Image", hook: "Product Demo" },
    { name: "Founder Story - Interest Based", boost: 1.2, product: "Active Sunscreen", assetType: "Video", hook: "Founder Story" },
    { name: "Product Demo - Retargeting 180d", boost: 1.8, product: "Active Sunscreen", assetType: "Video", hook: "Product Demo" },
    { name: "Holiday Promo - Cart Abandon", boost: 2.1, product: "Renewal Cream", assetType: "Carousel", hook: "Promo / Discount" },
    { name: "Before & After - Lookalike 3%", boost: 1.5, product: "Renewal Cream", assetType: "Video", hook: "Before / After" },
  ];
  const placements = ["Feed", "Reels", "Stories", "Advantage+"];
  const rows = [];

  const startDate = new Date("2026-02-01");
  for (let day = 0; day < 60; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];

    const active = adSets.slice(0, 3 + (day % 3));
    active.forEach((adSet, ci) => {
      const placement = placements[(day + ci) % placements.length];
      const growth = 1 + day * 0.008;
      const noise = 0.7 + rand() * 0.6;
      const placementBoost = placement === "Reels" ? 1.3 : placement === "Advantage+" ? 1.15 : 1;
      const assetBoost = adSet.assetType === "Video" ? 1.18 : adSet.assetType === "UGC" ? 1.12 : adSet.assetType === "Carousel" ? 1.05 : 1;
      const mult = growth * noise * adSet.boost * placementBoost * assetBoost;

      const impressions = Math.round(45000 * mult);
      const clicks = Math.round(impressions * (0.018 + rand() * 0.022));
      const ctr = ((clicks / impressions) * 100).toFixed(2);
      const spend = Math.round(clicks * (0.55 + rand() * 0.35));
      const conversions = Math.round(clicks * (0.032 + rand() * 0.028));
      const revenue = Math.round(conversions * (92 + rand() * 45));
      const cpa = (spend / Math.max(conversions, 1)).toFixed(2);
      const roas = (revenue / Math.max(spend, 1)).toFixed(2);
      const cpm = ((spend / impressions) * 1000).toFixed(2);

      rows.push([
        dateStr, adSet.product, adSet.assetType, adSet.hook, adSet.name, placement,
        impressions, clicks, ctr, cpm, spend, conversions, revenue, cpa, roas,
      ]);
    });
  }

  return {
    headers: [
      "Date", "Product", "Asset Type", "Hook", "Ad Set", "Placement",
      "Impressions", "Clicks", "CTR", "CPM", "Spend", "Conversions", "Revenue", "CPA", "ROAS",
    ],
    rows,
    fileName: "Example Data",
  };
}
