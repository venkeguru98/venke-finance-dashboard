import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeKey = 'midnight' | 'ocean' | 'emerald' | 'royal' | 'graphite' | 'aurora' | 'light' | 'deep-dark';

export interface ThemeDefinition {
  id: ThemeKey;
  name: string;
  subtitle: string;
  isDark: boolean;
  swatch: [string, string]; // Primary & Secondary gradient preview
  bgPrimary: string;
  bgHeader: string;
  bgCard: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  chartColors: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight Purple',
    subtitle: 'VENKE Signature • Deep navy + violet',
    isDark: true,
    swatch: ['#8B5CF6', '#4F7CFF'],
    bgPrimary: '#040816',
    bgHeader: '#081226',
    bgCard: '#081226',
    borderColor: '#1E2A44',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.4)',
    chartColors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4']
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    subtitle: 'Navy + cyan & sapphire',
    isDark: true,
    swatch: ['#06B6D4', '#3B82F6'],
    bgPrimary: '#031024',
    bgHeader: '#061836',
    bgCard: '#061836',
    borderColor: '#0F3260',
    textPrimary: '#F0F9FF',
    textSecondary: '#7DD3FC',
    textMuted: '#38BDF8',
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.4)',
    chartColors: ['#06B6D4', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#38BDF8']
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    subtitle: 'Dark charcoal + emerald green',
    isDark: true,
    swatch: ['#10B981', '#34D399'],
    bgPrimary: '#041410',
    bgHeader: '#08201A',
    bgCard: '#08201A',
    borderColor: '#123C32',
    textPrimary: '#ECFDF5',
    textSecondary: '#6EE7B7',
    textMuted: '#34D399',
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    chartColors: ['#10B981', '#34D399', '#06B6D4', '#F59E0B', '#8B5CF6', '#3B82F6']
  },
  {
    id: 'royal',
    name: 'Royal Indigo',
    subtitle: 'Deep navy + indigo & violet',
    isDark: true,
    swatch: ['#6366F1', '#A855F7'],
    bgPrimary: '#070618',
    bgHeader: '#0D0B28',
    bgCard: '#0D0B28',
    borderColor: '#1E194D',
    textPrimary: '#EEF2FF',
    textSecondary: '#C7D2FE',
    textMuted: '#818CF8',
    accent: '#6366F1',
    accentGlow: 'rgba(99, 102, 241, 0.4)',
    chartColors: ['#6366F1', '#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']
  },
  {
    id: 'graphite',
    name: 'Graphite',
    subtitle: 'Premium black + silver',
    isDark: true,
    swatch: ['#94A3B8', '#CBD5E1'],
    bgPrimary: '#000000',
    bgHeader: '#0F0F0F',
    bgCard: '#0F0F0F',
    borderColor: '#262626',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#737373',
    accent: '#94A3B8',
    accentGlow: 'rgba(148, 163, 184, 0.4)',
    chartColors: ['#CBD5E1', '#94A3B8', '#64748B', '#38BDF8', '#818CF8', '#34D399']
  },
  {
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Deep navy + teal + purple',
    isDark: true,
    swatch: ['#14B8A6', '#C084FC'],
    bgPrimary: '#030D1A',
    bgHeader: '#07172C',
    bgCard: '#07172C',
    borderColor: '#122A4A',
    textPrimary: '#F0FDFA',
    textSecondary: '#99F6E4',
    textMuted: '#2DD4BF',
    accent: '#14B8A6',
    accentGlow: 'rgba(20, 184, 166, 0.4)',
    chartColors: ['#14B8A6', '#C084FC', '#38BDF8', '#F472B6', '#F59E0B', '#10B981']
  },
  {
    id: 'light',
    name: 'Clean Light',
    subtitle: 'Crisp light + royal blue',
    isDark: false,
    swatch: ['#2563EB', '#3B82F6'],
    bgPrimary: '#F8FAFC',
    bgHeader: '#FFFFFF',
    bgCard: '#FFFFFF',
    borderColor: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    accent: '#2563EB',
    accentGlow: 'rgba(37, 99, 235, 0.25)',
    chartColors: ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2']
  },
  {
    id: 'deep-dark',
    name: 'Deep Dark',
    subtitle: 'Pitch black + neon purple',
    isDark: true,
    swatch: ['#A855F7', '#EC4899'],
    bgPrimary: '#030305',
    bgHeader: '#08080C',
    bgCard: '#08080C',
    borderColor: '#161622',
    textPrimary: '#FFFFFF',
    textSecondary: '#D8B4FE',
    textMuted: '#C084FC',
    accent: '#A855F7',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    chartColors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#06B6D4']
  }
];

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  themeData: ThemeDefinition;
  chartColors: string[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight',
  setTheme: () => {},
  themeData: THEMES[0],
  chartColors: THEMES[0].chartColors
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('venke_theme') as ThemeKey;
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved;
    }
    return 'midnight';
  });

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  const setTheme = (newTheme: ThemeKey) => {
    setThemeState(newTheme);
    localStorage.setItem('venke_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (currentTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set CSS custom properties on root for seamless global styling
    root.style.setProperty('--theme-bg-primary', currentTheme.bgPrimary);
    root.style.setProperty('--theme-bg-header', currentTheme.bgHeader);
    root.style.setProperty('--theme-bg-card', currentTheme.bgCard);
    root.style.setProperty('--theme-border', currentTheme.borderColor);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-accent-glow', currentTheme.accentGlow);
    root.style.setProperty('--theme-text-primary', currentTheme.textPrimary);
    root.style.setProperty('--theme-text-secondary', currentTheme.textSecondary);
  }, [theme, currentTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      themeData: currentTheme,
      chartColors: currentTheme.chartColors
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
