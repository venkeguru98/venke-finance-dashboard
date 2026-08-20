import React, { useState } from 'react';
import { Sparkles, Plus, Zap, Clock, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface PlannerHeaderProps {
  todayFocusCount: number;
  onOpenSmartPlan: () => void;
  onOpenQuickCapture: () => void;
}

export default function PlannerHeader({
  todayFocusCount,
  onOpenSmartPlan,
  onOpenQuickCapture
}: PlannerHeaderProps) {
  const { themeData } = useTheme();

  // Desktop Magnetic Proximity Hover State for Hero CTAs
  const [smartPlanPos, setSmartPlanPos] = useState({ x: 0, y: 0 });
  const [capturePos, setCapturePos] = useState({ x: 0, y: 0 });

  const handleMouseMoveSmartPlan = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
    setSmartPlanPos({ x, y });
  };

  const handleMouseMoveCapture = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
    setCapturePos({ x, y });
  };

  const resetPos = () => {
    setSmartPlanPos({ x: 0, y: 0 });
    setCapturePos({ x: 0, y: 0 });
  };

  // Dynamic greeting based on local browser hour
  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const formattedTodayDate = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div 
      style={{ 
        backgroundColor: `${themeData.bgCard}D5`, 
        borderColor: themeData.borderColor 
      }}
      className="planner-glass-surface rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all relative overflow-hidden group"
    >
      {/* Background Ambient Glow Accent */}
      <div 
        style={{
          background: `radial-gradient(circle, ${themeData.accentPrimary}25 0%, transparent 70%)`
        }}
        className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-50 transition-opacity group-hover:opacity-80"
      />

      {/* Left Greeting & Identity */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center space-x-2.5">
          <span 
            className="p-2 rounded-2xl border shadow-inner flex items-center justify-center animate-planner-sparkle" 
            style={{ 
              backgroundColor: `${themeData.accentPrimary}20`, 
              borderColor: `${themeData.accentPrimary}40`,
              color: themeData.accentPrimary 
            }}
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: themeData.accentPrimary }}>
            VENKE PLANNER
          </span>
          <span 
            className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border backdrop-blur-md flex items-center gap-1" 
            style={{ 
              borderColor: themeData.borderColor, 
              color: themeData.textMuted,
              backgroundColor: themeData.bgSecondary + '80'
            }}
          >
            <Clock className="w-2.5 h-2.5" /> Local Device Workspace
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: themeData.textPrimary }}>
          {greeting}, Venke
        </h1>

        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: themeData.textSecondary }}>
          <span>{formattedTodayDate}</span>
          <span>•</span>
          <span className="font-black px-2 py-0.5 rounded-md" style={{ backgroundColor: `${themeData.accentPrimary}20`, color: themeData.accentPrimary }}>
            {todayFocusCount} focus {todayFocusCount === 1 ? 'item' : 'items'}
          </span>
          <span>for today</span>
        </p>
      </div>

      {/* Right Hero Action Buttons */}
      <div className="flex items-center space-x-3 relative z-10">
        
        {/* Hero 1: "✨ Plan my day" AI Button */}
        <button
          onClick={onOpenSmartPlan}
          onMouseMove={handleMouseMoveSmartPlan}
          onMouseLeave={resetPos}
          style={{
            transform: `translate3d(${smartPlanPos.x}px, ${smartPlanPos.y}px, 0)`,
            backgroundColor: `${themeData.bgSecondary}CC`,
            borderColor: `${themeData.accentPrimary}60`,
            boxShadow: `0 8px 24px -6px ${themeData.accentGlow}`
          }}
          className="relative px-5 py-3 rounded-2xl border text-xs font-black flex items-center space-x-2 transition-transform duration-180 ease-out group/btn overflow-hidden cursor-pointer hover:border-purple-400 active:scale-95"
        >
          {/* Light Sweep Shimmer Effect */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:animate-[plannerShimmerSweep_1.2s_ease-in-out_infinite]" />

          <Zap className="w-4 h-4 text-amber-400 fill-amber-400/30 animate-pulse stroke-[2.5]" />
          <span style={{ color: themeData.textPrimary }}>✦ Plan my day</span>
        </button>

        {/* Hero 2: "+ New Capture" Action Button */}
        <button
          onClick={onOpenQuickCapture}
          onMouseMove={handleMouseMoveCapture}
          onMouseLeave={resetPos}
          style={{
            transform: `translate3d(${capturePos.x}px, ${capturePos.y}px, 0)`,
            background: `linear-gradient(135deg, ${themeData.accentPrimary} 0%, ${themeData.accentSecondary} 100%)`,
            boxShadow: `0 8px 25px -4px ${themeData.accentGlow}`
          }}
          className="relative px-5 py-3 rounded-2xl text-xs font-black text-white flex items-center space-x-2 transition-all duration-180 ease-out hover:scale-105 active:scale-95 cursor-pointer shadow-lg overflow-hidden group/cap"
        >
          {/* Light Sweep Shimmer Effect */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/cap:animate-[plannerShimmerSweep_1s_ease-in-out_infinite]" />

          <Plus className="w-4 h-4 stroke-[3] transition-transform duration-200 group-hover/cap:rotate-90" />
          <span>New Capture</span>
        </button>

      </div>
    </div>
  );
}
