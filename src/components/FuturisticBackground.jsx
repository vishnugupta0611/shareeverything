"use client";
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

const FuturisticBackground = () => {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setMounted(true);
    // Generate consistent particle positions on client side only
    const particleData = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: (i * 37 + 23) % 100, // Deterministic positioning
      top: (i * 43 + 17) % 100,
      duration: 5 + (i % 10),
      delay: (i % 5)
    }));
    setParticles(particleData);
  }, []);

  if (!mounted) {
    return null; // Prevent SSR mismatch
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated grid */}
      <div className={`absolute inset-0 opacity-10 ${isDark ? 'bg-cyan-500' : 'bg-blue-500'}`} 
           style={{
             backgroundImage: `
               linear-gradient(${isDark ? '#06b6d4' : '#3b82f6'} 1px, transparent 1px),
               linear-gradient(90deg, ${isDark ? '#06b6d4' : '#3b82f6'} 1px, transparent 1px)
             `,
             backgroundSize: '50px 50px',
             animation: 'grid-move 20s linear infinite'
           }}>
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full blur-xl opacity-20 animate-pulse ${
              isDark 
                ? i % 3 === 0 ? 'bg-cyan-500' : i % 3 === 1 ? 'bg-purple-500' : 'bg-pink-500'
                : i % 3 === 0 ? 'bg-blue-500' : i % 3 === 1 ? 'bg-indigo-500' : 'bg-purple-500'
            }`}
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 10}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`
            }}
          />
        ))}
      </div>

      {/* Scanning lines */}
      <div className="absolute inset-0">
        <div 
          className={`absolute w-full h-0.5 ${isDark ? 'bg-cyan-400' : 'bg-blue-400'} opacity-30`}
          style={{
            animation: 'scan-vertical 8s linear infinite',
            boxShadow: `0 0 20px ${isDark ? '#22d3ee' : '#3b82f6'}`
          }}
        />
        <div 
          className={`absolute h-full w-0.5 ${isDark ? 'bg-purple-400' : 'bg-indigo-400'} opacity-30`}
          style={{
            animation: 'scan-horizontal 6s linear infinite',
            boxShadow: `0 0 20px ${isDark ? '#a855f7' : '#6366f1'}`
          }}
        />
      </div>

      {/* Particle effect with consistent positioning */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute w-1 h-1 ${isDark ? 'bg-cyan-300' : 'bg-blue-300'} rounded-full opacity-60`}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `particle-float ${particle.duration}s linear infinite`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes scan-vertical {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        
        @keyframes scan-horizontal {
          0% { left: -2px; }
          100% { left: 100%; }
        }
        
        @keyframes particle-float {
          0% { 
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { 
            transform: translateY(-100px) translateX(100px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FuturisticBackground;