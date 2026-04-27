"use client";
import { useState, useEffect } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import { Sparkles } from "lucide-react";

// Deterministic pseudo-random so SSR and client match
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDummyData() {
  const rand = mulberry32(42);
  // Multi-product dataset: each ad set tied to a product + creative format + hook angle
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
    fileName: "Meta Ads - Q1 2026.csv",
    title: "Meta Ads — Q1 2026 Performance",
    clientName: "Demo Client",
  };
}

const metaBadge = (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "#1877F215",
    fontSize: 11, fontWeight: 600, color: "#1877F2",
    letterSpacing: "0.05em", textTransform: "uppercase",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
    Meta
  </div>
);

const demoBadge = (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "linear-gradient(90deg, #00000008, #00000015, #00000008)",
    backgroundSize: "200% 100%",
    animation: "shimmer 3s linear infinite",
    fontSize: 11, fontWeight: 600, color: "#86868B",
    letterSpacing: "0.05em", textTransform: "uppercase",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }}>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <Sparkles size={11} strokeWidth={2} /> Demo
  </div>
);

export default function MarketingDemo() {
  // Synchronous initializer — dashboard mounts instantly, AI prefetch starts first paint
  const [data] = useState(() => generateDummyData());

  return (
    <MarketingDashboardView
      data={data}
      headerBadge={<>{metaBadge}{demoBadge}</>}
    />
  );
}
