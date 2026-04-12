"use client";
import { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";
import { MdSend, MdDownload, MdCode, MdClose, MdAdd, MdInsertDriveFile, MdImage, MdVideoFile, MdPictureAsPdf, MdPause, MdPlayArrow, MdCancel, MdFolder } from "react-icons/md";
import { P2PConnection, BackendAPI, SocketSignaling } from "../../lib/webrtc";

export default function ShareDataPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
            </div>
        }>
            <ShareDataPageContent />
        </Suspense>
    );
}

function ShareDataPageContent() {
    const searchParams = useSearchParams();
    const [sessionKey, setSessionKey] = useState("");
    const [connectionStatus, setConnectionStatus] = useState("disconnected");
    const [p2pConnection, setP2pConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("javascript");
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [folders, setFolders] = useState({}); // key: folderName, value: { files[], totalCount, expanded }
    const [fileTransfers, setFileTransfers] = useState({}); // key: fileId, value: progress info
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [modalDragOver, setModalDragOver] = useState(false);
    const [plusHovered, setPlusHovered] = useState(false);
    const [groupMode, setGroupMode] = useState(false);
    const [isOwner, setIsOwner] = useState(false); // first joiner is owner

    const connectionStatusRef = useRef("disconnected");
    // Keep ref in sync with state for use in callbacks
    useEffect(() => { connectionStatusRef.current = connectionStatus; }, [connectionStatus]);
    const modalFileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const codeInputRef = useRef(null);
    const feedEndRef = useRef(null);
    const transferStartTimes = useRef({});
    const lastProgressUpdate = useRef({}); // throttle progress updates per file

    const signalingRef = useRef(null); // store signaling for cleanup

    const joinSession = useCallback(async (key) => {
        setConnectionStatus("connecting");
        try {
            const backendAPI = new BackendAPI();
            const sessionInfo = await backendAPI.checkSession(key);
            if (!sessionInfo.success || !sessionInfo.exists) { toast.error("Session not found."); return; }
            await backendAPI.joinSession(key);
            const socketSignaling = new SocketSignaling(key);
            signalingRef.current = socketSignaling;
            await socketSignaling.connect();
            const connection = new P2PConnection();
            setP2pConnection(connection);
            connection.onConnectionStateChange((status) => {
                setConnectionStatus(status);
                if (status === 'connected') {
                    toast.dismiss();
                    toast.success("Connected — ready to share", { id: 'conn-status' });
                } else if (status === 'disconnected') {
                    toast.error("Peer disconnected", { id: 'conn-status' });
                } else if (status === 'failed') {
                    toast.error("Connection failed", { id: 'conn-status' });
                }
            });
            connection.onMessageReceived((data) => {
                if (data.type === 'message' || data.type === 'code') {
                    setMessages(prev => [...prev, { ...data, dir: 'received', messageType: data.type, timestamp: data.timestamp || Date.now() }]);
                }
            });
            connection.onFileReceived((file) => {
                const url = URL.createObjectURL(new Blob([file.data], { type: file.type }));
                const entry = { name: file.name, type: file.type, size: file.size, url, relativePath: file.relativePath, timestamp: Date.now(), dir: 'received' };

                if (file.folderName) {
                    // Folder files go ONLY into folders state — never into receivedFiles
                    setFolders(prev => {
                        const existing = prev[file.folderName] || { files: [], totalCount: 0, expanded: false, timestamp: Date.now(), dir: 'received' };
                        const fileIdx = existing.files.findIndex(f => f.relativePath === file.relativePath);
                        const updatedFiles = fileIdx !== -1
                            ? existing.files.map((f, i) => i === fileIdx ? { ...f, url, done: true } : f)
                            : [...existing.files, { ...entry, done: true }];
                        return { ...prev, [file.folderName]: { ...existing, files: updatedFiles } };
                    });
                } else {
                    setReceivedFiles(prev => {
                        const idx = prev.findIndex(f => f.name === file.name && f.placeholder);
                        if (idx !== -1) { const next = [...prev]; next[idx] = entry; return next; }
                        return [...prev, entry];
                    });
                }
                toast.success(`Received: ${file.name}`);
            });
            connection.onTransferProgressChange((progress) => {
                const key = progress.fileName;
                const now = Date.now();

                if (progress.progress === 0 || !transferStartTimes.current[key]) {
                    transferStartTimes.current[key] = { startTime: now };
                }

                // Throttle UI updates to max once per 200ms per file (prevents lag during folder transfers)
                const lastUpdate = lastProgressUpdate.current[key] || 0;
                const isDone = progress.progress >= 100 || progress.type === 'cancelled';
                if (!isDone && now - lastUpdate < 200) return;
                lastProgressUpdate.current[key] = now;

                const { startTime } = transferStartTimes.current[key];
                const elapsed = (now - startTime) / 1000;

                if (progress.type === 'receiving') {
                    // Only add placeholder for non-folder files
                    // Folder files are tracked in folders state, not receivedFiles
                    const isFolderFile = progress.folderName;
                    if (!isFolderFile) {
                        setReceivedFiles(prev => {
                            const exists = prev.find(f => f.name === key && f.dir === 'received');
                            if (!exists) {
                                return [...prev, {
                                    name: key, type: '', size: progress.totalSize || 0,
                                    url: null, timestamp: now, dir: 'received', placeholder: true
                                }];
                            }
                            return prev;
                        });
                    }
                }

                setFileTransfers(prev => ({
                    ...prev,
                    [key]: {
                        progress: progress.progress,
                        type: progress.type,
                        paused: progress.type === 'paused',
                        cancelled: progress.type === 'cancelled',
                        totalSize: progress.totalSize ?? prev[key]?.totalSize ?? 0,
                        receivedSize: progress.receivedSize ?? 0,
                        elapsed,
                        done: isDone,
                    }
                }));

                if (isDone) {
                    delete transferStartTimes.current[key];
                    delete lastProgressUpdate.current[key];
                    setTimeout(() => {
                        setFileTransfers(prev => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                        });
                    }, 3000);
                }
            });
            socketSignaling.onSessionJoinedCallback((data) => {
                // First joiner is owner
                setIsOwner(true);
                setGroupMode(data.groupMode || false);
                // In group mode, connect to all existing peers
                if (data.groupMode && data.existingPeers?.length > 0) {
                    data.existingPeers.forEach(async (peerId) => {
                        try {
                            const offer = await connection.createOffer();
                            if (offer) socketSignaling.sendSignal(offer, peerId);
                        } catch (e) { console.error(e); }
                    });
                }
            });

            socketSignaling.onGroupModeChanged(({ enabled }) => {
                setGroupMode(enabled);
                toast(enabled ? 'Group mode enabled — anyone with the link can join' : 'Group mode disabled', { id: 'group-mode' });
            });

            socketSignaling.onSignalReceived(async (data) => {
                if (data.signal.type === 'offer') {
                    const answer = await connection.createAnswer(data.signal);
                    if (answer) socketSignaling.sendSignal(answer, data.from);
                } else if (data.signal.type === 'answer') {
                    await connection.setRemoteAnswer(data.signal);
                } else if (data.signal.type === 'ice-candidate') {
                    await connection.addIceCandidate(data.signal.candidate);
                }
            });
            socketSignaling.onUserJoinedRoom(async (data) => {
                try {
                    const offer = await connection.createOffer();
                    if (offer) socketSignaling.sendSignal(offer, data.userId);
                } catch (e) { console.error(e); }
            });
            connection.onIceCandidate((candidate) => socketSignaling.sendSignal({ type: 'ice-candidate', candidate }));
            toast.loading("Waiting for peer...", { id: 'conn-status' });
        } catch (error) {
            console.error(error);
            toast.error("Failed to join session.");
            setConnectionStatus("disconnected");
        }
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const key = searchParams.get('key');
        if (key) { setSessionKey(key); joinSession(key); }
        // Cleanup on unmount — disconnect socket and close WebRTC
        return () => {
            signalingRef.current?.disconnect();
        };
    }, [mounted]); // only run once when mounted flips to true

    useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, receivedFiles]);

    if (!mounted) return null;

    const handleFileShare = async (file, skipFeed = false) => {
        if (connectionStatusRef.current !== 'connected') { toast.error("Wait for connection first"); return; }
        const ts = Date.now();
        if (!skipFeed) {
            const localUrl = URL.createObjectURL(file);
            setReceivedFiles(prev => [...prev, {
                name: file.name, type: file.type, size: file.size,
                url: localUrl, timestamp: ts, dir: 'sent'
            }]);
            transferStartTimes.current[file.name] = { startTime: ts };
            setFileTransfers(prev => ({ ...prev, [file.name]: { progress: 0, type: 'sending', elapsed: 0, done: false } }));
        }
        try {
            await p2pConnection.sendFile(file);
        } catch { toast.error("Failed to send file."); }
    };

    const handleDrop = (e) => {
        e.preventDefault(); setIsDragOver(false);
        Array.from(e.dataTransfer.files).forEach(handleFileShare);
    };

    const handleModalDrop = (e) => {
        e.preventDefault(); setModalDragOver(false);
        Array.from(e.dataTransfer.files).forEach(f => { handleFileShare(f); });
        setShowUploadModal(false);
    };

    const handleModalFileChange = (e) => {
        Array.from(e.target.files).forEach(handleFileShare);
        setShowUploadModal(false);
    };

    const handleFolderChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setShowUploadModal(false);

        const folderName = files[0].webkitRelativePath?.split('/')[0] || 'folder';
        const ts = Date.now();

        setFolders(prev => ({
            ...prev,
            [folderName]: {
                files: files.map(f => ({
                    name: f.name,
                    relativePath: f.webkitRelativePath || f.name,
                    size: f.size,
                    type: f.type,
                    done: false,
                    url: null,
                })),
                totalCount: files.length,
                expanded: false,
                timestamp: ts,
                dir: 'sent',
            }
        }));

        const sendSequentially = async () => {
            for (const file of files) {
                await handleFileShare(file, true); // skipFeed = true
                // Mark file done — batch update, no per-chunk state
                setFolders(prev => {
                    const folder = prev[folderName];
                    if (!folder) return prev;
                    return {
                        ...prev,
                        [folderName]: {
                            ...folder,
                            files: folder.files.map(f =>
                                f.relativePath === (file.webkitRelativePath || file.name)
                                    ? { ...f, done: true }
                                    : f
                            )
                        }
                    };
                });
            }
        };
        sendSequentially();
    };

    const handlePauseResume = (fileName) => {
        if (!p2pConnection) return;
        const xfer = fileTransfers[fileName];
        if (xfer?.paused) {
            p2pConnection.resumeTransfer(fileName);
            setFileTransfers(prev => ({ ...prev, [fileName]: { ...prev[fileName], paused: false, type: 'sending' } }));
        } else {
            p2pConnection.pauseTransfer(fileName);
            setFileTransfers(prev => ({ ...prev, [fileName]: { ...prev[fileName], paused: true, type: 'paused' } }));
        }
    };

    const handleCancel = (fileName) => {
        if (!p2pConnection) return;
        p2pConnection.cancelTransfer(fileName);
        setFileTransfers(prev => ({ ...prev, [fileName]: { ...prev[fileName], cancelled: true, done: true } }));
        setReceivedFiles(prev => prev.filter(f => !(f.name === fileName && f.dir === 'sent')));
    };

    const sendMessage = () => {
        if (!messageInput.trim() || connectionStatus !== 'connected') return;
        p2pConnection.sendMessage(messageInput);
        setMessages(prev => [...prev, { dir: 'sent', messageType: 'message', content: messageInput, timestamp: Date.now() }]);
        setMessageInput("");
    };

    const sendCode = () => {
        if (!codeInput.trim() || connectionStatus !== 'connected') return;
        p2pConnection.sendCode(codeInput, codeLanguage);
        setMessages(prev => [...prev, { dir: 'sent', messageType: 'code', content: codeInput, language: codeLanguage, timestamp: Date.now() }]);
        setCodeInput(""); setShowCodeModal(false);
        toast.success("Code snippet sent");
    };

    const downloadFile = (file) => {
        const a = document.createElement('a');
        a.href = file.url; a.download = file.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const downloadFolder = async (folderName, folderData) => {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (const f of folderData.files) {
            if (!f.url) continue;
            const resp = await fetch(f.url);
            const blob = await resp.blob();
            zip.file(f.relativePath || f.name, blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${folderName}.zip`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast.success(`Downloaded ${folderName}.zip`);
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B','KB','MB','GB'][i];
    };

    const getFileIcon = (type = '') => {
        if (type.startsWith('image/')) return <MdImage className="text-pink-400 text-2xl" />;
        if (type.startsWith('video/')) return <MdVideoFile className="text-purple-400 text-2xl" />;
        if (type.includes('pdf')) return <MdPictureAsPdf className="text-red-400 text-2xl" />;
        return <MdInsertDriveFile className="text-blue-400 text-2xl" />;
    };

    const statusConfig = {
        connected:    { dot: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]', label: 'Connected' },
        connecting:   { dot: 'bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.5)] animate-pulse', label: 'Connecting...' },
        disconnected: { dot: 'bg-red-400 shadow-[0_0_8px_2px_rgba(248,113,113,0.4)]', label: 'Waiting to connect' },
    }[connectionStatus] || { dot: 'bg-gray-500', label: 'Initializing' };

    const allItems = [
        ...messages,
        ...receivedFiles.filter(f => !f.folderName).map(f => ({ ...f, messageType: 'file' })),
        ...Object.entries(folders).map(([name, data]) => ({ messageType: 'folder', folderName: name, ...data })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    const hasContent = allItems.length > 0;

    return (
        <div
            className="min-h-screen bg-[#050508] text-white relative overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false); }}
            onDrop={handleDrop}
        >
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-blue-700/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-purple-700/8 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[80px]" />
            </div>

            {/* Global drag overlay */}
            <div className={`fixed inset-0 z-40 pointer-events-none transition-all duration-300 ${isDragOver ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-blue-500/5" />
                <div className="absolute inset-3 border-2 border-dashed border-blue-400/50 rounded-3xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <div className="text-7xl font-thin text-blue-300 drop-shadow-[0_0_30px_rgba(147,197,253,0.8)] scale-125 transition-transform">+</div>
                        <p className="text-blue-300 text-lg font-light tracking-widest uppercase">Drop to upload</p>
                    </div>
                </div>
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                    <span className="text-sm text-gray-500">{statusConfig.label}</span>
                </div>
                <div className="flex items-center gap-3">
                    {sessionKey && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                            <span className="text-[11px] text-gray-600 uppercase tracking-wider">Session</span>
                            <span className="text-xs font-mono font-bold text-blue-400 tracking-[0.2em]">{sessionKey}</span>
                        </div>
                    )}
                    {/* Group mode toggle — only owner sees it */}
                    {isOwner && (
                        <button
                            onClick={() => {
                                const next = !groupMode;
                                setGroupMode(next);
                                signalingRef.current?.toggleGroupMode(sessionKey, next);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                            style={{
                                background: groupMode ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                                border: groupMode ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                color: groupMode ? '#6ee7b7' : 'rgba(255,255,255,0.35)',
                            }}
                            title="Toggle group mode — allow multiple people to join"
                        >
                            <span>{groupMode ? '⬡' : '⬡'}</span>
                            <span className="hidden sm:inline">{groupMode ? 'Group on' : 'Group off'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main layout */}
            <div className={`relative z-10 flex transition-all duration-500 ease-in-out ${hasContent ? 'h-[calc(100dvh-57px)]' : 'min-h-[calc(100dvh-57px)] items-center justify-center'}`}>

                {/* ── EMPTY STATE: centered upload zone ── */}
                {!hasContent && (
                    <div className="flex flex-col items-center justify-center w-full px-4">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            onMouseEnter={() => setPlusHovered(true)}
                            onMouseLeave={() => setPlusHovered(false)}
                            className="group relative w-72 h-72 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: plusHovered
                                    ? '0 0 60px rgba(96,165,250,0.15), 0 0 120px rgba(96,165,250,0.08), inset 0 0 40px rgba(96,165,250,0.05)'
                                    : '0 0 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)',
                            }}
                        >
                            {/* Pulse ring */}
                            <div className={`absolute inset-0 rounded-3xl border border-blue-400/20 transition-all duration-700 ${plusHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}
                                style={{ animation: 'pulse-ring 3s ease-in-out infinite' }} />

                            {/* Plus icon */}
                            <div className={`transition-all duration-300 ${plusHovered ? 'scale-110' : 'scale-100'}`}
                                style={{ filter: plusHovered ? 'drop-shadow(0 0 20px rgba(96,165,250,0.8))' : 'drop-shadow(0 0 8px rgba(96,165,250,0.3))' }}>
                                <MdAdd className="text-7xl text-blue-400" />
                            </div>

                            <div className="text-center space-y-1 px-6">
                                <p className="text-white/80 text-sm font-medium">Drop files here or click to upload</p>
                                <p className="text-white/30 text-xs">Any file type supported</p>
                            </div>
                        </button>

                        {connectionStatus !== 'connected' && (
                            <p className="mt-6 text-xs text-white/20 tracking-wider uppercase">Waiting for peer to connect</p>
                        )}
                    </div>
                )}

                {/* ── ACTIVE STATE: left panel + right feed ── */}
                {hasContent && (
                    <>
                        {/* Left: thin sidebar — icons only, no labels */}
                        <div className="flex-shrink-0 w-12 h-full hidden sm:flex flex-col items-center justify-start pt-6 gap-3 border-r border-white/[0.04]">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                onMouseEnter={() => setPlusHovered(true)}
                                onMouseLeave={() => setPlusHovered(false)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: plusHovered ? '0 0 16px rgba(96,165,250,0.3)' : 'none',
                                }}
                                title="Add files"
                            >
                                <MdAdd className={`text-lg transition-all duration-300 ${plusHovered ? 'text-blue-400 scale-110' : 'text-white/40'}`} />
                            </button>
                            <button
                                onClick={() => setShowCodeModal(true)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                title="Share code"
                            >
                                <MdCode className="text-lg text-white/40 group-hover:text-purple-400 transition-colors duration-300" />
                            </button>
                        </div>

                        {/* Right: content feed + message bar */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Feed — extra bottom padding on mobile for fixed bar */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 pb-20 sm:pb-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                                {allItems.map((item, i) => (
                                    <div
                                        key={`${item.timestamp}-${i}`}
                                        className="w-full min-w-0 flex flex-col"
                                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards' }}
                                    >
                                        {item.messageType === 'file' ? (() => {
                                            const xfer = fileTransfers[item.name];
                                            const isTransferring = xfer && !xfer.done;
                                            const pct = xfer?.progress ?? 100;
                                            const fileSize = xfer?.totalSize || item.size || 0;
                                            const transferred = xfer?.receivedSize != null
                                                ? xfer.receivedSize                    // receiver: exact bytes
                                                : fileSize ? (pct / 100) * fileSize : 0; // sender: estimate
                                            const speedBps = xfer?.elapsed > 0 ? transferred / xfer.elapsed : 0;
                                            const remaining = speedBps > 0 ? (item.size - transferred) / speedBps : 0;

                                            const fmtSpeed = (bps) => {
                                                if (bps > 1024 * 1024) return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
                                                if (bps > 1024) return (bps / 1024).toFixed(0) + ' KB/s';
                                                return bps.toFixed(0) + ' B/s';
                                            };
                                            const fmtEta = (s) => {
                                                if (s < 60) return `~${Math.ceil(s)}s left`;
                                                return `~${Math.ceil(s / 60)}m left`;
                                            };

                                            return (
                                                <div
                                                    className="group flex flex-col gap-2.5 px-4 py-3 rounded-2xl w-full max-w-xs sm:max-w-sm transition-all duration-300 hover:scale-[1.01]"
                                                    style={{
                                                        background: item.dir === 'sent' ? 'rgba(96,165,250,0.07)' : 'rgba(255,255,255,0.04)',
                                                        border: item.dir === 'sent' ? '1px solid rgba(96,165,250,0.15)' : '1px solid rgba(255,255,255,0.07)',
                                                        backdropFilter: 'blur(10px)',
                                                        marginLeft: item.dir === 'sent' ? 'auto' : '0',
                                                    }}
                                                >
                                                    {/* Top row: icon + name + download */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                            {getFileIcon(item.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white/90 truncate">{item.name}</p>
                                                            <p className="text-xs text-white/30">{formatSize(item.size)}</p>
                                                        </div>
                                                        {!isTransferring && item.url && item.dir === 'received' && (
                                                            <button
                                                                onClick={() => downloadFile(item)}
                                                                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                                                style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}
                                                            >
                                                                <MdDownload className="text-blue-400 text-base" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Inline progress bar */}
                                                    {isTransferring && (
                                                        <div className="space-y-1.5">
                                                            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                        background: xfer?.paused
                                                                            ? 'rgba(250,204,21,0.8)'
                                                                            : item.dir === 'sent'
                                                                                ? 'linear-gradient(90deg, rgba(96,165,250,0.9), rgba(147,197,253,1))'
                                                                                : 'linear-gradient(90deg, rgba(52,211,153,0.9), rgba(110,231,183,1))',
                                                                        boxShadow: xfer?.paused ? '0 0 6px rgba(250,204,21,0.5)' : item.dir === 'sent' ? '0 0 6px rgba(96,165,250,0.6)' : '0 0 6px rgba(52,211,153,0.6)',
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[11px] text-white/40 truncate">
                                                                    {formatSize(transferred)} / {formatSize(fileSize)}
                                                                    {speedBps > 0 && !xfer?.paused && <span className="ml-1.5 text-white/25">· {fmtSpeed(speedBps)}</span>}
                                                                    {xfer?.paused && <span className="ml-1.5 text-yellow-400/60">· Paused</span>}
                                                                </span>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <span className="text-[11px] text-white/30 mr-1">
                                                                        {pct < 100 && remaining > 0 && !xfer?.paused ? fmtEta(remaining) : `${pct}%`}
                                                                    </span>
                                                                    {/* Pause/Resume — only for sender */}
                                                                    {item.dir === 'sent' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handlePauseResume(item.name)}
                                                                                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                                                                style={{ background: 'rgba(255,255,255,0.08)' }}
                                                                                title={xfer?.paused ? 'Resume' : 'Pause'}
                                                                            >
                                                                                {xfer?.paused
                                                                                    ? <MdPlayArrow className="text-yellow-400 text-sm" />
                                                                                    : <MdPause className="text-white/60 text-sm" />
                                                                                }
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleCancel(item.name)}
                                                                                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                                                                style={{ background: 'rgba(255,255,255,0.08)' }}
                                                                                title="Cancel"
                                                                            >
                                                                                <MdCancel className="text-red-400/70 text-sm" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Done state */}
                                                    {!isTransferring && xfer?.done && (
                                                        <p className="text-[11px] text-emerald-400/70">
                                                            {item.dir === 'sent' ? '✓ Sent' : '✓ Received'}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })() : item.messageType === 'folder' ? (() => {
                                            const doneCount = item.files.filter(f => f.done).length;
                                            const total = item.files.length;
                                            const allDone = doneCount === total;
                                            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                                            const isExpanded = folders[item.folderName]?.expanded;

                                            return (
                                                <div
                                                    className="w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden transition-all duration-300"
                                                    style={{
                                                        background: item.dir === 'sent' ? 'rgba(96,165,250,0.07)' : 'rgba(255,255,255,0.04)',
                                                        border: item.dir === 'sent' ? '1px solid rgba(96,165,250,0.15)' : '1px solid rgba(255,255,255,0.07)',
                                                        marginLeft: item.dir === 'sent' ? 'auto' : '0',
                                                    }}
                                                >
                                                    {/* Folder header */}
                                                    <div
                                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                                                        onDoubleClick={() => setFolders(prev => ({
                                                            ...prev,
                                                            [item.folderName]: { ...prev[item.folderName], expanded: !prev[item.folderName]?.expanded }
                                                        }))}
                                                    >
                                                        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                            <MdFolder className="text-yellow-400 text-2xl" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white/90 truncate">{item.folderName}</p>
                                                            <p className="text-xs text-white/30">{doneCount}/{total} files{allDone ? ' · done' : ' · transferring'}</p>
                                                        </div>
                                                        {item.dir === 'received' && allDone && (
                                                            <button
                                                                onClick={() => downloadFolder(item.folderName, item)}
                                                                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                                                                style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}
                                                                title="Download as ZIP"
                                                            >
                                                                <MdDownload className="text-blue-400 text-base" />
                                                            </button>
                                                        )}
                                                        <span className="text-[10px] text-white/20 ml-1 hidden sm:inline">dbl-click</span>
                                                    </div>

                                                    {/* Progress bar */}
                                                    {!allDone && (
                                                        <div className="px-4 pb-3 space-y-1">
                                                            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                                <div className="h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg,rgba(96,165,250,0.9),rgba(147,197,253,1))', boxShadow: '0 0 6px rgba(96,165,250,0.6)' }} />
                                                            </div>
                                                            <p className="text-[11px] text-white/30">{pct}% · {doneCount} of {total} files</p>
                                                        </div>
                                                    )}

                                                    {/* Expanded file list */}
                                                    {isExpanded && (
                                                        <div className="border-t border-white/[0.06] max-h-48 overflow-y-auto">
                                                            {item.files.map((f, fi) => (
                                                                <div key={fi} className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] last:border-0">
                                                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                                        style={{ background: f.done ? '#34d399' : 'rgba(255,255,255,0.2)' }} />
                                                                    <span className="text-xs text-white/60 truncate flex-1">{f.relativePath || f.name}</span>
                                                                    <span className="text-[10px] text-white/25 flex-shrink-0">{formatSize(f.size)}</span>
                                                                    {f.done && f.url && item.dir === 'received' && (
                                                                        <button onClick={() => downloadFile(f)}
                                                                            className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-white/10">
                                                                            <MdDownload className="text-blue-400 text-xs" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })() : item.messageType === 'code' ? (
                                            <div
                                                className="w-full min-w-0 rounded-xl overflow-hidden"
                                                style={{
                                                    background: 'rgba(8,10,18,1)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    marginLeft: item.dir === 'sent' ? 'auto' : '0',
                                                    maxWidth: 'min(100%, 600px)',
                                                }}>
                                                {/* Title bar */}
                                                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]"
                                                    style={{ background: 'rgba(255,255,255,0.025)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{item.language || 'code'}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(item.content).then(() => toast.success('Copied'))}
                                                        className="text-[10px] text-white/25 hover:text-white/50 transition-colors px-2 py-0.5 rounded"
                                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                                    >copy</button>
                                                </div>
                                                {/* Code — horizontal scroll, no vertical expand */}
                                                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '320px' }}>
                                                    <pre className="p-4 text-xs font-mono text-white/75 leading-5 whitespace-pre m-0">
                                                        <code>{item.content}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`px-4 py-3 rounded-2xl text-sm text-white/80 leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${item.dir === 'sent' ? 'ml-auto' : ''}`}
                                                style={{
                                                    background: item.dir === 'sent' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
                                                    border: item.dir === 'sent' ? '1px solid rgba(96,165,250,0.2)' : '1px solid rgba(255,255,255,0.07)',
                                                    maxWidth: 'min(85%, 480px)',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'anywhere',
                                                }}
                                            >
                                                {item.content}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={feedEndRef} />
                            </div>

                            {/* Message bar — fixed bottom on mobile, static on desktop */}
                            <div className="fixed sm:static bottom-0 left-0 right-0 z-20 px-3 sm:px-4 py-3 border-t border-white/[0.04]"
                                style={{ background: 'rgba(5,5,8,0.97)', backdropFilter: 'blur(20px)' }}>
                                <div className="flex items-center gap-2 max-w-full">
                                    {/* Mobile-only action buttons */}
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="sm:hidden flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        <MdAdd className="text-lg text-white/50" />
                                    </button>
                                    <button
                                        onClick={() => setShowCodeModal(true)}
                                        className="sm:hidden flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        <MdCode className="text-base text-white/50" />
                                    </button>
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Message..."
                                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/20 outline-none"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || connectionStatus !== 'connected'}
                                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30"
                                        style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}
                                    >
                                        <MdSend className="text-blue-400 text-base" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Upload modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                    onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-3xl p-8 transition-all duration-300"
                        style={{
                            background: 'rgba(12,14,22,0.95)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(96,165,250,0.05)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-semibold text-white/80">Upload files</h3>
                            <button onClick={() => setShowUploadModal(false)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                                <MdClose className="text-white/40 text-lg" />
                            </button>
                        </div>

                        {/* Drop zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setModalDragOver(true); }}
                            onDragLeave={() => setModalDragOver(false)}
                            onDrop={handleModalDrop}
                            onClick={() => modalFileInputRef.current?.click()}
                            className="relative flex flex-col items-center justify-center gap-4 py-12 rounded-2xl cursor-pointer transition-all duration-300"
                            style={{
                                background: modalDragOver ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `2px dashed ${modalDragOver ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            }}
                        >
                            <div style={{ filter: 'drop-shadow(0 0 12px rgba(96,165,250,0.5))' }}>
                                <MdAdd className="text-5xl text-blue-400" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm text-white/60">Drop files here or <span className="text-blue-400">browse</span></p>
                                <p className="text-xs text-white/25">All file types supported</p>
                            </div>
                            <input ref={modalFileInputRef} type="file" multiple className="hidden" onChange={handleModalFileChange} />
                        </div>

                        {/* Folder upload */}
                        <button
                            onClick={() => folderInputRef.current?.click()}
                            className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm text-white/50 hover:text-white/70 transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
                        >
                            <MdFolder className="text-lg text-blue-400/60" />
                            Upload entire folder
                        </button>
                        <input
                            ref={folderInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFolderChange}
                            {...{ webkitdirectory: '', directory: '' }}
                            multiple
                        />
                    </div>
                </div>
            )}

            {/* Code modal */}
            {showCodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
                    onClick={(e) => e.target === e.currentTarget && setShowCodeModal(false)}
                >
                    <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
                        style={{
                            background: 'rgba(10,12,20,0.98)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                            maxHeight: '90vh',
                        }}>

                        {/* Header bar */}
                        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                </div>
                                <select
                                    value={codeLanguage}
                                    onChange={(e) => setCodeLanguage(e.target.value)}
                                    className="text-xs text-white/50 outline-none appearance-none cursor-pointer bg-transparent border-none"
                                >
                                    {['javascript','typescript','python','html','css','json','bash','rust','go','java','cpp','c'].map(l => (
                                        <option key={l} value={l} style={{ background: '#0a0c14' }}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-white/20 tabular-nums">
                                    {codeInput.split('\n').length} lines
                                </span>
                                <button onClick={() => setShowCodeModal(false)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                                    <MdClose className="text-white/40 text-base" />
                                </button>
                            </div>
                        </div>

                        {/* Editor — fixed height, never expands */}
                        <div className="flex-1 overflow-hidden" style={{ height: '50vh', minHeight: '180px', maxHeight: '60vh' }}>
                            <textarea
                                ref={codeInputRef}
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        const s = e.target.selectionStart;
                                        const end = e.target.selectionEnd;
                                        setCodeInput(v => v.substring(0, s) + '  ' + v.substring(end));
                                        setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }, 0);
                                    }
                                }}
                                placeholder="// Paste or type your code here..."
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                className="w-full h-full py-3 px-4 text-sm font-mono text-white/80 placeholder-white/15 outline-none resize-none leading-5 overflow-y-auto overflow-x-auto"
                                style={{ background: 'transparent', tabSize: 2, whiteSpace: 'pre', wordBreak: 'normal', overflowWrap: 'normal' }}
                            />
                        </div>

                        {/* Footer actions */}
                        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-t border-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <button onClick={() => { setCodeInput(''); setShowCodeModal(false); }}
                                className="px-4 py-2 rounded-xl text-xs text-white/30 hover:text-white/50 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                Clear
                            </button>
                            <div className="flex-1" />
                            <button onClick={() => setShowCodeModal(false)}
                                className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                Cancel
                            </button>
                            <button onClick={sendCode} disabled={!codeInput.trim()}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.3)' }}>
                                Send snippet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse-ring {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.06); opacity: 0.1; }
                }
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Thin smooth scrollbars everywhere in this page */
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.12);
                    border-radius: 999px;
                    transition: background 0.2s;
                }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
                ::-webkit-scrollbar-corner { background: transparent; }

                /* Firefox */
                * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
            `}</style>
        </div>
    );
}
