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
  FileText,
  Loader2,
  Copy,
  ExternalLink,
  X,
  Plus,
  Video,
  Package,
  Calendar,
  Hash,
  Sparkles,
  Trash2,
} from "lucide-react";

// ─── Design Tokens ───

const G = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
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

function extractGoogleDriveId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  return null;
}

// ─── Component ───

export default function DeliverableCreatePage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [clientName, setClientName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");
  const [totalDeliverables, setTotalDeliverables] = useState("");
  const [packageName, setPackageName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [videoLinks, setVideoLinks] = useState([{ title: "", url: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate slug from client name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(clientName));
    }
  }, [clientName, slugEdited]);

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

  async function handleImageUpload(files) {
    if (!files || !slug) return;

    for (const file of Array.from(files)) {
      const index = imageUrls.length + Array.from(files).indexOf(file);
      setUploading((prev) => [...prev, true]);
      setImageUrls((prev) => [...prev, null]);

      try {
        const ext = file.name.split(".").pop();
        const path = `deliverables/${slug}/${Date.now()}-${index}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("brand-assets")
          .upload(path, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("brand-assets").getPublicUrl(path);

        setImageUrls((prev) => {
          const updated = [...prev];
          const nullIdx = updated.indexOf(null);
          if (nullIdx !== -1) updated[nullIdx] = publicUrl;
          else updated.push(publicUrl);
          return updated;
        });
      } catch (err) {
        console.error("Upload error:", err);
        setError(`Image upload failed: ${err.message}`);
        setImageUrls((prev) => {
          const idx = prev.indexOf(null);
          return idx !== -1 ? prev.filter((_, i) => i !== idx) : prev;
        });
      } finally {
        setUploading((prev) => {
          const updated = [...prev];
          const idx = updated.indexOf(true);
          if (idx !== -1) updated[idx] = false;
          return updated;
        });
      }
    }
  }

  function removeImage(index) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setUploading((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (index !== dragOverIndex) setDragOverIndex(index);
  }

  function handleDrop(index) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setImageUrls((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ─── Video Links ───

  function addVideoLink() {
    setVideoLinks((prev) => [...prev, { title: "", url: "" }]);
  }

  function updateVideoLink(index, field, value) {
    setVideoLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeVideoLink(index) {
    setVideoLinks((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Submit ───

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    // Validate video links
    const validVideos = videoLinks
      .filter((v) => v.url.trim())
      .map((v) => {
        const fileId = extractGoogleDriveId(v.url);
        if (!fileId) return null;
        return {
          title: v.title || "Video",
          url: v.url,
          fileId,
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        };
      })
      .filter(Boolean);

    try {
      const res = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          slug,
          projectDescription,
          totalDeliverables: parseInt(totalDeliverables) || 0,
          packageName,
          deliveryDate: deliveryDate || null,
          images: imageUrls.filter(Boolean),
          videoLinks: validVideos,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data.deliverable || data);
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

  const deliverableUrl = result
    ? `scalewithalchemy.com/deliverables/${result.slug || slug}`
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
              Deliverables Manager
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
    <div
      style={{
        ...mono,
        minHeight: "100vh",
        background: G.bg,
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${G.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: G.text,
                letterSpacing: "0.05em",
              }}
            >
              ALCHEMY{" "}
              <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span>
            </span>
          </div>
          <h1
            style={{
              ...hd,
              fontSize: 32,
              color: G.text,
              margin: 0,
              marginBottom: 8,
            }}
          >
            Create Deliverable
          </h1>
          <p style={{ ...mono, fontSize: 14, color: G.textSec, margin: 0 }}>
            Build a client deliverables page
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
          {/* Section: Client Details */}
          <div>
            <div
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                color: G.textTer,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Client Details
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Client Name */}
              <div>
                <label style={labelStyle}>
                  <FileText size={14} color={G.textSec} />
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Beauty"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label style={labelStyle}>
                  <Link size={14} color={G.textSec} />
                  URL Slug
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
                  scalewithalchemy.com/deliverables/{slug || "..."}
                </p>
              </div>

              {/* Two-column: Package & Delivery Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>
                    <Package size={14} color={G.textSec} />
                    Package
                  </label>
                  <select
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23AEAEB2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 12px center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "20px",
                      paddingRight: 40,
                    }}
                  >
                    <option value="">Select package</option>
                    <option value="Spark">Spark</option>
                    <option value="Accelerate">Accelerate</option>
                    <option value="Scale">Scale</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    <Calendar size={14} color={G.textSec} />
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Two-column: Total Deliverables & Description */}
              <div>
                <label style={labelStyle}>
                  <Hash size={14} color={G.textSec} />
                  Total Deliverables
                </label>
                <input
                  type="number"
                  value={totalDeliverables}
                  onChange={(e) => setTotalDeliverables(e.target.value)}
                  placeholder="e.g. 75"
                  style={inputStyle}
                  min="0"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <FileText size={14} color={G.textSec} />
                  Project Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief description of the deliverables for this client..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 80,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Section: Images */}
          <div>
            <div
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                color: G.textTer,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Image Deliverables
            </div>
            <label style={{ ...labelStyle, marginBottom: 16 }}>
              <Image size={14} color={G.textSec} />
              Static Images{" "}
              {imageUrls.filter(Boolean).length > 0 &&
                `(${imageUrls.filter(Boolean).length})`}
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {imageUrls.map((url, i) => (
                <div
                  key={url || `uploading-${i}`}
                  draggable={!!url}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    handleDragStart(i);
                  }}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(i);
                  }}
                  onDragEnd={handleDragEnd}
                  style={{
                    position: "relative",
                    opacity: dragIndex === i ? 0.4 : 1,
                    transform:
                      dragOverIndex === i && dragIndex !== i
                        ? "scale(1.03)"
                        : "scale(1)",
                    transition: "opacity 0.15s, transform 0.15s",
                    cursor: url ? "grab" : "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 140,
                      border: `1px dashed ${
                        dragOverIndex === i && dragIndex !== i
                          ? G.gold
                          : url
                          ? G.success
                          : G.goldBorder
                      }`,
                      borderRadius: 12,
                      background: url ? `${G.success}08` : G.goldSoft,
                      overflow: "hidden",
                      pointerEvents: "none",
                    }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={`Upload ${i + 1}`}
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 11,
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      />
                    ) : (
                      <Loader2
                        size={20}
                        color={G.textSec}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    )}
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
                </div>
              ))}

              {/* Add Image button */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 140,
                  border: `1px dashed ${G.goldBorder}`,
                  borderRadius: 12,
                  background: G.goldSoft,
                  cursor: slug ? "pointer" : "not-allowed",
                  opacity: slug ? 1 : 0.5,
                  transition: "border-color 0.15s",
                }}
              >
                <Plus size={20} color={G.textTer} />
                <span style={{ ...mono, fontSize: 11, color: G.textTer }}>
                  Add Images
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleImageUpload(e.target.files);
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
            </div>

            {!slug && clientName === "" && (
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: G.textTer,
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                Enter a client name first to enable uploads
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Section: Video Links */}
          <div>
            <div
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                color: G.textTer,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Video Deliverables
            </div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>
              <Video size={14} color={G.textSec} />
              Google Drive Video Links
            </label>
            <p
              style={{
                ...mono,
                fontSize: 12,
                color: G.textTer,
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Paste Google Drive share links. Videos will preview directly on the
              client page without uploading.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {videoLinks.map((video, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: "0 0 140px" }}>
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) =>
                        updateVideoLink(i, "title", e.target.value)
                      }
                      placeholder="Video title"
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={video.url}
                      onChange={(e) =>
                        updateVideoLink(i, "url", e.target.value)
                      }
                      placeholder="https://drive.google.com/file/d/..."
                      style={{
                        ...inputStyle,
                        fontSize: 13,
                        borderColor:
                          video.url && !extractGoogleDriveId(video.url)
                            ? G.danger
                            : G.border,
                      }}
                    />
                    {video.url && !extractGoogleDriveId(video.url) && (
                      <p
                        style={{
                          ...mono,
                          fontSize: 11,
                          color: G.danger,
                          marginTop: 4,
                          marginBottom: 0,
                        }}
                      >
                        Invalid Google Drive link
                      </p>
                    )}
                    {video.url && extractGoogleDriveId(video.url) && (
                      <p
                        style={{
                          ...mono,
                          fontSize: 11,
                          color: G.success,
                          marginTop: 4,
                          marginBottom: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={11} />
                        Valid Drive link detected
                      </p>
                    )}
                  </div>
                  {videoLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVideoLink(i)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${G.border}`,
                        background: G.bg,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Trash2 size={14} color={G.textTer} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addVideoLink}
              style={{
                ...mono,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: G.textSec,
                background: G.goldSoft,
                border: `1px dashed ${G.goldBorder}`,
                borderRadius: 10,
                cursor: "pointer",
                marginTop: 12,
                transition: "border-color 0.15s",
              }}
            >
              <Plus size={14} />
              Add Another Video
            </button>
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
            disabled={submitting || !clientName || !slug}
            style={{
              ...mono,
              width: "100%",
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 600,
              background:
                submitting || !clientName || !slug ? G.textTer : G.gold,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              cursor:
                submitting || !clientName || !slug
                  ? "not-allowed"
                  : "pointer",
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
              "Create Deliverable Page"
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
                Deliverable Page Created
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
                {deliverableUrl}
              </span>
              <button
                onClick={() => handleCopy(deliverableUrl)}
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
              href={`/deliverables/${result.slug || slug}`}
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
              View Deliverable Page
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
  );
}
