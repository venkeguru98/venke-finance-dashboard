import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Sparkles, CheckSquare, Layers, Clock, Plus, Pin, 
  Trash2, Tag, Search, Check, RefreshCw, 
  CalendarDays, Target, X, Zap, Sun, Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

// Types
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
  color: string; // 'default' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate'
  priority: string;
  pinned: number;
  archived: number;
  reminder_at?: string | null;
  tags?: string;
  checklist?: string; // JSON string of {id, text, completed}[]
  rotation: number; // -2 to 2 degrees
  created_at?: string;
  updated_at?: string;
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

type ViewMode = 'today' | 'notes' | 'tasks' | 'upcoming' | 'calendar' | 'goals';

// Formatting local device time helper
const formatLocalTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function Planner() {
  const { themeData } = useTheme();
  const [activeView, setActiveView] = useState<ViewMode>('today');

  // Data states
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [reminders, setReminders] = useState<PlannerReminder[]>([]);
  const [goals, setGoals] = useState<PlannerGoal[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Modals & Panels
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<'task' | 'note' | 'reminder' | 'goal'>('task');

  // Smart Plan modal
  const [isSmartPlanOpen, setIsSmartPlanOpen] = useState(false);
  const [smartPlanData, setSmartPlanData] = useState<any>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Note Modal state
  const [editingNote, setEditingNote] = useState<PlannerNote | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('default');
  const noteTags = '';
  const notePinned = 0;

  // Calendar State
  const calendarDate = new Date();
  const [calendarSubTab, setCalendarSubTab] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Load all planner datasets from backend
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

  // Quick Capture submit
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      if (quickType === 'task') {
        await axios.post(`${API}/planner/tasks`, {
          title: quickTitle.trim(),
          priority: 'medium'
        });
      } else if (quickType === 'note') {
        const randRotation = Math.floor(Math.random() * 5) - 2; // -2 to +2 deg
        await axios.post(`${API}/planner/notes`, {
          title: quickTitle.trim(),
          rotation: randRotation
        });
      } else if (quickType === 'reminder') {
        const defaultTime = new Date(Date.now() + 3600 * 1000).toISOString();
        await axios.post(`${API}/planner/reminders`, {
          title: quickTitle.trim(),
          reminder_at: defaultTime
        });
      } else if (quickType === 'goal') {
        await axios.post(`${API}/planner/goals`, {
          title: quickTitle.trim(),
          category: 'personal'
        });
      }

      setQuickTitle('');
      setIsQuickCaptureOpen(false);
      fetchPlannerData();
    } catch (err) {
      console.error('Quick capture failed:', err);
    }
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
      console.error('Failed to toggle task completion:', err);
      fetchPlannerData();
    }
  };

  // Toggle Note Pin
  const handleTogglePinNote = async (note: PlannerNote) => {
    const newPinned = note.pinned ? 0 : 1;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: newPinned } : n));

    try {
      await axios.patch(`${API}/planner/notes/${note.id}/pin`, {
        pinned: newPinned
      });
      fetchPlannerData();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      fetchPlannerData();
    }
  };

  // Convert Note to Task
  const handleConvertNoteToTask = async (note: PlannerNote) => {
    try {
      await axios.post(`${API}/planner/notes/${note.id}/convert-to-task`);
      fetchPlannerData();
    } catch (err) {
      console.error('Failed to convert note to task:', err);
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this sticky note?')) return;
    try {
      await axios.delete(`${API}/planner/notes/${id}`);
      fetchPlannerData();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`${API}/planner/tasks/${id}`);
      fetchPlannerData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Smart Plan Generator
  const handleGenerateSmartPlan = async () => {
    setIsGeneratingPlan(true);
    setIsSmartPlanOpen(true);
    try {
      const res = await axios.post(`${API}/planner/smart-plan`);
      setSmartPlanData(res.data);
    } catch (err) {
      console.error('Smart plan failed:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Create or Update Note Submit
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    try {
      if (editingNote) {
        await axios.put(`${API}/planner/notes/${editingNote.id}`, {
          title: noteTitle.trim(),
          content: noteContent,
          color: noteColor,
          pinned: notePinned,
          tags: noteTags
        });
      } else {
        const randRotation = Math.floor(Math.random() * 5) - 2;
        await axios.post(`${API}/planner/notes`, {
          title: noteTitle.trim(),
          content: noteContent,
          color: noteColor,
          pinned: notePinned,
          tags: noteTags,
          rotation: randRotation
        });
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      fetchPlannerData();
    } catch (err) {
      console.error('Save note error:', err);
    }
  };

  // Filtered Tasks & Notes
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = tagFilter === 'all' || (t.tags || '').includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [tasks, searchQuery, tagFilter]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = tagFilter === 'all' || (n.tags || '').includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, tagFilter]);

  // Priority Badges Helper
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" title="Urgent Priority" />;
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" title="High Priority" />;
      case 'medium':
        return <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" title="Medium Priority" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-400 opacity-60" title="Low Priority" />;
    }
  };

  // Dynamic Greeting based on local device hour
  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const formattedTodayDate = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  // Today Focus tasks count
  const todayFocusCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="w-full space-y-6 animate-fade-in-up pb-12">
      
      {/* ── 1. HEADER BAR ─────────────────────────────────────────────────── */}
      <div 
        style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
        className="rounded-3xl p-6 border shadow-lg backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-2xl" style={{ backgroundColor: themeData.accentPrimary + '20', color: themeData.accentPrimary }}>
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: themeData.accentPrimary }}>
              VENKE PLANNER
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}>
              Local Time Workspace
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: themeData.textPrimary }}>
            {greeting}, Venke
          </h1>

          <p className="text-xs font-medium" style={{ color: themeData.textSecondary }}>
            {formattedTodayDate} • <span className="font-extrabold" style={{ color: themeData.accentPrimary }}>{todayFocusCount} focus items</span> for your day.
          </p>
        </div>

        {/* Right Actions Header Controls */}
        <div className="flex items-center space-x-2.5">
          <Button
            variant="secondary"
            onClick={handleGenerateSmartPlan}
            className="text-xs font-bold flex items-center space-x-1.5 px-4 py-2.5"
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>✨ Plan my day</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsQuickCaptureOpen(true)}
            className="text-xs font-bold flex items-center space-x-1.5 px-4 py-2.5 shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Capture</span>
          </Button>
        </div>
      </div>

      {/* ── 2. THREE-ZONE SPATIAL WORKSPACE LAYOUT ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT ZONE: Views Navigation (Width 3 cols) ────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div 
            style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
            className="rounded-3xl p-3 border shadow-md space-y-1"
          >
            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 block" style={{ color: themeData.textMuted }}>
              WORKSPACE VIEWS
            </span>

            {[
              { id: 'today', label: 'Today', icon: <Sun className="w-4 h-4" />, count: tasks.filter(t => t.status !== 'completed').length },
              { id: 'notes', label: 'Sticky Notes', icon: <Layers className="w-4 h-4" />, count: notes.filter(n => !n.archived).length },
              { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, count: tasks.length },
              { id: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" />, count: null },
              { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" />, count: null },
              { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" />, count: goals.length },
            ].map((v) => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id as ViewMode)}
                  style={isActive ? {
                    backgroundColor: themeData.accentPrimary,
                    color: '#FFFFFF',
                    boxShadow: `0 4px 14px ${themeData.accentGlow}`
                  } : {
                    color: themeData.textSecondary
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold group ${
                    isActive ? 'scale-[1.02]' : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {v.icon}
                    <span>{v.label}</span>
                  </div>
                  {v.count !== null && (
                    <span 
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : themeData.bgSecondary,
                        color: isActive ? '#FFFFFF' : themeData.textMuted
                      }}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    >
                      {v.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Filter Tags Capsule */}
          <div 
            style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
            className="rounded-3xl p-4 border shadow-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: themeData.textMuted }}>
                TAGS & FILTER
              </span>
              <Tag className="w-3.5 h-3.5" style={{ color: themeData.textMuted }} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['all', '#work', '#career', '#finance', '#important', '#personal', '#idea'].map(t => (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  style={{
                    backgroundColor: tagFilter === t ? themeData.accentPrimary : themeData.bgSecondary,
                    color: tagFilter === t ? '#FFFFFF' : themeData.textSecondary,
                    borderColor: themeData.borderColor
                  }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full border transition hover:opacity-80"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── MIDDLE ZONE: Primary Planning Workspace (Width 6 cols) ────────── */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* View Search & Filter Header */}
          <div 
            style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
            className="rounded-3xl p-3 border shadow-md flex items-center space-x-3"
          >
            <Search className="w-4 h-4 ml-2" style={{ color: themeData.textMuted }} />
            <input
              type="text"
              placeholder="Search notes, tasks, reminders, goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: themeData.textPrimary }}
              className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:opacity-75">
                <X className="w-3.5 h-3.5" style={{ color: themeData.textMuted }} />
              </button>
            )}
          </div>

          {/* ── ACTIVE VIEW CONTENT RENDERING ────────────────────────────── */}

          {/* VIEW 1: TODAY COMMAND CENTER */}
          {activeView === 'today' && (
            <div className="space-y-6">
              
              {/* Focus Section */}
              <div 
                style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
                className="rounded-3xl p-6 border shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4" style={{ color: themeData.accentPrimary }} />
                    <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                      Today's Focus
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: themeData.textMuted }}>
                    {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Completed
                  </span>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: themeData.accentPrimary + '20', color: themeData.accentPrimary }}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: themeData.textPrimary }}>Your day is clear ✨</h4>
                    <p className="text-xs" style={{ color: themeData.textMuted }}>Capture an idea or task before it disappears.</p>
                    <Button variant="primary" size="sm" onClick={() => setIsQuickCaptureOpen(true)}>
                      + Add Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {filteredTasks.map(t => {
                      const isCompleted = t.status === 'completed';
                      return (
                        <div
                          key={t.id}
                          style={{
                            backgroundColor: isCompleted ? 'transparent' : themeData.bgSecondary,
                            borderColor: themeData.borderColor
                          }}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-180 group ${
                            isCompleted ? 'opacity-50 line-through' : 'hover:scale-[1.01]'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <button
                              onClick={() => handleToggleTask(t)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate" style={{ color: themeData.textPrimary }}>
                                {t.title}
                              </span>
                              {t.description && (
                                <span className="text-[10px] truncate" style={{ color: themeData.textMuted }}>
                                  {t.description}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {t.due_at && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}>
                                <Clock className="w-2.5 h-2.5" />
                                {formatLocalTime(t.due_at)}
                              </span>
                            )}
                            {renderPriorityBadge(t.priority)}
                            <button onClick={() => handleDeleteTask(t.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Notes Section inside Today */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: themeData.textPrimary }}>
                    <Layers className="w-4 h-4" style={{ color: themeData.accentPrimary }} />
                    Quick Sticky Notes
                  </h3>
                  <button 
                    onClick={() => {
                      setEditingNote(null);
                      setNoteTitle('');
                      setNoteContent('');
                      setIsNoteModalOpen(true);
                    }}
                    className="text-xs font-bold flex items-center space-x-1 hover:underline"
                    style={{ color: themeData.accentPrimary }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Note</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredNotes.slice(0, 4).map(note => (
                    <div
                      key={note.id}
                      style={{
                        backgroundColor: note.color === 'violet' ? 'rgba(139,92,246,0.15)' :
                                         note.color === 'cyan' ? 'rgba(6,182,212,0.15)' :
                                         note.color === 'emerald' ? 'rgba(16,185,129,0.15)' :
                                         note.color === 'amber' ? 'rgba(245,158,11,0.15)' :
                                         note.color === 'rose' ? 'rgba(244,63,94,0.15)' : themeData.bgCard,
                        borderColor: note.pinned ? themeData.accentPrimary : themeData.borderColor,
                        transform: `rotate(${note.rotation || 0}deg)`
                      }}
                      className="p-4 rounded-3xl border shadow-md space-y-2 transition hover:-translate-y-1 hover:shadow-xl relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold truncate" style={{ color: themeData.textPrimary }}>
                          {note.title}
                        </span>
                        <button onClick={() => handleTogglePinNote(note)} className="p-1 transition" style={{ color: note.pinned ? themeData.accentPrimary : themeData.textMuted }}>
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs line-clamp-3 font-medium" style={{ color: themeData.textSecondary }}>
                        {note.content || 'No content...'}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[10px]" style={{ color: themeData.textMuted }}>
                        <span>{note.tags || '#note'}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleConvertNoteToTask(note)} title="Convert to Task" className="hover:text-emerald-400 p-0.5">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} title="Delete Note" className="hover:text-rose-400 p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: STICKY NOTES WALL */}
          {activeView === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                    Sticky Notes Workspace
                  </h3>
                  <p className="text-xs" style={{ color: themeData.textMuted }}>
                    Free-flowing digital paper cards for quick thoughts and checklists.
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => {
                    setEditingNote(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setIsNoteModalOpen(true);
                  }}
                >
                  + New Note
                </Button>
              </div>

              {filteredNotes.length === 0 ? (
                <div className="py-16 text-center space-y-3" style={{ backgroundColor: themeData.bgCard }}>
                  <Layers className="w-10 h-10 mx-auto" style={{ color: themeData.textMuted }} />
                  <p className="text-xs" style={{ color: themeData.textMuted }}>No sticky notes captured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredNotes.map(n => (
                    <div
                      key={n.id}
                      style={{
                        backgroundColor: n.color === 'violet' ? 'rgba(139,92,246,0.15)' :
                                         n.color === 'cyan' ? 'rgba(6,182,212,0.15)' :
                                         n.color === 'emerald' ? 'rgba(16,185,129,0.15)' :
                                         n.color === 'amber' ? 'rgba(245,158,11,0.15)' :
                                         n.color === 'rose' ? 'rgba(244,63,94,0.15)' : themeData.bgCard,
                        borderColor: n.pinned ? themeData.accentPrimary : themeData.borderColor,
                        transform: `rotate(${n.rotation || 0}deg)`
                      }}
                      className="p-5 rounded-3xl border shadow-lg space-y-3 transition hover:-translate-y-1 hover:shadow-2xl relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold truncate" style={{ color: themeData.textPrimary }}>
                          {n.title}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => handleTogglePinNote(n)} className="p-1 hover:opacity-75" style={{ color: n.pinned ? themeData.accentPrimary : themeData.textMuted }}>
                            <Pin className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap" style={{ color: themeData.textSecondary }}>
                        {n.content || 'Empty note...'}
                      </p>

                      <div className="pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}>
                        <span>{n.tags || '#idea'}</span>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleConvertNoteToTask(n)} className="hover:text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckSquare className="w-3 h-3" /> Convert
                          </button>
                          <button onClick={() => handleDeleteNote(n.id)} className="hover:text-rose-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: TASKS LIST */}
          {activeView === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                  All Planner Tasks ({filteredTasks.length})
                </h3>
                <Button variant="primary" size="sm" onClick={() => setIsQuickCaptureOpen(true)}>
                  + Add Task
                </Button>
              </div>

              <div className="space-y-2">
                {filteredTasks.map(t => (
                  <div
                    key={t.id}
                    style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
                    className="p-4 rounded-2xl border flex items-center justify-between group transition hover:scale-[1.01]"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleTask(t)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                          t.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'
                        }`}
                      >
                        {t.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <div>
                        <span className={`text-xs font-bold block ${t.status === 'completed' ? 'line-through opacity-50' : ''}`} style={{ color: themeData.textPrimary }}>
                          {t.title}
                        </span>
                        {t.description && <span className="text-[10px]" style={{ color: themeData.textMuted }}>{t.description}</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {renderPriorityBadge(t.priority)}
                      <button onClick={() => handleDeleteTask(t.id)} className="p-1 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: themeData.textMuted }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: UPCOMING TIMELINE */}
          {activeView === 'upcoming' && (
            <div className="space-y-6">
              <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                Upcoming Schedule Timeline
              </h3>

              <div className="space-y-4 relative pl-4 border-l-2" style={{ borderColor: themeData.accentPrimary + '40' }}>
                {['TODAY', 'TOMORROW', 'THIS WEEK', 'LATER'].map((period, pIdx) => (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full -ml-[21px]" style={{ backgroundColor: themeData.accentPrimary }} />
                      <span className="text-xs font-black tracking-wider" style={{ color: themeData.accentPrimary }}>
                        {period}
                      </span>
                    </div>

                    <div className="space-y-2 pl-2">
                      {tasks.slice(pIdx * 2, pIdx * 2 + 2).map(t => (
                        <div key={t.id} style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }} className="p-3 rounded-2xl border text-xs font-bold flex justify-between">
                          <span style={{ color: themeData.textPrimary }}>{t.title}</span>
                          <span style={{ color: themeData.textMuted }}>{t.due_at ? formatLocalTime(t.due_at) : 'All day'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 5: CALENDAR */}
          {activeView === 'calendar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                  Calendar ({calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' })})
                </h3>
                <div className="flex space-x-1 p-1 rounded-2xl border" style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}>
                  {['month', 'week', 'day', 'agenda'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setCalendarSubTab(tab as any)}
                      style={{
                        backgroundColor: calendarSubTab === tab ? themeData.accentPrimary : 'transparent',
                        color: calendarSubTab === tab ? '#FFFFFF' : themeData.textMuted
                      }}
                      className="px-3 py-1 rounded-xl text-xs font-extrabold capitalize transition"
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }} className="p-6 rounded-3xl border shadow-lg text-center space-y-4">
                <p className="text-xs font-medium" style={{ color: themeData.textSecondary }}>
                  Calendar integration active. Displaying events in your browser local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                </p>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <span key={d} style={{ color: themeData.textMuted }}>{d}</span>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ backgroundColor: i + 1 === now.getDate() ? themeData.accentPrimary + '30' : themeData.bgSecondary, borderColor: themeData.borderColor }} 
                      className="p-3 rounded-2xl border text-xs font-black hover:border-purple-500 cursor-pointer"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: GOALS */}
          {activeView === 'goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                  Personal & Career Goals ({goals.length})
                </h3>
              </div>

              <div className="space-y-3">
                {goals.map(g => (
                  <div key={g.id} style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }} className="p-5 rounded-3xl border shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold" style={{ color: themeData.textPrimary }}>{g.title}</span>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border" style={{ borderColor: themeData.borderColor, color: themeData.accentPrimary }}>
                        {g.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold" style={{ color: themeData.textMuted }}>
                        <span>Progress</span>
                        <span>{g.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeData.bgSecondary }}>
                        <div className="h-full transition-all duration-300" style={{ width: `${g.progress}%`, backgroundColor: themeData.accentPrimary }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT ZONE: Quick Context / Reminders Panel (Width 3 cols) ──── */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Active Reminders Card */}
          <div 
            style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
            className="rounded-3xl p-5 border shadow-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: themeData.textMuted }}>
                <Bell className="w-3.5 h-3.5" style={{ color: themeData.accentPrimary }} />
                ACTIVE REMINDERS
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: themeData.accentPrimary + '20', color: themeData.accentPrimary }}>
                {reminders.length}
              </span>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: themeData.textMuted }}>No active reminders scheduled.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor }} className="p-3 rounded-2xl border text-xs space-y-1">
                    <span className="font-extrabold block" style={{ color: themeData.textPrimary }}>{r.title}</span>
                    <span className="text-[10px] font-mono block" style={{ color: themeData.textMuted }}>
                      {formatLocalTime(r.reminder_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Capture Box */}
          <div 
            style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }}
            className="rounded-3xl p-5 border shadow-md space-y-3"
          >
            <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: themeData.textMuted }}>
              QUICK CAPTURE
            </span>
            <form onSubmit={handleQuickCapture} className="space-y-2">
              <input
                type="text"
                placeholder="What do you want to remember?"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor, color: themeData.textPrimary }}
                className="w-full text-xs p-3 rounded-2xl border outline-none font-medium placeholder:text-slate-500"
              />
              <div className="flex gap-1.5">
                {(['task', 'note', 'reminder', 'goal'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuickType(t)}
                    style={{
                      backgroundColor: quickType === t ? themeData.accentPrimary : themeData.bgSecondary,
                      color: quickType === t ? '#FFFFFF' : themeData.textMuted
                    }}
                    className="flex-1 text-[10px] font-extrabold py-1.5 rounded-xl capitalize transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-full text-xs font-bold py-2">
                + Capture
              </Button>
            </form>
          </div>
        </div>

      </div>

      {/* ── SMART PLAN MODAL ───────────────────────────────────────────── */}
      {isSmartPlanOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1200] flex items-center justify-center p-4">
          <div style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                  ✨ Plan My Day
                </h3>
              </div>
              <button onClick={() => setIsSmartPlanOpen(false)} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" style={{ color: themeData.textMuted }} />
              </button>
            </div>

            {isGeneratingPlan ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                <p className="text-xs font-bold" style={{ color: themeData.textPrimary }}>Analyzing your tasks & priorities...</p>
              </div>
            ) : smartPlanData && (
              <div className="space-y-4">
                <p className="text-xs font-medium" style={{ color: themeData.textSecondary }}>
                  {smartPlanData.message}
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {smartPlanData.suggestions?.map((item: any, idx: number) => (
                    <div key={item.id} style={{ backgroundColor: themeData.bgCard, borderColor: themeData.borderColor }} className="p-3 rounded-2xl border flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold" style={{ color: themeData.textPrimary }}>{item.title}</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ borderColor: themeData.borderColor, color: themeData.accentPrimary }}>
                        {item.suggestedTime}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsSmartPlanOpen(false)}>
                    Close
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setIsSmartPlanOpen(false)}>
                    Approve Plan
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT NOTE MODAL ────────────────────────────────────── */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1200] flex items-center justify-center p-4">
          <form onSubmit={handleSaveNote} style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                {editingNote ? 'Edit Sticky Note' : 'Create Sticky Note'}
              </h3>
              <button type="button" onClick={() => setIsNoteModalOpen(false)} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" style={{ color: themeData.textMuted }} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Note Title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor, color: themeData.textPrimary }}
              className="w-full text-xs p-3 rounded-2xl border outline-none font-bold placeholder:text-slate-500"
              required
            />

            <textarea
              placeholder="Write your note thoughts here..."
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor, color: themeData.textPrimary }}
              className="w-full text-xs p-3 rounded-2xl border outline-none font-medium placeholder:text-slate-500 resize-none"
            />

            <div className="flex items-center justify-between">
              <div className="flex space-x-1.5">
                {['default', 'violet', 'cyan', 'emerald', 'amber', 'rose'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNoteColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition ${noteColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
                    style={{
                      backgroundColor: c === 'violet' ? '#8B5CF6' :
                                       c === 'cyan' ? '#06B6D4' :
                                       c === 'emerald' ? '#10B981' :
                                       c === 'amber' ? '#F59E0B' :
                                       c === 'rose' ? '#F43F5E' : themeData.bgCard
                    }}
                  />
                ))}
              </div>

              <div className="flex space-x-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsNoteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Note
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── QUICK CAPTURE MODAL ────────────────────────────────────── */}
      {isQuickCaptureOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1200] flex items-center justify-center p-4">
          <div style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                ⚡ Quick Capture
              </h3>
              <button type="button" onClick={() => setIsQuickCaptureOpen(false)} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" style={{ color: themeData.textMuted }} />
              </button>
            </div>

            <form onSubmit={handleQuickCapture} className="space-y-3">
              <input
                type="text"
                placeholder="What do you want to remember?"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                style={{ backgroundColor: themeData.bgSecondary, borderColor: themeData.borderColor, color: themeData.textPrimary }}
                className="w-full text-xs p-3.5 rounded-2xl border outline-none font-bold placeholder:text-slate-500"
                autoFocus
              />

              <div className="flex gap-1.5">
                {(['task', 'note', 'reminder', 'goal'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuickType(t)}
                    style={{
                      backgroundColor: quickType === t ? themeData.accentPrimary : themeData.bgSecondary,
                      color: quickType === t ? '#FFFFFF' : themeData.textMuted
                    }}
                    className="flex-1 text-[10px] font-extrabold py-2 rounded-xl capitalize transition"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsQuickCaptureOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  + Capture
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
