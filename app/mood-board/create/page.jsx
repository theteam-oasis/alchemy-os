"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Loader2, Lock, GripVertical, MapPin, Image as ImageIcon, CheckCircle, ExternalLink, Copy } from "lucide-react";

/* ── Tokens ── */
const K = {
  ink: "#0D0D0B", offWhite: "#F7F5F0", sand: "#C8BFA8",
  stone: "#8C8880", smoke: "#E4E0D8", charcoal: "#3A3834",
};
const font = {
  display: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.18em" },
  body: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400 },
  label: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "0.12em", fontSize: 9, textTransform: "uppercase" },
  quote: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 300, fontStyle: "italic" },
  caption: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontWeight: 400, letterSpacing: "0.06em", fontSize: 10 },
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const inputStyle = {
  width: "100%", padding: "10px 14px", background: "#1C1C18",
  border: `1px solid ${K.charcoal}`, borderRadius: 4,
  color: K.offWhite, fontSize: 13, outline: "none", ...font.body,
};

/* ── Grid layout ── */
const columns = [
  [{ idx: 0, label: "hero landscape", ratio: "9:16" }, { idx: 1, label: "golden hour", ratio: "1:1" }, { idx: 2, label: "texture", ratio: "1:1" }],
  [{ idx: 3, label: "location detail", ratio: "1:1" }, { idx: 4, label: "back to camera", ratio: "9:16" }, { idx: 5, label: "product in context", ratio: "1:1" }],
  [{ idx: 6, label: "co-ed lifestyle", ratio: "1:1" }, { idx: 7, label: "candid / ease", ratio: "1:1" }, { idx: 8, label: "silhouette", ratio: "9:16" }],
  [{ idx: 9, label: "the cave shot", ratio: "9:16" }, { idx: 10, label: "blue hour", ratio: "1:1" }, { idx: 11, label: "movement", ratio: "1:1" }],
];

/* ── Admin image slot ── */
function AdminSlot({ index, label, ratio, image, uploading, onUpload, onRemove, dragIdx, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const fileRef = useRef(null);
  const [hover, setHover] = useState(false);
  const isDragTarget = dragIdx !== null && dragIdx !== index;

  return (
    <div
      draggable={!!image}
      onDragStart={() => image && onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) onUpload(index, file);
          return;
        }
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !image && !uploading && fileRef.current?.click()}
      style={{
        position: "relative", width: "100%",
        aspectRatio: ratio === "9:16" ? "9/16" : "1/1",
        background: image ? K.ink : "#1C1C18",
        overflow: "hidden", cursor: image ? "grab" : "pointer",
        outline: isDragTarget && hover ? `2px solid ${K.sand}` : "none",
        opacity: dragIdx === index ? 0.4 : 1, transition: "opacity 0.2s ease",
      }}
    >
      {image ? (
        <>
          <img src={image} alt={label} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0, pointerEvents: "none" }} />
          {hover && dragIdx === null && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(13,13,11,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, backdropFilter: "blur(2px)" }}>
              <GripVertical size={20} color={K.offWhite} strokeWidth={1} />
              <span style={{ ...font.label, color: K.offWhite, fontSize: 8 }}>{label}</span>
              <span style={{ ...font.caption, color: K.stone, textTransform: "none" }}>drag to swap</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} style={{ background: "none", border: `1px solid ${K.offWhite}`, color: K.offWhite, padding: "5px 16px", borderRadius: 2, cursor: "pointer", ...font.label, fontSize: 9, marginTop: 2 }}>remove</button>
            </div>
          )}
          {isDragTarget && hover && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(200,191,168,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${K.sand}` }}>
              <span style={{ ...font.label, color: K.offWhite, fontSize: 10 }}>drop to swap</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {uploading ? (
            <Loader2 size={18} color={K.sand} strokeWidth={1} style={{ animation: "spin 1s linear infinite" }} />
          ) : isDragTarget && hover ? (
            <span style={{ ...font.label, color: K.sand, fontSize: 9 }}>drop to move here</span>
          ) : (
            <><Upload size={14} color={K.stone} strokeWidth={1} /><span style={{ ...font.label, color: K.stone, fontSize: 8 }}>{label}</span></>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) onUpload(index, e.target.files[0]); }} />
    </div>
  );
}

/* ── Main ── */
export default function MoodBoardCreate() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const [images, setImages] = useState({});
  const [uploading, setUploading] = useState({});
  const [dragIdx, setDragIdx] = useState(null);

  const [locName, setLocName] = useState("");
  const [locMapsUrl, setLocMapsUrl] = useState("");
  const [locImage, setLocImage] = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const [shootTime, setShootTime] = useState("");
  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");
  const locImageRef = useRef(null);

  /* Auto-slug */
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(brandName));
  }, [brandName, slugEdited]);

  function handleAuth(e) {
    e.preventDefault();
    if (password === "alchemy2024") { setAuthed(true); setPwError(false); }
    else setPwError(true);
  }

  /* ── Extract lat/lng from Google Maps URL ── */
  function parseCoordsFromMapsUrl(url) {
    if (!url) return null;
    // Matches @lat,lng or ?q=lat,lng or /place/lat,lng
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
    return null;
  }

  /* ── Auto-extract coords when maps URL changes ── */
  useEffect(() => {
    const coords = parseCoordsFromMapsUrl(locMapsUrl);
    if (coords) { setLocLat(coords.lat); setLocLng(coords.lng); }
  }, [locMapsUrl]);

  /* ── Create / save board ── */
  const saveBoard = useCallback(async () => {
    if (!slug) return;
    await fetch("/api/mood-board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, brand_name: brandName,
        location_name: locName, location_maps_url: locMapsUrl, location_image_url: locImage,
        shoot_time: shootTime, location_lat: locLat || null, location_lng: locLng || null,
      }),
    });
  }, [slug, brandName, locName, locMapsUrl, locImage, shootTime, locLat, locLng]);

  const handleCreate = useCallback(async () => {
    if (!slug || !brandName) return;
    await saveBoard();
    setCreated(true);
  }, [slug, brandName, saveBoard]);

  /* ── Keep slug in a ref so callbacks always have latest value ── */
  const slugRef = useRef(slug);
  useEffect(() => { slugRef.current = slug; }, [slug]);

  /* ── Image upload ── */
  const handleUpload = useCallback(async (index, file) => {
    const currentSlug = slugRef.current;
    if (!currentSlug) { alert("Enter a brand name first"); return; }
    setUploading((p) => ({ ...p, [index]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slot", index);
      form.append("slug", currentSlug);
      const res = await fetch("/api/mood-board", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) setImages((p) => ({ ...p, [index]: data.url }));
    } catch (e) { console.error("Upload failed:", e); }
    setUploading((p) => ({ ...p, [index]: false }));
  }, []);

  const handleRemove = useCallback(async (index) => {
    setImages((p) => { const n = { ...p }; delete n[index]; return n; });
    try {
      await fetch("/api/mood-board", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: index, slug: slugRef.current }),
      });
    } catch (e) { console.error("Delete failed:", e); }
  }, []);

  /* ── Drag swap ── */
  const handleDragStart = useCallback((idx) => setDragIdx(idx), []);
  const handleDragOver = useCallback(() => {}, []);
  const handleDragEnd = useCallback(() => setDragIdx(null), []);
  const handleDrop = useCallback(async (toIdx) => {
    const fromIdx = dragIdx;
    setDragIdx(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    setImages((prev) => {
      const next = { ...prev };
      const f = next[fromIdx], t = next[toIdx];
      if (f) next[toIdx] = f; else delete next[toIdx];
      if (t) next[fromIdx] = t; else delete next[fromIdx];
      return next;
    });
    try {
      await fetch("/api/mood-board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugRef.current, fromSlot: fromIdx, toSlot: toIdx }),
      });
    } catch (e) { console.error("Swap failed:", e); }
  }, [dragIdx]);

  /* ── Location image upload ── */
  const handleLocImageUpload = useCallback(async (file) => {
    if (!slugRef.current) { alert("Enter a brand name first"); return; }
    setLocUploading(true);
    try {
      const form = new FormData();
      form.append("board", slugRef.current);
      form.append("name", locName);
      form.append("maps_url", locMapsUrl);
      form.append("image", file);
      const res = await fetch("/api/mood-board/location", { method: "POST", body: form });
      const data = await res.json();
      if (data.success && data.location) setLocImage(data.location.image_url);
    } catch (e) { console.error("Location image upload failed:", e); }
    setLocUploading(false);
  }, [locName, locMapsUrl]);

  const filled = Object.keys(images).length;
  const boardUrl = `scalewithalchemy.com/mood-board/${slug}`;

  /* ── Password gate ── */
  if (!authed) {
    return (
      <div style={{ ...font.body, minHeight: "100vh", background: K.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 340, maxWidth: "90vw" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#1C1C18", border: `1px solid ${K.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color={K.sand} strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ ...font.display, color: K.offWhite, fontSize: 28, margin: 0, marginBottom: 6 }}>mood board</h1>
            <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>create new</p>
          </div>
          <input type="password" placeholder="password" value={password} onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.05em" }} />
          <button type="submit" style={{ width: "100%", padding: "12px 0", background: K.sand, color: K.ink, border: "none", borderRadius: 4, cursor: "pointer", ...font.label, fontSize: 11 }}>enter</button>
          {pwError && <p style={{ ...font.caption, color: "#8B3A3A", textTransform: "none" }}>incorrect password</p>}
        </form>
      </div>
    );
  }

  /* ── Success state ── */
  if (created) {
    return (
      <div style={{ ...font.body, minHeight: "100vh", background: K.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 440, maxWidth: "90vw" }}>
          <CheckCircle size={40} color={K.sand} strokeWidth={1} />
          <h2 style={{ ...font.display, color: K.offWhite, fontSize: 28, textAlign: "center" }}>{brandName}</h2>
          <p style={{ ...font.caption, color: K.stone, textTransform: "none" }}>mood board created</p>
          <div style={{ width: "100%", background: "#1C1C18", border: `1px solid ${K.charcoal}`, borderRadius: 6, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ ...font.body, color: K.offWhite, fontSize: 13 }}>{boardUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(`https://${boardUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ background: "none", border: `1px solid ${K.charcoal}`, color: copied ? K.sand : K.stone, padding: "6px 12px", borderRadius: 4, cursor: "pointer", ...font.label, fontSize: 9, flexShrink: 0 }}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <a href={`/mood-board/${slug}`} target="_blank" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", background: K.sand, color: K.ink, borderRadius: 4, textDecoration: "none", ...font.label, fontSize: 11 }}>
              <ExternalLink size={14} /> view board
            </a>
            <button onClick={() => setCreated(false)} style={{ flex: 1, padding: "12px 0", background: "none", border: `1px solid ${K.charcoal}`, color: K.offWhite, borderRadius: 4, cursor: "pointer", ...font.label, fontSize: 11 }}>
              keep editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Editor ── */
  return (
    <div style={{ background: K.ink, minHeight: "100vh", color: K.offWhite }}>

      {/* Header */}
      <header style={{ padding: "36px 48px 0", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ ...font.display, color: K.offWhite, fontSize: 28, lineHeight: 1, marginBottom: 4 }}>mood board</h1>
            <p style={{ ...font.label, color: K.stone, fontSize: 10 }}>create new</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ ...font.label, color: K.sand, fontSize: 10 }}>{filled} / 12 images</span>
          </div>
        </div>
        <div style={{ width: "100%", height: 1, background: K.charcoal, marginBottom: 24 }} />
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>

        {/* Brand name + slug */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...font.label, color: K.stone, fontSize: 9, display: "block", marginBottom: 6 }}>brand name</label>
            <input type="text" placeholder="Koko" value={brandName} onChange={(e) => setBrandName(e.target.value)}
              style={inputStyle} />
          </div>
          <div style={{ width: 280 }}>
            <label style={{ ...font.label, color: K.stone, fontSize: 9, display: "block", marginBottom: 6 }}>slug</label>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ ...font.caption, color: K.charcoal, padding: "10px 0 10px 14px", background: "#1C1C18", border: `1px solid ${K.charcoal}`, borderRight: "none", borderRadius: "4px 0 0 4px", textTransform: "none", whiteSpace: "nowrap" }}>/mood-board/</span>
              <input type="text" value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}
                style={{ ...inputStyle, borderRadius: "0 4px 4px 0" }} />
            </div>
          </div>
        </div>

        {/* Instruction */}
        <p style={{ ...font.caption, color: K.stone, marginBottom: 16, textTransform: "none", letterSpacing: "0.02em" }}>
          click empty slots to upload. drag images to rearrange. hover to remove
        </p>

        {/* Image grid */}
        <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
              {col.map((slot) => (
                <AdminSlot key={slot.idx} index={slot.idx} label={slot.label} ratio={slot.ratio}
                  image={images[slot.idx]} uploading={uploading[slot.idx]}
                  onUpload={handleUpload} onRemove={handleRemove}
                  dragIdx={dragIdx} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd} />
              ))}
            </div>
          ))}
        </div>

        {/* Location */}
        <div style={{ borderTop: `1px solid ${K.charcoal}`, marginTop: 40, paddingTop: 16, marginBottom: 24 }}>
          <span style={{ ...font.label, color: K.stone, fontSize: 10 }}>shoot location</span>
        </div>
        <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
          <div onClick={() => !locUploading && locImageRef.current?.click()}
            style={{ width: 200, minHeight: 140, borderRadius: 4, background: locImage ? "transparent" : "#1C1C18", border: `1px solid ${K.charcoal}`, overflow: "hidden", cursor: "pointer", position: "relative", flexShrink: 0 }}>
            {locImage ? (
              <img src={locImage} alt="Location" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, padding: 20 }}>
                {locUploading ? <Loader2 size={18} color={K.sand} strokeWidth={1} style={{ animation: "spin 1s linear infinite" }} /> :
                  <><ImageIcon size={16} color={K.stone} strokeWidth={1} /><span style={{ ...font.label, color: K.stone, fontSize: 8 }}>location image</span></>}
              </div>
            )}
            <input ref={locImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleLocImageUpload(e.target.files[0]); }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ ...font.label, color: K.stone, fontSize: 9, display: "block", marginBottom: 6 }}>location name</label>
              <input type="text" placeholder="Seseh Beach, Bali" value={locName} onChange={(e) => setLocName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...font.label, color: K.stone, fontSize: 9, display: "block", marginBottom: 6 }}>
                <MapPin size={10} strokeWidth={1.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />google maps link
              </label>
              <input type="url" placeholder="https://maps.google.com/..." value={locMapsUrl} onChange={(e) => setLocMapsUrl(e.target.value)} style={inputStyle} />
              {locLat && locLng && <span style={{ ...font.caption, color: K.sand, textTransform: "none", marginTop: 4, display: "block" }}>coordinates detected: {locLat}, {locLng}</span>}
            </div>
            <div>
              <label style={{ ...font.label, color: K.stone, fontSize: 9, display: "block", marginBottom: 6 }}>shoot time</label>
              <input type="text" placeholder="6:30am. golden hour" value={shootTime} onChange={(e) => setShootTime(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Create button */}
        <button onClick={handleCreate} disabled={!slug || !brandName}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 4, border: "none", cursor: slug && brandName ? "pointer" : "not-allowed",
            background: slug && brandName ? K.sand : K.charcoal, color: slug && brandName ? K.ink : K.stone,
            ...font.label, fontSize: 12, marginBottom: 16, transition: "background 0.2s ease",
          }}>
          {created ? "saved" : "create mood board"}
        </button>
        <p style={{ ...font.caption, color: K.stone, textAlign: "center", textTransform: "none", marginBottom: 40 }}>
          images save automatically. this creates the shareable link
        </p>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
