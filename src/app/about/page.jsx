"use client";
import { useState, useEffect } from "react";

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedRole, setSelectedRole] = useState("backend");
  const [hoveredFeature, setHoveredFeature] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  const team = {
    backend: {
      name: "Vishnu Gupta",
      role: "Backend Engineer",
      initials: "VG",
      color: "#6EE7B7",
      image: "/vishnu.png",
      description: "Architects the core WebRTC infrastructure and session management. Focused on systems that are fast, invisible, and reliable under pressure.",
      linkedin: "https://linkedin.com/in/vishnugupta0611",
      github: "https://github.com/vishnugupta0611",
      portfolio: "https://vishnugupta0611.vercel.app",
    },
    frontend: {
      name: "Aria Patel",
      role: "Frontend Engineer",
      initials: "AP",
      color: "#A78BFA",
      description: "Builds interfaces that feel effortless. Bridges the gap between design intent and engineering reality — pixel by pixel.",
      linkedin: "https://linkedin.com",
      github: "https://github.com",
      portfolio: "https://ariapatel.dev",
    },
    design: {
      name: "Jordan Blake",
      role: "UI/UX Designer",
      initials: "JB",
      color: "#FCA5A5",
      description: "Shapes the product's personality. Every flow, every screen, every micro-interaction is a deliberate decision toward clarity.",
      linkedin: "https://linkedin.com",
      github: "https://github.com",
      portfolio: "https://jordanblake.design",
    },
    testing: {
      name: "Casey Morgan",
      role: "QA Engineer",
      initials: "CM",
      color: "#FDE68A",
      description: "Breaks things before users do. Thinks adversarially so the product holds up in every browser, on every network.",
      linkedin: "https://linkedin.com",
      github: "https://github.com",
      portfolio: "https://caseymorgan.dev",
    },
  };

  const roles = [
    { key: "backend", label: "Backend" },
    { key: "frontend", label: "Frontend" },
    { key: "design", label: "Design" },
    { key: "testing", label: "QA" },
  ];

  const features = [
    { id: 1, label: "P2P Transfer", detail: "Files move directly between browsers via WebRTC. No server ever sees your data." },
    { id: 2, label: "Instant Sessions", detail: "Six characters. No login. Share in under three seconds from any device." },
    { id: 3, label: "QR Connect", detail: "Scan and join. Built for the moment you're both in the same room." },
    { id: 4, label: "Live Streaming", detail: "Chunked real-time transfer. Download starts before upload finishes." },
    { id: 5, label: "Zero Storage", detail: "Sessions expire. Files vanish. There is no database of your content." },
  ];

  const p = team[selectedRole];

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0a;
          --s1: #121212;
          --s2: #1a1a1a;
          --bd: rgba(255,255,255,0.07);
          --bd2: rgba(255,255,255,0.13);
          --text: #f5f5f5;
          --text-muted: #a0a0a0;
          --accent: #6EE7B7;
          --accent-secondary: #A78BFA;
          --dim: #2a2a2a;
          --sora: 'Sora', sans-serif;
          --serif: 'Instrument Serif', Georgia, serif;
        }

        html { scroll-behavior: smooth; }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--sora);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .fu1 { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .fu2 { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        .fu3 { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) 0.32s both; }
        .fu4 { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) 0.46s both; }
        .card-anim { animation: cardIn 0.32s cubic-bezier(0.16,1,0.3,1) both; }

        /* ── WRAPPER ── */
        .wrap {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 40px;
        }
        @media(max-width:600px){ .wrap{ padding: 0 20px; } }

        hr.rule {
          border: none;
          border-top: 1px solid var(--bd);
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 40px;
          box-sizing: content-box;
        }

        /* ── HERO ── */
        .hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: end;
          padding: 160px 40px 120px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media(max-width:800px){
          .hero { grid-template-columns:1fr; gap:52px; padding:100px 20px 80px; }
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 28px;
        }
        .eyebrow::before {
          content: '';
          width: 20px; height: 1px;
          background: var(--accent);
          flex-shrink: 0;
        }

        .hero-title {
          font-family: var(--serif);
          font-size: clamp(48px, 7vw, 88px);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.028em;
          color: var(--text);
        }
        .hero-title em {
          font-style: italic;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 17px;
          line-height: 2;
          color: var(--text-muted);
          font-weight: 300;
          margin-bottom: 48px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: var(--bd);
          gap: 1px;
          border: 1px solid var(--bd);
        }
        .stat {
          background: var(--bg);
          padding: 22px 16px;
          text-align: center;
        }
        .stat-n {
          font-family: var(--serif);
          font-size: 36px;
          color: var(--accent);
          line-height: 1;
        }
        .stat-l {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-top: 10px;
        }

        /* ── SECTION ── */
        .section { padding: 120px 40px; max-width: 1100px; margin: 0 auto; }
        @media(max-width:600px){ .section{ padding: 80px 20px; } }

        .sec-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 16px;
        }
        .sec-title {
          font-family: var(--serif);
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 400;
          letter-spacing: -0.025em;
          color: var(--text);
          margin-bottom: 64px;
          line-height: 1.1;
        }

        /* ── TEAM ── */
        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }
        .tab {
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          font-family: var(--sora);
          letter-spacing: 0.025em;
          border: 1px solid var(--bd);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .tab:hover { 
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(255,255,255,0.02);
        }
        .tab.on { 
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
          border-color: var(--accent);
          color: var(--bg);
          font-weight: 600;
        }

        .tcard {
          display: grid;
          grid-template-columns: 1fr;
          border: 1px solid var(--bd);
          background: var(--s1);
          overflow: hidden;
          border-radius: 12px;
        }
        @media(max-width:900px){
          .tcard { grid-template-columns: 1fr; }
        }
        @media(max-width:600px){
          .tcard { grid-template-columns: 1fr; }
          .tcard-l { border-right: none !important; border-bottom: 1px solid var(--bd); }
          .idx { display: none !important; }
        }

        .tcard-l {
          padding: 60px 56px;
          border-right: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 32px;
          background: linear-gradient(135deg, var(--s1) 0%, rgba(255,255,255,0.02) 100%);
        }
        @media(max-width:900px){ .tcard-l{ padding: 48px 40px; gap: 28px; } }
        @media(max-width:600px){ .tcard-l{ padding: 36px 28px; gap: 24px; } }

        .avi {
          width: 240px; height: 240px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--serif);
          font-size: 48px;
          letter-spacing: 0.01em;
          flex-shrink: 0;
          border: 2px solid var(--accent);
          object-fit: cover;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        @media(max-width:900px){ .avi{ width: 180px; height: 180px; font-size: 36px; } }
        @media(max-width:600px){ .avi{ width: 140px; height: 140px; font-size: 28px; } }
        .m-name {
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--text);
          line-height: 1.2;
        }
        .m-role {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          margin-top: 2px;
        }
        @media(max-width:600px){ .m-name{ font-size: 24px; } }
        .m-links { margin-top: 4px; width: 100%; display: flex; flex-direction: column; gap: 1px; }
        .m-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 0;
          border-bottom: 1px solid var(--bd);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.25s;
        }
        .m-link:last-child { border-bottom: none; }
        .m-link:hover { color: var(--accent); }

        .tcard-r {
          padding: 56px 60px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 40px;
          background: rgba(16, 16, 16, 0.3);
        }
        @media(max-width:900px){ .tcard-r{ padding: 40px 48px; gap: 36px; } }
        @media(max-width:600px){ .tcard-r{ padding: 32px 28px; gap: 32px; } }

        .m-desc {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-muted);
          font-weight: 300;
          max-width: 560px;
          letter-spacing: 0.005em;
        }
        @media(max-width:600px){ .m-desc{ font-size: 14px; line-height: 1.7; } }
        .idx {
          font-family: var(--serif);
          font-size: 72px;
          color: var(--dim);
          line-height: 1;
          text-align: center;
          margin-top: auto;
          padding-top: 32px;
          border-top: 1px solid var(--bd);
          font-weight: 300;
        }
        @media(max-width:600px){ .idx{ font-size: 48px; } }

        /* ── FEATURES ── */
        .feat-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
          background: var(--bd);
          border: 1px solid var(--bd);
          border-radius: 12px;
          overflow: hidden;
        }
        @media(max-width:900px){ .feat-grid{ grid-template-columns: repeat(3,1fr); } }
        @media(max-width:560px){ .feat-grid{ grid-template-columns: 1fr 1fr; } }

        .feat {
          background: var(--s1);
          padding: 40px 32px;
          min-height: 240px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: all 0.3s ease;
          border-radius: 0;
        }
        .feat:hover { 
          background: linear-gradient(135deg, var(--s1) 0%, rgba(255,255,255,0.04) 100%);
        }

        .feat-n {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 24px;
        }
        .feat-t {
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 400;
          color: var(--text);
          line-height: 1.3;
          margin-bottom: 16px;
          letter-spacing: -0.015em;
        }
        .feat-d {
          font-size: 13px;
          line-height: 1.75;
          color: var(--text-muted);
          font-weight: 300;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.28s ease, transform 0.28s ease;
          letter-spacing: 0.005em;
        }
        .feat:hover .feat-d { opacity: 1; transform: translateY(0); }

        .feat-bar {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          width: 0;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-secondary) 100%);
          transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .feat:hover .feat-bar { width: 100%; }

        /* ── PHILOSOPHY ── */
        .phil-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 96px;
          align-items: center;
          border: 1px solid var(--bd);
          background: linear-gradient(135deg, var(--s1) 0%, rgba(255,255,255,0.01) 100%);
          padding: 80px 80px;
          border-radius: 12px;
        }
        @media(max-width:780px){
          .phil-inner { grid-template-columns: 1fr; gap: 48px; padding: 52px 40px; }
        }
        @media(max-width:600px){ .phil-inner{ padding: 40px 28px; gap: 40px; } }

        .phil-q {
          font-family: var(--serif);
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 400;
          font-style: italic;
          line-height: 1.3;
          letter-spacing: -0.025em;
          color: var(--text);
        }
        .phil-q span { color: var(--accent); opacity: 0.6; }

        .phil-b {
          font-size: 15px;
          line-height: 1.85;
          color: var(--text-muted);
          font-weight: 300;
          letter-spacing: 0.005em;
        }
        .phil-a {
          margin-top: 32px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent);
        }

        /* ── FOOTER ── */
        .footer {
          border-top: 1px solid var(--bd);
          padding: 40px 40px;
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }
        @media(max-width:600px){ .footer{ padding: 28px 20px; flex-direction:column; align-items:flex-start; gap: 16px; } }

        .footer-brand {
          font-family: var(--serif);
          font-size: 16px;
          color: var(--text-muted);
        }

        /* ── ARROW SVG ── */
        .arr { opacity: 0.35; transition: opacity 0.25s ease; }
        .m-link:hover .arr { opacity: 1; }
      `}</style>

      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

        {/* HERO */}
        <section className="hero">
          <div>
            <p className="eyebrow fu1">About</p>
            <h1 className="hero-title fu2">
              Built to share.<br />
              <em>Nothing more.</em>
            </h1>
          </div>
          <div className="fu3">
            <p className="hero-desc">
              We're four engineers and a designer who got tired of file-sharing tools that asked too much. No sign-ups, no servers holding your data — just a direct line between two people.
            </p>
            <div className="stats-row">
              <div className="stat">
                <div className="stat-n">4</div>
                <div className="stat-l">People</div>
              </div>
              <div className="stat">
                <div className="stat-n">0</div>
                <div className="stat-l">Data stored</div>
              </div>
              <div className="stat">
                <div className="stat-n">&lt;3s</div>
                <div className="stat-l">To connect</div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: "1px", background: "var(--bd)", maxWidth: "1100px", margin: "0 auto" }}></div>

        {/* TEAM */}
        <div className="section fu4">
          <p className="sec-label">The team</p>
          <h2 className="sec-title">Who made this</h2>

          <div className="tabs">
            {roles.map(r => (
              <button key={r.key} className={`tab${selectedRole === r.key ? " on" : ""}`} onClick={() => setSelectedRole(r.key)}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="tcard card-anim" key={selectedRole}>
            <div className="tcard-l">
              {p.image ? (
                <img src={p.image} alt={p.name} className="avi" style={{ border: `2px solid ${p.color}40` }} />
              ) : (
                <div className="avi" style={{ background: p.color + "15", color: p.color, border: `1px solid ${p.color}28` }}>
                  {p.initials}
                </div>
              )}
              <div>
                <div className="m-name">{p.name}</div>
                <div className="m-role">{p.role}</div>
              </div>
              <div style={{ width: "100%", height: "1px", background: "var(--bd)" }}></div>
              <div className="m-links">
                {[["Portfolio", p.portfolio], ["GitHub", p.github], ["LinkedIn", p.linkedin]].map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="m-link">
                    {label}
                    <svg className="arr" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            <div className="tcard-r">
              <p className="m-desc">{p.description}</p>
              <div className="idx">0{roles.findIndex(r => r.key === selectedRole) + 1}</div>
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--bd)", maxWidth: "1100px", margin: "0 auto" }}></div>

        {/* WHAT WE BUILT */}
        <div className="section">
          <p className="sec-label">Product</p>
          <h2 className="sec-title">What we built</h2>

          <div className="feat-grid">
            {features.map(f => (
              <div key={f.id} className="feat" onMouseEnter={() => setHoveredFeature(f.id)} onMouseLeave={() => setHoveredFeature(null)}>
                <span className="feat-n">0{f.id}</span>
                <span className="feat-t">{f.label}</span>
                <span className="feat-d">{f.detail}</span>
                <div className="feat-bar"></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--bd)", maxWidth: "1100px", margin: "0 auto" }}></div>

        {/* PHILOSOPHY */}
        <div className="section">
          <div className="phil-inner">
            <div>
              <p className="sec-label" style={{ marginBottom: "28px" }}>Philosophy</p>
              <blockquote className="phil-q">
                <span>"</span>The best tool is the one you never have to think about.<span>"</span>
              </blockquote>
            </div>
            <div>
              <p className="phil-b">
                Every decision we make traces back to one question: does this get out of the way?<br /><br />
                We don't add features because we can. We build for the moment — the file you want to send right now, to the person in front of you, without friction.
              </p>
              <p className="phil-a">— SendAnything, 2024</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--bd)" }}>
          <div className="footer">
            <span className="footer-brand">SendAnything</span>
          </div>
        </footer>

      </div>
    </>
  );
}