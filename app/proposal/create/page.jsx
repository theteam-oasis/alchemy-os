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
  Sparkles,
  Check,
  RefreshCw,
  ChevronDown,
  Download,
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

// Strip common tracking / affiliate / analytics query params from a URL.
// Keeps meaningful product params (variant, sku, etc.). If parsing fails,
// returns the original input unchanged.
const TRACKING_PARAMS = new Set([
  // UTM (Google standard)
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "utm_name", "utm_brand", "utm_social", "utm_social-type",
  // Click IDs
  "gclid", "gbraid", "wbraid", "dclid", "fbclid", "msclkid", "yclid", "twclid",
  "ttclid", "li_fat_id", "epik", "igshid",
  // Email / marketing
  "mc_cid", "mc_eid", "_kx", "ml_subscriber", "ml_subscriber_hash",
  "ck_subscriber_id", "vero_id", "vero_conv",
  // Affiliate
  "ref", "referrer", "referer", "aff", "affiliate", "affid", "subid",
  "irclickid", "irgwc", "tap_a", "tap_s", "rfsn",
  // Analytics
  "_ga", "_gl", "_hsenc", "_hsmi", "hsCtaTracking",
  "trk_msg", "trk_contact", "trk_module", "trk_sid",
  // Common Shopify/site-side trackers
  "shop", "redirect_source", "redirect_medium", "campaign_id",
  "yt_source", "pscd", "pcrid", "pkw",
]);

function cleanUrl(input) {
  if (!input || typeof input !== "string") return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // Try to parse; if no protocol, prepend https:// for parsing only
  let parsed;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return trimmed; // not a parseable URL, leave alone
  }
  // Strip tracking params
  let stripped = false;
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
      parsed.searchParams.delete(key);
      stripped = true;
    }
  }
  // Strip common tracking-only hash fragments
  if (parsed.hash && /^#?(utm_|fbclid|gclid|ref=)/i.test(parsed.hash.replace(/^#/, ""))) {
    parsed.hash = "";
    stripped = true;
  }
  if (!stripped) return trimmed; // no tracking found, keep original formatting
  // Rebuild a clean URL. Preserve whether user originally had protocol.
  const rebuilt = parsed.toString().replace(/\?$/, "");
  if (!trimmed.startsWith("http")) {
    return rebuilt.replace(/^https?:\/\//, "");
  }
  return rebuilt;
}

// ─── Component ───


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

  // Auto-generate state
  const [brandUrl, setBrandUrl] = useState("");
  const [productRefUrl, setProductRefUrl] = useState(null);
  const [productRefUploading, setProductRefUploading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(Array(6).fill(false));
  const [generatedPrompts, setGeneratedPrompts] = useState(null);
  const [generationStatus, setGenerationStatus] = useState("");
  const [imageCandidates, setImageCandidates] = useState([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [enlargedImage, setEnlargedImage] = useState(null);
  // Real-time progress for the 6-image generation
  // stage: "idle" | "prompts" | "images" | "done"
  const [genProgress, setGenProgress] = useState({ completed: 0, total: 6, phase: "", stage: "idle" });
  // Per-slot progress (0-100) synced to actual Gemini API lifecycle for that slot
  const [slotProgress, setSlotProgress] = useState(Array(6).fill(0));
  // Refs to per-slot animation intervals so we can cancel on completion
  const slotTimersRef = useRef([]);
  // AbortController for the in-flight auto-generate stream so user can cancel
  const abortRef = useRef(null);
  // Per-slot AbortControllers so a fresh regen click cancels the in-flight one
  const slotAbortRef = useRef([]);
  // Per-slot error messages from failed generations
  const [slotErrors, setSlotErrors] = useState(Array(6).fill(null));
  // Per-slot retry attempt number (1 = first try, 2+ = retrying)
  const [slotAttempts, setSlotAttempts] = useState(Array(6).fill(1));
  // How many times the user has manually clicked Regenerate on this slot
  // (resets to 0 on each new auto-gen). Lets us show "(restarted)" feedback.
  const [slotManualRetries, setSlotManualRetries] = useState(Array(6).fill(0));
  // Tracks which prompt was just copied (for the small "Copied" toast)
  const [copiedPromptIdx, setCopiedPromptIdx] = useState(null);
  // Tracks which prompts are currently being rewritten by Claude
  const [rewritingPrompts, setRewritingPrompts] = useState(Array(6).fill(false));
  const [showPrompts, setShowPrompts] = useState(false);
  const [customPrompts, setCustomPrompts] = useState(["", "", "", "", "", ""]);

  // If all 6 prompt boxes are filled, treat as custom mode — skip Claude
  const allPromptsFilled = customPrompts.every(p => p && p.trim().length > 0);

  // Slug collision detection
  const [slugTaken, setSlugTaken] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Track which URL we've already auto-fetched so we don't keep re-firing
  const [lastFetchedUrl, setLastFetchedUrl] = useState("");

  // Auto-generate slug from brand name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(brandName));
    }
  }, [brandName, slugEdited]);

  // Check if slug is already taken (debounced, skip if we just created this proposal)
  useEffect(() => {
    if (!slug || result?.proposal?.slug === slug) {
      setSlugTaken(false);
      return;
    }
    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/proposal?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugTaken(!!(data.success && data.proposal));
      } catch {
        setSlugTaken(false);
      } finally {
        setCheckingSlug(false);
      }
    }, 400);
    return () => { clearTimeout(timer); setCheckingSlug(false); };
  }, [slug, result]);

  // Auto-fetch brand name + product image as soon as a valid URL stops changing (debounced)
  useEffect(() => {
    const trimmed = (brandUrl || "").trim();
    // Look like a URL? (contains a dot, has at least domain.tld)
    const looksLikeUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/i.test(trimmed);
    if (!looksLikeUrl) return;
    // Already fetched this exact URL — don't re-fetch
    if (trimmed === lastFetchedUrl) return;
    // Mid-fetch already running, let it finish
    if (productRefUploading) return;

    const timer = setTimeout(() => {
      // Detect URL switch BEFORE resetting state (so we can pass the right flag)
      const isUrlSwitch = !!lastFetchedUrl && trimmed !== lastFetchedUrl;
      // If this is a NEW URL (different from a previously fetched one), the user
      // is switching to a different product/brand. Reset all auto-filled state
      // so we can repopulate fresh from the new URL.
      if (isUrlSwitch) {
        setProductRefUrl(null);
        setBrandName("");
        setSlug("");
        setSlugEdited(false);
        setImageUrls(Array(6).fill(null));
        setCustomPrompts(["", "", "", "", "", ""]);
        setGeneratedPrompts(null);
        setSlotErrors(Array(6).fill(null));
        setSlotProgress(Array(6).fill(0));
        setSlotAttempts(Array(6).fill(1));
        setImageCandidates([]);
        setCandidateIndex(0);
        setResult(null);
        setError(null);
      }
      setLastFetchedUrl(trimmed);
      // Pass forceOverwrite=true on URL switch so the new brand name/slug
      // always replace the old ones (not just fill empties).
      handleAutoFetchAll(isUrlSwitch);
    }, 600);
    return () => clearTimeout(timer);
  }, [brandUrl, productRefUploading, lastFetchedUrl]);

  // ─── Password Gate (24-hour persistent auth) ───

  // Check stored auth on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("alchemy_create_auth");
      if (stored) {
        const expiresAt = Number(stored);
        if (expiresAt > Date.now()) {
          setAuthed(true);
        } else {
          localStorage.removeItem("alchemy_create_auth");
        }
      }
    } catch {}
  }, []);

  function handleAuth(e) {
    e.preventDefault();
    if (password === "alchemy2024") {
      setAuthed(true);
      setPwError(false);
      try {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        localStorage.setItem("alchemy_create_auth", String(expiresAt));
      } catch {}
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

  // ─── Product Reference Upload ───

  // Compress an image Blob/File down to maxDim (longest edge) as JPEG, ~0.85 quality.
  // Returns a smaller Blob. Cuts a 4MB photo down to ~150KB without visible quality loss.
  async function compressImage(blobOrFile, maxDim = 1024, quality = 0.85) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blobOrFile);
    });
    const img = await new Promise((resolve, reject) => {
      const im = new window.Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    let { width, height } = img;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    // If compression somehow made it bigger (rare on already-small files), keep the original
    if (compressed && compressed.size < blobOrFile.size) return compressed;
    return blobOrFile;
  }

  async function handleProductRefUpload(file) {
    if (!file) return;
    setProductRefUploading(true);
    setError(null);
    try {
      // Compress before upload — keeps Gemini calls fast (smaller payload × 6 calls)
      const compressed = await compressImage(file).catch(() => file);
      const folder = slug || "_drafts";
      const path = `proposals/${folder}/_ref-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, compressed, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setProductRefUrl(publicUrl);
    } catch (err) {
      setError(`Reference image upload failed: ${err.message}`);
    } finally {
      setProductRefUploading(false);
    }
  }

  // Re-host an image URL into our Supabase bucket; returns public URL
  async function rehostImage(srcUrl, brandHint) {
    const imgRes = await fetch(`/api/download-image?url=${encodeURIComponent(srcUrl)}&name=ref.png`);
    if (!imgRes.ok) throw new Error("Failed to download image");
    const blob = await imgRes.blob();
    // Compress scraped images too — they're often huge marketing photos (3-5MB)
    const compressed = await compressImage(blob).catch(() => blob);
    const folder = slug || slugify(brandHint || "_drafts") || "_drafts";
    const path = `proposals/${folder}/_ref-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, compressed, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
    return publicUrl;
  }

  // First-time scrape: pulls brand name + image candidates from product page URL
  // forceOverwrite=true means we're switching to a new URL — always replace
  // brand name + slug from the scraped result, regardless of current values.
  // forceOverwrite=false (default) only fills empty fields.
  async function handleAutoFetchAll(forceOverwrite = false) {
    if (!brandUrl) {
      setError("Enter a product page URL first.");
      return;
    }
    setProductRefUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: brandUrl }),
      });
      const data = await res.json();

      // Update brand name. Use functional state so we read the latest value
      // (avoids stale closure when the useEffect just reset brandName to "").
      if (data.brandName) {
        setBrandName(prev => {
          if (forceOverwrite) return data.brandName;
          return prev.trim() ? prev : data.brandName;
        });
        // When forcing a refresh from a new URL, also reset slugEdited so
        // the slug auto-regenerates from the new brand name.
        if (forceOverwrite) setSlugEdited(false);
      }

      if (!res.ok || !data.success) throw new Error(data.error || "Could not find an image on that page");

      // Store all candidates for "Try another image" cycling
      setImageCandidates(data.candidates || [{ url: data.imageUrl, source: data.source }]);
      setCandidateIndex(0);

      const publicUrl = await rehostImage(data.imageUrl, data.brandName);
      setProductRefUrl(publicUrl);
    } catch (err) {
      setError(`Auto-fetch failed: ${err.message}. Try uploading manually.`);
    } finally {
      setProductRefUploading(false);
    }
  }

  // Cycle to the next image candidate (different image from same page)
  async function handleTryNextImage() {
    if (imageCandidates.length === 0) {
      return handleAutoFetchAll();
    }
    const nextIdx = (candidateIndex + 1) % imageCandidates.length;
    setCandidateIndex(nextIdx);
    setProductRefUploading(true);
    setError(null);
    try {
      const publicUrl = await rehostImage(imageCandidates[nextIdx].url);
      setProductRefUrl(publicUrl);
    } catch (err) {
      setError(`Failed to load alternate image: ${err.message}`);
    } finally {
      setProductRefUploading(false);
    }
  }

  // Convert base64 data URL to a public Supabase URL
  async function uploadGeneratedImage(dataUrl, slotIndex) {
    // 45s hard timeout on the entire upload — prevents stuck "uploading" loops
    // when Supabase is slow or the data URL is too large.
    return Promise.race([
      (async () => {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const path = `proposals/${slug}/gen-${Date.now()}-${slotIndex}.png`;
        const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, blob, { contentType: "image/png" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
        return publicUrl;
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase upload timed out after 45s — hit Regenerate to try again")), 45000)),
    ]);
  }

  // ─── Auto-Generate All 6 ───

  async function handleAutoGenerate() {
    if (!slug) {
      setError("Need a brand name first.");
      return;
    }
    if (!allPromptsFilled && !brandUrl) {
      setError("Enter a brand URL, or fill in all 6 custom prompts in the dropdown below.");
      return;
    }
    setAutoGenerating(true);
    setError(null);
    setGenerationStatus(allPromptsFilled ? "Generating images from your prompts..." : "Writing prompts from brand site...");
    setGenProgress({ completed: 0, total: 6, phase: "Loading product reference...", stage: "prompts" });

    // Set ALL 6 slots to "loading" state so spinners show immediately
    setUploading(Array(6).fill(true));
    // Clear any existing images and per-slot progress
    setImageUrls(Array(6).fill(null));
    setSlotProgress(Array(6).fill(0));
    setSlotErrors(Array(6).fill(null));
    setSlotAttempts(Array(6).fill(1));
    setSlotManualRetries(Array(6).fill(0));
    // Clear any leftover timers
    slotTimersRef.current.forEach(t => t && clearInterval(t));
    slotTimersRef.current = [];

    try {
      const body = allPromptsFilled
        ? { brandUrl: brandUrl || "custom", productImageUrl: productRefUrl || "", prompts: customPrompts }
        : { brandUrl, productImageUrl: productRefUrl || "" };

      // Wire up cancellation so the team can bail mid-flight
      const ac = new AbortController();
      abortRef.current = ac;
      const res = await fetch("/api/generate-samples-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(errText.slice(0, 300));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // keep incomplete

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let evt;
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }

          if (evt.type === "status") {
            setGenerationStatus(evt.message);
            // Detect stage transition based on the status message text
            const isImagesPhase = /generating.*images/i.test(evt.message);
            setGenProgress(p => ({ ...p, phase: evt.message, stage: isImagesPhase ? "images" : "prompts" }));
          } else if (evt.type === "prompts") {
            setGeneratedPrompts(evt.prompts);
            if (!allPromptsFilled) setCustomPrompts(evt.prompts);
            setGenProgress(p => ({ ...p, stage: "images" }));
          } else if (evt.type === "imageStart") {
            // Server says "I just fired the Gemini call for slot N at this timestamp"
            // Start an animation that ramps from 0 → 90% over ~10s (typical Gemini time),
            // holds at 90% if it takes longer, jumps to 100% on real completion.
            const slotIdx = evt.slotIndex;
            const startedAt = Date.now();
            const targetMs = 10000; // typical median completion
            const cap = 90;
            // Clear any existing timer for this slot
            if (slotTimersRef.current[slotIdx]) clearInterval(slotTimersRef.current[slotIdx]);
            slotTimersRef.current[slotIdx] = setInterval(() => {
              const elapsed = Date.now() - startedAt;
              const pct = Math.min(cap, (elapsed / targetMs) * cap);
              setSlotProgress(prev => { const u = [...prev]; u[slotIdx] = pct; return u; });
            }, 100);
          } else if (evt.type === "imageRetry") {
            // Server is retrying slot N — restart the per-slot progress so user sees activity
            const slotIdx = evt.slotIndex;
            setSlotAttempts(prev => { const u = [...prev]; u[slotIdx] = evt.attempt; return u; });
            const startedAt = Date.now();
            const targetMs = 10000;
            const cap = 90;
            if (slotTimersRef.current[slotIdx]) clearInterval(slotTimersRef.current[slotIdx]);
            setSlotProgress(prev => { const u = [...prev]; u[slotIdx] = 0; return u; });
            slotTimersRef.current[slotIdx] = setInterval(() => {
              const elapsed = Date.now() - startedAt;
              const pct = Math.min(cap, (elapsed / targetMs) * cap);
              setSlotProgress(prev => { const u = [...prev]; u[slotIdx] = pct; return u; });
            }, 100);
          } else if (evt.type === "image") {
            // Snap progress to 100, kill the timer
            if (slotTimersRef.current[evt.slotIndex]) {
              clearInterval(slotTimersRef.current[evt.slotIndex]);
              slotTimersRef.current[evt.slotIndex] = null;
            }
            setSlotProgress(prev => { const u = [...prev]; u[evt.slotIndex] = 100; return u; });
            // Upload to Supabase (45s timeout inside), then fill the slot
            try {
              const publicUrl = await uploadGeneratedImage(evt.dataUrl, evt.slotIndex);
              setImageUrls(prev => { const u = [...prev]; u[evt.slotIndex] = publicUrl; return u; });
            } catch (e) {
              console.error(`Slot ${evt.slotIndex} upload failed`, e);
              // Surface upload failures as slot errors so the user can hit Retry
              setSlotErrors(prev => { const u = [...prev]; u[evt.slotIndex] = e?.message || "Upload failed"; return u; });
            } finally {
              setUploading(prev => { const u = [...prev]; u[evt.slotIndex] = false; return u; });
              setGenProgress(p => ({ ...p, completed: evt.completed, total: evt.total }));
            }
          } else if (evt.type === "imageError") {
            if (slotTimersRef.current[evt.slotIndex]) {
              clearInterval(slotTimersRef.current[evt.slotIndex]);
              slotTimersRef.current[evt.slotIndex] = null;
            }
            setUploading(prev => { const u = [...prev]; u[evt.slotIndex] = false; return u; });
            setGenProgress(p => ({ ...p, completed: evt.completed, total: evt.total }));
            setSlotErrors(prev => { const u = [...prev]; u[evt.slotIndex] = evt.error || "Generation failed"; return u; });
            console.error(`Slot ${evt.slotIndex} generation failed:`, evt.error);
          } else if (evt.type === "error" && evt.fatal) {
            throw new Error(evt.error);
          } else if (evt.type === "done") {
            // all done — loop will naturally exit
          }
        }
      }

      setGenerationStatus("");

      // After the stream finishes, check for widespread Google-side failures
      // and surface a clear banner so the team knows it's not our system.
      setTimeout(() => {
        setSlotErrors(prev => {
          const overloaded = prev.filter(e => e && /503|UNAVAILABLE|overloaded|timed out|high demand/i.test(e)).length;
          if (overloaded >= 3) {
            setError(`Google's image API is overloaded right now — ${overloaded} slots failed with "high demand" errors. This is on Google's side, not our system. Wait 5-10 minutes and hit Retry on the failed slots, or try again later.`);
          }
          return prev;
        });
      }, 100);
    } catch (err) {
      setError(`Auto-generate failed: ${err.message}`);
      // Clear loading states on any unfinished slots
      setUploading(Array(6).fill(false));
    } finally {
      setAutoGenerating(false);
      setGenProgress({ completed: 0, total: 6, phase: "", stage: "idle" });
      // Kill any leftover per-slot timers
      slotTimersRef.current.forEach(t => t && clearInterval(t));
      slotTimersRef.current = [];
      setTimeout(() => setSlotProgress(Array(6).fill(0)), 600);
    }
  }

  // ─── Regenerate Single Slot ───

  // Rewrite a single prompt via Claude — does NOT regenerate the image.
  // Updates the prompt textarea so the team can review/edit before regenerating.
  async function handleRewritePrompt(slotIndex) {
    if (!brandUrl) {
      setError("Need a brand URL to rewrite a prompt.");
      return;
    }
    setRewritingPrompts(prev => { const u = [...prev]; u[slotIndex] = true; return u; });
    setError(null);
    try {
      const res = await fetch("/api/generate-samples-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandUrl,
          productImageUrl: productRefUrl || "",
          mode: "prompt-only",
          slotIndex,
          currentPrompt: customPrompts[slotIndex] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Rewrite failed");
      setCustomPrompts(prev => {
        const u = [...prev];
        u[slotIndex] = data.prompt;
        return u;
      });
      setGeneratedPrompts(prev => {
        if (!prev) return prev;
        const u = [...prev];
        u[slotIndex] = data.prompt;
        return u;
      });
    } catch (err) {
      setError(`Rewrite failed: ${err.message}`);
    } finally {
      setRewritingPrompts(prev => { const u = [...prev]; u[slotIndex] = false; return u; });
    }
  }

  async function handleRegenerate(slotIndex) {
    if (!slug) {
      setError("Need a brand name to regenerate.");
      return;
    }
    // Use whatever prompts are most current — edited custom always wins
    const promptsToUse = customPrompts.some(p => p && p.trim())
      ? customPrompts
      : generatedPrompts;
    if (!promptsToUse || !promptsToUse[slotIndex]) {
      setError("No prompt available for this slot. Run auto-generate first or enter custom prompts.");
      return;
    }

    // Cancel any in-flight regen for THIS slot (so a re-click restarts cleanly)
    const wasAlreadyRegenerating = !!slotAbortRef.current[slotIndex];
    if (slotAbortRef.current[slotIndex]) {
      try { slotAbortRef.current[slotIndex].abort(); } catch {}
    }
    const ac = new AbortController();
    slotAbortRef.current[slotIndex] = ac;

    // Bump the manual retry counter so the loader text reflects the click
    setSlotManualRetries(prev => { const u = [...prev]; u[slotIndex] = (u[slotIndex] || 0) + 1; return u; });
    setRegenerating(prev => { const u = [...prev]; u[slotIndex] = true; return u; });
    setError(null);
    setSlotErrors(prev => { const u = [...prev]; u[slotIndex] = null; return u; });
    try {
      const res = await fetch("/api/generate-samples-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          brandUrl: brandUrl || "custom",
          productImageUrl: productRefUrl || "",
          mode: "single",
          slotIndex,
          prompts: promptsToUse,
          freshPrompt: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Regeneration failed");
      if (data.prompts) {
        setGeneratedPrompts(data.prompts);
        // Update the editable custom-prompts box for this slot too,
        // so what's displayed in the dropdown matches what was actually used
        setCustomPrompts(prev => {
          const u = [...prev];
          u[slotIndex] = data.prompts[slotIndex];
          return u;
        });
      }
      const publicUrl = await uploadGeneratedImage(data.image, slotIndex);
      setImageUrls(prev => { const u = [...prev]; u[slotIndex] = publicUrl; return u; });
    } catch (err) {
      // If this regen got cancelled by a newer click, swallow it silently
      if (err?.name === 'AbortError' || /aborted/i.test(err?.message || '')) {
        return;
      }
      const msg = err.message || "Generation failed";
      setSlotErrors(prev => { const u = [...prev]; u[slotIndex] = msg; return u; });
      setError(`Regenerate failed: ${msg}`);
    } finally {
      // Only clear regenerating state if this is still the active controller
      // (a newer click may have already overwritten it and we shouldn't stomp)
      if (slotAbortRef.current[slotIndex] === ac) {
        setRegenerating(prev => { const u = [...prev]; u[slotIndex] = false; return u; });
        slotAbortRef.current[slotIndex] = null;
      }
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.gold }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
            </div>
            <h1
              style={{
                ...hd,
                fontSize: 26,
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
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 24px" }}>
        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </div>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Internal · Proposal Creator</span>
        </nav>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1
            style={{
              ...hd,
              fontSize: 40,
              color: G.text,
              margin: 0,
              marginBottom: 10,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Create a New Proposal
          </h1>
          <p style={{ ...mono, fontSize: 14, color: G.textSec, margin: 0, lineHeight: 1.6 }}>
            Build a custom, on-brand proposal page for any client.
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
          {/* Product Page URL — primary entry point */}
          <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${G.cardBorder}`, background: "#FAFAFA" }}>
            <label style={{ ...labelStyle, marginBottom: 6 }}>
              <Link size={14} color={G.text} />
              Product Page URL <span style={{ color: G.textTer, fontWeight: 400, fontSize: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>· start here</span>
            </label>
            <input
              type="text"
              value={brandUrl}
              onChange={(e) => setBrandUrl(cleanUrl(e.target.value))}
              placeholder="brandurl.com/products/the-specific-product"
              style={inputStyle}
            />
            {productRefUploading && !productRefUrl && (
              <p style={{ ...mono, fontSize: 11, color: G.textSec, marginTop: 8, marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                Pulling brand name + product image…
              </p>
            )}
            <p style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
              Paste a specific product URL — brand name, slug, and product image will auto-fill below. All fields stay editable. Brands often have multiple products — use the URL of the exact one you're creating ads for.
            </p>
          </div>

          {/* Brand Name */}
          <div>
            <label style={labelStyle}>
              <FileText size={14} color={G.textSec} />
              Brand Name <span style={{ color: G.textTer, fontWeight: 400, fontSize: 10, marginLeft: 4 }}>· auto-filled from URL, editable</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Auto-fills when URL is entered"
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
            {slugTaken && (
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: `${G.danger}08`, border: `1px solid ${G.danger}30` }}>
                <p style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.danger, margin: 0, marginBottom: 4 }}>
                  ⚠ This slug is already taken
                </p>
                <p style={{ ...mono, fontSize: 11, color: G.textSec, margin: 0, lineHeight: 1.5 }}>
                  Submitting will overwrite the existing proposal at this URL. If this is a different brand with the same name, edit the slug above (e.g. <code style={{ background: "#fff", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>{slug}-2</code> or <code style={{ background: "#fff", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>{slug}-bynamedhere</code>).
                </p>
              </div>
            )}
            {checkingSlug && !slugTaken && (
              <p style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 6 }}>Checking availability…</p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Auto-Generate Panel */}
          <div style={{ padding: 20, borderRadius: 14, border: `1px solid ${G.cardBorder}`, background: "#FAFAFA" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Sparkles size={14} color={G.text} />
              <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: G.text }}>Auto-Generate Samples</span>
            </div>
            <p style={{ ...mono, fontSize: 12, color: G.textSec, marginBottom: 16, lineHeight: 1.5 }}>
              Confirm the product reference image below, then click Auto-Generate to produce all 6 on-brand ads. The image auto-fills from the URL — replace it if it's not a clean product shot.
            </p>

            {/* Product Reference Upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 6 }}>
                <Image size={12} color={G.textSec} />
                Product Reference Image
              </label>
              <p style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 0, marginBottom: 10, lineHeight: 1.5 }}>
                Must be a <strong style={{ color: G.textSec }}>clear, high-quality, isolated product shot</strong> (clean background ideal). Low-quality, blurry, or obstructed images will produce bad ads.
              </p>

              {productRefUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={productRefUrl}
                      alt="Product reference"
                      onClick={() => setEnlargedImage(productRefUrl)}
                      title="Click to enlarge"
                      style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: `1px solid ${G.success}40`, cursor: "zoom-in" }}
                    />
                    {/* Download icon — top-left, frosted */}
                    <a
                      href={`/api/download-image?url=${encodeURIComponent(productRefUrl)}&name=${encodeURIComponent(`${slug || "product"}-reference.png`)}`}
                      title="Download reference image"
                      style={{
                        position: "absolute", top: 6, left: 6,
                        width: 24, height: 24, borderRadius: 6,
                        background: "rgba(255,255,255,0.92)",
                        color: G.text,
                        textDecoration: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        backdropFilter: "blur(8px)",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      <Download size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setProductRefUrl(null)}
                      title="Remove image"
                      style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: G.text, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label
                      style={{
                        ...mono, fontSize: 12, fontWeight: 600, color: G.text,
                        padding: "8px 14px", borderRadius: 8, border: `1px solid ${G.cardBorder}`,
                        background: "#fff", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: 6,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = G.text}
                      onMouseLeave={e => e.currentTarget.style.borderColor = G.cardBorder}
                    >
                      <Upload size={12} />
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => { handleProductRefUpload(e.target.files?.[0]); e.target.value = ""; }}
                        style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
                      />
                    </label>
                    {brandUrl && (
                      <button
                        type="button"
                        onClick={handleTryNextImage}
                        title={imageCandidates.length > 1 ? `Try a different image from this page (${imageCandidates.length} found)` : "Try fetching another image from the URL"}
                        style={{
                          ...mono, fontSize: 12, fontWeight: 600, color: G.text,
                          padding: "8px 14px", borderRadius: 8, border: `1px solid ${G.cardBorder}`,
                          background: "#fff", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: 6,
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = G.text}
                        onMouseLeave={e => e.currentTarget.style.borderColor = G.cardBorder}
                      >
                        <RefreshCw size={12} />
                        {imageCandidates.length > 1 ? `Try another (${candidateIndex + 1}/${imageCandidates.length})` : "Try another image"}
                      </button>
                    )}
                  </div>
                </div>
              ) : productRefUploading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 120, height: 120, border: `1px dashed ${G.cardBorder}`, borderRadius: 10, background: "#fff" }}>
                  <Loader2 size={20} color={G.textSec} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <label
                    style={{
                      position: "relative",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                      width: 120, height: 120, border: `1px dashed ${G.cardBorder}`, borderRadius: 10,
                      background: "#fff", cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = G.text}
                    onMouseLeave={e => e.currentTarget.style.borderColor = G.cardBorder}
                  >
                    <Upload size={16} color={G.textTer} />
                    <span style={{ ...mono, fontSize: 10, color: G.textSec, textAlign: "center", padding: "0 8px" }}>Upload product</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { handleProductRefUpload(e.target.files?.[0]); e.target.value = ""; }}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                    />
                  </label>
                  {brandUrl && (
                    <button
                      type="button"
                      onClick={handleAutoFetchAll}
                      title="Pull product image and brand name from the URL above"
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                        width: 120, height: 120, border: `1px dashed ${G.cardBorder}`, borderRadius: 10,
                        background: "#FAFAFA", cursor: "pointer",
                        transition: "border-color 0.15s, background 0.15s",
                        ...mono,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = G.text; e.currentTarget.style.background = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = G.cardBorder; e.currentTarget.style.background = "#FAFAFA"; }}
                    >
                      <Sparkles size={16} color={G.text} />
                      <span style={{ fontSize: 10, color: G.text, textAlign: "center", padding: "0 8px", fontWeight: 600 }}>Auto-fetch from URL</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Generate button (or Cancel button while running) */}
            {autoGenerating ? (
              <button
                type="button"
                onClick={() => {
                  if (abortRef.current) abortRef.current.abort();
                  setAutoGenerating(false);
                  setUploading(Array(6).fill(false));
                  setGenProgress({ completed: 0, total: 6, phase: "", stage: "idle" });
                  slotTimersRef.current.forEach(t => t && clearInterval(t));
                  slotTimersRef.current = [];
                  setSlotProgress(Array(6).fill(0));
                  setError("Cancelled.");
                }}
                style={{
                  width: "100%", padding: "12px 20px", borderRadius: 10,
                  background: "#F2F2F4",
                  color: G.textSec,
                  border: `1px solid ${G.cardBorder}`,
                  fontSize: 14, fontWeight: 600, ...mono,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#E8E8ED"; e.currentTarget.style.color = G.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F2F2F4"; e.currentTarget.style.color = G.textSec; }}
              >
                <X size={14} />
                Cancel — {generationStatus || "Working..."}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  disabled={(!brandUrl && !allPromptsFilled) || !slug}
                  style={{
                    width: "100%", padding: "12px 20px", borderRadius: 10,
                    background: ((!brandUrl && !allPromptsFilled) || !slug) ? "#E8E8ED" : G.text,
                    color: ((!brandUrl && !allPromptsFilled) || !slug) ? G.textTer : "#fff",
                    border: "none", fontSize: 14, fontWeight: 600, ...mono,
                    cursor: ((!brandUrl && !allPromptsFilled) || !slug) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  <Sparkles size={14} />
                  {allPromptsFilled ? "Generate Images from My Prompts" : "Auto-Generate All 6 Images"}
                </button>
                {!productRefUrl && slug && ((brandUrl) || allPromptsFilled) && (
                  <p style={{ ...mono, fontSize: 11, color: G.textTer, textAlign: "center", marginTop: 8, lineHeight: 1.4 }}>
                    No reference image — the AI will describe the product in detail from the brand site. Quality is better with a real product photo, but this works in a pinch.
                  </p>
                )}
              </>
            )}
            {autoGenerating && (
              <div style={{ marginTop: 12 }}>
                {/* Progress bar — indeterminate during prompt generation, determinate during image generation */}
                <div style={{ position: "relative", width: "100%", height: 6, background: "#E8E8ED", borderRadius: 3, overflow: "hidden" }}>
                  {genProgress.stage === "prompts" ? (
                    // Indeterminate animated bar while prompts are being written
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: "40%",
                        background: G.text,
                        borderRadius: 3,
                        animation: "indeterminate 1.4s infinite ease-in-out",
                      }}
                    />
                  ) : (
                    // Determinate bar during image generation
                    <div
                      style={{
                        width: `${(genProgress.completed / genProgress.total) * 100}%`,
                        height: "100%",
                        background: G.text,
                        borderRadius: 3,
                        transition: "width 0.4s ease-out",
                      }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: G.textSec }}>
                    {genProgress.phase || generationStatus || "Working..."}
                  </span>
                  <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.text }}>
                    {genProgress.stage === "prompts"
                      ? "Writing prompts…"
                      : `${genProgress.completed} / ${genProgress.total}`}
                  </span>
                </div>
              </div>
            )}

            {/* Prompts toggle / editor */}
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowPrompts(!showPrompts)}
                style={{
                  ...mono,
                  width: "100%",
                  background: "#fff",
                  border: `1px solid ${G.cardBorder}`,
                  borderRadius: 10,
                  color: G.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "12px 14px",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = G.text}
                onMouseLeave={e => e.currentTarget.style.borderColor = G.cardBorder}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={14} color={G.textSec} />
                  <span>{generatedPrompts ? "View / edit the 6 prompts" : "Use custom prompts (advanced)"}</span>
                </span>
                <ChevronDown size={16} color={G.textSec} style={{ transform: showPrompts ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </button>

              {showPrompts && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ ...mono, fontSize: 12, color: G.textSec, marginBottom: 12, lineHeight: 1.5 }}>
                    Fill in all 6 below to use your own prompts (skips the brand URL). Leave them empty to auto-generate from the brand site — they'll auto-populate so you can edit and regenerate any image individually.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {imageSlots.map((slot, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 6 }}>
                          <label style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.text }}>
                            {i + 1}. {slot.label}
                          </label>
                          <div style={{ display: "flex", gap: 4 }}>
                            {brandUrl && (
                              <button
                                type="button"
                                onClick={() => handleRewritePrompt(i)}
                                disabled={rewritingPrompts[i]}
                                title="Rewrite this prompt with a fresh Claude variation"
                                style={{
                                  ...mono, fontSize: 10, fontWeight: 600,
                                  padding: "3px 8px", borderRadius: 5,
                                  background: "#fff",
                                  color: rewritingPrompts[i] ? G.textTer : G.textSec,
                                  border: `1px solid ${G.cardBorder}`,
                                  cursor: rewritingPrompts[i] ? "default" : "pointer",
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  transition: "all 0.15s",
                                  opacity: rewritingPrompts[i] ? 0.6 : 1,
                                }}
                              >
                                {rewritingPrompts[i] ? (
                                  <>
                                    <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />
                                    Rewriting…
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw size={10} />
                                    Rewrite
                                  </>
                                )}
                              </button>
                            )}
                            {customPrompts[i]?.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(customPrompts[i]);
                                  setCopiedPromptIdx(i);
                                  setTimeout(() => setCopiedPromptIdx(null), 1800);
                                }}
                                title="Copy prompt — paste into Flow / Nano Banana"
                                style={{
                                  ...mono, fontSize: 10, fontWeight: 600,
                                  padding: "3px 8px", borderRadius: 5,
                                  background: copiedPromptIdx === i ? G.success : "#fff",
                                  color: copiedPromptIdx === i ? "#fff" : G.textSec,
                                  border: `1px solid ${copiedPromptIdx === i ? G.success : G.cardBorder}`,
                                  cursor: "pointer",
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  transition: "all 0.15s",
                                }}
                              >
                                {copiedPromptIdx === i ? <Check size={10} /> : <Copy size={10} />}
                                {copiedPromptIdx === i ? "Copied" : "Copy"}
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={customPrompts[i]}
                          onChange={(e) => {
                            const updated = [...customPrompts];
                            updated[i] = e.target.value;
                            setCustomPrompts(updated);
                          }}
                          placeholder={`Write your ${slot.label} prompt here, or leave empty to auto-generate.`}
                          rows={3}
                          style={{
                            ...mono,
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1px solid ${G.cardBorder}`,
                            background: "#fff",
                            fontSize: 12,
                            color: G.text,
                            outline: "none",
                            resize: "vertical",
                            lineHeight: 1.45,
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <p style={{ ...mono, fontSize: 11, color: G.textTer, marginTop: 10, lineHeight: 1.5 }}>
                    Tip: do not describe the product itself — just the scene, lighting, composition, and overlay text. The reference image handles the product.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: G.border }} />

          {/* Image Uploads */}
          <div>
            <label style={{ ...labelStyle, marginBottom: !slug && brandName === "" ? 4 : 16 }}>
              <Image size={14} color={G.textSec} />
              Creative Images ({imageUrls.filter(Boolean).length}/6)
            </label>
            {!slug && brandName === "" && (
              <p style={{ ...mono, fontSize: 12, color: G.textTer, marginBottom: 16, marginTop: 0 }}>
                Enter a brand name above to enable uploads.
              </p>
            )}

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
                          position: "relative",
                        }}
                      >
                        <img
                          src={imageUrls[i]}
                          alt={slot.label}
                          onClick={() => setEnlargedImage(imageUrls[i])}
                          title="Click to enlarge"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 11,
                            cursor: "zoom-in",
                          }}
                        />
                        {regenerating[i] && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11 }}>
                            <Loader2 size={20} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                          </div>
                        )}
                        {/* Action buttons cluster (top-right): regenerate + download */}
                        {!regenerating[i] && (
                          <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                            <a
                              href={`/api/download-image?url=${encodeURIComponent(imageUrls[i])}&name=${encodeURIComponent(`${slug || "image"}-${i + 1}-${slot.label.replace(/\s+/g, "-")}.png`)}`}
                              title="Download this image"
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                background: "rgba(255,255,255,0.92)",
                                color: G.text,
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                transition: "all 0.2s",
                                backdropFilter: "blur(8px)",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "scale(1.05)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; e.currentTarget.style.transform = "scale(1)"; }}
                            >
                              <Download size={12} />
                            </a>
                            {productRefUrl && (generatedPrompts || customPrompts[i]) && (
                              <button
                                type="button"
                                onClick={() => handleRegenerate(i)}
                                title="Regenerate with fresh prompt"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  background: G.text,
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 0,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#000"}
                                onMouseLeave={e => e.currentTarget.style.background = G.text}
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}
                          </div>
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
                    </>
                  ) : (uploading[i] || regenerating[i]) ? (
                    <div
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
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Shimmer animation overlay */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                        animation: "shimmer 1.6s infinite",
                      }} />
                      <Loader2
                        size={20}
                        color={G.text}
                        style={{ animation: "spin 1s linear infinite", zIndex: 1 }}
                      />
                      <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: G.textSec, zIndex: 1, textAlign: "center", padding: "0 4px" }}>
                        {regenerating[i]
                          ? slotManualRetries[i] > 1
                            ? `Regenerating (try #${slotManualRetries[i]})…`
                            : "Regenerating with fresh prompt…"
                          : autoGenerating
                          ? slotAttempts[i] > 1
                            ? `Retry ${slotAttempts[i]}/8 · ${Math.round(slotProgress[i])}%`
                            : `${Math.round(slotProgress[i])}%`
                          : "Uploading..."}
                      </span>
                      {/* Per-slot progress bar synced to actual API call lifecycle */}
                      {autoGenerating && (
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.06)", zIndex: 2 }}>
                          <div
                            style={{
                              width: `${slotProgress[i]}%`,
                              height: "100%",
                              background: G.text,
                              transition: slotProgress[i] === 100 ? "width 0.2s ease-out" : "width 0.3s linear",
                            }}
                          />
                        </div>
                      )}
                      {/* Always-available action cluster: cancel + regenerate
                          (so a stuck upload/regen can always be broken out of) */}
                      <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4, zIndex: 3 }}>
                        {(generatedPrompts || customPrompts[i]) && productRefUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              // Reset stuck state then fire fresh regenerate
                              setUploading(prev => { const u = [...prev]; u[i] = false; return u; });
                              setRegenerating(prev => { const u = [...prev]; u[i] = false; return u; });
                              handleRegenerate(i);
                            }}
                            title="Force regenerate this slot"
                            style={{
                              width: 24, height: 24, borderRadius: 6,
                              background: G.text, color: "#fff", border: "none",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            // Cancel the stuck slot — reset to empty
                            setUploading(prev => { const u = [...prev]; u[i] = false; return u; });
                            setRegenerating(prev => { const u = [...prev]; u[i] = false; return u; });
                          }}
                          title="Cancel and reset this slot"
                          style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: "rgba(255,255,255,0.92)", color: G.text, border: "none",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : slotErrors[i] ? (
                    // ── Failed slot: show error + retry + manual upload fallback ──
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 140,
                        border: `1px solid ${G.danger}40`,
                        borderRadius: 12,
                        background: `${G.danger}06`,
                        padding: "8px",
                        textAlign: "center",
                        position: "relative",
                      }}
                    >
                      <AlertCircle size={16} color={G.danger} />
                      <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: G.danger }}>Failed to generate</span>
                      <span style={{ ...mono, fontSize: 9, color: G.textSec, lineHeight: 1.3, padding: "0 4px", maxHeight: 30, overflow: "hidden" }}>
                        {slotErrors[i].length > 80 ? slotErrors[i].slice(0, 80) + "…" : slotErrors[i]}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(generatedPrompts || customPrompts[i]) && productRefUrl && (
                          <button
                            type="button"
                            onClick={() => handleRegenerate(i)}
                            title="Regenerate this image"
                            style={{
                              ...mono, fontSize: 10, fontWeight: 600,
                              padding: "4px 10px", borderRadius: 6,
                              background: G.text, color: "#fff",
                              border: "none", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <RefreshCw size={10} />
                            Retry
                          </button>
                        )}
                        <label
                          style={{
                            ...mono, fontSize: 10, fontWeight: 600,
                            padding: "4px 10px", borderRadius: 6,
                            background: "#fff", color: G.text,
                            border: `1px solid ${G.cardBorder}`, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 4,
                            position: "relative",
                          }}
                        >
                          <Upload size={10} />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              handleImageUpload(e.target.files?.[0], i);
                              e.target.value = "";
                            }}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                          />
                        </label>
                      </div>
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
                        position: "relative",
                      }}
                    >
                      <Upload size={18} color={G.textTer} />
                      <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: G.text }}>{slot.label}</span>
                      <span style={{ ...mono, fontSize: 10, color: G.textTer, lineHeight: 1.3 }}>{slot.description}</span>
                      {(generatedPrompts || customPrompts[i]) && productRefUrl && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRegenerate(i); }}
                          title="Generate this slot from its prompt"
                          style={{
                            ...mono, fontSize: 10, fontWeight: 600,
                            padding: "4px 10px", borderRadius: 6,
                            background: G.text, color: "#fff",
                            border: "none", cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 4,
                            marginTop: 2, zIndex: 2,
                          }}
                        >
                          <Sparkles size={10} />
                          Generate
                        </button>
                      )}
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
          {(() => {
            const filledImageCount = imageUrls.filter(Boolean).length;
            const anyUploading = uploading.some(Boolean);
            const anyRegenerating = regenerating.some(Boolean);
            const notReady = !brandName || !slug || filledImageCount < 6 || autoGenerating || anyUploading || anyRegenerating;
            const submitDisabled = submitting || notReady;
            return (
              <>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  style={{
                    ...mono,
                    width: "100%",
                    padding: "14px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    background: submitDisabled ? G.textTer : G.gold,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 10,
                    cursor: submitDisabled ? "not-allowed" : "pointer",
                    transition: "background 0.15s, opacity 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Creating...
                    </>
                  ) : (
                    "Create Proposal"
                  )}
                </button>
                {notReady && !submitting && (
                  <p style={{ ...mono, fontSize: 11, color: G.textTer, textAlign: "center", marginTop: 8 }}>
                    {!brandName || !slug
                      ? "Need brand name and slug before creating."
                      : autoGenerating
                      ? "Wait for all 6 images to finish generating..."
                      : anyUploading || anyRegenerating
                      ? "Wait for images to finish uploading..."
                      : `${filledImageCount} / 6 images ready — fill the remaining slots first.`}
                  </p>
                )}
              </>
            );
          })()}
        </form>

        {/* Persistent "Create Another Proposal" link — opens in new tab so the
            team can run multiple proposals in parallel without losing state on
            this page. Visible from the start, not only after success. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <a
            href="/proposal/create"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...mono,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 28px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.01em",
              background: G.text,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 980,
              cursor: "pointer",
              textDecoration: "none",
              transition: "opacity 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create Another Proposal
          </a>
        </div>

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
            <a
              href="/proposal/create"
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
                background: "#FFFFFF",
                color: G.text,
                border: `1px solid ${G.cardBorder}`,
                borderRadius: 10,
                cursor: "pointer",
                textDecoration: "none",
                marginTop: 8,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = G.text}
              onMouseLeave={e => e.currentTarget.style.borderColor = G.cardBorder}
            >
              <Plus size={14} />
              Create Another Proposal
            </a>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ maxWidth: 1120, margin: "60px auto 0", padding: "32px 24px 40px" }}>
        <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Productions</span>
            </div>
            <span style={{ fontSize: 12, color: G.textTer, ...mono }}>Internal Tool</span>
          </div>
          <span style={{ fontSize: 11, color: G.textTer, ...mono }}>&copy; 2026 Alchemy Productions LLC. All rights reserved.</span>
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes indeterminate {
          0% { left: -40%; width: 40%; }
          50% { left: 30%; width: 50%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>

      {/* ── Lightbox: click any image to enlarge ── */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 32, cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={() => setEnlargedImage(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <X size={18} />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 20px 80px rgba(0,0,0,0.5)", cursor: "zoom-out" }}
          />
        </div>
      )}

    </div>
    </>
  );
}
