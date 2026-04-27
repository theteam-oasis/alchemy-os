"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Lock,
  Upload,
  CheckCircle,
  AlertCircle,
  Link,
  Image,
  FileText,
  Loader2,
  Copy,
  ExternalLink,
  X,
  Plus,
  FlaskConical,
  Send,
  Sparkles,
  Check,
} from "lucide-react";

// ─── Design Tokens ───

const G = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E8E8ED",
  cardShadow:
    "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000",
  goldSoft: "#00000008",
  goldBorder: "#D2D2D7",
  text: "#1D1D1F",
  textSec: "#86868B",
  textTer: "#AEAEB2",
  border: "#E8E8ED",
  success: "#34C759",
  danger: "#FF3B30",
};

const hd = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

const mono = {
  fontFamily: "'Inter', -apple-system, sans-serif",
};

// ─── Helpers ───

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Component ───

/* ── /samples Chatbot Panel ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        position: "absolute", top: 8, right: 8,
        background: "#F0F0F0", border: "1px solid #E0E0E0", borderRadius: 6,
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

function renderChatMessage(text) {
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
          <div key={idx++} style={{ position: "relative", margin: "8px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #E8E8ED", background: "#FAFAFA" }}>
            <CopyBtn text={code} />
            <pre style={{ padding: "12px", margin: 0, fontSize: 12, lineHeight: 1.55, color: "#333", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", ...mono }}>{code}</pre>
          </div>
        );
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
    } else if (inCode) {
      codeBuffer.push(line);
    } else if (/^\d+\.\s\*\*/.test(line) || /^\*\*\d+\./.test(line)) {
      const clean = line.replace(/\*\*/g, "");
      parts.push(<p key={idx++} style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "14px 0 2px", ...mono }}>{clean}</p>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      parts.push(<p key={idx++} style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", margin: "10px 0 2px", ...mono }}>{line.replace(/\*\*/g, "")}</p>);
    } else if (line.startsWith("- ")) {
      parts.push(<p key={idx++} style={{ fontSize: 12, color: "#86868B", margin: "1px 0 1px 10px", lineHeight: 1.5, ...mono }}>{line}</p>);
    } else if (line.startsWith("---")) {
      parts.push(<div key={idx++} style={{ height: 1, background: "#E8E8ED", margin: "10px 0" }} />);
    } else if (line.trim() === "") {
      parts.push(<div key={idx++} style={{ height: 4 }} />);
    } else {
      parts.push(<p key={idx++} style={{ fontSize: 12, color: "#555", lineHeight: 1.55, margin: "2px 0", ...mono }}>{line}</p>);
    }
  }
  if (inCode && codeBuffer.length > 0) {
    const code = codeBuffer.join("\n");
    parts.push(
      <div key={idx++} style={{ position: "relative", margin: "8px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #E8E8ED", background: "#FAFAFA" }}>
        <pre style={{ padding: "12px", margin: 0, fontSize: 12, lineHeight: 1.55, color: "#333", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", ...mono }}>{code}</pre>
      </div>
    );
  }
  return parts;
}

function SamplesChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
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
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
        return updated;
      });
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: 16, border: "none",
          background: "#1D1D1F", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 32px rgba(0,0,0,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)"; }}
      >
        {open ? <X size={22} /> : <FlaskConical size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 9998,
          width: 420, height: 600, maxHeight: "calc(100vh - 120px)",
          borderRadius: 20, overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid #E0E0E0",
          boxShadow: "0 12px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
          display: "flex", flexDirection: "column",
          animation: "chatSlideUp 0.25s ease-out",
        }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8E8ED", display: "flex", alignItems: "center", gap: 10, background: "#FAFAFA" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#00000008", border: "1px solid #D2D2D7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FlaskConical size={16} style={{ color: "#1D1D1F" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...hd, fontSize: 16, color: "#1D1D1F", lineHeight: 1.2 }}>Sample Prompts</p>
              <p style={{ fontSize: 10, color: "#86868B", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1, ...mono }}>Alchemy Prompt Engine</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 980, background: "#00000006", border: "1px solid #D2D2D7" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D1D1F" }} />
              <span style={{ fontSize: 10, color: "#1D1D1F", fontWeight: 600, ...mono }}>Ready</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 12px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#00000008", border: "1px solid #D2D2D7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Sparkles size={22} style={{ color: "#1D1D1F" }} />
                </div>
                <p style={{ ...hd, fontSize: 20, color: "#1D1D1F", marginBottom: 8 }}>Generate 6 Sample Prompts</p>
                <p style={{ fontSize: 12, color: "#86868B", lineHeight: 1.5, maxWidth: 300, margin: "0 auto 20px", ...mono }}>
                  Enter a brand URL below. You'll get 6 scene prompts ready to paste into your image model with the product reference image.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                  {[
                    { n: "1", t: "Enter the brand website URL" },
                    { n: "2", t: "Get 6 scene prompts: Bold Claim, Hero, Social Proof, Editorial, Offer, Lifestyle" },
                    { n: "3", t: "Copy each prompt, paste into image model with the product reference image attached" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: "#00000008", border: "1px solid #D2D2D7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#1D1D1F", flexShrink: 0, ...mono }}>{s.n}</span>
                      <span style={{ fontSize: 12, color: "#555", ...mono }}>{s.t}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "#00000004", border: "1px solid #E8E8ED", textAlign: "left" }}>
                  <p style={{ fontSize: 10, color: "#1D1D1F", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, ...mono }}>Example</p>
                  <p style={{ fontSize: 11, color: "#86868B", lineHeight: 1.5, ...mono }}>raoptics.com</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ padding: "10px 14px", borderRadius: "14px 14px 4px 14px", background: "#F0F0F0", maxWidth: "85%" }}>
                      <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.45, whiteSpace: "pre-wrap", ...mono }}>{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#00000008", border: "1px solid #D2D2D7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <FlaskConical size={12} style={{ color: "#1D1D1F" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {msg.content ? renderChatMessage(msg.content) : (
                        <div style={{ display: "flex", gap: 4, padding: "6px 0" }}>
                          {[0, 1, 2].map(d => (
                            <div key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D1D1F", animation: "chatPulse 1.2s ease-in-out infinite", animationDelay: `${d * 0.2}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #E8E8ED", background: "#FAFAFA" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="brandurl.com"
                rows={1}
                style={{
                  flex: 1, resize: "none", padding: "10px 14px", borderRadius: 12,
                  background: "#fff", border: "1px solid #E0E0E0", color: "#1D1D1F",
                  fontSize: 13, lineHeight: 1.45, outline: "none", ...mono,
                  transition: "border-color 0.2s", minHeight: 42, maxHeight: 100,
                }}
                onFocus={e => e.target.style.borderColor = "#1D1D1F"}
                onBlur={e => e.target.style.borderColor = "#E0E0E0"}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={{
                  width: 42, height: 42, borderRadius: 12, border: "none",
                  background: input.trim() && !loading ? "#1D1D1F" : "#E8E8ED",
                  color: input.trim() && !loading ? "#fff" : "#AEAEB2",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}
              >
                {loading ? <Loader2 size={16} style={{ animation: "chatSpin 1s linear infinite" }} /> : <Send size={16} />}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 10, color: "#AEAEB2", marginTop: 6, ...mono }}>
              Bold Claim → Product Hero → Social Proof → Editorial → Offer → Lifestyle
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chatPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes chatSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default function ProposalCreatePage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const imageSlots = [
    { label: "Bold Claim Ad", description: "Eye-catching stat or claim" },
    { label: "Product Hero", description: "Hero product shot, clean background" },
    { label: "Social Proof Ad", description: "Reviews, testimonials, trust" },
    { label: "Editorial", description: "Styled, magazine-quality shot" },
    { label: "Offer Ad", description: "Promo, discount, or CTA" },
    { label: "Lifestyle", description: "Product in real-life context" },
  ];
  const [imageUrls, setImageUrls] = useState(Array(6).fill(null));
  const [uploading, setUploading] = useState(Array(6).fill(false));
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate slug from brand name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(brandName));
    }
  }, [brandName, slugEdited]);

  // ─── Password Gate ───

  function handleAuth(e) {
    e.preventDefault();
    if (password === "alchemy2024") {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  // ─── Image Upload ───

  async function handleImageUpload(file, slotIndex) {
    if (!file || !slug) return;

    setUploading((prev) => {
      const updated = [...prev];
      updated[slotIndex] = true;
      return updated;
    });

    try {
      const ext = file.name.split(".").pop();
      const path = `proposals/${slug}/${Date.now()}-${slotIndex}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("brand-assets").getPublicUrl(path);

      setImageUrls((prev) => {
        const updated = [...prev];
        updated[slotIndex] = publicUrl;
        return updated;
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploading((prev) => {
        const updated = [...prev];
        updated[slotIndex] = false;
        return updated;
      });
    }
  }

  function removeImage(index) {
    setImageUrls((prev) => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
  }

  // ─── Submit ───

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          slug,
          images: imageUrls.filter(Boolean),
          videoUrl: "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const proposalUrl = result
    ? `scalewithalchemy.com/proposal/${result.slug || slug}`
    : null;

  // ─── Password Screen ───

  if (!authed) {
    return (
      <div
        style={{
          ...mono,
          minHeight: "100vh",
          background: G.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form
          onSubmit={handleAuth}
          style={{
            background: G.card,
            border: `1px solid ${G.cardBorder}`,
            boxShadow: G.cardShadow,
            borderRadius: 16,
            padding: 40,
            width: 400,
            maxWidth: "90vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: G.goldSoft,
              border: `1px solid ${G.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={20} color={G.text} />
          </div>

          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                ...hd,
                fontSize: 24,
                color: G.text,
                margin: 0,
                marginBottom: 8,
              }}
            >
              Proposal Creator
            </h1>
            <p style={{ ...mono, fontSize: 14, color: G.textSec, margin: 0 }}>
              Enter password to continue
            </p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPwError(false);
            }}
            placeholder="Password"
            style={{
              ...mono,
              width: "100%",
              padding: "12px 16px",
              fontSize: 14,
              border: `1px solid ${pwError ? G.danger : G.border}`,
              borderRadius: 10,
              outline: "none",
              background: G.bg,
              color: G.text,
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            autoFocus
          />

          {pwError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: G.danger,
                fontSize: 13,
                marginTop: -16,
              }}
            >
              <AlertCircle size={14} />
              Incorrect password
            </div>
          )}

          <button
            type="submit"
            style={{
              ...mono,
              width: "100%",
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              background: G.gold,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // ─── Main Form ───

  const inputStyle = {
    ...mono,
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    border: `1px solid ${G.border}`,
    borderRadius: 10,
    outline: "none",
    background: G.bg,
    color: G.text,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    ...mono,
    fontSize: 13,
    fontWeight: 600,
    color: G.text,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };


  return (
    <>
    <div
      style={{
        ...mono,
        minHeight: "100vh",
        background: G.bg,
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1
            style={{
              ...hd,
              fontSize: 32,
              color: G.text,
              margin: 0,
              marginBottom: 8,
            }}
          >
            Create Proposal
          </h1>
          <p style={{ ...mono, fontSize: 14, color: G.textSec, margin: 0 }}>
            Build a custom brand proposal page
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: G.card,
            border: `1px solid ${G.cardBorder}`,
            boxShadow: G.cardShadow,
            borderRadius: 16,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Brand Name */}
          <div>
            <label style={labelStyle}>
              <FileText size={14} color={G.textSec} />
              Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Acme Beauty"
              style={inputStyle}
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>
              <Link size={14} color={G.textSec} />
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugEdited(true);
              }}
              placeholder="auto-generated-from-name"
              style={inputStyle}
              required
            />
            <p
              style={{
                ...mono,
                fontSize: 12,
                color: G.textTer,
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              scalewithalchemy.com/proposal/{slug || "..."}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Image Uploads */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 16 }}>
              <Image size={14} color={G.textSec} />
              Creative Images ({imageUrls.filter(Boolean).length}/6)
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {imageSlots.map((slot, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {imageUrls[i] ? (
                    <>
                      <div
                        style={{
                          height: 140,
                          border: `1px solid ${G.success}40`,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: `${G.success}08`,
                        }}
                      >
                        <img
                          src={imageUrls[i]}
                          alt={slot.label}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 11,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: G.text,
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : uploading[i] ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 140,
                        border: `1px dashed ${G.goldBorder}`,
                        borderRadius: 12,
                        background: G.goldSoft,
                      }}
                    >
                      <Loader2
                        size={20}
                        color={G.textSec}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    </div>
                  ) : (
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 140,
                        border: `1px dashed ${G.goldBorder}`,
                        borderRadius: 12,
                        background: G.goldSoft,
                        cursor: slug ? "pointer" : "not-allowed",
                        opacity: slug ? 1 : 0.5,
                        transition: "border-color 0.15s",
                        padding: "8px",
                        textAlign: "center",
                      }}
                    >
                      <Upload size={18} color={G.textTer} />
                      <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.text }}>{slot.label}</span>
                      <span style={{ ...mono, fontSize: 10, color: G.textTer, lineHeight: 1.3 }}>{slot.description}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e.target.files?.[0], i);
                          e.target.value = "";
                        }}
                        style={{
                          position: "absolute",
                          width: 0,
                          height: 0,
                          opacity: 0,
                        }}
                        disabled={!slug}
                      />
                    </label>
                  )}
                  <div style={{ marginTop: 6, textAlign: "center" }}>
                    <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: imageUrls[i] ? G.success : G.textTer }}>{i + 1}. {slot.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {!slug && brandName === "" && (
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: G.textTer,
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                Enter a brand name first to enable uploads
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                background: `${G.danger}08`,
                border: `1px solid ${G.danger}20`,
                borderRadius: 10,
                color: G.danger,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !brandName || !slug}
            style={{
              ...mono,
              width: "100%",
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 600,
              background: submitting || !brandName || !slug ? G.textTer : G.gold,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              cursor:
                submitting || !brandName || !slug ? "not-allowed" : "pointer",
              transition: "background 0.15s, opacity 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Creating...
              </>
            ) : (
              "Create Proposal"
            )}
          </button>
        </form>

        {/* Success Result */}
        {result && (
          <div
            style={{
              marginTop: 24,
              background: G.card,
              border: `1px solid ${G.success}30`,
              boxShadow: G.cardShadow,
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle size={20} color={G.success} />
              <span
                style={{
                  ...mono,
                  fontSize: 15,
                  fontWeight: 600,
                  color: G.text,
                }}
              >
                Proposal Created
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                background: G.goldSoft,
                border: `1px solid ${G.border}`,
                borderRadius: 10,
              }}
            >
              <ExternalLink size={14} color={G.textSec} />
              <span
                style={{
                  ...mono,
                  fontSize: 13,
                  color: G.text,
                  flex: 1,
                  wordBreak: "break-all",
                }}
              >
                {proposalUrl}
              </span>
              <button
                onClick={() => handleCopy(proposalUrl)}
                style={{
                  ...mono,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: copied ? G.success : G.gold,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <Copy size={12} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a
              href={`https://${proposalUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...mono,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 600,
                background: G.gold,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} />
              View Proposal
            </a>
          </div>
        )}
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
    {/* ── /samples Chatbot ── */}
    <SamplesChat />
    </>
  );
}
