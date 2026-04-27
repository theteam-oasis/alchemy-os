"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, AlertCircle, Sparkles } from "lucide-react";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000", text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", danger: "#FF3B30",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh" }} />}><LoginForm /></Suspense>;
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/portal";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/portal/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { router.push(redirect); router.refresh(); }
    else { setError(true); setLoading(false); }
  };

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 40, width: 400, maxWidth: "90vw", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#00000008", border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={20} color={G.text} />
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ ...hd, fontSize: 24, color: G.text, margin: 0, marginBottom: 8 }}>Feedback Portal</h1>
          <p style={{ ...mono, fontSize: 14, color: G.textSec, margin: 0 }}>Enter password to continue</p>
        </div>

        <input type="password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder="Password"
          style={{ ...mono, width: "100%", padding: "12px 16px", fontSize: 14, border: `1px solid ${error ? G.danger : G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", transition: "border-color 0.15s" }}
          autoFocus />

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: G.danger, fontSize: 13, marginTop: -16 }}>
            <AlertCircle size={14} /> Incorrect password
          </div>
        )}

        <button type="submit" disabled={loading || !password}
          style={{ ...mono, width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 600, background: G.gold, color: "#FFFFFF", border: "none", borderRadius: 10, cursor: "pointer", transition: "opacity 0.15s", opacity: loading || !password ? 0.5 : 1 }}>
          {loading ? "Verifying..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
