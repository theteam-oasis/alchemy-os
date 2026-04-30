"use client";
// Shared floating dock used by BOTH the team chat (DashboardChat) and the
// client chat (PortalChat). Single source of truth so the pill, the slide
// indicator, the pulse rings, and the press feedback are byte-for-byte
// identical across views. Edit here once, both update.
//
// Props:
//   activeKey  - which slot is selected ("oracle" | "chat" or any string the parent uses)
//   leftKey    - the key for the LEFT slot (sparkle/oracle by default)
//   rightKey   - the key for the RIGHT slot
//   onSelect   - called with the new tab key when the user toggles
//   leftIcon   - React node for the left slot
//   rightIcon  - React node for the right slot
//   rightBadge - optional React node rendered at the top-right of the chat icon
//   pulse      - true to render the looping radar rings (default true)

import { useState } from "react";

export default function ChatDock({
  activeKey, leftKey = "oracle", rightKey = "chat",
  onSelect, leftIcon, rightIcon, rightBadge, pulse = true,
}) {
  const [press, setPress] = useState(false);
  const flash = () => { setPress(true); setTimeout(() => setPress(false), 280); };
  const toggle = () => {
    flash();
    onSelect?.(activeKey === leftKey ? rightKey : leftKey);
  };
  const isLeft = activeKey === leftKey;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9998,
      transform: `scale(${press ? 0.97 : 1})`,
      transition: "transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)",
    }}>
      <style>{`
        @keyframes chatDockPulse {
          0%   { transform: scale(1);    opacity: 0.45; }
          60%  { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
      `}</style>

      {/* Two staggered ripples, ALWAYS on (slow + consistent). */}
      {pulse && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 999, border: "2px solid #1D1D1F",
            animation: "chatDockPulse 3s ease-out infinite",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 999, border: "2px solid #1D1D1F",
            animation: "chatDockPulse 3s ease-out 1.5s infinite",
            pointerEvents: "none",
          }} />
        </>
      )}

      <div style={{
        position: "relative", display: "flex", height: 45,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
        borderRadius: 999, padding: 3,
        boxShadow: "0 14px 40px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.55), 0 0 0 0.5px rgba(0,0,0,0.04)",
      }}>
        {/* Sliding indicator */}
        <div style={{
          position: "absolute", top: 3, bottom: 3, width: 66,
          left: isLeft ? 3 : 69,
          background: "linear-gradient(135deg, #1F1F23, #050505)",
          borderRadius: 999,
          boxShadow: "0 3px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "left 0.48s cubic-bezier(0.65, 0, 0.35, 1)",
          zIndex: 0,
        }} />

        {/* Left button */}
        <button onClick={toggle} aria-label={`Toggle to ${rightKey}`}
          style={{
            position: "relative", zIndex: 1, width: 66, height: 39,
            borderRadius: 999, background: "transparent", border: "none",
            cursor: "pointer", padding: 0,
            color: isLeft ? "#fff" : "#9A9AA0",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
          }}>
          {leftIcon}
        </button>

        {/* Right button */}
        <button onClick={toggle} aria-label={`Toggle to ${leftKey}`}
          style={{
            position: "relative", zIndex: 1, width: 66, height: 39,
            borderRadius: 999, background: "transparent", border: "none",
            cursor: "pointer", padding: 0,
            color: !isLeft ? "#fff" : "#9A9AA0",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "color 0.36s cubic-bezier(0.65, 0, 0.35, 1) 0.06s",
          }}>
          {rightIcon}
          {rightBadge}
        </button>
      </div>
    </div>
  );
}

// Reusable icon nodes so both views render the same SVG paths
export const SparkleIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ overflow: "visible" }}>
    <path d="M12 1.5c.4 0 .7.25.83.62l1.6 4.7a4 4 0 0 0 2.55 2.55l4.7 1.6c.37.13.62.46.62.83 0 .4-.25.7-.62.83l-4.7 1.6a4 4 0 0 0-2.55 2.55l-1.6 4.7c-.13.37-.46.62-.83.62-.4 0-.7-.25-.83-.62l-1.6-4.7a4 4 0 0 0-2.55-2.55l-4.7-1.6C2.25 12.5 2 12.17 2 11.8c0-.4.25-.7.62-.83l4.7-1.6a4 4 0 0 0 2.55-2.55l1.6-4.7c.13-.37.46-.62.83-.62z"/>
    <path d="M19.5 16.4c.18 0 .33.11.39.28l.46 1.34a1.6 1.6 0 0 0 1 1l1.34.46c.17.06.28.21.28.39 0 .18-.11.33-.28.39l-1.34.46a1.6 1.6 0 0 0-1 1l-.46 1.34c-.06.17-.21.28-.39.28-.18 0-.33-.11-.39-.28l-.46-1.34a1.6 1.6 0 0 0-1-1l-1.34-.46c-.17-.06-.28-.21-.28-.39 0-.18.11-.33.28-.39l1.34-.46a1.6 1.6 0 0 0 1-1l.46-1.34c.06-.17.21-.28.39-.28z" opacity="0.85"/>
  </svg>
);

export const ChatIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);
