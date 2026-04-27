"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Copy, Check, FlaskConical, Sparkles } from "lucide-react";

/* ── Design tokens (matches Alchemy branding) ── */
const G = {
  bg: "#0A0A0A",
  card: "#141414",
  cardBorder: "#222222",
  cardShadow: "0 1px 4px rgba(0,0,0,0.3)",
  gold: "#C5960A",
  goldSoft: "#C5960A12",
  goldBorder: "#C5960A30",
  text: "#F5F5F7",
  textSec: "#86868B",
  textTer: "#48484A",
  border: "#222222",
  inputBg: "#1A1A1A",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

/* ── Copy button for code blocks ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        position: "absolute", top: 8, right: 8,
        background: "#2A2A2A", border: "1px solid #333", borderRadius: 6,
        padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, color: copied ? "#34C759" : "#999", ...mono,
        transition: "all 0.2s",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ── Parse markdown-style response into blocks ── */
function renderMessage(text) {
  const parts = [];
  const lines = text.split("\n");
  let inCode = false;
  let codeBuffer = [];
  let idx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCode) {
        const code = codeBuffer.join("\n");
        parts.push(
          <div key={idx++} style={{ position: "relative", margin: "12px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${G.cardBorder}`, background: "#0D0D0D" }}>
            <CopyBtn text={code} />
            <pre style={{ padding: "16px 16px 16px 16px", margin: 0, fontSize: 13, lineHeight: 1.6, color: "#E0E0E0", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", ...mono }}>{code}</pre>
          </div>
        );
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
    } else if (inCode) {
      codeBuffer.push(line);
    } else if (line.startsWith("# ")) {
      parts.push(<h2 key={idx++} style={{ ...hd, fontSize: 24, color: G.text, margin: "20px 0 8px" }}>{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      parts.push(<h3 key={idx++} style={{ ...hd, fontSize: 20, color: G.text, margin: "18px 0 6px" }}>{line.slice(3)}</h3>);
    } else if (/^\d+\.\s\*\*/.test(line) || /^\*\*\d+\./.test(line)) {
      const clean = line.replace(/\*\*/g, "");
      parts.push(<h3 key={idx++} style={{ fontSize: 15, fontWeight: 700, color: G.gold, margin: "20px 0 4px", ...mono }}>{clean}</h3>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      parts.push(<p key={idx++} style={{ fontSize: 14, fontWeight: 700, color: G.text, margin: "14px 0 4px", ...mono }}>{line.replace(/\*\*/g, "")}</p>);
    } else if (line.startsWith("- ")) {
      parts.push(<p key={idx++} style={{ fontSize: 13, color: G.textSec, margin: "2px 0 2px 12px", lineHeight: 1.5, ...mono }}>{line}</p>);
    } else if (line.startsWith("---")) {
      parts.push(<div key={idx++} style={{ height: 1, background: G.cardBorder, margin: "16px 0" }} />);
    } else if (line.trim() === "") {
      parts.push(<div key={idx++} style={{ height: 8 }} />);
    } else {
      parts.push(<p key={idx++} style={{ fontSize: 13, color: "#CCCCCC", lineHeight: 1.6, margin: "4px 0", ...mono }}>{line}</p>);
    }
  }
  // Handle unclosed code block (streaming)
  if (inCode && codeBuffer.length > 0) {
    const code = codeBuffer.join("\n");
    parts.push(
      <div key={idx++} style={{ position: "relative", margin: "12px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${G.cardBorder}`, background: "#0D0D0D" }}>
        <pre style={{ padding: "16px", margin: 0, fontSize: 13, lineHeight: 1.6, color: "#E0E0E0", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", ...mono }}>{code}</pre>
      </div>
    );
  }
  return parts;
}

export default function SamplesPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add empty assistant message for streaming
    const assistantMsg = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullText };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
        return updated;
      });
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${G.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        textarea::placeholder { color: #555; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: G.bg, ...mono }}>

        {/* ── Header ── */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FlaskConical size={18} style={{ color: G.gold }} />
            </div>
            <div>
              <h1 style={{ ...hd, fontSize: 20, color: G.text, lineHeight: 1.2 }}>/samples</h1>
              <p style={{ fontSize: 11, color: G.textSec, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>Alchemy Prompt Engine</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 980, background: G.goldSoft, border: `1px solid ${G.goldBorder}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759" }} />
            <span style={{ fontSize: 11, color: G.gold, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Online</span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0" }}>

          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 20px", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Sparkles size={28} style={{ color: G.gold }} />
              </div>
              <h2 style={{ ...hd, fontSize: 32, color: G.text, marginBottom: 12 }}>Generate 6 Sample Prompts</h2>
              <p style={{ fontSize: 14, color: G.textSec, lineHeight: 1.6, maxWidth: 480, marginBottom: 32, ...mono }}>
                Paste a brand URL and describe the product. You'll get 6 locked-order image prompts ready to paste into any AI image model.
              </p>

              <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 560 }}>
                {[
                  { step: "1", title: "Paste the brand URL", desc: "e.g. /samples raoptics.com. describe the product" },
                  { step: "2", title: "Get 6 prompts instantly", desc: "Bold Claim, Product Hero, Social Proof, Editorial, Offer, Lifestyle" },
                  { step: "3", title: "Copy & generate", desc: "Paste each prompt into Nano Banana 2 with the product reference image" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", borderRadius: 12, background: G.card, border: `1px solid ${G.cardBorder}`, textAlign: "left" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: G.gold }}>{s.step}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: G.text, marginBottom: 2, ...mono }}>{s.title}</p>
                      <p style={{ fontSize: 12, color: G.textSec, lineHeight: 1.5, ...mono }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32, padding: "14px 20px", borderRadius: 10, background: "#C5960A0A", border: `1px solid ${G.goldBorder}`, maxWidth: 560, width: "100%" }}>
                <p style={{ fontSize: 12, color: G.gold, fontWeight: 600, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Example prompt</p>
                <p style={{ fontSize: 13, color: G.textSec, lineHeight: 1.5, ...mono }}>
                  /samples raoptics.com. their Ra Optics Potion daylight glasses, black acetate frame with amber lenses, gold Ra logo on temple
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 24, maxWidth: 800, marginLeft: msg.role === "user" ? "auto" : 0, marginRight: msg.role === "user" ? 0 : "auto" }}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "12px 18px", borderRadius: "16px 16px 4px 16px", background: "#1E1E1E", border: `1px solid ${G.cardBorder}`, maxWidth: "80%" }}>
                    <p style={{ fontSize: 14, color: G.text, lineHeight: 1.5, whiteSpace: "pre-wrap", ...mono }}>{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <FlaskConical size={14} style={{ color: G.gold }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {msg.content ? renderMessage(msg.content) : (
                      <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
                        {[0, 1, 2].map(d => (
                          <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: G.gold, animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${d * 0.2}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Input ── */}
        <div style={{ padding: "16px 24px 24px", borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, maxWidth: 800, margin: "0 auto", alignItems: "flex-end" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="/samples brandurl.com. describe the product..."
                rows={1}
                style={{
                  width: "100%", resize: "none", padding: "14px 18px", borderRadius: 14,
                  background: G.inputBg, border: `1px solid ${G.cardBorder}`, color: G.text,
                  fontSize: 14, lineHeight: 1.5, outline: "none", ...mono,
                  transition: "border-color 0.2s",
                  minHeight: 48, maxHeight: 120,
                }}
                onFocus={e => e.target.style.borderColor = G.gold}
                onBlur={e => e.target.style.borderColor = G.cardBorder}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 48, height: 48, borderRadius: 14, border: "none",
                background: input.trim() && !loading ? G.gold : "#2A2A2A",
                color: input.trim() && !loading ? "#000" : "#555",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0,
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: G.textTer, marginTop: 10, ...mono }}>
            Locked 6-shot system. Bold Claim → Product Hero → Social Proof → Editorial → Offer → Lifestyle.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
