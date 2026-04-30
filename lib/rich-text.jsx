"use client";
// Inline-markdown renderer for AI chat output. Handles the formatting
// patterns models reach for unprompted: **bold**, *italic*, and `code`.
// Everything else passes through as plain text. Preserves whitespace via
// the parent's whiteSpace: pre-wrap so newlines still line-break.

import React from "react";

// Splits a string into segments by inline markdown markers, returning
// React fragments. Order matters: bold (**) first so we don't mistake
// the inner asterisks for italic.
export function RichText({ text }) {
  if (!text) return null;
  const segments = [];
  let remaining = String(text);
  let key = 0;

  // We use a single regex that captures any of the three forms with
  // priority: bold > italic > code. The replace callback can't return
  // React, so we do a manual walk.
  const pattern = /(\*\*([^\n*]+)\*\*)|(\*([^\n*]+)\*)|(`([^`]+)`)/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match) {
      segments.push(remaining);
      break;
    }
    const before = remaining.slice(0, match.index);
    if (before) segments.push(before);
    if (match[1]) {
      // **bold**
      segments.push(<strong key={`b-${key++}`} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      segments.push(<em key={`i-${key++}`}>{match[4]}</em>);
    } else if (match[5]) {
      // `code`
      segments.push(<code key={`c-${key++}`} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontSize: "0.92em" }}>{match[6]}</code>);
    }
    remaining = remaining.slice(match.index + match[0].length);
  }

  return <>{segments}</>;
}
