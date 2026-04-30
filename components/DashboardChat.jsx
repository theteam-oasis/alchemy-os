"use client";
import { useState, useEffect, useRef, useCallback } from "react";
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };

export default function DashboardChat() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("oracle"); // "oracle" | "insights" | "inbox"
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const openRef = useRef(open);
  const prevCountRef = useRef(0);
  const activeConvoRef = useRef(null);

  // Oracle (team AI assistant) state
  const [oracleMessages, setOracleMessages] = useState([]);
  const [oracleDraft, setOracleDraft] = useState("");
  const [oracleSending, setOracleSending] = useState(false);
  const oracleScrollRef = useRef(null);

  // Dock press feedback - briefly scales the whole dock for a tactile feel
  const dockRef = useRef(null);
  const [dockPress, setDockPress] = useState(false);
  const flashPress = () => {
    setDockPress(true);
    setTimeout(() => setDockPress(false), 160);
  };

  // Performance insights for the Insights tab. Pre-fetched on mount and
  // refreshed every 60s so the panel renders instantly when opened.
  const [insights, setInsights] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/team-oracle/insights")
        .then(r => r.json())
        .then(d => { if (!cancelled && Array.isArray(d?.insights)) setInsights(d.insights); })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Slot rotation order: oracle → insights → inbox → oracle.
  // Clicking a slot:
  //   - If it's the active slot, advance to the next.
  //   - If it's not active, jump directly to that slot.
  const TAB_ORDER = ["oracle", "insights", "inbox"];
  const goTo = (slot) => {
    flashPress();
    setActiveConvo(null);
    if (slot === tab) {
      const idx = TAB_ORDER.indexOf(tab);
      setTab(TAB_ORDER[(idx + 1) % TAB_ORDER.length]);
    } else {
      setTab(slot);
    }
    setOpen(true);
  };

  useEffect(() => {
    if (oracleScrollRef.current) oracleScrollRef.current.scrollTop = oracleScrollRef.current.scrollHeight;
  }, [oracleMessages, oracleSending]);

  // Accepts an optional override text so suggestion chips can send directly
  // without going through the oracleDraft state (which may not have flushed yet).
  const askOracle = async (override) => {
    const q = (typeof override === "string" ? override : oracleDraft).trim();
    if (!q || oracleSending) return;
    const next = [...oracleMessages, { role: "user", content: q }];
    setOracleMessages(next);
    setOracleDraft("");
    setOracleSending(true);
    try {
      const res = await fetch("/api/team-oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: oracleMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOracleMessages([...next, { role: "assistant", content: `Sorry, ${data?.error || "something went wrong"}.` }]);
      } else {
        setOracleMessages([...next, { role: "assistant", content: data.answer || "(no response)" }]);
      }
    } catch (e) {
      setOracleMessages([...next, { role: "assistant", content: `Network error: ${e.message}` }]);
    } finally {
      setOracleSending(false);
    }
  };

  const ORACLE_SUGGESTIONS = [
    "Which clients haven't been reviewed in 5+ days?",
    "Summarize this week's activity",
    "Who needs attention right now?",
    "What's Muze working on?",
  ];

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/messages/all");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data);
      // Count total unread (client messages)
      const totalClient = data.reduce((sum, c) => sum + (c.messages || []).filter(m => m.sender === "client").length, 0);
      if (totalClient > prevCountRef.current && !openRef.current) {
        setUnread(u => u + (totalClient - prevCountRef.current));
      }
      prevCountRef.current = totalClient;
      // Update active convo messages if one is selected
      const current = activeConvoRef.current;
      if (current) {
        const updated = data.find(c => c.projectId === current.projectId);
        if (updated) setActiveConvo(updated);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => {
    const iv = setInterval(loadConversations, 5000);
    return () => clearInterval(iv);
  }, [loadConversations]);

  useEffect(() => {
    if (open && activeConvo) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [activeConvo?.messages?.length, open]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || !activeConvo) return;
    setSending(true);
    setDraft("");
    try {
      await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeConvo.projectId, sender: "team", message: text }),
      });
      await loadConversations();
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
      <style>{`
        @keyframes chatPulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes chatPulse2 {
          0% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        /* Splash radius reduced 25% - tighter blast around the pill */
        @keyframes dockPulse {
          0%   { transform: scale(1);    opacity: 0.9; }
          75%  { transform: scale(2.05); opacity: 0; }
          100% { transform: scale(2.2);  opacity: 0; }
        }
        /* Slow soft pulse for the bright green "live" status dot */
        @keyframes chatLivePulse {
          0%   { transform: scale(1);    box-shadow: 0 0 8px rgba(0,255,106,0.85), 0 0 0 0 rgba(0,255,106,0.65); opacity: 1; }
          50%  { transform: scale(1.25); box-shadow: 0 0 14px rgba(0,255,106,1),    0 0 0 8px rgba(0,255,106,0); opacity: 0.85; }
          100% { transform: scale(1);    box-shadow: 0 0 8px rgba(0,255,106,0.85), 0 0 0 0 rgba(0,255,106,0);    opacity: 1; }
        }
      `}</style>

      {/* Floating slide-switch dock - sleeker pill with Oracle + Chat icons.
          ANY click toggles to the other mode (no "click active to close").
          Animation is intentionally slow + buttery - cubic-bezier(0.65, 0, 0.35, 1)
          gives it a long sigmoid curve that feels seductive, not snappy. */}
      <div ref={dockRef} style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9998,
        transform: `scale(${dockPress ? 0.97 : 1})`,
        transition: "transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)",
      }}>
        {/* Comet trail rendered AFTER the pill so the gradient stroke draws
            ON TOP of the pill rim. ~40px streak on a ~388px perimeter, with
            a faded comet-tail gradient. */}
        <div style={{
          position: "relative", display: "flex", height: 45,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderRadius: 999, padding: 3,
          boxShadow: "0 14px 40px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.55), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}>

          {/* Sliding indicator (54×39 oval) - now 3 slots: Oracle / Insights / Chat */}
          <div style={{
            position: "absolute", top: 3, bottom: 3, width: 54,
            left: tab === "oracle" ? 3 : tab === "insights" ? 57 : 111,
            background: "linear-gradient(135deg, #1F1F23, #050505)",
            borderRadius: 999,
            boxShadow: "0 3px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition: "left 0.48s cubic-bezier(0.65, 0, 0.35, 1)",
            zIndex: 0,
          }} />

          {/* Three slots. Click an inactive slot → jump to it. Click the
              active slot → rotate to the next (Oracle → Insights → Chat → Oracle). */}
          {/* Oracle (LEFT) */}
          <button
            onClick={() => goTo("oracle")}
            aria-label="Oracle"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent",
              border: "none", cursor: "pointer",
              color: tab === "oracle" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            {/* Constellation: a primary 4-point sparkle, plus 3 satellite sparks of varying sizes */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ overflow: "visible" }}>
              {/* Primary sparkle - center-left, large */}
              <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
              {/* Top-right satellite, medium */}
              <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
              {/* Bottom-right tiny spark */}
              <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
              {/* Tiny dot near top */}
              <circle cx="14" cy="2" r="0.6" opacity="0.6" />
            </svg>
          </button>

          {/* Insights (MIDDLE) - dashboard-style performance insights */}
          <button
            onClick={() => goTo("insights")}
            aria-label="Insights"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent",
              border: "none", cursor: "pointer",
              color: tab === "insights" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            {/* Bar chart / insights icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="20" x2="6" y2="12" />
              <line x1="12" y1="20" x2="12" y2="6" />
              <line x1="18" y1="20" x2="18" y2="14" />
            </svg>
          </button>

          {/* Chat (RIGHT) */}
          <button
            onClick={() => goTo("inbox")}
            aria-label="Chat"
            style={{
              position: "relative", zIndex: 1, width: 54, height: 39,
              borderRadius: 999, background: "transparent",
              border: "none", cursor: "pointer",
              color: tab === "inbox" ? "#fff" : "#9A9AA0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
              padding: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {unread > 0 && !open && (
              <span style={{
                position: "absolute", top: -2, right: -2, width: 15, height: 15, borderRadius: "50%",
                background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", ...mono,
                border: "2px solid #fff",
              }}>{unread > 9 ? "9+" : unread}</span>
            )}
          </button>
        </div>
        {/* Comet trail removed - pill stays clean with no perimeter animation */}
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, width: 400, maxWidth: "calc(100vw - 48px)",
          height: 560, maxHeight: "calc(100vh - 140px)",
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
            {/* X close button - absolute top right of the panel header */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute", top: 12, right: 12,
                width: 28, height: 28, borderRadius: "50%",
                background: "transparent", border: `1px solid rgba(255,255,255,0.2)`,
                color: "rgba(255,255,255,0.7)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {activeConvo ? (
              <>
                <button onClick={() => setActiveConvo(null)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.7)",
                  display: "flex", alignItems: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, ...mono }}>
                  {(activeConvo.clientName || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...mono, fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{activeConvo.clientName}</p>
                  <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.55)", margin: 0 }}>/portal/{activeConvo.slug}</p>
                </div>
              </>
            ) : (
              <>
                {tab === "oracle" ? (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #000, #1D1D1F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {/* Same constellation as the dock pill */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ overflow: "visible" }}>
                        <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
                        <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
                        <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
                        <circle cx="14" cy="2" r="0.6" opacity="0.6" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ ...hd, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.1 }}>Alchemy Oracle</p>
                      <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>AI assistant. Knows every client.</p>
                    </div>
                  </>
                ) : tab === "insights" ? (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #000, #1D1D1F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg>
                    </div>
                    <div>
                      <p style={{ ...hd, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.1 }}>Insights</p>
                      <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>Live snapshot across all clients</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Slow-pulsing live indicator (keyframes defined at top) */}
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: "#00FF6A", flexShrink: 0, boxShadow: "0 0 8px rgba(0,255,106,0.7)",
                      animation: "chatLivePulse 2.4s ease-in-out infinite",
                    }} />
                    <div>
                      <p style={{ ...mono, fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Inbox</p>
                      <p style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>All client conversations</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mode switching now lives on the floating dock (icon-level slide
              switch). Inside the panel we just render the active mode's
              content directly. */}

          {/* Oracle content - shown when tab is oracle and not in a conversation */}
          {!activeConvo && tab === "oracle" && (
            <>
              {/* "Back to suggestions" toolbar - only shows once a conversation has started */}
              {oracleMessages.length > 0 && (
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #E8E8ED", background: "#fff", display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setOracleMessages([])}
                    style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#86868B", background: "transparent", border: "1px solid #E8E8ED", borderRadius: 980, cursor: "pointer" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                    New conversation
                  </button>
                </div>
              )}
              <div ref={oracleScrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "#FAFAFA" }}>
                {oracleMessages.length === 0 && !oracleSending && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 12px", textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #000, #1D1D1F)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{ overflow: "visible" }}>
                        <path d="M10 4c.3 0 .55.2.65.5l1.05 3.05a2.6 2.6 0 0 0 1.65 1.65l3.05 1.05c.3.1.5.35.5.65 0 .3-.2.55-.5.65l-3.05 1.05a2.6 2.6 0 0 0-1.65 1.65L10.65 17.3c-.1.3-.35.5-.65.5-.3 0-.55-.2-.65-.5L8.3 14.25a2.6 2.6 0 0 0-1.65-1.65L3.6 11.55c-.3-.1-.5-.35-.5-.65 0-.3.2-.55.5-.65L6.65 9.2A2.6 2.6 0 0 0 8.3 7.55L9.35 4.5c.1-.3.35-.5.65-.5z" />
                        <path d="M18.5 3c.18 0 .33.12.4.3l.45 1.3a1.5 1.5 0 0 0 .94.94l1.3.45c.18.07.3.22.3.4 0 .18-.12.33-.3.4l-1.3.45a1.5 1.5 0 0 0-.94.94l-.45 1.3c-.07.18-.22.3-.4.3-.18 0-.33-.12-.4-.3l-.45-1.3a1.5 1.5 0 0 0-.94-.94l-1.3-.45c-.18-.07-.3-.22-.3-.4 0-.18.12-.33.3-.4l1.3-.45a1.5 1.5 0 0 0 .94-.94l.45-1.3c.07-.18.22-.3.4-.3z" opacity="0.92" />
                        <path d="M19.5 16.5c.13 0 .24.08.28.2l.27.78a.9.9 0 0 0 .57.57l.78.27c.12.04.2.15.2.28 0 .13-.08.24-.2.28l-.78.27a.9.9 0 0 0-.57.57l-.27.78c-.04.12-.15.2-.28.2-.13 0-.24-.08-.28-.2l-.27-.78a.9.9 0 0 0-.57-.57l-.78-.27c-.12-.04-.2-.15-.2-.28 0-.13.08-.24.2-.28l.78-.27a.9.9 0 0 0 .57-.57l.27-.78c.04-.12.15-.2.28-.2z" opacity="0.78" />
                        <circle cx="14" cy="2" r="0.6" opacity="0.6" />
                      </svg>
                    </div>
                    <p style={{ ...hd, fontSize: 20, color: "#1D1D1F", marginBottom: 6 }}>Hi, I&apos;m Oracle</p>
                    <p style={{ ...mono, fontSize: 12, color: "#86868B", lineHeight: 1.5, marginBottom: 16, maxWidth: 280 }}>
                      I have live access to every client, intake, creative portal, dashboard, and recent activity. Ask me anything.
                    </p>
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
                        <div key={i} style={{ width: 5, height: 5, borderRadius: 3, background: "#AEAEB2", animation: `oracleTyping 1.4s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); askOracle(); }}
                style={{ padding: "10px 12px 12px", background: "#fff", borderTop: "1px solid #E8E8ED", display: "flex", gap: 8, alignItems: "center" }}>
                <input value={oracleDraft} onChange={(e) => setOracleDraft(e.target.value)}
                  placeholder="Ask Oracle anything..."
                  disabled={oracleSending}
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
              <style>{`@keyframes oracleTyping { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }`}</style>
            </>
          )}

          {/* Insights tab - aggregated performance + needs-attention cards */}
          {!activeConvo && tab === "insights" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#FAFAFA", display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#AEAEB2" }}>
                  <p style={{ ...mono, fontSize: 13 }}>Loading insights...</p>
                </div>
              ) : (
                <>
                  <p style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEAEB2", marginBottom: 4 }}>Live snapshot</p>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #E8E8ED", borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{ins.icon || "✨"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...mono, fontSize: 13, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.35, margin: 0 }}>{ins.headline}</p>
                        {ins.body && <p style={{ ...mono, fontSize: 12, color: "#86868B", lineHeight: 1.5, marginTop: 4 }}>{ins.body}</p>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Content - inbox tab (conversation list) */}
          {!activeConvo && tab === "inbox" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ ...mono, fontSize: 13, color: "#AEAEB2" }}>Loading...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: 8 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p style={{ ...mono, fontSize: 13, color: "#AEAEB2" }}>No conversations yet</p>
                  <p style={{ ...mono, fontSize: 11, color: "#D2D2D7", marginTop: 4 }}>Client messages will appear here</p>
                </div>
              ) : conversations.map(conv => (
                <div
                  key={conv.projectId}
                  onClick={() => setActiveConvo(conv)}
                  style={{
                    padding: "14px 20px", cursor: "pointer", borderBottom: "1px solid #F5F5F7",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5F5F7"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#007AFF15", display: "flex", alignItems: "center", justifyContent: "center", color: "#007AFF", fontSize: 14, fontWeight: 700, flexShrink: 0, ...mono }}>
                      {(conv.clientName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{conv.clientName}</span>
                        {conv.lastMessage && (
                          <span style={{ ...mono, fontSize: 10, color: "#AEAEB2", flexShrink: 0 }}>
                            {new Date(conv.lastMessage.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p style={{ ...mono, fontSize: 12, color: "#86868B", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {conv.lastMessage.sender === "team" ? "You: " : ""}{conv.lastMessage.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Content - active conversation thread (independent of tab) */}
          {activeConvo && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                {(activeConvo.messages || []).length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ ...mono, fontSize: 13, color: "#AEAEB2", textAlign: "center", lineHeight: 1.6 }}>
                      No messages yet.<br />Start the conversation.
                    </p>
                  </div>
                )}
                {(activeConvo.messages || []).map((m, i) => {
                  const isTeam = m.sender === "team";
                  const msgs = activeConvo.messages || [];
                  const showTime = i === 0 || (new Date(m.created_at) - new Date(msgs[i-1].created_at)) > 300000;
                  return (
                    <div key={m.id}>
                      {showTime && (
                        <p style={{ ...mono, fontSize: 10, color: "#AEAEB2", textAlign: "center", margin: "12px 0 6px" }}>
                          {formatTime(m.created_at)}
                        </p>
                      )}
                      <div style={{ display: "flex", justifyContent: isTeam ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: "80%", padding: "10px 14px", borderRadius: 16,
                          borderBottomRightRadius: isTeam ? 4 : 16,
                          borderBottomLeftRadius: isTeam ? 16 : 4,
                          background: isTeam ? "#1D1D1F" : "#F5F5F7",
                          color: isTeam ? "#fff" : "#1D1D1F",
                        }}>
                          {!isTeam && (
                            <p style={{ ...mono, fontSize: 10, fontWeight: 700, color: "#86868B", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              The {activeConvo.clientName} Team
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

              {/* Reply input */}
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
                    placeholder="Reply as The Alchemy Team..."
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
            </>
          )}
        </div>
      )}
    </>
  );
}
