import { 
  Sun, Layers, CheckSquare, Clock, CalendarDays, Target, Tag 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type ViewMode = 'today' | 'notes' | 'tasks' | 'upcoming' | 'calendar' | 'goals';

interface PlannerSidebarProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  tasksCount: number;
  notesCount: number;
  goalsCount: number;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
}

export default function PlannerSidebar({
  activeView,
  setActiveView,
  tasksCount,
  notesCount,
  goalsCount,
  tagFilter,
  setTagFilter
}: PlannerSidebarProps) {
  const { themeData } = useTheme();

  const views = [
    { id: 'today', label: 'Today Focus', icon: <Sun className="w-4 h-4" />, count: tasksCount },
    { id: 'notes', label: 'Sticky Notes', icon: <Layers className="w-4 h-4" />, count: notesCount },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, count: tasksCount },
    { id: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" />, count: null },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" />, count: null },
    { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" />, count: goalsCount },
  ];

  const tags = ['all', '#work', '#career', '#finance', '#important', '#personal', '#idea'];

  return (
    <div className="space-y-5">
      {/* ── 1. Views Navigation Container ────────────────────────────────── */}
      <div 
        style={{ 
          backgroundColor: `${themeData.bgCard}E6`, 
          borderColor: themeData.borderColor 
        }}
        className="planner-glass-surface rounded-3xl p-3 border shadow-xl space-y-1 backdrop-blur-2xl"
      >
        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 block" style={{ color: themeData.textMuted }}>
          WORKSPACE VIEWS
        </span>

        {views.map((v) => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as ViewMode)}
              style={isActive ? {
                background: `linear-gradient(135deg, ${themeData.accentPrimary} 0%, ${themeData.accentSecondary} 100%)`,
                color: '#FFFFFF',
                boxShadow: `0 8px 24px -4px ${themeData.accentGlow}`
              } : {
                color: themeData.textSecondary
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 text-xs font-bold group relative cursor-pointer ${
                isActive ? 'scale-[1.02] shadow-lg font-black' : 'hover:bg-white/10 hover:text-white hover:translate-x-1'
              }`}
            >
              {/* Active Aura Highlight Indicator */}
              {isActive && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-white shadow-sm" />
              )}

              <div className="flex items-center space-x-3 pl-1">
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {v.icon}
                </span>
                <span>{v.label}</span>
              </div>

              {v.count !== null && (
                <span 
                  style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.22)' : `${themeData.bgSecondary}`,
                    color: isActive ? '#FFFFFF' : themeData.textMuted
                  }}
                  className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full transition-all"
                >
                  {v.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 2. Tag Filter Glass Chips Container ──────────────────────────── */}
      <div 
        style={{ 
          backgroundColor: `${themeData.bgCard}E6`, 
          borderColor: themeData.borderColor 
        }}
        className="planner-glass-surface rounded-3xl p-4 border shadow-xl space-y-3 backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: themeData.textMuted }}>
            TAGS & FILTERS
          </span>
          <Tag className="w-3.5 h-3.5" style={{ color: themeData.textMuted }} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const isSelected = tagFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                style={{
                  backgroundColor: isSelected ? themeData.accentPrimary : `${themeData.bgSecondary}B0`,
                  color: isSelected ? '#FFFFFF' : themeData.textSecondary,
                  borderColor: isSelected ? themeData.accentPrimary : themeData.borderColor,
                  boxShadow: isSelected ? `0 4px 12px ${themeData.accentGlow}` : 'none'
                }}
                className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-180 cursor-pointer ${
                  isSelected ? 'scale-105' : 'hover:border-purple-400 hover:text-white hover:scale-105'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
