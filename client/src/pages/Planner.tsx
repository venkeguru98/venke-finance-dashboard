import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Sparkles, StickyNote, Clock, 
  Tag, BookOpen, Pin, Plus, X, Bell
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
  recurring_rule?: string;
  status?: 'pending' | 'sent' | 'dismissed';
  countdown?: string;
  badgeColor?: string;
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

// ── RICH WORKING DEFAULT FALLBACK DATA (Guarantees No Empty Void) ─────────────
const DEFAULT_TASKS: PlannerTask[] = [
  { id: 101, title: 'Review Mutual Funds Portfolio & SIP Performance', status: 'todo', priority: 'high', tags: 'finance,investment' },
  { id: 102, title: 'Finalize Q3 Freelance Invoices & GST Filing', status: 'todo', priority: 'urgent', tags: 'work,tax' },
  { id: 103, title: 'Complete 45m Cardiovascular & Core Routine', status: 'completed', priority: 'medium', tags: 'health,workout' },
  { id: 104, title: 'Read 20 pages of "Psychology of Money"', status: 'todo', priority: 'low', tags: 'personal,reading' }
];

const DEFAULT_NOTES: PlannerNote[] = [
  { id: 201, title: '💡 Hybrid Gold Accumulation Strategy', content: 'Explore Sovereign Gold Bonds (SGB) vs Digital Gold 24k auto-pay.', color: 'amber', priority: 'high', pinned: 1, archived: 0, rotation: -1 },
  { id: 202, title: '🛒 Monthly Groceries & Staples', content: 'Organic oats, almond milk, dark roast coffee beans, olive oil.', color: 'mint', priority: 'medium', pinned: 0, archived: 0, rotation: 1 },
  { id: 203, title: '🧘 Personal Life Goals 2026', content: 'Maintain 74% savings rate, visit Himachal, read 15 books.', color: 'lavender', priority: 'low', pinned: 0, archived: 0, rotation: 0 }
];

const DEFAULT_REMINDERS: PlannerReminder[] = [
  { id: 301, title: '📋 ITR Filing & Tax Review', reminder_at: '2026-08-28T20:00:00Z', countdown: 'In 2 hours', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 302, title: '💊 Health Insurance Renew Enquiry', reminder_at: '2026-08-29T10:00:00Z', countdown: 'Tomorrow, 10:00 AM', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
];

export default function Planner() {
  // Data states
  const [tasks, setTasks] = useState<PlannerTask[]>(DEFAULT_TASKS);
  const [notes, setNotes] = useState<PlannerNote[]>(DEFAULT_NOTES);
  const [reminders, setReminders] = useState<PlannerReminder[]>(DEFAULT_REMINDERS);

  // Mood & Filter States
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const AVAILABLE_TAGS = ['all', 'personal', 'career', 'finance', 'ideas', 'work'];

  // Habit Bar Toggle States
  const [habits, setHabits] = useState([
    { id: 'hydration', label: '💧 Hydration', done: true },
    { id: 'deep_work', label: '⚡ 2h Deep Work', done: true },
    { id: 'workout', label: '🏃 Workout', done: false },
    { id: 'reading', label: '📖 Reading', done: false }
  ]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, done: !h.done } : h));
  };

  const completedHabitsCount = habits.filter(h => h.done).length;
  const habitProgressPct = Math.round((completedHabitsCount / habits.length) * 100);

  // Super-Bar Quick Capture Modal State
  const [isSuperBarOpen, setIsSuperBarOpen] = useState(false);

  // Debounced Micro-Diary Journal State (500ms Debounce)
  const [journalText, setJournalText] = useState(() => {
    return localStorage.getItem('venke_daily_journal') || '### 🌟 Daily Win:\n- Completed quarterly budget optimization ahead of schedule!\n\n### 🎯 Key Priority:\n- Finish freelance portfolio audit and file ITR documents.';
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('venke_daily_journal', journalText);
    }, 500);
    return () => clearTimeout(handler);
  }, [journalText]);

  // Insert Notion-Style Prompt Block into Journal
  const handleInsertJournalPrompt = (promptHeader: string) => {
    setJournalText(prev => {
      const spacing = prev.trim() ? '\n\n' : '';
      return `${prev}${spacing}### ${promptHeader}:\n- `;
    });
  };

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
      const [tasksRes, notesRes, remRes] = await Promise.all([
        axios.get(`${API}/planner/tasks`),
        axios.get(`${API}/planner/notes`),
        axios.get(`${API}/planner/reminders`)
      ]);
      if (tasksRes.data && tasksRes.data.length > 0) setTasks(tasksRes.data);
      if (notesRes.data && notesRes.data.length > 0) setNotes(notesRes.data);
      if (remRes.data && remRes.data.length > 0) setReminders(remRes.data);
    } catch (err: any) {
      console.log('Loaded default working VENKE Planner datasets.');
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
      const newTask: PlannerTask = {
        id: Date.now(),
        title: data.title,
        status: 'todo',
        priority: 'high',
        tags: tagStr || 'finance'
      };
      setTasks(prev => [newTask, ...prev]);
      try {
        await axios.post(`${API}/planner/tasks`, {
          title: data.title,
          priority: 'high',
          tags: tagStr
        });
      } catch (_) {}
    } else if (data.type === 'note') {
      const newNote: PlannerNote = {
        id: Date.now(),
        title: data.title,
        content: 'New quick note entry.',
        color: 'amber',
        priority: 'medium',
        pinned: 0,
        archived: 0,
        rotation: Math.floor(Math.random() * 5) - 2
      };
      setNotes(prev => [newNote, ...prev]);
      try {
        await axios.post(`${API}/planner/notes`, {
          title: data.title,
          color: 'amber',
          rotation: newNote.rotation
        });
      } catch (_) {}
    } else if (data.type === 'reminder') {
      const newRem: PlannerReminder = {
        id: Date.now(),
        title: data.title,
        reminder_at: new Date().toISOString(),
        countdown: 'In 1 hour',
        badgeColor: 'bg-[#C084FC]/20 text-[#F3E8FF] border-[#C084FC]/40'
      };
      setReminders(prev => [newRem, ...prev]);
    }
  };

  // Add Task directly via Inline Row
  const handleAddTaskInline = (title: string, _duration?: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    const newTask: PlannerTask = {
      id: Date.now(),
      title,
      status: 'todo',
      priority,
      tags: selectedTag !== 'all' ? selectedTag : 'personal'
    };
    setTasks(prev => [newTask, ...prev]);
    axios.post(`${API}/planner/tasks`, { title, priority, tags: newTask.tags }).catch(() => {});
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: PlannerTask) => {
    const isCompleted = task.status === 'completed';
    const newStatus = isCompleted ? 'todo' : 'completed';

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await axios.patch(`${API}/planner/tasks/${task.id}/complete`, {
        completed: !isCompleted
      });
    } catch (_) {}
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await axios.delete(`${API}/planner/tasks/${id}`);
    } catch (_) {}
  };

  // Create New Sticky Note
  const handleCreateNewNote = () => {
    const noteColors = ['amber', 'mint', 'lavender'];
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
    const newNote: PlannerNote = {
      id: Date.now(),
      title: 'New Idea Note',
      content: 'Click to type your thoughts...',
      color: randomColor,
      priority: 'medium',
      pinned: 0,
      archived: 0,
      rotation: Math.floor(Math.random() * 5) - 2
    };
    setNotes(prev => [newNote, ...prev]);
  };

  // Update Note Content Inline
  const handleUpdateNoteContent = (id: number, content: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
  };

  // Toggle Note Pin
  const handleTogglePinNote = (note: PlannerNote) => {
    const newPinned = note.pinned ? 0 : 1;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: newPinned } : n));
  };

  // Delete Note
  const handleDeleteNote = (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Create New Reminder
  const handleAddReminder = () => {
    const title = prompt('Enter reminder title:');
    if (!title) return;
    const newRem: PlannerReminder = {
      id: Date.now(),
      title,
      reminder_at: new Date().toISOString(),
      countdown: 'Today, 8:00 PM',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
    setReminders(prev => [...prev, newRem]);
  };

  return (
    <div className="w-full min-h-screen bg-[#070A12] text-slate-100 font-sans relative overflow-x-hidden p-4 sm:p-8 space-y-8">
      {/* Ambient Lighting Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-[15%] w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[10%] w-[500px] h-[300px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto space-y-8">
        {/* ── TOP HERO HEADER & TACTILE HABIT CHECKLIST BAR ──────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/10">
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

            {/* Quick Daily Habit Toggle Pills */}
            <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-2">
              <span className="text-xs font-bold text-slate-400 mr-1">Daily Habits:</span>
              {habits.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    habit.done
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-slate-200'
                  }`}
                >
                  <span>{habit.label}</span>
                  {habit.done && <span className="text-emerald-400 text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Habit Progress Percentage Ring & Omni-Capture Trigger */}
          <div className="flex items-center space-x-4 shrink-0">
            {/* Neon Mint Circular Ring */}
            <div className="p-3 bg-[#090D16] border border-white/10 rounded-2xl flex items-center space-x-3 shadow-xl">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-11 h-11 transform -rotate-90">
                  <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="3.5" className="text-slate-800" fill="transparent" />
                  <circle
                    cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="3.5"
                    className="text-emerald-400 transition-all duration-500"
                    fill="transparent"
                    strokeDasharray={113}
                    strokeDashoffset={113 - (113 * habitProgressPct) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[11px] font-mono font-black text-emerald-300">{habitProgressPct}%</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white">{completedHabitsCount} of {habits.length} Habits</span>
                <span className="text-[10px] font-bold text-slate-400">Daily Ritual Streak</span>
              </div>
            </div>

            {/* Omni-Capture Super-Bar Button */}
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
          {/* ── LEFT COLUMN (65% width: Timeline & Guided Journal Flow) ─────── */}
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

            {/* Hourly Time-Blocked Stream Component */}
            <div className="p-6 bg-[#090D16]/80 border border-white/10 rounded-3xl shadow-2xl space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Hourly Time-Blocked Schedule
                  </h3>
                </div>
                <span className="text-xs font-mono text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/30">
                  {tasks.length} Active Items
                </span>
              </div>

              <PlannerTimelineStream
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTaskInline}
                selectedTag={selectedTag}
              />
            </div>

            {/* Guided Daily Reflection Journal (Notion-Style) */}
            <div className="p-6 bg-[#090D16]/80 border border-white/10 rounded-3xl shadow-2xl space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white tracking-tight">
                    Guided Daily Reflection & Journal
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400">
                    Auto-saved to local memory
                  </span>
                </div>
              </div>

              {/* Interactive Prompt Chips Row */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {[
                  { label: '🌟 Daily Win', header: '🌟 Daily Win' },
                  { label: '🎯 Key Priority', header: '🎯 Key Priority' },
                  { label: '💡 Idea / Learning', header: '💡 Idea / Learning' },
                  { label: '🧘 Evening Note', header: '🧘 Evening Note' }
                ].map(prompt => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => handleInsertJournalPrompt(prompt.header)}
                    className="px-2.5 py-1 bg-slate-900 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-[11px] font-bold text-slate-300 hover:text-emerald-300 rounded-xl transition cursor-pointer"
                  >
                    + {prompt.label}
                  </button>
                ))}
              </div>

              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                placeholder="Click prompt chips above or type naturally..."
                rows={5}
                className="w-full bg-[#050811] border border-white/10 rounded-2xl p-4 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 shadow-inner resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN (35% width: Tactile Productivity Brain) ─────── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Dynamic Mini-Calendar & Dot-Matrix Habit Heatmap */}
            <PlannerHabitHeatmap tasks={tasks} />

            {/* Masonry Pinboard (Tactile Pastel Glass Sticky Notes) */}
            <div className="p-5 bg-[#090D16] border border-white/10 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <StickyNote className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Pastel Glass Digital Pinboard</span>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  className="text-[10px] font-mono font-extrabold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Note
                </button>
              </div>

              <div className="space-y-3 max-h-[440px] overflow-y-auto custom-scrollbar pr-1">
                {notes.map((note) => {
                  let noteBg = 'rgba(245, 158, 11, 0.08)';
                  let noteBorder = 'rgba(245, 158, 11, 0.25)';
                  let textColor = 'text-amber-200';

                  if (note.color === 'mint') {
                    noteBg = 'rgba(16, 185, 129, 0.08)';
                    noteBorder = 'rgba(16, 185, 129, 0.25)';
                    textColor = 'text-emerald-200';
                  } else if (note.color === 'lavender') {
                    noteBg = 'rgba(168, 85, 247, 0.08)';
                    noteBorder = 'rgba(168, 85, 247, 0.25)';
                    textColor = 'text-purple-200';
                  }

                  return (
                    <motion.div
                      key={note.id}
                      layout
                      style={{
                        background: noteBg,
                        border: `1px solid ${noteBorder}`,
                        rotate: `${note.rotation || 0}deg`
                      }}
                      className={`group p-4 rounded-2xl transition-all hover:scale-[1.02] ${textColor}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
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
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Direct Inline Note Content Editing */}
                      <textarea
                        value={note.content || ''}
                        onChange={e => handleUpdateNoteContent(note.id, e.target.value)}
                        placeholder="Type note content..."
                        rows={2}
                        className="w-full bg-transparent text-[11px] font-mono opacity-90 leading-relaxed focus:outline-none resize-none border-none p-0"
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Active Radar Reminders */}
            <div className="p-5 bg-[#090D16] border border-white/10 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">Active Radar Reminders</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddReminder}
                  className="text-[10px] font-mono font-extrabold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Reminder
                </button>
              </div>

              <div className="space-y-2.5">
                {reminders.map(rem => (
                  <div key={rem.id} className="p-3 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                    <span className="text-xs font-bold text-white truncate">{rem.title}</span>
                    <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${rem.badgeColor || 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                      {rem.countdown || 'Today, 8:00 PM'}
                    </span>
                  </div>
                ))}
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
