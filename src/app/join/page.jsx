"use client";
import React, { Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";
import { MdSend, MdDownload, MdCode, MdClose, MdImage, MdVideoFile, MdPictureAsPdf, MdTextFields, MdAttachFile } from "react-icons/md";
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

    const idRef = useRef(null);
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
        <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} transition-all duration-500`}>
            <div className="container mx-auto px-6 py-12 max-w-6xl">

                {!isJoined ? (
                    /* Join Session UI */
                    <div className="flex flex-col items-center justify-center min-h-screen">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Join Session
                            </h1>
                            <p className={`text-xl md:text-2xl ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-3xl mx-auto leading-relaxed`}>
                                Enter the session key to connect and start receiving files instantly with{" "}
                                <span className="text-lime-400 font-semibold">zero servers</span>
                                , peer-to-peer connections, and military-grade security.
                            </p>
                        </div>

                        {/* Join Form */}
                        <div className={`w-full max-w-md p-8 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md transition-all duration-300`}>
                            <div className="space-y-6">
                                <div>
                                    <label className={`block text-sm font-medium text-gray-400 mb-3`}>
                                        Session Key
                                    </label>
                                    <input
                                        ref={idRef}
                                        type="text"
                                        placeholder="Enter 6-digit key (e.g. ABC123)"
                                        className={`w-full p-4 rounded-xl bg-gray-800 bg-opacity-50 border-gray-700 text-white border placeholder-gray-400 focus:outline-none focus:border-lime-400 transition-all duration-300 text-center text-lg font-mono tracking-wider uppercase`}
                                        onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                                        maxLength={6}
                                    />
                                </div>

                                <button
                                    onClick={joinSession}
                                    disabled={connectionStatus === 'connecting'}
                                    className="w-full py-4 bg-lime-400 text-black rounded-full shadow-xl transition-all duration-300 hover:scale-105 hover:bg-lime-300 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        {connectionStatus === 'connecting' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-2xl">🔗</span>
                                                Join Session
                                            </>
                                        )}
                                    </span>
                                </button>

                                <div className={`text-center text-gray-400 text-sm`}>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span>Secure P2P Connection</span>
                                    </div>
                                    <p>No account required • End-to-end encrypted</p>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl">
                            {[
                                { icon: "🔒", title: "Secure Transfer", desc: "Direct peer-to-peer encryption" },
                                { icon: "⚡", title: "Instant Connection", desc: "Connect in seconds with just a key" },
                                { icon: "📱", title: "Any Device", desc: "Works on mobile, tablet, and desktop" }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className={`text-center p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md transition-all duration-300 hover:scale-105`}
                                >
                                    <div className="text-3xl mb-3">{feature.icon}</div>
                                    <h3 className={`font-bold text-white mb-2`}>{feature.title}</h3>
                                    <p className={`text-sm text-gray-400`}>{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Connected Session UI - Fixed Layout */
                    <div className="space-y-6">
                        {/* Session Info Panel */}
                        <div className={`p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md transition-all duration-300`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center">
                                        <span className="text-black font-bold text-sm">{sessionKey}</span>
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold text-white`}>
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
                            <div className={`p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border mb-6`}>
                                <h3 className="text-2xl font-bold text-white text-center mb-6">Share Files</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <div className={`h-[65vh] overflow-y-auto p-6 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border`}>
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
                                        <div key={`${item.timestamp}-${index}`} className={`p-4 rounded-xl bg-gray-800 bg-opacity-60 backdrop-blur-sm shadow-lg border border-gray-700 border-opacity-30 group hover:scale-[1.01] transition-all duration-300`}>
                                            {item.messageType === 'file' ? (
                                                <div className="flex items-start gap-4">
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
                        <div className={`p-4 rounded-2xl bg-gray-900 bg-opacity-50 border-gray-800 border`}>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    className={`flex-1 p-4 rounded-full bg-gray-800 bg-opacity-50 border-gray-700 text-white border placeholder-gray-400 focus:outline-none focus:border-lime-400 transition-all duration-300`}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!messageInput.trim()}
                                    className="px-6 py-4 bg-lime-400 text-black rounded-full transition-all duration-300 hover:scale-105 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <MdSend className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setShowCodeModal(true)}
                                    className="px-6 py-4 bg-purple-500 text-white rounded-full transition-all duration-300 hover:scale-105 hover:bg-purple-400"
                                >
                                    <MdCode className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transfer Progress */}
                {transferProgress && (
                    <div className="fixed bottom-6 left-6 z-50">
                        <div className={`p-4 rounded-2xl bg-gray-900 bg-opacity-90 border-gray-800 border backdrop-blur-md shadow-2xl`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-lime-400 border-t-transparent"></div>
                                <span className={`font-medium text-white`}>
                                    {transferProgress.type === 'sending' ? '📤 Sending' : '📥 Receiving'}: {transferProgress.fileName}
                                </span>
                            </div>
                            <div className={`w-64 h-2 rounded-full bg-gray-800 overflow-hidden`}>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-gray-900 bg-opacity-50 border-gray-800 border backdrop-blur-md shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 bg-gray-900 bg-opacity-50 border-gray-800 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
                                        <MdCode className="text-2xl text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Share Code Snippet</h3>
                                        <p className="text-gray-400 text-sm">Write and share code with syntax highlighting</p>
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
                            <div className="flex-1 overflow-y-auto p-6">
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
                                            className="w-full h-64 p-4 rounded-xl bg-gray-800 bg-opacity-50 border-gray-700 border text-white placeholder-gray-400 focus:outline-none focus:border-lime-400 transition-all duration-300 font-mono text-sm resize-none"
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
                            <div className="flex items-center justify-end gap-4 p-6 bg-gray-900 bg-opacity-50 border-gray-800 border-t">
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
            </div>
        </div>
    );
}