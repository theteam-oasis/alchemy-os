"use client";
import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, Tv, Heart, BarChart3, Wallet, Mic, User, Target, MessageCircle, Eye, Layout, Zap } from "lucide-react";

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');`;
const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F7", bgHover: "#F0F0F2",
  border: "#D2D2D7", borderLight: "#E8E8ED",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  card: "#FFFFFF", cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  accent: "#000000", accentSoft: "#00000010",
  success: "#34C759", warning: "#FF9500", danger: "#FF3B30", info: "#007AFF",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.01em" };

const ACCOUNTS = [
  {
    name: "The Risk Report",
    handle: "@theriskreport",
    description: "Affordability & insurance narrative. delivered with authority.",
    icon: Tv,
    avatar: {
      type: "AI Influencer",
      persona: "Female AI influencer. man-on-the-street newscaster",
      traits: ["Polished & camera-ready", "Confident on-location presence", "News anchor energy with street-level relatability", "Professional but approachable"],
    },
    categories: [
      { name: "Informational / Educational", desc: "Data-backed posts, stat cards, policy explainer carousels" },
      { name: "Infographics w/ Commentary", desc: "Visual breakdowns of rates, costs, and risk data with voiceover or caption analysis" },
      { name: "News", desc: "Timely coverage of energy policy, rate hikes, insurance shifts. delivered fast" },
      { name: "Real, Personal Stories", desc: "Testimonials and real-life impacts. families, small businesses, everyday people" },
      { name: "Wildcard / Experimentation", desc: "Format-breaking content to test new hooks and engagement styles" },
    ],
    tone: ["Authoritative", "Credible", "Direct", "Polished", "Urgently informative"],
    toneExample: '"Your energy bill just changed. Here\'s what they didn\'t tell you."',
    demographic: { primary: "Elite. Professional, Business & Media", age: "35-55", leaning: "Informed decision-makers", geo: "National" },
    visual: {
      aesthetic: "Clean, editorial, news-studio feel. High contrast typography, dark backgrounds with data overlays. Think Bloomberg meets street journalism.",
      formats: ["Talking-head reels on location", "Stat card carousels", "News ticker-style stories", "Interview-style testimonials", "Data visualization posts"],
    },
  },
  {
    name: "The Real Life Feed",
    handle: "@thereallifefeed",
    description: "Experimental channel. creative, bold, and unapologetically different.",
    icon: Heart,
    avatar: {
      type: "AI Influencer",
      persona: "Health / Wellness Mom influencer",
      traits: ["Warm & relatable mom energy", "Wellness-forward lifestyle", "Bright, natural aesthetic", "Speaks to everyday family life"],
    },
    categories: [
      { name: "Extremely Creative / Off the Wall", desc: "Unexpected formats, surreal humor, pattern-interrupts that stop the scroll" },
      { name: "Humorous", desc: "Sketch-style comedy, relatable mom moments tied to energy and cost-of-living" },
      { name: "Eye-Catching / Trend-Based", desc: "Trending audio, viral formats, and meme templates adapted to the energy narrative" },
      { name: "Wildcard / Experimentation", desc: "Pure creative freedom. test what resonates, iterate fast" },
    ],
    tone: ["Playful", "Warm", "Surprising", "Relatable", "Unfiltered"],
    toneExample: '"Nobody told me adulting meant crying over my electricity bill in the Target parking lot."',
    demographic: { primary: "Young Moderate", age: "22-35", leaning: "Moderate / apolitical", geo: "National. suburban & urban" },
    visual: {
      aesthetic: "Bright, organic, lifestyle-forward. Natural lighting, warm tones, casual & approachable. Feels like scrolling a friend's feed. not a brand.",
      formats: ["Trend-jacking reels", "Comedy sketches", "Day-in-the-life stories", "Reaction-style content", "Meme carousels"],
    },
  },
  {
    name: "The Numbers Behind It",
    handle: "@thenumbersbehindit",
    description: "All narratives. data meets storytelling, delivered raw.",
    icon: BarChart3,
    avatar: {
      type: "AI Influencer",
      persona: "Blue collar, midwest American male. talks like a conspiracy theorist but speaks the truth",
      traits: ["Working-class authenticity", "Passionate, fired-up delivery", "Skeptic energy. questions everything", "Says what people are thinking but won't say out loud"],
    },
    categories: [
      { name: "Did You Know?. Informational / Educational", desc: "Mind-blowing stats and hidden facts presented with \"they don't want you to know\" energy" },
      { name: "Anecdotal Storytelling", desc: "Personal stories and analogies that make complex energy issues feel real and urgent" },
      { name: "News Breakdown / Throughline", desc: "Connecting the dots between headlines. showing the bigger picture others miss" },
      { name: "Wildcard / Experimentation", desc: "Rants, hot takes, and format experiments that push the edge" },
    ],
    tone: ["Raw", "Passionate", "Skeptical", "Truth-telling", "Blue collar wisdom"],
    toneExample: '"They raised your rates AGAIN and nobody\'s talking about it. Let me show you the numbers."',
    demographic: { primary: "National Moderate Right-Leaning", age: "30-55", leaning: "Right-leaning / populist", geo: "National. heartland & rural" },
    visual: {
      aesthetic: "Raw, gritty, unpolished on purpose. Dark moody tones, bold red/white text overlays, documentary-style framing. Feels like leaked footage, not a branded post.",
      formats: ["Direct-to-camera rants", "Whiteboard breakdowns", "Screenshot exposés", "Story-time reels", "Data reveal carousels"],
    },
  },
  {
    name: "Energy & Your Wallet",
    handle: "@energyandyourwallet",
    description: "Affordability & insurance. made simple, made fun.",
    icon: Wallet,
    avatar: {
      type: "AI Influencer",
      persona: "Dad influencer",
      traits: ["Suburban dad who just gets it", "Sports-loving, grill-manning, budget-conscious", "Makes boring topics entertaining", "The neighbor you actually trust for advice"],
    },
    categories: [
      { name: "Trending Male-Audience Content", desc: "Sports clips, guy humor, and trending formats that resonate with dads and young men" },
      { name: "Savings & Home Hacks", desc: "Energy-saving tips, home efficiency tricks, money moves. practical and actionable" },
      { name: "Dad Jokes & Memes", desc: "Peak dad humor remixed with energy policy and cost-of-living commentary" },
      { name: "Content Remixes", desc: "Taking viral moments and reframing them through the energy / affordability lens" },
      { name: "Conversational Explainers", desc: "\"That'd be like if...\". metaphoric, down-to-earth breakdowns that make news simple" },
      { name: "Wildcard / Experimentation", desc: "Sports watch parties, react content, and off-script moments" },
    ],
    tone: ["Conversational", "Down-to-earth", "Funny", "Metaphoric", "Dad-energy"],
    toneExample: '"That rate hike? That\'d be like if your fantasy league doubled the buy-in mid-season. Nobody asked for that."',
    demographic: { primary: "Suburban Moderate. East Coast", age: "28-50", leaning: "Moderate / pragmatic", geo: "PA, VA, MD corridor" },
    visual: {
      aesthetic: "Casual, backyard-BBQ energy. Well-lit but not overproduced. Think dad-fluencer meets financial advisor. polo shirts, not suits. Warm suburban tones.",
      formats: ["Talking-head explainers", "Duet / stitch reactions", "Meme remixes", "Hack-style tutorials", "Sports analogy reels"],
    },
  },
  {
    name: "How to Survive Until 2030",
    handle: "@surviveuntil2030",
    description: "Long-game thinking. deep dives, reactions, and real talk.",
    icon: Mic,
    avatar: {
      type: "AI Influencer",
      persona: "Informative female podcaster",
      traits: ["Smart, articulate, and curious", "Podcast-host warmth with editorial depth", "Asks the questions her audience is thinking", "Balances gravity with approachability"],
    },
    categories: [
      { name: "Memes / Humor", desc: "Shareable, witty content that makes serious topics digestible and viral" },
      { name: "News Story Reactions", desc: "Hot-take reactions to energy headlines. quick, opinionated, personality-driven" },
      { name: "Long-Form Explainers / Deep Dives", desc: "Podcast clips, carousel breakdowns, and mini-documentaries that go beneath the surface" },
      { name: "Wildcard / Experimentation", desc: "Live Q&As, collab content, and audience-driven topics" },
    ],
    tone: ["Warm", "Editorial", "Curious", "Thoughtful", "Subtly urgent"],
    toneExample: '"Everyone\'s arguing about the price of gas. Nobody\'s asking why your electric bill tripled. Let\'s talk about it."',
    demographic: { primary: "Suburban Women. Moderate", age: "28-45", leaning: "Moderate / pragmatic", geo: "US West. CA & CO" },
    visual: {
      aesthetic: "Warm editorial with podcast-studio vibes. Earth tones, soft lighting, clean serif typography. Feels like a curated magazine feed. intelligent, inviting, and elevated.",
      formats: ["Podcast clip reels", "Carousel deep dives", "Story reaction threads", "Quote card series", "Mini-documentary reels"],
    },
  },
];

function SectionLabel({ icon: Icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Icon size={14} style={{ color: C.textTer }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
}

function AccountCard({ account }) {
  const Icon = account.icon;
  return (
    <div className="account-card" style={{ background: C.card, boxShadow: C.cardShadow, borderRadius: 20, overflow: "hidden", marginBottom: 28 }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px", borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={24} style={{ color: C.text }} />
            </div>
            <div>
              <h2 style={{ ...hd, fontSize: 30, color: C.text, margin: 0, lineHeight: 1.1 }}>{account.name}</h2>
              <p style={{ fontSize: 13, color: C.textTer, margin: "4px 0 0", fontFamily: "monospace" }}>{account.handle}</p>
            </div>
          </div>
          <span style={{ padding: "6px 16px", borderRadius: 980, background: C.bgSoft, fontSize: 13, color: C.textSec, fontWeight: 500, whiteSpace: "nowrap" }}>{account.avatar.type}</span>
        </div>
        <p style={{ fontSize: 15, color: C.textSec, margin: "16px 0 0", lineHeight: 1.5 }}>{account.description}</p>
      </div>

      {/* Avatar Section */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.borderLight}`, background: C.bgSoft + "80" }}>
        <SectionLabel icon={User} label="Avatar Persona" />
        <p style={{ fontSize: 16, color: C.text, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.4 }}>{account.avatar.persona}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {account.avatar.traits.map((t, i) => (
            <span key={i} style={{ padding: "6px 14px", borderRadius: 980, background: C.card, border: `1px solid ${C.borderLight}`, fontSize: 13, color: C.textSec }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Body Grid */}
      <div className="card-body-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Content Categories */}
        <div style={{ padding: "24px 32px", borderRight: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>
          <SectionLabel icon={Layout} label="Content Categories" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {account.categories.map((cat, i) => (
              <div key={i}>
                <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: "0 0 3px" }}>{cat.name}</p>
                <p style={{ fontSize: 13, color: C.textSec, margin: 0, lineHeight: 1.5 }}>{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Tone + Demographic */}
        <div>
          {/* Tone of Voice */}
          <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.borderLight}` }}>
            <SectionLabel icon={MessageCircle} label="Tone of Voice" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {account.tone.map((t, i) => (
                <span key={i} style={{ padding: "5px 14px", borderRadius: 980, background: C.accent + "08", color: C.text, fontSize: 13, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
            <div style={{ padding: "12px 16px", background: C.bgSoft, borderRadius: 12, borderLeft: `3px solid ${C.border}` }}>
              <p style={{ fontSize: 13, color: C.textSec, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>{account.toneExample}</p>
            </div>
          </div>

          {/* Target Demographic */}
          <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.borderLight}` }}>
            <SectionLabel icon={Target} label="Target Demographic" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Audience", account.demographic.primary],
                ["Age Range", account.demographic.age],
                ["Leaning", account.demographic.leaning],
                ["Geography", account.demographic.geo],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: C.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                  <span style={{ fontSize: 14, color: C.text, fontWeight: 500, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Theme */}
      <div style={{ padding: "24px 32px" }}>
        <SectionLabel icon={Eye} label="Visual Theme" />
        <p style={{ fontSize: 14, color: C.text, margin: "0 0 16px", lineHeight: 1.7 }}>{account.visual.aesthetic}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {account.visual.formats.map((f, i) => (
            <span key={i} style={{ padding: "7px 16px", borderRadius: 12, background: C.bgSoft, fontSize: 13, color: C.textSec, fontWeight: 500 }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PotentialEnergyPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{fonts}{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .card-body-grid { grid-template-columns: 1fr !important; }
          .card-body-grid > div { border-right: none !important; }
          .account-card { border-radius: 14px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${C.borderLight}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>ALCHEMY <span style={{ fontWeight: 400, color: C.textSec }}>Productions</span></span>
        </div>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: C.textSec, textDecoration: "none", fontWeight: 500 }}>
          <ChevronLeft size={16} /> Dashboard
        </a>
      </div>

      {/* Header */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "56px 24px 40px", animation: "fadeIn 0.4s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Zap size={18} style={{ color: C.text }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.08em" }}>Energy Campaign</span>
        </div>
        <h1 style={{ ...hd, fontSize: 52, color: C.text, margin: "0 0 12px", lineHeight: 1.05 }}>Potential Energy</h1>
        <p style={{ fontSize: 17, color: C.textSec, margin: 0, lineHeight: 1.6, maxWidth: 560 }}>5 Instagram accounts. One unified energy campaign. Each voice is unique. here's the breakdown.</p>

        {/* Quick Index */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 32 }}>
          {ACCOUNTS.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 980, background: C.bgSoft, border: `1px solid ${C.borderLight}` }}>
                <Icon size={14} style={{ color: C.textSec }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{a.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Cards */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}>
        {ACCOUNTS.map((account, i) => (
          <AccountCard key={i} account={account} />
        ))}
      </div>
    </div>
  );
}
