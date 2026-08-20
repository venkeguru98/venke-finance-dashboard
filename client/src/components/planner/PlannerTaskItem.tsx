import { motion } from 'framer-motion';
import { Check, Clock, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { PlannerTask } from '../../pages/Planner';

interface PlannerTaskItemProps {
  task: PlannerTask;
  onToggle: (task: PlannerTask) => void;
  onDelete: (id: number) => void;
}

const formatLocalTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function PlannerTaskItem({ task, onToggle, onDelete }: PlannerTaskItemProps) {
  const { themeData } = useTheme();
  const isCompleted = task.status === 'completed';

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
            Medium
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
            Low
          </span>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: isCompleted ? `${themeData.bgSecondary}70` : `${themeData.bgCard}D5`,
        borderColor: isCompleted ? `${themeData.borderColor}80` : themeData.borderColor
      }}
      className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 group planner-glass-surface ${
        isCompleted ? 'opacity-60' : 'hover:scale-[1.01]'
      }`}
    >
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Animated Checkbox */}
        <button
          onClick={() => onToggle(task)}
          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
            isCompleted
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-md shadow-emerald-500/30 scale-105'
              : 'border-slate-500 hover:border-purple-400 hover:scale-110'
          }`}
        >
          {isCompleted && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </button>

        <div className="flex flex-col min-w-0 space-y-0.5">
          <span 
            className={`text-xs font-bold truncate transition-all duration-200 ${
              isCompleted ? 'line-through opacity-70' : ''
            }`}
            style={{ color: themeData.textPrimary }}
          >
            {task.title}
          </span>
          {task.description && (
            <span className="text-[10px] truncate font-medium" style={{ color: themeData.textMuted }}>
              {task.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2.5 shrink-0 ml-3">
        {task.due_at && (
          <span 
            style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}
            className="text-[9px] font-mono px-2.5 py-0.5 rounded-full border bg-black/20 flex items-center gap-1"
          >
            <Clock className="w-2.5 h-2.5 text-purple-400" />
            {formatLocalTime(task.due_at)}
          </span>
        )}

        {renderPriorityBadge(task.priority)}

        <button 
          onClick={() => onDelete(task.id)} 
          className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all text-slate-400"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
