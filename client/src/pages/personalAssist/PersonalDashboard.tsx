import { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Flame, 
  AlertCircle, Calendar, Sparkles, X 
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Quick Task Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetTaskDate, setTargetTaskDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskSection, setTaskSection] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await axios.get(`${API}/personal/dashboard?month=${monthStr}`);
      setDashboardData(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`${API}/personal/tasks/${taskId}/status`, { status: newStatus });
      fetchDashboardData();
    } catch (err: any) {
      alert('Failed to update task status.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await axios.post(`${API}/personal/tasks`, {
        title: taskTitle,
        date: targetTaskDate,
        priority: taskPriority,
        category: taskCategory,
        section: taskSection
      });
      setTaskTitle('');
      setIsAddModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Failed to create task.');
    }
  };

  // Calendar Grid Generation
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthTasks = dashboardData?.monthTasks || [];

  // Group tasks by date
  const tasksByDate: Record<string, any[]> = {};
  monthTasks.forEach((t: any) => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = dashboardData?.todayStats || { total: 0, completed: 0, pending: 0, overdue: 0, habitsCompleted: 0, streak: 0 };
  const monthlyStats = dashboardData?.monthlyStats || { total: 0, completed: 0, pending: 0, overdue: 0, completionPct: 0 };
  const goalStats = dashboardData?.goalStats || { active: 0, completed: 0, avgProgress: 0 };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Loading Personal Assist Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* ── TOP WELCOME STRIP ────────────────────────────────────────────── */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest">
              Personal Command Center
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Good Morning, Venke <span className="animate-bounce inline-block">👋</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Daily Life Planning, Habit Tracker & Life Objectives Workspace
          </p>
        </div>

        {/* Top Dynamic Stat Pills */}
        <div className="flex items-center flex-wrap gap-2.5 z-10">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-black">Streak</span>
              <span className="text-xs font-mono font-black text-white">{todayStats.streak} Days</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-black">Today's Progress</span>
              <span className="text-xs font-mono font-black text-emerald-400">
                {todayStats.total > 0 ? Math.round((todayStats.completed / todayStats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-black">Overdue</span>
              <span className="text-xs font-mono font-black text-red-400">{todayStats.overdue} Tasks</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-black">Goals Progress</span>
              <span className="text-xs font-mono font-black text-indigo-400">{goalStats.avgProgress}%</span>
            </div>
          </div>

          <button 
            onClick={() => { setTargetTaskDate(todayStr); setIsAddModalOpen(true); }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ── MAIN DASHBOARD LAYOUT (LEFT STATS PANEL + RIGHT MONTHLY PLANNER) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── LEFT SIDEBAR STATISTICS PANEL (Inspired by reference image) ───── */}
        <div className="space-y-6 bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-2xl">
          
          {/* Section 1: Monthly Completion Ring Chart */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Monthly Statistics</h3>
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase">{monthLabel.slice(0, 3)}</span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-3">
              {/* Radial Donut Progress Display */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="45" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                  <circle 
                    cx="56" cy="56" r="45" 
                    stroke="#10b981" 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={282}
                    strokeDashoffset={282 - (282 * (monthlyStats.completionPct || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-xl font-black text-white font-mono">{monthlyStats.completionPct}%</span>
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-400">Completed</span>
                </div>
              </div>

              <div className="w-full space-y-1.5 text-xs font-semibold pt-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" /> Total Tasks
                  </span>
                  <span className="font-mono text-white font-bold">{monthlyStats.total}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{monthlyStats.completed}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Pending
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{monthlyStats.pending}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Overdue
                  </span>
                  <span className="font-mono text-red-400 font-bold">{monthlyStats.overdue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Priority Focus Areas */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Life Focus Areas</h3>
            <div className="space-y-2.5">
              {[
                { name: 'Personal Well-being', pct: 85, color: 'bg-emerald-500' },
                { name: 'Career & Learning', pct: 70, color: 'bg-indigo-500' },
                { name: 'Relationships', pct: 60, color: 'bg-pink-500' },
                { name: 'Personal Growth', pct: 90, color: 'bg-amber-500' },
              ].map(area => (
                <div key={area.name} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-extrabold text-slate-300">
                    <span>{area.name}</span>
                    <span className="font-mono text-slate-400">{area.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full ${area.color} rounded-full transition-all duration-500`} style={{ width: `${area.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Today's To-Do Checklist */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Today's Focus List</h3>
              <span className="text-[9px] font-mono text-indigo-400 font-bold">
                {(tasksByDate[todayStr] || []).filter(t => t.status === 'completed').length}/{(tasksByDate[todayStr] || []).length}
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {(tasksByDate[todayStr] || []).length === 0 ? (
                <div className="text-center py-4 text-[11px] text-slate-500 font-medium">
                  No tasks scheduled for today.
                </div>
              ) : (
                (tasksByDate[todayStr] || []).map(task => (
                  <div 
                    key={task.id}
                    onClick={() => handleToggleTaskStatus(task.id, task.status)}
                    className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-850 cursor-pointer hover:border-indigo-500/40 transition group"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-bold truncate flex-1 ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {task.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT MONTHLY PLANNER CALENDAR (Inspired by reference image) ───── */}
        <div className="lg:col-span-3 bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
          
          {/* Calendar Header Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" /> Monthly Calendar Planner
              </h2>
              <p className="text-xs text-slate-400 font-medium">Click any date to schedule tasks, habits or personal events</p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs font-bold text-white shadow-inner">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white">
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 text-indigo-300 font-extrabold uppercase tracking-wider min-w-[130px] text-center text-xs">
                  {monthLabel}
                </span>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white">
                  <ChevronRight size={18} />
                </button>
              </div>

              <button 
                onClick={() => setSelectedDate(new Date())} 
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-extrabold text-slate-300 transition"
              >
                Today
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-1 bg-slate-900/40 rounded-lg border border-slate-850/60">
                {day}
              </div>
            ))}
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[480px]">
            {/* Empty offset cells for start of month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-950/40 border border-slate-900/40 rounded-2xl opacity-30 min-h-[90px]" />
            ))}

            {/* Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayTasks = tasksByDate[dateStr] || [];
              const completedCount = dayTasks.filter(t => t.status === 'completed').length;
              const dayPct = dayTasks.length > 0 ? Math.round((completedCount / dayTasks.length) * 100) : 0;

              return (
                <div 
                  key={dateStr}
                  onClick={() => {
                    setTargetTaskDate(dateStr);
                    setIsAddModalOpen(true);
                  }}
                  className={`group relative p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[95px] ${
                    isToday 
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10' 
                      : 'bg-slate-900/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-mono font-black ${isToday ? 'bg-indigo-600 text-white px-2 py-0.5 rounded-lg' : 'text-slate-300'}`}>
                      {dayNum}
                    </span>

                    {/* Completion badge */}
                    {dayTasks.length > 0 && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                        dayPct === 100 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {dayPct}%
                      </span>
                    )}
                  </div>

                  {/* Tasks List snippet inside cell */}
                  <div className="space-y-1 my-1 overflow-hidden max-h-[52px]">
                    {dayTasks.slice(0, 2).map((t: any) => (
                      <div 
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskStatus(t.id, t.status);
                        }}
                        className={`text-[9.5px] px-1.5 py-0.5 rounded-md truncate flex items-center space-x-1 ${
                          t.status === 'completed' 
                            ? 'bg-slate-950/80 text-slate-500 line-through border border-slate-900' 
                            : 'bg-slate-850 text-slate-200 border border-slate-750 hover:border-indigo-500/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-400'}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[8px] text-indigo-400 font-bold block text-right">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Plus Icon on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition text-[9px] text-slate-400 font-bold flex items-center justify-center pt-0.5">
                    <Plus size={12} className="mr-0.5" /> Add
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* ── CREATE TASK MODAL ────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Schedule Personal Task
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yoga session, Read 20 pages, Complete report"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={targetTaskDate}
                    onChange={e => setTargetTaskDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={taskCategory}
                    onChange={e => setTaskCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Career">Career</option>
                    <option value="Learning">Learning</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Time Slot (Section)</label>
                  <select
                    value={taskSection}
                    onChange={e => setTaskSection(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none capitalize"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold transition shadow-lg shadow-indigo-600/30"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
