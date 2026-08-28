import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Trash2, Tag, AlertCircle } from 'lucide-react';
import { PlannerTask } from '../../pages/Planner';

interface PlannerTimelineStreamProps {
  tasks: PlannerTask[];
  onToggleTask: (task: PlannerTask) => void;
  onDeleteTask: (id: number) => void;
  selectedTag: string;
}

export default function PlannerTimelineStream({
  tasks,
  onToggleTask,
  onDeleteTask,
  selectedTag
}: PlannerTimelineStreamProps) {
  // Filter tasks based on selectedTag
  const filteredTasks = React.useMemo(() => {
    if (selectedTag === 'all') return tasks;
    return tasks.filter(t => (t.tags || '').toLowerCase().includes(selectedTag.toLowerCase()));
  }, [tasks, selectedTag]);

  // Group tasks into time slots (e.g. 09:00 AM, 12:00 PM, 03:00 PM, 06:00 PM, Any Time)
  const timeBlockedSlots = React.useMemo(() => {
    const slots: { label: string; tasks: PlannerTask[] }[] = [
      { label: '09:00 AM · Morning Focus', tasks: [] },
      { label: '12:30 PM · Midday Execution', tasks: [] },
      { label: '04:00 PM · Afternoon Deep Work', tasks: [] },
      { label: '07:30 PM · Evening Reflections & Tasks', tasks: [] },
      { label: 'Flexible / Backlog', tasks: [] }
    ];

    filteredTasks.forEach((t, idx) => {
      const slotIdx = idx % 4;
      if (t.status === 'completed') {
        slots[3].tasks.push(t);
      } else {
        slots[slotIdx].tasks.push(t);
      }
    });

    return slots.filter(s => s.tasks.length > 0);
  }, [filteredTasks]);

  if (filteredTasks.length === 0) {
    return (
      <div className="py-12 px-6 text-center bg-[#090D16]/60 rounded-3xl border border-dashed border-slate-800 space-y-2">
        <Clock className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
        <p className="font-bold text-slate-200 text-sm">No tasks found for "{selectedTag}"</p>
        <p className="text-xs text-slate-400">Add a new item using the Super-Bar above (⌘ + J)</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-purple-500/30">
      <AnimatePresence mode="popLayout">
        {timeBlockedSlots.map((slot) => (
          <div key={slot.label} className="relative space-y-3">
            {/* Timeline Node Header */}
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#090D16] border-2 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] -ml-[31px] flex items-center justify-center shrink-0 z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </span>
              <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                {slot.label}
              </span>
            </div>

            {/* Task Chips in Slot */}
            <div className="space-y-2.5 pt-1">
              {slot.tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const priorityColor = 
                  task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  task.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-blue-500/20 text-blue-300 border-blue-500/40';

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className={`group p-3.5 bg-[#090D16] border rounded-2xl flex items-center justify-between gap-3 shadow-lg transition-all hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] ${
                      isCompleted ? 'border-white/5 opacity-60 bg-slate-950/40' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Checkbox Trigger */}
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isCompleted
                            ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                            : 'border-slate-700 hover:border-purple-400 bg-slate-900/60'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <span className={`text-xs font-bold block truncate transition-all ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}>
                          {task.title}
                        </span>

                        {task.tags && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {task.tags.split(',').map(tag => (
                              <span key={tag} className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase border ${priorityColor}`}>
                        {task.priority}
                      </span>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
