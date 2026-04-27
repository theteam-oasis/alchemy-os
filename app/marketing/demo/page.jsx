"use client";
import { useState, useEffect } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import { Sparkles } from "lucide-react";
import { generateDemoMarketingData } from "@/lib/demo-marketing-data";

function generateDummyData() {
  return {
    ...generateDemoMarketingData(),
    fileName: "Meta Ads - Q1 2026.csv",
    title: "Meta Ads. Q1 2026 Performance",
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
  // Synchronous initializer. dashboard mounts instantly, AI prefetch starts first paint
  const [data] = useState(() => generateDummyData());

  return (
    <MarketingDashboardView
      data={data}
      headerBadge={<>{metaBadge}{demoBadge}</>}
    />
  );
}
