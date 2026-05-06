"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Sparkles, Check, X, ChevronRight, Play, Star, TrendingUp, Zap, Brain, Users, Image, Video, Mic } from "lucide-react";

/* ── Smooth easing helper ── */
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* ── Mount fade-in for hero (not scroll-linked) ── */
function HeroReveal({ children, as: Tag = "div", style = {}, className = "", delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <Tag className={className} style={{
      ...style,
      filter: show ? "blur(0px)" : "blur(12px)",
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0px)" : "translateY(18px)",
      transition: "filter 1.2s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 1.2s cubic-bezier(0.25, 0.1, 0.25, 1), transform 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
    }}>{children}</Tag>
  );
}

/* ── Hero headline: words stagger in on mount ── */
function HeroBlurText({ children, as: Tag = "span", style = {}, className = "", staggerMs = 60, mobileBreakAfter = [] }) {
  const text = typeof children === "string" ? children : "";
  const words = text.split(" ");
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);
  return (
    <Tag className={className} style={{ ...style, display: "flex", flexWrap: "wrap", gap: "0 0.3em", justifyContent: style.justifyContent || "flex-start" }}>
      {words.flatMap((w, i) => {
        const items = [
          <span key={`w-${i}`} style={{
            display: "inline-block",
            filter: show ? "blur(0px)" : "blur(14px)",
            opacity: show ? 1 : 0,
            transform: show ? "translateY(0px)" : "translateY(16px)",
            transition: `filter 1s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * staggerMs}ms, opacity 1s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * staggerMs}ms, transform 1s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * staggerMs}ms`,
          }}>{w}</span>
        ];
        if (mobileBreakAfter.includes(i)) {
          items.push(<span key={`br-${i}`} className="mobile-break" aria-hidden="true" style={{ flexBasis: "100%", height: 0 }} />);
        }
        return items;
      })}
    </Tag>
  );
}

/* ── Scroll-linked blur reveal (Framer-style) ── */
function ScrollBlurText({ children, blurMax = 8, stagger = true, as: Tag = "span", style = {}, className = "" }) {
  const text = typeof children === "string" ? children : null;
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);

  const tick = useCallback(() => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const raw = (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.5);
      progressRef.current = Math.min(1, Math.max(0, raw));
    }
    // Lerp: 0.08 = smooth glide without being sluggish
    smoothRef.current += (progressRef.current - smoothRef.current) * 0.08;
    // Snap to target when very close to avoid lingering near-invisible state
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005) smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current);
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [tick]);

  if (text && stagger) {
    const words = text.split(" ");
    return (
      <Tag ref={ref} className={className} style={{ ...style, display: "flex", flexWrap: "wrap", gap: "0 0.3em" }}>
        {words.map((w, i) => {
          // Wider overlap between words for smoother cascade
          const s = (i / words.length) * 0.7;
          const e = s + 0.45;
          const wp = ease(Math.min(1, Math.max(0, (smooth - s) / (e - s))));
          return (
            <span key={i} style={{
              display: "inline-block",
              filter: `blur(${blurMax * (1 - wp)}px)`,
              opacity: wp,
              transform: `translateY(${10 * (1 - wp)}px)`,
              willChange: "filter, opacity, transform",
            }}>{w}</span>
          );
        })}
      </Tag>
    );
  }

  const p = ease(smooth);
  return (
    <Tag ref={ref} className={className} style={{
      ...style,
      filter: `blur(${blurMax * (1 - p)}px)`,
      opacity: p,
      transform: `translateY(${16 * (1 - p)}px)`,
      willChange: "filter, opacity, transform",
    }}>{children}</Tag>
  );
}

/* Convenience: reveal a whole block (card, grid, section chunk) */
function BlurReveal({ children, as: Tag = "div", style = {}, className = "", blurMax = 6 }) {
  const ref = useRef(null);
  const progressRef = useRef(0);
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);
  const raf = useRef(null);

  const tick = useCallback(() => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const raw = (window.innerHeight * 0.95 - rect.top) / (window.innerHeight * 0.45);
      progressRef.current = Math.min(1, Math.max(0, raw));
    }
    smoothRef.current += (progressRef.current - smoothRef.current) * 0.08;
    if (Math.abs(progressRef.current - smoothRef.current) < 0.005) smoothRef.current = progressRef.current;
    setSmooth(smoothRef.current);
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [tick]);

  const p = ease(smooth);
  return (
    <Tag ref={ref} className={className} style={{
      ...style,
      filter: `blur(${blurMax * (1 - p)}px)`,
      opacity: p,
      transform: `translateY(${18 * (1 - p)}px)`,
      willChange: "filter, opacity, transform",
    }}>{children}</Tag>
  );
}

/* Wistia removed for now. LazyVideo renders an inert black 9:16 placeholder
   so the surrounding grid spacing stays the same. Swap the body for an
   <iframe> or self-hosted <video> later when we re-enable demo videos. */
function LazyVideo({ vid, title = "Video Ad" }) {
  return (
    <div style={{ position: "relative", paddingBottom: "177.78%", height: 0, background: "linear-gradient(135deg, #0A0A0A, #1D1D1F)" }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: "0.1em",
        textTransform: "uppercase", fontFamily: "'Inter', sans-serif",
      }}>
        {title}
      </div>
    </div>
  );
}

const G = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000",
  goldSoft: "#00000008",
  goldBorder: "#D2D2D7",
  text: "#1D1D1F",
  textSec: "#86868B",
  textTer: "#AEAEB2",
  border: "#E8E8ED",
  success: "#34C759",
  danger: "#FF3B30",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');`;
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);
  const links = [{ label: "Why Alchemy", href: "#why" }, { label: "Portfolio", href: "#creative" }, { label: "How It Works", href: "#how" }, { label: "Case Studies", href: "#results" }];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(255,255,255,0.9)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${G.border}` : "none", transition: "all 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={14} style={{ color: G.gold }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em" }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
      </div>
      <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {links.map(l => <a key={l.href} href={l.href} style={{ color: G.textSec, fontSize: 14, textDecoration: "none", fontWeight: 500, transition: "color 0.2s", ...mono }} onMouseEnter={e => e.target.style.color = G.text} onMouseLeave={e => e.target.style.color = G.textSec}>{l.label}</a>)}
        <a href="#cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 980, background: G.gold, color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", ...mono }}>Book a Call <ArrowRight size={14} /></a>
      </div>
      <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8 }}>
        {mobileOpen ? <X size={24} color={G.text} /> : <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ width: 22, height: 2, background: G.text, borderRadius: 2, display: "block" }} /><span style={{ width: 22, height: 2, background: G.text, borderRadius: 2, display: "block" }} /><span style={{ width: 22, height: 2, background: G.text, borderRadius: 2, display: "block" }} /></div>}
      </button>
      {mobileOpen && (
        <div className="nav-mobile-menu" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${G.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ color: G.textSec, fontSize: 16, textDecoration: "none", fontWeight: 500, ...mono }}>{l.label}</a>)}
          <a href="#cta" onClick={() => setMobileOpen(false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", borderRadius: 980, background: G.gold, color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", ...mono }}>Book a Call <ArrowRight size={14} /></a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero-section" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", overflow: "hidden" }}>
      <div className="hero-circle" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, borderRadius: "50%", border: `1px solid ${G.goldBorder}`, opacity: 0.3 }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 800 }}>
        <HeroReveal delay={100} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 32 }}>
          <Sparkles size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>AI-Powered Creative Studio</span>
        </HeroReveal>

        <HeroBlurText as="h1" className="hero-title" style={{ ...hd, fontSize: 64, color: G.text, lineHeight: 1.1, marginBottom: 8, justifyContent: "center", textTransform: "capitalize" }} staggerMs={70} mobileBreakAfter={[2]}>{"For brands scaling with Paid Social"}</HeroBlurText>

        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <HeroBlurText as="p" className="hero-subtitle" style={{ ...hd, fontSize: 32, color: G.text, lineHeight: 1.3, justifyContent: "center", whiteSpace: "nowrap", fontStyle: "italic" }} staggerMs={50}>{"Your ads aren't failing. Your creative pipeline is."}</HeroBlurText>
        </div>

        <HeroReveal delay={600} as="p" className="hero-body" style={{ color: G.textSec, fontSize: 17, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px", ...mono }}>High volume A.I. creative built for the Andromeda age of Meta.</HeroReveal>

        <HeroReveal delay={750} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ color: G.textTer, fontSize: 13, ...mono }}>AI-powered</span>
          <span style={{ color: G.goldBorder }}>•</span>
          <span style={{ color: G.textTer, fontSize: 13, ...mono }}>Performance-tested</span>
          <span style={{ color: G.goldBorder }}>•</span>
          <span style={{ color: G.textTer, fontSize: 13, ...mono }}>Andromeda Optimized</span>
        </HeroReveal>

        <HeroReveal delay={900}>
          <a className="hero-cta" href="#cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", borderRadius: 980, background: G.gold, color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", marginTop: 20, ...mono }}>Book a Creative Strategy Call <ArrowRight size={16} /></a>
          <div style={{ marginTop: 12 }}>
            <a href="#creative" style={{ color: G.textSec, fontSize: 14, textDecoration: "none", ...mono }}>See Example Ads</a>
          </div>
        </HeroReveal>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "46%", label: "Avg. Increase in CTR" },
    { value: "29%", label: "Avg. Lower CPA" },
    { value: "8x", label: "Avg. Creative Velocity" },
  ];
  return (
    <section style={{ padding: "0 24px 80px", maxWidth: 900, margin: "0 auto" }}>
      <div className="stats-grid" style={{ display: "flex", gap: 24, justifyContent: "center" }}>
        {stats.map((s, i) => (
          <BlurReveal key={i} style={{ flex: 1, textAlign: "center", padding: 32, background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16 }}>
            <p className="stat-value" style={{ fontSize: 48, fontWeight: 700, color: G.gold, marginBottom: 8, ...mono }}>{s.value}</p>
            <p style={{ color: G.textSec, fontSize: 14, ...mono }}>{s.label}</p>
          </BlurReveal>
        ))}
      </div>
    </section>
  );
}

function WhyAlchemy() {
  const features = [
    { icon: <Sparkles size={20} />, title: "Creative That Converts", desc: "High-performing ad creatives engineered for today's algorithms. Every piece designed to stop the scroll and drive action." },
    { icon: <TrendingUp size={20} />, title: "Monthly Themed Campaigns", desc: "Cohesive monthly campaigns built with multiple formats, hooks, and angles so Meta can find winners faster." },
    { icon: <Zap size={20} />, title: "Hydra Testing System", desc: "A proprietary testing system designed to surface and scale winners without creative bottlenecks." },
    { icon: <Brain size={20} />, title: "Oracle Brain", desc: "A centralized intelligence layer combining brand DNA, market data, and category insights to guide execution." },
    { icon: <Users size={20} />, title: "Human Creative Direction", desc: "Elite marketers guiding A.I. systems to turn creative into consistent, profitable scale." },
    { icon: <Play size={20} />, title: "Andromeda-Ready Formats", desc: "Every asset optimized for Meta's Andromeda algorithm. the right formats, ratios, and hooks to maximize delivery." },
  ];
  return (
    <section id="why" className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 64 }}>
        <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
          <Sparkles size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Why Alchemy</span>
        </BlurReveal>
      </div>
      <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {features.map((f, i) => (
          <BlurReveal key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 28, transition: "border-color 0.3s" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: G.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ color: G.text, fontSize: 18, fontWeight: 600, marginBottom: 10, ...mono }}>{f.title}</h3>
            <p style={{ color: G.textSec, fontSize: 14, lineHeight: 1.7, ...mono }}>{f.desc}</p>
          </BlurReveal>
        ))}
      </div>
    </section>
  );
}

function CreativeExamples() {
  const IMG = "";
  const staticAds = [
    { tag: "Editorial", label: "NYT Wellness", img: `${IMG}/assets/wellness-nyt-BCtGP0C9.png` },
    { tag: "Product", label: "Tech Breakdown", img: `${IMG}/assets/sock-scientific-tech-CtYs3SdE.jpeg` },
    { tag: "Fitness", label: "Influencer UGC", img: `${IMG}/assets/fitness-booty-genie-D4FVfD5c.jpeg` },
    { tag: "Skincare", label: "Product Benefits", img: `${IMG}/assets/tallow-balm-ad-j98A_I8X.jpeg` },
    { tag: "Lifestyle", label: "Sports Focus", img: `${IMG}/assets/golf-ad-BF4ytyZB.jpeg` },
    { tag: "Skincare", label: "Natural Skincare", img: `${IMG}/assets/wonderfat-tallow-DC069gsu.png` },
    { tag: "Product", label: "Before/After", img: `${IMG}/assets/sock-pain-relief-D4Ovgxos.jpeg` },
    { tag: "Lifestyle", label: "Social UGC", img: `${IMG}/assets/ugc-socks-Dvn42rza.jpeg` },
    { tag: "Publishing", label: "Family Product", img: `${IMG}/assets/kids-book-principles--iHkIR3m.jpeg` },
    { tag: "Product", label: "Problem/Solution", img: `${IMG}/assets/archtek-solution-DFwSO3H5.jpeg` },
    { tag: "Product", label: "Feature Bullets", img: `${IMG}/assets/sock-bullets-DD4J3Cjn.jpeg` },
    { tag: "Sports", label: "Focus Training", img: `${IMG}/assets/golf-focus-training-DgZbFf-q.jpeg` },
    { tag: "Home", label: "Luxury Still Life", img: `${IMG}/assets/scent-diffuser-studio-8F9hzFSi.png` },
    { tag: "Skincare", label: "Closeup Product", img: `${IMG}/assets/skincare-closeup-CKKAxIIz.png` },
  ];
  const logos = [
    `${IMG}/assets/bootygenie-official-BrxgbrDk.png`,
    `${IMG}/assets/icebeanie-official-F3fCEkWV.png`,
    `${IMG}/assets/iron-rock-ventures-official-FV2ucI1R.png`,
    `${IMG}/assets/goliath-labs-official-D3iP2L4G.png`,
    `${IMG}/assets/b2b-rocket-official-R758QTZD.png`,
    `${IMG}/assets/freedom-official-D-OAEA_z.png`,
    `${IMG}/assets/alpha-refinery-official-CQAPHvfp.png`,
    `${IMG}/assets/extra-coffee-official-C9bq3K8d.png`,
    `${IMG}/assets/supermouth-official-CCo4819A.png`,
    `${IMG}/assets/titan-scrubs-official-C4lCkVZ-.png`,
    `${IMG}/assets/viapromeds-official-DmO6JvCU.png`,
    `${IMG}/assets/consumer-law-group-official-q61IUExE.png`,
  ];
  const videoIds = ["nnszwpczzp", "5sl3l0l2f5", "43ri1z6u1s", "i19k51tf69", "y87uppwmi8", "7wpl1yvees", "whod3vghce", "ulzz6x8ei4"];
  const ugcIds = ["dyyqvvub9a", "0lt2c05769", "0t4n1rr87z", "3an8fm00wb", "hlfzjjqx3s", "bfta6bfhmv"];
  const sections = [
    { label: "Video Creation", icon: <Video size={16} />, title: "Cinematic", titleGold: "Storytelling", desc: "High production creations that tell your story at a fraction of the cost of a traditional production." },
    { label: "Static Creative", icon: <Image size={16} />, title: "Scroll-Stopping", titleGold: "Static Ads", desc: "High-converting static creatives designed to capture attention and drive action across all paid social platforms." },
    { label: "UGC", icon: <Mic size={16} />, title: "A.I. Powered", titleGold: "UGC", desc: "Lifelike A.I. UGC to give your products an authentic feel, without the typical headache of dealing with creators." },
  ];
  return (
    <section id="creative" className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {sections.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
              <span style={{ color: G.gold }}>{cat.icon}</span>
              <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>{cat.label}</span>
            </BlurReveal>
            <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{`${cat.title} ${cat.titleGold}`}</ScrollBlurText>
            <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, lineHeight: 1.7, maxWidth: 600, margin: "0 auto", ...mono }}>{cat.desc}</BlurReveal>
          </div>
          {ci === 0 && (
            <BlurReveal className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {videoIds.map((vid, i) => (
                <div key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
                  <LazyVideo vid={vid} title="Video Ad" />
                </div>
              ))}
            </BlurReveal>
          )}
          {ci === 1 && (
            <BlurReveal className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {staticAds.slice(0, 12).map((ad, i) => (
                <div key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "relative", paddingBottom: "177.78%", overflow: "hidden" }}>
                    <img src={ad.img} alt={ad.label} loading="lazy" decoding="async" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{ position: "absolute", top: 10, left: 10 }}>
                    <span style={{ padding: "4px 12px", borderRadius: 980, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: G.text, fontSize: 11, fontWeight: 600, ...mono }}>{ad.tag}</span>
                  </div>
                  <div style={{ padding: "12px 14px", borderTop: `1px solid ${G.cardBorder}` }}>
                    <p style={{ color: G.textSec, fontSize: 12, ...mono }}>{ad.label}</p>
                    <p style={{ color: G.textTer, fontSize: 11, ...mono }}>Static Ad Creative</p>
                  </div>
                </div>
              ))}
            </BlurReveal>
          )}
          {ci === 2 && (
            <BlurReveal className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {ugcIds.map((vid, i) => (
                <div key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
                  <LazyVideo vid={vid} title="UGC Ad" />
                </div>
              ))}
            </BlurReveal>
          )}
        </div>
      ))}

      <BlurReveal style={{ marginTop: 40, marginBottom: 40 }}>
        <p style={{ textAlign: "center", color: G.textTer, fontSize: 13, marginBottom: 20, ...mono }}>Trusted by brands we partner with</p>
        <div className="logo-bar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, alignItems: "center", opacity: 0.6 }}>
          {logos.map((l, i) => <img key={i} src={l} alt="Partner logo" loading="lazy" decoding="async" style={{ height: 36, objectFit: "contain", filter: "grayscale(100%) brightness(0.5)" }} />)}
        </div>
      </BlurReveal>
    </section>
  );
}

function AboutUs() {
  return (
    <section className="section-wrap" style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 40 }}>
        <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
          <Users size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>About Us</span>
        </BlurReveal>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 24, justifyContent: "center" }}>{"Founders. Operators. Creatives."}</ScrollBlurText>
      </div>
      <BlurReveal className="card-padded-lg" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 40 }}>
        <p className="desc-text" style={{ color: G.textSec, fontSize: 16, lineHeight: 1.9, marginBottom: 20, ...mono }}>We started over 11 years ago as founders, not marketers - building our own products and learning the hard way how to get them in front of the right people. What began as a necessity became a system.</p>
        <p className="desc-text" style={{ color: G.textSec, fontSize: 16, lineHeight: 1.9, marginBottom: 20, ...mono }}>Through years of testing and scaling our own businesses, we generated eight figures in revenue and developed repeatable creative principles that work across industries.</p>
        <p className="desc-text" style={{ color: G.textSec, fontSize: 16, lineHeight: 1.9, marginBottom: 32, ...mono }}>Today, Alchemy is an AI-first performance creative agency. We blend machine intelligence with human strategy to produce high-volume, high-performing video ads - engineered to scale without losing the human element. We don't chase trends. We build creative systems that convert.</p>

        <h3 style={{ color: G.gold, fontSize: 18, fontWeight: 600, marginBottom: 16, ...mono }}>How Our AI Is Different</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {["Generates distinct concepts, not cosmetic variations", "Learns from performance data, not subjective taste", "Directed by humans who understand how buyers decide"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Check size={16} style={{ color: G.gold, flexShrink: 0 }} />
              <p style={{ color: G.textSec, fontSize: 15, ...mono }}>{item}</p>
            </div>
          ))}
        </div>
      </BlurReveal>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Brand Intelligence", items: ["Map your brand & offer", "Identify buying triggers", "Build creative operating system"] },
    { title: "Concept Engineering", items: ["Pain, desire, proof angles", "Real concepts, not templates", "Multiple hooks per message"] },
    { title: "AI-Driven Production", items: ["High-volume output", "Multiple formats & styles", "Speed traditional teams can't match"] },
    { title: "Performance Loop", items: ["Winners scaled fast", "Losers killed faster", "Creative evolves continuously"] },
  ];
  return (
    <section id="how" className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 64 }}>
        <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
          <Zap size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Work with us</span>
        </BlurReveal>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"How Alchemy Works"}</ScrollBlurText>
        <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, ...mono }}>A system that compounds. Not a one-time campaign.</BlurReveal>
      </div>
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {steps.map((s, i) => (
          <BlurReveal key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 28, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontSize: 14, fontWeight: 700, ...mono }}>{i + 1}</div>
              {i < 3 && <ArrowRight className="step-arrow" size={14} style={{ color: G.textTer, position: "absolute", right: -14, top: 36, zIndex: 2 }} />}
            </div>
            <h3 style={{ color: G.text, fontSize: 16, fontWeight: 600, marginBottom: 16, ...mono }}>{s.title}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: G.gold, fontSize: 13, marginTop: 2 }}>→</span>
                  <p style={{ color: G.textSec, fontSize: 13, lineHeight: 1.5, ...mono }}>{item}</p>
                </div>
              ))}
            </div>
          </BlurReveal>
        ))}
      </div>
      <BlurReveal as="p" style={{ textAlign: "center", color: G.gold, fontSize: 16, marginTop: 32, fontWeight: 500, ...mono }}>Your creative learns faster → Meta learns faster.</BlurReveal>
    </section>
  );
}

function SystemBehind() {
  const points = [
    { title: "Asset-level evaluation", desc: "Platforms judge each creative individually" },
    { title: "Cluster suppression", desc: "Similar ads compete against themselves" },
    { title: "Signal clarity wins", desc: "Differentiated messages match intent" },
    { title: "Diversity compounds", desc: "More angles = faster learning" },
  ];
  return (
    <section className="section-wrap" style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 48 }}>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 38, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"The System Behind the Results"}</ScrollBlurText>
        <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, ...mono }}>Media buying didn't break. <span style={{ color: G.gold }}>Creative supply did.</span></BlurReveal>
      </div>
      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {points.map((p, i) => (
          <BlurReveal key={i} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 12, padding: 24 }}>
            <h4 style={{ color: G.text, fontSize: 15, fontWeight: 600, marginBottom: 6, ...mono }}>{p.title}</h4>
            <p style={{ color: G.textSec, fontSize: 14, ...mono }}>{p.desc}</p>
          </BlurReveal>
        ))}
      </div>
      <BlurReveal as="p" style={{ textAlign: "center", color: G.gold, fontSize: 15, marginTop: 24, fontWeight: 500, fontStyle: "italic", ...mono }}>Alchemy produces creative diversity that counts - not fake volume.</BlurReveal>
    </section>
  );
}

function ProvenResults() {
  const results = [
    { metric: "Revenue Growth", category: "Skincare & Beauty", detail: "$80K → $340K/mo", timeline: "In 6 months" },
    { metric: "Peak ROAS", category: "Fashion & Apparel", detail: "$0 → $210K revenue", timeline: "In 90 days" },
    { metric: "Scale Achieved", category: "Health & Supplements", detail: "$500K → $1.2M/mo", timeline: "Stable CPA" },
  ];
  return (
    <section id="results" className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 48 }}>
        <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
          <TrendingUp size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Proven Results</span>
        </BlurReveal>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"Real numbers from brands scaling with Alchemy"}</ScrollBlurText>
      </div>
      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {results.map((r, i) => (
          <BlurReveal key={i} className="card-padded" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ color: G.gold, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, ...mono }}>{r.metric}</p>
            <p style={{ color: G.textSec, fontSize: 13, marginBottom: 16, ...mono }}>{r.category}</p>
            <p style={{ color: G.text, fontSize: 24, fontWeight: 700, marginBottom: 8, ...mono }}>{r.detail}</p>
            <p style={{ color: G.textTer, fontSize: 13, ...mono }}>{r.timeline}</p>
          </BlurReveal>
        ))}
      </div>
      <BlurReveal style={{ textAlign: "center", marginTop: 32 }}>
        <a href="#cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, color: G.gold, fontSize: 14, fontWeight: 600, textDecoration: "none", ...mono }}>Get Results Like These <ArrowRight size={14} /></a>
      </BlurReveal>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    { quote: "I honestly don't know where I'd be without the Alchemy Team. When we started working together, I had no consistent income from my business, now we're scaling faster than we ever thought possible. Their marketing strategies are insanely smart, but what really stands out is how much they actually care. Andrew and the Alchemy team has helped us generate over $500k in revenue so far.", name: "Peter D.", role: "Founder", company: "Luxury Landscape Design" },
    { quote: "Working with Andrew (and Alchemy) has been the best business decision I've ever made. His knowledge of marketing and business has helped me achieve things i had spent years on without success. Their honesty and integrity is something I can rely on. Grateful to have them on my team.", name: "Aaron W.", role: "Founder", company: "Media Network" },
    { quote: "The Alchemy Team helped us shape our brand from the ground up. They guided us through our marketing strategy with patience, breaking everything down clearly and helping us make smart decisions. Everything went smoother and faster thanks to them!", name: "Jenniska G.", role: "Founder", company: "Service Business" },
    { quote: "I have interviewed 30 agencies in the last few months. I haven't seen even one of them innovating at 1/10th the rate of the Alchemy team. It is so exciting to watch them build this system and lead the way.", name: "Kathryn B.", role: "Founder", company: "Education Platform" },
  ];
  return (
    <section className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 48 }}>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"What Our Clients Say"}</ScrollBlurText>
        <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, ...mono }}>Real experiences from founders who transformed their businesses with us.</BlurReveal>
      </div>
      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {testimonials.map((t, i) => (
          <BlurReveal key={i} className="card-padded" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>{[...Array(5)].map((_, j) => <Star key={j} size={14} style={{ color: G.gold, fill: G.gold }} />)}</div>
            <p className="testimonial-quote" style={{ color: G.textSec, fontSize: 14, lineHeight: 1.8, marginBottom: 20, fontStyle: "italic", ...mono }}>"{t.quote}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: G.goldSoft, border: `1px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontSize: 16, fontWeight: 700, ...mono }}>{t.name[0]}</div>
              <div>
                <p style={{ color: G.text, fontSize: 14, fontWeight: 600, ...mono }}>{t.name}</p>
                <p style={{ color: G.textTer, fontSize: 12, ...mono }}>{t.role} · {t.company}</p>
              </div>
            </div>
          </BlurReveal>
        ))}
      </div>
    </section>
  );
}

function CaseStudies() {
  const cases = [
    { category: "Lifestyle", title: "Education Empire", type: "Online Learning Platform", challenge: "Inconsistent revenue with major seasonal dips, struggling to maintain growth.", solution: "Strategic content deployment with consistent posting schedule to build brand awareness.", results: [{ label: "Peak Revenue", value: "$150K", sub: "in final month" }, { label: "Growth Rate", value: "375%", sub: "from lowest point" }] },
    { category: "Tech & Electronics", title: "Music Breakthrough", type: "Audio Tech Company", challenge: "Flat growth plateau at $20K monthly despite strong product-market fit.", solution: "Targeted content strategy with demo-focused posts to drive product awareness.", results: [{ label: "Monthly Revenue", value: "$60K+", sub: "200% sustained" }, { label: "Growth Rate", value: "253%", sub: "from lowest point" }] },
    { category: "Lifestyle & Wellness", title: "Plant Parent Paradise", type: "Indoor Plant Retailer", challenge: "New brand launch with zero market presence and no existing sales channels.", solution: "Community-focused content strategy with engaging posts to build brand awareness from zero.", results: [{ label: "Launch Success", value: "$350K", sub: "peak month" }, { label: "Growth Rate", value: "Exponential", sub: "0 to 6-figures" }] },
  ];
  return (
    <section className="section-wrap" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 48 }}>
        <BlurReveal style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 20 }}>
          <Check size={14} style={{ color: G.gold }} />
          <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Verified Success Stories</span>
        </BlurReveal>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"Real Results From Real Clients"}</ScrollBlurText>
        <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, maxWidth: 600, margin: "0 auto", ...mono }}>Founders just like you who trust us to help them scale in the fast moving, hyper-competitive social media landscape.</BlurReveal>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {cases.map((c, i) => (
          <BlurReveal key={i} className="card-padded-lg" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <span style={{ color: G.gold, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", ...mono }}>{c.category}</span>
                <h3 style={{ color: G.text, fontSize: 24, fontWeight: 700, marginTop: 4, ...mono }}>{c.title}</h3>
                <p style={{ color: G.textTer, fontSize: 14, ...mono }}>{c.type}</p>
              </div>
            </div>
            <div className="case-inner-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ padding: 20, background: G.bg, borderRadius: 12, border: `1px solid ${G.border}` }}>
                <p style={{ color: G.danger, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, ...mono }}>Challenge</p>
                <p style={{ color: G.textSec, fontSize: 14, lineHeight: 1.6, ...mono }}>{c.challenge}</p>
              </div>
              <div style={{ padding: 20, background: G.bg, borderRadius: 12, border: `1px solid ${G.border}` }}>
                <p style={{ color: G.success, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, ...mono }}>Solution</p>
                <p style={{ color: G.textSec, fontSize: 14, lineHeight: 1.6, ...mono }}>{c.solution}</p>
              </div>
            </div>
            <div className="results-flex" style={{ display: "flex", gap: 20 }}>
              {c.results.map((r, j) => (
                <div key={j} style={{ flex: 1, padding: 20, background: G.goldSoft, borderRadius: 12, border: `1px solid ${G.goldBorder}` }}>
                  <p style={{ color: G.textSec, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, ...mono }}>{r.label}</p>
                  <p style={{ color: G.gold, fontSize: 28, fontWeight: 700, marginBottom: 4, ...mono }}>{r.value}</p>
                  <p style={{ color: G.textTer, fontSize: 12, ...mono }}>{r.sub}</p>
                </div>
              ))}
            </div>
          </BlurReveal>
        ))}
      </div>
    </section>
  );
}

function IsThisForYou() {
  const forYou = [
    "You are actively spending on Meta and want predictable scale",
    "You are dealing with creative fatigue and diminishing returns",
    "You know you need more ads, not just better headlines",
    "Your internal team or agency cannot produce fast enough",
    "You understand performance lives and dies by creative now",
  ];
  const notForYou = [
    "You're looking for a single \"viral ad\" or quick hack",
    "You're not actively running paid media campaigns",
    "You expect overnight results without testing",
    "You're not ready to invest in creative as a growth lever",
  ];
  return (
    <section className="section-wrap" style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div className="section-header" style={{ textAlign: "center", marginBottom: 48 }}>
        <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"Is This For You?"}</ScrollBlurText>
        <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, ...mono }}>Alchemy is for brands that take <span style={{ color: G.text, fontWeight: 600 }}>paid media seriously.</span></BlurReveal>
      </div>
      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <BlurReveal className="card-padded" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 32 }}>
          <h3 style={{ color: G.success, fontSize: 16, fontWeight: 600, marginBottom: 20, ...mono }}>This is for you if:</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {forYou.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Check size={16} style={{ color: G.success, flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: G.textSec, fontSize: 14, lineHeight: 1.5, ...mono }}>{item}</p>
              </div>
            ))}
          </div>
        </BlurReveal>
        <BlurReveal className="card-padded" style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, padding: 32 }}>
          <h3 style={{ color: G.danger, fontSize: 16, fontWeight: 600, marginBottom: 20, ...mono }}>Not for you if:</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {notForYou.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <X size={16} style={{ color: G.danger, flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: G.textSec, fontSize: 14, lineHeight: 1.5, ...mono }}>{item}</p>
              </div>
            ))}
          </div>
        </BlurReveal>
      </div>
      <BlurReveal as="p" style={{ textAlign: "center", color: G.textTer, fontSize: 14, marginTop: 24, fontStyle: "italic", ...mono }}>"We'd rather be honest upfront than waste your time."</BlurReveal>
      <BlurReveal style={{ textAlign: "center", marginTop: 16 }}>
        <a href="#cta" style={{ color: G.gold, fontSize: 15, fontWeight: 600, textDecoration: "none", ...mono }}>Sound like you? Let's talk →</a>
      </BlurReveal>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="section-wrap" style={{ padding: "80px 24px 60px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
      <ScrollBlurText as="h2" className="section-title" style={{ ...hd, fontSize: 42, color: G.text, marginBottom: 12, justifyContent: "center" }}>{"Ready to fix your creative bottleneck?"}</ScrollBlurText>
      <BlurReveal style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 32, marginTop: 16 }}>
        <span style={{ color: G.textTer, fontSize: 13, ...mono }}>Free creative audit</span>
        <span style={{ color: G.textTer }}>•</span>
        <span style={{ color: G.textTer, fontSize: 13, ...mono }}>No obligation</span>
        <span style={{ color: G.textTer }}>•</span>
        <span style={{ color: G.textTer, fontSize: 13, ...mono }}>Friendly team</span>
      </BlurReveal>
      <BlurReveal as="p" style={{ color: G.textSec, fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 32px", ...mono }}>We'll review your current creative, diagnose the bottleneck, and show you exactly how we'd fix it.</BlurReveal>
      <BlurReveal style={{ background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, overflow: "hidden", maxWidth: 700, margin: "0 auto" }}>
        <iframe src="https://calendly.com/corinne-theoasis/alchemy-a-i-performance-creatives?hide_gdpr_banner=1&background_color=ffffff&text_color=1d1d1f&primary_color=000000" style={{ width: "100%", height: 700, border: "none" }} title="Book a Call" />
      </BlurReveal>
    </section>
  );
}

function Footer() {
  return (
    <BlurReveal as="footer" className="footer-wrap" style={{ borderTop: `1px solid ${G.border}`, padding: "40px 24px", maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ color: G.textSec, fontSize: 13, ...mono }}>About Us</p>
        <a href="mailto:team@scalewithalchemy.com" style={{ color: G.textTer, fontSize: 13, textDecoration: "none", ...mono }}>team@scalewithalchemy.com</a>
      </div>
      <p style={{ color: G.textTer, fontSize: 12, ...mono }}>Email</p>
      <p style={{ color: G.textTer, fontSize: 12, ...mono }}>&copy; 2026 Alchemy</p>
    </BlurReveal>
  );
}

export default function AlchemyLanding() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", ...mono }}>
      <style>{fonts}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${G.bg}; color: ${G.text}; }
        ::selection { background: ${G.gold}30; color: ${G.text}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .mobile-break { display: none; }
        @media (max-width: 768px) {
          .mobile-break { display: block !important; }
        }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: block !important; }

          /* Hero */
          .hero-section { min-height: auto !important; padding: 100px 16px 48px !important; }
          .hero-title { font-size: 38px !important; line-height: 1.15 !important; }
          .hero-subtitle { font-size: 20px !important; white-space: normal !important; }
          .hero-body { font-size: 15px !important; max-width: 100% !important; }
          .hero-cta { padding: 14px 28px !important; font-size: 15px !important; width: 100% !important; justify-content: center !important; }
          .hero-circle { width: 360px !important; height: 360px !important; }

          /* Section titles & spacing */
          .section-title { font-size: 30px !important; }
          .section-wrap { padding-top: 48px !important; padding-bottom: 48px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .section-header { margin-bottom: 32px !important; }

          /* Grids */
          .stats-grid { flex-direction: column !important; gap: 0 !important; }
          .stats-grid > div { padding: 20px !important; }
          .stat-value { font-size: 36px !important; }
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .grid-3 { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .case-inner-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .results-flex { flex-direction: column !important; }

          /* Cards */
          .card-padded { padding: 16px !important; }
          .card-padded-lg { padding: 20px !important; }

          /* Testimonials */
          .testimonial-quote { font-size: 14px !important; line-height: 1.7 !important; }

          /* Logos */
          .logo-bar img { height: 24px !important; }
          .logo-bar { gap: 12px !important; }

          /* HowItWorks arrows */
          .step-arrow { display: none !important; }

          /* Body text boost */
          .body-text { font-size: 15px !important; }
          .desc-text { font-size: 15px !important; line-height: 1.7 !important; }

          /* Footer */
          .footer-wrap { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 32px !important; line-height: 1.15 !important; }
          .hero-subtitle { font-size: 18px !important; white-space: normal !important; }
          .section-title { font-size: 26px !important; }
          .grid-4 { grid-template-columns: 1fr !important; }
          .stat-value { font-size: 32px !important; }
        }
      `}</style>
      <Nav />
      <Hero />
      <Stats />
      <WhyAlchemy />
      <CreativeExamples />
      <AboutUs />
      <HowItWorks />
      <SystemBehind />
      <ProvenResults />
      <Testimonials />
      <CaseStudies />
      <IsThisForYou />
      <CTA />
      <Footer />
    </div>
  );
}
