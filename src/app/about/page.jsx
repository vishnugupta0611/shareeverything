"use client";
import { useState, useEffect } from "react";

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedRole, setSelectedRole] = useState("backend");

  useEffect(() => { setMounted(true); }, []);

  const team = {
    backend: {
      name: "Vishnu Gupta",
      role: "LEAD_BACKEND",
      id: "01",
      bio: "Engineered the WebRTC signaling mesh. Focused on zero-latency data tunnels and peer-to-peer security architecture. Architected the live session management layer powering real-time text collaboration.",
      skills: ["WebRTC", "Node.js", "Redis", "Socket.IO"],
      link: "https://vishnugupta0611.vercel.app",
      github: "https://github.com/vishnugupta0611",
      linkedin: "https://linkedin.com/in/vishnugupta0611",
    },
    frontend: {
      name: "Aria Patel",
      role: "UI_ENGINEER",
      id: "02",
      bio: "Architected the design system and motion primitives. Bridging the gap between raw data and human interaction — every transition, every state, every pixel deliberate.",
      skills: ["React", "TypeScript", "Tailwind", "Motion"],
      link: "#",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
    design: {
      name: "Jordan Blake",
      role: "PRODUCT_DESIGN",
      id: "03",
      bio: "Defined the visual language of SendAnything. Reducing complex P2P concepts into intuitive, minimal interfaces. Owns every user flow from zero to connected.",
      skills: ["Figma", "Strategy", "UX", "Prototyping"],
      link: "#",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
    testing: {
      name: "Casey Morgan",
      role: "QA_ENGINEER",
      id: "04",
      bio: "Ensuring 99.9% reliability across all network conditions and browser environments through adversarial testing. Thinks like an attacker so users never have to.",
      skills: ["Playwright", "Jest", "CI/CD", "Load Testing"],
      link: "#",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    }
  };

  const features = [
    { id: "F01", label: "P2P TRANSFER", desc: "Files move directly between browsers via WebRTC data channels. No server ever sees your bytes." },
    { id: "F02", label: "INSTANT SESSIONS", desc: "Six characters. No login. Share in under three seconds from any device on any network." },
    { id: "F03", label: "QR CONNECT", desc: "Scan and join. Built for the moment you're both in the same room." },
    { id: "F04", label: "LIVE TEXT EDITOR", desc: "Real-time collaborative text via WebSocket. See every keystroke. Control viewer edit permissions.", isNew: true },
    { id: "F05", label: "ZERO STORAGE", desc: "Sessions expire. Files vanish. There is no database, no log, no trace of your content." },
    { id: "F06", label: "VIEWER CONTROL", desc: "Lock or unlock editing for connected viewers — you stay in control of the session." },
  ];

  const p = team[selectedRole];
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #ffffff;
          --text: #0a0a0a;
          --text-secondary: #3a3a3a;
          --text-muted: #555;
          --text-faint: #777;
          --border: #e0e0e0;
          --border-strong: #b0b0b0;
          --surface: #f5f5f5;
          --surface2: #ececec;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── HEADER (Replacing Sidebar) ── */
        .top-nav {
          height: 56px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8%;
          background: #fff;
        }

        .nav-logo { font-weight: 900; font-size: 20px; letter-spacing: -0.02em; }
        .nav-status { font-size: 10px; font-weight: 700; color: #999; letter-spacing: 2px; }

        .main-content { width: 100%; min-width: 0; }

        /* ── SECTION ── */
        .section { padding: 100px 8%; border-bottom: 1px solid var(--border); }

        .sec-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-faint);
          margin-bottom: 20px;
        }

        /* ── HERO ── */
        .hero-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(2.8rem, 10vw, 7.5rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 0.9;
          margin-bottom: 40px;
          color: var(--text);
        }
        .hero-desc {
          max-width: 600px;
          font-size: 17px;
          color: var(--text-secondary);
          line-height: 1.8;
          margin-bottom: 60px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          border-top: 1px solid var(--border);
          border-left: 1px solid var(--border);
        }
        .stat-cell {
          padding: 32px 24px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .stat-n {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .stat-l {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-muted);
          margin-top: 8px;
          font-weight: 600;
        }

        /* ── TEAM PHOTO ── */
        .team-photo-section {
          position: relative;
          width: 100%;
          height: 80vh;
          overflow: hidden;
          border-bottom: 1px solid var(--border);
        }
        .team-photo-img { width: 100%; height: 100%; object-fit: cover; object-position: center 35%; }
        .team-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%);
        }
        .team-photo-caption {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 60px 8%;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .team-photo-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(2rem, 5vw, 4.5rem);
          font-weight: 700; color: #fff; line-height: 1;
        }

        /* ── TEAM DETAIL ── */
        .team-container { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border); }
        .member-info { padding: 60px 10%; display: flex; flex-direction: column; justify-content: space-between; gap: 40px; }
        .member-nav { border-left: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; }

        .nav-item {
          padding: 30px 40px; border-bottom: 1px solid var(--border);
          cursor: pointer; display: flex; justify-content: space-between; align-items: center;
          font-weight: 600; font-size: 14px; color: var(--text-secondary);
        }
        .nav-item.active { background: #000; color: #fff; }
        .nav-item-sub { font-size: 10px; opacity: 0.5; font-family: monospace; }

        .specs-box { padding: 40px; flex: 1; }
        .specs-title { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 15px;}
        .specs-line { font-size: 12px; color: var(--text-secondary); line-height: 2.2; font-family: monospace; }

        .tag {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          padding: 4px 12px; border: 1px solid var(--border-strong);
          border-radius: 100px; font-weight: 600; display: inline-block;
        }

        .id-large { font-family: 'Space Grotesk', sans-serif; font-size: 120px; font-weight: 700; color: #f0f0f0; line-height: 0.8; margin-bottom: 20px; letter-spacing: -0.05em; }
        .member-name { font-family: 'Space Grotesk', sans-serif; font-size: 50px; font-weight: 700; margin-bottom: 20px; }
        .member-bio { font-size: 16px; color: var(--text-secondary); line-height: 1.8; max-width: 480px; }

        .skills-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 30px; }
        .member-links { display: flex; gap: 10px; flex-wrap: wrap; }

        .btn-black { background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-size: 12px; font-weight: 700; }
        .btn-outline { background: none; border: 1px solid var(--border-strong); color: var(--text); padding: 13px 22px; text-decoration: none; font-size: 12px; font-weight: 700; }
        .btn-outline:hover { background: #000; color: #fff; border-color: #000; }

        /* ── FEATURES ── */
        .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
        .feat-cell { padding: 40px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; }
        .feat-id { font-size: 10px; font-weight: 700; color: var(--text-faint); margin-bottom: 15px; font-family: monospace; }
        .feat-label { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .feat-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }
        .feat-new { position: absolute; top: 15px; right: 15px; font-size: 9px; font-weight: 700; background: #000; color: #fff; padding: 2px 8px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .stats-row { grid-template-columns: repeat(3, 1fr); }
          .team-container { grid-template-columns: 1fr; }
          .member-nav { border-left: none; border-top: 1px solid var(--border); }
          .feat-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .section { padding: 48px 5%; }
          .hero-title { font-size: clamp(2rem, 12vw, 3.5rem); }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .stat-cell { padding: 20px 16px; }
          .stat-n { font-size: 28px; }
          .team-photo-section { height: 55vw; min-height: 260px; }
          .team-photo-caption { flex-direction: column; align-items: flex-start; gap: 12px; padding: 32px 5%; }
          .team-photo-title { font-size: clamp(1.4rem, 6vw, 2.5rem); }
          .member-info { padding: 32px 5%; gap: 28px; }
          .id-large { font-size: clamp(48px, 18vw, 90px); }
          .member-name { font-size: clamp(1.6rem, 7vw, 2.8rem); }
          .member-bio { font-size: 15px; }
          .nav-item { padding: 20px 24px; font-size: 13px; }
          .specs-box { padding: 24px; }
          .feat-grid { grid-template-columns: 1fr; }
          .feat-cell { padding: 28px 20px; }
          .member-links { flex-direction: column; }
          .btn-black, .btn-outline { width: 100%; text-align: center; display: block; }
          .about-footer { flex-direction: column; gap: 8px; }
        }

        @media (max-width: 480px) {
          .section { padding: 36px 4%; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .stat-cell { padding: 16px 12px; }
          .stat-n { font-size: 24px; }
          .hero-desc { font-size: 15px; }
          .top-nav { padding: 0 4%; }
          .nav-status { display: none; }
        }
      `}</style>

      <div className="wrapper" style={{ display: 'block' }}>
        
        {/* TOP NAV */}
        <nav className="top-nav">
          <div className="nav-logo">S.</div>
          <div className="nav-status">ESTABLISHED // 2024 — STATUS: OPERATIONAL</div>
        </nav>

        <main className="main-content">

          {/* HERO */}
          <section className="section">
            <div className="sec-label">[ 01 // OVERVIEW ]</div>
            <h1 className="hero-title">
              P2P SHARING.<br />ENGINEERED TO<br />BE INVISIBLE.
            </h1>
            <p className="hero-desc">
              No cloud storage. No intermediaries. SendAnything creates a direct, 
              encrypted tunnel between devices. Your data never touches our servers — 
              and now, live real-time text collaboration ships too.
            </p>
            <div className="stats-row">
              {[
                ["4", "ENGINEERS"],
                ["0", "DATA STORED"],
                ["<3s", "TO CONNECT"],
                ["6", "CHAR KEY"],
                ["∞", "FILE SIZE*"],
                ["100%", "P2P"],
              ].map(([n, l]) => (
                <div className="stat-cell" key={l}>
                  <div className="stat-n">{n}</div>
                  <div className="stat-l">{l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* TEAM PHOTO */}
          <div className="team-photo-section">
            <img className="team-photo-img" src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1800&q=85&fit=crop" alt="Team" />
            <div className="team-photo-overlay" />
            <div className="team-photo-caption">
              <div className="team-photo-title">THE PEOPLE<br />BEHIND THE CORE.</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#999', marginBottom: 8 }}>SENDANYTHING // 2024</div>
                <div style={{ fontSize: '40px', fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk' }}>04</div>
              </div>
            </div>
          </div>

          {/* TEAM DETAIL */}
          <section className="section" style={{ padding: 0 }}>
            <div style={{ padding: "60px 8% 20px" }}>
              <div className="sec-label">[ 02 // MEET THE TEAM ]</div>
            </div>
            <div className="team-container">
              <div className="member-info">
                <div>
                  <div className="id-large">{p.id}</div>
                  <div style={{ marginBottom: 16 }}>
                    <span className="tag" style={{ background: "#000", color: "#fff", border: "none", borderRadius: 0 }}>{p.role}</span>
                  </div>
                  <h2 className="member-name">{p.name}</h2>
                  <p className="member-bio">{p.bio}</p>
                </div>
                <div>
                  <div className="skills-row">
                    {p.skills.map(s => <span key={s} className="tag">{s}</span>)}
                  </div>
                  <div className="member-links">
                    <a href={p.link} className="btn-black" target="_blank">PORTFOLIO</a>
                    <a href={p.github} className="btn-outline" target="_blank">GITHUB</a>
                    <a href={p.linkedin} className="btn-outline" target="_blank">LINKEDIN</a>
                  </div>
                </div>
              </div>

              <div className="member-nav">
                {Object.keys(team).map(key => (
                  <div key={key} className={`nav-item ${selectedRole === key ? "active" : ""}`} onClick={() => setSelectedRole(key)}>
                    <span>{team[key].name}</span>
                    <span className="nav-item-sub">{team[key].id}</span>
                  </div>
                ))}
                <div className="specs-box">
                  <div className="specs-title">TECHNICAL PROTOCOLS</div>
                  <div className="specs-line">
                    CORE: WebRTC / DTLS / SCTP<br />
                    SECURITY: AES-GCM 256-BIT<br />
                    COLLAB: WebSocket Secure (WSS)<br />
                    ARCHITECTURE: SERVERLESS MESH
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="section">
            <div className="sec-label" style={{ marginBottom: 40 }}>[ 03 // PRODUCT CAPABILITIES ]</div>
            <div className="feat-grid">
              {features.map(f => (
                <div className="feat-cell" key={f.id}>
                  {f.isNew && <span className="feat-new">NEW</span>}
                  <div className="feat-id">{f.id}</div>
                  <div className="feat-label">{f.label}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* FOOTER */}
          <footer className="about-footer" style={{ padding: "48px 8%", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>SENDANYTHING.ONLINE</div>
            <div style={{ fontSize: 11, color: "#999" }}>© 2024 — ALL RIGHTS RESERVED.</div>
          </footer>

        </main>
      </div>
    </>
  );
}