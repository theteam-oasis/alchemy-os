"use client";
import { useState } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import { Sparkles, Hash } from "lucide-react";

// Deterministic pseudo-random
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateOrganicData() {
  const rand = mulberry32(73);

  // Platform-specific posting cadence + performance baselines
  const platforms = [
    {
      name: "Instagram",
      cadence: { Reel: 3, Post: 2, Carousel: 1, Story: 5 }, // posts/week
      reach: { Reel: [50000, 220000], Post: [12000, 45000], Carousel: [18000, 60000], Story: [4000, 18000] },
      erMul: { Reel: 1.5, Post: 1.0, Carousel: 1.3, Story: 0.4 },
    },
    {
      name: "TikTok",
      cadence: { Video: 4 },
      reach: { Video: [30000, 600000] },
      erMul: { Video: 2.0 },
    },
    {
      name: "LinkedIn",
      cadence: { Post: 2, Carousel: 1, Video: 1 },
      reach: { Post: [4000, 22000], Carousel: [6000, 30000], Video: [8000, 35000] },
      erMul: { Post: 1.0, Carousel: 1.2, Video: 1.4 },
    },
    {
      name: "X",
      cadence: { Post: 5, Thread: 1 },
      reach: { Post: [3000, 80000], Thread: [10000, 250000] },
      erMul: { Post: 0.5, Thread: 0.9 },
    },
  ];

  const rows = [];
  const startDate = new Date("2026-02-01");
  const totalDays = 90;

  for (let day = 0; day < totalDays; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];

    // Account growth context (smooth growth curve)
    const dayGrowth = 1 + day * 0.005;

    platforms.forEach((p) => {
      // Decide which post types fire today based on cadence (cadence per WEEK → probability per day)
      Object.entries(p.cadence).forEach(([type, perWeek]) => {
        const dailyProb = perWeek / 7;
        if (rand() > dailyProb) return; // skip today for this combo

        const [minReach, maxReach] = p.reach[type];
        const noise = 0.6 + rand() * 0.8; // 0.6 - 1.4
        // Occasional viral spike (~5% chance) doubles or triples reach
        const viral = rand() < 0.05 ? 2 + rand() * 2 : 1;

        const reach = Math.round(((minReach + (maxReach - minReach) * rand()) * dayGrowth * noise * viral));
        const impressions = Math.round(reach * (1.15 + rand() * 0.25)); // impressions usually 15-40% > reach

        const baseER = (3 + rand() * 5) * p.erMul[type]; // 3-8% base * type multiplier
        const engagementRate = Math.min(35, baseER * (viral > 1 ? 1.2 : 1));
        const totalEngagements = Math.round(reach * (engagementRate / 100));

        // Distribute engagements: likes 70%, comments 8%, shares 12%, saves 10%
        const likes = Math.round(totalEngagements * (0.65 + rand() * 0.15));
        const comments = Math.round(totalEngagements * (0.05 + rand() * 0.06));
        const shares = Math.round(totalEngagements * (0.08 + rand() * 0.08));
        const saves = Math.max(0, totalEngagements - likes - comments - shares);

        const profileVisits = Math.round(reach * (0.012 + rand() * 0.02));
        const followersGained = Math.max(0, Math.round(profileVisits * (0.05 + rand() * 0.08)));
        const linkClicks = Math.round(reach * (0.004 + rand() * 0.01));

        rows.push([
          dateStr,
          p.name,
          type,
          reach,
          impressions,
          likes,
          comments,
          shares,
          saves,
          engagementRate.toFixed(2),
          profileVisits,
          followersGained,
          linkClicks,
        ]);
      });
    });
  }

  return {
    headers: [
      "Date",
      "Platform",
      "Content Type",
      "Reach",
      "Impressions",
      "Likes",
      "Comments",
      "Shares",
      "Saves",
      "Engagement Rate",
      "Profile Visits",
      "Followers Gained",
      "Link Clicks",
    ],
    rows,
    fileName: "Organic Social - Q1 2026.csv",
    title: "Organic Social. Q1 2026 Performance",
    clientName: "Demo Client",
  };
}

const organicBadge = (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "#10B98115",
    fontSize: 11, fontWeight: 600, color: "#059669",
    letterSpacing: "0.05em", textTransform: "uppercase",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }}>
    <Hash size={11} strokeWidth={2.4} />
    Organic
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

export default function MarketingDemoOrganic() {
  const [data] = useState(() => generateOrganicData());

  return (
    <MarketingDashboardView
      data={data}
      headerBadge={<>{organicBadge}{demoBadge}</>}
    />
  );
}
