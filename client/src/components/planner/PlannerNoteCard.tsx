import { motion } from 'framer-motion';
import { Pin, CheckSquare, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { PlannerNote } from '../../pages/Planner';

interface PlannerNoteCardProps {
  note: PlannerNote;
  onTogglePin: (note: PlannerNote) => void;
  onConvertToTask: (note: PlannerNote) => void;
  onDelete: (id: number) => void;
}

export default function PlannerNoteCard({
  note,
  onTogglePin,
  onConvertToTask,
  onDelete
}: PlannerNoteCardProps) {
  const { themeData } = useTheme();

  // Glass Color Variant Styles
  const getColorStyle = (color: string) => {
    switch (color) {
      case 'violet':
        return {
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.35)',
          glow: 'rgba(139, 92, 246, 0.3)'
        };
      case 'cyan':
        return {
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(6, 182, 212, 0.05) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.35)',
          glow: 'rgba(6, 182, 212, 0.3)'
        };
      case 'emerald':
        return {
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          glow: 'rgba(16, 185, 129, 0.3)'
        };
      case 'amber':
        return {
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.05) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
          glow: 'rgba(245, 158, 11, 0.3)'
        };
      case 'rose':
        return {
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(244, 63, 94, 0.05) 100%)',
          borderColor: 'rgba(244, 63, 94, 0.35)',
          glow: 'rgba(244, 63, 94, 0.3)'
        };
      default:
        return {
          background: `linear-gradient(135deg, ${themeData.bgCard} 0%, ${themeData.bgSecondary} 100%)`,
          borderColor: note.pinned ? themeData.accentPrimary : themeData.borderColor,
          glow: themeData.accentGlow
        };
    }
  };

  const styleConfig = getColorStyle(note.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: styleConfig.background,
        borderColor: note.pinned ? themeData.accentPrimary : styleConfig.borderColor,
        transform: `rotate(${note.rotation || 0}deg)`,
        boxShadow: note.pinned ? `0 12px 30px -6px ${styleConfig.glow}` : '0 8px 24px 0 rgba(0, 0, 0, 0.25)'
      }}
      className="planner-glass-surface p-5 rounded-3xl border shadow-xl space-y-3 relative group overflow-hidden"
    >
      {/* Top Header & Pin Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-black truncate" style={{ color: themeData.textPrimary }}>
          {note.title}
        </span>
        <button
          onClick={() => onTogglePin(note)}
          className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
            note.pinned
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={note.pinned ? 'Unpin note' : 'Pin note to top'}
        >
          <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-purple-400 rotate-45' : ''}`} />
        </button>
      </div>

      {/* Note Content */}
      <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap line-clamp-4" style={{ color: themeData.textSecondary }}>
        {note.content || 'Empty digital note...'}
      </p>

      {/* Bottom Footer Actions & Tags */}
      <div 
        style={{ borderColor: `${themeData.borderColor}80`, color: themeData.textMuted }}
        className="pt-2.5 border-t flex items-center justify-between text-[10px] font-bold"
      >
        <span className="px-2 py-0.5 rounded-md bg-black/20 font-mono">
          {note.tags || '#note'}
        </span>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onConvertToTask(note)}
            className="hover:text-emerald-400 flex items-center gap-1 font-bold text-[10px] transition p-1 hover:bg-emerald-500/10 rounded-md"
            title="Convert sticky note to task"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Convert</span>
          </button>

          <button
            onClick={() => onDelete(note.id)}
            className="hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-md transition text-slate-400"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
