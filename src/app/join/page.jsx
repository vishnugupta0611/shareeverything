"use client";
import React, { Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";
import { MdSend, MdDownload, MdCode, MdClose, MdImage, MdVideoFile, MdPictureAsPdf, MdTextFields, MdAttachFile, MdQrCodeScanner } from "react-icons/md";
import { P2PConnection, BackendAPI, SocketSignaling } from "../../lib/webrtc";
import { useTheme } from "../../contexts/ThemeContext";
import CodeHighlighter from "../../components/CodeHighlighter";

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-400 border-t-transparent"></div></div>}>
            <JoinPageContent />
        </Suspense>
    );
}

function JoinPageContent() {
    const { isDark } = useTheme();
    const searchParams = useSearchParams();
    const [sessionKey, setSessionKey] = useState("");
    const [connectionStatus, setConnectionStatus] = useState("disconnected");
    const [p2pConnection, setP2pConnection] = useState(null);
    const [signaling, setSignaling] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("javascript");
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [transferProgress, setTransferProgress] = useState(null);
    const [isJoined, setIsJoined] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerStatus, setScannerStatus] = useState('idle'); // idle, loading, scanning, error, permission_denied

    const idRef = useRef(null);
    const scannerRef = useRef(null);
    const codeInputRef = useRef(null);

    // Combined items for display
    const allItems = React.useMemo(() => {
        return [...messages, ...receivedFiles.map(file => ({
            type: 'file',
            ...file,
            messageType: 'file'
        }))].sort((a, b) => a.timestamp - b.timestamp);
    }, [messages, receivedFiles]);

    // Connection status info
    const getConnectionInfo = React.useCallback(() => {
        switch (connectionStatus) {
            case 'connected':
                return { color: 'bg-green-500', text: '🟢 Connected & Ready', pulse: 'animate-pulse' };
            case 'connecting':
                return { color: 'bg-yellow-500', text: '🟡 Connecting...', pulse: 'animate-pulse' };
            case 'disconnected':
                return { color: 'bg-red-500', text: '🔴 Waiting to connect', pulse: '' };
            default:
                return { color: 'bg-gray-500', text: '⚪ Initializing', pulse: '' };
        }
    }, [connectionStatus]);

    const connectionInfo = React.useMemo(() => getConnectionInfo(), [getConnectionInfo]);

    useEffect(() => {
        setMounted(true);

        // Check for session key in URL parameters
        const keyFromUrl = searchParams.get('key');
        if (keyFromUrl && idRef.current) {
            idRef.current.value = keyFromUrl.toUpperCase();
            // Auto-join if key is provided via URL
            setTimeout(() => {
                joinSession();
            }, 500);
        }
    }, [searchParams]);

    // Stop and cleanup scanner
    const stopScanner = React.useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) { // SCANNING
                    await scannerRef.current.stop();
                }
            } catch (e) {
                // ignore cleanup errors
            }
            scannerRef.current = null;
        }
        setShowScanner(false);
        setScannerStatus('idle');
    }, []);

    // Start scanner
    const startScanner = React.useCallback(async () => {
        setShowScanner(true);
        setScannerStatus('loading');

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            // Wait for DOM
            await new Promise(r => setTimeout(r, 200));

            const scannerEl = document.getElementById('qr-scanner-video');
            if (!scannerEl) {
                setScannerStatus('error');
                return;
            }

            const html5Qrcode = new Html5Qrcode('qr-scanner-video');
            scannerRef.current = html5Qrcode;

            setScannerStatus('scanning');

            await html5Qrcode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Extract key from URL or use raw text
                    let key = decodedText;
                    try {
                        const url = new URL(decodedText);
                        const keyParam = url.searchParams.get('key');
                        if (keyParam) key = keyParam;
                    } catch {
                        // Not a URL, use as-is
                    }

                    key = key.trim().toUpperCase();
                    if (idRef.current) {
                        idRef.current.value = key;
                    }

                    toast.success(`🎯 QR Code scanned: ${key}`);

                    // Stop scanner and close modal
                    html5Qrcode.stop().then(() => {
                        scannerRef.current = null;
                        setShowScanner(false);
                        setScannerStatus('idle');

                        // Auto-join after closing
                        setTimeout(() => joinSession(), 300);
                    }).catch(() => {});
                },
                () => {
                    // Scan in progress, not an error
                }
            );
        } catch (error) {
            console.error('Scanner error:', error);
            if (error?.message?.includes('Permission') || error?.name === 'NotAllowedError') {
                setScannerStatus('permission_denied');
            } else {
                setScannerStatus('error');
            }
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().catch(() => {});
                } catch {}
                scannerRef.current = null;
            }
        };
    }, []);

    if (!mounted) return null;

    // Join session with Express backend
    const joinSession = async () => {
        const key = idRef.current?.value?.trim().toUpperCase();

        if (!key) {
            toast.error("⚠️ Please enter a session key");
            return;
        }

        setSessionKey(key);
        setConnectionStatus("connecting");

        try {
            // Check if session exists on Express backend
            const backendAPI = new BackendAPI();
            const sessionInfo = await backendAPI.checkSession(key);

            if (!sessionInfo.success || !sessionInfo.exists) {
                toast.error("❌ Session not found. Check your key.");
                setConnectionStatus("disconnected");
                return;
            }

            // Join session on Express backend
            await backendAPI.joinSession(key);

            // Setup Socket.io signaling
            const socketSignaling = new SocketSignaling(key);
            setSignaling(socketSignaling);

            // Connect to socket server
            await socketSignaling.connect();

            // Setup P2P connection
            const connection = new P2PConnection();
            setP2pConnection(connection);

            // Setup event listeners
            connection.onConnectionStateChange((status) => {
                setConnectionStatus(status);
                if (status === 'connected') {
                    toast.success("🎉 Connected! Ready to receive files and messages!");
                    setIsJoined(true);
                } else if (status === 'disconnected') {
                    toast.error("Connection lost. Trying to reconnect...");
                } else if (status === 'connecting') {
                    toast.loading("Establishing secure connection...");
                }
            });

            connection.onMessageReceived((data) => {
                if (data.type === 'message') {
                    setMessages(prev => [...prev, {
                        ...data,
                        type: 'received',
                        messageType: 'message',
                        timestamp: data.timestamp || Date.now()
                    }]);
                } else if (data.type === 'code') {
                    setMessages(prev => [...prev, {
                        ...data,
                        type: 'received',
                        messageType: 'code',
                        timestamp: data.timestamp || Date.now()
                    }]);
                }
            });

            connection.onFileReceived((file) => {
                const blob = new Blob([file.data], { type: file.type });
                const url = URL.createObjectURL(blob);

                setReceivedFiles(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: url,
                    timestamp: Date.now()
                }]);

                toast.success(`📁 File received: ${file.name}`);
            });

            connection.onTransferProgressChange((progress) => {
                setTransferProgress(progress);
                if (progress.progress === 100) {
                    setTimeout(() => setTransferProgress(null), 2000);
                }
            });

            // Handle WebRTC signaling through Socket.io
            socketSignaling.onSignalReceived(async (data) => {
                if (data.signal.type === 'offer') {
                    // Create answer
                    const answer = await connection.createAnswer(data.signal);
                    // Send answer back through socket
                    socketSignaling.sendSignal(answer, data.from);
                } else if (data.signal.type === 'ice-candidate') {
                    await connection.addIceCandidate(data.signal.candidate);
                }
            });

            // Send ICE candidates through socket
            connection.onIceCandidate((candidate) => {
                socketSignaling.sendSignal({
                    type: 'ice-candidate',
                    candidate: candidate
                });
            });

            toast.success("🔍 Found session! Redirecting to share page...");

            // Redirect to sharedata page
            setTimeout(() => {
                window.location.href = `/sharedata?key=${key}`;
            }, 1000);

        } catch (error) {
            console.error('Error joining session:', error);
            toast.error("❌ Failed to join session. Please try again.");
            setConnectionStatus("disconnected");
        }
    };

    // Send text message
    const sendMessage = () => {
        if (!messageInput.trim() || connectionStatus !== 'connected') return;

        p2pConnection.sendMessage(messageInput);
        setMessages(prev => [...prev, {
            type: 'sent',
            messageType: 'message',
            content: messageInput,
            timestamp: Date.now()
        }]);
        setMessageInput("");
    };

    // Send code snippet
    const sendCode = () => {
        if (!codeInput.trim() || connectionStatus !== 'connected') return;

        p2pConnection.sendCode(codeInput, codeLanguage);
        setMessages(prev => [...prev, {
            type: 'sent',
            messageType: 'code',
            content: codeInput,
            language: codeLanguage,
            timestamp: Date.now()
        }]);
        setCodeInput("");
        setShowCodeModal(false);
        toast.success("💻 Code snippet sent!");
    };

    // Download received file
    const downloadFile = (file) => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`📥 Downloaded: ${file.name}`);
    };

    // Handle file sharing
    const handleFileShare = async (file) => {
        if (connectionStatus !== 'connected') {
            toast.error("⚠️ Wait for connection first!");
            return;
        }

        if (!p2pConnection) {
            toast.error("❌ Connection not established!");
            return;
        }

        try {
            toast.loading(`📤 Sending ${file.name}...`);
            await p2pConnection.sendFile(file);
            toast.dismiss();
            toast.success(`✅ File sent: ${file.name}`);
        } catch (error) {
            console.error('Error sending file:', error);
            toast.dismiss();
            toast.error("❌ Failed to send file.");
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };



    return (
        <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} transition-all duration-500 overflow-x-hidden`}>
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-12 max-w-6xl">

                {!isJoined ? (/* Professional Join Session UI */
<div className="flex flex-col items-center justify-center min-h-screen px-4 lg:py-0 md:py-0 py-8">
    {/* Professional Header */}
    <div className="text-center mb-8 sm:mb-12 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-400/10 border border-lime-400/20 mb-6">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
            <span className="text-lime-400 text-sm font-medium">Secure P2P Transfer</span>
        </div>
        
        <h1 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
            Join Session
        </h1>
        
        <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
            Connect securely with enterprise-grade encryption
        </p>
    </div>

    {/* Main Card */}
    <div className="w-full max-w-md">
        {/* Primary Action: QR Scanner */}
        <div className="mb-4">
            <button
                onClick={startScanner}
                className="group w-full relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 transition-all duration-300 hover:shadow-2xl hover:shadow-lime-400/30 hover:scale-[1.02]"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-black/10 backdrop-blur-sm">
                            <MdQrCodeScanner className="text-3xl text-black" />
                        </div>
                        <div className="text-left">
                            <div className="text-black font-bold text-lg mb-0.5">Scan QR Code</div>
                            <div className="text-black/70 text-sm font-medium">Fastest connection method</div>
                        </div>
                    </div>
                    <div className="text-black/50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700/50"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="px-4 text-sm text-gray-500 bg-black">or enter manually</span>
            </div>
        </div>

        {/* Manual Input Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-xl shadow-xl">
            <div className="space-y-5">
                {/* Input Label */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                        Session Code
                    </label>
                    <div className="relative">
                        <input
                            ref={idRef}
                            type="text"
                            placeholder="ABC123"
                            className="w-full px-4 py-4 rounded-xl bg-gray-800/50 border-2 border-gray-700/50 text-white text-center text-xl font-mono font-bold tracking-[0.3em] uppercase placeholder:text-gray-600 placeholder:tracking-normal focus:outline-none focus:border-lime-400/50 focus:bg-gray-800/80 transition-all duration-300"
                            onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                            maxLength={6}
                            autoComplete="off"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-xs font-medium">
                            6 digits
                        </div>
                    </div>
                </div>

                {/* Join Button */}
                <button
                    onClick={joinSession}
                    disabled={connectionStatus === 'connecting'}
                    className="w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white font-semibold text-base transition-all duration-300 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 group"
                >
                    {connectionStatus === 'connecting' ? (
                        <span className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                            <span>Connecting...</span>
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                            <span>Join Session</span>
                            <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Security Features */}
        <div className="mt-8 space-y-3">
            {[
                { icon: "🔒", text: "End-to-end encryption" },
                { icon: "⚡", text: "Direct peer-to-peer connection" },
                { icon: "🚫", text: "No data stored on servers" }
            ].map((feature, index) => (
                <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/30 border border-gray-800/30 backdrop-blur-sm"
                >
                    <span className="text-lg flex-shrink-0">{feature.icon}</span>
                    <span className="text-sm text-gray-400 font-medium">{feature.text}</span>
                </div>
            ))}
        </div>
    </div>

    {/* Footer Info */}
    <div className="mt-12 text-center">
        <p className="text-xs text-gray-500">
            No account required • Session expires after disconnection
        </p>
    </div>
</div>) : (
                    /* Connected Session UI - Fixed Layout */
                    <div className="space-y-6">
                        {/* Session Info Panel */}
                        <div className={`p-4 sm:p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md transition-all duration-300`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1.5 rounded-full bg-lime-400 flex items-center justify-center">
                                        <span className="text-black font-bold text-xs sm:text-sm font-mono">{sessionKey}</span>
                                    </div>
                                    <div>
                                        <h3 className={`text-base sm:text-lg font-bold text-white`}>
                                            Connected to Session
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${connectionInfo.color} ${connectionInfo.pulse}`}></div>
                                            <span className={`text-sm text-gray-400`}>
                                                {connectionInfo.text}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* File Sharing Grid */}
                        {connectionStatus === 'connected' && (
                            <div className={`p-4 sm:p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border mb-4 sm:mb-6`}>
                                <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-4 sm:mb-6">Share Files</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                    <div onClick={() => document.getElementById('image-input').click()} className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
                                                <span className="text-2xl">🖼️</span>
                                            </div>
                                            <p className="text-white font-medium text-sm">Images</p>
                                            <input id="image-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="image/*" className="hidden" />
                                        </div>
                                    </div>

                                    <div onClick={() => document.getElementById('video-input').click()} className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                                                <span className="text-2xl">🎥</span>
                                            </div>
                                            <p className="text-white font-medium text-sm">Videos</p>
                                            <input id="video-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="video/*" className="hidden" />
                                        </div>
                                    </div>

                                    <div onClick={() => document.getElementById('pdf-input').click()} className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                                                <span className="text-2xl">📄</span>
                                            </div>
                                            <p className="text-white font-medium text-sm">Documents</p>
                                            <input id="pdf-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="application/pdf" className="hidden" />
                                        </div>
                                    </div>

                                    <div onClick={() => document.getElementById('text-input').click()} className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                                <span className="text-2xl">📝</span>
                                            </div>
                                            <p className="text-white font-medium text-sm">Text Files</p>
                                            <input id="text-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="text/plain" className="hidden" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content Feed - Fixed Height, No Bento Rerendering */}
                        <div className={`h-[50vh] sm:h-[65vh] overflow-y-auto p-3 sm:p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border`}>
                            {allItems.length === 0 ? (
                                <div className={`h-full flex items-center justify-center text-gray-400`}>
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">📊</div>
                                        <h3 className="text-2xl font-bold mb-2">Ready to Receive</h3>
                                        <p className="text-lg">Files, images, documents, and messages will appear here</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {allItems.map((item, index) => (
                                        <div key={`${item.timestamp}-${index}`} className={`p-3 sm:p-4 rounded-xl bg-gray-800 bg-opacity-60 backdrop-blur-sm shadow-lg border border-gray-700 border-opacity-30 group hover:scale-[1.01] transition-all duration-300`}>
                                            {item.messageType === 'file' ? (
                                                <div className="flex items-start gap-2 sm:gap-4">
                                                    <button
                                                        onClick={() => downloadFile(item)}
                                                        className="flex-shrink-0 p-2 bg-lime-400 hover:bg-lime-300 text-black rounded-full transition-all duration-300 shadow-lg"
                                                    >
                                                        <MdDownload className="text-lg" />
                                                    </button>

                                                    {/* File Preview */}
                                                    <div className="flex-1 min-w-0">
                                                        {item.type.startsWith('image/') ? (
                                                            <div className="space-y-3">
                                                                <img
                                                                    src={item.url}
                                                                    alt={item.name}
                                                                    className="max-w-full h-auto max-h-64 object-contain rounded-lg bg-gray-700"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.nextSibling.style.display = 'block';
                                                                    }}
                                                                />
                                                                <div className="hidden p-4 bg-gray-700 rounded-lg text-center">
                                                                    <div className="text-2xl mb-2">🖼️</div>
                                                                    <p className="text-sm text-gray-300">Image preview not available</p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-medium text-white truncate">{item.name}</h4>
                                                                    <p className="text-sm text-gray-400">{formatFileSize(item.size)}</p>
                                                                </div>
                                                            </div>
                                                        ) : item.type.startsWith('video/') ? (
                                                            <div className="space-y-3">
                                                                <video
                                                                    src={item.url}
                                                                    controls
                                                                    className="max-w-full h-auto max-h-64 rounded-lg bg-gray-700"
                                                                    preload="metadata"
                                                                />
                                                                <div>
                                                                    <h4 className="font-medium text-white truncate">{item.name}</h4>
                                                                    <p className="text-sm text-gray-400">{formatFileSize(item.size)}</p>
                                                                </div>
                                                            </div>
                                                        ) : item.type.includes('pdf') ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                                                                    <span className="text-white text-lg">📄</span>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-white truncate">{item.name}</h4>
                                                                    <p className="text-sm text-gray-400">{formatFileSize(item.size)} • PDF Document</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                                                    <span className="text-white text-lg">📎</span>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-white truncate">{item.name}</h4>
                                                                    <p className="text-sm text-gray-400">{formatFileSize(item.size)} • {item.type || 'File'}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-gray-500 flex-shrink-0">
                                                        {new Date(item.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            ) : item.messageType === 'code' ? (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="text-lg">💻</div>
                                                        <span className="text-sm font-medium text-purple-300">
                                                            Code ({item.language || 'text'})
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-auto">
                                                            {new Date(item.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <div className={`p-3 rounded-lg bg-gray-900 bg-opacity-50 border border-gray-700 border-opacity-50 overflow-x-auto`}>
                                                        <CodeHighlighter
                                                            code={item.content}
                                                            language={item.language || 'javascript'}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="text-lg">💬</div>
                                                        <span className="text-sm font-medium text-green-300">Message</span>
                                                        <span className="text-xs text-gray-500 ml-auto">
                                                            {new Date(item.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-white leading-relaxed">{item.content}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className={`p-3 sm:p-4 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border`}>
                            <div className="flex gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    className={`flex-1 min-w-0 p-3 sm:p-4 rounded-full bg-gray-800 bg-opacity-50 border-gray-700 text-white border placeholder-gray-400 focus:outline-none focus:border-lime-400 transition-all duration-300 text-sm sm:text-base`}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!messageInput.trim()}
                                    className="px-4 sm:px-6 py-3 sm:py-4 bg-lime-400 text-black rounded-full transition-all duration-300 hover:scale-105 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <MdSend className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setShowCodeModal(true)}
                                    className="px-4 sm:px-6 py-3 sm:py-4 bg-purple-500 text-white rounded-full transition-all duration-300 hover:scale-105 hover:bg-purple-400 flex-shrink-0"
                                >
                                    <MdCode className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transfer Progress */}
                {transferProgress && (
                    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:bottom-6 z-50">
                        <div className={`p-3 sm:p-4 rounded-2xl bg-gray-900 bg-opacity-90 border-gray-800 border backdrop-blur-md shadow-2xl`}>
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-lime-400 border-t-transparent flex-shrink-0"></div>
                                <span className={`font-medium text-white text-sm sm:text-base truncate`}>
                                    {transferProgress.type === 'sending' ? '📤 Sending' : '📥 Receiving'}: {transferProgress.fileName}
                                </span>
                            </div>
                            <div className={`w-full sm:w-64 h-2 rounded-full bg-gray-800 overflow-hidden`}>
                                <div
                                    className="h-full bg-lime-400 transition-all duration-300 rounded-full"
                                    style={{ width: `${transferProgress.progress}%` }}
                                />
                            </div>
                            <div className={`text-sm text-gray-400 mt-1 text-right`}>
                                {transferProgress.progress}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Code Modal */}
                {showCodeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 sm:p-6 bg-gray-900 bg-opacity-50 border-gray-800 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
                                        <MdCode className="text-2xl text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-2xl font-bold text-white">Share Code Snippet</h3>
                                        <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Write and share code with syntax highlighting</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCodeModal(false)}
                                    className="p-3 rounded-xl hover:bg-gray-800 text-white transition-colors"
                                >
                                    <MdClose className="text-2xl" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <div className="space-y-6">
                                    {/* Language Selector */}
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-3">
                                            Programming Language
                                        </label>
                                        <select
                                            value={codeLanguage}
                                            onChange={(e) => setCodeLanguage(e.target.value)}
                                            className="w-full p-4 rounded-xl bg-gray-800 bg-opacity-50 border-gray-700 border text-white focus:outline-none focus:border-lime-400 transition-all duration-300"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="json">JSON</option>
                                            <option value="markdown">Markdown</option>
                                            <option value="sql">SQL</option>
                                            <option value="bash">Bash</option>
                                        </select>
                                    </div>

                                    {/* Code Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-3">
                                            Code Content
                                        </label>
                                        <textarea
                                            ref={codeInputRef}
                                            value={codeInput}
                                            onChange={(e) => setCodeInput(e.target.value)}
                                            placeholder={`Enter your ${codeLanguage} code here...`}
                                            className="w-full h-40 sm:h-64 p-3 sm:p-4 rounded-xl bg-gray-800 bg-opacity-50 border-gray-700 border text-white placeholder-gray-400 focus:outline-none focus:border-lime-400 transition-all duration-300 font-mono text-xs sm:text-sm resize-none"
                                        />
                                    </div>

                                    {/* Preview */}
                                    {codeInput && (
                                        <div>
                                            <label className="block text-sm font-semibold text-white mb-3">
                                                Preview
                                            </label>
                                            <div className="p-4 rounded-xl bg-gray-800 bg-opacity-50 border-gray-700 border overflow-x-auto">
                                                <CodeHighlighter
                                                    code={codeInput}
                                                    language={codeLanguage}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-900 bg-opacity-50 border-gray-800 border-t">
                                <button
                                    onClick={() => setShowCodeModal(false)}
                                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors border border-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={sendCode}
                                    disabled={!codeInput.trim() || connectionStatus !== 'connected'}
                                    className="px-8 py-3 bg-lime-400 text-black rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="flex items-center gap-2">
                                        <MdSend className="text-lg" />
                                        Send Code
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* QR Scanner Modal */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center">
                        {/* Close Button */}
                        <button
                            onClick={stopScanner}
                            className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-md border border-white/20"
                        >
                            <MdClose className="text-2xl" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-lime-400/10 border border-lime-400/30 mb-4">
                                <MdQrCodeScanner className="text-lime-400 text-xl" />
                                <span className="text-lime-400 font-semibold">QR Code Scanner</span>
                            </div>
                            <p className="text-gray-400 text-sm">Point your camera at the QR code to scan</p>
                        </div>

                        {/* Scanner Area */}
                        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] rounded-2xl overflow-hidden border-2 border-lime-400/50 shadow-[0_0_40px_rgba(163,230,53,0.15)]">
                            {/* Camera Feed */}
                            <div id="qr-scanner-video" className="w-full h-full"></div>

                            {/* Scanning Overlay - Animated Line */}
                            {scannerStatus === 'scanning' && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Corner markers */}
                                    <div className="absolute top-4 left-4 w-8 h-8 border-t-3 border-l-3 border-lime-400 rounded-tl-lg" style={{borderWidth: '3px 0 0 3px'}}></div>
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-3 border-r-3 border-lime-400 rounded-tr-lg" style={{borderWidth: '3px 3px 0 0'}}></div>
                                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-3 border-l-3 border-lime-400 rounded-bl-lg" style={{borderWidth: '0 0 3px 3px'}}></div>
                                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-3 border-r-3 border-lime-400 rounded-br-lg" style={{borderWidth: '0 3px 3px 0'}}></div>

                                    {/* Scanning Line Animation */}
                                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-bounce" style={{animation: 'scanLine 2s ease-in-out infinite', top: '50%'}}></div>
                                </div>
                            )}

                            {/* Loading State */}
                            {scannerStatus === 'loading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
                                    <div className="animate-spin rounded-full h-12 w-12 border-3 border-lime-400 border-t-transparent mb-4" style={{borderWidth: '3px'}}></div>
                                    <p className="text-white font-medium text-lg">Starting Camera...</p>
                                    <p className="text-gray-400 text-sm mt-2">Please allow camera access when prompted</p>
                                </div>
                            )}

                            {/* Permission Denied State */}
                            {scannerStatus === 'permission_denied' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 p-6 text-center">
                                    <div className="text-5xl mb-4">🚫</div>
                                    <h3 className="text-white font-bold text-xl mb-2">Camera Access Denied</h3>
                                    <p className="text-gray-400 text-sm mb-6 max-w-xs">
                                        Please allow camera access in your browser settings to scan QR codes.
                                    </p>
                                    <div className="space-y-3 text-left text-sm text-gray-500 bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6">
                                        <p>📍 Click the 🔒 icon in your address bar</p>
                                        <p>📍 Find &quot;Camera&quot; and select &quot;Allow&quot;</p>
                                        <p>📍 Reload the page and try again</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={stopScanner}
                                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => { stopScanner(); setTimeout(startScanner, 300); }}
                                            className="px-6 py-3 bg-lime-400 text-black rounded-xl font-bold hover:bg-lime-300 transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* General Error State */}
                            {scannerStatus === 'error' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 p-6 text-center">
                                    <div className="text-5xl mb-4">⚠️</div>
                                    <h3 className="text-white font-bold text-xl mb-2">Scanner Error</h3>
                                    <p className="text-gray-400 text-sm mb-6">
                                        Could not start the camera. Make sure no other app is using it.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={stopScanner}
                                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => { stopScanner(); setTimeout(startScanner, 300); }}
                                            className="px-6 py-3 bg-lime-400 text-black rounded-xl font-bold hover:bg-lime-300 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Tip */}
                        {scannerStatus === 'scanning' && (
                            <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                                <span className="text-gray-400 text-sm">Camera active — scanning for QR codes...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Scan Line Animation Style */}
                <style jsx>{`
                    @keyframes scanLine {
                        0%, 100% { top: 15%; opacity: 0.5; }
                        50% { top: 80%; opacity: 1; }
                    }
                `}</style>
            </div>
        </div>
    );
}