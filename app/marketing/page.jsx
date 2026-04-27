"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign,
  BarChart3, PieChart as PieIcon, Activity, Users, Eye, MousePointerClick,
  Target, Zap, ArrowUpRight, ArrowDownRight, X, ChevronDown,
  LayoutDashboard, RefreshCw, Download, Filter, Calendar
} from "lucide-react";
import Papa from "papaparse";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
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

const CHART_COLORS = ["#000000", "#007AFF", "#34C759", "#FF9500", "#FF3B30", "#5856D6", "#AF52DE", "#FF2D55"];
const CHART_COLORS_SOFT = ["#1D1D1F", "#007AFF", "#30B350", "#E88600", "#E0352C", "#4F4EC8", "#9D47C8", "#E6284C"];

const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const body = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

// ── Helpers ──

function isLikelyDate(v) {
  if (!v || !isNaN(Number(v))) return false; // pure numbers are not dates
  const d = Date.parse(v);
  if (isNaN(d)) return false;
  // Must contain a separator like -, /, or a month name
  return /[-\/]/.test(v) || /[a-zA-Z]/.test(v);
}

function detectColumnTypes(headers, rows) {
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
  const n = name.toLowerCase();
  if (n.includes("spend") || n.includes("cost") || n.includes("revenue") || n.includes("budget") || n.includes("roas") || n.includes("cpa") || n.includes("cpc") || n.includes("cpm")) return DollarSign;
  if (n.includes("click") || n.includes("ctr")) return MousePointerClick;
  if (n.includes("impression") || n.includes("reach") || n.includes("view")) return Eye;
  if (n.includes("conversion") || n.includes("purchase") || n.includes("sale")) return Target;
  if (n.includes("user") || n.includes("audience") || n.includes("follower")) return Users;
  if (n.includes("engagement") || n.includes("like") || n.includes("share")) return Zap;
  return Activity;
}

function guessPrefix(name) {
  const n = name.toLowerCase();
  if (n.includes("spend") || n.includes("cost") || n.includes("revenue") || n.includes("budget") || n.includes("cpa") || n.includes("cpc") || n.includes("cpm") || n.includes("roas")) return "$";
  return "";
}

function guessSuffix(name) {
  const n = name.toLowerCase();
  if (n.includes("rate") || n.includes("ctr") || n.includes("percentage") || n.includes("percent")) return "%";
  return "";
}

// ── Custom Tooltip ──

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

// ── Stat Card ──

function StatCard({ label, value, change, icon: Icon, prefix, suffix, delay }) {
  const isPositive = change > 0;
  return (
    <div style={{
      background: C.card, borderRadius: 16,
      boxShadow: C.cardShadow, padding: "24px",
      flex: "1 1 220px", minWidth: 200,
      animation: `fadeSlideUp 0.5s ease ${delay || 0}s both`,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = C.cardShadow; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={C.textSec} strokeWidth={1.5} />
        </div>
        {change != null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 13, fontWeight: 600, ...body,
            color: isPositive ? C.success : C.danger,
            background: isPositive ? "#34C75915" : "#FF3B3015",
            padding: "4px 10px", borderRadius: 20,
          }}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, ...body, letterSpacing: "-0.02em", marginBottom: 4 }}>
        {prefix}{typeof value === "number" ? fmt(value) : value}{suffix}
      </div>
      <div style={{ fontSize: 13, color: C.textSec, fontWeight: 500, ...body }}>{label}</div>
    </div>
  );
}

// ── Chart Card ──

function ChartCard({ title, children, span, delay }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, boxShadow: C.cardShadow,
      padding: "24px", gridColumn: span ? `span ${span}` : undefined,
      animation: `fadeSlideUp 0.6s ease ${delay || 0}s both`,
    }}>
      <h3 style={{ ...body, fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 20 }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Upload Zone ──

function UploadZone({ onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith(".csv")) return;
    Papa.parse(file, {
      complete: (results) => {
        const headers = results.data[0];
        const rows = results.data.slice(1).filter(r => r.some(c => c && c.trim()));
        onUpload({ headers, rows, fileName: file.name });
      },
      skipEmptyLines: true,
    });
  }, [onUpload]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? C.accent : C.border}`,
        borderRadius: 20, padding: "64px 40px",
        textAlign: "center", cursor: "pointer",
        background: dragOver ? C.accentSoft : C.bgSoft,
        transition: "all 0.3s ease",
        animation: "fadeSlideUp 0.5s ease both",
      }}
    >
      <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", boxShadow: C.cardShadow,
      }}>
        <Upload size={28} color={C.accent} strokeWidth={1.5} />
      </div>
      <div style={{ ...hd, fontSize: 28, color: C.text, marginBottom: 8 }}>
        Drop your CSV here
      </div>
      <div style={{ ...body, fontSize: 15, color: C.textSec, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
        Upload marketing data from Meta, Google Ads, TikTok, or any platform. We'll auto-detect your metrics and build your dashboard.
      </div>
      <div style={{
        marginTop: 24, display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 24px", borderRadius: 980, background: C.accent,
        color: "#fff", fontSize: 14, fontWeight: 500, ...body,
      }}>
        <FileSpreadsheet size={16} /> Choose file
      </div>
    </div>
  );
}

// ── Data Table ──

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
                    transition: "background 0.15s",
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

// ── Main Page ──

export default function MarketingDashboard() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("dashboard");
  const [mounted, setMounted] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [dateCol, setDateCol] = useState(null);
  const [categoryCol, setCategoryCol] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  const handleUpload = useCallback(({ headers, rows, fileName }) => {
    const types = detectColumnTypes(headers, rows);
    const numericCols = new Set(headers.filter(h => types[h] === "number"));
    const dateCols = headers.filter(h => types[h] === "date");
    const categoryCols = headers.filter(h => types[h] === "category");

    // Auto-select first date col and up to 6 numeric metrics
    const autoDate = dateCols[0] || null;
    const autoCategory = categoryCols[0] || null;
    const autoMetrics = headers.filter(h => types[h] === "number").slice(0, 6);

    setDateCol(autoDate);
    setCategoryCol(autoCategory);
    setSelectedMetrics(autoMetrics);
    setData({ headers, rows, fileName, types, numericCols, dateCols, categoryCols });
    setView("dashboard");
  }, []);

  // Processed chart data
  const chartData = data && dateCol ? (() => {
    const di = data.headers.indexOf(dateCol);
    const grouped = {};
    data.rows.forEach(row => {
      const key = row[di];
      if (!key) return;
      if (!grouped[key]) grouped[key] = { _name: key, _count: 0 };
      selectedMetrics.forEach(m => {
        const mi = data.headers.indexOf(m);
        grouped[key][m] = (grouped[key][m] || 0) + parseNum(row[mi]);
      });
      grouped[key]._count++;
    });
    return Object.values(grouped).sort((a, b) => {
      const da = new Date(a._name), db = new Date(b._name);
      return isNaN(da) || isNaN(db) ? a._name.localeCompare(b._name) : da - db;
    });
  })() : [];

  // Category breakdown
  const categoryData = data && categoryCol ? (() => {
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
    return Object.values(grouped).sort((a, b) => {
      const firstMetric = selectedMetrics[0];
      return (b[firstMetric] || 0) - (a[firstMetric] || 0);
    });
  })() : [];

  // Pie data for first metric by category
  const pieData = categoryData.length > 0 && selectedMetrics[0] ?
    categoryData.slice(0, 8).map((d, i) => ({
      name: d.name,
      value: d[selectedMetrics[0]] || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })) : [];

  // Summary stats
  const stats = data ? selectedMetrics.map(m => {
    const mi = data.headers.indexOf(m);
    const values = data.rows.map(r => parseNum(r[mi]));
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / (values.length || 1);
    // Fake change for visual interest (compare first half vs second half)
    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / ((values.length - half) || 1);
    const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    return { name: m, total, avg, change, icon: guessMetricIcon(m), prefix: guessPrefix(m), suffix: guessSuffix(m) };
  }) : [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...body }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${C.borderLight}`,
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
        animation: "fadeIn 0.4s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ ...hd, fontSize: 22, color: C.text }}>Alchemy</div>
          <div style={{ width: 1, height: 24, background: C.borderLight }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textSec, fontSize: 14, fontWeight: 500 }}>
            <BarChart3 size={18} strokeWidth={1.5} />
            Marketing Dashboard
          </div>
        </div>
        {data && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", background: C.bgSoft, borderRadius: 10, padding: 3,
            }}>
              {[
                { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { key: "table", label: "Data", icon: FileSpreadsheet },
              ].map(t => (
                <button key={t.key} onClick={() => setView(t.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", borderRadius: 8, border: "none",
                    background: view === t.key ? C.bg : "transparent",
                    boxShadow: view === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    color: view === t.key ? C.text : C.textSec,
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    transition: "all 0.2s", ...body,
                  }}>
                  <t.icon size={15} strokeWidth={1.5} />
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setData(null); setView("dashboard"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: `1px solid ${C.borderLight}`, background: C.bg,
                color: C.textSec, fontSize: 13, fontWeight: 500,
                cursor: "pointer", ...body, transition: "all 0.15s",
              }}>
              <Upload size={14} strokeWidth={1.5} /> New upload
            </button>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 64px" }}>
        {!data ? (
          /* ── Empty State ── */
          <div style={{ maxWidth: 640, margin: "80px auto 0" }}>
            <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeSlideUp 0.5s ease both" }}>
              <h1 style={{ ...hd, fontSize: 44, color: C.text, marginBottom: 12, lineHeight: 1.1 }}>
                Marketing Intelligence
              </h1>
              <p style={{ fontSize: 17, color: C.textSec, lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
                Upload your campaign data and watch it transform into actionable insights. Beautiful analytics, zero setup.
              </p>
            </div>
            <UploadZone onUpload={handleUpload} />
            <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 24, animation: "fadeSlideUp 0.5s ease 0.2s both" }}>
              {["Meta Ads", "Google Ads", "TikTok", "LinkedIn", "Custom CSV"].map(p => (
                <span key={p} style={{
                  fontSize: 12, color: C.textTer, fontWeight: 500,
                  padding: "6px 12px", borderRadius: 20, background: C.bgSoft,
                  ...body, letterSpacing: "0.02em",
                }}>{p}</span>
              ))}
            </div>
          </div>
        ) : view === "table" ? (
          /* ── Table View ── */
          <div>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ ...hd, fontSize: 28, color: C.text }}>{data.fileName}</h2>
                <p style={{ fontSize: 14, color: C.textSec, marginTop: 4, ...body }}>{data.rows.length} rows · {data.headers.length} columns</p>
              </div>
            </div>
            <DataTable headers={data.headers} rows={data.rows} numericCols={data.numericCols} />
          </div>
        ) : (
          /* ── Dashboard View ── */
          <div>
            {/* Title + Controls */}
            <div style={{ marginBottom: 28, animation: "fadeSlideUp 0.4s ease both" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ ...hd, fontSize: 32, color: C.text, marginBottom: 4 }}>Campaign Overview</h2>
                  <p style={{ fontSize: 14, color: C.textSec, ...body }}>
                    {data.fileName} · {data.rows.length} records · {selectedMetrics.length} metrics tracked
                  </p>
                </div>
              </div>

              {/* Metric Selector */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[...data.numericCols].map(m => {
                  const active = selectedMetrics.includes(m);
                  return (
                    <button key={m} onClick={() => {
                      setSelectedMetrics(prev =>
                        active ? prev.filter(x => x !== m) : [...prev, m]
                      );
                    }}
                      style={{
                        padding: "6px 14px", borderRadius: 20,
                        border: `1px solid ${active ? C.accent : C.borderLight}`,
                        background: active ? C.accent : C.bg,
                        color: active ? "#fff" : C.textSec,
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                        transition: "all 0.2s", ...body,
                      }}>
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* Dimension Selectors */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                {data.dateCols.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={14} color={C.textSec} />
                    <select value={dateCol || ""} onChange={e => setDateCol(e.target.value || null)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.borderLight}`,
                        background: C.bg, color: C.text, fontSize: 13, ...body, cursor: "pointer",
                      }}>
                      <option value="">No time axis</option>
                      {data.dateCols.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {data.categoryCols.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Filter size={14} color={C.textSec} />
                    <select value={categoryCol || ""} onChange={e => setCategoryCol(e.target.value || null)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.borderLight}`,
                        background: C.bg, color: C.text, fontSize: 13, ...body, cursor: "pointer",
                      }}>
                      <option value="">No breakdown</option>
                      {data.categoryCols.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Stat Cards */}
            {stats.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                {stats.map((s, i) => (
                  <StatCard
                    key={s.name} label={s.name} value={s.total}
                    change={s.change} icon={s.icon}
                    prefix={s.prefix} suffix={s.suffix}
                    delay={i * 0.06}
                  />
                ))}
              </div>
            )}

            {/* Charts Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>

              {/* Time Series Area Chart */}
              {chartData.length > 0 && selectedMetrics.length > 0 && (
                <ChartCard title="Performance Over Time" span={2} delay={0.1}>
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        {selectedMetrics.map((m, i) => (
                          <linearGradient key={m} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="_name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={{ stroke: C.borderLight }} />
                      <YAxis tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      {selectedMetrics.map((m, i) => (
                        <Area key={m} type="monotone" dataKey={m} name={m}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                          fill={`url(#grad-${i})`} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Bar Chart by Category */}
              {categoryData.length > 0 && selectedMetrics.length > 0 && (
                <ChartCard title={`By ${categoryCol}`} delay={0.2}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData.slice(0, 10)} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={{ stroke: C.borderLight }}
                        angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      {selectedMetrics.slice(0, 3).map((m, i) => (
                        <Bar key={m} dataKey={m} name={m} fill={CHART_COLORS[i % CHART_COLORS.length]}
                          radius={[4, 4, 0, 0]} barSize={categoryData.length > 6 ? 16 : 28} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Pie Chart */}
              {pieData.length > 0 && (
                <ChartCard title={`${selectedMetrics[0]} Distribution`} delay={0.25}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={60} outerRadius={110} paddingAngle={2}
                        stroke="none" animationDuration={800}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(val) => <span style={{ color: C.textSec, fontSize: 12, ...body }}>{val}</span>}
                        iconSize={8} iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Metrics Comparison Bar */}
              {stats.length >= 2 && (
                <ChartCard title="Metrics Comparison" span={categoryData.length > 0 && pieData.length > 0 ? 1 : 2} delay={0.3}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={stats.map(s => ({ name: s.name, value: s.total }))}
                      layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                        {stats.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Trend Lines */}
              {chartData.length > 0 && selectedMetrics.length >= 2 && (
                <ChartCard title="Trend Comparison" span={2} delay={0.35}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="_name" tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={{ stroke: C.borderLight }} />
                      <YAxis tick={{ fontSize: 11, fill: C.textSec }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      {selectedMetrics.map((m, i) => (
                        <Line key={m} type="monotone" dataKey={m} name={m}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                          dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {/* Raw Data Preview */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ ...body, fontSize: 15, fontWeight: 600, color: C.text }}>Raw Data</h3>
                <button onClick={() => setView("table")}
                  style={{
                    fontSize: 13, color: C.info, fontWeight: 500, background: "none",
                    border: "none", cursor: "pointer", ...body,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                  View full table <ArrowUpRight size={14} />
                </button>
              </div>
              <DataTable headers={data.headers} rows={data.rows.slice(0, 30)} numericCols={data.numericCols} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
