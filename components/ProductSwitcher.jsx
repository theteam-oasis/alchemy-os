"use client";
// Pill nav that lets the user switch between products for a client. Used in
// both the team workspace (/team/[slug]) and the client portal (/client/[slug]).
// All sections (Analytics, Creatives, Brand) are filtered to whichever product
// is selected. The "+ Add" button is only shown when canAdd is true (team view).

import { useState } from "react";
import { Plus } from "lucide-react";
import { COLORS, mono } from "@/lib/design";
import NewProductModal from "./NewProductModal";

// `onAdd(productObj)` is fired after the modal saves. The clientId is required
// for the modal to know where to save the new product.
export default function ProductSwitcher({ products, activeId, onChange, onAdd, canAdd, clientId }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!products || products.length === 0) return null;

  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
      <p
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: COLORS.textTer,
          padding: "4px 4px 6px",
          ...mono,
        }}
      >
        Products
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {products.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onChange?.(p)}
              style={{
                ...mono,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? "#fff" : COLORS.textSec,
                background: active ? COLORS.ink : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#fff";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active ? "#fff" : COLORS.textTer,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </span>
            </button>
          );
        })}
        {canAdd && (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              ...mono,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.textTer,
              background: "transparent",
              border: `1px dashed ${COLORS.border}`,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "all 0.15s",
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLORS.text;
              e.currentTarget.style.borderColor = COLORS.textTer;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLORS.textTer;
              e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
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
