"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Lock,
  Upload,
  CheckCircle,
  AlertCircle,
  Link,
  Image,
  Video,
  FileText,
  Loader2,
  Copy,
  ExternalLink,
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

export default function ProposalCreatePage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [images, setImages] = useState([null, null, null]);
  const [imageUrls, setImageUrls] = useState([null, null, null]);
  const [uploading, setUploading] = useState([false, false, false]);

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

  async function handleImageUpload(index, file) {
    if (!file || !slug) return;

    const newUploading = [...uploading];
    newUploading[index] = true;
    setUploading(newUploading);

    try {
      const ext = file.name.split(".").pop();
      const path = `proposals/${slug}/${Date.now()}-${index}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("brand-assets").getPublicUrl(path);

      const newUrls = [...imageUrls];
      newUrls[index] = publicUrl;
      setImageUrls(newUrls);

      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);
    } catch (err) {
      console.error("Upload error:", err);
      setError(`Image ${index + 1} upload failed: ${err.message}`);
    } finally {
      const reset = [...uploading];
      reset[index] = false;
      setUploading(reset);
    }
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
          videoUrl,
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

  const imageLabels = ["Static Image 1", "Static Image 2", "Static Image 3"];

  return (
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
              Static Images (3)
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 140,
                      border: `1px dashed ${
                        imageUrls[i] ? G.success : G.goldBorder
                      }`,
                      borderRadius: 12,
                      background: imageUrls[i]
                        ? `${G.success}08`
                        : G.goldSoft,
                      cursor: uploading[i] ? "wait" : "pointer",
                      overflow: "hidden",
                      position: "relative",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {imageUrls[i] ? (
                      <img
                        src={imageUrls[i]}
                        alt={`Upload ${i + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 11,
                        }}
                      />
                    ) : uploading[i] ? (
                      <Loader2
                        size={20}
                        color={G.textSec}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <>
                        <Upload size={18} color={G.textTer} />
                        <span
                          style={{
                            ...mono,
                            fontSize: 11,
                            color: G.textTer,
                          }}
                        >
                          {imageLabels[i]}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageUpload(i, e.target.files?.[0])
                      }
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                      }}
                      disabled={uploading[i] || !slug}
                    />
                  </label>
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

          {/* Video URL */}
          <div>
            <label style={labelStyle}>
              <Video size={14} color={G.textSec} />
              Video URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://wistia.com/... or YouTube/Vimeo URL"
              style={inputStyle}
            />
          </div>

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
  );
}
