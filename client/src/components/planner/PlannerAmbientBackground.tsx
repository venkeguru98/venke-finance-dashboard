import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function PlannerAmbientBackground() {
  const { themeData } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Top-Center Purple Glow */}
      <div 
        style={{
          background: `radial-gradient(circle, ${themeData.accentPrimary}35 0%, rgba(0,0,0,0) 70%)`
        }}
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-60 animate-planner-ambient"
      />

      {/* Upper-Right Violet Glow */}
      <div 
        style={{
          background: `radial-gradient(circle, ${themeData.accentSecondary}25 0%, rgba(0,0,0,0) 70%)`
        }}
        className="absolute top-20 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-40 animate-planner-ambient"
        style={{ animationDelay: '-5s' }}
      />

      {/* Lower-Left Deep Blue/Purple Ambient Glow */}
      <div 
        style={{
          background: `radial-gradient(circle, ${themeData.accentPrimary}20 0%, rgba(0,0,0,0) 75%)`
        }}
        className="absolute -bottom-30 -left-40 w-[650px] h-[650px] rounded-full blur-[180px] opacity-50 animate-planner-ambient"
        style={{ animationDelay: '-9s' }}
      />

      {/* Faint Subtle Grid Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `radial-gradient(${themeData.textPrimary} 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
}
