"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

const COLORS = {
  team: { bg: "#1D1D1F", text: "#FFFFFF" },
  client: { bg: "#F5F5F7", text: "#1D1D1F" },
};

const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };

export default function PortalChat({ projectId, sender = "client", brandName = "", clientId = null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("oracle"); // "oracle" | "insights" | "chat"
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  // Brand-scoped Oracle state (mirrors the team-side Oracle but client-only)
  const [oracleMessages, setOracleMessages] = useState([]);
  const [oracleDraft, setOracleDraft] = useState("");
  const [oracleSending, setOracleSending] = useState(false);
  const [oracleInsights, setOracleInsights] = useState([]);
  const [insightsPatterns, setInsightsPatterns] = useState([]);
  const [insightsHasData, setInsightsHasData] = useState(true);
  const [insightsDashSlug, setInsightsDashSlug] = useState(null);
  const oracleScrollRef = useRef(null);

  // Pre-fetch insights on mount (not just when the tab is opened) so the
  // Insights panel renders instantly. Refresh every 60s.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/client-oracle/insights?clientId=${clientId}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (Array.isArray(d?.insights)) setOracleInsights(d.insights);
          if (Array.isArray(d?.patterns)) setInsightsPatterns(d.patterns);
          setInsightsHasData(d?.hasData !== false);
          setInsightsDashSlug(d?.dashboardSlug || null);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [clientId]);

  useEffect(() => {
    if (oracleScrollRef.current) oracleScrollRef.current.scrollTop = oracleScrollRef.current.scrollHeight;
  }, [oracleMessages, oracleSending]);

  const askOracle = async (override) => {
    const q = (typeof override === "string" ? override : oracleDraft).trim();
    if (!q || oracleSending || !clientId) return;
    const next = [...oracleMessages, { role: "user", content: q }];
    setOracleMessages(next);
    setOracleDraft("");
    setOracleSending(true);
    try {
      const res = await fetch("/api/client-oracle", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, question: q, history: oracleMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOracleMessages([...next, { role: "assistant", content: `Sorry, ${data?.error || "something went wrong"}.` }]);
      } else {
        setOracleMessages([...next, { role: "assistant", content: data.answer || "(no response)" }]);
      }
    } catch (e) {
      setOracleMessages([...next, { role: "assistant", content: `Network error: ${e.message}` }]);
    } finally { setOracleSending(false); }
  };

  const ORACLE_SUGGESTIONS = brandName ? [
    `What's ${brandName}'s brand voice in one sentence?`,
    "Who is our target audience?",
    "What's the latest creative status?",
    "Summarize our recent feedback",
  ] : [
    "What's our brand voice?",
    "Who is our target audience?",
    "What's the latest creative status?",
    "Summarize our recent feedback",
  ];

  // Press feedback for the toggle pill
  const [dockPress, setDockPress] = useState(false);
  const flashPress = () => { setDockPress(true); setTimeout(() => setDockPress(false), 280); };

  // Slot rotation: oracle → insights → chat → oracle.
  // Panel CLOSED → just open whichever slot was clicked (don't advance).
  // Panel OPEN + active slot click → advance to next.
  // Panel OPEN + inactive slot click → jump to it.
  const TAB_ORDER = ["oracle", "insights", "chat"];
  const goTo = (slot) => {
    flashPress();
    if (!open) {
      setTab(slot);
      setOpen(true);
      return;
    }
    if (slot === tab) {
      const idx = TAB_ORDER.indexOf(tab);
      setTab(TAB_ORDER[(idx + 1) % TAB_ORDER.length]);
    } else {
      setTab(slot);
    }
  };

  const teamLabel = "The Alchemy Team";
  const clientLabel = brandName ? `The ${brandName} Team` : "Client";

  const fetchMessages = useCallback(async (after) => {
    if (!projectId) return;
    const url = `/api/portal/messages?projectId=${projectId}${after ? `&after=${after}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (after && data.length > 0) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const fresh = data.filter(m => !ids.has(m.id));
          if (fresh.length > 0 && !openRef.current) {
            setUnread(u => u + fresh.filter(m => m.sender !== sender).length);
          }
          return [...prev, ...fresh];
        });
      } else if (!after) {
        setMessages(data);
      }
    } catch {}
  }, [projectId, sender]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll every 4s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      setMessages(prev => {
        const last = prev.length > 0 ? prev[prev.length - 1].created_at : null;
        fetchMessages(last);
        return prev;
      });
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Scroll to bottom on new messages or open
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages.length, open]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sender, message: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          return ids.has(msg.id) ? prev : [...prev, msg];
        });
      }
    } catch {}
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return isToday ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  return (
    <>
      {/* Slow translucent splash radiating from the pill - same as team */}
      <style>{`
        @keyframes dockPulseClient {
          0%   { transform: scale(1);    opacity: 0.9; }
          75%  { transform: scale(2.05); opacity: 0; }
          100% { transform: scale(2.2);  opacity: 0; }
        }
        @keyframes chatLivePulseClient {
          0%   { transform: scale(1);    box-shadow: 0 0 8px rgba(0,255,106,0.85), 0 0 0 0 rgba(0,255,106,0.65); opacity: 1; }
          50%  { transform: scale(1.25); box-shadow: 0 0 14px rgba(0,255,106,1),    0 0 0 8px rgba(0,255,106,0); opacity: 0.85; }
          100% { transform: scale(1);    box-shadow: 0 0 8px rgba(0,255,106,0.85), 0 0 0 0 rgba(0,255,106,0);    opacity: 1; }
        }
      `}</style>

      {/* Mirrored dock - same shape, blur, pulse rings, slide indicator and
          spring animation as the team DashboardChat. Two slots: Oracle | Chat.
          The Oracle here is brand-scoped (only knows this client's data). */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9998,
        transform: `scale(${dockPress ? 0.97 : 1})`,
        transition: "transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)",
      }}>
        {/* Comet trail moved AFTER the pill (below) so it draws on top */}
        <div style={{
          position: "relative", display: "flex", height: 45,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderRadius: 999, padding: 3,
          boxShadow: "0 14px 40px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.55), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}>
          {/* Sliding indicator (54×39 oval) - 3 slots: Oracle / Insights / Chat */}
          <div style={{
            position: "absolute", top: 3, bottom: 3, width: 54,
            left: tab === "oracle" ? 3 : tab === "insights" ? 57 : 111,
            background: "linear-gradient(135deg, #1F1F23, #050505)",
            borderRadius: 999,
            boxShadow: "0 3px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition: "left 0.48s cubic-bezier(0.65, 0, 0.35, 1)",
            zIndex: 0,
          }} />

          {/* Oracle (LEFT) */}
          <button
            onClick={() => goTo("oracle")}
            aria-label="Oracle"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent", border: "none", cursor: "pointer",
              color: tab === "oracle" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            {/* IDENTICAL to the team-side dock - constellation of 4 stars */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ overflow: "visible" }}>
              <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
              <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
              <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
              <circle cx="14" cy="2" r="0.6" opacity="0.6" />
            </svg>
          </button>

          {/* Insights (MIDDLE) */}
          <button
            onClick={() => goTo("insights")}
            aria-label="Insights"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent", border: "none", cursor: "pointer",
              color: tab === "insights" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="20" x2="6" y2="12" />
              <line x1="12" y1="20" x2="12" y2="6" />
              <line x1="18" y1="20" x2="18" y2="14" />
            </svg>
          </button>

          {/* Chat (RIGHT) */}
          <button
            onClick={() => goTo("chat")}
            aria-label="Chat"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent", border: "none", cursor: "pointer",
              color: tab === "chat" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            {unread > 0 && !open && (
              <span style={{
                position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%",
                background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", ...mono,
                border: "2px solid #fff",
              }}>{unread > 9 ? "9+" : unread}</span>
            )}
          </button>
        </div>
        {/* Comet trail removed */}
      </div>

      {/* Oracle panel - brand-scoped AI assistant for this client */}
      {open && tab === "oracle" && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, width: 380, maxWidth: "calc(100vw - 48px)",
          height: 520, maxHeight: "calc(100vh - 140px)",
          background: "#FFFFFF", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header - black background with white text/icons */}
          <div style={{
            padding: "16px 52px 16px 20px",
            background: "linear-gradient(180deg, #1D1D1F, #0A0A0A)",
            color: "#fff",
            display: "flex", alignItems: "center", gap: 12, position: "relative",
          }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "transparent", border: `1px solid rgba(255,255,255,0.2)`, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {/* Same 4-star constellation as the pill icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ overflow: "visible" }}>
                <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
                <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
                <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
                <circle cx="14" cy="2" r="0.6" opacity="0.6" />
              </svg>
            </div>
            <div>
              <p style={{ ...hd, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.1 }}>{brandName ? `${brandName} Oracle` : "Brand Oracle"}</p>
              <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>AI brand strategist for your account</p>
            </div>
          </div>

          {/* "New conversation" toolbar - only after a chat has started */}
          {oracleMessages.length > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #E8E8ED", background: "#fff", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setOracleMessages([])}
                style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#86868B", background: "transparent", border: "1px solid #E8E8ED", borderRadius: 980, cursor: "pointer" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                New conversation
              </button>
            </div>
          )}
          {/* Messages area */}
          <div ref={oracleScrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "#FAFAFA" }}>
            {oracleMessages.length === 0 && !oracleSending && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 12px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #000, #1D1D1F)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{ overflow: "visible" }}>
                    <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
                    <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
                    <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
                    <circle cx="14" cy="2" r="0.6" opacity="0.6" />
                  </svg>
                </div>
                <p style={{ ...hd, fontSize: 20, color: "#1D1D1F", marginBottom: 6 }}>Hi, I&apos;m your Oracle</p>
                <p style={{ ...mono, fontSize: 12, color: "#86868B", lineHeight: 1.5, marginBottom: 16, maxWidth: 280 }}>
                  I know your brand kit, products, creatives, and recent activity. Ask me anything about your account.
                </p>

                {/* Live insights moved to their own tab in the dock - keep
                    Oracle's empty state focused on the AI prompts. */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 320 }}>
                  {ORACLE_SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => askOracle(s)}
                      style={{ ...mono, padding: "9px 12px", fontSize: 12, fontWeight: 500, color: "#1D1D1F", background: "#fff", border: "1px solid #E8E8ED", borderRadius: 980, cursor: "pointer", textAlign: "left" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {oracleMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{
                  padding: "9px 13px", borderRadius: 14,
                  background: m.role === "user" ? "#1D1D1F" : "#fff",
                  color: m.role === "user" ? "#fff" : "#1D1D1F",
                  ...mono, fontSize: 13, lineHeight: 1.55,
                  boxShadow: m.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>{m.content}</div>
              </div>
            ))}
            {oracleSending && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{ padding: "10px 13px", borderRadius: 14, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: 3, background: "#AEAEB2", animation: `oracleTypingC 1.4s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); askOracle(); }}
            style={{ padding: "10px 12px 12px", background: "#fff", borderTop: "1px solid #E8E8ED", display: "flex", gap: 8, alignItems: "center" }}>
            <input value={oracleDraft} onChange={(e) => setOracleDraft(e.target.value)}
              placeholder="Ask Oracle anything..." disabled={oracleSending}
              style={{ ...mono, flex: 1, minWidth: 0, padding: "9px 12px", fontSize: 13, border: "1px solid #E8E8ED", borderRadius: 12, outline: "none", background: "#FAFAFA", color: "#1D1D1F" }} />
            <button type="submit" disabled={oracleSending || !oracleDraft.trim()}
              style={{ ...mono, width: 38, height: 38, borderRadius: 12, border: "none",
                background: oracleDraft.trim() && !oracleSending ? "#1D1D1F" : "#E8E8ED",
                color: oracleDraft.trim() && !oracleSending ? "#fff" : "#AEAEB2",
                cursor: oracleDraft.trim() && !oracleSending ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </form>
          <style>{`@keyframes oracleTypingC { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }`}</style>
        </div>
      )}

      {/* Insights panel - reuses /api/client-oracle/insights data */}
      {open && tab === "insights" && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, width: 380, maxWidth: "calc(100vw - 48px)",
          height: 520, maxHeight: "calc(100vh - 140px)",
          background: "#FFFFFF", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "16px 52px 16px 20px", background: "linear-gradient(180deg, #1D1D1F, #0A0A0A)", color: "#fff", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "transparent", border: `1px solid rgba(255,255,255,0.2)`, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg>
            </div>
            <div>
              <p style={{ ...hd, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.1 }}>Insights</p>
              <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>Live performance snapshot</p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#FAFAFA", display: "flex", flexDirection: "column", gap: 10 }}>
            {!insightsHasData ? (
              // No dashboard data uploaded yet - clicking dispatches an event the
              // parent client portal listens for, which switches the sidebar to
              // Analytics in-page (no new tab, no external nav).
              <button
                onClick={() => {
                  setOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("portal:nav", { detail: { section: "analytics" } }));
                  }
                }}
                style={{ background: "#fff", border: "1px solid #E8E8ED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", width: "100%" }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #000, #1D1D1F)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p style={{ ...hd, fontSize: 20, color: "#1D1D1F", margin: 0, lineHeight: 1.2 }}>Upload your campaign data</p>
                <p style={{ ...mono, fontSize: 12, color: "#86868B", lineHeight: 1.55, margin: 0, maxWidth: 260 }}>
                  Drop a CSV from Meta, Google, or TikTok in the Analytics dashboard. Once it's there, Oracle starts surfacing live insights.
                </p>
                <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#fff", background: "#1D1D1F", padding: "8px 16px", borderRadius: 980, marginTop: 4 }}>
                  Open Analytics →
                </span>
              </button>
            ) : oracleInsights.length === 0 && insightsPatterns.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#AEAEB2" }}>
                <p style={{ ...mono, fontSize: 13 }}>Loading insights...</p>
              </div>
            ) : (
              <>
                {oracleInsights.length > 0 && (
                  <>
                    <p style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEAEB2", marginBottom: 4 }}>Live snapshot</p>
                    {oracleInsights.map((ins, i) => (
                      <button key={i}
                        onClick={() => { setTab("oracle"); askOracle(`Tell me more about: ${ins.headline}`); }}
                        style={{ background: "#fff", border: "1px solid #E8E8ED", borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{ins.icon || "✨"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...mono, fontSize: 13, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.35, margin: 0 }}>{ins.headline}</p>
                          {ins.body && <p style={{ ...mono, fontSize: 12, color: "#86868B", lineHeight: 1.5, marginTop: 4 }}>{ins.body}</p>}
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {insightsPatterns.length > 0 && (
                  <>
                    <p style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEAEB2", marginTop: 14, marginBottom: 4 }}>Patterns</p>
                    {insightsPatterns.map((pat, i) => (
                      <button key={`p-${i}`}
                        onClick={() => { setTab("oracle"); askOracle(`Why is "${pat.rows[0]?.label}" the top performing ${pat.column?.toLowerCase()}? What's the pattern across the rest, and what should we double down on?`); }}
                        style={{ background: "#fff", border: "1px solid #E8E8ED", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <p style={{ ...mono, fontSize: 12, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.3, margin: 0 }}>{pat.title}</p>
                          <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: "#86868B", letterSpacing: "0.04em", textTransform: "uppercase" }}>by {pat.column}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {pat.rows.map((r, j) => (
                            <div key={j} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0", borderBottom: j < pat.rows.length - 1 ? "1px solid #F5F5F7" : "none" }}>
                              <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: j === 0 ? "#30A46C" : "#86868B", flexShrink: 0, width: 14 }}>{j + 1}.</span>
                              <span style={{ ...mono, fontSize: 12, color: "#1D1D1F", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                              <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#1D1D1F", flexShrink: 0 }}>{r.metric}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat panel - shown when tab === "chat" */}
      {open && tab === "chat" && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, width: 380, maxWidth: "calc(100vw - 48px)",
          height: 520, maxHeight: "calc(100vh - 140px)",
          background: "#FFFFFF", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header - black background to match Oracle / Insights */}
          <div style={{
            padding: "18px 52px 18px 20px",
            background: "linear-gradient(180deg, #1D1D1F, #0A0A0A)",
            color: "#fff",
            display: "flex", alignItems: "center", gap: 12, position: "relative",
          }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "transparent", border: `1px solid rgba(255,255,255,0.2)`, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "#00FF6A", flexShrink: 0, boxShadow: "0 0 8px rgba(0,255,106,0.7)",
              animation: "chatLivePulseClient 2.4s ease-in-out infinite",
            }} />
            <div>
              <p style={{ ...mono, fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Chat</p>
              <p style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                {sender === "team" ? `Messaging as ${teamLabel}` : `Message ${teamLabel}`}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...mono, fontSize: 13, color: "#AEAEB2", textAlign: "center", lineHeight: 1.6 }}>
                  No messages yet.<br />Start the conversation.
                </p>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.sender === sender;
              const showTime = i === 0 || (new Date(m.created_at) - new Date(messages[i-1].created_at)) > 300000;
              const label = m.sender === "team" ? teamLabel : clientLabel;
              return (
                <div key={m.id}>
                  {showTime && (
                    <p style={{ ...mono, fontSize: 10, color: "#AEAEB2", textAlign: "center", margin: "12px 0 6px" }}>
                      {formatTime(m.created_at)}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "10px 14px", borderRadius: 16,
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: isMe ? 16 : 4,
                      background: COLORS[m.sender].bg,
                      color: COLORS[m.sender].text,
                    }}>
                      {!isMe && (
                        <p style={{ ...mono, fontSize: 10, fontWeight: 700, color: m.sender === "team" ? "#ffffffaa" : "#86868B", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {label}
                        </p>
                      )}
                      <p style={{ ...mono, fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #E8E8ED" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#F5F5F7", borderRadius: 14, padding: "8px 8px 8px 14px",
              border: "1px solid #E8E8ED",
            }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message..."
                rows={1}
                style={{
                  ...mono, flex: 1, fontSize: 14, color: "#1D1D1F", background: "transparent",
                  border: "none", outline: "none", resize: "none", lineHeight: 1.5,
                  maxHeight: 100, padding: "4px 0",
                }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                style={{
                  width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
                  background: draft.trim() ? "#1D1D1F" : "#D2D2D7", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s", flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
