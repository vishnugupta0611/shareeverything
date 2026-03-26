"use client"
import React from 'react';
import { useRouter, usePathname } from "next/navigation";
import { FaShareAlt } from "react-icons/fa";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
  const navigate = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  // On instant page — show custom instant navbar (injected via props/context not needed,
  // just hide this navbar entirely; instant page renders its own)
  if (pathname?.startsWith('/instant')) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-black/20 backdrop-blur-xl z-50 px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => navigate.push("/")}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-400 hover:bg-lime-300 rounded-full flex items-center justify-center transition-all shadow-lg group-hover:scale-105">
            <FaShareAlt className="text-black text-lg sm:text-xl" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-white group-hover:text-lime-400 transition-colors">
            sendanything
          </span>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-all hover:scale-105 text-lime-400 border border-gray-700/50"
            aria-label="Toggle theme"
          >
            {isDark ? <MdLightMode size={18} className="sm:w-5 sm:h-5" /> : <MdDarkMode size={18} className="sm:w-5 sm:h-5" />}
          </button>

          {/* Receive Data Button - Hidden on mobile, shown on sm+ */}
          <button
            onClick={() => navigate.push("/join")}
            className="hidden sm:flex bg-gray-800/50 hover:bg-gray-700/50 text-cyan-300 hover:text-cyan-200 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full items-center gap-2 font-semibold text-sm transition-all hover:scale-105 border border-gray-700/50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Receive
          </button>

          {/* Start Sharing Button */}
          <button
            onClick={() => navigate.push("/create")}
            className="bg-lime-400 hover:bg-lime-300 text-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full flex items-center gap-2 font-bold text-sm transition-all hover:scale-105 shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="sm:w-4 sm:h-4">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
            Share
          </button>
        </div>
      </div>
    </nav>
  );
}