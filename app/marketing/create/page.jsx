"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, Check, Loader2, ArrowRight, X, Lock } from "lucide-react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  card: "#FFFFFF", cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  accent: "#000000", accentSoft: "#00000010",
  success: "#34C759", danger: "#FF3B30",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const body = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

function CreateDashboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const presetClientId = params.get("clientId");

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(presetClientId || "");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [parsed, setParsed] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
    // Load clients from CRM
    fetch("/api/clients-list").catch(() => null); // try a summary endpoint if exists
    // Fallback to direct supabase query via a simpler route would need auth — use existing portal endpoint pattern
  }, []);

  useEffect(() => {
    // Load clients via Supabase directly (already wired in lib/supabase)
    import("@/lib/supabase").then(({ getClients }) => {
      if (getClients) {
        getClients().then((list) => {
          if (Array.isArray(list)) {
            setClients(list);
            if (presetClientId) {
              const found = list.find((c) => c.id === presetClientId);
              if (found) setClientName(found.name);
            }
          }
        });
      }
    });
  }, [presetClientId]);

  // Keep clientName in sync when client is selected
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c) setClientName(c.name);
  }, [clientId, clients]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setError(null);
    Papa.parse(file, {
      complete: (results) => {
        const headers = results.data[0];
        const rows = results.data.slice(1).filter((r) => r.some((c) => c && String(c).trim()));
        setParsed({ headers, rows, fileName: file.name });
      },
      skipEmptyLines: true,
    });
  }, []);

  const submit = async () => {
    if (!clientName || !parsed) {
      setError("Select a client and upload a CSV");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Inject a Product column into the rows so additional products can be added later cleanly.
      // If the CSV already has a Product column, leave it alone.
      const productLabel = (productName || "").trim() || (title || `${clientName} Primary`).toString().trim();
      let outHeaders = [...parsed.headers];
      let outRows = parsed.rows;
      const existingProductIdx = outHeaders.findIndex(h => h && String(h).toLowerCase() === "product");
      if (existingProductIdx === -1) {
        // Insert Product column right after Date if present, otherwise at the start
        const dateIdx = outHeaders.findIndex(h => h && String(h).toLowerCase() === "date");
        const insertAt = dateIdx >= 0 ? dateIdx + 1 : 0;
        outHeaders = [...outHeaders.slice(0, insertAt), "Product", ...outHeaders.slice(insertAt)];
        outRows = parsed.rows.map(r => {
          const copy = [...r];
          copy.splice(insertAt, 0, productLabel);
          return copy;
        });
      }

      const res = await fetch("/api/marketing-dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          clientName,
          title: title || `${clientName} Dashboard`,
          description,
          fileName: parsed.fileName,
          headers: outHeaders,
          rows: outRows,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      router.push(`/marketing/${json.dashboard.slug}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...body }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <header style={{
        borderBottom: `1px solid ${C.borderLight}`, padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/" style={{ ...hd, fontSize: 22, color: C.text, textDecoration: "none" }}>Alchemy</a>
          <div style={{ width: 1, height: 24, background: C.borderLight }} />
          <div style={{ fontSize: 14, color: C.textSec, fontWeight: 500 }}>Create Marketing Dashboard</div>
        </div>
        {presetClientId && (
          <a href={`/clients/${presetClientId}`} style={{
            fontSize: 13, color: C.textSec, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 4,
          }}>← Back to client</a>
        )}
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 80px" }}>
        <div style={{ marginBottom: 32, animation: "fadeSlideUp 0.4s ease both" }}>
          <h1 style={{ ...hd, fontSize: 40, color: C.text, marginBottom: 8, lineHeight: 1.1 }}>
            Create dashboard
          </h1>
          <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.55 }}>
            Upload a CSV of marketing data. It will be linked to the client's profile and accessible via a private URL.
          </p>
        </div>

        {/* Client selector */}
        <div style={{ marginBottom: 20, animation: "fadeSlideUp 0.4s ease 0.05s both" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            Client <span style={{ color: C.danger }}>*</span>
          </label>
          {presetClientId ? (
            <div style={{
              padding: "12px 16px", background: C.bgSoft,
              border: `1px solid ${C.borderLight}`, borderRadius: 12,
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 14, color: C.text,
            }}>
              <Lock size={14} color={C.textSec} />
              <span style={{ fontWeight: 500 }}>{clientName || "Loading..."}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: C.textTer, fontFamily: "monospace" }}>
                {presetClientId.slice(0, 8)}
              </span>
            </div>
          ) : (
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                border: `1px solid ${C.borderLight}`, background: C.bgSoft,
                fontSize: 14, color: C.text, ...body, cursor: "pointer", outline: "none",
              }}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 20, animation: "fadeSlideUp 0.4s ease 0.1s both" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            Dashboard title
          </label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={clientName ? `${clientName} Performance` : "e.g. Q1 2026 Meta Ads"}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${C.borderLight}`, background: C.bgSoft,
              fontSize: 14, color: C.text, ...body, outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
            onBlur={(e) => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* First product name */}
        <div style={{ marginBottom: 20, animation: "fadeSlideUp 0.4s ease 0.13s both" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            First product name <span style={{ color: C.textTer, fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Glow Serum"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${C.borderLight}`, background: C.bgSoft,
              fontSize: 14, color: C.text, ...body, outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
            onBlur={(e) => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
          />
          <div style={{ fontSize: 11, color: C.textSec, marginTop: 6, lineHeight: 1.4 }}>
            Tag this CSV's rows with a product label. You can add more products later from the dashboard.
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20, animation: "fadeSlideUp 0.4s ease 0.15s both" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            Description <span style={{ color: C.textTer, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief notes about this dataset — date range, campaign context, etc."
            rows={2}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${C.borderLight}`, background: C.bgSoft,
              fontSize: 14, color: C.text, ...body, outline: "none", resize: "vertical",
              minHeight: 60,
            }}
            onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
            onBlur={(e) => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* CSV Upload */}
        <div style={{ marginBottom: 24, animation: "fadeSlideUp 0.4s ease 0.2s both" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            CSV Data <span style={{ color: C.danger }}>*</span>
          </label>
          {!parsed ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.accent : C.border}`,
                borderRadius: 16, padding: "40px 32px", textAlign: "center", cursor: "pointer",
                background: dragOver ? C.accentSoft : C.bgSoft, transition: "all 0.2s ease",
              }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])} />
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: C.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", boxShadow: C.cardShadow,
              }}>
                <Upload size={20} color={C.accent} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 4 }}>
                Drop your CSV here
              </div>
              <div style={{ fontSize: 13, color: C.textSec }}>
                Meta, Google Ads, TikTok or any platform export
              </div>
            </div>
          ) : (
            <div style={{
              padding: "16px 20px", borderRadius: 12,
              background: C.bgSoft, border: `1px solid ${C.borderLight}`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: C.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: C.cardShadow,
              }}>
                <FileSpreadsheet size={18} color={C.success} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 2 }}>
                  {parsed.fileName}
                </div>
                <div style={{ fontSize: 12, color: C.textSec }}>
                  {parsed.rows.length} rows · {parsed.headers.length} columns
                </div>
              </div>
              <button onClick={() => setParsed(null)} style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "transparent", color: C.textSec, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSec; }}
              ><X size={16} /></button>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 16,
            background: "#FF3B3012", color: C.danger, fontSize: 13, fontWeight: 500,
            border: `1px solid #FF3B3025`,
          }}>{error}</div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", gap: 10, animation: "fadeSlideUp 0.4s ease 0.25s both" }}>
          <button onClick={submit} disabled={submitting || !clientName || !parsed}
            style={{
              flex: 1, padding: "14px 28px", borderRadius: 980, border: "none",
              background: (!submitting && clientName && parsed) ? C.accent : C.bgHover,
              color: (!submitting && clientName && parsed) ? "#fff" : C.textTer,
              fontSize: 15, fontWeight: 500, cursor: (!submitting && clientName && parsed) ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              ...body, transition: "all 0.15s",
            }}>
            {submitting ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Creating…</> : <>Create dashboard <ArrowRight size={16} /></>}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}

export default function CreateDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, fontFamily: "system-ui" }}>Loading...</div>}>
      <CreateDashboardInner />
    </Suspense>
  );
}
