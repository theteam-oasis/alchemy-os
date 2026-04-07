"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, ArrowRight, Check, Zap, TrendingUp, Rocket, Users, Play, Quote, Phone, Download } from "lucide-react";

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
          ...(w === "Taste." ? { fontStyle: "italic" } : {}),
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

/* ── Countdown Timer ── */
function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 48, minutes: 0, seconds: 0 });
  const endTimeRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("proposal_countdown_end");
    if (stored && Number(stored) > Date.now()) {
      endTimeRef.current = Number(stored);
    } else {
      const end = Date.now() + 48 * 60 * 60 * 1000;
      localStorage.setItem("proposal_countdown_end", String(end));
      endTimeRef.current = end;
    }
    setMounted(true);
    const tick = () => {
      const diff = Math.max(0, endTimeRef.current - Date.now());
      setTimeLeft({ hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");
  if (!mounted) return <div style={{ height: 40, marginBottom: 32 }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 32 }}>
      <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: "#C5960A", letterSpacing: "0.05em", textTransform: "uppercase" }}>50% Off Ends In</span>
      <div style={{ display: "flex", gap: 6 }}>
        {[{ v: timeLeft.hours, l: "h" }, { v: timeLeft.minutes, l: "m" }, { v: timeLeft.seconds, l: "s" }].map((t, i) => (
          <span key={i} style={{ ...mono, fontSize: 15, fontWeight: 700, color: "#C5960A", background: "#C5960A12", padding: "4px 8px", borderRadius: 6, border: "1px solid #C5960A20" }}>{pad(t.v)}{t.l}</span>
        ))}
      </div>
    </div>
  );
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
    name: "Spark", price: "$2,500", originalPrice: "$5,000", period: "",
    description: "Perfect for testing the waters.", icon: Zap,
    features: ["25 Static ad creatives", "1 Hero video ad (45 seconds)", "2 Rounds of revisions", "Delivered in 7 days"],
    cta: "Get Started", highlighted: false,
  },
  {
    name: "Accelerate", price: "$5,000", originalPrice: "$10,000", period: "",
    description: "Everything you need to scale fast.", icon: TrendingUp,
    features: ["75 Static ad creatives", "2 Hero video ads (45 seconds each)", "2 Rounds of revisions", "Delivered in 7 days"],
    cta: "Get Started", highlighted: true,
  },
  {
    name: "Scale", price: "$12,500", originalPrice: "$25,000", period: "",
    description: "Full creative firepower for scale.", icon: Rocket,
    features: ["250 Static ad creatives", "8 Hero video ads (45 seconds each)", "2 Rounds of revisions", "Delivered in 7 days"],
    cta: "Get Started", highlighted: false,
  },
];

export default function ProposalClient({ proposal }) {
  const brandName = proposal.brand_name;
  const statics = proposal.static_urls || [];
  const videoUrl = proposal.video_url;
  const hideLabels = ["bond-matchmaking", "chiller-body"].includes(proposal.slug);
  const tallSlugs = ["dude-meds", "chiller-body"];
  const aspectRatio = tallSlugs.includes(proposal.slug) ? "177.78%" : "100%";
  const hideDiscount = proposal.slug === "chiller-body";

  return (
    <>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Studios</span></span>
          </div>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Proposal for {brandName}</span>
        </nav>

        {/* ── Hero ── */}
        <section style={{ textAlign: "center", padding: "48px 0 80px" }}>
          <Reveal delay={100}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 32 }}>
              <Sparkles size={14} style={{ color: G.gold }} />
              <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Proposal</span>
            </div>
          </Reveal>

          <HeroBlurText as="h1" className="hero-proposal-title" style={{ ...hd, fontSize: 58, color: G.text, lineHeight: 1.1, marginBottom: 16, justifyContent: "center" }} staggerMs={70}>{"In the Age of A.I., the Ultimate Edge is Taste."}</HeroBlurText>

          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <HeroBlurText as="p" className="hero-proposal-sub" style={{ ...hd, fontSize: 26, color: G.textSec, lineHeight: 1.4, justifyContent: "center" }} staggerMs={50}>{"Get High Converting, Beautiful,"}</HeroBlurText>
            <HeroBlurText as="p" className="hero-proposal-sub" style={{ ...hd, fontSize: 26, color: G.gold, lineHeight: 1.4, justifyContent: "center" }} staggerMs={50}>{"Ready to Deploy Meta Ads"}</HeroBlurText>
          </div>

          <Reveal delay={600} as="p" style={{ color: G.textTer, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto", ...mono }}>We combine proprietary AI systems with human creative direction to produce high-volume, performance-tested ad creative optimized for Meta's Andromeda algorithm.</Reveal>
        </section>

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
              {statics.map((src, i) => {
                const creativeTypes = ["Lifestyle", "Product Hero", "Detail Shot", "Editorial", "Scene Setting", "Wild Card"];
                const label = creativeTypes[i % creativeTypes.length];
                return (
                <BlurReveal key={i} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, background: G.card }}>
                  <div style={{ position: "relative", paddingTop: aspectRatio, background: "#F5F5F7" }}>
                    <img src={src} alt={`${brandName} ${label}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  {!hideLabels && (
                    <div style={{ padding: "14px 20px" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: G.text, ...mono }}>{label}</p>
                    </div>
                  )}
                </BlurReveal>
                );
              })}
            </div>
            {proposal.slug === "chiller-body" && (
              <BlurReveal style={{ textAlign: "center", marginTop: 48 }}>
                <a
                  href="https://drive.google.com/uc?export=download&id=1u1Yjgham_qXqggJDuXcJtS9tbzYxWQdE"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "14px 32px", borderRadius: 980,
                    background: G.gold, color: "#fff",
                    fontSize: 15, fontWeight: 600, textDecoration: "none",
                    transition: "opacity 0.2s", ...mono,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <Download size={16} />
                  Download Hero Video
                </a>
              </BlurReveal>
            )}
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

        {/* ── Bold Statement ── */}
        <section style={{ marginBottom: 48, textAlign: "center", padding: "60px 0" }}>
          <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 24 }}>
            <TrendingUp size={14} style={{ color: G.gold }} />
            <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...mono }}>Proven Results</span>
          </BlurReveal>
          <ScrollBlurText as="h2" style={{ ...hd, fontSize: 44, color: G.text, lineHeight: 1.2, maxWidth: 700, margin: "0 auto", justifyContent: "center" }}>{"Over $12M Generated With Our Ads"}</ScrollBlurText>
          <BlurReveal as="p" style={{ ...hd, fontSize: 22, color: G.textSec, lineHeight: 1.5, maxWidth: 560, margin: "20px auto 0", justifyContent: "center" }}>Across 40+ DTC brands — from skincare to supplements and everything in between.</BlurReveal>
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
          {!hideDiscount && <CountdownTimer />}
          <div className="package-grid">
            {packages.map((pkg, i) => (
              <BlurReveal key={i} style={{
                borderRadius: 20, border: pkg.highlighted ? `2px solid ${G.gold}` : `1px solid ${G.cardBorder}`,
                boxShadow: pkg.highlighted ? "0 8px 32px rgba(0,0,0,0.10)" : G.cardShadow,
                background: G.card, padding: "36px 28px", position: "relative", display: "flex", flexDirection: "column", height: "100%",
              }}>
                {pkg.highlighted && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: G.gold, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 16px", borderRadius: 980, ...mono }}>Most Popular</div>
                )}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: pkg.highlighted ? G.gold : G.goldSoft, border: pkg.highlighted ? "none" : `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <pkg.icon size={18} style={{ color: pkg.highlighted ? "#fff" : G.gold }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: G.text, marginBottom: 4, ...mono }}>{pkg.name}</h3>
                <p style={{ fontSize: 14, color: G.textSec, marginBottom: 20, ...mono }}>{pkg.description}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 28 }}>
                  <span style={{ ...hd, fontSize: 42, color: G.text }}>{pkg.price}</span>
                  {pkg.period && <span style={{ fontSize: 15, color: G.textTer, ...mono }}>{pkg.period}</span>}
                  {pkg.originalPrice && !hideDiscount && <span style={{ fontSize: 18, color: G.textTer, textDecoration: "line-through", ...mono }}>{pkg.originalPrice}</span>}
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
                }}>{pkg.cta}</a>
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
                <div style={{ marginBottom: 12, display: "flex", gap: 2 }}>
                  {[...Array(5)].map((_, j) => (
                    <span key={j} style={{ fontSize: 18, color: G.text }}>★</span>
                  ))}
                </div>
                <Quote size={20} style={{ color: G.textTer, marginBottom: 12, transform: "scaleX(-1)" }} />
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
          <BlurReveal style={{ borderRadius: 20, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, overflow: "hidden", background: G.card, marginBottom: 48 }}>
            <iframe
              src="https://calendly.com/d/cs9w-cwg-b5q/alchemy-performance-creatives?hide_gdpr_banner=1&background_color=ffffff&text_color=1d1d1f&primary_color=000000"
              style={{ width: "100%", height: 700, border: "none" }}
              title="Book a Call"
            />
          </BlurReveal>

          <BlurReveal style={{ textAlign: "center", padding: "40px 24px", borderRadius: 20, border: `1px solid ${G.cardBorder}`, background: G.card, boxShadow: G.cardShadow }}>
            <h3 style={{ ...hd, fontSize: 28, color: G.text, marginBottom: 8 }}>Any Last Minute Questions?</h3>
            <p style={{ color: G.textSec, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 20px", ...mono }}>Skip the call and text our founder directly:</p>
            <a href="tel:9294627048" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: G.text, textDecoration: "none", marginBottom: 8, ...mono }}>
              <Phone size={16} style={{ color: G.text }} />
              929-462-7048
            </a>
            <p style={{ fontSize: 14, color: G.textSec, ...mono }}>Andrew James</p>
          </BlurReveal>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Studios</span>
            </div>
            <span style={{ fontSize: 12, color: G.textTer, ...mono }}>Confidential Proposal for {brandName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 20 }}>
              <a href="/terms" style={{ fontSize: 12, color: G.textTer, textDecoration: "none", ...mono }}>Terms of Service</a>
              <a href="/privacy" style={{ fontSize: 12, color: G.textTer, textDecoration: "none", ...mono }}>Privacy Policy</a>
              <a href="/refund-policy" style={{ fontSize: 12, color: G.textTer, textDecoration: "none", ...mono }}>Refund Policy</a>
            </div>
            <span style={{ fontSize: 11, color: G.textTer, ...mono }}>&copy; 2026 Alchemy Studios LLC. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
