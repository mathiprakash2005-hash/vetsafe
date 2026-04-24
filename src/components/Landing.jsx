import React, { useState, useEffect, useRef } from "react";
import "./Landing.css";
import { useNavigate } from "react-router-dom";

/* ─── Animated counter hook ─── */
function useCounter(target, duration = 2000, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Data ─── */
const features = [
  { icon: "💊", title: "Antibiotic Tracking",   desc: "Log every treatment with dosage, drug name, and withdrawal period automatically calculated.",  accent: "#00D4F5" },
  { icon: "⏱️", title: "Withdrawal Countdown",  desc: "Real-time alerts when animals are still in withdrawal — never risk an MRL violation again.",   accent: "#1E90FF" },
  { icon: "📋", title: "Digital Prescriptions", desc: "Vets issue prescriptions digitally. Farmers receive and act on them instantly.",                accent: "#00E5FF" },
  { icon: "🔍", title: "Buyer Verification",    desc: "Buyers scan a QR code to verify food safety compliance before purchase.",                       accent: "#29B6F6" },
  { icon: "🤖", title: "AI VetBot",             desc: "24/7 AI assistant for disease symptoms, drug guidance, and biosecurity advice.",                 accent: "#0288D1" },
  { icon: "📊", title: "Health Analytics",      desc: "Track treatment history, disease trends, and herd health over time.",                           accent: "#26C6DA" },
];

const steps = [
  { num: "01", icon: "📝", title: "Log Treatment",    desc: "Farmer records antibiotic usage, dosage, and animal details after each treatment." },
  { num: "02", icon: "🩺", title: "Vet Approves",     desc: "Licensed veterinarians review and digitally approve treatment prescriptions." },
  { num: "03", icon: "⏳", title: "Track Withdrawal", desc: "System automatically counts down withdrawal days and sends real-time alerts." },
  { num: "04", icon: "✅", title: "Buyer Verifies",   desc: "Buyers scan QR code to confirm the animal is cleared and safe for sale." },
];

const roles = [
  {
    icon: "👨‍🌾", title: "Farmer", color: "#0A9EBF",
    desc: "Manage your flock, log treatments, track withdrawal periods, and generate safety certificates.",
    actions: ["Log treatments & dosages", "View withdrawal countdown", "Request vet consultation", "Generate safety certificates"],
    loginPath: "/farmer-login", registerPath: "/farmer-register",
  },
  {
    icon: "🩺", title: "Veterinarian", color: "#1565C0",
    desc: "Issue digital prescriptions, review consultation requests, and monitor patient animals remotely.",
    actions: ["Issue digital prescriptions", "Approve / reject requests", "View full patient history", "Monitor MRL compliance"],
    loginPath: "/doctor-login", registerPath: "/doctor-register",
  },
  {
    icon: "🧑‍💼", title: "Buyer / Client", color: "#00D4F5",
    desc: "Verify food safety compliance instantly by scanning the animal's QR code before purchase.",
    actions: ["Scan QR codes instantly", "View full treatment history", "Check withdrawal clearance", "Download safety reports"],
    loginPath: "/buyer-login", registerPath: "/buyer-register",
  },
];

const testimonials = [
  { name: "Rajan Kumar",    role: "Poultry Farmer, Tamil Nadu", text: "VetSafe Tracker changed how I manage my flock. Withdrawal tracking alone saved me from a costly MRL violation.", avatar: "👨‍🌾" },
  { name: "Dr. Priya Nair", role: "Veterinarian, Kerala",       text: "Issuing digital prescriptions is seamless. I can monitor all my patients remotely and respond faster than ever.", avatar: "👩‍⚕️" },
  { name: "Suresh Babu",   role: "Poultry Buyer, Chennai",     text: "I can verify food safety with a single QR scan. It gives me complete confidence in every purchase I make.", avatar: "🧑‍💼" },
];

/* ─── Particle config ─── */
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: `${Math.random() * 100}%`,
  dur: `${7 + Math.random() * 10}s`,
  delay: `${Math.random() * 10}s`,
}));

/* ─── Component ─── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsRef, statsInView] = useInView();

  const farmers    = useCounter(1200, 2000, statsInView);
  const vets       = useCounter(340,  2000, statsInView);
  const animals    = useCounter(8500, 2200, statsInView);
  const compliance = useCounter(100,  1800, statsInView);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="lp-root">

      {/* ═══════ NAVBAR ═══════ */}
      <nav className={`lp-nav ${scrolled ? "lp-nav--scrolled" : ""}`}>
        <div
          className="lp-nav__brand"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="lp-nav__logo">🐔</div>
          VetSafe <strong style={{ marginLeft: 4 }}>Tracker</strong>
        </div>

        <div className="lp-nav__links" style={menuOpen ? {
          display: "flex", flexDirection: "column", position: "fixed",
          top: 70, left: 0, right: 0, padding: "24px 5%",
          background: "rgba(2,11,24,0.97)", backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(0,212,245,0.12)", gap: 8, zIndex: 999,
        } : {}}>
          <a onClick={() => scrollTo("lp-features")}>Features</a>
          <a onClick={() => scrollTo("lp-how")}>How It Works</a>
          <a onClick={() => scrollTo("lp-roles")}>Roles</a>
          <a className="lp-nav__cta" onClick={() => scrollTo("lp-roles")}>Get Started →</a>
        </div>

        <button
          className="lp-nav__burger"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="lp-hero">
        <div className="lp-hero__mesh" />
        <div className="lp-hero__orb lp-hero__orb--1" />
        <div className="lp-hero__orb lp-hero__orb--2" />
        <div className="lp-hero__orb lp-hero__orb--3" />

        {/* Particles */}
        <div className="lp-hero__particles">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="lp-particle"
              style={{ "--x": p.x, "--dur": p.dur, "--delay": p.delay }}
            />
          ))}
        </div>

        {/* Left column */}
        <div className="lp-hero__left">
          <div className="lp-hero__pill">
            <span className="lp-pill__dot" />
            🛡️ Trusted Livestock Safety Platform
          </div>

          <h1 className="lp-hero__title">
            Smart Livestock
            <span className="lp-hero__grad">Treatment Tracking</span>
            <span className="lp-hero__title-dim">From Farm to Table</span>
          </h1>

          <p className="lp-hero__sub">
            Connect farmers, veterinarians, and buyers through transparent
            antibiotic tracking, digital prescriptions, and real-time withdrawal
            monitoring — ensuring food safety at every step.
          </p>

          <div className="lp-hero__actions">
            <button className="lp-btn--primary" onClick={() => scrollTo("lp-roles")}>
              🚀 Get Started Free
            </button>
            <button className="lp-btn--ghost" onClick={() => scrollTo("lp-how")}>
              ▶ See How It Works
            </button>
          </div>

          <div className="lp-hero__trust">
            {["MRL Compliant", "FSSAI Aligned", "AI Powered"].map((t) => (
              <div className="lp-trust-item" key={t}>
                <span className="lp-trust-dot" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right – dashboard */}
        <div className="lp-hero__right">
          <div className="lp-hero__float lp-hero__float--2">
            <span className="lp-float-dot" />
            1,200+ Farmers Active
          </div>

          <div className="lp-hero__mockup">
            <div className="lp-mockup__header">
              <div className="lp-mockup__dots">
                <span /><span /><span />
              </div>
              <span className="lp-mockup__title">VetSafe Dashboard</span>
            </div>
            <div className="lp-mockup__body">
              <div className="lp-noti lp-noti--warn">
                <span>⚠️</span>
                <div><b>Withdrawal Active</b><p>Chicken #A204 — 3 days remaining</p></div>
              </div>
              <div className="lp-noti lp-noti--success">
                <span>✅</span>
                <div><b>Prescription Approved</b><p>Dr. Rajan — Amoxicillin 250mg</p></div>
              </div>
              <div className="lp-noti lp-noti--info">
                <span>🔍</span>
                <div><b>Buyer Verified</b><p>Batch #B12 — Safe to purchase</p></div>
              </div>
              <div className="lp-noti lp-noti--purple">
                <span>🤖</span>
                <div><b>VetBot Alert</b><p>Newcastle disease risk detected</p></div>
              </div>
            </div>
          </div>

          <div className="lp-hero__float lp-hero__float--1">
            <span className="lp-float-dot" />
            8,500+ Animals Tracked
          </div>
        </div>
      </section>

      {/* ═══════ STATS ═══════ */}
      <section className="lp-stats" ref={statsRef}>
        <div className="lp-stats__grid">
          {[
            { icon: "👨‍🌾", num: farmers,    suffix: "+", label: "Active Farmers" },
            { icon: "🩺",   num: vets,       suffix: "+", label: "Veterinarians" },
            { icon: "🐔",   num: animals,    suffix: "+", label: "Animals Tracked" },
            { icon: "✅",   num: compliance, suffix: "%", label: "MRL Compliance" },
          ].map((s, i) => (
            <div className="lp-stat" key={i}>
              <span className="lp-stat__icon">{s.icon}</span>
              <div className="lp-stat__num">{s.num.toLocaleString()}{s.suffix}</div>
              <div className="lp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="lp-features" id="lp-features">
        <div className="lp-features__inner">
          <div className="lp-section-head">
            <div className="lp-section-tag">What We Offer</div>
            <h2>Everything for safe<br />livestock management</h2>
            <p>A complete platform built for farmers, vets, and buyers to collaborate on food safety.</p>
          </div>
          <div className="lp-features__grid">
            {features.map((f, i) => (
              <div
                className="lp-feat-card"
                key={i}
                style={{ "--accent": f.accent }}
              >
                <div className="lp-feat-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="lp-how" id="lp-how">
        <div className="lp-how__bg" />
        <div className="lp-how__bg-glow" />
        <div className="lp-how__inner">
          <div className="lp-section-head lp-section-head--light">
            <div className="lp-section-tag lp-section-tag--light">The Process</div>
            <h2>How VetSafe Tracker works</h2>
            <p>Four simple steps from treatment to verified food safety.</p>
          </div>
          <div className="lp-how__steps">
            {steps.map((s, i) => (
              <div className="lp-step" key={i} style={{ position: "relative" }}>
                <div className="lp-step__num-bg">{s.num}</div>
                <div className="lp-step__icon-wrap">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="lp-step__connector">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ROLES ═══════ */}
      <section className="lp-roles" id="lp-roles">
        <div className="lp-roles__inner">
          <div className="lp-section-head centered">
            <div className="lp-section-tag">Get Started</div>
            <h2>Choose your role</h2>
            <p>Tailored dashboards and tools for every stakeholder in the supply chain.</p>
          </div>
          <div className="lp-roles__grid">
            {roles.map((r, i) => (
              <div
                className="lp-role-card"
                key={i}
                style={{ "--role-color": r.color }}
              >
                <div className="lp-role-card__glow" />
                <div className="lp-role-card__icon">{r.icon}</div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <ul className="lp-role-card__list">
                  {r.actions.map((a, j) => (
                    <li key={j}>
                      <span className="lp-check">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>
                <div className="lp-role-card__btns">
                  <button
                    className="lp-role-btn--primary"
                    onClick={() => navigate(r.loginPath)}
                    style={{ background: r.color }}
                  >
                    Login
                  </button>
                  <button
                    className="lp-role-btn--outline"
                    onClick={() => navigate(r.registerPath)}
                  >
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="lp-testimonials">
        <div className="lp-testi__inner">
          <div className="lp-section-head centered">
            <div className="lp-section-tag">What People Say</div>
            <h2>Trusted by farmers,<br />vets &amp; buyers</h2>
          </div>
          <div className="lp-testi__grid">
            {testimonials.map((t, i) => (
              <div className="lp-testi-card" key={i}>
                <span className="lp-testi-card__quote">"</span>
                <p>{t.text}</p>
                <div className="lp-testi-card__author">
                  <span className="lp-testi-card__avatar">{t.avatar}</span>
                  <div>
                    <b>{t.name}</b>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA BANNER ═══════ */}
      <div className="lp-cta-banner">
        <div className="lp-cta-banner__bg" />
        <div className="lp-cta-banner__left">
          <h2>Ready to ensure food safety<br />from farm to table?</h2>
          <p>Join thousands of farmers, vets, and buyers already using VetSafe Tracker.</p>
        </div>
        <div className="lp-cta-banner__right">
          <button className="lp-btn--white" onClick={() => scrollTo("lp-roles")}>
            🚀 Get Started Now — It's Free
          </button>
        </div>
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="lp-footer">
        <div className="lp-footer__brand">
          <div className="lp-nav__logo" style={{ width: 30, height: 30, fontSize: 14 }}>🐔</div>
          VetSafe Tracker
        </div>
        <div className="lp-footer__links">
          <a onClick={() => scrollTo("lp-features")}>Features</a>
          <a onClick={() => scrollTo("lp-how")}>How It Works</a>
          <a onClick={() => scrollTo("lp-roles")}>Get Started</a>
        </div>
        <div className="lp-footer__copy">
          © {new Date().getFullYear()} VetSafe Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  );
}