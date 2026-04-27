"use client";
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, X, Loader2, ArrowRight } from "lucide-react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  accent: "#000000", accentSoft: "#00000010",
  success: "#34C759", danger: "#FF3B30",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const body = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

/**
 * AddProductModal
 *
 * Props:
 * - open: boolean. show/hide
 * - onClose: () => void
 * - slug: string. dashboard slug to add product to
 * - onSuccess: (resultJson) => void. called after API success
 */
export default function AddProductModal({ open, onClose, slug, onSuccess }) {
  const [productName, setProductName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

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
        const rows = results.data.slice(1).filter(r => r.some(c => c && String(c).trim()));
        setParsed({ headers, rows, fileName: file.name });
      },
      skipEmptyLines: true,
    });
  }, []);

  const reset = () => {
    setProductName("");
    setParsed(null);
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => { reset(); onClose?.(); };

  const submit = async () => {
    if (!productName.trim()) { setError("Product name is required"); return; }
    if (!parsed) { setError("Upload a CSV"); return; }
    if (!slug) { setError("Missing dashboard slug"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing-dashboards/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          productName: productName.trim(),
          headers: parsed.headers,
          rows: parsed.rows,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to add product");
      onSuccess?.(json);
      handleClose();
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "modalFade 0.2s ease",
      }}
    >
      <style>{`
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg, borderRadius: 18,
          width: "100%", maxWidth: 520,
          padding: "28px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "modalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          ...body,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ ...hd, fontSize: 28, color: C.text, lineHeight: 1.1, marginBottom: 4 }}>
              Add a Product
            </h2>
            <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
              Upload a CSV for a new product. Its data will be merged into this dashboard and filterable from the product tabs.
            </p>
          </div>
          <button onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              background: C.bgSoft, color: C.textSec, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Close"
          ><X size={16} /></button>
        </div>

        {/* Product name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Product name <span style={{ color: C.danger }}>*</span>
          </label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="e.g. Hydrating Toner"
            disabled={submitting}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 11,
              border: `1px solid ${C.borderLight}`, background: C.bgSoft,
              fontSize: 15, color: C.text, ...body, outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
            onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* CSV upload */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            CSV data <span style={{ color: C.danger }}>*</span>
          </label>
          {!parsed ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.accent : C.border}`,
                borderRadius: 14, padding: "28px 20px",
                textAlign: "center", cursor: "pointer",
                background: dragOver ? C.accentSoft : C.bgSoft,
                transition: "all 0.2s",
              }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files?.[0])} />
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: C.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>
                <Upload size={18} color={C.accent} strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>
                Drop CSV here or click to browse
              </div>
              <div style={{ fontSize: 11, color: C.textSec }}>
                Meta, Google Ads, TikTok, or any platform export
              </div>
            </div>
          ) : (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: C.bgSoft, border: `1px solid ${C.borderLight}`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: C.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                flexShrink: 0,
              }}>
                <FileSpreadsheet size={16} color={C.success} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {parsed.fileName}
                </div>
                <div style={{ fontSize: 11, color: C.textSec }}>
                  {parsed.rows.length} rows · {parsed.headers.length} columns
                </div>
              </div>
              <button onClick={() => setParsed(null)} style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: "transparent", color: C.textSec, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}><X size={14} /></button>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, marginBottom: 14,
            background: "#FF3B3012", color: C.danger, fontSize: 12.5, fontWeight: 500,
            border: "1px solid #FF3B3025",
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={handleClose} disabled={submitting}
            style={{
              padding: "11px 20px", borderRadius: 980,
              border: `1px solid ${C.borderLight}`, background: C.bg,
              color: C.text, fontSize: 13, fontWeight: 500, ...body,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting || !productName.trim() || !parsed}
            style={{
              padding: "11px 22px", borderRadius: 980, border: "none",
              background: (!submitting && productName.trim() && parsed) ? C.accent : C.bgHover,
              color: (!submitting && productName.trim() && parsed) ? "#fff" : C.textTer,
              fontSize: 13, fontWeight: 500, ...body,
              cursor: (!submitting && productName.trim() && parsed) ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
            {submitting
              ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Adding…</>
              : <>Add Product <ArrowRight size={14} /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
