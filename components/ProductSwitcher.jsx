"use client";
// Pill nav that lets the user switch between products for a client. Used in
// both the team workspace (/team/[slug]) and the client portal (/client/[slug]).
// All sections (Analytics, Creatives, Brand) are filtered to whichever product
// is selected. The "+ Add" button + per-row delete are only shown when canAdd
// is true (team view).

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { COLORS, mono } from "@/lib/design";
import NewProductModal from "./NewProductModal";

// `onAdd(productObj)` fires after the modal saves a new product.
// `onDelete(productObj)` fires when the trash icon is confirmed (team view only).
export default function ProductSwitcher({ products, activeId, onChange, onAdd, onDelete, canAdd, clientId }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hovered, setHovered] = useState(null);

  if (!products || products.length === 0) return null;

  const handleDelete = (e, p) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && window.confirm(`Delete product "${p.name}"? This will also delete its analytics dashboard, creatives portal, and brand kit. This cannot be undone.`)) {
      onDelete?.(p);
    }
  };

  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.textTer, padding: "4px 4px 6px", ...mono }}>
        Products
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {products.map((p) => {
          const active = p.id === activeId;
          const isHover = hovered === p.id;
          return (
            <div key={p.id} style={{ position: "relative" }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}>
              <button
                onClick={() => onChange?.(p)}
                style={{
                  ...mono,
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", paddingRight: canAdd ? 30 : 10,
                  borderRadius: 8, fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#fff" : COLORS.textSec,
                  background: active ? COLORS.ink : isHover ? "#fff" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.15s",
                }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#fff" : COLORS.textTer, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
              </button>
              {canAdd && onDelete && isHover && products.length > 1 && (
                // Only allow deleting when more than one product exists, so the
                // client always has at least one product to view.
                <button onClick={(e) => handleDelete(e, p)}
                  title="Delete product"
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: active ? "rgba(255,255,255,0.7)" : COLORS.textTer, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(229,72,77,0.15)"; e.currentTarget.style.color = "#E5484D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "rgba(255,255,255,0.7)" : COLORS.textTer; }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
        {canAdd && (
          <button onClick={() => setModalOpen(true)}
            style={{
              ...mono,
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              color: COLORS.textTer, background: "transparent",
              border: `1px dashed ${COLORS.border}`, cursor: "pointer",
              textAlign: "left", width: "100%",
              transition: "all 0.15s", marginTop: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.text; e.currentTarget.style.borderColor = COLORS.textTer; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textTer; e.currentTarget.style.borderColor = COLORS.border; }}>
            <Plus size={12} /> Add product
          </button>
        )}
      </div>
      {canAdd && (
        <NewProductModal
          open={modalOpen}
          clientId={clientId}
          onClose={() => setModalOpen(false)}
          onCreated={(p) => { if (p) onAdd?.(p); }}
        />
      )}
    </div>
  );
}
