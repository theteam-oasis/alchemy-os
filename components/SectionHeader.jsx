"use client";
// Shared section header used by both the team workspace (/team/[slug]) and the
// client portal (/client/[slug]). Editing this one component changes the
// header proportions, font sizes, and spacing across BOTH views at once.
//
// Props:
//   title    - the section title (e.g., "Analytics", "Creatives", "Brand Guidelines")
//   subtitle - one-line description below the title
//   right    - optional React node rendered on the right (e.g., team-only "Client View" button)

const hd = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

const COLORS = {
  text: "#1D1D1F",
  textSec: "#86868B",
};

export default function SectionHeader({ title, subtitle, right }) {
  return (
    <div
      style={{
        marginBottom: 24,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ ...hd, fontSize: 36, color: COLORS.text, marginBottom: 4 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: COLORS.textSec, lineHeight: 1.5, maxWidth: 700 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
