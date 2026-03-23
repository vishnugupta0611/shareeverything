"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdContentCopy, MdQrCode } from "react-icons/md";
import { BackendAPI, SocketSignaling } from "../../lib/webrtc";
import { useTheme } from "../../contexts/ThemeContext";
import QRCode from "qrcode";

export default function CreatePage() {
  const { isDark } = useTheme();
  const [sessionKey, setSessionKey] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !sessionKey) {
      generateSession();
    }
  }, [mounted]);

  // Generate QR code
  const generateQRCode = async (sessionKey) => {
    try {
      const joinUrl = `${window.location.origin}/join?key=${sessionKey}`;
      const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Generate session
  const generateSession = async () => {
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
    }
  };

  // Copy session key
  const copySessionKey = () => {
    navigator.clipboard.writeText(sessionKey);
    toast.success("📋 Session key copied!");
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} transition-all duration-500`}>
      <div className="container mx-auto px-6 lg:py-2 md:p-2 p-6 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-4 pt-8">
          <h1 className={`text-5xl md:text-6xl lg:text-7xl font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create Session
          </h1>
          {/* <p className={`text-xl md:text-2xl ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-3xl mx-auto leading-relaxed`}>
            Generate a secure session key and start sharing files instantly
          </p> */}
        </div>

        {!sessionKey ? (
          /* Auto-generating Session UI */
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-lime-400 border-t-transparent"></div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Creating Your Session...
              </h2>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} text-center max-w-md`}>
                Setting up secure peer-to-peer connection
              </p>
            </div>
          </div>
        ) : (
          /* Session Created UI */
          <div className="space-y-8">
            <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-100/50'} ${isDark ? 'border-gray-800' : 'border-gray-200'} border backdrop-blur-md transition-all duration-300`}>
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                
                {/* Session Key Display */}
                <div className="order-last">
                  <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Your Session Key</h3>
                  <div className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} ${isDark ? 'border-gray-700' : 'border-gray-300'} border`}>
                    <span className={`text-2xl md:text-3xl font-mono font-black text-lime-400 tracking-wider`}>
                      {sessionKey}
                    </span>
                    <button
                      onClick={copySessionKey}
                      className={`p-3 rounded-xl ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDark ? 'border-gray-600' : 'border-gray-300'} border transition-all duration-300 group`}
                    >
                      <MdContentCopy className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'} group-hover:scale-110 transition-transform duration-300`} />
                    </button>
                  </div>
                  
                 
                </div>

                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                    <MdQrCode className="inline mr-2" />
                    Scan to Join
                  </h3>
                  {qrCodeUrl ? (
                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white' : 'bg-white'} border-4 border-lime-400 shadow-xl`}>
                      <img
                        src={qrCodeUrl}
                        alt="QR Code to join session"
                        className="w-48 h-48 md:w-56 md:h-56"
                      />
                    </div>
                  ) : (
                    <div className={`w-48 h-48 md:w-56 md:h-56 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} rounded-2xl flex items-center justify-center`}>
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-400 border-t-transparent"></div>
                    </div>
                  )}
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-4 text-center max-w-xs`}>
                    Others can scan this QR code to instantly join your session
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}