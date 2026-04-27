"use client";
import { useState, useEffect, useRef } from "react";
import {
  Upload, FileSpreadsheet, DollarSign,
  BarChart3, Activity, Users, Eye, MousePointerClick,
  Target, Zap, ArrowUpRight, ArrowDownRight,
  LayoutDashboard, Filter, Sparkles,
  X, Send, Loader2, Lock, PanelRightClose, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  card: "#FFFFFF", cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  accent: "#000000", accentSoft: "#00000010",
  success: "#34C759", warning: "#FF9500", danger: "#FF3B30", info: "#007AFF",
};

// iOS system colors — same palette as the metric badges (clean, modern, airy)
const CHART_COLORS = [
  "#34C759", // green
  "#FF3B30", // red
  "#007AFF", // blue
  "#FF9500", // orange
  "#AF52DE", // pink
  "#5856D6", // purple
  "#00C7BE", // teal
  "#FFCC00", // yellow
];

// Airy 3-stop gradients matching the iOS badge aesthetic — light → signature → signature
const CHART_GRADIENTS = [
  ["#A7F3D0", "#34C759", "#30D158"], // mint → iOS green
  ["#FFB5B0", "#FF3B30", "#FF453A"], // coral → iOS red
  ["#BAE6FD", "#007AFF", "#0A84FF"], // sky → iOS blue
  ["#FFD494", "#FF9500", "#FF9F0A"], // amber → iOS orange
  ["#E4B4F5", "#AF52DE", "#BF5AF2"], // lavender pink → iOS pink
  ["#A5A3F3", "#5856D6", "#7D7AFF"], // lavender → iOS purple
  ["#7FECE5", "#00C7BE", "#66D4CF"], // aqua → iOS teal
  ["#FFE98B", "#FFCC00", "#FFD60A"], // pale yellow → iOS yellow
];

const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const body = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

// Animated starfield sprinkled across the mobile Oracle button — gold/blue/pink/white particles
const STAR_COLORS = [
  { c: "#FCD34D", glow: "rgba(252,211,77,0.9)" },   // gold
  { c: "#93C5FD", glow: "rgba(147,197,253,0.9)" },  // sky blue
  { c: "#FBCFE8", glow: "rgba(251,207,232,0.9)" },  // pink
  { c: "#FFFFFF", glow: "rgba(255,255,255,0.9)" },  // white
  { c: "#C4B5FD", glow: "rgba(196,181,253,0.9)" },  // lavender
  { c: "#86EFAC", glow: "rgba(134,239,172,0.9)" },  // mint
];
const ORACLE_STARS = Array.from({ length: 36 }, (_, i) => {
  const palette = STAR_COLORS[i % STAR_COLORS.length];
  // Spread evenly across the button using a pseudo-random sequence
  const x = ((i * 23) % 96) + 2;
  const y = ((i * 41) % 84) + 8;
  return {
    x, y,
    size: 8 + (i % 5) * 2, // 8, 10, 12, 14, 16px — noticeably bigger
    color: palette.c,
    glow: palette.glow,
    duration: 1.8 + ((i * 0.19) % 2.6), // 1.8–4.4s
    delay: (i * 0.17) % 4,
    variant: (i % 3) + 1,
  };
});


// ── Helpers ──

function isLikelyDate(v) {
  if (!v || !isNaN(Number(v))) return false;
  const d = Date.parse(v);
  if (isNaN(d)) return false;
  return /[-\/]/.test(v) || /[a-zA-Z]/.test(v);
}

export function detectColumnTypes(headers, rows) {
  const types = {};
  headers.forEach((h, i) => {
    const samples = rows.slice(0, 50).map(r => r[i]).filter(Boolean);
    const numCount = samples.filter(v => !isNaN(parseFloat(String(v).replace(/[$,%]/g, "")))).length;
    const dateCount = samples.filter(v => isLikelyDate(v)).length;
    if (dateCount > samples.length * 0.6) types[h] = "date";
    else if (numCount > samples.length * 0.6) types[h] = "number";
    else types[h] = "category";
  });
  return types;
}

function parseNum(v) {
  if (v == null || v === "") return 0;
  return parseFloat(String(v).replace(/[$,%]/g, "")) || 0;
}

function fmt(n, prefix = "") {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return prefix + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return prefix + (n / 1e3).toFixed(1) + "K";
  if (n % 1 !== 0) return prefix + n.toFixed(2);
  return prefix + n.toLocaleString();
}

function guessMetricIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("spend") || n.includes("cost") || n.includes("revenue") || n.includes("budget") || n.includes("roas") || n.includes("cpa") || n.includes("cpc") || n.includes("cpm")) return DollarSign;
  if (n.includes("click") || n.includes("ctr")) return MousePointerClick;
  if (n.includes("impression") || n.includes("reach") || n.includes("view")) return Eye;
  if (n.includes("conversion") || n.includes("purchase") || n.includes("sale")) return Target;
  if (n.includes("user") || n.includes("audience") || n.includes("follower")) return Users;
  if (n.includes("engagement") || n.includes("like") || n.includes("share")) return Zap;
  return Activity;
}

function guessPrefix(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("spend") || n.includes("cost") || n.includes("revenue") || n.includes("budget") || n.includes("cpa") || n.includes("cpc") || n.includes("cpm")) return "$";
  return "";
}

function guessSuffix(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("rate") || n.includes("ctr") || n.includes("percent")) return "%";
  if (n.includes("roas")) return "x";
  return "";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
      border: `1px solid ${C.borderLight}`, borderRadius: 12,
      padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      ...body, fontSize: 13
    }}>
      <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
          <span style={{ color: C.textSec }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: C.text }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, prefix, suffix, delay, active = true, onToggle }) {
  const isPositive = change > 0;
  const clickable = typeof onToggle === "function";
  const showChange = change != null && !isNaN(change) && Math.abs(change) >= 0.5;
  return (
    <div
      onClick={clickable ? onToggle : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } } : undefined}
      style={{
        background: C.card, borderRadius: 14,
        boxShadow: active ? C.cardShadow : "none",
        padding: "12px 16px",
        flex: "1 1 220px", minWidth: 200,
        border: `1px solid ${active ? "transparent" : C.borderLight}`,
        opacity: active ? 1 : 0.6,
        cursor: clickable ? "pointer" : "default",
        animation: `fadeSlideUp 0.5s ease ${delay || 0}s both`,
        transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s, border-color 0.2s",
        position: "relative",
        display: "flex", alignItems: "center", gap: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = active
          ? "0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)"
          : "0 2px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = active ? C.cardShadow : "none";
      }}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: active ? C.bgSoft : "transparent",
        border: active ? "none" : `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.6)" : "none",
      }}>
        <Icon size={17} color={active ? C.text : C.textTer} strokeWidth={1.7} />
      </div>

      {/* Value + label stack — full value always visible */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: active ? C.text : C.textSec,
          ...body, letterSpacing: "-0.02em",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          {prefix}{typeof value === "number" ? fmt(value) : value}{suffix}
        </div>
        <div style={{
          fontSize: 11, color: C.textSec, fontWeight: 500, ...body,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}>{label}</div>
      </div>

      {/* Change badge on the right */}
      {showChange && (
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          fontSize: 11, fontWeight: 600, ...body,
          color: isPositive ? C.success : C.danger,
          background: isPositive ? "#34C75915" : "#FF3B3015",
          padding: "3px 7px", borderRadius: 16,
          flexShrink: 0,
          opacity: active ? 1 : 0.5,
        }}>
          {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function MetricToggleBar({ metrics, selected, onChange }) {
  return (
    <div style={{
      marginTop: 18, paddingTop: 16,
      borderTop: `1px solid ${C.borderLight}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        fontSize: 11, fontWeight: 600, color: C.textSec, ...body,
        letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        <span>Metrics shown</span>
        <span style={{
          padding: "2px 7px", borderRadius: 20,
          background: C.bgSoft, fontSize: 10, fontWeight: 700,
          letterSpacing: 0, textTransform: "none", color: C.text,
        }}>{selected.length}/{metrics.length}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {metrics.map((m, i) => {
          const active = selected.includes(m);
          const activeIdx = selected.indexOf(m);
          const g = CHART_GRADIENTS[(activeIdx >= 0 ? activeIdx : i) % CHART_GRADIENTS.length];
          return (
            <button
              key={m}
              onClick={(e) => {
                e.stopPropagation();
                onChange(active ? selected.filter(x => x !== m) : [...selected, m]);
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "6px 12px", borderRadius: 20,
                border: `1px solid ${active ? C.accent : C.borderLight}`,
                background: active ? C.accent : C.bg,
                color: active ? "#fff" : C.textSec,
                fontSize: 12, fontWeight: 500, ...body,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                if (!active) { e.currentTarget.style.borderColor = C.text; e.currentTarget.style.color = C.text; }
              }}
              onMouseLeave={e => {
                if (!active) { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textSec; }
              }}
            >
              {active && (
                <span style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: `linear-gradient(135deg, ${g[0]}, ${g[1]}, ${g[2]})`,
                  display: "inline-block",
                  boxShadow: `0 0 6px ${g[1]}99`,
                }} />
              )}
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ title, children, span, delay, subtitle, mounted, height = 300, tight }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, boxShadow: C.cardShadow,
      padding: tight ? "20px 8px 18px" : "24px",
      gridColumn: span ? `span ${span}` : undefined,
      animation: `fadeSlideUp 0.6s ease ${delay || 0}s both`,
    }}>
      <div style={{ marginBottom: 18, padding: tight ? "0 12px" : 0 }}>
        <h3 style={{ ...body, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</h3>
        {subtitle && <div style={{ ...body, fontSize: 12, color: C.textSec, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {mounted ? children : <div style={{ height, background: C.bgSoft, borderRadius: 8, opacity: 0.4 }} />}
    </div>
  );
}

function DataTable({ headers, rows, numericCols }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const perPage = 15;

  const sorted = [...rows];
  if (sortCol != null) {
    sorted.sort((a, b) => {
      const av = numericCols.has(headers[sortCol]) ? parseNum(a[sortCol]) : (a[sortCol] || "");
      const bv = numericCols.has(headers[sortCol]) ? parseNum(b[sortCol]) : (b[sortCol] || "");
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }

  const paginated = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  return (
    <div style={{ background: C.card, borderRadius: 16, boxShadow: C.cardShadow, overflow: "hidden", animation: "fadeSlideUp 0.6s ease 0.3s both" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...body, fontSize: 13 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} onClick={() => { setSortCol(i); setSortDir(sortCol === i && sortDir === "desc" ? "asc" : "desc"); setPage(0); }}
                  style={{
                    padding: "14px 16px", textAlign: "left", fontWeight: 600,
                    color: C.textSec, borderBottom: `1px solid ${C.borderLight}`,
                    cursor: "pointer", whiteSpace: "nowrap", fontSize: 12,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    background: sortCol === i ? C.bgSoft : "transparent",
                  }}>
                  {h} {sortCol === i && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, ri) => (
              <tr key={ri} style={{ transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`,
                    color: C.text, whiteSpace: "nowrap",
                    fontVariantNumeric: numericCols.has(headers[ci]) ? "tabular-nums" : undefined,
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${C.borderLight}` }}>
          <span style={{ fontSize: 13, color: C.textSec, ...body }}>{sorted.length} rows</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.bg, color: C.text, fontSize: 13, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1, ...body }}>
              Prev
            </button>
            <span style={{ fontSize: 13, color: C.textSec, display: "flex", alignItems: "center", ...body }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.bg, color: C.text, fontSize: 13, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, ...body }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Oracle Chat ──

function buildRichContext({ data, types, stats, overallRoas, totalRevenue, totalSpend, categoryCol, dateCol, chartData, categoryData, selectedMetrics }) {
  const lines = [];
  lines.push(`=== DATASET ===`);
  lines.push(`File: ${data.fileName}`);
  if (data.clientName) lines.push(`Client: ${data.clientName}`);
  lines.push(`${data.rows.length} rows, ${data.headers.length} columns`);
  lines.push(`Columns: ${data.headers.join(", ")}`);

  if (dateCol && chartData?.length) {
    const first = chartData[0]._name;
    const last = chartData[chartData.length - 1]._name;
    lines.push(`Date range: ${first} → ${last} (${chartData.length} distinct dates)`);
  }

  // Headline totals
  lines.push("");
  lines.push(`=== HEADLINE TOTALS ===`);
  if (totalSpend) lines.push(`Total Spend: $${Math.round(totalSpend).toLocaleString()}`);
  if (totalRevenue) lines.push(`Total Revenue: $${Math.round(totalRevenue).toLocaleString()}`);
  if (overallRoas) lines.push(`Overall ROAS: ${overallRoas}x`);

  // Per-metric stats with first-half vs second-half trend
  if (stats?.length) {
    lines.push("");
    lines.push(`=== METRIC TRENDS (first half of period vs second half) ===`);
    stats.forEach(s => {
      const direction = s.change >= 0 ? "up" : "down";
      lines.push(`${s.name}: total ${s.prefix}${Math.round(s.total).toLocaleString()}${s.suffix}, trend ${direction} ${Math.abs(s.change).toFixed(1)}% (H1 vs H2)`);
    });
  }

  // Deep category breakdown — top and bottom performers
  if (categoryCol && categoryData?.length) {
    const ci = data.headers.indexOf(categoryCol);
    const spendIdx = data.headers.indexOf("Spend");
    const revIdx = data.headers.indexOf("Revenue");
    const convIdx = data.headers.indexOf("Conversions");
    const impIdx = data.headers.indexOf("Impressions");
    const clickIdx = data.headers.indexOf("Clicks");

    const grouped = {};
    data.rows.forEach(r => {
      const k = r[ci] || "Other";
      if (!grouped[k]) grouped[k] = { spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, count: 0 };
      if (spendIdx >= 0) grouped[k].spend += parseNum(r[spendIdx]);
      if (revIdx >= 0) grouped[k].revenue += parseNum(r[revIdx]);
      if (convIdx >= 0) grouped[k].conversions += parseNum(r[convIdx]);
      if (impIdx >= 0) grouped[k].impressions += parseNum(r[impIdx]);
      if (clickIdx >= 0) grouped[k].clicks += parseNum(r[clickIdx]);
      grouped[k].count += 1;
    });

    const entries = Object.entries(grouped).map(([name, m]) => ({
      name,
      ...m,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
      cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      spendShare: totalSpend > 0 ? (m.spend / totalSpend) * 100 : 0,
      revenueShare: totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0,
    }));

    lines.push("");
    lines.push(`=== FULL BREAKDOWN BY ${categoryCol.toUpperCase()} ===`);
    entries.sort((a, b) => b.revenue - a.revenue).forEach(e => {
      const parts = [];
      if (e.spend) parts.push(`spend $${Math.round(e.spend).toLocaleString()} (${e.spendShare.toFixed(0)}% of total)`);
      if (e.revenue) parts.push(`revenue $${Math.round(e.revenue).toLocaleString()} (${e.revenueShare.toFixed(0)}% of total)`);
      if (e.roas) parts.push(`ROAS ${e.roas.toFixed(2)}x`);
      if (e.cpa) parts.push(`CPA $${e.cpa.toFixed(0)}`);
      if (e.ctr) parts.push(`CTR ${e.ctr.toFixed(2)}%`);
      if (e.conversions) parts.push(`${e.conversions} conv`);
      lines.push(`• ${e.name}: ${parts.join(", ")}`);
    });

    // Highlight best/worst
    if (entries.length >= 2) {
      const byRoas = [...entries].filter(e => e.roas > 0).sort((a, b) => b.roas - a.roas);
      const byCpa = [...entries].filter(e => e.cpa > 0).sort((a, b) => b.cpa - a.cpa);
      lines.push("");
      lines.push(`=== EFFICIENCY LEADERBOARD (${categoryCol}) ===`);
      if (byRoas.length) {
        lines.push(`Best ROAS: ${byRoas[0].name} (${byRoas[0].roas.toFixed(2)}x)`);
        lines.push(`Worst ROAS: ${byRoas[byRoas.length - 1].name} (${byRoas[byRoas.length - 1].roas.toFixed(2)}x)`);
      }
      if (byCpa.length) {
        lines.push(`Highest CPA (worst): ${byCpa[0].name} ($${byCpa[0].cpa.toFixed(0)})`);
        lines.push(`Lowest CPA (best): ${byCpa[byCpa.length - 1].name} ($${byCpa[byCpa.length - 1].cpa.toFixed(0)})`);
      }
    }
  }

  // Look for ALL category-type columns (e.g. Placement in addition to Ad Set)
  const categoryHeaders = data.headers.filter(h => types?.[h] === "category" && h !== categoryCol);
  categoryHeaders.forEach(otherCat => {
    const ci = data.headers.indexOf(otherCat);
    const spendIdx = data.headers.indexOf("Spend");
    const revIdx = data.headers.indexOf("Revenue");
    const grouped = {};
    data.rows.forEach(r => {
      const k = r[ci] || "Other";
      if (!grouped[k]) grouped[k] = { spend: 0, revenue: 0 };
      if (spendIdx >= 0) grouped[k].spend += parseNum(r[spendIdx]);
      if (revIdx >= 0) grouped[k].revenue += parseNum(r[revIdx]);
    });
    lines.push("");
    lines.push(`=== BY ${otherCat.toUpperCase()} ===`);
    Object.entries(grouped).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([name, m]) => {
      const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "—";
      const spendShare = totalSpend > 0 ? ((m.spend / totalSpend) * 100).toFixed(0) : "0";
      const revShare = totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(0) : "0";
      lines.push(`• ${name}: spend $${Math.round(m.spend).toLocaleString()} (${spendShare}%), revenue $${Math.round(m.revenue).toLocaleString()} (${revShare}%), ROAS ${roas}x`);
    });
  });

  // Time-series trend snapshot: first week vs last week
  if (chartData?.length >= 14 && dateCol) {
    const firstWeek = chartData.slice(0, 7);
    const lastWeek = chartData.slice(-7);
    const sumWeek = (arr, metric) => arr.reduce((s, d) => s + (d[metric] || 0), 0);
    const weekMetrics = selectedMetrics.slice(0, 5);
    lines.push("");
    lines.push(`=== WEEK-OVER-WEEK (first 7 days vs last 7 days) ===`);
    weekMetrics.forEach(m => {
      const fw = sumWeek(firstWeek, m);
      const lw = sumWeek(lastWeek, m);
      const delta = fw > 0 ? ((lw - fw) / fw) * 100 : 0;
      lines.push(`${m}: ${Math.round(fw).toLocaleString()} → ${Math.round(lw).toLocaleString()} (${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%)`);
    });
  }

  return lines.join("\n");
}

function buildDataContext(data, stats, overallRoas, totalRevenue, totalSpend, categoryCol) {
  const lines = [];
  lines.push(`DATASET: ${data.fileName}`);
  if (data.clientName) lines.push(`Client: ${data.clientName}`);
  lines.push(`Total rows: ${data.rows.length}`);
  lines.push(`Columns: ${data.headers.join(", ")}`);
  lines.push("");

  const dateCols = data.headers.filter(h => data.types?.[h] === "date");
  if (dateCols.length && data.rows.length) {
    const di = data.headers.indexOf(dateCols[0]);
    const dates = data.rows.map(r => r[di]).filter(Boolean);
    if (dates.length) lines.push(`Date range: ${dates[0]} to ${dates[dates.length-1]}`);
  }

  lines.push("");
  lines.push(`HEADLINE METRICS:`);
  if (totalSpend) lines.push(`- Total Spend: $${totalSpend.toLocaleString()}`);
  if (totalRevenue) lines.push(`- Total Revenue: $${totalRevenue.toLocaleString()}`);
  if (overallRoas) lines.push(`- Overall ROAS: ${overallRoas}x`);
  stats.forEach(s => {
    lines.push(`- Total ${s.name}: ${s.prefix}${Math.round(s.total).toLocaleString()}${s.suffix} (trend ${s.change >= 0 ? "+" : ""}${s.change.toFixed(1)}% first half vs second half)`);
  });

  // Breakdown by category column
  if (categoryCol && data.headers.includes(categoryCol)) {
    const ci = data.headers.indexOf(categoryCol);
    const spendIdx = data.headers.indexOf("Spend");
    const revIdx = data.headers.indexOf("Revenue");
    const convIdx = data.headers.indexOf("Conversions");
    const grouped = {};
    data.rows.forEach(r => {
      const k = r[ci] || "Other";
      if (!grouped[k]) grouped[k] = { spend: 0, revenue: 0, conversions: 0 };
      if (spendIdx >= 0) grouped[k].spend += parseNum(r[spendIdx]);
      if (revIdx >= 0) grouped[k].revenue += parseNum(r[revIdx]);
      if (convIdx >= 0) grouped[k].conversions += parseNum(r[convIdx]);
    });
    lines.push("");
    lines.push(`BY ${categoryCol.toUpperCase()}:`);
    Object.entries(grouped).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([name, m]) => {
      const parts = [];
      if (m.spend) parts.push(`spend $${Math.round(m.spend).toLocaleString()}`);
      if (m.revenue) parts.push(`revenue $${Math.round(m.revenue).toLocaleString()}`);
      if (m.spend > 0 && m.revenue > 0) parts.push(`ROAS ${(m.revenue / m.spend).toFixed(2)}x`);
      if (m.conversions) parts.push(`conversions ${m.conversions}`);
      lines.push(`- ${name}: ${parts.join(", ")}`);
    });
  }

  return lines.join("\n");
}

function formatMessage(text) {
  const parts = (text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 600, color: C.text }}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

function OracleDock({ expanded, onToggle, onCloseSheet, data, stats, overallRoas, totalRevenue, totalSpend, categoryCol, fullHeight }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const handler = (e) => {
      const q = e?.detail;
      if (q && typeof q === "string") send(`Tell me more about: ${q}`);
    };
    window.addEventListener("oracle:ask", handler);
    return () => window.removeEventListener("oracle:ask", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    const newHistory = [...messages, { role: "user", content: question }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const context = buildDataContext(data, stats, overallRoas, totalRevenue, totalSpend, categoryCol);
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dataContext: context, history: messages }),
      });
      const json = await res.json();
      if (json.error) {
        setMessages([...newHistory, { role: "assistant", content: `Sorry — ${json.error}` }]);
      } else {
        setMessages([...newHistory, { role: "assistant", content: json.answer }]);
      }
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Sorry, I couldn't reach the server. Try again in a moment." }]);
    }
    setLoading(false);
  };

  const hasMessages = messages.length > 0 || loading;
  const chipSuggestions = [
    "What's my best ad set?",
    "Where should I cut spend?",
    "What's trending up?",
  ];

  return (
    <div style={{
      borderTop: `1px solid ${C.borderLight}`,
      background: C.bg,
      display: "flex", flexDirection: "column",
      ...(fullHeight ? { flex: 1, minHeight: 0 } : { height: expanded ? 320 : "auto", flexShrink: 0 }),
      transition: fullHeight ? "none" : "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      overflow: "hidden",
    }}>
      {/* Back-to-insights bar at the top when chat is full-height */}
      {fullHeight && (
        <button onClick={onToggle}
          style={{
            padding: "12px 16px",
            border: "none", background: C.bg,
            borderBottom: `1px solid ${C.borderLight}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            ...body, fontSize: 13, fontWeight: 600, color: C.text,
          }}
          aria-label="Back to insights"
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
          <span>Back to insights</span>
        </button>
      )}
      {/* Messages area — only when expanded */}
      {expanded && (
        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", padding: "12px",
          display: "flex", flexDirection: "column", gap: 8,
          background: C.bgSoft,
          minHeight: 0,
        }}>
          {messages.length === 0 && !loading && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px 12px",
              fontSize: 14, color: C.textSec, ...body, textAlign: "center",
              lineHeight: 1.5,
            }}>
              Ask me anything about your data.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              animation: "fadeSlideUp 0.3s ease both",
            }}>
              <div style={{
                padding: "7px 11px", borderRadius: 11,
                background: m.role === "user" ? C.accent : C.bg,
                color: m.role === "user" ? "#fff" : C.text,
                ...body, fontSize: 12, lineHeight: 1.5,
                boxShadow: m.role === "assistant" ? C.cardShadow : "none",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {formatMessage(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <div style={{
                padding: "9px 11px", borderRadius: 11, background: C.bg,
                boxShadow: C.cardShadow, display: "flex", alignItems: "center", gap: 3,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: 3, background: C.textTer,
                    animation: `typing 1.4s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestion chips — shown above the input when chat is empty and expanded */}
      {expanded && messages.length === 0 && !loading && (
        <div style={{
          padding: "12px 14px 4px",
          display: "flex", flexWrap: "wrap", gap: 6,
          borderTop: `1px solid ${C.borderLight}`,
          background: C.bg,
        }}>
          {chipSuggestions.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{
                padding: "7px 12px", borderRadius: 18,
                border: `1px solid ${C.borderLight}`, background: C.bg,
                color: C.text, fontSize: 12.5, ...body, cursor: "pointer",
                transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.bg; }}
            >
              <Sparkles size={10} color={C.textSec} />{s}
            </button>
          ))}
        </div>
      )}

      {/* Input row — always visible, larger for easy typing */}
      <form
        onSubmit={e => { e.preventDefault(); send(); }}
        style={{
          padding: "14px 14px 16px",
          borderTop: (expanded && messages.length === 0 && !loading) ? "none" : (expanded ? `1px solid ${C.borderLight}` : "none"),
          background: C.bg,
          display: "flex", gap: 10, alignItems: "center",
        }}
      >
        {/* Back button — solid black, collapses chat when full-height, closes the sheet otherwise */}
        <button type="button"
          onClick={fullHeight ? onToggle : onCloseSheet}
          style={{
            width: 40, height: 40, borderRadius: 12,
            border: "none", background: C.accent,
            color: "#fff", cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#333"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.accent; }}
          aria-label={fullHeight ? "Back to insights" : "Back to dashboard"}
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask Oracle anything..."
          disabled={loading}
          onFocus={e => {
            e.target.style.borderColor = C.accent;
            e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)";
            if (!expanded) onToggle?.();
          }}
          onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
          style={{
            flex: 1, minWidth: 0,
            padding: "14px 16px", borderRadius: 14,
            border: `1px solid ${C.borderLight}`, background: C.bgSoft,
            ...body, fontSize: 17, color: C.text, outline: "none",
            height: 52,
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        />
        <button type="submit" disabled={loading || !input.trim()}
          style={{
            width: 48, height: 48, borderRadius: 14, border: "none",
            background: input.trim() && !loading ? C.accent : C.bgHover,
            color: input.trim() && !loading ? "#fff" : C.textTer,
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", flexShrink: 0,
          }}
          aria-label="Send"
        >{loading ? <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : <Send size={16} />}</button>
      </form>
      <style>{`@keyframes typing { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Oracle({ open, onToggle, data, stats, overallRoas, totalRevenue, totalSpend, categoryCol, insightsOpen }) {
  // When sidebar rail is collapsed, shift Oracle left so it doesn't overlap the 64px rail
  const rightPos = insightsOpen ? 444 : 88;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const q = e?.detail;
      if (q && typeof q === "string") send(`Tell me more about: ${q}`);
    };
    window.addEventListener("oracle:ask", handler);
    return () => window.removeEventListener("oracle:ask", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestions = [
    "What's driving my performance?",
    "Which segment is underperforming?",
    "Where should I shift budget?",
    "Summarize the top insights",
  ];

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    const newHistory = [...messages, { role: "user", content: question }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const context = buildDataContext(data, stats, overallRoas, totalRevenue, totalSpend, categoryCol);
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dataContext: context, history: messages }),
      });
      const json = await res.json();
      if (json.error) {
        setMessages([...newHistory, { role: "assistant", content: `Sorry — ${json.error}` }]);
      } else {
        setMessages([...newHistory, { role: "assistant", content: json.answer }]);
      }
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Sorry, I couldn't reach the server. Try again in a moment." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {!open && (
        <button onClick={onToggle}
          style={{
            position: "fixed", bottom: 24, right: rightPos, zIndex: 200,
            width: 60, height: 60, borderRadius: 30,
            background: "linear-gradient(135deg, #1D1D1F, #000)",
            border: "none", cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeSlideUp 0.4s ease 0.8s both",
            transition: "transform 0.2s, right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          aria-label="Open Oracle"
        >
          <div style={{
            position: "absolute", inset: 0, borderRadius: 30,
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent 60%)",
          }} />
          <Sparkles size={24} color="#fff" strokeWidth={1.5} />
          <div style={{
            position: "absolute", top: -4, right: -4,
            width: 14, height: 14, borderRadius: 7,
            background: C.success, border: "2px solid #fff",
            animation: "pulse 2s ease-in-out infinite",
          }} />
        </button>
      )}

      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: rightPos, zIndex: 200,
          width: 400, maxWidth: "calc(100vw - 32px)",
          height: 600, maxHeight: "calc(100vh - 48px)",
          background: C.bg, borderRadius: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column",
          animation: "oracleSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
          overflow: "hidden",
          transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <style>{`
            @keyframes oracleSlide { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
            @keyframes typing { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
          `}</style>

          <div style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.borderLight}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "linear-gradient(135deg, #000 0%, #1D1D1F 100%)", color: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={18} color="#fff" strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ ...hd, fontSize: 18, lineHeight: 1 }}>Oracle</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", ...body, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: C.success, display: "inline-block" }} />
                  AI Analyst · Online
                </div>
              </div>
            </div>
            <button onClick={onToggle} style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.1)", color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            ><X size={16} /></button>
          </div>

          <div ref={scrollRef} style={{
            flex: 1, overflowY: "auto", padding: "20px",
            display: "flex", flexDirection: "column", gap: 14,
            background: C.bgSoft,
          }}>
            {messages.length === 0 && (
              <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
                <div style={{
                  padding: "16px 18px", background: C.bg, borderRadius: 16,
                  boxShadow: C.cardShadow, ...body, fontSize: 14, color: C.text, lineHeight: 1.5,
                }}>
                  <div style={{ ...hd, fontSize: 20, marginBottom: 6 }}>Hi, I'm Oracle 👋</div>
                  I'm your AI marketing analyst. I've looked at your <strong>{data.rows.length}</strong> rows of {data.clientName ? data.clientName + "'s " : ""}data and I'm ready to answer questions about performance.
                </div>
                <div style={{ marginTop: 16, ...body, fontSize: 12, color: C.textSec, fontWeight: 500, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Try asking
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{
                      textAlign: "left", padding: "10px 14px", borderRadius: 12,
                      border: `1px solid ${C.borderLight}`, background: C.bg, color: C.text,
                      fontSize: 13, ...body, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.bg; }}
                    ><Sparkles size={12} color={C.textSec} />{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", animation: "fadeSlideUp 0.3s ease both" }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 16,
                  background: m.role === "user" ? C.accent : C.bg,
                  color: m.role === "user" ? "#fff" : C.text,
                  ...body, fontSize: 14, lineHeight: 1.55,
                  boxShadow: m.role === "assistant" ? C.cardShadow : "none",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {formatMessage(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                <div style={{ padding: "12px 14px", borderRadius: 16, background: C.bg, boxShadow: C.cardShadow, display: "flex", alignItems: "center", gap: 4 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: 3.5, background: C.textTer, animation: `typing 1.4s ease-in-out ${i * 0.15}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={e => { e.preventDefault(); send(); }} style={{
            padding: "14px 16px", borderTop: `1px solid ${C.borderLight}`,
            background: C.bg, display: "flex", gap: 8,
          }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask about your data..." disabled={loading}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                border: `1px solid ${C.borderLight}`, background: C.bgSoft,
                ...body, fontSize: 14, color: C.text, outline: "none",
              }}
              onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
              onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
            />
            <button type="submit" disabled={loading || !input.trim()}
              style={{
                width: 42, height: 42, borderRadius: 12, border: "none",
                background: input.trim() && !loading ? C.accent : C.bgHover,
                color: "#fff", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >{loading ? <Loader2 size={16} /> : <Send size={16} />}</button>
          </form>
          <div style={{
            padding: "0 16px 10px", fontSize: 10, color: C.textTer,
            textAlign: "center", ...body,
          }}>Oracle can make mistakes — verify important numbers in the dashboard.</div>
        </div>
      )}
    </>
  );
}

// ── Hero Summary (plain English health) ──

function HealthRing({ score, size = 56 }) {
  const radius = (size - 6) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#34C759" : pct >= 60 ? "#30B350" : pct >= 40 ? "#FF9500" : "#FF3B30";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={C.borderLight} strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 15, fontWeight: 700, color, ...body,
      }}>{Math.round(pct)}</div>
    </div>
  );
}

function HeroSummary({ summary, overallRoas, totalRevenue, totalSpend, loading, compact }) {
  const roasPerDollar = overallRoas ? `$${overallRoas}` : null;

  if (compact) {
    // Sidebar layout: tighter vertical stack (no health ring — keeps it clean)
    return (
      <div style={{
        marginBottom: 0,
        animation: "fadeSlideUp 0.5s ease 0.05s both",
        background: "linear-gradient(135deg, #FAFAFC 0%, #FFFFFF 100%)",
        border: `1px solid ${C.borderLight}`,
        borderRadius: 14,
        padding: "16px 18px",
        position: "relative",
      }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.textSec,
            letterSpacing: "0.12em", textTransform: "uppercase", ...body,
            marginBottom: 4,
          }}>At a Glance</div>
          {roasPerDollar && (
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#2BA94A", ...body,
              letterSpacing: "-0.01em",
            }}>
              ${overallRoas} per $1 spent
            </div>
          )}
        </div>
        {loading && !summary ? (
          <div style={{ fontSize: 13, color: C.textSec, ...body, lineHeight: 1.5 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: 5,
              border: `1.5px solid ${C.border}`, borderTopColor: C.accent,
              animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 6,
            }} />
            Analyzing data...
          </div>
        ) : summary?.text ? (
          <div style={{
            ...body, fontSize: 13.5, color: C.text, lineHeight: 1.5, fontWeight: 500,
          }}>
            {summary.text}
          </div>
        ) : (
          <div style={{ ...body, fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
            {roasPerDollar
              ? `You made $${overallRoas} for every $1 spent this period.`
              : `Here's your campaign performance.`}
          </div>
        )}
        {totalRevenue > 0 && totalSpend > 0 && (
          <div style={{
            fontSize: 11.5, color: C.textSec, ...body, marginTop: 10,
            paddingTop: 10, borderTop: `1px solid ${C.borderLight}`,
            display: "flex", justifyContent: "space-between", gap: 8,
          }}>
            <span>Revenue <strong style={{ color: C.text, fontWeight: 600 }}>${fmt(totalRevenue)}</strong></span>
            <span>Spend <strong style={{ color: C.text, fontWeight: 600 }}>${fmt(totalSpend)}</strong></span>
          </div>
        )}
      </div>
    );
  }

  // Non-compact (main dashboard) layout
  return (
    <div style={{
      marginBottom: 28,
      animation: "fadeSlideUp 0.5s ease 0.05s both",
      background: "linear-gradient(135deg, #FAFAFC 0%, #FFFFFF 100%)",
      border: `1px solid ${C.borderLight}`,
      borderRadius: 20,
      padding: "24px 28px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,199,89,0.08), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, position: "relative", flexWrap: "wrap" }}>
        <HealthRing score={summary?.health} />
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 20,
              background: "linear-gradient(135deg, #000, #1D1D1F)", color: "#fff",
              fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
            }}>
              <Sparkles size={10} /> Oracle Read
            </div>
            {roasPerDollar && (
              <div style={{
                padding: "3px 9px", borderRadius: 20,
                background: "#34C75915", color: "#2BA94A",
                fontSize: 11, fontWeight: 600, ...body,
              }}>
                You made {roasPerDollar} for every $1 spent
              </div>
            )}
          </div>
          {loading && !summary ? (
            <div style={{ fontSize: 16, color: C.textSec, ...body, lineHeight: 1.5 }}>
              <span style={{
                display: "inline-block", width: 12, height: 12, borderRadius: 6,
                border: `1.5px solid ${C.border}`, borderTopColor: C.accent,
                animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8,
              }} />
              Reading through your data...
            </div>
          ) : summary?.text ? (
            <div style={{ ...hd, fontSize: 22, color: C.text, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              {summary.text}
            </div>
          ) : (
            <div style={{ ...hd, fontSize: 22, color: C.text, lineHeight: 1.3 }}>
              {roasPerDollar ? `You made ${roasPerDollar} for every $1 spent this period.` : `Here's your campaign performance.`}
            </div>
          )}
          {totalRevenue > 0 && totalSpend > 0 && (
            <div style={{ fontSize: 13, color: C.textSec, ...body, marginTop: 10 }}>
              <strong style={{ color: C.text, fontWeight: 600 }}>${fmt(totalRevenue)}</strong> in revenue from <strong style={{ color: C.text, fontWeight: 600 }}>${fmt(totalSpend)}</strong> in spend
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Playbook Panel ──

const ACTION_STYLES = {
  scale: { label: "SCALE", color: "#34C759", bg: "#34C75912", border: "#34C75935", emoji: "🚀" },
  cut: { label: "CUT", color: "#FF3B30", bg: "#FF3B3012", border: "#FF3B3035", emoji: "✂️" },
  shift: { label: "SHIFT", color: "#007AFF", bg: "#007AFF12", border: "#007AFF35", emoji: "🔄" },
  test: { label: "TEST", color: "#5856D6", bg: "#5856D612", border: "#5856D635", emoji: "🧪" },
};

function PlaybookPanel({ playbook, loading, onAsk, compact }) {
  if (!loading && !playbook?.length) return null;

  const gridStyle = compact
    ? { display: "flex", flexDirection: "column", gap: 10 }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 };

  return (
    <div style={{
      marginBottom: compact ? 0 : 28,
      animation: "fadeSlideUp 0.5s ease 0.1s both",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7,
          background: "linear-gradient(135deg, #000, #1D1D1F)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12,
        }}>★</div>
        <div style={{ ...hd, fontSize: compact ? 17 : 22, color: C.text, lineHeight: 1, letterSpacing: "-0.01em" }}>
          This Week's Playbook
        </div>
        {!compact && (
          <div style={{
            padding: "2px 8px", borderRadius: 20, background: C.bgSoft,
            fontSize: 10, fontWeight: 600, color: C.textSec, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
          }}>Top moves ranked by impact</div>
        )}
      </div>

      {loading && !playbook.length ? (
        <div style={gridStyle}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              background: C.bgSoft, borderRadius: 16, padding: "20px",
              minHeight: 140,
              animation: `skelShimmer 1.8s ease-in-out ${i * 0.15}s infinite`,
            }}>
              <div style={{ width: 60, height: 18, background: C.borderLight, borderRadius: 20, marginBottom: 14 }} />
              <div style={{ width: "90%", height: 15, background: C.borderLight, borderRadius: 4, marginBottom: 10 }} />
              <div style={{ width: "80%", height: 11, background: C.borderLight, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: "60%", height: 11, background: C.borderLight, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={gridStyle}>
          {playbook.map((item, i) => {
            const style = ACTION_STYLES[item.action] || ACTION_STYLES.shift;
            return (
              <div key={i} style={{
                background: C.card, borderRadius: 16, padding: "20px 22px",
                border: `1px solid ${C.borderLight}`,
                boxShadow: C.cardShadow,
                position: "relative", overflow: "hidden",
                animation: `fadeSlideUp 0.5s ease ${0.15 + i * 0.08}s both`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${style.border}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = C.cardShadow; }}
              >
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                  background: `linear-gradient(180deg, ${style.color}, ${style.color}80)`,
                }} />
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 20,
                  background: style.bg, border: `1px solid ${style.border}`,
                  fontSize: 10, fontWeight: 700, color: style.color,
                  letterSpacing: "0.08em", textTransform: "uppercase", ...body,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 12 }}>{style.emoji}</span>
                  <span>#{i + 1} · {style.label}</span>
                </div>
                <div style={{
                  ...body, fontSize: 15, fontWeight: 600, color: C.text,
                  lineHeight: 1.35, marginBottom: 8, letterSpacing: "-0.01em",
                }}>
                  {item.title}
                </div>
                <div style={{ ...body, fontSize: 12.5, color: C.textSec, lineHeight: 1.55, marginBottom: 12 }}>
                  {item.why}
                </div>
                {item.impact && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 10px", borderRadius: 8,
                    background: style.bg, border: `1px solid ${style.border}`,
                    fontSize: 12, fontWeight: 600, color: style.color, ...body,
                  }}>
                    <DollarSign size={11} strokeWidth={2.5} />
                    {item.impact}
                  </div>
                )}
                <button onClick={() => onAsk?.(item.title)} style={{
                  marginLeft: 8, padding: "6px 10px", borderRadius: 8,
                  border: `1px solid ${C.borderLight}`, background: "transparent",
                  color: C.textSec, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                  ...body, verticalAlign: "top",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.borderLight; }}
                >
                  <Sparkles size={10} /> Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Winners Podium ──

function TrophyIcon({ size = 24, color = C.text }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  );
}

function Laurel({ size = 48, color = C.text, flip = false }) {
  // Clean, elegant laurel branch — a curved spine with paired leaves
  // flip=true mirrors it to the right side
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      style={{ transform: flip ? "scaleX(-1)" : "none" }}>
      <g stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9">
        {/* Main curved spine */}
        <path d="M 44 40 Q 24 34, 14 22 T 8 6" />
        {/* Five leaves along the branch */}
        <path d="M 40 36 Q 35 28, 32 30 Q 34 37, 40 36 Z" fill={color} fillOpacity="0.95" stroke="none" />
        <path d="M 32 28 Q 26 21, 23 24 Q 25 30, 32 28 Z" fill={color} fillOpacity="0.95" stroke="none" />
        <path d="M 24 20 Q 18 14, 15 17 Q 17 23, 24 20 Z" fill={color} fillOpacity="0.95" stroke="none" />
        <path d="M 17 13 Q 12 8, 9 11 Q 11 16, 17 13 Z" fill={color} fillOpacity="0.95" stroke="none" />
        <path d="M 11 6 Q 7 3, 5 6 Q 7 10, 11 6 Z" fill={color} fillOpacity="0.95" stroke="none" />
      </g>
    </svg>
  );
}

function LaurelLeft(props) { return <Laurel {...props} flip={false} />; }
function LaurelRight(props) { return <Laurel {...props} flip={true} />; }

const RANK_LABELS = ["1st Place", "2nd Place", "3rd Place"];

function WinnersPodium({ winners, categoryCol, isMobile }) {
  return (
    <div style={{
      marginBottom: 28,
      animation: "fadeSlideUp 0.5s ease 0.05s both",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: "linear-gradient(135deg, #000, #1D1D1F)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TrophyIcon size={14} color="#fff" />
        </div>
        <div style={{ ...hd, fontSize: 22, color: C.text, lineHeight: 1, letterSpacing: "-0.01em" }}>
          Top Performers
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 20, background: C.bgSoft,
          fontSize: 10, fontWeight: 600, color: C.textSec, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
        }}>By {winners[0]?.rankBy || "performance"} · {categoryCol}</div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : `repeat(${winners.length}, 1fr)`,
        gap: isMobile ? 10 : 14,
        alignItems: "stretch",
      }}>
        {winners.map((w, i) => {
          const isFirst = i === 0;
          return (
            <div key={w.name} style={{
              background: C.card,
              borderRadius: 16,
              border: `1px solid ${C.borderLight}`,
              padding: "24px 22px 20px",
              boxShadow: C.cardShadow,
              position: "relative",
              animation: `fadeSlideUp 0.6s ease ${0.1 + i * 0.08}s both`,
              display: "flex", flexDirection: "column",
            }}>
              {/* Trophy / Laurels header block */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
                height: 56,
                gap: 8,
              }}>
                {isFirst && <LaurelLeft size={42} color={C.text} />}
                <div style={{
                  width: 44, height: 44,
                  borderRadius: 12,
                  background: isFirst
                    ? "linear-gradient(135deg, #2C2C2E 0%, #1D1D1F 100%)"
                    : "linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isFirst
                    ? "0 6px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "inset 0 1px 0 rgba(255,255,255,0.6)",
                  flexShrink: 0,
                }}>
                  <TrophyIcon size={22} color={isFirst ? "#fff" : C.textSec} />
                </div>
                {isFirst && <LaurelRight size={42} color={C.text} />}
              </div>

              <div style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 700, color: C.textSec,
                letterSpacing: "0.18em", textTransform: "uppercase", ...body,
                marginBottom: 10,
              }}>{RANK_LABELS[i]}</div>

              <div style={{
                textAlign: "center",
                ...hd, fontSize: 18,
                color: C.text, lineHeight: 1.2,
                letterSpacing: "-0.02em",
                marginBottom: 16,
                minHeight: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                flex: "0 0 auto",
              }}>{w.name}</div>

              <div style={{
                display: "flex", flexDirection: "column", gap: 7,
                paddingTop: 14, borderTop: `1px solid ${C.borderLight}`,
              }}>
                {w.roas > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, ...body }}>
                    <span style={{ color: C.textSec }}>ROAS</span>
                    <span style={{ color: C.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{w.roas.toFixed(2)}x</span>
                  </div>
                )}
                {w.revenue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, ...body }}>
                    <span style={{ color: C.textSec }}>Revenue</span>
                    <span style={{ color: C.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${fmt(w.revenue)}</span>
                  </div>
                )}
                {w.spend > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, ...body }}>
                    <span style={{ color: C.textSec }}>Spend</span>
                    <span style={{ color: C.text, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>${fmt(w.spend)}</span>
                  </div>
                )}
                {w.cpa > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, ...body }}>
                    <span style={{ color: C.textSec }}>CPA</span>
                    <span style={{ color: C.text, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>${w.cpa.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Copilot Suggestions Panel ──

const SEVERITY_STYLES = {
  positive: {
    accent: "#34C759",
    glow: "rgba(52, 199, 89, 0.45)",
    bg: "linear-gradient(135deg, #34C75910, #34C75903)",
    border: "#34C75930",
    label: "Opportunity",
  },
  mild: {
    accent: "#FF9500",
    glow: "rgba(255, 149, 0, 0.5)",
    bg: "linear-gradient(135deg, #FF950010, #FF950003)",
    border: "#FF950035",
    label: "Watch out",
  },
  severe: {
    accent: "#FF3B30",
    glow: "rgba(255, 59, 48, 0.55)",
    bg: "linear-gradient(135deg, #FF3B3012, #FF3B3003)",
    border: "#FF3B3035",
    label: "Action needed",
  },
};

const ACTION_TAG_STYLES = {
  "SCALE IT": { color: "#34C759", bg: "#34C75915", border: "#34C75940", emoji: "🚀" },
  "CUT IT": { color: "#FF3B30", bg: "#FF3B3015", border: "#FF3B3040", emoji: "✂️" },
  "FIX IT": { color: "#FF9500", bg: "#FF950015", border: "#FF950040", emoji: "🔧" },
  "TEST IT": { color: "#5856D6", bg: "#5856D615", border: "#5856D640", emoji: "🧪" },
  "WATCH IT": { color: "#86868B", bg: "#86868B15", border: "#86868B40", emoji: "👀" },
};

function SuggestionCard({ item, index, onAskOracle }) {
  const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.positive;
  const actionStyle = ACTION_TAG_STYLES[item.actionTag] || null;
  const animName = `glow-${item.severity || "positive"}`;
  return (
    <div
      style={{
        background: C.card, borderRadius: 14,
        padding: "18px 20px", cursor: "pointer",
        border: `1px solid ${style.border}`,
        boxShadow: `${C.cardShadow}, 0 0 0 0 ${style.glow}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        animation: `fadeSlideUp 0.5s ease ${0.2 + index * 0.07}s both, ${animName} 2.6s ease-in-out infinite`,
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: style.accent, borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 20,
          background: style.bg, border: `1px solid ${style.border}`,
          fontSize: 10, fontWeight: 600, color: style.accent,
          textTransform: "uppercase", letterSpacing: "0.05em", ...body,
        }}>
          {style.label}
        </div>
        {actionStyle && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 20,
            background: actionStyle.bg, border: `1px solid ${actionStyle.border}`,
            fontSize: 10, fontWeight: 700, color: actionStyle.color,
            letterSpacing: "0.05em", ...body,
          }}>
            <span>{actionStyle.emoji}</span>{item.actionTag}
          </div>
        )}
      </div>
      <div style={{
        ...body, fontSize: 14, fontWeight: 600, color: C.text,
        lineHeight: 1.35, marginBottom: 8, letterSpacing: "-0.01em",
      }}>
        {item.headline}
      </div>
      <div style={{ ...body, fontSize: 12.5, color: C.textSec, lineHeight: 1.55 }}>
        {item.detail}
      </div>
      {item.actionDetail && actionStyle && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 10,
          background: actionStyle.bg, border: `1px dashed ${actionStyle.border}`,
          fontSize: 12, color: actionStyle.color, fontWeight: 600, ...body,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <ArrowUpRight size={12} strokeWidth={2.5} />
          {item.actionDetail}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onAskOracle?.(item.headline); }}
        style={{
          marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 20,
          background: "transparent", border: `1px solid ${C.borderLight}`,
          color: C.textSec, fontSize: 11, fontWeight: 500,
          cursor: "pointer", ...body, transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.borderLight; }}
      >
        <Sparkles size={10} />
        Ask Oracle
      </button>
    </div>
  );
}

function SectionHeader({ icon, title, badge, badgeColor, loading }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: badgeColor || "linear-gradient(135deg, #000, #1D1D1F)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ ...body, fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      {badge && (
        <div style={{
          padding: "2px 8px", borderRadius: 20, background: C.bgSoft,
          fontSize: 10, fontWeight: 600, color: C.textSec, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
        }}>{badge}</div>
      )}
      {loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5, marginLeft: "auto",
          fontSize: 11, color: C.textSec, ...body,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: 5,
            border: `1.5px solid ${C.border}`, borderTopColor: C.accent,
            animation: "spin 0.8s linear infinite",
          }} />
          Analyzing...
        </div>
      )}
    </div>
  );
}

function SkeletonCards({ count = 3, compact }) {
  const s = compact
    ? { display: "flex", flexDirection: "column", gap: 10 }
    : { display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: 12 };
  return (
    <div style={s}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: C.bgSoft, borderRadius: 14, padding: "18px 20px",
          minHeight: 110,
          animation: `skelShimmer 1.8s ease-in-out ${i * 0.15}s infinite`,
        }}>
          <div style={{ width: "70%", height: 14, background: C.borderLight, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ width: "100%", height: 11, background: C.borderLight, borderRadius: 4, marginBottom: 6 }} />
          <div style={{ width: "85%", height: 11, background: C.borderLight, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function CopilotSuggestions({ opportunities, warnings, loading, error, onAskOracle, compact }) {
  const hasAny = opportunities.length > 0 || warnings.length > 0;
  if (!loading && !hasAny && !error) return null;

  const gridStyle = compact
    ? { display: "flex", flexDirection: "column", gap: 10 }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 };

  return (
    <div style={{ marginBottom: compact ? 0 : 28, animation: "fadeSlideUp 0.5s ease 0.15s both" }}>
      <style>{`
        @keyframes glow-positive {
          0%, 100% { box-shadow: ${C.cardShadow}, 0 0 0 0 rgba(52, 199, 89, 0); }
          50% { box-shadow: ${C.cardShadow}, 0 0 0 6px rgba(52, 199, 89, 0.14); }
        }
        @keyframes glow-mild {
          0%, 100% { box-shadow: ${C.cardShadow}, 0 0 0 0 rgba(255, 149, 0, 0); }
          50% { box-shadow: ${C.cardShadow}, 0 0 0 7px rgba(255, 149, 0, 0.18); }
        }
        @keyframes glow-severe {
          0%, 100% { box-shadow: ${C.cardShadow}, 0 0 0 0 rgba(255, 59, 48, 0); }
          50% { box-shadow: ${C.cardShadow}, 0 0 0 8px rgba(255, 59, 48, 0.22); }
        }
        @keyframes skelShimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header (overall) - only show on main dashboard, not in sidebar */}
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, #000, #1D1D1F)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={13} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ ...body, fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
            Oracle Insights
          </div>
          <div style={{
            padding: "2px 8px", borderRadius: 20, background: C.bgSoft,
            fontSize: 10, fontWeight: 600, color: C.textSec, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
          }}>AI Copilot</div>
          {loading && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5, marginLeft: "auto",
              fontSize: 11, color: C.textSec, ...body,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: 5,
                border: `1.5px solid ${C.border}`, borderTopColor: C.accent,
                animation: "spin 0.8s linear infinite",
              }} />
              Analyzing your data...
            </div>
          )}
        </div>
      )}

      {/* Row 1 — Opportunities */}
      <div style={{ marginBottom: warnings.length || loading ? 20 : 0 }}>
        <SectionHeader
          icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
          title="What's working"
          badge="Opportunities"
          badgeColor="linear-gradient(135deg, #34C759, #2BA94A)"
        />
        {loading && opportunities.length === 0 ? (
          <SkeletonCards count={3} />
        ) : (
          <div style={gridStyle}>
            {opportunities.map((item, i) => (
              <SuggestionCard key={`op-${i}`} item={{ ...item, severity: "positive" }} index={i} onAskOracle={onAskOracle} />
            ))}
          </div>
        )}
      </div>

      {/* Row 2 — Warnings */}
      {(warnings.length > 0 || (loading && opportunities.length === 0)) && (
        <div>
          <SectionHeader
            icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            title="Things to consider"
            badge="Warnings"
            badgeColor="linear-gradient(135deg, #FF9500, #FF3B30)"
          />
          {loading && warnings.length === 0 ? (
            <SkeletonCards count={2} />
          ) : (
            <div style={gridStyle}>
              {warnings.map((item, i) => (
                <SuggestionCard key={`wn-${i}`} item={item} index={i} onAskOracle={onAskOracle} />
              ))}
            </div>
          )}
        </div>
      )}

      {error && !hasAny && !loading && (
        <div style={{
          padding: "14px 18px", borderRadius: 12,
          background: C.bgSoft, border: `1px solid ${C.borderLight}`,
          fontSize: 13, color: C.textSec, ...body,
        }}>
          Couldn't generate insights right now — {error}
        </div>
      )}
    </div>
  );
}

// ── Fluid Collapsed Handle ──

function FluidHandle({ onOpen, totalItems }) {
  const [railHeight, setRailHeight] = useState(300);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 1024);
      const h = Math.max(260, Math.min(Math.round(window.innerHeight * 0.36), 360));
      setRailHeight(h);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Mobile: wide, centered, translucent pulsing pill anchored to the bottom
  if (isMobile) {
    return (
      <div
        style={{
          position: "fixed", bottom: 16, left: "50%",
          transform: "translateX(-50%)",
          zIndex: 250,
          width: "calc(100% - 24px)",
          maxWidth: 520,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >

        <button
          onClick={onOpen}
          aria-label="Open Oracle Insights"
          style={{
            position: "relative",
            zIndex: 2,
            pointerEvents: "auto",
            width: "100%",
            height: 54,
            padding: "0 22px",
            borderRadius: 27,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#000",
            color: "#fff",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            ...body,
            fontSize: 17, fontWeight: 600, letterSpacing: "0.01em",
            overflow: "hidden",
          }}
        >
          {/* Starfield: many tiny twinkling sparkles filling the entire button */}
          <span style={{
            position: "absolute", inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            borderRadius: 27,
          }}>
            {ORACLE_STARS.map((s, i) => (
              <span key={i} style={{
                position: "absolute",
                top: `${s.y}%`, left: `${s.x}%`,
                fontSize: s.size, lineHeight: 1,
                color: s.color,
                textShadow: `0 0 ${s.size}px ${s.glow}`,
                animation: `starTwinkle${s.variant} ${s.duration}s ease-in-out ${s.delay}s infinite`,
                opacity: 0,
              }}>✦</span>
            ))}
          </span>

          {/* Sparkle icon — next to the text */}
          <span style={{ position: "relative", zIndex: 1, display: "inline-flex" }}>
            <Sparkles size={17} color="#fff" strokeWidth={2} />
          </span>
          <span
            style={{
              position: "relative", zIndex: 1,
              background: `repeating-linear-gradient(
                115deg,
                #ffffff 0px,
                #ffffff 600px,
                rgba(220, 230, 255, 1) 660px,
                #ffffff 720px,
                #ffffff 1200px
              )`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              animation: "oracleShimmer 2.8s linear infinite",
            }}
          >Ask Oracle</span>
        </button>
      </div>
    );
  }

  // Geometry — simple rounded rail, arrow lives inside
  const railW = 26;
  const totalW = railW;
  const railLeftX = 0;
  const railRightX = railW;
  const cornerR = 13;

  const pathD = `
    M ${railRightX} 0
    L ${railLeftX + cornerR} 0
    Q ${railLeftX} 0 ${railLeftX} ${cornerR}
    L ${railLeftX} ${railHeight - cornerR}
    Q ${railLeftX} ${railHeight} ${railLeftX + cornerR} ${railHeight}
    L ${railRightX} ${railHeight}
    Z
  `;

  return (
    <button
      onClick={onOpen}
      aria-label="Open Oracle Insights"
      style={{
        position: "fixed", top: "50%", right: 0,
        transform: "translateY(-50%)",
        zIndex: 250,
        width: totalW,
        height: railHeight,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "#fff",
        filter: "drop-shadow(-6px 0 22px rgba(0,0,0,0.18))",
      }}
    >
      {/* One path = one shape */}
      <svg
        width={totalW} height={railHeight}
        viewBox={`0 0 ${totalW} ${railHeight}`}
        style={{ position: "absolute", top: 0, left: 0, display: "block", pointerEvents: "none" }}
      >
        <path d={pathD} fill="#000" />
      </svg>

      {/* Chevron inside the rail at the top */}
      <div style={{
        position: "absolute",
        top: 18, left: 0,
        width: railW,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <ChevronLeft size={14} color="#fff" strokeWidth={2.4} />
      </div>

      {/* Starfield filling the full rail — more density, refined white starlight */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0, right: 0,
        width: railW,
        overflow: "hidden",
        pointerEvents: "none",
      }}>
        {Array.from({ length: 44 }).map((_, i) => {
          const tint = i % 3 === 0
            ? "rgba(255, 248, 220, 0.92)"  // warm
            : i % 3 === 1
              ? "rgba(220, 235, 255, 0.92)"  // cool
              : "rgba(255, 255, 255, 0.95)"; // white
          const glow = i % 3 === 0
            ? "rgba(255, 230, 180, 0.6)"
            : i % 3 === 1
              ? "rgba(200, 220, 255, 0.6)"
              : "rgba(255, 255, 255, 0.6)";
          // Spread evenly top-to-bottom with pseudo-random x spread
          const y = (i / 44) * 98 + 1;
          const x = ((i * 19) % 70) + 15; // 15–85% of rail width
          const size = 3 + (i % 4); // 3–6px
          const duration = 2.2 + ((i * 0.23) % 2.4);
          const delay = (i * 0.19) % 4;
          const variant = (i % 3) + 1;
          return (
            <span key={i} style={{
              position: "absolute",
              top: `${y}%`, left: `${x}%`,
              fontSize: size, lineHeight: 1,
              color: tint,
              textShadow: `0 0 ${size + 2}px ${glow}`,
              animation: `starTwinkle${variant} ${duration}s ease-in-out ${delay}s infinite`,
              opacity: 0,
            }}>✦</span>
          );
        })}
      </div>

      {/* Oracle text — centered vertically, shimmering */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0, right: 0,
        width: railW,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          ...body,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.22em",
          lineHeight: 1,
          textTransform: "uppercase",
          background: `repeating-linear-gradient(
            25deg,
            #ffffff 0px,
            #ffffff 600px,
            rgba(220, 230, 255, 1) 660px,
            #ffffff 720px,
            #ffffff 1200px
          )`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "oracleShimmer 2.8s linear infinite",
        }}>Oracle</div>
      </div>

      {/* Live dot near the bottom of the rail — always pulsing */}
      <div style={{
        position: "absolute",
        bottom: 18, right: 0,
        width: railW,
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: 4,
          background: "#34C759",
          animation: "liveLight 1.6s ease-in-out infinite",
        }} />
      </div>
    </button>
  );
}

// ── Collapse Handle (mirrors the Oracle rail design, chevron pointing right) ──

function CollapseHandle({ onToggle }) {
  const [railHeight, setRailHeight] = useState(300);

  useEffect(() => {
    const update = () => {
      const h = Math.max(260, Math.min(Math.round(window.innerHeight * 0.36), 360));
      setRailHeight(h);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const railW = 26;
  const cornerR = 13;

  // Rounded corners on the LEFT (sticks out), flat on the RIGHT (flush with sidebar)
  const pathD = `
    M ${railW} 0
    L ${cornerR} 0
    Q 0 0 0 ${cornerR}
    L 0 ${railHeight - cornerR}
    Q 0 ${railHeight} ${cornerR} ${railHeight}
    L ${railW} ${railHeight}
    Z
  `;

  return (
    <button
      onClick={onToggle}
      aria-label="Collapse insights"
      style={{
        position: "absolute", top: "50%", left: -railW,
        transform: "translateY(-50%)",
        zIndex: 11,
        width: railW,
        height: railHeight,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "#fff",
        filter: "drop-shadow(-6px 0 22px rgba(0,0,0,0.18))",
      }}
    >
      {/* Rounded rail shape — rounded LEFT corners only (mirrors Oracle rail) */}
      <svg
        width={railW} height={railHeight}
        viewBox={`0 0 ${railW} ${railHeight}`}
        style={{ position: "absolute", top: 0, left: 0, display: "block", pointerEvents: "none" }}
      >
        <path d={pathD} fill="#000" />
      </svg>

      {/* Starfield */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 0,
        width: railW, overflow: "hidden", pointerEvents: "none",
      }}>
        {Array.from({ length: 44 }).map((_, i) => {
          const tint = i % 3 === 0
            ? "rgba(255, 248, 220, 0.92)"
            : i % 3 === 1
              ? "rgba(220, 235, 255, 0.92)"
              : "rgba(255, 255, 255, 0.95)";
          const glow = i % 3 === 0
            ? "rgba(255, 230, 180, 0.6)"
            : i % 3 === 1
              ? "rgba(200, 220, 255, 0.6)"
              : "rgba(255, 255, 255, 0.6)";
          const y = (i / 44) * 98 + 1;
          const x = ((i * 19) % 70) + 15;
          const size = 3 + (i % 4);
          const duration = 2.2 + ((i * 0.23) % 2.4);
          const delay = (i * 0.19) % 4;
          const variant = (i % 3) + 1;
          return (
            <span key={i} style={{
              position: "absolute",
              top: `${y}%`, left: `${x}%`,
              fontSize: size, lineHeight: 1,
              color: tint,
              textShadow: `0 0 ${size + 2}px ${glow}`,
              animation: `starTwinkle${variant} ${duration}s ease-in-out ${delay}s infinite`,
              opacity: 0,
            }}>✦</span>
          );
        })}
      </div>

      {/* Chevron RIGHT — at the top of the rail (mirrors Oracle rail's chevron but points the other way) */}
      <div style={{
        position: "absolute",
        top: 18, left: 0,
        width: railW,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <ChevronRight size={14} color="#fff" strokeWidth={2.4} />
      </div>

      {/* Vertical "ORACLE" shimmer text (same font/style as Oracle rail) */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0, left: 0,
        width: railW,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          ...body,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.22em",
          lineHeight: 1,
          textTransform: "uppercase",
          background: `repeating-linear-gradient(
            25deg,
            #ffffff 0px,
            #ffffff 600px,
            rgba(220, 230, 255, 1) 660px,
            #ffffff 720px,
            #ffffff 1200px
          )`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "oracleShimmer 2.8s linear infinite",
        }}>Oracle</div>
      </div>

      {/* Live dot */}
      <div style={{
        position: "absolute",
        bottom: 18, left: 0,
        width: railW,
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: 4,
          background: "#34C759",
          animation: "liveLight 1.6s ease-in-out infinite",
        }} />
      </div>
    </button>
  );
}

// ── Collapsible Right Sidebar (Insights) ──

function InsightsSidebar({
  open, onToggle,
  summary, playbook, opportunities, warnings,
  loading, summaryLoading, playbookLoading, insightsLoading, error,
  overallRoas, totalRevenue, totalSpend,
  data, stats, categoryCol, showOracle,
}) {
  const hasAny = summary || playbook.length > 0 || opportunities.length > 0 || warnings.length > 0;
  const totalItems = (summary ? 1 : 0) + playbook.length + opportunities.length + warnings.length;
  const [oracleExpanded, setOracleExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetFull, setSheetFull] = useState(false); // true = 100vh, false = 80vh
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef(null);

  // When Oracle is expanded on mobile, auto-pop the sheet to full height
  useEffect(() => {
    if (isMobile && oracleExpanded) setSheetFull(true);
  }, [isMobile, oracleExpanded]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset sheet state every time it closes, so it always opens fresh
  useEffect(() => {
    if (!open) {
      setOracleExpanded(false);
      setSheetFull(false);
      setDragY(0);
    } else if (isMobile) {
      // On mobile, open directly at full height — no manual drag needed
      setSheetFull(true);
    }
  }, [open, isMobile]);

  const onDragStart = (e) => {
    dragStartRef.current = e.touches ? e.touches[0].clientY : e.clientY;
  };
  const onDragMove = (e) => {
    if (dragStartRef.current == null) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - dragStartRef.current;
    setDragY(delta); // allow both positive (down) and negative (up) values
  };
  const onDragEnd = () => {
    if (dragStartRef.current == null) return;
    if (dragY > 180) {
      // Big drag down → close entirely
      onToggle();
    } else if (dragY > 60) {
      // Medium drag down → if full, shrink; else close
      if (sheetFull) setSheetFull(false);
      else onToggle();
    } else if (dragY < -50) {
      // Dragged up → expand to taller
      setSheetFull(true);
    }
    setDragY(0);
    dragStartRef.current = null;
  };

  const onAskOracle = (headline) => {
    setOracleExpanded(true);
    setTimeout(() => window.dispatchEvent(new CustomEvent("oracle:ask", { detail: headline })), 150);
  };

  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          .oracle-mobile-backdrop { display: block !important; }
        }
        @keyframes sidebarSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes oracleGlassPulse {
          0%, 100% {
            box-shadow:
              inset 0 1px 0 0 rgba(255,255,255,0.45),
              0 8px 22px -8px rgba(0,0,0,0.15),
              0 0 0 0 rgba(255,255,255,0);
          }
          50% {
            box-shadow:
              inset 0 1px 0 0 rgba(255,255,255,0.6),
              0 14px 34px -8px rgba(0,0,0,0.22),
              0 0 0 10px rgba(255,255,255,0.08);
          }
        }
        /* Soft, slow breath — calm and continuous */
        @keyframes oracleSoftPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              inset 0 1px 0 0 rgba(255,255,255,0.15),
              0 10px 28px -8px rgba(0,0,0,0.4);
          }
          50% {
            transform: scale(1.015);
            box-shadow:
              inset 0 1px 0 0 rgba(255,255,255,0.22),
              0 14px 36px -8px rgba(0,0,0,0.5);
          }
        }
        /* Radiating sound wave rings */
        @keyframes oracleRadiate {
          0% { opacity: 0.55; transform: scale(1); border-width: 2px; }
          70% { opacity: 0; transform: scale(1.18); border-width: 1px; }
          100% { opacity: 0; transform: scale(1.22); border-width: 1px; }
        }
        /* Bigger glass ripples — scale way beyond the button, fade slowly */
        @keyframes oracleRipple {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          10% {
            opacity: 0.7;
          }
          60% {
            opacity: 0.25;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2.1);
          }
        }
        /* Main sparkle icon — gently floats in a figure-8 path */
        @keyframes sparkleFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            filter: drop-shadow(0 0 3px rgba(255,215,120,0.35));
          }
          25% {
            transform: translate(1.5px, -1.5px) rotate(10deg) scale(1.1);
            filter: drop-shadow(0 0 6px rgba(255,215,120,0.6));
          }
          50% {
            transform: translate(0, 1px) rotate(-4deg) scale(0.95);
            filter: drop-shadow(0 0 4px rgba(200,220,255,0.5));
          }
          75% {
            transform: translate(-1.5px, -1px) rotate(6deg) scale(1.08);
            filter: drop-shadow(0 0 5px rgba(251,207,232,0.55));
          }
        }
        /* Tiny particles orbiting around the sparkle — each traces a different path */
        @keyframes particleA {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          20% { opacity: 1; transform: translate(-3px, -6px) scale(1); }
          50% { opacity: 0.8; transform: translate(-8px, -2px) scale(1.15); }
          80% { opacity: 0; transform: translate(-10px, 4px) scale(0.6); }
        }
        @keyframes particleB {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          25% { opacity: 1; transform: translate(5px, 3px) scale(1.2); }
          60% { opacity: 0.7; transform: translate(9px, -2px) scale(0.9); }
          85% { opacity: 0; transform: translate(12px, -6px) scale(0.4); }
        }
        @keyframes particleC {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          30% { opacity: 1; transform: translate(7px, -6px) scale(1.1); }
          65% { opacity: 0.6; transform: translate(2px, -10px) scale(0.8); }
          90% { opacity: 0; transform: translate(-4px, -8px) scale(0.3); }
        }
        /* Three variants so the starfield doesn't look synchronized */
        @keyframes starTwinkle1 {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          35% { opacity: 1; transform: scale(1.1) rotate(90deg); }
          65% { opacity: 0.5; transform: scale(0.8) rotate(180deg); }
        }
        @keyframes starTwinkle2 {
          0%, 100% { opacity: 0; transform: scale(0.2) rotate(0deg); }
          40% { opacity: 0.9; transform: scale(1) rotate(-120deg); }
          70% { opacity: 0.3; transform: scale(0.7) rotate(-220deg); }
        }
        @keyframes starTwinkle3 {
          0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg) translateY(0); }
          30% { opacity: 1; transform: scale(1.05) rotate(60deg) translateY(-2px); }
          60% { opacity: 0.6; transform: scale(0.85) rotate(150deg) translateY(2px); }
          85% { opacity: 0; transform: scale(0.5) rotate(240deg) translateY(-1px); }
        }
        /* Diagonal translucent shimmer wave — moves exactly one tile for seamless loop */
        @keyframes oracleShimmer {
          0% { background-position: 0 0; }
          100% { background-position: -1200px -1200px; }
        }
        /* Subtle bounce for "Ask Oracle" text + icon group */
        @keyframes oracleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes gripWave {
          0%, 100% { transform: translate(-50%, -50%) translateX(0) scaleY(1); opacity: 0.7; }
          33% { transform: translate(-50%, -50%) translateX(-1.5px) scaleY(1.3); opacity: 1; }
          66% { transform: translate(-50%, -50%) translateX(0.5px) scaleY(0.85); opacity: 0.85; }
        }
        @keyframes tooltipPop {
          from { opacity: 0; transform: translateY(-50%) translateX(6px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes badgePulseMini {
          0%, 100% { opacity: 0.7; transform: translateY(-50%) scale(1); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.3); }
        }
        @keyframes badgeDotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 6px rgba(52,199,89,0.6); }
          50% { transform: scale(1.2); box-shadow: 0 0 10px rgba(52,199,89,0.8); }
        }
        @keyframes oracleJump {
          0%, 100% {
            transform: translateY(-50%) translateX(0);
            box-shadow: 0 6px 16px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08), inset 1px 0 0 rgba(255,255,255,0.05);
          }
          25% {
            transform: translateY(-50%) translateX(-9px);
            box-shadow: 0 14px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.12), inset 1px 0 0 rgba(255,255,255,0.1);
          }
          40% {
            transform: translateY(-50%) translateX(-2px);
          }
          52% {
            transform: translateY(-50%) translateX(-6px);
          }
          65% {
            transform: translateY(-50%) translateX(-1px);
          }
          78% {
            transform: translateY(-50%) translateX(-3px);
          }
        }
        @keyframes oracleGlow {
          0%, 100% {
            box-shadow: -4px 0 20px rgba(0,0,0,0.18), -1px 0 0 rgba(0,0,0,0.3), -2px 0 12px rgba(52,199,89,0.08);
          }
          50% {
            box-shadow: -6px 0 28px rgba(0,0,0,0.22), -1px 0 0 rgba(0,0,0,0.3), -4px 0 20px rgba(52,199,89,0.18);
          }
        }
        @keyframes chevronNudge {
          0%, 100% { transform: translateX(0); opacity: 0.75; }
          50% { transform: translateX(-3px); opacity: 1; }
        }
        @keyframes dotHeartbeat {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          20% { transform: scale(1.35); opacity: 1; }
          40% { transform: scale(1); opacity: 0.9; }
          60% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes liveLight {
          0%, 100% {
            box-shadow: 0 0 8px rgba(52,199,89,0.8), 0 0 16px rgba(52,199,89,0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 14px rgba(52,199,89,1), 0 0 28px rgba(52,199,89,0.7);
            transform: scale(1.15);
          }
        }
        @keyframes arrowJump {
          0%, 100% {
            transform: translateX(0) scale(1);
            box-shadow: -3px 0 10px rgba(0,0,0,0.25);
          }
          40% {
            transform: translateX(-5px) scale(1.06);
            box-shadow: -6px 2px 14px rgba(0,0,0,0.35);
          }
          60% {
            transform: translateX(-1px) scale(1);
          }
          75% {
            transform: translateX(-3px) scale(1.02);
          }
        }
        @keyframes oraclePulse {
          0%, 100% {
            transform: translateY(-50%) translateX(0);
            filter: drop-shadow(-6px 0 22px rgba(0,0,0,0.22));
          }
          50% {
            transform: translateY(-50%) translateX(-3px);
            filter: drop-shadow(-10px 0 30px rgba(0,0,0,0.28));
          }
        }
      `}</style>

      {/* Collapsed fluid handle on the right edge */}
      {!open && <FluidHandle onOpen={onToggle} totalItems={totalItems} />}

      {/* Mobile backdrop - tap to close */}
      {open && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed", inset: 0, zIndex: 149,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)",
            animation: "fadeIn 0.2s ease",
            display: "none",
          }}
          className="oracle-mobile-backdrop"
        />
      )}

      {/* Expanded Sidebar Panel (bottom sheet on mobile, right drawer on desktop) */}
      {open && (
        <div style={isMobile ? {
          position: "fixed", left: 0, right: 0, bottom: 0,
          height: sheetFull ? "92vh" : "78vh",
          zIndex: 150,
          background: C.bg,
          borderTop: `1px solid ${C.borderLight}`,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.14)",
          display: "flex", flexDirection: "column",
          animation: dragY ? "none" : "sheetSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: `translateY(${Math.max(0, dragY)}px)`,
          transition: dragY ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        } : {
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "100%",
          maxWidth: 420,
          zIndex: 150,
          background: C.bg,
          borderLeft: `1px solid ${C.borderLight}`,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column",
          animation: "sidebarSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Mobile: grabber pill with bigger tap area + close X button */}
          {isMobile ? (
            <>
              {/* Grabber — drag down to close, tap also closes */}
              <div
                onClick={onToggle}
                onTouchStart={onDragStart}
                onTouchMove={onDragMove}
                onTouchEnd={onDragEnd}
                onMouseDown={onDragStart}
                onMouseMove={dragStartRef.current != null ? onDragMove : undefined}
                onMouseUp={onDragEnd}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: 36, background: "transparent",
                  cursor: "grab", zIndex: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  touchAction: "none",
                  userSelect: "none",
                }}
                aria-label="Drag down to close"
              >
                <span style={{
                  display: "block", width: 52, height: 5, borderRadius: 3,
                  background: C.border,
                }} />
              </div>
              {/* Close X button — top right, always visible and very tappable */}
              <button onClick={onToggle}
                style={{
                  position: "absolute", top: 14, right: 14,
                  width: 38, height: 38, borderRadius: 19, border: "none",
                  background: C.accent, color: "#fff",
                  cursor: "pointer", zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
                aria-label="Close insights"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </>
          ) : (
          <CollapseHandle onToggle={onToggle} />
          )}
          {/* Header */}
          <div style={{
            padding: isMobile ? "30px 64px 16px 20px" : "18px 20px",
            borderBottom: `1px solid ${C.borderLight}`,
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #000, #1D1D1F)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={15} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...hd, fontSize: 18, color: C.text, lineHeight: 1 }}>Oracle Insights</div>
              <div style={{ fontSize: 11, color: C.textSec, ...body, marginTop: 3 }}>
                {loading
                  ? "Analyzing your data..."
                  : totalItems > 0
                    ? `${totalItems} insight${totalItems === 1 ? "" : "s"} ready`
                    : error
                      ? "Couldn't load insights"
                      : "Preparing insights..."}
              </div>
            </div>
            {overallRoas && (
              <div style={{
                padding: "6px 12px", borderRadius: 10,
                background: "linear-gradient(135deg, #34C75918, #34C75908)",
                border: "1px solid #34C75930",
                display: "flex", flexDirection: "column", alignItems: "flex-end",
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: "#2BA94A",
                  letterSpacing: "0.08em", textTransform: "uppercase", ...body,
                  lineHeight: 1,
                }}>ROAS</div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: "#2BA94A", ...body,
                  letterSpacing: "-0.01em", lineHeight: 1.1, marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}>{overallRoas}x</div>
              </div>
            )}
          </div>

          {/* Scrollable insights content — hidden when chat is open (mobile + desktop) */}
          {!oracleExpanded && (
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "20px",
              display: "flex", flexDirection: "column", gap: 22,
              minHeight: 0,
            }}>
              <HeroSummary
                summary={summary}
                overallRoas={overallRoas}
                totalRevenue={totalRevenue}
                totalSpend={totalSpend}
                loading={summaryLoading ?? loading}
                compact
              />
              <PlaybookPanel
                playbook={playbook}
                loading={playbookLoading ?? loading}
                onAsk={onAskOracle}
                compact
              />
              <CopilotSuggestions
                opportunities={opportunities}
                warnings={warnings}
                loading={insightsLoading ?? loading}
                error={error}
                onAskOracle={onAskOracle}
                compact
              />
              {!hasAny && !loading && !error && (
                <div style={{
                  padding: 20, borderRadius: 12,
                  background: C.bgSoft, textAlign: "center",
                  fontSize: 13, color: C.textSec, ...body,
                }}>
                  Oracle will analyze your data once it finishes loading.
                </div>
              )}
            </div>
          )}

          {/* Oracle Chat - docked at bottom of sidebar */}
          {showOracle && data && (
            <OracleDock
              expanded={oracleExpanded}
              onToggle={() => setOracleExpanded(!oracleExpanded)}
              onCloseSheet={onToggle}
              data={data}
              stats={stats}
              overallRoas={overallRoas}
              totalRevenue={totalRevenue}
              totalSpend={totalSpend}
              categoryCol={categoryCol}
              fullHeight={oracleExpanded}
            />
          )}
        </div>
      )}
    </>
  );
}

// ── Creative Patterns Panel ──

function CreativePatterns({ patterns, loading, isMobile }) {
  if (!loading && (!patterns || patterns.length === 0)) return null;

  const dimColor = (d) => {
    if (d === "Asset Type") return CHART_GRADIENTS[2]; // green
    if (d === "Hook") return CHART_GRADIENTS[5]; // purple
    if (d === "Placement") return CHART_GRADIENTS[0]; // blue
    return CHART_GRADIENTS[3]; // orange fallback
  };

  return (
    <div style={{ marginTop: isMobile ? 28 : 36, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: "linear-gradient(135deg, #000, #1D1D1F)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={14} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ ...hd, fontSize: isMobile ? 18 : 22, color: C.text, lineHeight: 1, letterSpacing: "-0.01em" }}>
          Creative Patterns
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 20, background: C.bgSoft,
          fontSize: 10, fontWeight: 600, color: C.textSec, letterSpacing: "0.05em", textTransform: "uppercase", ...body,
        }}>What's winning by format & angle</div>
      </div>

      {loading && (!patterns || patterns.length === 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              background: C.bgSoft, borderRadius: 14, padding: "18px 20px",
              minHeight: 110,
              animation: `skelShimmer 1.8s ease-in-out ${i * 0.15}s infinite`,
            }}>
              <div style={{ width: "60%", height: 12, background: C.borderLight, borderRadius: 4, marginBottom: 10 }} />
              <div style={{ width: "100%", height: 14, background: C.borderLight, borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: "85%", height: 11, background: C.borderLight, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {patterns.map((p, i) => {
            const g = dimColor(p.dimension);
            return (
              <div key={i} style={{
                background: C.card, borderRadius: 14, padding: "18px 20px",
                border: `1px solid ${C.borderLight}`,
                boxShadow: C.cardShadow,
                animation: `fadeSlideUp 0.5s ease ${0.1 + i * 0.07}s both`,
                position: "relative", overflow: "hidden",
              }}>
                {/* Top accent bar in the dimension's color */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${g[0]}, ${g[1]}${g[2] ? `, ${g[2]}` : ""})`,
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 20,
                    background: g[1] + "15", border: `1px solid ${g[1]}30`,
                    fontSize: 10, fontWeight: 700, color: g[1],
                    textTransform: "uppercase", letterSpacing: "0.05em", ...body,
                  }}>
                    {p.dimension}
                  </div>
                  {p.lift && (
                    <div style={{
                      padding: "2px 8px", borderRadius: 20,
                      background: C.bgSoft,
                      fontSize: 10, fontWeight: 600, color: C.textSec, ...body,
                    }}>{p.lift}</div>
                  )}
                </div>
                <div style={{
                  ...body, fontSize: 14, fontWeight: 600, color: C.text,
                  lineHeight: 1.35, marginBottom: 8, letterSpacing: "-0.01em",
                }}>{p.headline}</div>
                <div style={{ ...body, fontSize: 12.5, color: C.textSec, lineHeight: 1.55 }}>
                  {p.detail}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Product Filter Tabs ──

function ProductFilterTabs({ products, active, onChange, isMobile, onAddProduct }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      marginBottom: isMobile ? 18 : 24,
      alignItems: "center",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: C.textSec,
        letterSpacing: "0.1em", textTransform: "uppercase", ...body,
        marginRight: 8,
      }}>Product</div>
      <button
        onClick={() => onChange(null)}
        style={{
          padding: "6px 12px", borderRadius: 20,
          border: `1px solid ${active === null ? C.accent : C.borderLight}`,
          background: active === null ? C.accent : C.bg,
          color: active === null ? "#fff" : C.textSec,
          fontSize: 12, fontWeight: 500, ...body,
          cursor: "pointer", transition: "all 0.15s",
        }}
      >All Products</button>
      {products.map(p => {
        const isActive = active === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              padding: "6px 12px", borderRadius: 20,
              border: `1px solid ${isActive ? C.accent : C.borderLight}`,
              background: isActive ? C.accent : C.bg,
              color: isActive ? "#fff" : C.textSec,
              fontSize: 12, fontWeight: 500, ...body,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >{p}</button>
        );
      })}
      <button
        onClick={onAddProduct}
        style={{
          padding: "6px 12px", borderRadius: 20,
          border: `1px dashed ${C.border}`, background: "transparent",
          color: C.textSec, fontSize: 12, fontWeight: 500, ...body,
          cursor: "pointer", transition: "all 0.15s",
          display: "inline-flex", alignItems: "center", gap: 4,
          marginLeft: 4,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.text; e.currentTarget.style.color = C.text; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}
      >
        + Add Product
      </button>
    </div>
  );
}

// ── Main Exported Dashboard Component ──

export default function MarketingDashboardView({ data: incomingData, headerBadge, showOracle = true, onUploadNew, topContent, onAddProduct }) {
  const [view, setView] = useState("dashboard");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [playbook, setPlaybook] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null); // null = "All Products"
  const [creativePatterns, setCreativePatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  // Independent loading flags so each panel shows its own spinner until its endpoint returns
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [playbookLoading, setPlaybookLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState(null);
  // Derived aggregate loading flag for places that still want "any loading"
  const suggestionsLoading = summaryLoading || playbookLoading || insightsLoading;

  // Build product list from incoming data (used for filter tabs)
  const productIdx = incomingData.headers.indexOf("Product");
  const productList = productIdx >= 0
    ? [...new Set(incomingData.rows.map(r => r[productIdx]))].filter(Boolean)
    : [];

  // Filter rows by activeProduct (null = All Products)
  const data = activeProduct && productIdx >= 0
    ? { ...incomingData, rows: incomingData.rows.filter(r => r[productIdx] === activeProduct) }
    : incomingData;

  // Infer column types + auto-select defaults
  const types = detectColumnTypes(data.headers, data.rows);
  const numericCols = new Set(data.headers.filter(h => types[h] === "number"));
  const dateCols = data.headers.filter(h => types[h] === "date");
  const categoryCols = data.headers.filter(h => types[h] === "category");

  const [selectedMetrics, setSelectedMetrics] = useState(() => {
    // Organic-style data uses Reach/Likes; paid uses Spend/Revenue
    const isOrganic = numericCols.has("Reach") || numericCols.has("Followers Gained");
    const preferred = isOrganic
      ? ["Reach", "Likes", "Impressions", "Engagement Rate"]  // Likes (red) before Impressions (blue)
      : ["Impressions", "Clicks", "Spend", "Revenue"];
    const pref = preferred.filter(m => numericCols.has(m));
    if (pref.length >= 2) return pref;
    return [...numericCols].slice(0, 4);
  });
  const [dateCol, setDateCol] = useState(dateCols[0] || null);
  const [categoryCol, setCategoryCol] = useState(categoryCols[0] || null);

  useEffect(() => {
    setMounted(true);
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-open sidebar only on desktop, never on mobile
      if (!mobile && !window.__insightsInitialized) {
        setInsightsOpen(true);
        window.__insightsInitialized = true;
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const suggestionsFetchedRef = useRef(false);
  const enrichedData = { ...data, types };

  // Time series
  const chartData = dateCol ? (() => {
    const di = data.headers.indexOf(dateCol);
    const grouped = {};
    data.rows.forEach(row => {
      const key = row[di];
      if (!key) return;
      if (!grouped[key]) grouped[key] = { _name: key };
      selectedMetrics.forEach(m => {
        const mi = data.headers.indexOf(m);
        grouped[key][m] = (grouped[key][m] || 0) + parseNum(row[mi]);
      });
    });
    return Object.values(grouped).sort((a, b) => {
      const da = new Date(a._name), db = new Date(b._name);
      return isNaN(da) || isNaN(db) ? String(a._name).localeCompare(String(b._name)) : da - db;
    });
  })() : [];

  // Category
  const categoryData = categoryCol ? (() => {
    const ci = data.headers.indexOf(categoryCol);
    const grouped = {};
    data.rows.forEach(row => {
      const key = row[ci] || "Other";
      if (!grouped[key]) grouped[key] = { name: key };
      selectedMetrics.forEach(m => {
        const mi = data.headers.indexOf(m);
        grouped[key][m] = (grouped[key][m] || 0) + parseNum(row[mi]);
      });
    });
    return Object.values(grouped).sort((a, b) => (b[selectedMetrics[0]] || 0) - (a[selectedMetrics[0]] || 0));
  })() : [];

  // Pie by category for first metric
  const pieData = categoryData.length > 0 && selectedMetrics[0]
    ? categoryData.slice(0, 8).map((d, i) => ({
        name: d.name,
        value: d[selectedMetrics[0]] || 0,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  // Compute the correct aggregate for a metric across a set of rows.
  // Ratio metrics (CTR, CPM, CPA, CPC, ROAS, rates) are derived from underlying totals rather than summed.
  const computeAggregate = (metric, rowsSlice) => {
    const lower = metric.toLowerCase();
    const sumCol = (col) => {
      const idx = data.headers.indexOf(col);
      if (idx < 0) return 0;
      return rowsSlice.reduce((s, r) => s + parseNum(r[idx]), 0);
    };
    if (lower === "ctr" || lower.includes("click-through")) {
      const c = sumCol("Clicks"), im = sumCol("Impressions");
      return im > 0 ? (c / im) * 100 : 0;
    }
    if (lower === "cpm") {
      const s = sumCol("Spend"), im = sumCol("Impressions");
      return im > 0 ? (s / im) * 1000 : 0;
    }
    if (lower === "cpa") {
      const s = sumCol("Spend"), cv = sumCol("Conversions");
      return cv > 0 ? s / cv : 0;
    }
    if (lower === "cpc") {
      const s = sumCol("Spend"), c = sumCol("Clicks");
      return c > 0 ? s / c : 0;
    }
    if (lower === "roas") {
      const rv = sumCol("Revenue"), s = sumCol("Spend");
      return s > 0 ? rv / s : 0;
    }
    if (lower.includes("rate") || lower.includes("percent")) {
      const mi = data.headers.indexOf(metric);
      const vals = rowsSlice.map(r => parseNum(r[mi]));
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    // Default: sum
    const mi = data.headers.indexOf(metric);
    return rowsSlice.reduce((s, r) => s + parseNum(r[mi]), 0);
  };

  const stats = selectedMetrics.map(m => {
    const total = computeAggregate(m, data.rows);
    const half = Math.floor(data.rows.length / 2);
    const firstHalf = computeAggregate(m, data.rows.slice(0, half));
    const secondHalf = computeAggregate(m, data.rows.slice(half));
    const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    return { name: m, total, change, icon: guessMetricIcon(m), prefix: guessPrefix(m), suffix: guessSuffix(m) };
  });

  const spendIdx = data.headers.indexOf("Spend");
  const revIdx = data.headers.indexOf("Revenue");
  const totalSpend = spendIdx >= 0 ? data.rows.reduce((s, r) => s + parseNum(r[spendIdx]), 0) : 0;
  const totalRevenue = revIdx >= 0 ? data.rows.reduce((s, r) => s + parseNum(r[revIdx]), 0) : 0;
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : null;

  // Compute winners podium (top 3 by ROAS, or by revenue share if no spend col)
  const winners = (() => {
    if (!categoryCol) return [];
    const ci = data.headers.indexOf(categoryCol);
    const spIdx = data.headers.indexOf("Spend");
    const rvIdx = data.headers.indexOf("Revenue");
    const cvIdx = data.headers.indexOf("Conversions");
    const grouped = {};
    data.rows.forEach(r => {
      const k = r[ci] || "Other";
      if (!grouped[k]) grouped[k] = { name: k, spend: 0, revenue: 0, conversions: 0 };
      if (spIdx >= 0) grouped[k].spend += parseNum(r[spIdx]);
      if (rvIdx >= 0) grouped[k].revenue += parseNum(r[rvIdx]);
      if (cvIdx >= 0) grouped[k].conversions += parseNum(r[cvIdx]);
    });
    const entries = Object.values(grouped).map(e => ({
      ...e,
      roas: e.spend > 0 ? e.revenue / e.spend : 0,
      cpa: e.conversions > 0 ? e.spend / e.conversions : 0,
    }));
    // Rank by ROAS if available, otherwise by revenue
    const hasRoas = entries.some(e => e.roas > 0);
    entries.sort((a, b) => hasRoas ? b.roas - a.roas : b.revenue - a.revenue);
    return entries.slice(0, 3).map((e, i) => ({
      ...e,
      rank: i + 1,
      rankBy: hasRoas ? "roas" : "revenue",
    }));
  })();

  // Fetch AI insights — 3 parallel requests so each appears as soon as it's ready.
  // Refetches when the active product filter changes.
  useEffect(() => {
    if (!data.rows?.length) return;
    setSummary(null);
    setPlaybook([]);
    setOpportunities([]);
    setWarnings([]);
    setSummaryLoading(true);
    setPlaybookLoading(true);
    setInsightsLoading(true);
    const ctx = buildRichContext({
      data, types, stats, overallRoas, totalRevenue, totalSpend,
      categoryCol, dateCol, chartData, categoryData, selectedMetrics,
    });
    const body = JSON.stringify({ dataContext: ctx });
    const opts = { method: "POST", headers: { "Content-Type": "application/json" }, body };

    fetch("/api/oracle/summary", opts).then(r => r.json()).then(j => {
      if (j.summary) setSummary(j.summary);
    }).catch(() => {}).finally(() => setSummaryLoading(false));

    fetch("/api/oracle/playbook", opts).then(r => r.json()).then(j => {
      if (j.playbook) setPlaybook(j.playbook);
    }).catch(() => {}).finally(() => setPlaybookLoading(false));

    fetch("/api/oracle/insights", opts).then(r => r.json()).then(j => {
      if (j.error) setSuggestionsError(j.error);
      else {
        setOpportunities(j.opportunities || []);
        setWarnings(j.warnings || []);
      }
    }).catch(e => setSuggestionsError(e.message)).finally(() => setInsightsLoading(false));

    // Patterns — only if the data has at least one of: Asset Type, Hook, Placement
    const hasCreativeDims = ["Asset Type", "Hook", "Placement"].some(c => data.headers.includes(c));
    if (hasCreativeDims) {
      setPatternsLoading(true);
      setCreativePatterns(null);
      fetch("/api/oracle/patterns", opts).then(r => r.json()).then(j => {
        if (j.patterns) setCreativePatterns(j.patterns);
      }).catch(() => {}).finally(() => setPatternsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rows.length, activeProduct]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...body }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button, a, [role="button"], svg, path, rect, circle, g {
          -webkit-tap-highlight-color: transparent;
        }
        button:focus, button:focus-visible, a:focus, a:focus-visible,
        [role="button"]:focus, [role="button"]:focus-visible,
        input:focus, select:focus, textarea:focus,
        svg:focus, path:focus, rect:focus, circle:focus, g:focus,
        .recharts-surface:focus, .recharts-surface *:focus,
        .recharts-wrapper:focus, .recharts-wrapper *:focus,
        .recharts-layer:focus, .recharts-bar:focus, .recharts-bar-rectangle:focus,
        .recharts-tooltip-cursor:focus, .recharts-active-bar:focus {
          outline: none !important;
          outline-offset: 0 !important;
        }
        .recharts-wrapper, .recharts-surface { outline: none !important; }
        *:focus { outline: none !important; }
        *:focus-visible { outline: none !important; }
      `}</style>

      <header style={{
        padding: isMobile ? "12px 40px 12px 16px" : "16px 54px 16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10,
        background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 100%)",
        backdropFilter: "blur(48px) saturate(200%)",
        WebkitBackdropFilter: "blur(48px) saturate(200%)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 0 rgba(210,210,215,0.3)",
        position: "sticky", top: 0, zIndex: 100, animation: "fadeIn 0.4s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, flexWrap: "nowrap", minWidth: 0, flex: 1, overflow: "hidden" }}>
          <a href="/" style={{ ...hd, fontSize: isMobile ? 18 : 22, color: C.text, textDecoration: "none", flexShrink: 0 }}>Alchemy</a>
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 24, background: C.borderLight }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textSec, fontSize: 14, fontWeight: 500 }}>
                <BarChart3 size={18} strokeWidth={1.5} />
                Marketing Dashboard
              </div>
            </>
          )}
          {data.clientName && !isMobile && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20, background: C.bgSoft,
              fontSize: 12, fontWeight: 500, color: C.text, ...body,
            }}>
              <Lock size={11} strokeWidth={2} color={C.textSec} />
              {data.clientName}
            </div>
          )}
          {headerBadge}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", background: C.bgSoft, borderRadius: 10, padding: 3 }}>
            {[
              { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { key: "table", label: "Data", icon: FileSpreadsheet },
            ].map(t => (
              <button key={t.key} onClick={() => setView(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: isMobile ? "7px 9px" : "7px 16px",
                  borderRadius: 8, border: "none",
                  background: view === t.key ? C.bg : "transparent",
                  boxShadow: view === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  color: view === t.key ? C.text : C.textSec,
                  fontSize: 13, fontWeight: 500, cursor: "pointer", ...body,
                }}
                aria-label={t.label}
                >
                <t.icon size={15} strokeWidth={1.5} />
                {!isMobile && t.label}
              </button>
            ))}
          </div>
          {onUploadNew && (
            <button onClick={onUploadNew}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: `1px solid ${C.borderLight}`, background: C.bg,
                color: C.textSec, fontSize: 13, fontWeight: 500,
                cursor: "pointer", ...body,
              }}>
              <Upload size={14} strokeWidth={1.5} /> New upload
            </button>
          )}
        </div>
      </header>

      {topContent}

      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: isMobile ? "20px 8px 120px" : "32px 32px 64px",
        paddingRight: isMobile ? 8 : (insightsOpen ? "calc(420px + 32px)" : 54),
        transition: "padding-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {view === "table" ? (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ ...hd, fontSize: 28, color: C.text }}>{data.fileName}</h2>
              <p style={{ fontSize: 14, color: C.textSec, marginTop: 4, ...body }}>{data.rows.length} rows · {data.headers.length} columns</p>
            </div>
            <DataTable headers={data.headers} rows={data.rows} numericCols={numericCols} />
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
              <h2 style={{ ...hd, fontSize: isMobile ? 26 : 36, color: C.text, marginBottom: 6, lineHeight: 1.15 }}>
                {data.title || `${data.clientName ? data.clientName + " — " : ""}Campaign Performance`}
              </h2>
              <p style={{ fontSize: isMobile ? 13 : 15, color: C.textSec, ...body }}>
                {data.fileName} · {data.rows.length} records · {selectedMetrics.length} metrics tracked
              </p>
            </div>

            {/* Product filter tabs — visible only when data has a Product column */}
            {productList.length > 0 && (
              <ProductFilterTabs
                products={productList}
                active={activeProduct}
                onChange={setActiveProduct}
                isMobile={isMobile}
                onAddProduct={() => {
                  if (onAddProduct) onAddProduct();
                  else if (typeof window !== "undefined") {
                    alert("Demo only — Add Product is wired up on saved client dashboards.");
                  }
                }}
              />
            )}

            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              {dateCols.length > 0 && (
                <select value={dateCol || ""} onChange={e => setDateCol(e.target.value || null)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.borderLight}`,
                    background: C.bg, color: C.text, fontSize: 13, ...body, cursor: "pointer",
                  }}>
                  <option value="">No time axis</option>
                  {dateCols.map(d => <option key={d} value={d}>Time: {d}</option>)}
                </select>
              )}
              {categoryCols.length > 0 && (
                <select value={categoryCol || ""} onChange={e => setCategoryCol(e.target.value || null)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.borderLight}`,
                    background: C.bg, color: C.text, fontSize: 13, ...body, cursor: "pointer",
                  }}>
                  <option value="">No breakdown</option>
                  {categoryCols.map(d => <option key={d} value={d}>Break down by {d}</option>)}
                </select>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
              {[...numericCols].map((m, i) => {
                const total = computeAggregate(m, data.rows);
                const half = Math.floor(data.rows.length / 2);
                const firstHalf = computeAggregate(m, data.rows.slice(0, half));
                const secondHalf = computeAggregate(m, data.rows.slice(half));
                const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
                return (
                  <StatCard
                    key={m}
                    label={m}
                    value={total}
                    change={change}
                    icon={guessMetricIcon(m)}
                    prefix={guessPrefix(m)}
                    suffix={guessSuffix(m)}
                    delay={i * 0.04}
                  />
                );
              })}
            </div>


            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: isMobile ? 14 : 20 }}>
              {chartData.length > 0 && (
                <ChartCard title="Performance Over Time" subtitle="Daily aggregated metrics" span={isMobile ? undefined : 2} delay={0.1} mounted={mounted} tight={isMobile}>
                  {selectedMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={chartData} margin={{ top: 5, right: isMobile ? 8 : 20, bottom: 5, left: isMobile ? -10 : 0 }}>
                        <defs>
                          {selectedMetrics.map((m, i) => {
                            const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                            return (
                              <g key={m}>
                                {/* Light airy fill — iOS-style */}
                                <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={g[1]} stopOpacity={0.28} />
                                  <stop offset="100%" stopColor={g[1]} stopOpacity={0} />
                                </linearGradient>
                              </g>
                            );
                          })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                        <XAxis dataKey="_name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={{ stroke: C.borderLight }}
                          tickFormatter={v => { const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }}
                          interval={Math.max(0, Math.floor(chartData.length / 10))}
                        />
                        <YAxis tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                        <Tooltip content={<CustomTooltip />} />
                        {selectedMetrics.map((m, i) => {
                          const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                          return (
                            <Area key={m} type="monotone" dataKey={m} name={m}
                              stroke={g[1]} strokeWidth={2}
                              fill={`url(#grad-${i})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{
                      height: 320, background: C.bgSoft, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.textSec, fontSize: 13, ...body,
                    }}>
                      Select metrics below to display on the chart
                    </div>
                  )}
                  {/* Metric selector — directly under the chart */}
                  <MetricToggleBar
                    metrics={[...numericCols]}
                    selected={selectedMetrics}
                    onChange={setSelectedMetrics}
                  />
                </ChartCard>
              )}

              {categoryData.length > 0 && selectedMetrics.length > 0 && (
                <ChartCard title={`Performance by ${categoryCol}`} subtitle="Top performers" delay={0.2} mounted={mounted} tight={isMobile}>
                  <ResponsiveContainer width="100%" height={isMobile ? 280 : 300}>
                    {isMobile ? (
                      /* Horizontal bar on mobile — names read left-to-right, no truncation */
                      <BarChart
                        data={categoryData.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 8, right: 10, bottom: 8, left: 0 }}
                        barCategoryGap="26%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                        <YAxis
                          type="category" dataKey="name"
                          tick={{ fontSize: 10, fill: C.textSec, fontWeight: 500 }}
                          tickLine={false} axisLine={false}
                          width={110}
                          tickFormatter={v => v.length > 16 ? v.slice(0, 14) + "…" : v}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                        {selectedMetrics.map((m, i) => {
                          const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                          return (
                            <Bar key={m} dataKey={m} name={m}
                              fill={g[1] + "22"}
                              stroke={g[1]}
                              strokeWidth={1.5}
                              radius={[0, 5, 5, 0]}
                              barSize={Math.max(10, 16 - selectedMetrics.length * 2)}
                              animationDuration={600}
                              animationBegin={i * 80}
                            />
                          );
                        })}
                      </BarChart>
                    ) : (
                      <BarChart data={categoryData.slice(0, 10)} margin={{ top: 10, right: 20, bottom: 5, left: 0 }} barGap={4} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: C.textSec, fontWeight: 500 }}
                          tickLine={false}
                          axisLine={false}
                          angle={-20} textAnchor="end" height={60}
                          dy={6}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: C.textSec }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={v => fmt(v)}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                        {selectedMetrics.map((m, i) => {
                          const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                          return (
                            <Bar key={m} dataKey={m} name={m}
                              fill={g[1] + "22"}
                              stroke={g[1]}
                              strokeWidth={1.5}
                              radius={[6, 6, 0, 0]}
                              animationDuration={600}
                              animationBegin={i * 80}
                            />
                          );
                        })}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {pieData.length > 0 && (
                <ChartCard title={`${selectedMetrics[0]} Distribution`} subtitle={`By ${categoryCol}`} delay={0.25} mounted={mounted} tight={isMobile}>
                  <div style={{ position: "relative" }}>
                    <ResponsiveContainer width="100%" height={isMobile ? 340 : 300}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name"
                          cx="50%" cy={isMobile ? "38%" : "50%"}
                          innerRadius={isMobile ? 60 : 76}
                          outerRadius={isMobile ? 92 : 116}
                          paddingAngle={3}
                          cornerRadius={3}
                          strokeWidth={1.5}
                          animationDuration={700}>
                          {pieData.map((entry, i) => {
                            const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                            return <Cell key={i} fill={g[1] + "22"} stroke={g[1]} />;
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          layout="horizontal"
                          iconSize={8}
                          iconType="circle"
                          wrapperStyle={isMobile ? { fontSize: 11, paddingTop: 8 } : { fontSize: 12 }}
                          formatter={(val) => <span style={{ color: C.textSec, fontSize: isMobile ? 11 : 12, ...body }}>{val}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center label — clean Inter, not serif, to match the stat cards */}
                    <div style={{
                      position: "absolute",
                      top: isMobile ? "38%" : "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                      marginTop: isMobile ? -10 : 0,
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: C.textTer,
                        letterSpacing: "0.12em", textTransform: "uppercase", ...body,
                        marginBottom: 2,
                      }}>Total</div>
                      <div style={{
                        ...body, fontSize: isMobile ? 20 : 24, fontWeight: 700,
                        color: C.text, lineHeight: 1, letterSpacing: "-0.02em",
                      }}>
                        {guessPrefix(selectedMetrics[0])}{fmt(pieData.reduce((s, d) => s + (d.value || 0), 0))}{guessSuffix(selectedMetrics[0])}
                      </div>
                    </div>
                  </div>
                </ChartCard>
              )}

              {chartData.length > 0 && selectedMetrics.length >= 2 && (
                <ChartCard title="Trend Comparison" subtitle="Multi-metric trends" span={isMobile ? undefined : 2} delay={0.3} mounted={mounted} tight={isMobile}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: isMobile ? 8 : 20, bottom: 5, left: isMobile ? -10 : 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="_name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={{ stroke: C.borderLight }}
                        tickFormatter={v => { const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }}
                        interval={Math.max(0, Math.floor(chartData.length / 10))}
                      />
                      <YAxis tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(val) => <span style={{ color: C.textSec, fontSize: 12, ...body }}>{val}</span>} iconSize={8} iconType="circle" />
                      {selectedMetrics.map((m, i) => {
                        const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                        return (
                          <Line key={m} type="monotone" dataKey={m} name={m} stroke={g[1]}
                            strokeWidth={2.2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {stats.length >= 2 && (
                <ChartCard
                  title="Metrics Totals"
                  subtitle="Aggregate comparison"
                  span={isMobile ? undefined : 2}
                  delay={0.35}
                  mounted={mounted}
                  tight={isMobile}
                >
                  <ResponsiveContainer width="100%" height={Math.max(300, stats.length * (isMobile ? 50 : 44))}>
                    <BarChart data={stats.map(s => ({ name: s.name, value: s.total }))} layout="vertical"
                      margin={{ top: 5, right: isMobile ? 14 : 30, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 10 : 11, fill: C.textSec, fontWeight: 500 }} tickLine={false} axisLine={false} width={isMobile ? 76 : 110} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                      <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={isMobile ? 22 : 20} strokeWidth={1.5}>
                        {stats.map((_, i) => {
                          const g = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
                          return <Cell key={i} fill={g[1] + "22"} stroke={g[1]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {/* Winners Podium — below the charts */}
            {winners.length >= 2 && (
              <div style={{ marginTop: 28 }}>
                <WinnersPodium winners={winners} categoryCol={categoryCol} isMobile={isMobile} />
              </div>
            )}

            {/* Creative Patterns — AI-detected winning formats / hooks / placements */}
            <CreativePatterns
              patterns={creativePatterns}
              loading={patternsLoading}
              isMobile={isMobile}
            />

            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ ...body, fontSize: 15, fontWeight: 600, color: C.text }}>Raw Data</h3>
                <button onClick={() => setView("table")}
                  style={{
                    fontSize: 13, color: C.info, fontWeight: 500, background: "none",
                    border: "none", cursor: "pointer", ...body,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>View full table <ArrowUpRight size={14} /></button>
              </div>
              <DataTable headers={data.headers} rows={data.rows.slice(0, 30)} numericCols={numericCols} />
            </div>
          </div>
        )}
      </div>

      <InsightsSidebar
        open={insightsOpen}
        onToggle={() => setInsightsOpen(!insightsOpen)}
        summary={summary}
        playbook={playbook}
        opportunities={opportunities}
        warnings={warnings}
        loading={suggestionsLoading}
        summaryLoading={summaryLoading}
        playbookLoading={playbookLoading}
        insightsLoading={insightsLoading}
        error={suggestionsError}
        overallRoas={overallRoas}
        totalRevenue={totalRevenue}
        totalSpend={totalSpend}
        data={enrichedData}
        stats={stats}
        categoryCol={categoryCol}
        showOracle={showOracle}
      />
    </div>
  );
}
