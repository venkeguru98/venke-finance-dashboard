import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeKey = 'midnight' | 'ocean' | 'emerald' | 'royal' | 'graphite' | 'aurora' | 'light' | 'deep-dark';

export interface ThemeDefinition {
  id: ThemeKey;
  name: string;
  subtitle: string;
  isDark: boolean;
  swatch: [string, string, string]; // [bg, accentPrimary, accentSecondary]
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  bgElevated: string;
  borderColor: string;
  borderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  chartColors: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight Purple',
    subtitle: 'VENKE Signature • Deep navy + violet',
    isDark: true,
    swatch: ['#040816', '#8B5CF6', '#4F7CFF'],
    bgPrimary: '#040816',
    bgSecondary: '#081226',
    bgCard: '#081226',
    bgCardHover: '#0D1B3A',
    bgElevated: '#0D1B3A',
    borderColor: '#1E2A44',
    borderHover: '#8B5CF6',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accentPrimary: '#8B5CF6',
    accentSecondary: '#4F7CFF',
    accentGlow: 'rgba(139, 92, 246, 0.4)',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EF4444',
    chartColors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4']
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    subtitle: 'Blue-black + cyan & sapphire',
    isDark: true,
    swatch: ['#020B1A', '#06B6D4', '#3B82F6'],
    bgPrimary: '#020B1A',
    bgSecondary: '#051630',
    bgCard: '#051630',
    bgCardHover: '#09254D',
    bgElevated: '#09254D',
    borderColor: '#0D3366',
    borderHover: '#06B6D4',
    textPrimary: '#F0F9FF',
    textSecondary: '#7DD3FC',
    textMuted: '#38BDF8',
    accentPrimary: '#06B6D4',
    accentSecondary: '#3B82F6',
    accentGlow: 'rgba(6, 182, 212, 0.4)',
    successColor: '#14B8A6',
    warningColor: '#F97316',
    dangerColor: '#F43F5E',
    chartColors: ['#06B6D4', '#3B82F6', '#14B8A6', '#8B5CF6', '#F59E0B', '#38BDF8']
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    subtitle: 'Deep charcoal + emerald green',
    isDark: true,
    swatch: ['#03120E', '#10B981', '#34D399'],
    bgPrimary: '#03120E',
    bgSecondary: '#072119',
    bgCard: '#072119',
    bgCardHover: '#0E362A',
    bgElevated: '#0E362A',
    borderColor: '#104435',
    borderHover: '#10B981',
    textPrimary: '#ECFDF5',
    textSecondary: '#6EE7B7',
    textMuted: '#34D399',
    accentPrimary: '#10B981',
    accentSecondary: '#34D399',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#F43F5E',
    chartColors: ['#10B981', '#34D399', '#06B6D4', '#F59E0B', '#8B5CF6', '#3B82F6']
  },
  {
    id: 'royal',
    name: 'Royal Indigo',
    subtitle: 'Royal navy + indigo & violet',
    isDark: true,
    swatch: ['#050414', '#6366F1', '#A855F7'],
    bgPrimary: '#050414',
    bgSecondary: '#0B0824',
    bgCard: '#0B0824',
    bgCardHover: '#130F3B',
    bgElevated: '#130F3B',
    borderColor: '#1B164A',
    borderHover: '#6366F1',
    textPrimary: '#EEF2FF',
    textSecondary: '#C7D2FE',
    textMuted: '#818CF8',
    accentPrimary: '#6366F1',
    accentSecondary: '#A855F7',
    accentGlow: 'rgba(99, 102, 241, 0.4)',
    successColor: '#06B6D4',
    warningColor: '#EAB308',
    dangerColor: '#EC4899',
    chartColors: ['#6366F1', '#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']
  },
  {
    id: 'graphite',
    name: 'Graphite',
    subtitle: 'Near-black + silver',
    isDark: true,
    swatch: ['#080808', '#CBD5E1', '#94A3B8'],
    bgPrimary: '#080808',
    bgSecondary: '#141414',
    bgCard: '#141414',
    bgCardHover: '#222222',
    bgElevated: '#222222',
    borderColor: '#282828',
    borderHover: '#CBD5E1',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    accentPrimary: '#CBD5E1',
    accentSecondary: '#94A3B8',
    accentGlow: 'rgba(203, 213, 225, 0.35)',
    successColor: '#34D399',
    warningColor: '#FBBF24',
    dangerColor: '#F87171',
    chartColors: ['#CBD5E1', '#94A3B8', '#64748B', '#38BDF8', '#818CF8', '#34D399']
  },
  {
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Midnight + teal & violet',
    isDark: true,
    swatch: ['#030C1A', '#14B8A6', '#C084FC'],
    bgPrimary: '#030C1A',
    bgSecondary: '#08182B',
    bgCard: '#08182B',
    bgCardHover: '#0E2745',
    bgElevated: '#0E2745',
    borderColor: '#113254',
    borderHover: '#14B8A6',
    textPrimary: '#F0FDFA',
    textSecondary: '#99F6E4',
    textMuted: '#2DD4BF',
    accentPrimary: '#14B8A6',
    accentSecondary: '#C084FC',
    accentGlow: 'rgba(20, 184, 166, 0.4)',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#F43F5E',
    chartColors: ['#14B8A6', '#C084FC', '#38BDF8', '#F472B6', '#F59E0B', '#10B981']
  },
  {
    id: 'light',
    name: 'Clean Light',
    subtitle: 'Crisp white + royal blue',
    isDark: false,
    swatch: ['#F8FAFC', '#2563EB', '#4F46E5'],
    bgPrimary: '#F8FAFC',
    bgSecondary: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgCardHover: '#F1F5F9',
    bgElevated: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderHover: '#2563EB',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    accentPrimary: '#2563EB',
    accentSecondary: '#4F46E5',
    accentGlow: 'rgba(37, 99, 235, 0.25)',
    successColor: '#059669',
    warningColor: '#D97706',
    dangerColor: '#DC2626',
    chartColors: ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2']
  },
  {
    id: 'deep-dark',
    name: 'Deep Dark',
    subtitle: 'Almost black + neon purple',
    isDark: true,
    swatch: ['#020204', '#A855F7', '#EC4899'],
    bgPrimary: '#020204',
    bgSecondary: '#09090E',
    bgCard: '#09090E',
    bgCardHover: '#13131C',
    bgElevated: '#13131C',
    borderColor: '#181824',
    borderHover: '#A855F7',
    textPrimary: '#FFFFFF',
    textSecondary: '#D8B4FE',
    textMuted: '#C084FC',
    accentPrimary: '#A855F7',
    accentSecondary: '#EC4899',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EC4899',
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

    // Comprehensive Semantic CSS Variable Injection
    root.style.setProperty('--bg-primary', currentTheme.bgPrimary);
    root.style.setProperty('--bg-secondary', currentTheme.bgSecondary);
    root.style.setProperty('--bg-card', currentTheme.bgCard);
    root.style.setProperty('--bg-card-hover', currentTheme.bgCardHover);
    root.style.setProperty('--bg-elevated', currentTheme.bgElevated);
    root.style.setProperty('--border-color', currentTheme.borderColor);
    root.style.setProperty('--border-hover', currentTheme.borderHover);
    root.style.setProperty('--text-primary', currentTheme.textPrimary);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--text-muted', currentTheme.textMuted);
    root.style.setProperty('--accent-primary', currentTheme.accentPrimary);
    root.style.setProperty('--accent-secondary', currentTheme.accentSecondary);
    root.style.setProperty('--accent-glow', currentTheme.accentGlow);
    root.style.setProperty('--success-color', currentTheme.successColor);
    root.style.setProperty('--warning-color', currentTheme.warningColor);
    root.style.setProperty('--danger-color', currentTheme.dangerColor);

    // Chart Palette CSS variables
    currentTheme.chartColors.forEach((color, idx) => {
      root.style.setProperty(`--chart-${idx + 1}`, color);
    });
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
