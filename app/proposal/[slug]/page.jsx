"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Sparkles, ArrowRight, Check, Zap, TrendingUp, Users, Play, Quote } from "lucide-react";

/* ── Design tokens ── */
const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000", goldSoft: "#00000008", goldBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function Reveal({ children, as: Tag = "div", style = {}, className = "", delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <Tag className={className} style={{
      ...style,
      filter: show ? "blur(0px)" : "blur(12px)", opacity: show ? 1 : 0,
      transform: show ? "translateY(0px)" : "translateY(18px)",
      transition: "filter 1.2s cubic-bezier(0.25,0.1,0.25,1), opacity 1.2s cubic-bezier(0.25,0.1,0.25,1), transform 1.2s cubic-bezier(0.25,0.1,0.25,1)",
    }}>{children}</Tag>
  );
}

function HeroBlurText({ children, as: Tag = "span", style = {}, className = "", staggerMs = 60 }) {
  const text = typeof children === "string" ? children : "";
  const words = text.split(" ");
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);
  return (
    <Tag className={className} style={{ ...style, display: "flex", flexWrap: "wrap", gap: "0 0.3em" }}>
      {words.map((w, i) => (
        <span key={i} style={{
          display: "inline-block",
          filter: show ? "blur(0px)" : "blur(14px)", opacity: show ? 1 : 0,
          transform: show ? "translateY(0px)" : "translateY(16px)",
          transition: `filter 1s cubic-bezier(0.25,0.1,0.25,1) ${i * staggerMs}ms, opacity 1s cubic-bezier(0.25,0.1,0.25,1) ${i * staggerMs}ms, transform 1s cubic-bezier(0.25,0.1,0.25,1) ${i * staggerMs}ms`,
        }}>{w}</span>
      ))}
    </Tag>
  );
}

function ScrollBlurText({ children, blurMax = 8, stagger = true, as: Tag = "span", style = {}, className = "" }) {
  const text = typeof children === "string" ? children : null;
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);
  const tick = useCallback(() => {
    const el = ref.current;
    if (el) { const rect = el.getBoundingClientRect(); const raw = (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.5); progressRef.current = Math.min(1, Math.max(0, raw)); }
    smoothRef.current += (progressRef.current - smoothRef.current) * 0.08;
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005) smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current); raf.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => { raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current); }, [tick]);
  if (text && stagger) {
    const words = text.split(" ");
    return (
      <Tag ref={ref} className={className} style={{ ...style, display: "flex", flexWrap: "wrap", gap: "0 0.3em" }}>
        {words.map((w, i) => {
          const s = (i / words.length) * 0.7; const e = s + 0.45;
          const wp = ease(Math.min(1, Math.max(0, (smooth - s) / (e - s))));
          return (<span key={i} style={{ display: "inline-block", filter: `blur(${blurMax * (1 - wp)}px)`, opacity: wp, transform: `translateY(${10 * (1 - wp)}px)`, willChange: "filter, opacity, transform" }}>{w}</span>);
        })}
      </Tag>
    );
  }
  const p = ease(smooth);
  return (<Tag ref={ref} className={className} style={{ ...style, filter: `blur(${blurMax * (1 - p)}px)`, opacity: p, transform: `translateY(${16 * (1 - p)}px)`, willChange: "filter, opacity, transform" }}>{children}</Tag>);
}

function BlurReveal({ children, as: Tag = "div", style = {}, blurMax = 6 }) {
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);
  const tick = useCallback(() => {
    const el = ref.current;
    if (el) { const rect = el.getBoundingClientRect(); const raw = (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.45); progressRef.current = Math.min(1, Math.max(0, raw)); }
    smoothRef.current += (progressRef.current - smoothRef.current) * 0.08;
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005) smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current); raf.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => { raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current); }, [tick]);
  const p = ease(smooth);
  return (<Tag ref={ref} style={{ ...style, filter: `blur(${blurMax * (1 - p)}px)`, opacity: p, transform: `translateY(${18 * (1 - p)}px)`, willChange: "filter, opacity, transform" }}>{children}</Tag>);
}

/* ── Stats ── */
const stats = [
  { value: "46%", label: "Avg. Increase in CTR" },
  { value: "29%", label: "Avg. Lower CPA" },
  { value: "8x", label: "Avg. Creative Velocity" },
];

const results = [
  { metric: "Revenue Growth", category: "Skincare & Beauty", detail: "$80K → $340K/mo", timeline: "In 6 months" },
  { metric: "Peak ROAS", category: "Fashion & Apparel", detail: "$0 → $210K revenue", timeline: "In 90 days" },
  { metric: "Scale Achieved", category: "Health & Supplements", detail: "$500K → $1.2M/mo", timeline: "Stable CPA" },
];

/* ── Testimonials ── */
const testimonials = [
  { quote: "I honestly don't know where I'd be without the Alchemy Team. Their marketing strategies are insanely smart, but what really stands out is how much they actually care. Andrew and the Alchemy team has helped us generate over $500k in revenue so far.", name: "Peter D.", role: "Founder", company: "Luxury Landscape Design" },
  { quote: "Working with Andrew (and Alchemy) has been the best business decision I've ever made. His knowledge of marketing and business has helped me achieve things I had spent years on without success.", name: "Aaron W.", role: "Founder", company: "Media Network" },
  { quote: "I have interviewed 30 agencies in the last few months. I haven't seen even one of them innovating at 1/10th the rate of the Alchemy team. It is so exciting to watch them build this system and lead the way.", name: "Kathryn B.", role: "Founder", company: "Education Platform" },
];

/* ── Packages ── */
const packages = [
  {
    name: "Ignite", price: "$2,500", period: "/mo",
    description: "For brands testing AI creative at scale", icon: Zap,
    features: ["15 static ad creatives per month", "3 concept directions", "2 revision rounds", "Meta-optimized formats", "Performance copy variations", "Monthly creative strategy call"],
    cta: "Get Started", highlighted: false,
  },
  {
    name: "Accelerate", price: "$5,000", period: "/mo",
    description: "For brands ready to dominate Andromeda", icon: TrendingUp,
    features: ["40 static + 5 video creatives per month", "6 concept directions", "Unlimited revisions", "Meta + TikTok formats", "UGC-style scripts included", "Bi-weekly strategy calls", "A/B testing frameworks", "Dedicated creative strategist"],
    cta: "Most Popular", highlighted: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    description: "For agencies and high-spend brands", icon: Users,
    features: ["Unlimited creatives", "Full creative team access", "Custom AI model training", "White-label deliverables", "Multi-brand management", "Weekly strategy sessions", "Priority turnaround (24h)", "Dedicated Slack channel"],
    cta: "Let's Talk", highlighted: false,
  },
];

export default function DynamicProposalPage() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/proposal?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setProposal(d.proposal);
        else setError("Proposal not found");
      })
      .catch(() => setError("Failed to load proposal"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", ...mono }}>
      <p style={{ color: G.textSec, fontSize: 15 }}>Loading proposal...</p>
    </div>
  );

  if (error || !proposal) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", ...mono }}>
      <p style={{ color: G.textSec, fontSize: 15 }}>Proposal not found.</p>
    </div>
  );

  const brandName = proposal.brand_name;
  const statics = proposal.static_urls || [];
  const videoUrl = proposal.video_url;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${G.bg}; -webkit-font-smoothing: antialiased; }
        .proposal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .package-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 900px) {
          .proposal-grid { grid-template-columns: 1fr; }
          .package-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr; }
          .testimonial-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .hero-proposal-title { font-size: 42px !important; }
          .hero-proposal-sub { font-size: 22px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderBottom: `1px solid ${G.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Studios</span></span>
          </div>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Proposal for {brandName}</span>
        </nav>

        {/* ── Hero ── */}
        <section style={{ textAlign: "center", padding: "100px 0 80px" }}>
          <Reveal delay={100}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 32 }}>
              <Sparkles size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Proposal</span>
            </div>
          </Reveal>

          <HeroBlurText as="h1" className="hero-proposal-title" style={{ ...hd, fontSize: 58, color: G.text, lineHeight: 1.1, marginBottom: 16, justifyContent: "center" }} staggerMs={70}>{"In the Age of A.I. Content, the Ultimate Edge is Taste"}</HeroBlurText>

          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <HeroBlurText as="p" className="hero-proposal-sub" style={{ ...hd, fontSize: 26, color: G.textSec, lineHeight: 1.4, justifyContent: "center" }} staggerMs={50}>{"Get High Converting, Beautiful,"}</HeroBlurText>
            <HeroBlurText as="p" className="hero-proposal-sub" style={{ ...hd, fontSize: 26, color: G.gold, lineHeight: 1.4, justifyContent: "center" }} staggerMs={50}>{"Ready to Deploy Meta Ads"}</HeroBlurText>
          </div>

          <Reveal delay={600} as="p" style={{ color: G.textTer, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto", ...mono }}>We combine proprietary AI systems with human creative direction to produce high-volume, performance-tested ad creative optimized for Meta's Andromeda algorithm.</Reveal>
        </section>

        <div style={{ height: 1, background: G.border, margin: "0 0 80px" }} />

        {/* ── Creative Samples ── */}
        {statics.length > 0 && (
          <section style={{ marginBottom: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
                <Sparkles size={14} style={{ color: G.gold }} />
                <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Sample Creative</span>
              </BlurReveal>
              <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{`Creative for ${brandName}`}</ScrollBlurText>
              <BlurReveal as="p" style={{ color: G.textSec, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto", ...mono }}>A preview of the creative direction we'd take for your brand.</BlurReveal>
            </div>
            <div className="proposal-grid">
              {statics.map((src, i) => (
                <BlurReveal key={i} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, background: G.card }}>
                  <div style={{ position: "relative", paddingTop: "125%", background: "#F5F5F7" }}>
                    <img src={src} alt={`${brandName} sample ${i + 1}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: G.textTer, letterSpacing: "0.08em", textTransform: "uppercase", ...mono }}>Sample Creative</span>
                    <p style={{ fontSize: 15, fontWeight: 600, color: G.text, marginTop: 4, ...mono }}>{brandName} Ad {i + 1}</p>
                  </div>
                </BlurReveal>
              ))}
            </div>
          </section>
        )}

        {/* ── Video ── */}
        {videoUrl && (
          <section style={{ marginBottom: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
                <Play size={14} style={{ color: G.gold }} />
                <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Video</span>
              </BlurReveal>
              <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{"Sample Video Creative"}</ScrollBlurText>
            </div>
            <BlurReveal style={{ borderRadius: 20, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, overflow: "hidden", background: "#000" }}>
              <div style={{ position: "relative", paddingTop: "56.25%" }}>
                <iframe src={videoUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} title={`${brandName} Video`} allowFullScreen />
              </div>
            </BlurReveal>
          </section>
        )}

        {/* ── Stats ── */}
        <section style={{ marginBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
              <TrendingUp size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Proven Results</span>
            </BlurReveal>
            <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{"Numbers That Speak"}</ScrollBlurText>
            <BlurReveal as="p" style={{ color: G.textSec, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto", ...mono }}>Real performance metrics from brands we've scaled.</BlurReveal>
          </div>
          <div className="stats-grid">
            {stats.map((s, i) => (
              <BlurReveal key={i} style={{ textAlign: "center", padding: "40px 24px", borderRadius: 20, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, background: G.card }}>
                <div style={{ ...hd, fontSize: 48, color: G.gold, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: 14, color: G.textSec, fontWeight: 500, ...mono }}>{s.label}</div>
              </BlurReveal>
            ))}
          </div>
          <div className="stats-grid" style={{ marginTop: 24 }}>
            {results.map((r, i) => (
              <BlurReveal key={i} style={{ padding: "28px 24px", borderRadius: 16, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, background: G.card }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: G.textTer, letterSpacing: "0.08em", textTransform: "uppercase", ...mono }}>{r.category}</span>
                <div style={{ ...hd, fontSize: 24, color: G.text, margin: "8px 0 4px" }}>{r.detail}</div>
                <div style={{ fontSize: 13, color: G.textSec, ...mono }}>{r.timeline}</div>
              </BlurReveal>
            ))}
          </div>
        </section>

        {/* ── Packages ── */}
        <section style={{ marginBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
              <Sparkles size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Packages</span>
            </BlurReveal>
            <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{"Choose Your Plan"}</ScrollBlurText>
            <BlurReveal as="p" style={{ color: G.textSec, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto", ...mono }}>Flexible packages designed to match your creative volume and growth stage.</BlurReveal>
          </div>
          <div className="package-grid">
            {packages.map((pkg, i) => (
              <BlurReveal key={i} style={{
                borderRadius: 20, border: pkg.highlighted ? `2px solid ${G.gold}` : `1px solid ${G.cardBorder}`,
                boxShadow: pkg.highlighted ? "0 8px 32px rgba(0,0,0,0.10)" : G.cardShadow,
                background: G.card, padding: "36px 28px", position: "relative", display: "flex", flexDirection: "column",
              }}>
                {pkg.highlighted && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: G.gold, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 16px", borderRadius: 980, ...mono }}>Recommended</div>
                )}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: pkg.highlighted ? G.gold : G.goldSoft, border: pkg.highlighted ? "none" : `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <pkg.icon size={18} style={{ color: pkg.highlighted ? "#fff" : G.gold }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: G.text, marginBottom: 4, ...mono }}>{pkg.name}</h3>
                <p style={{ fontSize: 14, color: G.textSec, marginBottom: 20, ...mono }}>{pkg.description}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 28 }}>
                  <span style={{ ...hd, fontSize: 42, color: G.text }}>{pkg.price}</span>
                  {pkg.period && <span style={{ fontSize: 15, color: G.textTer, ...mono }}>{pkg.period}</span>}
                </div>
                <div style={{ height: 1, background: G.border, marginBottom: 24 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                  {pkg.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                      <Check size={16} style={{ color: G.success, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 14, color: G.text, lineHeight: 1.5, ...mono }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#book" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 24px", borderRadius: 980, marginTop: 28, textDecoration: "none", fontSize: 15, fontWeight: 600, ...mono,
                  background: pkg.highlighted ? G.gold : "transparent", color: pkg.highlighted ? "#fff" : G.text,
                  border: pkg.highlighted ? "none" : `1px solid ${G.goldBorder}`, transition: "all 0.2s",
                }}>{pkg.cta} <ArrowRight size={15} /></a>
              </BlurReveal>
            ))}
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section style={{ marginBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
              <Users size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Testimonials</span>
            </BlurReveal>
            <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{"What Our Partners Say"}</ScrollBlurText>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <BlurReveal key={i} style={{ padding: "32px 28px", borderRadius: 20, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, background: G.card, display: "flex", flexDirection: "column" }}>
                <Quote size={20} style={{ color: G.textTer, marginBottom: 16, transform: "scaleX(-1)" }} />
                <p style={{ fontSize: 14, color: G.textSec, lineHeight: 1.7, flex: 1, ...mono }}>{t.quote}</p>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${G.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: G.text, ...mono }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: G.textTer, ...mono }}>{t.role}, {t.company}</div>
                </div>
              </BlurReveal>
            ))}
          </div>
        </section>

        {/* ── Calendly ── */}
        <section id="book" style={{ marginBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
              <Sparkles size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Next Step</span>
            </BlurReveal>
            <ScrollBlurText as="h2" style={{ ...hd, fontSize: 38, color: G.text, lineHeight: 1.2, marginBottom: 12, justifyContent: "center" }}>{"Book a Creative Strategy Call"}</ScrollBlurText>
            <BlurReveal as="p" style={{ color: G.textSec, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto", ...mono }}>Pick a time that works and we'll walk through the creative strategy for {brandName}.</BlurReveal>
          </div>
          <BlurReveal style={{ borderRadius: 20, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, overflow: "hidden", background: G.card }}>
            <iframe
              src="https://calendly.com/d/cs9w-cwg-b5q/alchemy-performance-creatives?hide_gdpr_banner=1&background_color=ffffff&text_color=1d1d1f&primary_color=000000"
              style={{ width: "100%", height: 700, border: "none" }}
              title="Book a Call"
            />
          </BlurReveal>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={10} style={{ color: G.textTer }} />
            </div>
            <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Studios</span>
          </div>
          <span style={{ fontSize: 12, color: G.textTer, ...mono }}>Confidential Proposal for {brandName}</span>
        </footer>
      </div>
    </>
  );
}
