"use client";
import React, { Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { MdQrCodeScanner, MdKeyboard, MdArrowForward } from "react-icons/md";
import { useTheme } from "../../contexts/ThemeContext";

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className={`min-h-screen ${false ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-400 border-t-transparent"></div>
            </div>
        }>
            <JoinPageContent />
        </Suspense>
    );
}

function JoinPageContent() {
    const { isDark } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [sessionKey, setSessionKey] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerStatus, setScannerStatus] = useState('idle');
    const [inputMethod, setInputMethod] = useState('qr'); // 'qr' or 'manual'

    const idRef = useRef(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Set default input method based on screen size
        const checkScreenSize = () => {
            const isMobile = window.innerWidth < 768; // md breakpoint
            setInputMethod(isMobile ? 'qr' : 'manual');
        };

        // Check on mount
        checkScreenSize();

        // Listen for window resize
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        // Check for session key in URL parameters
        const keyFromUrl = searchParams.get('key');
        if (keyFromUrl && idRef.current) {
            idRef.current.value = keyFromUrl.toUpperCase();
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

                    // Stop scanner and auto-join
                    html5Qrcode.stop().then(() => {
                        scannerRef.current = null;
                        setShowScanner(false);
                        setScannerStatus('idle');

                        // Auto-join immediately
                        setTimeout(() => joinSession(key), 300);
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

    // Join session
    const joinSession = async (keyOverride) => {
        const key = keyOverride || idRef.current?.value?.trim().toUpperCase();

        if (!key) {
            toast.error("⚠️ Please enter a session key");
            return;
        }

        if (key.length !== 6) {
            toast.error("⚠️ Session key must be 6 characters");
            return;
        }

        setIsConnecting(true);

        try {
            // Check if session exists
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/session/${key}`);
            const sessionInfo = await response.json();

            if (!sessionInfo.exists) {
                toast.error("❌ Session not found. Check your key.");
                setIsConnecting(false);
                return;
            }

            toast.success("🔍 Found session! Connecting...");

            // Redirect to sharedata page
            setTimeout(() => {
                router.push(`/sharedata?key=${key}`);
            }, 1000);

        } catch (error) {
            console.error('Error joining session:', error);
            toast.error("❌ Failed to join session. Please try again.");
            setIsConnecting(false);
        }
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} transition-all duration-500`}>
            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-md">

                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-400/10 border border-lime-400/20 mb-6">
                        <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                        <span className="text-lime-400 text-sm font-medium">Secure Connection</span>
                    </div>

                    <h1 className={`text-3xl sm:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                        Join Session
                    </h1>

                    <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                        Connect to a sharing session securely
                    </p>
                </div>

                {/* Input Method Toggle */}
                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
                    <button
                        onClick={() => setInputMethod('qr')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            inputMethod === 'qr'
                                ? 'bg-lime-400 text-black shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        <MdQrCodeScanner className="w-4 h-4" />
                        QR Code
                    </button>
                    <button
                        onClick={() => setInputMethod('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            inputMethod === 'manual'
                                ? 'bg-lime-400 text-black shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        <MdKeyboard className="w-4 h-4" />
                        Manual
                    </button>
                </div>

                {/* QR Scanner */}
                {inputMethod === 'qr' && (
                    <div className="space-y-4">
                        <button
                            onClick={startScanner}
                            disabled={isConnecting}
                            className="w-full relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 transition-all duration-300 hover:shadow-2xl hover:shadow-lime-400/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-4">
                                <MdQrCodeScanner className="text-3xl text-black" />
                                <div className="text-left">
                                    <div className="text-black font-bold text-lg">Scan QR Code</div>
                                    <div className="text-black/70 text-sm">Point camera at the code</div>
                                </div>
                            </div>
                        </button>

                        <div className="text-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
                        </div>
                    </div>
                )}

                {/* Manual Input */}
                {(inputMethod === 'manual' || showScanner) && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Session Code
                            </label>
                            <input
                                ref={idRef}
                                type="text"
                                placeholder="ABC123"
                                className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-center text-xl font-mono font-bold tracking-[0.3em] uppercase placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-lime-400 dark:focus:border-lime-400 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300"
                                onKeyPress={(e) => e.key === 'Enter' && !isConnecting && joinSession()}
                                maxLength={6}
                                autoComplete="off"
                            />
                        </div>

                        <button
                            onClick={joinSession}
                            disabled={isConnecting}
                            className="w-full py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-semibold text-base transition-all duration-300 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isConnecting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <span>Join Session</span>
                                    <MdArrowForward className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* QR Scanner Modal */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Scan QR Code
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Position the code within the frame
                                </p>
                            </div>

                            <div className="relative mb-4">
                                <div id="qr-scanner-video" className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"></div>

                                {scannerStatus === 'loading' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-400 border-t-transparent"></div>
                                    </div>
                                )}

                                {scannerStatus === 'permission_denied' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <div className="text-center text-red-500">
                                            <div className="text-4xl mb-2">📷</div>
                                            <p className="text-sm">Camera permission denied</p>
                                        </div>
                                    </div>
                                )}

                                {scannerStatus === 'error' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <div className="text-center text-red-500">
                                            <div className="text-4xl mb-2">⚠️</div>
                                            <p className="text-sm">Scanner error</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={stopScanner}
                                className="w-full py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        No account required • End-to-end encrypted
                    </p>
                </div>
            </div>
        </div>
    );
}