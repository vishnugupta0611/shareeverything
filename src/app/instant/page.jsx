"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaShareAlt } from "react-icons/fa";
import { MdPeople, MdContentCopy, MdShare, MdLockOpen, MdLock } from "react-icons/md";
import { Highlight, themes } from "prism-react-renderer";

const MONO   = "'JetBrains Mono','Fira Code','Cascadia Code',ui-monospace,monospace";
const BG     = "#0f1117";
const BG2    = "#0b0d12";
const BORDER = "#1f2230";
const FS     = "clamp(12px, 3.5vw, 14px)";
const LH     = "1.6rem";
const PAD    = "0.75rem 1rem";

function InstantEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [content, setContent]     = useState("");
    const [isOwner, setIsOwner]     = useState(false);
    const [editOpen, setEditOpen]   = useState(false);
    const [viewers, setViewers]     = useState(1);
    const [roomId, setRoomId]       = useState("");
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted]     = useState(false);

    const socketRef   = useRef(null);
    const textareaRef = useRef(null);
    const lineNumRef  = useRef(null);
    const roomIdRef   = useRef("");

    const canEdit = isOwner || editOpen;
    const lines   = content.split("\n");

    const syncScroll = () => {
        if (lineNumRef.current && textareaRef.current)
            lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    };

    const genId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const connect = useCallback(async (id) => {
        const { io } = await import("socket.io-client");
        const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://sendanything.onrender.com";
        const socket = io(BACKEND, { transports: ["websocket", "polling"], withCredentials: true });
        socketRef.current = socket;

        socket.on("connect",       () => { setConnected(true); socket.emit("instant-join", id); });
        socket.on("connect_error", () => setConnected(false));
        socket.on("disconnect",    () => { setConnected(false); setIsOwner(false); });

        socket.on("instant-init", ({ content: c, isOwner: o, editOpen: e }) => {
            setContent(c); setIsOwner(o); setEditOpen(e);
        });
        socket.on("instant-update",      (c) => setContent(c));
        socket.on("instant-viewers",     (n) => setViewers(n));
        socket.on("instant-edit-access", (o) => {
            setEditOpen(o);
            toast(o ? "Editing open to all" : "Editing locked to owner", { id: "ea" });
        });
        socket.on("instant-owner", () => { setIsOwner(true); toast.success("You are now the owner"); });
    }, []);

    useEffect(() => {
        setMounted(true);
        let id = searchParams.get("room");
        if (!id) { id = genId(); router.replace(`/instant?room=${id}`); }
        setRoomId(id);
        roomIdRef.current = id;
        connect(id);
        return () => socketRef.current?.disconnect();
    }, []);

    if (!mounted) return null;

    const handleChange = (e) => {
        if (!canEdit) return;
        const v = e.target.value;
        setContent(v);
        socketRef.current?.emit("instant-typing", { roomId: roomIdRef.current, content: v });
    };

    const toggleEdit = () => {
        if (!isOwner) return;
        const next = !editOpen;
        setEditOpen(next);
        socketRef.current?.emit("instant-toggle-edit", { roomId: roomIdRef.current, editOpen: next });
    };

    const copyLink    = () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); };
    const copyContent = () => { navigator.clipboard.writeText(content); toast.success("Copied"); };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: BG, color: "#d1d5db" }}>

            {/* ── NAV ── */}
            <nav style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}
                className="flex-shrink-0 flex items-center justify-between px-3 sm:px-5 h-11">

                {/* Logo */}
                <button onClick={() => router.push("/")} className="flex items-center gap-2 group flex-shrink-0">
                    <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center group-hover:bg-lime-300 transition-colors">
                        <FaShareAlt className="text-black" style={{ fontSize: 10 }} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors hidden sm:block">
                        sendanything
                    </span>
                </button>

                {/* Controls */}
                <div className="flex items-center gap-1.5">

                    {/* Room ID — md+ */}
                    <span className="hidden md:block text-xs font-mono px-2 py-1 rounded"
                        style={{ background: "#1a1d26", color: "#6b7280" }}>
                        {roomId}
                    </span>

                    {/* Live dot + viewers */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: "#1a1d26", color: "#9ca3af" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: connected ? "#34d399" : "#f87171",
                                     boxShadow: connected ? "0 0 5px #34d399" : "none" }} />
                        <MdPeople style={{ fontSize: 13 }} />
                        <span className="tabular-nums font-medium">{viewers}</span>
                    </div>

                    {/* Edit toggle — owner only */}
                    {isOwner && (
                        <button onClick={toggleEdit}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
                            style={{
                                background: editOpen ? "#14532d" : "#1a1d26",
                                color:      editOpen ? "#86efac" : "#9ca3af",
                                border:     `1px solid ${editOpen ? "#166534" : BORDER}`,
                            }}>
                            {editOpen
                                ? <MdLockOpen style={{ fontSize: 13, color: "#4ade80" }} />
                                : <MdLock     style={{ fontSize: 13, color: "#6b7280" }} />
                            }
                            <span className="hidden sm:inline">{editOpen ? "Open" : "Locked"}</span>
                        </button>
                    )}

                    {/* Copy */}
                    <button onClick={copyContent} title="Copy content"
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:brightness-125"
                        style={{ background: "#1a1d26", color: "#9ca3af" }}>
                        <MdContentCopy style={{ fontSize: 14 }} />
                    </button>

                    {/* Share */}
                    <button onClick={copyLink}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: "#1d4ed8", color: "#fff" }}>
                        <MdShare style={{ fontSize: 13 }} />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                </div>
            </nav>

            {/* ── EDITOR ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Line numbers */}
                <div ref={lineNumRef}
                    className="hidden xs:block flex-shrink-0 overflow-hidden select-none py-3 text-right"
                    style={{
                        width: "2rem",
                        background: BG2,
                        borderRight: `1px solid ${BORDER}`,
                        fontFamily: MONO,
                        fontSize: 11,
                        lineHeight: "1.6rem",
                        color: "#374151",
                    }}
                    aria-hidden="true">
                    {lines.map((_, i) => (
                        <div key={i} className="pr-1.5" style={{ lineHeight: "1.6rem" }}>{i + 1}</div>
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={`p${i}`} className="pr-1.5 opacity-0" style={{ lineHeight: "1.6rem" }}>0</div>
                    ))}
                </div>

                {/* Editor: Prism highlighted layer + transparent textarea */}
                <div className="flex-1 relative overflow-auto"
                    style={{ background: BG, WebkitOverflowScrolling: "touch" }}>

                    {/* Highlighted layer — pointer-events none, sits behind textarea */}
                    <Highlight theme={themes.nightOwl} code={content || " "} language="javascript">
                        {({ tokens, getLineProps, getTokenProps }) => (
                            <pre
                                aria-hidden="true"
                                style={{
                                    position: "absolute", inset: 0, margin: 0,
                                    padding: PAD, fontFamily: MONO, fontSize: FS,
                                    lineHeight: LH, background: "transparent",
                                    whiteSpace: "pre", wordBreak: "normal",
                                    overflowWrap: "normal", pointerEvents: "none",
                                    tabSize: 2, overflow: "hidden",
                                }}>
                                {tokens.map((line, i) => (
                                    <div key={i} {...getLineProps({ line })}>
                                        {line.map((token, j) => (
                                            <span key={j} {...getTokenProps({ token })} />
                                        ))}
                                    </div>
                                ))}
                            </pre>
                        )}
                    </Highlight>

                    {/* Transparent textarea on top */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onScroll={(e) => {
                            syncScroll();
                            const pre = e.target.previousSibling;
                            if (pre) { pre.scrollTop = e.target.scrollTop; pre.scrollLeft = e.target.scrollLeft; }
                        }}
                        readOnly={!canEdit}
                        placeholder={canEdit ? "Start typing — viewers see it live..." : "Waiting for owner to type..."}
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        style={{
                            position: "absolute", inset: 0,
                            background: "transparent", color: "transparent",
                            caretColor: "#60a5fa", fontFamily: MONO,
                            fontSize: FS, lineHeight: LH, padding: PAD,
                            tabSize: 2, whiteSpace: "pre", wordBreak: "normal",
                            overflowWrap: "normal", resize: "none",
                            outline: "none", border: "none", overflow: "auto",
                            cursor: canEdit ? "text" : "default",
                            WebkitOverflowScrolling: "touch",
                        }}
                    />
                </div>
            </div>

            {/* ── STATUS BAR ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-0.5"
                style={{
                    background:  BG2,
                    borderTop:   `1px solid ${BORDER}`,
                    fontFamily:  MONO,
                    fontSize:    10,
                    color:       "#4b5563",
                }}>
                <span className="tabular-nums">{lines.length}L · {content.length}C</span>
                <div className="flex items-center gap-2">
                    <span className="md:hidden">{roomId}</span>
                    <span style={{ color: "#6b7280" }}>
                        {canEdit ? (isOwner ? "owner" : "editor") : "viewer"}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function InstantPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "#0f1117" }}>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
            </div>
        }>
            <InstantEditor />
        </Suspense>
    );
}
