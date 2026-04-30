// Single source of truth for the design language used across the team
// workspace and the client portal. Edit colors, typography, or button styles
// here once and both views pick it up.

export const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  ink: "#000000",
  inkSoft: "#00000008",
  inkBorder: "#D2D2D7",
  text: "#1D1D1F",
  textSec: "#86868B",
  textTer: "#AEAEB2",
  border: "#E8E8ED",
  success: "#34C759",
  info: "#007AFF",
  approve: "#30A46C",
  reject: "#E5484D",
  revision: "#3E8ED0",
  sidebar: "#FAFAFA",
};

// Backwards-compat alias - both view files refer to the palette as `G`.
// Prefer COLORS in new code; G stays around so existing imports keep working.
export const G = COLORS;

export const hd = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

export const mono = {
  fontFamily: "'Inter', -apple-system, sans-serif",
};

// Button styles - reusable across both views. Use as `style={{ ...btnPrimary }}`.
export const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: "#fff",
  background: COLORS.ink,
  border: "none",
  borderRadius: 980,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

export const btnSecondary = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.text,
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 980,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

// Tag pill (used for personality tags, voice styles, etc.)
export const tagStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: COLORS.textSec,
  padding: "4px 10px",
  background: "#F5F5F7",
  borderRadius: 980,
  border: `1px solid ${COLORS.border}`,
};

// Small uppercase label (used as section labels inside cards)
export const brandLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: COLORS.textTer,
  marginBottom: 6,
};
