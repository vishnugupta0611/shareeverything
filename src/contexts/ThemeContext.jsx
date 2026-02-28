"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const theme = {
    isDark,
    toggleTheme,
    colors: isDark ? {
      // Dark theme - Futuristic cyber colors
      primary: 'from-cyan-400 via-blue-500 to-purple-600',
      secondary: 'from-purple-500 to-pink-500',
      accent: 'from-green-400 to-cyan-500',
      background: 'bg-gray-900',
      surface: 'bg-gray-800/50',
      surfaceHover: 'bg-gray-700/50',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      border: 'border-gray-700',
      borderHover: 'border-cyan-500',
      glow: 'shadow-cyan-500/20',
      glowHover: 'shadow-cyan-500/40'
    } : {
      // Light theme - Clean futuristic white
      primary: 'from-blue-500 via-indigo-500 to-purple-600',
      secondary: 'from-pink-500 to-rose-500',
      accent: 'from-emerald-400 to-teal-500',
      background: 'bg-gray-50',
      surface: 'bg-white/80',
      surfaceHover: 'bg-white/90',
      text: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textMuted: 'text-gray-500',
      border: 'border-gray-200',
      borderHover: 'border-blue-500',
      glow: 'shadow-blue-500/20',
      glowHover: 'shadow-blue-500/40'
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};