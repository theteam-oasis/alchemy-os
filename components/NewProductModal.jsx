"use client";
// New Product modal used by both the team workspace and the client portal.
// Two modes:
//   Express:  paste a product page URL, AI scrapes name/description/etc.
//   Manual:   fill the fields by hand
// Either way, you can upload product images before saving.

import { useState, useRef } from "react";
import { X, Sparkles, Upload, Loader2, RefreshCw, Plus } from "lucide-react";
import { COLORS, hd, mono, btnPrimary, btnSecondary } from "@/lib/design";
import { supabase } from "@/lib/supabase";

export default function NewProductModal({ open, onClose, clientId, onCreated }) {
  const [mode, setMode] = useState("express"); // "express" | "manual"
  const [expressUrl, setExpressUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [problemsSolved, setProblemsSolved] = useState("");
  const [uniqueFeatures, setUniqueFeatures] = useState([""]);
  const [pricePoint, setPricePoint] = useState("");
  const [productUrl, setProductUrl] = useState("");

  // Image management - urls already saved to storage + new ones to upload
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const reset = () => {
    setMode("express"); setExpressUrl(""); setScraping(false); setScrapeError("");
    setName(""); setDescription(""); setTargetMarket(""); setProblemsSolved("");
    setUniqueFeatures([""]); setPricePoint(""); setProductUrl("");
    setImageUrls([]); setUploading(false); setSaving(false); setSaveError("");
  };

  if (!open) return null;

  const runExpress = async () => {
    if (!expressUrl.trim()) return;
    setScraping(true); setScrapeError("");
    try {
      const res = await fetch("/api/products/scrape", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: expressUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setScrapeError(data?.error || "Couldn't scrape that page."); return; }
      const p = data.product || {};
      setName(p.name || "");
      setDescription(p.description || "");
      setTargetMarket(p.targetMarket || "");
      setProblemsSolved(p.problemsSolved || "");
      setUniqueFeatures(p.uniqueFeatures?.length ? p.uniqueFeatures : [""]);
      setPricePoint(p.pricePoint || "");
      setProductUrl(p.productUrl || expressUrl.trim());
      // Preload candidate images so the user can pick which to keep
      if (Array.isArray(p.candidateImageUrls)) setImageUrls(p.candidateImageUrls);
      // Switch to manual so the user reviews what was extracted
      setMode("manual");
    } catch (e) {
      setScrapeError(e?.message || "Network error");
    } finally { setScraping(false); }
  };

  const uploadImages = async (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0 || !supabase) return;
    setUploading(true);
    try {
      const results = await Promise.all(arr.map(async (file) => {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `products/${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: false });
        if (error) return null;
        const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
        return publicUrl;
      }));
      const ok = results.filter(Boolean);
      if (ok.length > 0) setImageUrls((prev) => [...prev, ...ok]);
    } finally { setUploading(false); }
  };

  const removeImage = (url) => setImageUrls((prev) => prev.filter((u) => u !== url));

  const submit = async () => {
    if (!name.trim()) { setSaveError("Product name is required."); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: name.trim(),
          description: description.trim() || undefined,
          targetMarket: targetMarket.trim() || undefined,
          problemsSolved: problemsSolved.trim() || undefined,
          uniqueFeatures: uniqueFeatures.map((f) => f.trim()).filter(Boolean),
          pricePoint: pricePoint.trim() || undefined,
          productUrl: productUrl.trim() || undefined,
          productImageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data?.error || "Failed to create product."); setSaving(false); return; }
      onCreated?.(data.product);
      reset();
      onClose?.();
    } catch (e) {
      setSaveError(e?.message || "Network error"); setSaving(false);
    }
  };

  const close = () => { reset(); onClose?.(); };

  const inputBase = {
    ...mono, width: "100%", padding: "10px 14px", fontSize: 13,
    border: `1px solid ${COLORS.border}`, borderRadius: 10, outline: "none",
    background: COLORS.bg, color: COLORS.text, boxSizing: "border-box",
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.bg, borderRadius: 18, width: 640, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ ...hd, fontSize: 24, color: COLORS.text }}>Add a product</h3>
            <p style={{ ...mono, fontSize: 12, color: COLORS.textSec, marginTop: 2 }}>Tell us what we're working on so we can build the right creatives.</p>
          </div>
          <button onClick={close} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: "14px 24px 0" }}>
          <div style={{ display: "flex", gap: 4, background: "#F5F5F7", padding: 3, borderRadius: 980, border: `1px solid ${COLORS.border}`, width: "fit-content" }}>
            {[{ k: "express", l: "Express (paste URL)" }, { k: "manual", l: "Manual" }].map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)}
                style={{ ...mono, padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: mode === m.k ? 600 : 500, cursor: "pointer", border: "none",
                  background: mode === m.k ? COLORS.ink : "transparent",
                  color: mode === m.k ? "#fff" : COLORS.textSec,
                }}>{m.l}</button>
            ))}
          </div>
        </div>

        {/* Body - scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "express" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ ...mono, fontSize: 11, fontWeight: 600, color: COLORS.textSec, textTransform: "uppercase", letterSpacing: "0.05em" }}>Product page URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={expressUrl} onChange={(e) => setExpressUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runExpress(); }}
                  placeholder="https://yourbrand.com/products/example"
                  style={inputBase} disabled={scraping} />
                <button onClick={runExpress} disabled={scraping || !expressUrl.trim()}
                  style={{ ...btnPrimary, opacity: scraping || !expressUrl.trim() ? 0.5 : 1, cursor: scraping || !expressUrl.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                  {scraping ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Scanning...</> : <><Sparkles size={13} /> Auto-fill</>}
                </button>
              </div>
              {scrapeError && <p style={{ ...mono, fontSize: 12, color: COLORS.reject, marginTop: 4 }}>{scrapeError}</p>}
              <p style={{ ...mono, fontSize: 11, color: COLORS.textTer, marginTop: 4, lineHeight: 1.5 }}>
                We&apos;ll fetch the page, pull the product info, and prefill the manual form. You can review and edit before saving.
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {mode === "manual" && (
            <>
              <Field label="Product name *">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hydra Boost Serum" style={inputBase} />
              </Field>
              <Field label="What is it?" hint="One or two sentences. What does it do?">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={2} placeholder="A weightless serum that hydrates skin for 24 hours..."
                  style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <Field label="Target market" hint="Who is it for?">
                <textarea value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}
                  rows={2} placeholder="Women 25-45 with dry skin, prefer clean ingredients..."
                  style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <Field label="Problems it solves" hint="What pain does it relieve?">
                <textarea value={problemsSolved} onChange={(e) => setProblemsSolved(e.target.value)}
                  rows={2} placeholder="Dehydrated skin, tight feeling after cleansing..."
                  style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <Field label="Unique features" hint="What sets it apart? Add a few bullet points.">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {uniqueFeatures.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 6 }}>
                      <input value={f}
                        onChange={(e) => setUniqueFeatures((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        placeholder={`Feature ${i + 1}`} style={inputBase} />
                      {uniqueFeatures.length > 1 && (
                        <button onClick={() => setUniqueFeatures((prev) => prev.filter((_, idx) => idx !== i))}
                          style={{ width: 38, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textSec, cursor: "pointer" }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setUniqueFeatures((prev) => [...prev, ""])}
                    style={{ ...mono, alignSelf: "flex-start", padding: "5px 12px", fontSize: 11, fontWeight: 600, color: COLORS.textSec, background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: 980, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Plus size={11} /> Add feature
                  </button>
                </div>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Price point">
                  <input value={pricePoint} onChange={(e) => setPricePoint(e.target.value)}
                    placeholder="$49 / Mid-range / etc." style={inputBase} />
                </Field>
                <Field label="Product URL">
                  <input value={productUrl} onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://..." style={inputBase} />
                </Field>
              </div>

              {/* Product images */}
              <Field label="Product images" hint={imageUrls.length === 0 ? "Upload high-res shots of the product." : `${imageUrls.length} image${imageUrls.length === 1 ? "" : "s"}`}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {imageUrls.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", background: "#F5F5F7", border: `1px solid ${COLORS.border}` }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button onClick={() => removeImage(url)}
                        style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#888", color: "#fff", border: "2px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()}
                    style={{ aspectRatio: "1/1", borderRadius: 10, border: `2px dashed ${COLORS.border}`, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: COLORS.textTer, cursor: "pointer" }}>
                    {uploading ? <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> : <Upload size={18} />}
                    <span style={{ ...mono, fontSize: 10 }}>{uploading ? "Uploading..." : "Add image"}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                    onChange={(e) => { uploadImages(e.target.files); e.target.value = ""; }} />
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ ...mono, fontSize: 12, color: saveError ? COLORS.reject : COLORS.textTer }}>
            {saveError || (mode === "express" ? "Or use Manual to fill it in yourself." : "")}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={close} style={btnSecondary}>Cancel</button>
            <button onClick={submit} disabled={saving || !name.trim()}
              style={{ ...btnPrimary, opacity: saving || !name.trim() ? 0.5 : 1, cursor: saving || !name.trim() ? "not-allowed" : "pointer" }}>
              {saving ? "Adding..." : "Add product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ ...mono, fontSize: 11, fontWeight: 600, color: COLORS.textSec, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ ...mono, fontSize: 11, color: COLORS.textTer, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}
