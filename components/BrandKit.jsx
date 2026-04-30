"use client";
// Shared brand-kit display primitives. Both /team/[slug] (Brand Guidelines section)
// and /client/[slug] (Brand Guidelines section) render brand info using these
// components. Edit any one of them here and both views update simultaneously.

import { COLORS, hd, brandLabelStyle } from "@/lib/design";

/**
 * Container card for a brand-kit section (Brand Story, Personality, Voice, etc.)
 */
export function BrandCard({ title, children, fullWidth }) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: COLORS.cardShadow,
        borderRadius: 18,
        padding: 24,
        gridColumn: fullWidth ? "1 / -1" : "auto",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: COLORS.textTer,
          marginBottom: 14,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * Compact label/value row inside a BrandCard. Best for short values.
 */
export function BrandRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px minmax(0, 1fr)", // minmax(0, 1fr) lets the value column actually shrink so long URLs/text wrap inside the card
        gap: 12,
        padding: "8px 0",
        borderBottom: `1px solid ${COLORS.border}`,
        alignItems: "start",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: COLORS.textTer,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: COLORS.text,
          lineHeight: 1.5,
          minWidth: 0,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Stacked label/value row for longer prose values (audience descriptions,
 * deep fears, etc.). Wraps onto multiple lines with comfortable line-height.
 */
export function BrandLongRow({ label, value }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <p
        style={{
          fontSize: 11,
          color: COLORS.textTer,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          color: COLORS.text,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * The full grid of brand-kit cards. Pass an `intake` row from `brand_intake`
 * and this renders the entire kit (story, details, personality, colors,
 * audience, spokesperson, voice, music, video direction, strategy, features,
 * testimonials, products). Used identically by team + client views.
 */
export function BrandKitGrid({ intake }) {
  if (!intake) return null;

  const colorChips = (intake.brand_colors || "")
    .toString()
    .split(/[,\s]+/)
    .filter((c) => /^#?[0-9A-Fa-f]{3,8}$/.test(c));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      {(intake.tagline || intake.story) && (
        <BrandCard fullWidth title="Brand Story">
          {intake.tagline && (
            <p
              style={{
                ...hd,
                fontSize: 26,
                color: COLORS.text,
                marginBottom: 12,
                lineHeight: 1.25,
                fontStyle: "italic",
              }}
            >
              &ldquo;{intake.tagline}&rdquo;
            </p>
          )}
          {intake.story && (
            <p style={{ fontSize: 14, color: COLORS.textSec, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {intake.story}
            </p>
          )}
        </BrandCard>
      )}

      <BrandCard title="Brand Details">
        {[
          ["Brand", intake.brand_name],
          ["Website", intake.website],
          ["Industry", intake.industry],
          ["Location", intake.location],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <BrandRow key={k} label={k} value={v} />
          ))}
      </BrandCard>

      {(intake.personality_tags?.length > 0 || typeof intake.tone_formality === "number") && (
        <BrandCard title="Personality & Tone">
          {intake.personality_tags?.length > 0 && (
            <div style={{ marginBottom: typeof intake.tone_formality === "number" ? 16 : 0 }}>
              <p style={brandLabelStyle}>Personality</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {intake.personality_tags.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: COLORS.textSec,
                      padding: "4px 10px",
                      background: "#F5F5F7",
                      borderRadius: 980,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {[
            ["Formality", intake.tone_formality],
            ["Mood", intake.tone_mood],
            ["Intensity", intake.tone_intensity],
          ]
            .filter(([, v]) => typeof v === "number")
            .map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <p style={{ ...brandLabelStyle, marginBottom: 4 }}>{k}</p>
                <div style={{ position: "relative", height: 6, background: "#F5F5F7", borderRadius: 999 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${v}%`,
                      background: COLORS.ink,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
        </BrandCard>
      )}

      {colorChips.length > 0 && (
        <BrandCard title="Brand Colors">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {colorChips.map((c, i) => {
              const hex = c.startsWith("#") ? c : `#${c}`;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: hex, border: `1px solid ${COLORS.border}` }} />
                  <span style={{ fontSize: 10, color: COLORS.textTer, fontFamily: "monospace" }}>{hex}</span>
                </div>
              );
            })}
          </div>
        </BrandCard>
      )}

      {(intake.audience_description || intake.age_range || intake.competitors || intake.deepest_fears || intake.deepest_desires) && (
        <BrandCard fullWidth title="Audience & Market">
          {intake.age_range && <BrandRow label="Age Range" value={intake.age_range} />}
          {intake.audience_description && <BrandLongRow label="Audience" value={intake.audience_description} />}
          {intake.competitors && <BrandLongRow label="Competitors" value={intake.competitors} />}
          {intake.deepest_fears && <BrandLongRow label="Deep Fears" value={intake.deepest_fears} />}
          {intake.deepest_desires && <BrandLongRow label="Deep Desires" value={intake.deepest_desires} />}
        </BrandCard>
      )}

      {(intake.influencer_age || intake.influencer_gender || intake.influencer_style || intake.influencer_personality || intake.influencer_notes) && (
        <BrandCard fullWidth title="Spokesperson Profile">
          {[
            ["Age", intake.influencer_age],
            ["Gender", intake.influencer_gender],
            ["Ethnicity", intake.influencer_ethnicity],
            ["Body Type", intake.influencer_body_type],
            ["Hair", [intake.influencer_hair_color, intake.influencer_hair_style].filter(Boolean).join(", ")],
            ["Style", intake.influencer_style],
            ["Personality", intake.influencer_personality],
            ["Notes", intake.influencer_notes],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) =>
              String(v).length > 90 ? <BrandLongRow key={k} label={k} value={v} /> : <BrandRow key={k} label={k} value={v} />
            )}
        </BrandCard>
      )}

      {(intake.voice_style?.length > 0 || intake.voice_gender || intake.voice_age || intake.voice_notes) && (
        <BrandCard title="Voice">
          {intake.voice_style?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={brandLabelStyle}>Style</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {intake.voice_style.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: COLORS.textSec,
                      padding: "4px 10px",
                      background: "#F5F5F7",
                      borderRadius: 980,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {intake.voice_gender && <BrandRow label="Gender" value={intake.voice_gender} />}
          {intake.voice_age && <BrandRow label="Age" value={intake.voice_age} />}
          {intake.voice_notes && <BrandLongRow label="Notes" value={intake.voice_notes} />}
        </BrandCard>
      )}

      {(intake.music_mood?.length > 0 || intake.music_genres?.length > 0 || intake.music_notes) && (
        <BrandCard title="Music">
          {intake.music_mood?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={brandLabelStyle}>Mood</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {intake.music_mood.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: COLORS.textSec,
                      padding: "4px 10px",
                      background: "#F5F5F7",
                      borderRadius: 980,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {intake.music_genres?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={brandLabelStyle}>Genres</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {intake.music_genres.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: COLORS.textSec,
                      padding: "4px 10px",
                      background: "#F5F5F7",
                      borderRadius: 980,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {intake.music_notes && <BrandLongRow label="Notes" value={intake.music_notes} />}
        </BrandCard>
      )}

      {(typeof intake.video_pace === "number" || intake.video_transitions || intake.video_notes) && (
        <BrandCard title="Video Direction">
          {intake.video_transitions && <BrandRow label="Transitions" value={intake.video_transitions} />}
          {intake.video_cuts && <BrandRow label="Cuts" value={intake.video_cuts} />}
          {intake.video_notes && <BrandLongRow label="Notes" value={intake.video_notes} />}
        </BrandCard>
      )}

      {(intake.objective || intake.key_message || intake.target_audience || intake.campaign_goals) && (
        <BrandCard fullWidth title="Strategy">
          {[
            ["Objective", intake.objective],
            ["Audience", intake.target_audience],
            ["Goals", intake.campaign_goals],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) =>
              String(v).length > 90 ? <BrandLongRow key={k} label={k} value={v} /> : <BrandRow key={k} label={k} value={v} />
            )}
          {intake.key_message && <BrandLongRow label="Key Message" value={intake.key_message} />}
        </BrandCard>
      )}

      {intake.unique_features?.length > 0 && (
        <BrandCard fullWidth title="Unique Features">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {intake.unique_features.map((f, i) => (
              <div
                key={i}
                style={{ padding: "10px 14px", background: "#F5F5F7", borderRadius: 10, fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}
              >
                {f}
              </div>
            ))}
          </div>
        </BrandCard>
      )}

      {intake.testimonials?.length > 0 && (
        <BrandCard fullWidth title="Testimonials">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {intake.testimonials.map((t, i) => (
              <div
                key={i}
                style={{ padding: 14, background: "#F5F5F7", borderRadius: 10, fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
              >
                {t}
              </div>
            ))}
          </div>
        </BrandCard>
      )}

      {intake.product_image_urls?.length > 0 && (
        <BrandCard fullWidth title="Products">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {intake.product_image_urls.map((u, i) => (
              <img
                key={i}
                src={u}
                alt=""
                style={{ width: 110, height: 110, borderRadius: 12, objectFit: "cover", border: `1px solid ${COLORS.border}` }}
              />
            ))}
          </div>
        </BrandCard>
      )}
    </div>
  );
}
