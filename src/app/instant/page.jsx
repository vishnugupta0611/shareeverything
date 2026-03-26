"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaShareAlt } from "react-icons/fa";
import { MdPeople, MdContentCopy, MdShare, MdLockOpen, MdLock } from "react-icons/md";

function InstantEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [content, setContent] = useState("");
    const [isOwner, setIsOwner] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewers, setViewers] = useState(1);
    const [roomId, setRoomId] = useState("");
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted] = useState(false);

    const socketRef = useRef(null);
    const textareaRef = useRef(null);
    const lineNumRef = useRef(null);
    const roomIdRef = useRef("");

    const canEdit = isOwner || editOpen;

    const syncScroll = () => {
        if (lineNumRef.current && textareaRef.current) {
            lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const connect = useCallback(async (id) => {
        const { io } = await import("socket.io-client");
        const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
        const socket = io(BACKEND, {
            transports: ["websocket", "polling"], // allow polling fallback
            withCredentials: true,
            reconnectionAttempts: 5,
            timeout: 10000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("instant-join", id);
        });
        socket.on("connect_error", (err) => {
            console.error("Socket connect error:", err.message);
            setConnected(false);
        });
        socket.on("instant-init", ({ content: c, isOwner: owner, editOpen: open }) => {
            setContent(c); setIsOwner(owner); setEditOpen(open);
        });
        socket.on("instant-update", (c) => setContent(c));
        socket.on("instant-viewers", (n) => setViewers(n));
        socket.on("instant-edit-access", (open) => {
            setEditOpen(open);
            toast(open ? "Editing opened to everyone" : "Editing restricted to owner", { id: "edit-access" });
        });
        socket.on("instant-owner", () => { setIsOwner(true); toast.success("You are now the owner"); });
        socket.on("disconnect", () => { setConnected(false); setIsOwner(false); });
    }, []);

    useEffect(() => {
        setMounted(true);
        let id = searchParams.get("room");
        if (!id) { id = generateRoomId(); router.replace(`/instant?room=${id}`); }
        setRoomId(id);
        roomIdRef.current = id;
        connect(id);
        return () => socketRef.current?.disconnect();
    }, []);

    if (!mounted) return null;

    const handleChange = (e) => {
        if (!canEdit) return;
        const val = e.target.value;
        setContent(val);
        socketRef.current?.emit("instant-typing", { roomId: roomIdRef.current, content: val });
    };

    const toggleEditAccess = () => {
        if (!isOwner) return;
        const next = !editOpen;
        setEditOpen(next);
        socketRef.current?.emit("instant-toggle-edit", { roomId: roomIdRef.current, editOpen: next });
    };

    const copyLink = () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); };
    const copyContent = () => { navigator.clipboard.writeText(content); toast.success("Copied to clipboard"); };

    const lines = content.split("\n");

    return (
        // Fixed overlay — covers global navbar and padding completely
        <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
            style={{ background: '#111318' }}>

            {/* ── Navbar ── */}
            <nav className="flex-shrink-0 flex items-center justify-between px-5 sm:px-7 py-3"
                style={{ background: '#111318', borderBottom: '1px solid #1e2028' }}>

                {/* Left: logo + name */}
                <button onClick={() => router.push("/")}
                    className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center group-hover:bg-lime-300 transition-colors">
                        <FaShareAlt className="text-black text-sm" />
                    </div>
                    <span className="text-[15px] font-bold text-white group-hover:text-lime-400 transition-colors">
                        sendanything
                    </span>
                </button>

                {/* Right: session info + actions */}
                <div className="flex items-center gap-2">

                    {/* Connection + room — desktop only */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: '#1a1d24' }}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}
                            style={{ boxShadow: connected ? '0 0 6px #34d399' : 'none' }} />
                        <span className="text-xs font-mono text-[#9ca3af] tracking-widest select-all">{roomId}</span>
                    </div>

                    {/* Viewer count + role */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: '#1a1d24', color: isOwner ? '#93c5fd' : editOpen ? '#6ee7b7' : '#9ca3af' }}>
                        <MdPeople className="text-sm opacity-80 flex-shrink-0" />
                        <span className="tabular-nums">{viewers}</span>
                    </div>

                    {/* Edit access toggle — owner only, always visible */}
                    {isOwner && (
                        <button onClick={toggleEditAccess}
                            title={editOpen ? "Lock editing" : "Allow everyone to edit"}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap"
                            style={{
                                background: editOpen ? '#14532d' : '#1a1d24',
                                color: editOpen ? '#86efac' : '#9ca3af',
                                border: editOpen ? '1px solid #166534' : '1px solid #1e2028',
                            }}>
                            {editOpen
                                ? <MdLockOpen className="text-green-400 text-sm flex-shrink-0" />
                                : <MdLock className="text-[#6b7280] text-sm flex-shrink-0" />
                            }
                            <span className="hidden sm:inline">{editOpen ? 'Open' : 'Locked'}</span>
                        </button>
                    )}

                    {/* Copy content — always visible */}
                    <button onClick={copyContent}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:brightness-125 flex-shrink-0"
                        style={{ background: '#1a1d24', color: '#9ca3af' }}
                        title="Copy content">
                        <MdContentCopy className="text-base" />
                    </button>

                    {/* Share link — always visible */}
                    <button onClick={copyLink}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-90 flex-shrink-0"
                        style={{ background: '#1d4ed8', color: '#fff' }}>
                        <MdShare className="text-sm flex-shrink-0" />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                </div>
            </nav>

            {/* ── Editor area ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Line numbers */}
                <div ref={lineNumRef}
                    className="flex-shrink-0 overflow-hidden select-none py-5 text-right w-12"
                    style={{
                        background: '#0e1016',
                        borderRight: '1px solid #1e2028',
                        fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
                        fontSize: '12px',
                        lineHeight: '1.75rem',
                        color: '#4b5563',
                    }}
                    aria-hidden="true">
                    {lines.map((_, i) => (
                        <div key={i} className="px-3" style={{ lineHeight: '1.75rem' }}>{i + 1}</div>
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={`p${i}`} className="px-3 opacity-0" style={{ lineHeight: '1.75rem' }}>0</div>
                    ))}
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onScroll={syncScroll}
                    readOnly={!canEdit}
                    placeholder={canEdit ? "Start typing — viewers see it live..." : "Waiting for owner to type..."}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="flex-1 h-full py-5 px-6 outline-none resize-none overflow-y-auto"
                    style={{
                        background: '#111318',
                        fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
                        fontSize: '13.5px',
                        lineHeight: '1.75rem',
                        color: '#d1d5db',          // #d1d5db — WCAG AA on #111318 (contrast ~8.5:1)
                        caretColor: '#60a5fa',
                        tabSize: 2,
                        whiteSpace: 'pre',
                        wordBreak: 'normal',
                        overflowWrap: 'normal',
                        cursor: canEdit ? 'text' : 'default',
                    }}
                />
            </div>

            {/* ── Status bar ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-1"
                style={{
                    background: '#0e1016',
                    borderTop: '1px solid #1e2028',
                    fontFamily: "'JetBrains Mono','Fira Code',monospace",
                    fontSize: '11px',
                    color: '#6b7280',
                }}>
                <span className="tabular-nums">{lines.length} lines · {content.length} chars</span>
                <div className="flex items-center gap-3">
                    {/* Mobile: show room id here */}
                    <span className="sm:hidden font-mono tracking-widest text-[#4b5563]">{roomId}</span>
                <span>{canEdit ? (isOwner ? 'owner · editing' : 'editing') : 'read only'}</span>
                    <span style={{ color: connected ? '#34d399' : '#f87171' }}>{connected ? '● connected' : '● disconnected'}</span>
                </div>
            </div>
        </div>
    );
}

export default function InstantPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 z-[200] bg-[#111318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
            </div>
        }>
            <InstantEditor />
        </Suspense>
    );
}
