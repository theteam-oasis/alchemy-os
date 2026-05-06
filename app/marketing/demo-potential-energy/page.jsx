"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import { idbGet, idbSet, fileToDownscaledDataUrl, fileToDownscaledBlob } from "@/lib/idb-kv";
import { supabase } from "@/lib/supabase";
import { Sparkles, Hash, Users, Megaphone, Eye, Newspaper, Palette, Type, User, Download, ImagePlus, X, Images, MessageSquare, FileText, Plus, Trash2, Check, CheckCircle2, RefreshCw } from "lucide-react";

// ── 5 AI Influencer Accounts ──

const ACCOUNTS = [
  {
    id: "riskreport",
    handle: "@theriskreport",
    name: "The Risk Report",
    emoji: "📰",
    persona: "Female AI news anchor influencer",
    tone: "Authoritative, credible, direct, polished, urgently informative",
    audience: "Professional / business decision-makers · 35–55 · national",
    message: "Your energy bill just changed. Here's what they didn't tell you.",
    pillars: "Data-backed educational posts · infographics · policy news · personal testimonials",
    visual: "Clean editorial; Bloomberg-meets-street-journalism",
    accent: "#DC2626",
    brandKit: {
      colors: [
        { name: "Signal Red", hex: "#DC2626" },
        { name: "Deep Crimson", hex: "#991B1B" },
        { name: "Ink Black", hex: "#0A0A0A" },
        { name: "Newsprint", hex: "#F5F2EC" },
        { name: "Steel", hex: "#525252" },
      ],
      fonts: {
        heading: { name: "Playfair Display", style: "Editorial Serif", family: "'Playfair Display', Georgia, serif" },
        body: { name: "Inter", style: "Sans · Body", family: "'Inter', sans-serif" },
      },
      avatar: { bg: "linear-gradient(135deg, #1A1A1A 0%, #DC2626 100%)", initials: "TR" },
      image: "/personas/risk-report.png",
    },
    seed: 11,
    platforms: ["Instagram", "TikTok"],
    cadence: { Reel: 4, Post: 2, Carousel: 1, Story: 4, Video: 3 },
    reachBase: [50000, 220000],
    erBase: 5.2,
    growth: 1.2,
  },
  {
    id: "reallifefeed",
    handle: "@thereallifefeed",
    name: "The Real Life Feed",
    emoji: "💁‍♀️",
    persona: "Health / wellness mom influencer",
    tone: "Playful, warm, surprising, relatable, unfiltered",
    audience: "Young moderates · 22–35 · suburban / urban national",
    message: "Nobody told me adulting meant crying over my electricity bill in the Target parking lot.",
    pillars: "Unconventional formats · humorous sketches · trend-based viral content",
    visual: "Bright, organic, lifestyle-forward; warm tones, friend-of-the-feed energy",
    accent: "#F59E0B",
    brandKit: {
      colors: [
        { name: "Sunset Amber", hex: "#F59E0B" },
        { name: "Tangerine", hex: "#FB923C" },
        { name: "Cream", hex: "#FEF3C7" },
        { name: "Cocoa", hex: "#78350F" },
        { name: "Warm White", hex: "#FFFBF5" },
      ],
      fonts: {
        heading: { name: "Fraunces", style: "Soft Serif", family: "'Fraunces', Georgia, serif" },
        body: { name: "Nunito", style: "Rounded Sans", family: "'Nunito', sans-serif" },
      },
      avatar: { bg: "linear-gradient(135deg, #FB923C 0%, #F59E0B 100%)", initials: "RL" },
      image: "/personas/real-life-feed.png",
    },
    seed: 22,
    platforms: ["Instagram", "TikTok"],
    cadence: { Reel: 5, Post: 2, Carousel: 1, Story: 6, Video: 4 },
    reachBase: [40000, 320000],
    erBase: 8.4,
    growth: 1.7,
  },
  {
    id: "numbersbehindit",
    handle: "@thenumbersbehindit",
    name: "The Numbers Behind It",
    emoji: "📊",
    persona: "Blue-collar Midwest male, conspiracy-theorist archetype",
    tone: "Raw, passionate, skeptical, truth-telling, blue-collar wisdom",
    audience: "Right-leaning / populist moderates · 30–55 · heartland / rural national",
    message: "They raised your rates AGAIN and nobody's talking about it. Let me show you the numbers.",
    pillars: "Hidden-fact revelations · anecdotal storytelling · provocative rants · headline dot-connecting",
    visual: "Intentionally gritty; dark moody tones, bold red/white overlays",
    accent: "#7C3AED",
    brandKit: {
      colors: [
        { name: "Static Violet", hex: "#7C3AED" },
        { name: "Midnight", hex: "#1E1B4B" },
        { name: "Alert Red", hex: "#DC2626" },
        { name: "Bone", hex: "#FAFAFA" },
        { name: "Charcoal", hex: "#18181B" },
      ],
      fonts: {
        heading: { name: "Bebas Neue", style: "Display · Condensed", family: "'Bebas Neue', Impact, sans-serif" },
        body: { name: "IBM Plex Mono", style: "Mono · Body", family: "'IBM Plex Mono', Menlo, monospace" },
      },
      avatar: { bg: "linear-gradient(135deg, #18181B 0%, #7C3AED 100%)", initials: "NB" },
      image: "/personas/numbers-behind-it.png",
    },
    seed: 33,
    platforms: ["TikTok", "Instagram"],
    cadence: { Reel: 3, Post: 1, Video: 5 },
    reachBase: [30000, 380000],
    erBase: 11.5,
    growth: 1.5,
  },
  {
    id: "energyandyourwallet",
    handle: "@energyandyourwallet",
    name: "Energy & Your Wallet",
    emoji: "💸",
    persona: "Suburban dad influencer",
    tone: "Conversational, down-to-earth, funny, metaphoric, dad-energy",
    audience: "Suburban moderates / pragmatists · 28–50 · PA/VA/MD corridor",
    message: "That rate hike? Like your fantasy league doubling the buy-in mid-season. Nobody asked for that.",
    pillars: "Trending content · savings hacks · dad humor · viral remixes · relatable explainers",
    visual: "Casual backyard-BBQ; well-lit but unpretentious",
    accent: "#0EA5E9",
    brandKit: {
      colors: [
        { name: "Sky", hex: "#0EA5E9" },
        { name: "Navy", hex: "#0369A1" },
        { name: "Goldenrod", hex: "#FBBF24" },
        { name: "Ice", hex: "#F0F9FF" },
        { name: "Slate", hex: "#1F2937" },
      ],
      fonts: {
        heading: { name: "DM Serif Display", style: "Casual Serif", family: "'DM Serif Display', Georgia, serif" },
        body: { name: "DM Sans", style: "Friendly Sans", family: "'DM Sans', sans-serif" },
      },
      avatar: { bg: "linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%)", initials: "EW" },
      image: "/personas/energy-and-your-wallet.png",
    },
    seed: 44,
    platforms: ["Instagram", "TikTok"],
    cadence: { Reel: 4, Post: 2, Carousel: 1, Video: 3 },
    reachBase: [25000, 170000],
    erBase: 6.8,
    growth: 1.0,
  },
  {
    id: "surviveuntil2030",
    handle: "@surviveuntil2030",
    name: "Survive Until 2030",
    emoji: "🎙",
    persona: "Informative female podcaster",
    tone: "Warm, editorial, curious, thoughtful, subtly urgent",
    audience: "Suburban moderate women · 28–45 · US West (CA / CO)",
    message: "Everyone's arguing about gas. Nobody's asking why your electric bill tripled. Let's talk.",
    pillars: "Shareable memes · opinionated news reactions · long-form deep dives · podcast clips · Q&As",
    visual: "Warm editorial podcast-studio; earth tones, soft lighting, serif typography",
    accent: "#10B981",
    brandKit: {
      colors: [
        { name: "Emerald", hex: "#10B981" },
        { name: "Forest", hex: "#065F46" },
        { name: "Warm Cream", hex: "#FEF3C7" },
        { name: "Terracotta", hex: "#92400E" },
        { name: "Soft White", hex: "#FAFAF7" },
      ],
      fonts: {
        heading: { name: "Cormorant Garamond", style: "Editorial Serif", family: "'Cormorant Garamond', Georgia, serif" },
        body: { name: "Source Sans 3", style: "Humanist Sans", family: "'Source Sans 3', sans-serif" },
      },
      avatar: { bg: "linear-gradient(135deg, #065F46 0%, #10B981 100%)", initials: "S30" },
      image: "/personas/survive-until-2030.png",
    },
    seed: 55,
    platforms: ["Instagram", "TikTok"],
    cadence: { Reel: 3, Post: 2, Carousel: 1, Video: 2 },
    reachBase: [20000, 140000],
    erBase: 7.6,
    growth: 1.1,
  },
];

// ── Data Generator ──

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateAccountRows(account, includeAccountCol = false) {
  const rand = mulberry32(account.seed);
  const rows = [];
  const startDate = new Date("2026-02-01");
  const totalDays = 90;

  for (let day = 0; day < totalDays; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    const dayGrowth = 1 + day * (0.005 * account.growth);

    account.platforms.forEach((platform) => {
      Object.entries(account.cadence).forEach(([type, perWeek]) => {
        // Story is Instagram-only; Video is TikTok-only (simulation)
        if (type === "Story" && platform !== "Instagram") return;
        if (type === "Video" && platform !== "TikTok") return;
        if (type === "Reel" && platform !== "Instagram") return;
        if (type === "Carousel" && platform !== "Instagram") return;

        const dailyProb = perWeek / 7;
        if (rand() > dailyProb) return;

        const [minR, maxR] = account.reachBase;
        const noise = 0.6 + rand() * 0.8;
        const viral = rand() < 0.06 ? 2 + rand() * 2.5 : 1;
        const platformBoost = platform === "TikTok" ? 1.4 : 1;

        const reach = Math.round((minR + (maxR - minR) * rand()) * dayGrowth * noise * viral * platformBoost);
        const impressions = Math.round(reach * (1.18 + rand() * 0.3));

        const er = Math.min(40, account.erBase * (0.7 + rand() * 0.7) * (viral > 1 ? 1.25 : 1));
        const totalEng = Math.round(reach * (er / 100));

        const likes = Math.round(totalEng * (0.62 + rand() * 0.16));
        const comments = Math.round(totalEng * (0.05 + rand() * 0.07));
        const shares = Math.round(totalEng * (0.08 + rand() * 0.1));
        const saves = Math.max(0, totalEng - likes - comments - shares);

        const profileVisits = Math.round(reach * (0.012 + rand() * 0.024));
        const followersGained = Math.max(0, Math.round(profileVisits * (0.06 + rand() * 0.1) * account.growth));
        const linkClicks = Math.round(reach * (0.004 + rand() * 0.012));

        const baseRow = [
          dateStr,
          platform,
          type,
          reach,
          impressions,
          likes,
          comments,
          shares,
          saves,
          er.toFixed(2),
          profileVisits,
          followersGained,
          linkClicks,
        ];

        if (includeAccountCol) {
          rows.push([dateStr, account.handle, ...baseRow.slice(1)]);
        } else {
          rows.push(baseRow);
        }
      });
    });
  }

  return rows;
}

function buildAccountDataset(account) {
  return {
    headers: [
      "Date", "Platform", "Content Type",
      "Reach", "Impressions", "Likes", "Comments", "Shares", "Saves",
      "Engagement Rate", "Profile Visits", "Followers Gained", "Link Clicks",
    ],
    rows: generateAccountRows(account, false),
    fileName: `${account.handle} - Q1 2026.csv`,
    title: `${account.name}. Q1 2026`,
    clientName: "Potential Energy",
  };
}

function buildCombinedDataset() {
  const allRows = [];
  ACCOUNTS.forEach((acc) => {
    allRows.push(...generateAccountRows(acc, true));
  });
  return {
    headers: [
      "Date", "Account", "Platform", "Content Type",
      "Reach", "Impressions", "Likes", "Comments", "Shares", "Saves",
      "Engagement Rate", "Profile Visits", "Followers Gained", "Link Clicks",
    ],
    rows: allRows,
    fileName: "Potential Energy - All Accounts Q1 2026.csv",
    title: "Potential Energy. All Accounts Q1 2026",
    clientName: "Potential Energy",
  };
}

// ── UI ──

const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const body = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

function TabsBar({ active, onChange }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #0A0A0C 0%, #000 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "12px 16px 0",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        display: "flex", gap: 4, alignItems: "center",
        maxWidth: 1280, margin: "0 auto",
        minWidth: "fit-content",
      }}>
        {/* Combined tab first */}
        <TabButton
          active={active === "combined"}
          onClick={() => onChange("combined")}
          icon="🌐"
          label="All Accounts"
          accent="#FFFFFF"
        />
        {ACCOUNTS.map((acc) => (
          <TabButton
            key={acc.id}
            active={active === acc.id}
            onClick={() => onChange(acc.id)}
            icon={acc.emoji}
            label={acc.handle.replace("@", "")}
            accent={acc.accent}
          />
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, accent }) {
  return (
    <button onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "10px 14px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        position: "relative",
        ...body,
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        color: active ? "#fff" : "rgba(255,255,255,0.55)",
        whiteSpace: "nowrap",
        flexShrink: 0,
        transition: "color 0.15s",
        borderBottom: `2px solid ${active ? accent : "transparent"}`,
        marginBottom: -1,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AccountInfoCard({ account }) {
  if (!account) return null;
  return (
    <div style={{
      maxWidth: 1280, margin: "0 auto",
      padding: "24px 32px 0",
    }}>
      <div style={{
        background: C.bg,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 16,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: 4, background: account.accent,
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: account.accent + "12",
            border: `1px solid ${account.accent}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
          }}>{account.emoji}</div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 style={{ ...hd, fontSize: 24, color: C.text, lineHeight: 1.1 }}>{account.name}</h2>
              <span style={{ ...body, fontSize: 13, color: account.accent, fontWeight: 600 }}>{account.handle}</span>
            </div>
            <p style={{ ...body, fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>{account.persona}</p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}>
          <InfoBlock label="Tone of Voice" icon={<Megaphone size={11} />} value={account.tone} />
          <InfoBlock label="Audience" icon={<Users size={11} />} value={account.audience} />
          <InfoBlock label="Content Pillars" icon={<Hash size={11} />} value={account.pillars} />
          <InfoBlock label="Visual Strategy" icon={<Eye size={11} />} value={account.visual} />
        </div>

        <div style={{
          marginTop: 16, padding: "12px 14px",
          background: account.accent + "08",
          borderLeft: `3px solid ${account.accent}`,
          borderRadius: 8,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: account.accent,
            letterSpacing: "0.1em", textTransform: "uppercase", ...body,
            marginBottom: 4,
          }}>Key Message</div>
          <div style={{ ...hd, fontSize: 15, color: C.text, lineHeight: 1.4, fontStyle: "italic" }}>
            "{account.message}"
          </div>
        </div>

        {account.brandKit && <BrandKitSection account={account} />}

        <PostsLibrarySection account={account} />
      </div>
    </div>
  );
}

// Match the portal's feedback palette so the entire app feels like one
// product. Approve = green, Reject = red, Revision = blue.
const FB_COLORS = {
  approve: "#30A46C",
  reject: "#E5484D",
  revision: "#3E8ED0",
};

const STATUS_META = {
  approved: { color: FB_COLORS.approve, soft: FB_COLORS.approve + "12", label: "Approved" },
  rejected: { color: FB_COLORS.reject, soft: FB_COLORS.reject + "12", label: "Rejected" },
  revision: { color: FB_COLORS.revision, soft: FB_COLORS.revision + "12", label: "Revision" },
};

// Three-state pill buttons mirroring StatusBtns from the client portal.
// Compact mode = single row of equal-width segments so cards in a tight
// grid never wrap to two rows.
function StatusBtns({ status, pending, onApprove, onReject, onRevision, compact }) {
  const items = [
    { key: "approved", color: FB_COLORS.approve, label: "Approve", short: "OK", icon: CheckCircle2, onClick: onApprove },
    { key: "rejected", color: FB_COLORS.reject, label: "Reject", short: "No", icon: X, onClick: onReject },
    { key: "revision", color: FB_COLORS.revision, label: "Revise", short: "Edit", icon: RefreshCw, onClick: onRevision },
  ];
  return (
    <div style={{
      display: compact ? "grid" : "flex",
      gridTemplateColumns: compact ? "repeat(3, 1fr)" : undefined,
      gap: compact ? 5 : 6,
    }}>
      {items.map(({ key, color, label, icon: Icon, onClick }) => {
        const active = status === key;
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
            style={{
              ...body,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: compact ? "5px 6px" : "7px 14px",
              borderRadius: 980,
              fontSize: compact ? 11 : 12,
              fontWeight: 600,
              lineHeight: 1,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              background: active ? (pending ? color + "18" : color) : "transparent",
              color: active ? (pending ? color : "#fff") : color,
              border: `1px solid ${active ? color : color + "30"}`,
              borderStyle: active && pending ? "dashed" : "solid",
              minWidth: 0,
              width: "100%",
            }}
          >
            <Icon size={compact ? 11 : 14} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function fmtCommentDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return ""; }
}

// Single comment bubble. Collapsed by default to a one-line preview so
// the per-post card doesn't balloon when there are several notes; click
// anywhere on the bubble to expand. Delete button is always visible (no
// hover-required) so it's reachable on touch.
function CommentBubble({ comment, onDelete }) {
  const text = comment?.text || "";
  const isLong = text.length > 90 || text.includes("\n");
  // Default to expanded so newly-submitted notes are visible without a
  // second click. User can collapse if it's a long note that's in the way.
  const [expanded, setExpanded] = useState(true);
  const who = comment?.senderName || (comment?.sender === "team" ? "Team" : "Client");

  return (
    <div
      onClick={() => isLong && setExpanded((e) => !e)}
      style={{
        background: "#F5F5F7",
        borderRadius: 8,
        padding: "7px 10px",
        position: "relative",
        cursor: isLong ? "pointer" : "default",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (isLong) e.currentTarget.style.background = "#EFEFF2"; }}
      onMouseLeave={(e) => { if (isLong) e.currentTarget.style.background = "#F5F5F7"; }}
    >
      <p style={{
        ...body, fontSize: 12, color: C.text, lineHeight: 1.5,
        whiteSpace: expanded ? "pre-wrap" : "nowrap",
        overflow: expanded ? "visible" : "hidden",
        textOverflow: expanded ? "clip" : "ellipsis",
        margin: 0,
        paddingRight: 38,
      }}>{text}</p>
      <span style={{
        ...body, fontSize: 9.5, color: C.textTer, marginTop: 2, display: "block",
      }}>
        {who} · {fmtCommentDate(comment?.date)}{isLong ? (expanded ? " · click to collapse" : " · click to expand") : ""}
      </span>
      <div style={{
        position: "absolute", top: 5, right: 5,
        display: "flex", alignItems: "center", gap: 2,
      }}>
        {isLong && (
          <span
            aria-hidden="true"
            style={{
              width: 18, height: 18, borderRadius: "50%",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: C.textTer,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              fontSize: 10,
              lineHeight: 1,
            }}
          >
            ▾
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            title="Delete comment"
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", border: `1px solid ${C.borderLight}`,
              color: C.textSec, cursor: "pointer",
              padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = FB_COLORS.reject; e.currentTarget.style.borderColor = FB_COLORS.reject; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textSec; }}
          >
            <Trash2 size={10} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}

// Comment thread + "Add feedback" / "Tell us what to revise" textarea —
// same UX shape as PortalClient's FeedbackBox / MoodBoardSection. Reused
// for both the image and caption sides of a post.
function FeedbackThread({ comments, status, onAddComment, onDeleteComment, accent, label = "Feedback" }) {
  const [text, setText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const list = Array.isArray(comments) ? comments : [];

  // Force input visible if user picked "Revision" (mirrors portal MoodBoardSection)
  const promptForRevision = status === "revision" && list.length === 0 && !showInput;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAddComment(t);
    setText("");
    setShowInput(false);
  };

  const statusMeta = status ? STATUS_META[status] : null;
  const hasNotes = list.length > 0;
  return (
    <div style={{
      marginTop: 8, paddingTop: 8, paddingLeft: hasNotes && statusMeta ? 10 : 0,
      borderTop: `1px solid ${C.borderLight}`,
      borderLeft: hasNotes && statusMeta ? `3px solid ${statusMeta.color}` : "none",
    }}>
      {hasNotes && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          ...body, fontSize: 10, fontWeight: 700,
          color: statusMeta ? statusMeta.color : C.textTer,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 6,
        }}>
          <MessageSquare size={9} strokeWidth={2.4} />
          {statusMeta ? `${statusMeta.label} note${list.length > 1 ? "s" : ""}` : `${list.length} ${list.length === 1 ? "note" : "notes"}`}
          {list.length > 1 && <span style={{ color: C.textTer, fontWeight: 500 }}>· {list.length}</span>}
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
          {list.map((c, i) => (
            <CommentBubble
              key={c.date || i}
              comment={c}
              onDelete={onDeleteComment ? () => onDeleteComment(c.date) : null}
            />
          ))}
        </div>
      )}

      {promptForRevision || showInput ? (
        <div>
          <textarea
            value={text}
            autoFocus
            onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            onClick={(e) => e.stopPropagation()}
            placeholder={status === "revision" ? "What works? What doesn't?" : "Add a note…"}
            style={{
              ...body, width: "100%", padding: "7px 10px", fontSize: 12.5,
              border: `1px solid ${C.borderLight}`, borderRadius: 8,
              outline: "none", background: "#fff", color: C.text,
              boxSizing: "border-box", resize: "none",
              minHeight: 44, lineHeight: 1.45, overflow: "hidden",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.borderLight; }}
          />
          <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
            <button
              type="button"
              disabled={!text.trim()}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}
              style={{
                ...body, padding: "5px 12px", fontSize: 11, fontWeight: 600,
                background: text.trim() ? "#000" : C.bgSoft,
                color: text.trim() ? "#fff" : C.textTer,
                border: "none", borderRadius: 980,
                cursor: text.trim() ? "pointer" : "not-allowed",
                display: "inline-flex", alignItems: "center", gap: 4,
                lineHeight: 1,
              }}
            >
              <Check size={10} strokeWidth={2.6} /> Submit
            </button>
            {showInput && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInput(false); setText(""); }}
                style={{
                  ...body, padding: "5px 10px", fontSize: 11, fontWeight: 500,
                  background: "transparent", color: C.textSec,
                  border: "none", borderRadius: 980,
                  cursor: "pointer", lineHeight: 1,
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInput(true); }}
          style={{
            ...body, padding: 0, fontSize: 11, fontWeight: 500,
            background: "transparent",
            color: C.textSec,
            border: "none",
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textSec; }}
        >
          <MessageSquare size={11} strokeWidth={2.2} />
          {status === "revision" ? "Tell us what to revise" : "Add a note"}
        </button>
      )}
    </div>
  );
}

const SLOT_COUNT = 20;

// Unified post = { dataUrl, name, text, feedback }. One slot per post.
// Stored in IndexedDB under pe-posts-{accountId}; legacy localStorage
// images and captions are read once on first load and merged in.
function PostsLibrarySection({ account }) {
  const storageKey = `pe-posts-${account.id}`;
  const legacyImagesKey = `pe-images-${account.id}`;
  const legacyCaptionsKey = `pe-captions-${account.id}`;

  const [posts, setPosts] = useState(() => Array(SLOT_COUNT).fill(null).map(() => ({})));
  const [hovered, setHovered] = useState(-1);
  const [saving, setSaving] = useState(new Set());
  const [serverSaving, setServerSaving] = useState(false);
  const [serverSavedAt, setServerSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // Latest payload reference so the debounced server-save always sends
  // the freshest state without re-creating the timer per change.
  const latestPostsRef = useRef(posts);
  const saveTimerRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => { latestPostsRef.current = posts; }, [posts]);

  // Strip the heavy dataUrl base64 strings from the payload we send to
  // the server. We keep dataUrl in local state for instant rendering, but
  // never let it bloat the JSONB row — Vercel's 4.5MB serverless body cap
  // would silently kill saves once a few dataUrls accumulate. If a slot
  // somehow has dataUrl but no imageUrl yet (mid-upload, or legacy data
  // not yet migrated), we drop the slot from the server write entirely
  // rather than risk killing the whole save.
  const buildServerPayload = (posts) => ({
    posts: posts.map((p) => {
      if (!p) return {};
      if (p.imageUrl) {
        const { dataUrl, ...rest } = p;
        return rest;
      }
      // No URL: keep metadata (text, status, comments) but drop dataUrl
      const { dataUrl, ...rest } = p;
      return rest;
    }),
  });

  // Push to the server (debounced). Triggered by every persist() call.
  const scheduleServerSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setServerSaving(true);
        const safePayload = buildServerPayload(latestPostsRef.current);
        const res = await fetch("/api/marketing-demo-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            payload: safePayload,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "save failed");
        setServerSavedAt(Date.now());
      } catch (e) {
        console.warn("server save failed", e?.message);
      } finally {
        setServerSaving(false);
      }
    }, 600);
  };

  // Convert a base64 dataUrl back to a Blob so we can upload it.
  const dataUrlToBlob = async (dataUrl) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  // Migrate any legacy dataUrl-only posts to Storage. Runs once on mount.
  // We update incrementally — reading latestPostsRef before every write —
  // so we don't clobber slots the user is uploading while we work.
  const migrateLegacy = async (loaded) => {
    if (!supabase) return;
    for (let i = 0; i < loaded.length; i++) {
      const p = loaded[i];
      if (!p || p.imageUrl || !p.dataUrl) continue;
      try {
        const blob = await dataUrlToBlob(p.dataUrl);
        const ext = (blob.type || "").includes("png") ? "png" : "jpg";
        const path = `${account.id}/${i}-legacy-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pe-content")
          .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
        if (upErr) continue;
        const { data: pub } = supabase.storage.from("pe-content").getPublicUrl(path);
        if (!pub?.publicUrl) continue;

        // Re-read the latest state and merge — the user may have uploaded
        // a fresh image to another slot while we were busy.
        const cur = [...latestPostsRef.current];
        const slotNow = cur[i];
        // Only touch the slot if it still has the legacy dataUrl. If the
        // user already replaced it, leave their newer image alone.
        if (slotNow?.dataUrl && !slotNow.imageUrl) {
          cur[i] = { ...slotNow, imageUrl: pub.publicUrl, dataUrl: undefined };
          setPosts(cur);
          latestPostsRef.current = cur;
          idbSet(storageKey, cur);
          scheduleServerSave();
        }
      } catch (e) {/* skip slot, keep going */}
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let merged = Array(SLOT_COUNT).fill(null).map(() => ({}));

      // First: try the server (cross-browser source of truth)
      try {
        const res = await fetch(`/api/marketing-demo-content?accountId=${encodeURIComponent(account.id)}`, { cache: "no-store" });
        const json = await res.json();
        const serverPosts = json?.payload?.posts;
        if (Array.isArray(serverPosts) && serverPosts.length > 0) {
          merged = Array(SLOT_COUNT).fill(null).map((_, i) => serverPosts[i] || {});
          if (!cancelled) {
            setPosts(merged);
            setLoaded(true);
            // Mirror to IDB so the next mount is instant
            idbSet(storageKey, merged);
          }
          return;
        }
      } catch (e) {/* offline / no server: fall through to local */}

      // Fallback: posts in IDB
      const fromIdb = await idbGet(storageKey);
      if (Array.isArray(fromIdb)) {
        merged = Array(SLOT_COUNT).fill(null).map((_, i) => fromIdb[i] || {});
      } else {
        // Legacy migration: pull image entries (IDB or localStorage) +
        // caption entries (localStorage) and combine by index.
        const legacyImages = await idbGet(legacyImagesKey);
        let imgs = Array.isArray(legacyImages) ? legacyImages : null;
        if (!imgs && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(legacyImagesKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) imgs = parsed;
            }
          } catch (e) {/* ignore */}
        }
        let caps = null;
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(legacyCaptionsKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) caps = parsed;
            }
          } catch (e) {/* ignore */}
        }
        for (let i = 0; i < SLOT_COUNT; i++) {
          const img = imgs?.[i] || null;
          const cap = caps?.[i] || null;
          // Bridge old { feedback: { status, note } } → portal-style
          // { status, comments } so the new UI can display the older notes.
          const oldFb = img?.feedback || cap?.feedback || null;
          const status = oldFb?.status === "approved" || oldFb?.status === "rejected" || oldFb?.status === "revision" ? oldFb.status : null;
          const comments = oldFb?.note ? [{ text: oldFb.note, date: Date.now(), sender: "client" }] : [];
          merged[i] = {
            dataUrl: img?.dataUrl,
            name: img?.name,
            text: cap?.text || "",
            status,
            comments,
          };
        }
      }
      // Forward-migrate: posts saved with the old { feedback: {...} } shape
      merged = merged.map((p) => {
        if (!p) return {};
        if (p.feedback && (p.status === undefined && p.comments === undefined)) {
          return {
            ...p,
            status: ["approved", "rejected", "revision"].includes(p.feedback.status) ? p.feedback.status : null,
            comments: p.feedback.note ? [{ text: p.feedback.note, date: Date.now(), sender: "client" }] : [],
            feedback: undefined,
          };
        }
        return p;
      });
      if (cancelled) return;
      setPosts(merged);
      latestPostsRef.current = merged;
      setLoaded(true);
      // If we got data from local fallback, push it up so the server catches up
      if (merged.some((p) => p?.imageUrl || p?.dataUrl || p?.text || p?.status)) {
        scheduleServerSave();
      }
      // Background-migrate any base64 images to Storage so future saves
      // are tiny and reliable. Fires-and-forgets; errors are non-fatal.
      if (merged.some((p) => p?.dataUrl && !p?.imageUrl)) {
        migrateLegacy(merged).catch((e) => console.warn("legacy migration failed", e?.message));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, legacyImagesKey, legacyCaptionsKey, account.id]);

  const persist = async (next, busyIdx = null) => {
    setPosts(next);
    latestPostsRef.current = next;
    if (busyIdx != null) setSaving((s) => new Set(s).add(busyIdx));
    // Local cache for instant subsequent loads
    const ok = await idbSet(storageKey, next);
    if (busyIdx != null) {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(busyIdx);
        return n;
      });
    }
    if (!ok) {
      // Local cache failed but the server is the real source of truth, so
      // we don't bail — just warn quietly.
      console.warn("local cache save failed");
    }
    // Cross-browser sync (debounced)
    scheduleServerSave();
  };

  const handleFile = async (idx, file) => {
    if (!file) return;
    setSaving((s) => new Set(s).add(idx));
    try {
      // Downscale once, then in parallel: show locally (dataUrl) and
      // upload binary to Supabase Storage. Once Storage returns a public
      // URL we drop the dataUrl from the saved payload so the JSONB row
      // stays small (Vercel's 4.5MB body cap kills full-base64 saves once
      // a few slots are filled — that's the "some images don't save" bug).
      const [dataUrl, { blob, mime }] = await Promise.all([
        fileToDownscaledDataUrl(file),
        fileToDownscaledBlob(file),
      ]);

      // Optimistic local render with dataUrl so the user sees it instantly.
      const optimistic = [...latestPostsRef.current];
      optimistic[idx] = { ...(optimistic[idx] || {}), dataUrl, name: file.name };
      setPosts(optimistic);
      latestPostsRef.current = optimistic;
      idbSet(storageKey, optimistic); // local cache only — server save waits for the URL

      let imageUrl = null;
      if (supabase) {
        const ext = mime === "image/png" ? "png" : "jpg";
        const safeName = (file.name || "img").replace(/[^a-z0-9.\-_]+/gi, "_").slice(0, 40);
        const path = `${account.id}/${idx}-${Date.now()}-${safeName}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pe-content")
          .upload(path, blob, { contentType: mime, upsert: true });
        if (upErr) {
          console.error("[pe-content] storage upload failed", upErr.message, "path:", path);
          setSaveError(`Upload failed: ${upErr.message}`);
          setTimeout(() => setSaveError(null), 6000);
        } else {
          const { data: pub } = supabase.storage.from("pe-content").getPublicUrl(path);
          imageUrl = pub?.publicUrl || null;
          if (!imageUrl) {
            console.error("[pe-content] uploaded but no public URL returned for", path);
          }
        }
      }

      // Final write — prefer the URL (tiny payload). Fall back to dataUrl
      // only if storage upload failed; the row will then be larger but
      // still smaller than 4.5MB for a single slot.
      const next = [...latestPostsRef.current];
      next[idx] = imageUrl
        ? { ...(next[idx] || {}), imageUrl, name: file.name, dataUrl: undefined }
        : { ...(next[idx] || {}), dataUrl, name: file.name };
      await persist(next, idx);
    } catch (e) {
      console.warn("upload failed", e?.message);
      setSaving((s) => {
        const n = new Set(s);
        n.delete(idx);
        return n;
      });
      setSaveError("Couldn't upload that image. Try a different file.");
      setTimeout(() => setSaveError(null), 4000);
    }
  };

  const removeImage = (idx) => {
    const next = [...posts];
    const cur = next[idx] || {};
    next[idx] = { ...cur, dataUrl: undefined, imageUrl: undefined, name: undefined };
    persist(next, idx);
  };

  const setText = (idx, text) => {
    const next = [...posts];
    next[idx] = { ...(next[idx] || {}), text };
    persist(next);
  };

  const setStatus = (idx, status) => {
    const next = [...posts];
    const cur = next[idx] || {};
    // Toggle off if you re-click the active state — same UX as portal
    next[idx] = { ...cur, status: cur.status === status ? null : status };
    persist(next);
  };

  const addComment = (idx, text) => {
    const next = [...posts];
    const cur = next[idx] || {};
    const comments = Array.isArray(cur.comments) ? cur.comments : [];
    next[idx] = {
      ...cur,
      comments: [...comments, { text, date: Date.now(), sender: "client" }],
    };
    persist(next);
  };

  // Atomic: when the user submits a Reject/Revise reason we must commit
  // the new status AND the new comment in ONE state write. Doing them
  // separately lets the second setState clobber the first since both
  // close over the same stale posts reference.
  const setStatusWithComment = (idx, status, text) => {
    const next = [...posts];
    const cur = next[idx] || {};
    const comments = Array.isArray(cur.comments) ? cur.comments : [];
    next[idx] = {
      ...cur,
      status,
      comments: [...comments, { text, date: Date.now(), sender: "client" }],
    };
    persist(next);
  };

  const deleteComment = (idx, commentDate) => {
    const next = [...posts];
    const cur = next[idx] || {};
    const comments = (cur.comments || []).filter((c) => c.date !== commentDate);
    next[idx] = { ...cur, comments };
    persist(next);
  };

  const filledCount = posts.filter((p) => p?.imageUrl || p?.dataUrl || p?.text?.trim()).length;
  const approvedCount = posts.filter((p) => p?.status === "approved").length;
  const revisionCount = posts.filter((p) => p?.status === "revision").length;

  return (
    <div style={{
      marginTop: 14,
      padding: "16px 16px 14px",
      background: "#FAFAFA",
      border: `1px solid ${C.borderLight}`,
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Images size={12} strokeWidth={2.4} color={account.accent} />
          <span style={{
            ...body, fontSize: 10.5, fontWeight: 700, color: C.text,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>Content Library</span>
          <span style={{
            ...body, fontSize: 10.5, fontWeight: 600, color: C.textSec,
            padding: "2px 7px", borderRadius: 10,
            background: "#fff", border: `1px solid ${C.borderLight}`,
            marginLeft: 4,
          }}>{filledCount}/{SLOT_COUNT}</span>
          {approvedCount > 0 && (
            <span style={{
              ...body, fontSize: 10.5, fontWeight: 600, color: FB_COLORS.approve,
              padding: "2px 7px", borderRadius: 10,
              background: FB_COLORS.approve + "10",
              border: `1px solid ${FB_COLORS.approve}30`,
            }}>{approvedCount} approved</span>
          )}
          {revisionCount > 0 && (
            <span style={{
              ...body, fontSize: 10.5, fontWeight: 600, color: FB_COLORS.revision,
              padding: "2px 7px", borderRadius: 10,
              background: FB_COLORS.revision + "10",
              border: `1px solid ${FB_COLORS.revision}30`,
            }}>{revisionCount} revising</span>
          )}
        </div>
        {(saving.size > 0 || serverSaving) ? (
          <span style={{
            ...body, fontSize: 11, fontWeight: 600, color: account.accent,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: account.accent,
              animation: "pe-pulse 1s ease-in-out infinite",
            }} />
            <style>{`@keyframes pe-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
            Syncing…
          </span>
        ) : saveError ? (
          <span style={{ ...body, fontSize: 11, color: FB_COLORS.reject, fontWeight: 600 }}>
            {saveError}
          </span>
        ) : serverSavedAt ? (
          <span style={{
            ...body, fontSize: 11, color: FB_COLORS.approve, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <Check size={11} strokeWidth={2.6} /> Saved across devices
          </span>
        ) : (
          <span style={{ ...body, fontSize: 11, color: C.textTer }}>
            Drop an image, write a caption — syncs across devices
          </span>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}>
        {posts.map((post, idx) => (
          <PostSlot
            key={idx}
            idx={idx}
            post={post}
            accent={account.accent}
            hovered={hovered === idx}
            saving={saving.has(idx)}
            onHover={(h) => setHovered(h ? idx : -1)}
            onPick={(file) => handleFile(idx, file)}
            onRemove={() => removeImage(idx)}
            onText={(t) => setText(idx, t)}
            onStatus={(s) => setStatus(idx, s)}
            onStatusWithComment={(s, t) => setStatusWithComment(idx, s, t)}
            onAddComment={(t) => addComment(idx, t)}
            onDeleteComment={(d) => deleteComment(idx, d)}
          />
        ))}
      </div>

      <GeneralFeedbackSection account={account} />
    </div>
  );
}

// Catch-all feedback bucket for the whole content library — broader notes
// that don't belong on a single post (creative direction, cadence, brand
// voice, etc.). Saved in localStorage since it's just short text.
function GeneralFeedbackSection({ account }) {
  const storageKey = `pe-general-${account.id}`;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const latestRef = useRef([]);
  const saveTimerRef = useRef(null);

  useEffect(() => { latestRef.current = comments; }, [comments]);

  // General feedback lives in the same row as the posts, under
  // payload.generalComments. We GET on mount and merge with any local cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try server first
      try {
        const res = await fetch(`/api/marketing-demo-content?accountId=${encodeURIComponent(account.id)}`, { cache: "no-store" });
        const json = await res.json();
        const fromServer = json?.payload?.generalComments;
        if (Array.isArray(fromServer)) {
          if (!cancelled) setComments(fromServer);
          return;
        }
      } catch (e) {/* fall through */}
      // Fall back to localStorage cache
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && !cancelled) setComments(parsed);
        }
      } catch (e) {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, [storageKey, account.id]);

  const scheduleServerSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        // We need the latest posts payload too so we don't overwrite it.
        // Fetch it and merge generalComments.
        const cur = await fetch(`/api/marketing-demo-content?accountId=${encodeURIComponent(account.id)}`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
        const existingPayload = cur?.payload || {};
        await fetch("/api/marketing-demo-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            payload: { ...existingPayload, generalComments: latestRef.current },
          }),
        });
      } catch (e) {
        console.warn("general feedback sync failed", e?.message);
      }
    }, 600);
  };

  const persist = (next) => {
    setComments(next);
    latestRef.current = next;
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {/* ignore */}
    }
    scheduleServerSave();
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setSubmitting(true);
    persist([...comments, { text: t, date: Date.now(), sender: "client" }]);
    setText("");
    setShowInput(false);
    setTimeout(() => setSubmitting(false), 300);
  };

  const remove = (date) => {
    persist(comments.filter((c) => c.date !== date));
  };

  return (
    <div style={{
      marginTop: 18,
      padding: "16px 18px",
      background: "#fff",
      border: `1px solid ${C.borderLight}`,
      borderRadius: 12,
      borderLeft: `3px solid ${account.accent}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: comments.length > 0 || showInput ? 12 : 0,
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <MessageSquare size={13} strokeWidth={2.4} color={account.accent} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...body, fontSize: 12, fontWeight: 700, color: C.text,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>General Feedback</div>
            <div style={{ ...body, fontSize: 11.5, color: C.textSec, marginTop: 2 }}>
              Notes on the whole batch — direction, cadence, brand voice, anything across posts.
            </div>
          </div>
        </div>
        {comments.length > 0 && (
          <span style={{
            ...body, fontSize: 10.5, fontWeight: 600, color: C.textSec,
            padding: "2px 8px", borderRadius: 10,
            background: C.bgSoft, border: `1px solid ${C.borderLight}`,
          }}>{comments.length} {comments.length === 1 ? "note" : "notes"}</span>
        )}
      </div>

      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {comments.map((c, i) => (
            <CommentBubble key={c.date || i} comment={c} onDelete={() => remove(c.date)} />
          ))}
        </div>
      )}

      {showInput ? (
        <div>
          <textarea
            value={text}
            autoFocus
            onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder="What's working across the batch? What should we change overall?"
            style={{
              ...body, width: "100%", padding: "10px 14px", fontSize: 13.5,
              border: `1px solid ${C.borderLight}`, borderRadius: 10,
              outline: "none", background: "#fff", color: C.text,
              boxSizing: "border-box", resize: "none",
              minHeight: 64, lineHeight: 1.55, overflow: "hidden",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = account.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.borderLight; }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              type="button"
              disabled={!text.trim() || submitting}
              onClick={submit}
              style={{
                ...body, padding: "7px 16px", fontSize: 12, fontWeight: 600,
                background: text.trim() ? "#000" : C.bgSoft,
                color: text.trim() ? "#fff" : C.textTer,
                border: "none", borderRadius: 980,
                cursor: text.trim() ? "pointer" : "not-allowed",
                display: "inline-flex", alignItems: "center", gap: 5,
                opacity: submitting ? 0.5 : 1,
                lineHeight: 1,
              }}
            >
              <Check size={11} strokeWidth={2.6} /> Submit Feedback
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setText(""); }}
              style={{
                ...body, padding: "7px 14px", fontSize: 12, fontWeight: 500,
                background: "transparent", color: C.textSec,
                border: "none", borderRadius: 980,
                cursor: "pointer", lineHeight: 1,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          style={{
            ...body, padding: "8px 14px", fontSize: 12, fontWeight: 600,
            background: "transparent", color: account.accent,
            border: `1px solid ${account.accent}40`, borderRadius: 980,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = account.accent;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = account.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = account.accent;
            e.currentTarget.style.borderColor = account.accent + "40";
          }}
        >
          <Plus size={12} strokeWidth={2.4} />
          {comments.length === 0 ? "Add general feedback" : "Add another note"}
        </button>
      )}
    </div>
  );
}

function PostSlot({ idx, post, accent, hovered, saving, onHover, onPick, onRemove, onText, onStatus, onStatusWithComment, onAddComment, onDeleteComment }) {
  const [dragOver, setDragOver] = useState(false);
  // Reject and Revise both require a reason: clicking them parks the
  // intended status here and surfaces a forced-open reason form. Status
  // is only committed once the user submits text (or cancels).
  const [pendingStatus, setPendingStatus] = useState(null);
  const status = post?.status || null;
  const meta = status ? STATUS_META[status] : null;
  const pendingMeta = pendingStatus ? STATUS_META[pendingStatus] : null;
  // Prefer the public URL (Storage); fall back to inline dataUrl for legacy
  // posts that were saved before we moved to Storage.
  const imageSrc = post?.imageUrl || post?.dataUrl || null;
  const hasImage = Boolean(imageSrc);

  const handleStatusClick = (s) => {
    // Clicking the active status again clears it (matches portal toggle UX)
    if (status === s) {
      onStatus(null);
      setPendingStatus(null);
      return;
    }
    if (s === "approved") {
      // Approve doesn't need a reason — commit immediately
      onStatus("approved");
      setPendingStatus(null);
      return;
    }
    // Reject / Revise: park the intent, force the reason form open
    setPendingStatus(s);
  };

  const submitPending = (reasonText) => {
    const t = reasonText.trim();
    if (!t) return;
    // Single atomic write so the new status AND comment land together.
    onStatusWithComment(pendingStatus, t);
    setPendingStatus(null);
  };

  const cancelPending = () => setPendingStatus(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) onPick(file);
  };

  const cardBorder = meta
    ? meta.color + "55"
    : (hovered ? accent + "40" : C.borderLight);

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        background: "#fff",
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 4px 14px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header strip */}
      <div style={{
        padding: "8px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#FAFAFA",
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            ...body, fontSize: 9.5, fontWeight: 700,
            color: accent,
            background: accent + "12",
            padding: "2px 7px", borderRadius: 8,
            letterSpacing: "0.06em",
          }}>#{String(idx + 1).padStart(2, "0")}</span>
          {meta && (
            <span style={{
              ...body, fontSize: 9.5, fontWeight: 700,
              color: meta.color,
              padding: "2px 7px", borderRadius: 8,
              background: meta.soft,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>{meta.label}</span>
          )}
        </div>
      </div>

      {/* Image area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: dragOver ? accent + "10" : (hasImage ? "#fff" : C.bgSoft),
          borderBottom: `1px solid ${C.borderLight}`,
          overflow: "hidden",
        }}
      >
        <input
          id={`post-input-${idx}`}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }}
        />
        {saving && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 3,
            background: "rgba(255,255,255,0.78)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              border: `2.5px solid ${accent}30`,
              borderTopColor: accent,
              animation: "pe-spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes pe-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {hasImage ? (
          <>
            <label htmlFor={`post-input-${idx}`} style={{
              position: "absolute", inset: 0, cursor: "pointer", display: "block",
            }}>
              <img
                src={imageSrc}
                alt={post.name || `Post ${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </label>
            {hovered && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
                title="Remove image"
                style={{
                  position: "absolute", top: 8, right: 8, zIndex: 2,
                  width: 26, height: 26, borderRadius: 13,
                  border: "none", padding: 0,
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                <X size={14} strokeWidth={2.6} />
              </button>
            )}
          </>
        ) : (
          <label htmlFor={`post-input-${idx}`} style={{
            position: "absolute", inset: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6,
            color: dragOver ? accent : C.textTer,
            transition: "color 0.15s",
            border: `1.5px dashed ${dragOver ? accent : "transparent"}`,
            margin: 8,
            borderRadius: 8,
          }}>
            <ImagePlus size={22} strokeWidth={2} />
            <span style={{
              ...body, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>Drop or click</span>
          </label>
        )}
      </div>

      {/* Caption */}
      <div style={{
        padding: "10px 12px 6px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <textarea
          value={post?.text || ""}
          onChange={(e) => onText(e.target.value)}
          placeholder={`Caption for post ${idx + 1}...`}
          rows={3}
          style={{
            width: "100%",
            ...body,
            fontSize: 13,
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${C.borderLight}`,
            background: meta ? meta.soft : "#fff",
            color: C.text,
            outline: "none",
            resize: "vertical",
            minHeight: 56,
            lineHeight: 1.45,
            transition: "border-color 0.15s, background 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.borderLight; }}
        />
        {(post?.text || "").length > 0 && (
          <span style={{ ...body, fontSize: 10, color: C.textTer, alignSelf: "flex-end" }}>
            {(post?.text || "").length} chars
          </span>
        )}
      </div>

      {/* Approve / Reject / Revision buttons + comment thread */}
      <div style={{ padding: "0 12px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
        <StatusBtns
          status={pendingStatus || status}
          pending={Boolean(pendingStatus)}
          onApprove={() => handleStatusClick("approved")}
          onReject={() => handleStatusClick("rejected")}
          onRevision={() => handleStatusClick("revision")}
          compact
        />
        {pendingStatus ? (
          <PendingReasonForm
            pendingStatus={pendingStatus}
            accent={accent}
            onSubmit={submitPending}
            onCancel={cancelPending}
          />
        ) : (
          <FeedbackThread
            comments={post?.comments}
            status={status}
            accent={accent}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />
        )}
      </div>
    </div>
  );
}

// Forced reason form shown after the user clicks Reject or Revise. Status
// won't actually flip on the post until they submit text — same hard
// requirement the portal has on its critical actions.
function PendingReasonForm({ pendingStatus, accent, onSubmit, onCancel }) {
  const [text, setText] = useState("");
  const meta = STATUS_META[pendingStatus];
  const isReject = pendingStatus === "rejected";
  const placeholder = isReject
    ? "Why are you rejecting this? (required)"
    : "What needs to be revised? (required)";
  const ctaLabel = isReject ? "Submit Rejection" : "Submit Revision";

  return (
    <div style={{
      marginTop: 8, paddingTop: 8,
      borderTop: `1px solid ${C.borderLight}`,
    }}>
      <div style={{
        ...body, fontSize: 10, fontWeight: 700, color: meta.color,
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 6,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <MessageSquare size={10} strokeWidth={2.4} />
        Reason required
      </div>
      <textarea
        value={text}
        autoFocus
        onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        style={{
          ...body, width: "100%", padding: "7px 10px", fontSize: 12.5,
          border: `1px solid ${meta.color}40`, borderRadius: 8,
          outline: "none", background: meta.soft, color: C.text,
          boxSizing: "border-box", resize: "none",
          minHeight: 52, lineHeight: 1.45, overflow: "hidden",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = meta.color; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = meta.color + "40"; }}
      />
      <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSubmit(text); }}
          style={{
            ...body, padding: "5px 12px", fontSize: 11, fontWeight: 600,
            background: text.trim() ? meta.color : C.bgSoft,
            color: text.trim() ? "#fff" : C.textTer,
            border: "none", borderRadius: 980,
            cursor: text.trim() ? "pointer" : "not-allowed",
            display: "inline-flex", alignItems: "center", gap: 4,
            lineHeight: 1,
            transition: "all 0.15s",
          }}
        >
          <Check size={10} strokeWidth={2.6} /> {ctaLabel}
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
          style={{
            ...body, padding: "5px 10px", fontSize: 11, fontWeight: 500,
            background: "transparent", color: C.textSec,
            border: "none", borderRadius: 980,
            cursor: "pointer", lineHeight: 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CombinedInfoCard() {
  return (
    <div style={{
      maxWidth: 1280, margin: "0 auto",
      padding: "24px 32px 0",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #FAFAFC 0%, #FFFFFF 100%)",
        border: `1px solid ${C.borderLight}`,
        borderRadius: 16,
        padding: "22px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #1D1D1F, #000)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0, color: "#fff",
          }}>🌐</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...hd, fontSize: 24, color: C.text, lineHeight: 1.1, marginBottom: 4 }}>
              All Accounts. Combined View
            </h2>
            <p style={{ ...body, fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
              Aggregated performance across all 5 Potential Energy AI influencer accounts. Use the "Account" breakdown to compare.
            </p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
        }}>
          {ACCOUNTS.map((acc) => (
            <div key={acc.id} style={{
              padding: "10px 12px",
              background: acc.accent + "08",
              border: `1px solid ${acc.accent}20`,
              borderRadius: 10,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{acc.emoji}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...body, fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc.name}</div>
                <div style={{ ...body, fontSize: 10.5, color: acc.accent, fontWeight: 500 }}>{acc.handle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandKitSection({ account }) {
  const kit = account.brandKit;
  const sectionLabel = {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 9.5, fontWeight: 700, color: C.textSec,
    letterSpacing: "0.1em", textTransform: "uppercase", ...body,
    marginBottom: 10,
  };
  return (
    <div style={{
      marginTop: 16,
      padding: "16px 16px 14px",
      background: "#FAFAFA",
      border: `1px solid ${C.borderLight}`,
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 14,
      }}>
        <Palette size={12} strokeWidth={2.4} color={account.accent} />
        <span style={{
          ...body, fontSize: 10.5, fontWeight: 700, color: C.text,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>Brand Kit</span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(160px, auto) 1fr",
        gap: 20,
        alignItems: "start",
      }}>
        {/* Avatar */}
        <div>
          <div style={sectionLabel}><User size={11} />Avatar</div>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 132, height: 132, borderRadius: 14,
              background: kit.avatar.bg,
              boxShadow: "0 6px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.15)",
              position: "relative",
              overflow: "hidden",
            }}>
              {kit.image ? (
                <img
                  src={kit.image}
                  alt={`${account.name} persona`}
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "center 22%",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    ...body, fontSize: 32, fontWeight: 700, color: "#fff",
                    letterSpacing: "-0.02em",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}>{kit.avatar.initials}</span>
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0, borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.06)",
                pointerEvents: "none",
              }} />
            </div>
            <div style={{ ...body, fontSize: 11, color: C.textSec, fontWeight: 500 }}>
              {account.handle}
            </div>
            {kit.image && (
              <a
                href={kit.image}
                download={`${account.id}-persona.png`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px",
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  ...body, fontSize: 11, fontWeight: 600,
                  color: C.text,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.bgSoft;
                  e.currentTarget.style.borderColor = account.accent;
                  e.currentTarget.style.color = account.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.text;
                }}
              >
                <Download size={11} strokeWidth={2.4} />
                Download
              </a>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Colors */}
          <div>
            <div style={sectionLabel}><Palette size={11} />Color Palette</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${kit.colors.length}, 1fr)`,
              gap: 8,
            }}>
              {kit.colors.map((c) => (
                <div key={c.hex} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{
                    aspectRatio: "1 / 1",
                    minHeight: 44,
                    borderRadius: 10,
                    background: c.hex,
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      ...body, fontSize: 10.5, fontWeight: 600, color: C.text,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      lineHeight: 1.2,
                    }}>{c.name}</div>
                    <div style={{
                      fontFamily: "'SF Mono', 'Menlo', monospace",
                      fontSize: 9.5, color: C.textTer, marginTop: 1,
                      letterSpacing: "0.02em",
                    }}>{c.hex.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div>
            <div style={sectionLabel}><Type size={11} />Typography</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}>
              <FontSample
                label="Heading"
                font={kit.fonts.heading}
                sample="Aa"
                accent={account.accent}
              />
              <FontSample
                label="Body"
                font={kit.fonts.body}
                sample="Aa"
                accent={account.accent}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FontSample({ label, font, sample, accent }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: "#fff",
      border: `1px solid ${C.borderLight}`,
      borderRadius: 10,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: accent + "0E",
        border: `1px solid ${accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: font.family,
          fontSize: 22, fontWeight: 600, color: C.text,
          lineHeight: 1,
        }}>{sample}</span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, color: accent,
          letterSpacing: "0.12em", textTransform: "uppercase", ...body,
          marginBottom: 2,
        }}>{label}</div>
        <div style={{
          ...body, fontSize: 12.5, fontWeight: 600, color: C.text, lineHeight: 1.2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{font.name}</div>
        <div style={{ ...body, fontSize: 10.5, color: C.textSec, marginTop: 1 }}>
          {font.style}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, icon, value }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 9.5, fontWeight: 700, color: C.textSec,
        letterSpacing: "0.1em", textTransform: "uppercase", ...body,
        marginBottom: 5,
      }}>{icon}{label}</div>
      <div style={{ ...body, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const peBadge = (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "linear-gradient(135deg, #DC262615, #F59E0B15, #10B98115)",
    fontSize: 11, fontWeight: 600, color: C.text,
    letterSpacing: "0.05em", textTransform: "uppercase",
    fontFamily: "'Inter', -apple-system, sans-serif",
    border: "1px solid rgba(0,0,0,0.05)",
  }}>
    <Newspaper size={11} strokeWidth={2.4} />
    Potential Energy
  </div>
);

const demoBadge = (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "linear-gradient(90deg, #00000008, #00000015, #00000008)",
    backgroundSize: "200% 100%",
    animation: "shimmer 3s linear infinite",
    fontSize: 11, fontWeight: 600, color: "#86868B",
    letterSpacing: "0.05em", textTransform: "uppercase",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }}>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <Sparkles size={11} strokeWidth={2} /> Demo
  </div>
);

// ── Main Page ──

export default function PotentialEnergyDemo() {
  const [activeTab, setActiveTab] = useState("combined");

  const data = useMemo(() => {
    if (activeTab === "combined") return buildCombinedDataset();
    const acc = ACCOUNTS.find((a) => a.id === activeTab);
    return acc ? buildAccountDataset(acc) : buildCombinedDataset();
  }, [activeTab]);

  const activeAccount = ACCOUNTS.find((a) => a.id === activeTab);

  const topContent = (
    <>
      <TabsBar active={activeTab} onChange={setActiveTab} />
      {activeAccount ? (
        <AccountInfoCard account={activeAccount} />
      ) : (
        <CombinedInfoCard />
      )}
    </>
  );

  return (
    <MarketingDashboardView
      key={activeTab}
      data={data}
      headerBadge={<>{peBadge}{demoBadge}</>}
      topContent={topContent}
    />
  );
}
