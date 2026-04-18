"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BackendAPI, SocketSignaling } from "../lib/webrtc";
import QRCode from "qrcode";
import toast from "react-hot-toast";

const DURATION_OPTIONS = [
  { label: "5 min",  seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hr",   seconds: 3600 },
  { label: "2 hr",   seconds: 7200 },
];

function DurationPicker({ selected, onChange }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-white/40 text-xs tracking-widest uppercase">Session duration</p>
      <div className="flex flex-wrap justify-center gap-2">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.seconds}
            onClick={() => onChange(opt.seconds)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              background: selected === opt.seconds ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
              border: selected === opt.seconds ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: selected === opt.seconds ? "#fff" : "rgba(255,255,255,0.4)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted]             = useState(false);
  const [isDragOver, setIsDragOver]       = useState(false);
  const [isCreating, setIsCreating]       = useState(false);
  const [session, setSession]             = useState(null);
  const [copied, setCopied]               = useState(false);
  const [view, setView]                   = useState("buttons");
  const [joinKey, setJoinKey]             = useState("");
  const [isJoining, setIsJoining]         = useState(false);
  const [showScanner, setShowScanner]     = useState(false);
  const [duration, setDuration]           = useState(3600);
  const [activeSession, setActiveSession] = useState(null); // { key, expiresAt }
  const heroRef    = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // On mount: check if there's a live session the user navigated away from
  useEffect(() => {
    if (!mounted) return;
    const sid = searchParams.get("s");
    if (sid && !session) {
      generateQR(sid).then(qrUrl => { setSession({ sessionId: sid, qrUrl }); setView("qr"); });
      return;
    }
    // Check sessionStorage for an active session (user came back to home mid-session)
    const storedKey = sessionStorage.getItem("activeSessionKey");
    const storedExpiry = sessionStorage.getItem("sessionExpiresAt");
    if (storedKey && storedExpiry) {
      const ts = Date.parse(storedExpiry);
      if (!isNaN(ts) && ts > Date.now()) {
        setActiveSession({ key: storedKey, expiresAt: ts });
      } else {
        // Expired — clean up
        sessionStorage.removeItem("activeSessionKey");
        sessionStorage.removeItem("sessionExpiresAt");
      }
    }
  }, [mounted]);

  const generateQR = async (sid) => {
    const joinUrl = `${window.location.origin}/join?key=${sid}`;
    return await QRCode.toDataURL(joinUrl, {
      width: 200, margin: 1,
      color: { dark: "#ffffff", light: "#000000" },
    });
  };

  const handleShare = useCallback(async (durationSeconds = duration) => {
    if (isCreating || session) return;
    setIsCreating(true);
    try {
      const api = new BackendAPI();
      const res = await api.createSession(durationSeconds);
      if (!res.success) throw new Error();
      const sid = res.sessionId;
      // Store expiresAt for countdown in sharedata page
      if (res.expiresAt) {
        sessionStorage.setItem("sessionExpiresAt", res.expiresAt);
      }
      sessionStorage.setItem("activeSessionKey", sid);
      const qrUrl = await generateQR(sid);
      window.history.replaceState(null, "", `/?s=${sid}`);
      setSession({ sessionId: sid, qrUrl });
      setView("qr");
      const sig = new SocketSignaling(sid);
      await sig.connect();
      sig.onUserJoinedRoom(() => {
        router.push(`/sharedata?key=${sid}`);
      });
    } catch {
      toast.error("Failed to create session");
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, session, router, duration]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Stash files in window — survives same-tab router.push (no full reload)
      window.__pendingFiles = files;
    }
    handleShare();
  }, [handleShare]);

  const copyKey = () => {
    navigator.clipboard.writeText(session.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setSession(null);
    setView("buttons");
    setJoinKey("");
    stopScanner();
    window.history.replaceState(null, "", "/");
  };

  const endActiveSession = async () => {
    const key = activeSession?.key;
    setActiveSession(null);
    sessionStorage.removeItem("activeSessionKey");
    sessionStorage.removeItem("sessionExpiresAt");
    // Tear down the live connection
    if (window.__liveSession) {
      window.__liveSession.signaling?.disconnect();
      window.__liveSession = null;
    }
    if (key) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://sendanything.onrender.com"}/api/sessions/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: key }),
        });
      } catch {}
    }
    toast.success("Session ended");
  };

  const handleJoin = async (keyOverride) => {
    const key = (typeof keyOverride === "string" ? keyOverride : joinKey).trim().toUpperCase();
    if (!key || key.length !== 6) { toast.error("Enter a 6-character code"); return; }
    setIsJoining(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://sendanything.onrender.com"}/api/sessions/check/${key}`);
      const data = await res.json();
      if (!data.exists) { toast.error("Session not found"); setIsJoining(false); return; }
      // Store expiresAt if available
      if (data.expiresAt) sessionStorage.setItem("sessionExpiresAt", data.expiresAt);
      sessionStorage.setItem("activeSessionKey", key);
      router.push(`/sharedata?key=${key}`);
    } catch {
      toast.error("Failed to join"); setIsJoining(false);
    }
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setShowScanner(false);
  }, []);

  const startScanner = useCallback(async () => {
    setShowScanner(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await new Promise(r => setTimeout(r, 150));
      const el = document.getElementById("home-qr-scanner");
      if (!el) return;
      const scanner = new Html5Qrcode("home-qr-scanner");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (text) => {
          let key = text;
          try { const u = new URL(text); key = u.searchParams.get("key") || text; } catch {}
          key = key.trim().toUpperCase();
          scanner.stop().then(() => { scannerRef.current = null; setShowScanner(false); handleJoin(key); }).catch(() => {});
        },
        () => {}
      );
    } catch { setShowScanner(false); toast.error("Camera not available"); }
  }, []);

  useEffect(() => () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} } }, []);

  if (!mounted) return null;

  return (
    <div className="bg-black text-white overflow-x-hidden" style={{ background: "#000" }}>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (!heroRef.current?.contains(e.relatedTarget)) setIsDragOver(false); }}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <div className={`absolute inset-0 z-30 pointer-events-none transition-all duration-300 ${isDragOver ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-3xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/60 text-xl font-light tracking-widest italic" style={{ fontFamily: "Georgia, serif" }}>Release to share</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-6 w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-screen py-20">

          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-light italic leading-none tracking-tight mb-10 text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Send Anything.
          </motion.h1>

          <AnimatePresence mode="wait">
            {view === "buttons" && (
              <motion.div
                key="buttons"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                {/* Duration picker — shown before creating */}
                <DurationPicker selected={duration} onChange={setDuration} />

                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-1">
                  <button onClick={() => handleShare()} disabled={isCreating}
                    className="px-7 py-2.5 bg-white hover:bg-gray-100 text-black font-medium rounded-full transition-all duration-300 hover:scale-[1.03] disabled:opacity-50 text-sm">
                    {isCreating ? "Creating..." : "Share anything"}
                  </button>
                  <button onClick={() => router.push("/instant")}
                    className="px-7 py-2.5 bg-white hover:bg-gray-100 text-black font-medium rounded-full transition-all duration-300 hover:scale-[1.03] text-sm">
                    Share code
                  </button>
                  <button onClick={() => setView("receive")}
                    className="px-7 py-2.5 bg-white hover:bg-gray-100 text-black font-medium rounded-full transition-all duration-300 hover:scale-[1.03] text-sm">
                    Receive
                  </button>
                </div>
              </motion.div>
            )}

            {view === "qr" && session && (
              <motion.div
                key="qr"
                className="flex flex-col items-center gap-5"
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="p-3 rounded-2xl" style={{ background: "#000", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <img src={session.qrUrl} alt="QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
                </div>
                <button onClick={copyKey}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 hover:bg-white/8 group"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="font-mono text-lg font-semibold text-white tracking-[0.25em]">{session.sessionId}</span>
                  <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors">{copied ? "✓" : "copy"}</span>
                </button>
                <p className="text-white/30 text-xs tracking-widest italic" style={{ fontFamily: "Georgia, serif" }}>
                  Waiting for someone to join...
                </p>
                <button onClick={reset} className="text-white/20 hover:text-white/40 text-xs transition-colors mt-1">← back</button>
              </motion.div>
            )}

            {view === "receive" && (
              <motion.div
                key="receive"
                className="flex flex-col items-center gap-4 w-full max-w-xs"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                {/* Code input row — overflow-hidden keeps scanner icon on-screen */}
                <div className="flex items-center gap-2 w-full overflow-hidden">
                  <input
                    type="text"
                    value={joinKey}
                    onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 min-w-0 bg-transparent text-white font-mono text-center text-xl tracking-[0.3em] outline-none placeholder-white/20 py-2.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
                  />
                  {/* Camera button — flex-shrink-0 prevents it from being squeezed off-screen */}
                  <button
                    onClick={showScanner ? stopScanner : startScanner}
                    className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors p-1.5"
                    title="Scan QR code"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 7V5a2 2 0 0 1 2-2h2M2 17v2a2 2 0 0 0 2 2h2M22 7V5a2 2 0 0 0-2-2h-2M22 17v2a2 2 0 0 1-2 2h-2"/>
                      <rect x="7" y="7" width="10" height="10" rx="1"/>
                    </svg>
                  </button>
                </div>

                {/* QR scanner */}
                {showScanner && (
                  <div className="w-full rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div id="home-qr-scanner" className="w-full aspect-square" />
                  </div>
                )}

                <button
                  onClick={() => handleJoin()}
                  disabled={isJoining || joinKey.length !== 6}
                  className="px-7 py-2.5 bg-white hover:bg-gray-100 text-black font-medium rounded-full transition-all duration-300 hover:scale-[1.03] disabled:opacity-40 text-sm w-full"
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>

                <button onClick={reset} className="text-white/20 hover:text-white/40 text-xs transition-colors">← back</button>
              </motion.div>
            )}
          </AnimatePresence>

          {view === "buttons" && (
            <motion.p className="mt-4 text-white/20 text-xs tracking-wider"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              or drag & drop anywhere
            </motion.p>
          )}
        </div>
      </section>

      {/* ── SECTION 2 ── */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight mb-8">
            <span className="text-white">Share the future</span><br />
            <span className="text-gray-700">of digital </span>
            <span className="text-white">connectivity.</span>
          </h2>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="min-h-[50vh] flex flex-col justify-center px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Instant Sharing", desc: "Drop a file, get a QR code. Share directly browser-to-browser in seconds. No accounts, no uploads." },
              { title: "Zero Storage",    desc: "Files never touch our servers. Pure peer-to-peer WebRTC transfer — encrypted end-to-end." },
              { title: "Share Anything",  desc: "Images, videos, documents, folders, code snippets — any file type, any size." },
            ].map((f) => (
              <div key={f.title} className="space-y-4">
                <h4 className="text-white text-xl font-bold">{f.title}</h4>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="py-20 px-6 bg-black border-t border-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">Ready to share?</h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => handleShare()}
              className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105">
              Start Sharing
            </button>
            <button onClick={() => setView("receive")}
              className="px-8 py-4 bg-transparent text-white rounded-full font-bold text-lg border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105">
              Join a Session
            </button>
          </div>
        </div>
      </section>

      {/* ── ACTIVE SESSION POPUP ── */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 p-4 rounded-2xl"
            style={{
              background: "rgba(12,14,22,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              minWidth: "200px",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
              <span className="text-xs text-white/50 uppercase tracking-wider">Active session</span>
            </div>
            <span className="font-mono text-sm font-bold text-blue-400 tracking-[0.2em]">{activeSession.key}</span>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  sessionStorage.setItem("activeSessionKey", activeSession.key);
                  router.push(`/sharedata?key=${activeSession.key}`);
                }}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.25)" }}
              >
                Rejoin
              </button>
              <button
                onClick={endActiveSession}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium text-red-400 transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                End
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomeContent />
    </Suspense>
  );
}
