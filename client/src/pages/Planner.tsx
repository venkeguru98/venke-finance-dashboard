import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Layers, Plus, RefreshCw, X, Zap, Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';

// Scoped Planner UI Subcomponents
import PlannerAmbientBackground from '../components/planner/PlannerAmbientBackground';
import PlannerHeader from '../components/planner/PlannerHeader';
import PlannerSidebar, { type ViewMode } from '../components/planner/PlannerSidebar';
import PlannerSearch from '../components/planner/PlannerSearch';
import PlannerTaskItem from '../components/planner/PlannerTaskItem';
import PlannerNoteCard from '../components/planner/PlannerNoteCard';
import PlannerQuickCapture from '../components/planner/PlannerQuickCapture';
import PlannerEmptyState from '../components/planner/PlannerEmptyState';

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

  // Modals & Control States
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

  // Save Sticky Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    try {
      if (editingNote) {
        await axios.put(`${API}/planner/notes/${editingNote.id}`, {
          title: noteTitle.trim(),
          content: noteContent,
          color: noteColor
        });
      } else {
        const randRotation = Math.floor(Math.random() * 5) - 2;
        await axios.post(`${API}/planner/notes`, {
          title: noteTitle.trim(),
          content: noteContent,
          color: noteColor,
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

  // Today focus items count
  const todayFocusCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="w-full space-y-6 animate-fade-in-up pb-16 relative">
      
      {/* ── Scoped Ambient Lighting Background ───────────────────────────── */}
      <PlannerAmbientBackground />

      {/* ── 1. HEADER HERO BAR ───────────────────────────────────────────── */}
      <PlannerHeader
        todayFocusCount={todayFocusCount}
        onOpenSmartPlan={handleGenerateSmartPlan}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
      />

      {/* ── 2. SPATIAL THREE-ZONE WORKSPACE LAYOUT ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* ── LEFT ZONE: Views Navigation (3 cols) ─────────────────────── */}
        <div className="lg:col-span-3">
          <PlannerSidebar
            activeView={activeView}
            setActiveView={setActiveView}
            tasksCount={tasks.length}
            notesCount={notes.filter(n => !n.archived).length}
            goalsCount={goals.length}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
          />
        </div>

        {/* ── MIDDLE ZONE: Primary Workspace (6 cols) ───────────────────── */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Command-Center Search Bar */}
          <PlannerSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* ── ACTIVE VIEW CONTENT RENDERING ────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* VIEW 1: TODAY COMMAND CENTER */}
              {activeView === 'today' && (
                <div className="space-y-6">
                  
                  {/* Focus Tasks Section */}
                  <div 
                    style={{ backgroundColor: `${themeData.bgCard}E6`, borderColor: themeData.borderColor }}
                    className="planner-glass-surface rounded-3xl p-6 border shadow-xl space-y-4 backdrop-blur-2xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <CheckSquare className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                          Today's Focus Agenda
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border bg-black/20" style={{ borderColor: themeData.borderColor, color: themeData.textMuted }}>
                        {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Done
                      </span>
                    </div>

                    {filteredTasks.length === 0 ? (
                      <PlannerEmptyState
                        title="Your day is completely clear ✨"
                        description="Enjoy your focus time or capture a new idea before it slips away."
                        actionText="+ Add Focus Task"
                        onAction={() => setIsQuickCaptureOpen(true)}
                        iconType="sparkles"
                      />
                    ) : (
                      <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                        <AnimatePresence>
                          {filteredTasks.map(t => (
                            <PlannerTaskItem
                              key={t.id}
                              task={t}
                              onToggle={handleToggleTask}
                              onDelete={handleDeleteTask}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Quick Sticky Notes Section */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: themeData.textPrimary }}>
                        <Layers className="w-4 h-4 text-purple-400" />
                        Quick Sticky Notes
                      </h3>
                      <button 
                        onClick={() => {
                          setEditingNote(null);
                          setNoteTitle('');
                          setNoteContent('');
                          setIsNoteModalOpen(true);
                        }}
                        className="text-xs font-bold flex items-center space-x-1 hover:underline text-purple-400 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Note</span>
                      </button>
                    </div>

                    {filteredNotes.length === 0 ? (
                      <PlannerEmptyState
                        title="No sticky notes captured"
                        description="Create freeform digital notes for thoughts, checklists, and quick ideas."
                        actionText="+ New Sticky Note"
                        onAction={() => {
                          setEditingNote(null);
                          setNoteTitle('');
                          setNoteContent('');
                          setIsNoteModalOpen(true);
                        }}
                        iconType="notes"
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <AnimatePresence>
                          {filteredNotes.slice(0, 4).map(note => (
                            <PlannerNoteCard
                              key={note.id}
                              note={note}
                              onTogglePin={handleTogglePinNote}
                              onConvertToTask={handleConvertNoteToTask}
                              onDelete={handleDeleteNote}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW 2: STICKY NOTES WORKSPACE BOARD */}
              {activeView === 'notes' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Layers className="w-4 h-4" />
                        </span>
                        <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                          Sticky Notes Workspace Board
                        </h3>
                      </div>
                      <p className="text-xs font-semibold mt-1" style={{ color: themeData.textMuted }}>
                        Tactile digital paper notes with natural rotation, depth, and 3D proximity interaction.
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
                      className="shadow-lg"
                    >
                      + New Note
                    </Button>
                  </div>

                  {/* Digital Desk Board Surface */}
                  <div 
                    style={{ 
                      backgroundColor: `${themeData.bgCard}B0`, 
                      borderColor: themeData.borderColor,
                      backgroundImage: `radial-gradient(${themeData.accentPrimary}20 1px, transparent 1px)`,
                      backgroundSize: '24px 24px'
                    }}
                    className="planner-glass-surface rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl min-h-[420px] relative overflow-hidden"
                  >
                    {/* Background Desk Ambient Glow */}
                    <div 
                      style={{
                        background: `radial-gradient(circle, ${themeData.accentPrimary}25 0%, transparent 70%)`
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
                    />

                    {filteredNotes.length === 0 ? (
                      <PlannerEmptyState
                        title="Your ideas live here ✦"
                        description="Capture thoughts, reminders, and quick ideas on tactile digital sticky notes before they disappear."
                        actionText="+ Create Sticky Note"
                        onAction={() => {
                          setEditingNote(null);
                          setNoteTitle('');
                          setNoteContent('');
                          setIsNoteModalOpen(true);
                        }}
                        iconType="notes"
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        <AnimatePresence>
                          {filteredNotes.map(n => (
                            <PlannerNoteCard
                              key={n.id}
                              note={n}
                              onTogglePin={handleTogglePinNote}
                              onConvertToTask={handleConvertNoteToTask}
                              onDelete={handleDeleteNote}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
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

                  {filteredTasks.length === 0 ? (
                    <PlannerEmptyState
                      title="No tasks in list"
                      description="Create action items with priority tags and due times."
                      actionText="+ Add Task"
                      onAction={() => setIsQuickCaptureOpen(true)}
                      iconType="tasks"
                    />
                  ) : (
                    <div className="space-y-2.5">
                      <AnimatePresence>
                        {filteredTasks.map(t => (
                          <PlannerTaskItem
                            key={t.id}
                            task={t}
                            onToggle={handleToggleTask}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 4: UPCOMING TIMELINE */}
              {activeView === 'upcoming' && (
                <div className="space-y-6">
                  <h3 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
                    Upcoming Schedule Timeline
                  </h3>

                  <div className="space-y-4 relative pl-4 border-l-2" style={{ borderColor: `${themeData.accentPrimary}40` }}>
                    {['TODAY', 'TOMORROW', 'THIS WEEK', 'LATER'].map((period, pIdx) => (
                      <div key={period} className="space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full -ml-[22px] border-2 border-slate-900 shadow-sm" style={{ backgroundColor: themeData.accentPrimary }} />
                          <span className="text-xs font-black tracking-wider" style={{ color: themeData.accentPrimary }}>
                            {period}
                          </span>
                        </div>

                        <div className="space-y-2 pl-2">
                          {tasks.slice(pIdx * 2, pIdx * 2 + 2).map(t => (
                            <div 
                              key={t.id} 
                              style={{ backgroundColor: `${themeData.bgCard}E6`, borderColor: themeData.borderColor }} 
                              className="planner-glass-surface p-3.5 rounded-2xl border text-xs font-bold flex justify-between items-center"
                            >
                              <span style={{ color: themeData.textPrimary }}>{t.title}</span>
                              <span className="font-mono text-[10px]" style={{ color: themeData.textMuted }}>
                                {t.due_at ? formatLocalTime(t.due_at) : 'All day'}
                              </span>
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
                    <div className="flex space-x-1 p-1 rounded-2xl border bg-black/20" style={{ borderColor: themeData.borderColor }}>
                      {['month', 'week', 'day', 'agenda'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setCalendarSubTab(tab as any)}
                          style={{
                            backgroundColor: calendarSubTab === tab ? themeData.accentPrimary : 'transparent',
                            color: calendarSubTab === tab ? '#FFFFFF' : themeData.textMuted
                          }}
                          className="px-3 py-1 rounded-xl text-xs font-extrabold capitalize transition cursor-pointer"
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div 
                    style={{ backgroundColor: `${themeData.bgCard}E6`, borderColor: themeData.borderColor }} 
                    className="planner-glass-surface p-6 rounded-3xl border shadow-xl text-center space-y-4 backdrop-blur-2xl"
                  >
                    <p className="text-xs font-medium" style={{ color: themeData.textSecondary }}>
                      Calendar view active. Schedule mapped to your browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                    </p>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <span key={d} style={{ color: themeData.textMuted }}>{d}</span>
                      ))}
                      {Array.from({ length: 31 }).map((_, i) => (
                        <div 
                          key={i} 
                          style={{ 
                            backgroundColor: i + 1 === calendarDate.getDate() ? `${themeData.accentPrimary}35` : `${themeData.bgSecondary}B0`, 
                            borderColor: i + 1 === calendarDate.getDate() ? themeData.accentPrimary : themeData.borderColor 
                          }} 
                          className="p-3 rounded-2xl border text-xs font-black transition hover:scale-105 hover:border-purple-400 cursor-pointer"
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

                  {goals.length === 0 ? (
                    <PlannerEmptyState
                      title="No goals tracked yet"
                      description="Create career, personal, or financial goals to track milestones."
                      actionText="+ Add Goal"
                      onAction={() => setIsQuickCaptureOpen(true)}
                      iconType="sparkles"
                    />
                  ) : (
                    <div className="space-y-3.5">
                      {goals.map(g => (
                        <div 
                          key={g.id} 
                          style={{ backgroundColor: `${themeData.bgCard}E6`, borderColor: themeData.borderColor }} 
                          className="planner-glass-surface p-5 rounded-3xl border shadow-xl space-y-3 backdrop-blur-2xl"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold" style={{ color: themeData.textPrimary }}>{g.title}</span>
                            <span 
                              className="text-[10px] font-black uppercase px-3 py-1 rounded-full border bg-black/20" 
                              style={{ borderColor: themeData.borderColor, color: themeData.accentPrimary }}
                            >
                              {g.category}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold" style={{ color: themeData.textMuted }}>
                              <span>Milestone Progress</span>
                              <span>{g.progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden bg-black/30">
                              <div 
                                className="h-full transition-all duration-500 rounded-full" 
                                style={{ 
                                  width: `${g.progress}%`, 
                                  background: `linear-gradient(90deg, ${themeData.accentPrimary} 0%, ${themeData.accentSecondary} 100%)` 
                                }} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </div>

        {/* ── RIGHT ZONE: Reminders & Quick Capture Panel (3 cols) ────────── */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Active Reminders Card */}
          <div 
            style={{ backgroundColor: `${themeData.bgCard}E6`, borderColor: themeData.borderColor }}
            className="planner-glass-surface rounded-3xl p-5 border shadow-xl space-y-3.5 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: themeData.textMuted }}>
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                ACTIVE REMINDERS
              </span>
              <span 
                className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border" 
                style={{ 
                  backgroundColor: `${themeData.accentPrimary}20`, 
                  borderColor: `${themeData.accentPrimary}40`,
                  color: themeData.accentPrimary 
                }}
              >
                {reminders.length}
              </span>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-center py-4 font-medium" style={{ color: themeData.textMuted }}>
                No active reminders scheduled.
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div 
                    key={r.id} 
                    style={{ backgroundColor: `${themeData.bgSecondary}B0`, borderColor: themeData.borderColor }} 
                    className="p-3 rounded-2xl border text-xs space-y-1"
                  >
                    <span className="font-extrabold block" style={{ color: themeData.textPrimary }}>{r.title}</span>
                    <span className="text-[10px] font-mono block text-purple-400">
                      {formatLocalTime(r.reminder_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Capture Widget */}
          <PlannerQuickCapture
            quickTitle={quickTitle}
            setQuickTitle={setQuickTitle}
            quickType={quickType}
            setQuickType={setQuickType}
            onSubmit={handleQuickCapture}
          />
        </div>

      </div>

      {/* ── SMART PLAN MODAL ───────────────────────────────────────────── */}
      {isSmartPlanOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[1200] flex items-center justify-center p-4">
          <div 
            style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} 
            className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400/30" />
                <h3 className="text-base font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                  ✨ Plan My Day
                </h3>
              </div>
              <button onClick={() => setIsSmartPlanOpen(false)} className="p-1 hover:opacity-75 text-slate-400">
                <X className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[1200] flex items-center justify-center p-4">
          <form onSubmit={handleSaveNote} style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                {editingNote ? 'Edit Sticky Note' : 'Create Sticky Note'}
              </h3>
              <button type="button" onClick={() => setIsNoteModalOpen(false)} className="p-1 hover:opacity-75 text-slate-400">
                <X className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[1200] flex items-center justify-center p-4">
          <div style={{ backgroundColor: themeData.bgElevated, borderColor: themeData.borderColor }} className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: themeData.textPrimary }}>
                ⚡ Quick Capture
              </h3>
              <button type="button" onClick={() => setIsQuickCaptureOpen(false)} className="p-1 hover:opacity-75 text-slate-400">
                <X className="w-4 h-4" />
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
