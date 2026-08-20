import { Search, X, Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface PlannerSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function PlannerSearch({ searchQuery, setSearchQuery }: PlannerSearchProps) {
  const { themeData } = useTheme();

  return (
    <div 
      style={{ 
        backgroundColor: `${themeData.bgCard}D5`, 
        borderColor: themeData.borderColor 
      }}
      className="planner-glass-surface rounded-3xl p-2.5 border shadow-xl flex items-center space-x-3 backdrop-blur-2xl transition-all group focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20"
    >
      <Search 
        className="w-4 h-4 ml-2 shrink-0 transition-colors group-focus-within:text-purple-400" 
        style={{ color: themeData.textMuted }} 
      />

      <input
        type="text"
        placeholder="Search notes, tasks, reminders, goals..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ color: themeData.textPrimary }}
        className="bg-transparent border-none outline-none text-xs font-semibold w-full placeholder:text-slate-500 py-1"
      />

      {searchQuery ? (
        <button 
          onClick={() => setSearchQuery('')} 
          className="p-1 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span 
          style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}
          className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-xl border bg-black/20 shrink-0"
        >
          <Command className="w-2.5 h-2.5" /> K
        </span>
      )}
    </div>
  );
}
