"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

export default function DashboardChat() {
  const [open, setOpen] = useState(false);
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
      `}</style>

      {/* Floating chat button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9998 }}>
        {!open && (
          <>
            <div style={{
              position: "absolute", top: 0, left: 0, width: 56, height: 56,
              borderRadius: "50%", border: "2px solid #1D1D1F",
              animation: "chatPulse 2.4s ease-out infinite", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, width: 56, height: 56,
              borderRadius: "50%", border: "2px solid #1D1D1F",
              animation: "chatPulse2 2.4s ease-out 0.8s infinite", pointerEvents: "none",
            }} />
          </>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position: "relative", width: 56, height: 56,
            borderRadius: "50%", background: "#1D1D1F", color: "#fff",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)", transition: "transform 0.2s",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
          {unread > 0 && !open && (
            <span style={{
              position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%",
              background: "#E5484D", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
              alignItems: "center", justifyContent: "center", ...mono,
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, width: 400, maxWidth: "calc(100vw - 48px)",
          height: 560, maxHeight: "calc(100vh - 140px)",
          background: "#FFFFFF", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #E8E8ED",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            {activeConvo ? (
              <>
                <button onClick={() => setActiveConvo(null)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0, color: "#86868B",
                  display: "flex", alignItems: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#007AFF15", display: "flex", alignItems: "center", justifyContent: "center", color: "#007AFF", fontSize: 13, fontWeight: 700, ...mono }}>
                  {(activeConvo.clientName || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...mono, fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{activeConvo.clientName}</p>
                  <p style={{ ...mono, fontSize: 10, color: "#AEAEB2", margin: 0 }}>/portal/{activeConvo.slug}</p>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34C759", flexShrink: 0 }} />
                <div>
                  <p style={{ ...mono, fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Inbox</p>
                  <p style={{ ...mono, fontSize: 11, color: "#86868B", margin: 0 }}>All client conversations</p>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          {!activeConvo ? (
            /* Conversation list */
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
          ) : (
            /* Message thread */
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                {(activeConvo.messages || []).length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ ...mono, fontSize: 13, color: "#AEAEB2", textAlign: "center", lineHeight: 1.6 }}>
                      No messages yet.<br />Start the conversation!
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
