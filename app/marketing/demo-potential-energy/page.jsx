"use client";
import { useState, useMemo } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import { Sparkles, Hash, Users, Megaphone, Eye, Newspaper } from "lucide-react";

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
