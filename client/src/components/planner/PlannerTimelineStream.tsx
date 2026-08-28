import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Plus, CornerDownLeft } from 'lucide-react';
import type { PlannerTask } from '../../pages/Planner';

interface PlannerTimelineStreamProps {
  tasks: PlannerTask[];
  onToggleTask: (task: PlannerTask) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (title: string, duration?: string, priority?: 'low' | 'medium' | 'high' | 'urgent', slotLabel?: string) => void;
  selectedTag: string;
}

export default function PlannerTimelineStream({
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  selectedTag
}: PlannerTimelineStreamProps) {
  // Inline Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDuration, setQuickDuration] = useState('30m');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  // Slot-specific inline add state
  const [activeSlotModal, setActiveSlotModal] = useState<string | null>(null);
  const [slotTaskTitle, setSlotTaskTitle] = useState('');

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddTask(quickTitle.trim(), quickDuration, quickPriority);
    setQuickTitle('');
  };

  const handleSlotInlineSubmit = (slotLabel: string) => {
    if (!slotTaskTitle.trim()) return;
    onAddTask(slotTaskTitle.trim(), '30m', 'medium', slotLabel);
    setSlotTaskTitle('');
    setActiveSlotModal(null);
  };

  // Filter tasks based on selectedTag
  const filteredTasks = React.useMemo(() => {
    if (selectedTag === 'all') return tasks;
    return tasks.filter(t => (t.tags || '').toLowerCase().includes(selectedTag.toLowerCase()));
  }, [tasks, selectedTag]);

  // Default Time-Block Slots (08:00 AM to 10:00 PM)
  const HOURLY_SLOTS = [
    { label: '08:00 AM · Morning Rituals & Planning', hour: '08:00 AM' },
    { label: '10:00 AM · High Impact Deep Work', hour: '10:00 AM' },
    { label: '01:00 PM · Midday Sync & Execution', hour: '01:00 PM' },
    { label: '04:00 PM · Finance Review & Admin', hour: '04:00 PM' },
    { label: '07:00 PM · Evening Learning & Reading', hour: '07:00 PM' },
    { label: '09:00 PM · Wind Down & Reflections', hour: '09:00 PM' }
  ];

  // Map tasks to slots
  const timeBlockedSlots = React.useMemo(() => {
    return HOURLY_SLOTS.map((slot, idx) => {
      const slotTasks = filteredTasks.filter((_, tIdx) => (tIdx % HOURLY_SLOTS.length) === idx);
      return {
        ...slot,
        tasks: slotTasks
      };
    });
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      {/* ── PERMANENT INLINE QUICK-ADD TASK ROW ─────────────────────────── */}
      <form onSubmit={handleInlineSubmit} className="p-2.5 bg-[#050811] border border-white/10 rounded-2xl flex items-center gap-2 shadow-inner">
        <Plus className="w-4 h-4 text-purple-400 shrink-0 ml-2" />
        <input
          type="text"
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="+ Add task for today (Press Enter)..."
          className="flex-1 bg-transparent text-xs font-medium text-white placeholder-slate-500 focus:outline-none"
        />

        {/* Duration Dropdown */}
        <select
          value={quickDuration}
          onChange={e => setQuickDuration(e.target.value)}
          className="bg-slate-900 border border-white/10 text-[10px] font-mono font-bold text-slate-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
        >
          <option value="15m">⏱️ 15m</option>
          <option value="30m">⏱️ 30m</option>
          <option value="45m">⏱️ 45m</option>
          <option value="60m">⏱️ 1h</option>
          <option value="90m">⏱️ 1.5h</option>
        </select>

        {/* Priority Dropdown */}
        <select
          value={quickPriority}
          onChange={e => setQuickPriority(e.target.value as any)}
          className="bg-slate-900 border border-white/10 text-[10px] font-mono font-bold text-slate-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
        >
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🔵 Low</option>
        </select>

        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-lg disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shrink-0"
        >
          <span>Enter</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </form>

      {/* ── HOURLY CHRONOLOGICAL TIMELINE STREAM ───────────────────────── */}
      <div className="relative pl-6 space-y-7 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-purple-500/30">
        <AnimatePresence mode="popLayout">
          {timeBlockedSlots.map((slot) => (
            <div key={slot.label} className="relative space-y-3 group/slot">
              {/* Timeline Hour Node Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#090D16] border-2 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] -ml-[31px] flex items-center justify-center shrink-0 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    {slot.label}
                  </span>
                </div>

                {/* + Quick Slot Add Trigger */}
                <button
                  type="button"
                  onClick={() => setActiveSlotModal(activeSlotModal === slot.label ? null : slot.label)}
                  className="text-[10px] font-mono font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 opacity-0 group-hover/slot:opacity-100 transition cursor-pointer bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20"
                >
                  <Plus className="w-3 h-3" /> Add at {slot.hour}
                </button>
              </div>

              {/* Inline Slot Creator Drawer */}
              {activeSlotModal === slot.label && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2 bg-slate-900 border border-purple-500/30 rounded-xl"
                >
                  <input
                    type="text"
                    autoFocus
                    value={slotTaskTitle}
                    onChange={e => setSlotTaskTitle(e.target.value)}
                    placeholder={`New item for ${slot.hour}...`}
                    className="flex-1 bg-transparent text-xs font-medium text-white placeholder-slate-500 focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSlotInlineSubmit(slot.label);
                    }}
                  />
                  <button
                    onClick={() => handleSlotInlineSubmit(slot.label)}
                    className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-extrabold rounded-lg"
                  >
                    Add
                  </button>
                </motion.div>
              )}

              {/* Task Cards Anchored to Specific Slot */}
              <div className="space-y-2 pt-0.5">
                {slot.tasks.length === 0 ? (
                  <div
                    onClick={() => setActiveSlotModal(slot.label)}
                    className="p-2.5 rounded-xl border border-dashed border-slate-800/80 text-[11px] font-mono text-slate-500 hover:border-purple-500/40 hover:text-slate-300 transition cursor-pointer flex items-center justify-between"
                  >
                    <span>Click to schedule task at {slot.hour}...</span>
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  slot.tasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const priorityColor =
                      task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      task.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/40';

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className={`group p-3 bg-[#090D16] border rounded-2xl flex items-center justify-between gap-3 shadow-md transition-all hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] ${
                          isCompleted ? 'border-white/5 opacity-60 bg-slate-950/40' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
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
                                  <span key={tag} className="text-[9px] font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[9.5px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
                            ⏱️ 30m
                          </span>

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
                  })
                )}
              </div>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
