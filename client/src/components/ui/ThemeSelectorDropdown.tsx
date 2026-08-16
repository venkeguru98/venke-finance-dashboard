import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme, THEMES, type ThemeKey } from '../../context/ThemeContext';

export const ThemeSelectorDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme, themeData } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Top Navbar Palette Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full relative transition-all duration-180 flex items-center justify-center group ${
          isOpen
            ? 'bg-[#8B5CF6]/30 text-white border border-[#8B5CF6]/50 shadow-[0_0_15px_rgba(139,92,246,0.4)]'
            : 'text-slate-400 hover:text-white hover:bg-[#0D1830]'
        }`}
        title="Change Appearance Theme"
      >
        <Palette className="w-4.5 h-4.5 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
        
        {/* Active Theme Indicator Glow Dot */}
        <span 
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#081226] shadow-sm animate-pulse"
          style={{ backgroundColor: themeData.accent }}
        />
      </button>

      {/* Premium Theme Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#081226]/95 border border-[#1E2A44] shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1E2A44] bg-[#0A1633]/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                VENKE Appearance
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
              {THEMES.length} Themes
            </span>
          </div>

          {/* Theme List */}
          <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as ThemeKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 text-left group ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#8B5CF6]/25 via-[#4F7CFF]/20 to-transparent border border-[#8B5CF6]/40 text-white font-bold'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Radio Indicator */}
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                        : 'border-slate-600 group-hover:border-slate-400'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-extrabold truncate text-white">
                          {t.name}
                        </span>
                        {t.id === 'midnight' && (
                          <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/20 px-1.5 py-0.2 rounded-full border border-[#8B5CF6]/30">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate font-medium">
                        {t.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Gradient Swatch Preview Pill */}
                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="px-4 py-2 border-t border-[#1E2A44] bg-[#050B18] text-[10px] text-slate-400 font-medium text-center">
            Theme preference auto-saved to your profile
          </div>
        </div>
      )}
    </div>
  );
};
