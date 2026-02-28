"use client"
import React from 'react';
import { useRouter } from "next/navigation";
import { FaSlideshare } from "react-icons/fa6";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
  const navigate = useRouter();
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <nav className=" left-0 right-0 bg-black bg-opacity-10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-800 z-50">
      {/* Logo */}
      <div 
        onClick={() => navigate.push("/")} 
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-11 h-11 bg-yellow-400 hover:bg-yellow-300 rounded-full flex items-center justify-center transition-all shadow-lg group-hover:scale-105">
          <FaSlideshare className="text-black text-xl" />
        </div>
        <span className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
          FrequentShare
        </span>
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        {/* <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-gray-800 hover:bg-gray-700 transition-all hover:scale-105 text-yellow-400"
          aria-label="Toggle theme"
        >
          {isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
        </button> */}

        {/* Receive Data Button */}
        <button 
          onClick={() => navigate.push("/join")}
          className="hidden sm:flex bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full items-center gap-2 font-semibold text-sm transition-all hover:scale-105 border border-gray-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Receive Data
        </button>

        {/* Start Sharing Button */}
        <button 
          onClick={() => navigate.push("/create")}
          className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2.5 rounded-full flex items-center gap-2 font-bold text-sm transition-all hover:scale-105 shadow-lg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
          </svg>
          Start Sharing
        </button>
      </div>
    </nav>
  );
}