"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdContentCopy, MdQrCode, MdShare, MdRefresh } from "react-icons/md";
import { BackendAPI, SocketSignaling } from "../../lib/webrtc";
import { useTheme } from "../../contexts/ThemeContext";
import QRCode from "qrcode";

export default function CreatePage() {
  const { isDark } = useTheme();
  const [sessionKey, setSessionKey] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !sessionKey) {
      generateSession();
    }
  }, [mounted]);

  // Generate QR code with theme-aware colors
  const generateQRCode = async (sessionKey) => {
    try {
      const joinUrl = `${window.location.origin}/join?key=${sessionKey}`;
      const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: isDark ? '#ffffff' : '#000000', // White on dark theme, black on light theme
          light: isDark ? '#000000' : '#ffffff'  // Black background on dark theme, white on light theme
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Generate session
  const generateSession = async () => {
    setIsCreating(true);
    try {
      const backendAPI = new BackendAPI();
      const sessionResponse = await backendAPI.createSession();

      if (!sessionResponse.success) {
        throw new Error('Failed to create session');
      }

      const newSessionKey = sessionResponse.sessionId;
      setSessionKey(newSessionKey);
      await generateQRCode(newSessionKey);

      toast.success("🔑 Session created! Waiting for someone to join...");

      // Setup socket to listen for when someone joins
      const socketSignaling = new SocketSignaling(newSessionKey);
      await socketSignaling.connect();

      // Redirect when someone joins
      socketSignaling.onUserJoinedRoom(() => {
        toast.success("🎉 Someone joined! Redirecting to share page...");
        setTimeout(() => {
          window.location.href = `/sharedata?key=${newSessionKey}`;
        }, 1000);
      });

    } catch (error) {
      console.error('Error creating session:', error);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Copy session key
  const copySessionKey = () => {
    navigator.clipboard.writeText(sessionKey);
    toast.success("📋 Session key copied!");
  };

  // Share session link
  const shareSession = async () => {
    const shareUrl = `${window.location.origin}/join?key=${sessionKey}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my SendAnything session',
          text: `Join my secure file sharing session with key: ${sessionKey}`,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled share or error occurred
        copySessionKey();
      }
    } else {
      // Fallback to copying
      navigator.clipboard.writeText(shareUrl);
      toast.success("🔗 Session link copied!");
    }
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} transition-all duration-500`}>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 md:py-16 max-w-4xl">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-400/10 border border-lime-400/20 mb-4 sm:mb-6">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
            <span className="text-lime-400 text-sm font-medium">Session Creator</span>
          </div>

          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
            Create New Session
          </h1>

          <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed max-w-2xl mx-auto`}>
            Generate a secure session and share files with anyone instantly
          </p>
        </div>

        {!sessionKey ? (
          /* Creating Session UI */
          <div className="flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh] space-y-4 sm:space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-lime-400 border-t-transparent"></div>
              <div className="absolute inset-0 rounded-full border-4 border-lime-400/20 animate-ping"></div>
            </div>

            <div className="text-center space-y-2">
              <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isCreating ? 'Creating Your Session...' : 'Initializing...'}
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-md px-4`}>
                Setting up secure peer-to-peer connection and generating session key
              </p>
            </div>
          </div>
        ) : (
          /* Session Created UI */
          <div className="space-y-4 sm:space-y-8">

            {/* Success Message */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-xs sm:text-sm font-medium">Session Active</span>
              </div>
            </div>

            {/* Main Content - Stack on mobile, side-by-side on larger screens */}
            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:gap-8">

              {/* Session Key Card */}
              <div className={`p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} border ${isDark ? 'border-gray-800' : 'border-gray-200'} backdrop-blur-sm`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="p-2 rounded-lg bg-lime-400/10">
                    <MdContentCopy className="text-lime-400 text-lg sm:text-xl" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Session Key
                  </h3>
                </div>

                <div className={`p-3 sm:p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'} mb-3 sm:mb-4`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg sm:text-2xl font-mono font-bold text-lime-400 tracking-wider break-all sm:break-normal`}>
                      {sessionKey}
                    </span>
                    <button
                      onClick={copySessionKey}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors group flex-shrink-0 ml-2`}
                      title="Copy session key"
                    >
                      <MdContentCopy className={`text-base sm:text-lg ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'} transition-colors`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <button
                    onClick={copySessionKey}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <MdContentCopy className="text-base sm:text-lg" />
                    Copy Key
                  </button>

                  <button
                    onClick={shareSession}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-xl border font-semibold transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 text-sm sm:text-base ${
                      isDark
                        ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white'
                        : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <MdShare className="text-base sm:text-lg" />
                    Share Link
                  </button>
                </div>
              </div>

              {/* QR Code Card */}
              <div className={`p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} border ${isDark ? 'border-gray-800' : 'border-gray-200'} backdrop-blur-sm`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="p-2 rounded-lg bg-lime-400/10">
                    <MdQrCode className="text-lime-400 text-lg sm:text-xl" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    QR Code
                  </h3>
                </div>

                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  {qrCodeUrl ? (
                    <div className={`p-3 sm:p-4 rounded-2xl ${isDark ? 'bg-white' : 'bg-gray-900'} border-4 border-lime-400 shadow-2xl`}>
                      <img
                        src={qrCodeUrl}
                        alt="QR Code to join session"
                        className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
                      />
                    </div>
                  ) : (
                    <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} rounded-2xl flex items-center justify-center`}>
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-lime-400 border-t-transparent"></div>
                    </div>
                  )}

                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} text-center max-w-xs leading-tight`}>
                    Others can scan this QR code to instantly join your session
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions - Collapsed on mobile */}
            <div className={`hidden sm:block p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-gray-900/30' : 'bg-gray-50/50'} border ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'} backdrop-blur-sm`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                How it works
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-lime-400 font-bold text-sm sm:text-lg">1</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>Share</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Send the key or QR code</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-lime-400 font-bold text-sm sm:text-lg">2</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>Connect</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>They join the session</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-lime-400 font-bold text-sm sm:text-lg">3</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>Share</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Transfer files securely</p>
                </div>
              </div>
            </div>

            {/* Regenerate Option */}
            <div className="text-center">
              <button
                onClick={() => {
                  setSessionKey("");
                  setQrCodeUrl("");
                  generateSession();
                }}
                className={`inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors text-xs sm:text-sm`}
              >
                <MdRefresh className="text-sm sm:text-lg" />
                Generate New Session
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-12 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Session expires when you leave • End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}