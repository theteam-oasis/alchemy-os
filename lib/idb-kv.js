// Tiny promise-based IndexedDB key/value store. Used for the Potential
// Energy demo content libraries — localStorage's ~5MB cap can't fit 20
// uploaded images, so we stash them here instead. One DB, one object
// store, string keys, JSON-serializable values.

const DB_NAME = "alchemy-content";
const STORE = "kv";
const VERSION = 1;

let dbPromise = null;

function openDB() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn("idbSet failed", e?.message);
    return false;
  }
}

export async function idbDel(key) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Downscale an image File to a reasonable max edge before base64-encoding.
// Keeps the demo snappy and the DB small without us asking the user to
// resize anything themselves.
export function fileToDownscaledDataUrl(file, { maxEdge = 1600, quality = 0.88 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const { width: w, height: h } = img;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const tw = Math.round(w * scale);
        const th = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, tw, th);
        // Preserve PNG transparency, otherwise compress to JPEG.
        const isPng = (file.type || "").toLowerCase().includes("png");
        const out = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? undefined : quality);
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Same as fileToDownscaledDataUrl but returns a Blob ready for Supabase
// Storage uploads (which prefers binary over base64 — half the byte size,
// no double-encoding).
export function fileToDownscaledBlob(file, { maxEdge = 1600, quality = 0.88 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const { width: w, height: h } = img;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const tw = Math.round(w * scale);
        const th = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, tw, th);
        const isPng = (file.type || "").toLowerCase().includes("png");
        const mime = isPng ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("blob encoding failed"));
            resolve({ blob, mime });
          },
          mime,
          isPng ? undefined : quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
