import React from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface PlannerQuickCaptureProps {
  quickTitle: string;
  setQuickTitle: (title: string) => void;
  quickType: 'task' | 'note' | 'reminder' | 'goal';
  setQuickType: (type: 'task' | 'note' | 'reminder' | 'goal') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PlannerQuickCapture({
  quickTitle,
  setQuickTitle,
  quickType,
  setQuickType,
  onSubmit
}: PlannerQuickCaptureProps) {
  const { themeData } = useTheme();

  const types = ['task', 'note', 'reminder', 'goal'] as const;

  return (
    <div 
      style={{ 
        backgroundColor: `${themeData.bgCard}E6`, 
        borderColor: themeData.borderColor 
      }}
      className="planner-glass-surface rounded-3xl p-5 border shadow-xl space-y-3.5 backdrop-blur-2xl"
    >
      <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: themeData.textMuted }}>
        QUICK CAPTURE CONTROL
      </span>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="What do you want to remember?"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          style={{ 
            backgroundColor: `${themeData.bgSecondary}B0`, 
            borderColor: themeData.borderColor, 
            color: themeData.textPrimary 
          }}
          className="w-full text-xs p-3.5 rounded-2xl border outline-none font-semibold placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />

        {/* Segmented Control with Sliding Active Background */}
        <div 
          style={{ backgroundColor: `${themeData.bgSecondary}`, borderColor: themeData.borderColor }}
          className="p-1 rounded-2xl border flex gap-1 relative"
        >
          {types.map((t) => {
            const isSelected = quickType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setQuickType(t)}
                style={{
                  backgroundColor: isSelected ? themeData.accentPrimary : 'transparent',
                  color: isSelected ? '#FFFFFF' : themeData.textMuted,
                  boxShadow: isSelected ? `0 4px 12px ${themeData.accentGlow}` : 'none'
                }}
                className={`flex-1 text-[10px] font-extrabold py-2 rounded-xl capitalize transition-all duration-200 cursor-pointer ${
                  isSelected ? 'scale-[1.02] font-black' : 'hover:text-white'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          style={{
            background: `linear-gradient(135deg, ${themeData.accentPrimary} 0%, ${themeData.accentSecondary} 100%)`,
            boxShadow: `0 8px 20px -4px ${themeData.accentGlow}`
          }}
          className="w-full text-xs font-black py-3 rounded-2xl text-white flex items-center justify-center space-x-1.5 transition-all duration-180 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg overflow-hidden group"
        >
          <Plus className="w-4 h-4 stroke-[3] transition-transform duration-200 group-hover:rotate-90" />
          <span>+ Capture</span>
        </button>
      </form>
    </div>
  );
}
