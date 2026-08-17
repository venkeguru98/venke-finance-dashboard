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
          style={{ backgroundColor: themeData.accentPrimary }}
        />
      </button>

      {/* Premium Theme Dropdown Panel */}
      {isOpen && (
        <div 
          style={{
            backgroundColor: themeData.bgElevated,
            borderColor: themeData.borderColor,
            color: themeData.textPrimary
          }}
          className="absolute right-0 mt-3 w-80 rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          
          {/* Header */}
          <div 
            style={{
              backgroundColor: themeData.bgSecondary,
              borderColor: themeData.borderColor
            }}
            className="px-4 py-3 border-b flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" style={{ color: themeData.accentPrimary }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                VENKE Appearance
              </span>
            </div>
            <span 
              style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
            >
              {THEMES.length} Profiles
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
                  style={isSelected ? {
                    backgroundColor: t.bgCard,
                    borderColor: t.accentPrimary,
                    color: t.textPrimary
                  } : {}}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 text-left group ${
                    isSelected
                      ? 'border font-bold shadow-sm'
                      : 'hover:bg-white/10 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Radio Indicator */}
                    <div 
                      style={isSelected ? {
                        borderColor: t.accentPrimary,
                        backgroundColor: t.accentPrimary,
                        color: '#FFFFFF'
                      } : {}}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                          : 'border-slate-500 group-hover:border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-extrabold truncate" style={{ color: isSelected ? t.textPrimary : 'inherit' }}>
                          {t.name}
                        </span>
                        {t.id === 'midnight' && (
                          <span 
                            style={{ color: t.accentPrimary, backgroundColor: t.accentPrimary + '20', borderColor: t.accentPrimary + '40' }}
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border"
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] truncate font-medium opacity-75">
                        {t.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* 3-Color Miniature Preview Dots */}
                  <div className="flex items-center space-x-1 shrink-0 ml-2 bg-black/30 px-2 py-1 rounded-lg border border-white/10">
                    <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" title="Background Color" style={{ backgroundColor: t.swatch[0] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" title="Primary Accent" style={{ backgroundColor: t.swatch[1] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" title="Secondary Accent" style={{ backgroundColor: t.swatch[2] }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div 
            style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor, color: themeData.textMuted }}
            className="px-4 py-2 border-t text-[10px] font-medium text-center"
          >
            Theme preference auto-saved to your profile
          </div>
        </div>
      )}
    </div>
  );
};
