"use client";
import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";
import { MdSend, MdDownload, MdCode, MdClose, MdImage, MdVideoFile, MdPictureAsPdf, MdTextFields } from "react-icons/md";
import { P2PConnection, BackendAPI, SocketSignaling } from "../../lib/webrtc";
import { useTheme } from "../../contexts/ThemeContext";
import CodeHighlighter from "../../components/CodeHighlighter";

export default function ShareDataPage() {
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
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    const codeInputRef = useRef(null);

    // Join session and setup WebRTC
    const joinSession = React.useCallback(async (key) => {
        setConnectionStatus("connecting");

        try {
            const backendAPI = new BackendAPI();
            const sessionInfo = await backendAPI.checkSession(key);

            if (!sessionInfo.success || !sessionInfo.exists) {
                toast.error("❌ Session not found.");
                return;
            }

            await backendAPI.joinSession(key);

            const socketSignaling = new SocketSignaling(key);
            setSignaling(socketSignaling);
            await socketSignaling.connect();

            const connection = new P2PConnection();
            setP2pConnection(connection);

            connection.onConnectionStateChange((status) => {
                setConnectionStatus(status);
                if (status === 'connected') {
                    toast.success("🎉 Connected! Ready to share!");
                } else if (status === 'disconnected') {
                    toast.error("Connection lost. Trying to reconnect...");
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

            // Handle WebRTC signaling
            socketSignaling.onSignalReceived(async (data) => {
                if (data.signal.type === 'offer') {
                    const answer = await connection.createAnswer(data.signal);
                    socketSignaling.sendSignal(answer, data.from);
                } else if (data.signal.type === 'answer') {
                    await connection.setRemoteAnswer(data.signal);
                } else if (data.signal.type === 'ice-candidate') {
                    await connection.addIceCandidate(data.signal.candidate);
                }
            });

            // Wait for user to join, then send offer
            socketSignaling.onUserJoinedRoom(async (data) => {
                console.log('User joined, sending offer...');
                try {
                    const offer = await connection.createOffer();
                    socketSignaling.sendSignal(offer, data.userId);
                } catch (error) {
                    console.error('Error creating offer:', error);
                }
            });

            connection.onIceCandidate((candidate) => {
                socketSignaling.sendSignal({
                    type: 'ice-candidate',
                    candidate: candidate
                });
            });

            toast.success("🔍 Connected to session!");

        } catch (error) {
            console.error('Error joining session:', error);
            toast.error("❌ Failed to join session.");
            setConnectionStatus("disconnected");
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        const keyFromUrl = searchParams.get('key');
        if (keyFromUrl && mounted) {
            setSessionKey(keyFromUrl);
            joinSession(keyFromUrl);
        }
    }, [searchParams, mounted, joinSession]);

    if (!mounted) return null;

    // Handle file sharing
    const handleFileShare = async (file) => {
        if (connectionStatus !== 'connected') {
            toast.error("⚠️ Wait for connection first!");
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

    // Send message
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

    // Send code
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

    // Download file
    const downloadFile = (file) => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`📥 Downloaded: ${file.name}`);
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getConnectionInfo = () => {
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
    };

    const connectionInfo = getConnectionInfo();
    const allItems = [...messages, ...receivedFiles.map(file => ({
        type: 'file',
        ...file,
        messageType: 'file'
    }))].sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="container mx-auto px-6 py-8 max-w-6xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className={`text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Share Data - Session {sessionKey}
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connectionInfo.color} ${connectionInfo.pulse}`}></div>
                        <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {connectionInfo.text}
                        </span>
                    </div>
                </div>

                {/* File Sharing Grid */}
                {connectionStatus === 'connected' && (
                    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-100/50'} ${isDark ? 'border-gray-800' : 'border-gray-200'} border mb-6`}>
                        <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-center mb-6`}>Share Files</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div onClick={() => document.getElementById('image-input').click()} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-300'} border cursor-pointer transition-all duration-300 hover:scale-105`}>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
                                        <MdImage className="text-2xl text-white" />
                                    </div>
                                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>Images</p>
                                    <input id="image-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="image/*" className="hidden" />
                                </div>
                            </div>

                            <div onClick={() => document.getElementById('video-input').click()} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-300'} border cursor-pointer transition-all duration-300 hover:scale-105`}>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                                        <MdVideoFile className="text-2xl text-white" />
                                    </div>
                                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>Videos</p>
                                    <input id="video-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="video/*" className="hidden" />
                                </div>
                            </div>

                            <div onClick={() => document.getElementById('pdf-input').click()} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-300'} border cursor-pointer transition-all duration-300 hover:scale-105`}>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                                        <MdPictureAsPdf className="text-2xl text-white" />
                                    </div>
                                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>Documents</p>
                                    <input id="pdf-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="application/pdf" className="hidden" />
                                </div>
                            </div>

                            <div onClick={() => document.getElementById('text-input').click()} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-300'} border cursor-pointer transition-all duration-300 hover:scale-105`}>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                        <MdTextFields className="text-2xl text-white" />
                                    </div>
                                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>Text Files</p>
                                    <input id="text-input" type="file" onChange={(e) => e.target.files[0] && handleFileShare(e.target.files[0])} accept="text/plain" className="hidden" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Feed */}
                <div className={`h-[60vh] overflow-y-auto p-6 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-100/50'} ${isDark ? 'border-gray-800' : 'border-gray-200'} border mb-4`}>
                    {allItems.length === 0 ? (
                        <div className={`h-full flex items-center justify-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <div className="text-center">
                                <div className="text-6xl mb-4">📊</div>
                                <h3 className="text-2xl font-bold mb-2">Ready to Share</h3>
                                <p className="text-lg">Files, images, documents, and messages will appear here</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {allItems.map((item, index) => (
                                <div key={`${item.timestamp}-${index}`} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/60' : 'bg-white/60'} backdrop-blur-sm shadow-lg ${isDark ? 'border-gray-700' : 'border-gray-300'} border group hover:scale-[1.01] transition-all duration-300`}>
                                    {item.messageType === 'file' ? (
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => downloadFile(item)}
                                                className="flex-shrink-0 p-2 bg-lime-400 hover:bg-lime-300 text-black rounded-full transition-all duration-300 shadow-lg"
                                            >
                                                <MdDownload className="text-lg" />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                {item.type.startsWith('image/') ? (
                                                    <div className="space-y-3">
                                                        <img src={item.url} alt={item.name} className="max-w-full h-auto max-h-64 object-contain rounded-lg" />
                                                        <div>
                                                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{item.name}</h4>
                                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatFileSize(item.size)}</p>
                                                        </div>
                                                    </div>
                                                ) : item.type.startsWith('video/') ? (
                                                    <div className="space-y-3">
                                                        <video src={item.url} controls className="max-w-full h-auto max-h-64 rounded-lg" preload="metadata" />
                                                        <div>
                                                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{item.name}</h4>
                                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatFileSize(item.size)}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                                            <span className="text-white text-lg">📎</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{item.name}</h4>
                                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatFileSize(item.size)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} flex-shrink-0`}>
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ) : item.messageType === 'code' ? (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="text-lg">💻</div>
                                                <span className="text-sm font-medium text-purple-300">Code ({item.language || 'text'})</span>
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} ml-auto`}>
                                                    {new Date(item.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-100/50 border-gray-300'} border overflow-x-auto`}>
                                                <CodeHighlighter code={item.content} language={item.language || 'javascript'} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="text-lg">💬</div>
                                                <span className="text-sm font-medium text-green-300">Message</span>
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} ml-auto`}>
                                                    {new Date(item.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className={`${isDark ? 'text-white' : 'text-gray-900'} leading-relaxed`}>{item.content}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Message Input */}
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-100/50 border-gray-200'} border`}>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                            className={`flex-1 p-4 rounded-full ${isDark ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400' : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'} border focus:outline-none focus:border-lime-400 transition-all duration-300`}
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

                {/* Code Modal */}
                {showCodeModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className={`w-full max-w-2xl ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Share Code Snippet</h3>
                                <button onClick={() => setShowCodeModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
                                    <MdClose className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <select
                                    value={codeLanguage}
                                    onChange={(e) => setCodeLanguage(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:border-lime-400`}
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="html">HTML</option>
                                    <option value="css">CSS</option>
                                    <option value="json">JSON</option>
                                </select>
                                <textarea
                                    ref={codeInputRef}
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.target.value)}
                                    placeholder="Paste your code here..."
                                    className={`w-full h-64 p-4 rounded-lg ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border focus:outline-none focus:border-lime-400 font-mono text-sm resize-none`}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={sendCode}
                                        disabled={!codeInput.trim()}
                                        className="flex-1 py-3 bg-lime-400 text-black rounded-lg font-medium hover:bg-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send Code
                                    </button>
                                    <button
                                        onClick={() => setShowCodeModal(false)}
                                        className={`px-6 py-3 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} rounded-lg font-medium transition-colors`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transfer Progress */}
                {transferProgress && (
                    <div className="fixed bottom-6 left-6 z-50">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'} border backdrop-blur-md shadow-2xl`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-lime-400 border-t-transparent"></div>
                                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {transferProgress.type === 'sending' ? '📤 Sending' : '📥 Receiving'}: {transferProgress.fileName}
                                </span>
                            </div>
                            <div className={`w-64 h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                                <div
                                    className="h-full bg-lime-400 transition-all duration-300"
                                    style={{ width: `${transferProgress.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}