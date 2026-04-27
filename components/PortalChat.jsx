"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

const COLORS = {
  team: { bg: "#1D1D1F", text: "#FFFFFF" },
  client: { bg: "#F5F5F7", text: "#1D1D1F" },
};

export default function PortalChat({ projectId, sender = "client", brandName = "" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

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
      {/* Pulse animation CSS */}
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

      {/* Chat bubble button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9998 }}>
        {/* Radar pulse rings - only when closed */}
        {!open && (
          <>
            <div style={{
              position: "absolute", top: 0, left: 0, width: 56, height: 56,
              borderRadius: "50%", border: "2px solid #1D1D1F",
              animation: "chatPulse 2.4s ease-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, width: 56, height: 56,
              borderRadius: "50%", border: "2px solid #1D1D1F",
              animation: "chatPulse2 2.4s ease-out 0.8s infinite",
              pointerEvents: "none",
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
          position: "fixed", bottom: 92, right: 24, width: 380, maxWidth: "calc(100vw - 48px)",
          height: 520, maxHeight: "calc(100vh - 140px)",
          background: "#FFFFFF", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 20px", borderBottom: "1px solid #E8E8ED",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34C759", flexShrink: 0 }} />
            <div>
              <p style={{ ...mono, fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Chat</p>
              <p style={{ ...mono, fontSize: 11, color: "#86868B", margin: 0 }}>
                {sender === "team" ? `Messaging as ${teamLabel}` : `Message ${teamLabel}`}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...mono, fontSize: 13, color: "#AEAEB2", textAlign: "center", lineHeight: 1.6 }}>
                  No messages yet.<br />Start the conversation!
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
