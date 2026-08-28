import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Sparkles, StickyNote, Clock, Target, 
  Tag, BookOpen, Trash2, Pin
} from 'lucide-react';
import PlannerSuperBar from '../components/planner/PlannerSuperBar';
import PlannerHabitHeatmap from '../components/planner/PlannerHabitHeatmap';
import PlannerTimelineStream from '../components/planner/PlannerTimelineStream';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export interface PlannerTask {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_at?: string | null;
  reminder_at?: string | null;
  recurring_rule?: string;
  tags?: string;
  notes?: string;
  completed_at?: string | null;
  created_at?: string;
}

export interface PlannerNote {
  id: number;
  title: string;
  content?: string;
  color: string;
  priority: string;
  pinned: number;
  archived: number;
  reminder_at?: string | null;
  tags?: string;
  checklist?: string;
  rotation: number;
  created_at?: string;
}

export interface PlannerReminder {
  id: number;
  title: string;
  reminder_at: string;
  recurring_rule: string;
  status: 'pending' | 'sent' | 'dismissed';
  created_at?: string;
}

export interface PlannerGoal {
  id: number;
  title: string;
  category: 'career' | 'finance' | 'personal' | 'health';
  target_description?: string;
  deadline?: string | null;
  progress: number;
  notes?: string;
  status: 'active' | 'completed' | 'paused';
  created_at?: string;
}

export default function Planner() {
  const { themeData } = useTheme();

  // Data states
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [reminders, setReminders] = useState<PlannerReminder[]>([]);
  const [goals, setGoals] = useState<PlannerGoal[]>([]);

  // Mood & Filter States
  const [selectedMood, setSelectedMood] = useState<'focused' | 'relaxed' | 'deep_work'>('focused');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const AVAILABLE_TAGS = ['all', 'personal', 'career', 'finance', 'ideas', 'work'];

  // Super-Bar Quick Capture Modal State
  const [isSuperBarOpen, setIsSuperBarOpen] = useState(false);

  // Debounced Micro-Diary Journal State (500ms Debounce to prevent unnecessary disk writes)
  const [journalText, setJournalText] = useState(() => {
    return localStorage.getItem('venke_daily_journal') || '';
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('venke_daily_journal', journalText);
    }, 500);
    return () => clearTimeout(handler);
  }, [journalText]);

  // Cmd / Ctrl + J Keydown Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsSuperBarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all planner datasets from backend
  const fetchPlannerData = async () => {
    try {
      const [tasksRes, notesRes, remRes, goalsRes] = await Promise.all([
        axios.get(`${API}/planner/tasks`),
        axios.get(`${API}/planner/notes`),
        axios.get(`${API}/planner/reminders`),
        axios.get(`${API}/planner/goals`)
      ]);
      setTasks(tasksRes.data || []);
      setNotes(notesRes.data || []);
      setReminders(remRes.data || []);
      setGoals(goalsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load VENKE Planner data:', err);
    }
  };

  useEffect(() => {
    fetchPlannerData();
  }, []);

  // Submit via Natural Language Super-Bar
  const handleSuperBarSubmit = async (data: {
    title: string;
    type: 'task' | 'note' | 'reminder' | 'goal';
    tags: string[];
    parsedTime?: string;
  }) => {
    const tagStr = data.tags.join(',');

    if (data.type === 'task') {
      await axios.post(`${API}/planner/tasks`, {
        title: data.title,
        priority: 'medium',
        tags: tagStr
      });
    } else if (data.type === 'note') {
      const randRotation = Math.floor(Math.random() * 5) - 2;
      await axios.post(`${API}/planner/notes`, {
        title: data.title,
        color: 'amber',
        rotation: randRotation,
        tags: tagStr
      });
    } else if (data.type === 'reminder') {
      const defaultTime = new Date(Date.now() + 3600 * 1000).toISOString();
      await axios.post(`${API}/planner/reminders`, {
        title: data.title,
        reminder_at: defaultTime
      });
    } else if (data.type === 'goal') {
      await axios.post(`${API}/planner/goals`, {
        title: data.title,
        category: 'personal'
      });
    }

    fetchPlannerData();
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: PlannerTask) => {
    const isCompleted = task.status === 'completed';
    const newStatus = isCompleted ? 'todo' : 'completed';

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await axios.patch(`${API}/planner/tasks/${task.id}/complete`, {
        completed: !isCompleted
      });
      fetchPlannerData();
    } catch (err) {
      fetchPlannerData();
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this item?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await axios.delete(`${API}/planner/tasks/${id}`);
      fetchPlannerData();
    } catch (err) {}
  };

  // Toggle Note Pin
  const handleTogglePinNote = async (note: PlannerNote) => {
    const newPinned = note.pinned ? 0 : 1;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: newPinned } : n));
    try {
      await axios.patch(`${API}/planner/notes/${note.id}/pin`, { pinned: newPinned });
      fetchPlannerData();
    } catch (err) {}
  };

  // Delete Note
  const handleDeleteNote = async (id: number) => {
    if (!window.confirm('Delete this sticky note?')) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await axios.delete(`${API}/planner/notes/${id}`);
      fetchPlannerData();
    } catch (err) {}
  };

  // Calculate Daily Ritual Progress
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'completed').length, [tasks]);
  const totalCount = tasks.length || 1;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="w-full min-h-screen bg-[#070A12] text-slate-100 font-sans relative overflow-x-hidden p-4 sm:p-8 space-y-8">
      {/* Ambient Lighting Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-[15%] w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[10%] w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto space-y-8">
        {/* ── TOP HERO HEADER & OMNI-CAPTURE BAR ─────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          {/* Ambient Greeting */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Personal Life OS
              </span>
              <span className="text-xs font-mono text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Good Evening, Venke ✨
            </h1>

            {/* Minimalist Mood Selector */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs font-bold text-slate-400 mr-1">Current State:</span>
              {[
                { id: 'focused', label: '⚡ Focused', color: 'from-purple-600 to-indigo-600' },
                { id: 'relaxed', label: '🌱 Relaxed', color: 'from-emerald-600 to-teal-600' },
                { id: 'deep_work', label: '💡 Deep Work', color: 'from-amber-600 to-orange-600' }
              ].map(mood => {
                const isSelected = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer relative ${
                      isSelected ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active_mood_pill"
                        className={`absolute inset-0 bg-gradient-to-r ${mood.color} rounded-full shadow-[0_0_12px_rgba(168,85,247,0.4)]`}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Capture Pill & Daily Ritual Completion Ring */}
          <div className="flex items-center space-x-4 shrink-0">
            {/* Daily Ritual Completion Ring */}
            <div className="p-3 bg-[#090D16] border border-white/10 rounded-2xl flex items-center space-x-3 shadow-xl">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 transform -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" className="text-slate-800" fill="transparent" />
                  <circle
                    cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3"
                    className="text-purple-400 transition-all duration-500"
                    fill="transparent"
                    strokeDasharray={100}
                    strokeDashoffset={100 - progressPct}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-black text-white">{progressPct}%</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white">{completedCount} of {tasks.length} Done</span>
                <span className="text-[10px] font-bold text-slate-400">Daily Ritual Progress</span>
              </div>
            </div>

            {/* Omni-Capture Trigger Button */}
            <button
              onClick={() => setIsSuperBarOpen(true)}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Omni-Capture</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-mono text-[10px]">⌘J</span>
            </button>
          </div>
        </div>

        {/* ── 2-COLUMN FLUID SPLIT CANVAS ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN (65% width: Timeline & Journal Flow) ─────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Spatial Tag Filter Strip */}
            <div className="p-2 bg-[#090D16] border border-white/10 rounded-2xl flex items-center space-x-1.5 overflow-x-auto no-scrollbar shadow-lg">
              <span className="text-xs font-bold text-slate-400 px-3 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-purple-400" /> Filter:
              </span>
              {AVAILABLE_TAGS.map(tag => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer relative ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active_tag_filter"
                        className="absolute inset-0 bg-purple-600/30 border border-purple-500/50 rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">#{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Continuous Vertical Dashed Timeline Stream */}
            <div className="p-6 bg-[#090D16]/80 border border-white/10 rounded-3xl shadow-2xl space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Today's Chronological Stream
                  </h3>
                </div>
                <span className="text-xs font-mono text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/30">
                  {tasks.length} Total Items
                </span>
              </div>

              <PlannerTimelineStream
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                selectedTag={selectedTag}
              />
            </div>

            {/* Casual Daily Reflection (Micro-Diary Scratchpad with 500ms Debounced Storage) */}
            <div className="p-6 bg-[#090D16]/80 border border-white/10 rounded-3xl shadow-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white tracking-tight">
                    Casual Daily Reflection & Scratchpad
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Auto-saving (500ms debounce)
                </span>
              </div>

              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                placeholder="What went well today? Thoughts, ideas, key takeaways..."
                rows={4}
                className="w-full bg-[#050811] border border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 shadow-inner resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN (35% width: Context Hub & Digital Brain) ─────── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Dynamic Mini-Calendar & Habit Heatmap */}
            <PlannerHabitHeatmap tasks={tasks} />

            {/* Masonry Pinboard (Quick Sticky Notes with Pastel Neon Tints) */}
            <div className="p-5 bg-[#090D16] border border-white/10 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <StickyNote className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Masonry Digital Pinboard</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{notes.length} Notes</span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {notes.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    No sticky notes pinned yet.
                  </div>
                ) : (
                  notes.map((note) => {
                    const colorStyles: Record<string, string> = {
                      amber: 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
                      emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
                      violet: 'bg-purple-500/10 border-purple-500/30 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
                      cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
                      rose: 'bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                    };
                    const noteTheme = colorStyles[note.color] || colorStyles.amber;

                    return (
                      <motion.div
                        key={note.id}
                        layout
                        style={{ rotate: `${note.rotation || 0}deg` }}
                        className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] hover:z-20 ${noteTheme}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold block truncate">
                            {note.title}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleTogglePinNote(note)}
                              className={`p-1 rounded hover:bg-white/10 transition cursor-pointer ${
                                note.pinned ? 'text-amber-400' : 'text-slate-500'
                              }`}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {note.content && (
                          <p className="text-[11px] font-mono mt-2 opacity-80 leading-normal line-clamp-3">
                            {note.content}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active Radar (Reminders & Goals Countdown Badges) */}
            <div className="p-5 bg-[#090D16] border border-white/10 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">Active Radar & Reminders</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {reminders.length + goals.length} Radar Tokens
                </span>
              </div>

              <div className="space-y-2.5">
                {reminders.map(rem => (
                  <div key={rem.id} className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                    <span className="text-xs font-bold text-white truncate">{rem.title}</span>
                    <span className="text-[9.5px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0">
                      In 2 hours
                    </span>
                  </div>
                ))}
                {goals.map(goal => (
                  <div key={goal.id} className="p-3 bg-slate-900/80 border border-purple-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                    <span className="text-xs font-bold text-white truncate">{goal.title}</span>
                    <span className="text-[9.5px] font-mono font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0">
                      {goal.category}
                    </span>
                  </div>
                ))}
                {reminders.length === 0 && goals.length === 0 && (
                  <div className="py-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    No active radar reminders.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Natural Language Super-Bar Modal */}
      <PlannerSuperBar
        isOpen={isSuperBarOpen}
        onClose={() => setIsSuperBarOpen(false)}
        onSubmit={handleSuperBarSubmit}
      />
    </div>
  );
}
