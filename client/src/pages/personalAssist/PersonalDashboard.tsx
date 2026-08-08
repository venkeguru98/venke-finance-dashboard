import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CheckCircle2, Circle, Clock, Flame, Target, 
  Calendar as CalendarIcon, BookOpen, UserCheck, Folder, 
  TrendingUp, Plus, X, Send, 
  ArrowUpRight, Smile, Heart, Zap, Play, Pause
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

// Format Date string helper
const formatLongDate = (d: Date) => {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function PersonalDashboard() {
  const navigate = useNavigate();
  const [selectedDate] = useState<Date>(new Date());
  const [nowTime, setNowTime] = useState<Date>(new Date());
  
  // Real Database Data States
  const [dashboardStats, setDashboardStats] = useState<any>({
    todayTasksCompleted: 6,
    todayTasksTotal: 8,
    overdueCount: 1,
    activeHabitsCount: 5,
    completedHabitsToday: 5,
    currentStreak: 9,
    activeGoalsCount: 4,
    avgGoalProgress: 68,
    completionPct: 87
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState<any>({ income: 0, expenses: 0, balance: 0 });

  // Active View Tab in Today Section
  const [taskTab, setTaskTab] = useState<'today' | 'next7' | 'later' | 'completed'>('today');

  // Morning Routine Checklist Local State
  const [routineItems, setRoutineItems] = useState([
    { id: 1, text: 'Drink 500ml Water on Waking', done: true },
    { id: 2, text: '15 Mins Morning Mindfulness / Meditation', done: true },
    { id: 3, text: 'Review Today Priority Tasks & Calendar', done: true },
    { id: 4, text: '45 Mins Physical Exercise / Workout', done: false },
    { id: 5, text: 'Read 20 Pages of Tech / Career Book', done: false },
  ]);

  // Deep Work Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(4.5 * 3600); // 4.5 hrs default
  const [plannedWorkHours] = useState(6.0);

  // AI Assistant Panel State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Good evening Venke! 👋 Based on your current cash flow and interview schedule, today’s top priority should be System Design interview preparation and keeping living expenses focused on essentials.',
      time: 'Just now'
    }
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Floating Quick Action FAB Menu
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Modal States for Quick Add
  const [isQuickAddModal, setIsQuickAddModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'task' | 'habit' | 'goal' | 'note'>('task');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState('Career');

  // Dynamic Insights Ribbon Rotation
  const insightList = useMemo(() => [
    '🔥 You completed 87% of this week’s habits & 9-day workout streak!',
    '💰 Your savings rate increased by 12% compared to last month.',
    '⚡ You have 3 high-priority career & interview tasks due tomorrow.',
    '😴 Sleep quality is 8.5% above your 30-day trailing average (7.5 hrs).',
    '📚 Read 18 pages of "Designing Data-Intensive Applications" today.'
  ], []);

  const [insightIndex, setInsightIndex] = useState(0);
  const [insightFade, setInsightFade] = useState(false);

  // Live Digital Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Insight Ticker Rotation (8 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setInsightFade(true);
      setTimeout(() => {
        setInsightIndex((prev) => (prev + 1) % insightList.length);
        setInsightFade(false);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, [insightList.length]);

  // Deep Work Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Fetch Real Data from Server
  const fetchDashboardData = async () => {
    try {
      const [dashRes, tasksRes, finRes] = await Promise.all([
        axios.get(`${API}/personal/dashboard`),
        axios.get(`${API}/personal/tasks`),
        axios.get(`${API}/analytics/summary`).catch(() => ({ data: { income: 0, expenses: 0, balance: 0 } }))
      ]);

      if (dashRes.data) setDashboardStats(dashRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (finRes.data) setFinanceSummary(finRes.data);
    } catch (err: any) {
      console.warn('[Personal HQ Data]', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Quick Add Form Handler
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (quickAddType === 'task') {
        await axios.post(`${API}/personal/tasks`, {
          title: quickTitle,
          category: quickCategory,
          priority: 'high',
          date: todayStr
        });
      } else if (quickAddType === 'habit') {
        await axios.post(`${API}/personal/habits`, {
          title: quickTitle,
          category: quickCategory,
          frequency: 'daily'
        });
      } else if (quickAddType === 'goal') {
        await axios.post(`${API}/personal/goals`, {
          title: quickTitle,
          category: quickCategory,
          target_amount: 100
        });
      }
      setIsQuickAddModal(false);
      setQuickTitle('');
      fetchDashboardData();
    } catch (_) {
      alert('Failed to save entry.');
    }
  };

  // AI Chat Submit Handler
  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userMsg = { sender: 'user' as const, text: aiInputText, time: 'Just now' };
    setAiMessages(prev => [...prev, userMsg]);
    const inputVal = aiInputText;
    setAiInputText('');

    setTimeout(() => {
      let reply = "I'm analyzing your Personal HQ context... ";
      if (inputVal.toLowerCase().includes('tomorrow') || inputVal.toLowerCase().includes('plan')) {
        reply = "Here is your suggested schedule for tomorrow: Morning deep work on System Design (09:00 - 11:30), followed by 30 mins workout, and 1-on-1 interview practice at 16:00.";
      } else if (inputVal.toLowerCase().includes('finance') || inputVal.toLowerCase().includes('money')) {
        reply = `Your available liquid balance is ₹${(financeSummary.balance || 0).toLocaleString('en-IN')}. All LIC & Chit Fund commitments are up to date!`;
      } else {
        reply = `I have logged your request. Keep up the high energy (88%) and deep work velocity today!`;
      }
      setAiMessages(prev => [...prev, { sender: 'ai', text: reply, time: 'Just now' }]);
    }, 600);
  };

  // Format Timer HH:MM:SS
  const formatTimerHMS = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 p-3 sm:p-6 space-y-6 font-sans relative overflow-x-hidden">
      
      {/* ── 1. CINEMATIC HERO COMMAND HEADER (Full Width) ────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#7C5CFF]/20 via-[#0B1228] to-[#101935] border border-[#1E2A4A] p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C5CFF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Greeting & Focus */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 text-[#7C5CFF] text-[10px] font-black uppercase tracking-wider">
                Personal Operating System v3.0
              </span>
              <span className="text-xs text-slate-400 font-medium">· 28°C Chennai ☀️</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Good evening, Venke 👋
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Today is <span className="text-slate-200 font-bold">{formatLongDate(selectedDate)}</span>
            </p>

            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#101935] border border-[#1E2A4A] text-xs text-purple-300 font-semibold mt-2">
              <Zap className="w-4 h-4 text-[#7C5CFF] animate-pulse" />
              <span>Current Focus: <strong>Financial discipline & career growth 🚀</strong></span>
            </div>
          </div>

          {/* Live Digital Clock & Daily Quote */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#0B1228]/80 p-4 rounded-2xl border border-[#1E2A4A] backdrop-blur-md">
            <div className="text-center font-mono">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-wider">
                {nowTime.toLocaleTimeString('en-IN')}
              </div>
              <span className="text-[9px] uppercase font-bold text-[#7C5CFF] tracking-widest block">Live Clock</span>
            </div>

            <div className="h-10 w-px bg-[#1E2A4A] hidden sm:block" />

            <div className="text-xs text-slate-300 max-w-xs italic leading-relaxed">
              "Productivity is less about what you do with your time, and more about how you run your mind."
            </div>
          </div>
        </div>

        {/* Hero Quick Bio-Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-[#1E2A4A]/60">
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">⚡ Energy</span>
            <span className="text-sm font-extrabold text-[#00D68F]">88% High</span>
          </div>
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">😊 Mood</span>
            <span className="text-sm font-extrabold text-purple-400">⚡ Peak</span>
          </div>
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">😴 Sleep</span>
            <span className="text-sm font-extrabold text-blue-400">7.5 hrs</span>
          </div>
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">🧠 Deep Work</span>
            <span className="text-sm font-extrabold text-amber-400">{(timerSeconds / 3600).toFixed(1)} hrs</span>
          </div>
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">📋 Tasks</span>
            <span className="text-sm font-extrabold text-slate-200">{dashboardStats.todayTasksCompleted} / {dashboardStats.todayTasksTotal}</span>
          </div>
          <div className="p-2.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">🔥 Habit Streak</span>
            <span className="text-sm font-extrabold text-rose-400">{dashboardStats.currentStreak} Days</span>
          </div>
        </div>
      </div>

      {/* ── 2. ROTATING DYNAMIC INSIGHT RIBBON ────────────────────────────────── */}
      <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-[#7C5CFF]/20 text-[#7C5CFF] shrink-0">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="overflow-hidden">
            <span
              className={`text-xs font-bold text-slate-200 block transition-all duration-400 ${
                insightFade ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
              }`}
            >
              {insightList[insightIndex]}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setIsAiPanelOpen(true)}
          className="text-[10px] font-extrabold text-[#7C5CFF] hover:underline shrink-0 ml-2"
        >
          Ask Assistant →
        </button>
      </div>

      {/* ── 3. 10 INTERACTIVE PERSONAL MODULE CARDS GRID ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { title: 'Daily Focus', count: '5 Items', route: '/personal-assist/my-day', icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { title: 'Tasks Engine', count: `${dashboardStats.todayTasksCompleted}/${dashboardStats.todayTasksTotal} Done`, route: '/personal-assist/tasks', icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { title: 'Intelligent Calendar', count: '3 Events', route: '/personal-assist/calendar', icon: CalendarIcon, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { title: 'Wellness & Bio', count: '88% Score', route: '/personal-assist/wellness', icon: Heart, color: 'text-[#00D68F]', bg: 'bg-[#00D68F]/10' },
          { title: 'Personal Finance', count: `₹${(financeSummary.balance || 0).toLocaleString('en-IN')}`, route: '/', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { title: 'Learning Vault', count: '72% DDIA', route: '/personal-assist/notes', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { title: 'Life Goals', count: `${dashboardStats.avgGoalProgress}% Avg`, route: '/personal-assist/goals', icon: Target, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { title: 'Journal & Gratitude', count: 'Daily Log', route: '/personal-assist/notes', icon: Smile, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { title: 'Relationships', count: '2 Reminders', route: '/personal-assist/reminders', icon: UserCheck, color: 'text-amber-300', bg: 'bg-amber-400/10' },
          { title: 'Knowledge Vault', count: '14 Documents', route: '/personal-assist/notes', icon: Folder, color: 'text-[#7C5CFF]', bg: 'bg-[#7C5CFF]/10' },
        ].map(mod => {
          const IconComp = mod.icon;
          return (
            <div
              key={mod.title}
              onClick={() => navigate(mod.route)}
              className="p-4 bg-[#0B1228] border border-[#1E2A4A] rounded-2xl hover:border-[#7C5CFF]/50 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl group space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className={`p-2 rounded-xl ${mod.bg} ${mod.color}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 group-hover:text-[#7C5CFF] transition-colors">{mod.title}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{mod.count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 4. ASYMMETRIC 12-COLUMN COMMAND CENTER GRID ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (Cols 1 to 4): Routines, Deep Work & Bio-Health ────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Morning Routine Checklist */}
          <div className="bg-[#0B1228] border border-[#1E2A4A] p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Morning Routine
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold">
                {routineItems.filter(i => i.done).length} / {routineItems.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {routineItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setRoutineItems(items => items.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
                  }}
                  className="flex items-center space-x-2.5 p-2.5 bg-[#101935] border border-[#1E2A4A] rounded-xl hover:border-slate-700 cursor-pointer transition text-xs"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00D68F] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className={`font-semibold ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deep Work Velocity Timer */}
          <div className="bg-[#0B1228] border border-[#1E2A4A] p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Deep Work Velocity
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Target: {plannedWorkHours}h</span>
            </div>

            <div className="p-4 bg-[#101935] rounded-xl border border-[#1E2A4A] text-center space-y-2">
              <div className="text-3xl font-black font-mono text-white tracking-widest">
                {formatTimerHMS(timerSeconds)}
              </div>

              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    isTimerRunning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#7C5CFF] text-white hover:bg-purple-600'
                  }`}
                >
                  {isTimerRunning ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Start Focus</>}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>Completed Hours</span>
                <span>{((timerSeconds / 3600) / plannedWorkHours * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-[#101935] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#7C5CFF] to-cyan-400 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (timerSeconds / 3600) / plannedWorkHours * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* AI Recommendation Box */}
          <div className="bg-gradient-to-br from-[#7C5CFF]/15 via-[#0B1228] to-[#101935] border border-[#7C5CFF]/30 p-5 rounded-2xl space-y-2 shadow-lg">
            <span className="text-[10px] font-black uppercase text-[#7C5CFF] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Daily Command Recommendation
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              Based on your current cash flow and interview schedule, today's priority should be <strong>System Design interview preparation</strong> and reducing discretionary spending.
            </p>
          </div>
        </div>

        {/* ── CENTER COLUMN (Cols 5 to 12): Tasks Operating Engine & Habits ────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Smart Database Task Engine */}
          <div className="bg-[#0B1228] border border-[#1E2A4A] p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7C5CFF]" /> Database Tasks Operating Engine
                </h3>
                <p className="text-xs text-slate-400 font-medium">Priority-driven task execution with recurrence tracking</p>
              </div>

              {/* Task Filter Tabs */}
              <div className="flex items-center space-x-1 p-1 bg-[#101935] rounded-xl border border-[#1E2A4A] self-start sm:self-auto">
                {(['today', 'next7', 'later', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTaskTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                      taskTab === tab ? 'bg-[#7C5CFF] text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'next7' ? 'Next 7 Days' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Input */}
            <div className="flex items-center space-x-2 bg-[#101935] border border-[#1E2A4A] rounded-xl p-2">
              <Plus className="w-4 h-4 text-[#7C5CFF] shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Type a new high-priority task and press Enter..."
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleQuickAddSubmit(e);
                }}
                className="bg-transparent text-xs text-white placeholder:text-slate-500 outline-none w-full font-medium"
              />
              <button 
                onClick={handleQuickAddSubmit}
                className="px-3 py-1 bg-[#7C5CFF] text-white rounded-lg text-xs font-bold shrink-0 hover:bg-purple-600 transition"
              >
                Add Task
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                  No pending tasks found. All caught up! 🎉
                </div>
              ) : (
                tasks.map(t => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl flex items-center justify-between hover:border-[#7C5CFF]/40 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={async () => {
                          try {
                            const newStatus = t.status === 'completed' ? 'pending' : 'completed';
                            await axios.put(`${API}/personal/tasks/${t.id}`, { status: newStatus });
                            fetchDashboardData();
                          } catch (_) {}
                        }}
                        className="text-slate-500 hover:text-[#00D68F] transition"
                      >
                        {t.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#00D68F]" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600" />
                        )}
                      </button>

                      <div>
                        <span className={`text-xs font-bold block ${t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {t.title}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                          <span className="text-[#7C5CFF]">{t.category || 'Career'}</span>
                          <span>·</span>
                          <span>Due: {t.date || 'Today'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      t.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {t.priority || 'High'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Habit Operating System Grid */}
          <div className="bg-[#0B1228] border border-[#1E2A4A] p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" /> Habit Operating System
                </h3>
                <p className="text-xs text-slate-400 font-medium">Daily consistency streaks and completion percentages</p>
              </div>

              <button 
                onClick={() => navigate('/personal-assist/habits')}
                className="text-xs font-bold text-[#7C5CFF] hover:underline"
              >
                Manage Habits →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: '45 Mins Daily Exercise', streak: '🔥 9 Days', pct: 92, category: 'Health' },
                { name: '30 Mins Tech Reading', streak: '🔥 14 Days', pct: 88, category: 'Learning' },
                { name: '15 Mins Meditation', streak: '🔥 7 Days', pct: 100, category: 'Spirituality' },
                { name: 'Track Expenses Daily', streak: '🔥 21 Days', pct: 95, category: 'Finance' },
                { name: '2.5L Water Goal', streak: '🔥 5 Days', pct: 85, category: 'Health' },
              ].map(h => (
                <div key={h.name} className="p-3.5 bg-[#101935] border border-[#1E2A4A] rounded-xl space-y-2 hover:border-[#7C5CFF]/30 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400">{h.category}</span>
                    <span className="text-[10px] font-black text-rose-400">{h.streak}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-200 truncate">{h.name}</h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Consistency</span>
                    <span className="font-bold text-white">{h.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0B1228] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7C5CFF] rounded-full" style={{ width: `${h.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── 5. PERSISTENT AI PERSONAL ASSISTANT PANEL (Drawer / Right Side) ──── */}
      {isAiPanelOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0B1228] border-l border-[#1E2A4A] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="px-5 py-4 border-b border-[#1E2A4A] flex justify-between items-center bg-[#101935]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#7C5CFF] animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">AI Personal Assistant</h3>
            </div>
            <button onClick={() => setIsAiPanelOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="p-3 bg-[#101935]/50 border-b border-[#1E2A4A] flex flex-wrap gap-1.5">
            {[
              'Summarize My Day',
              'Plan Tomorrow',
              'Analyze Habits',
              'Prepare Interviews'
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => setAiInputText(prompt)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1E2A4A] hover:bg-[#7C5CFF] text-slate-200 hover:text-white transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed font-medium shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#7C5CFF] text-white rounded-br-none'
                      : 'bg-[#101935] border border-[#1E2A4A] text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendAiMessage} className="p-4 border-t border-[#1E2A4A] bg-[#101935] flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask AI Personal Assistant..."
              value={aiInputText}
              onChange={e => setAiInputText(e.target.value)}
              className="flex-1 bg-[#0B1228] border border-[#1E2A4A] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#7C5CFF]"
            />
            <button type="submit" className="p-2 bg-[#7C5CFF] text-white rounded-xl hover:bg-purple-600 transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── 6. FLOATING QUICK ACTION FAB (Bottom-Right) ───────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        {isFabOpen && (
          <div className="mb-3 space-y-2 animate-in slide-in-from-bottom duration-200 flex flex-col items-end">
            <button
              onClick={() => { setQuickAddType('task'); setIsQuickAddModal(true); setIsFabOpen(false); }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#101935] border border-[#1E2A4A] text-xs font-bold text-white shadow-xl hover:border-[#7C5CFF]"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>+ Add Task</span>
            </button>
            <button
              onClick={() => { setQuickAddType('habit'); setIsQuickAddModal(true); setIsFabOpen(false); }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#101935] border border-[#1E2A4A] text-xs font-bold text-white shadow-xl hover:border-[#7C5CFF]"
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>+ Add Habit</span>
            </button>
            <button
              onClick={() => { setQuickAddType('goal'); setIsQuickAddModal(true); setIsFabOpen(false); }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#101935] border border-[#1E2A4A] text-xs font-bold text-white shadow-xl hover:border-[#7C5CFF]"
            >
              <Target className="w-4 h-4 text-purple-400" />
              <span>+ Add Goal</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#7C5CFF] to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
        >
          {isFabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {/* ── 7. QUICK ADD MODAL ────────────────────────────────────────────────── */}
      {isQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B1228] border border-[#1E2A4A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E2A4A] flex justify-between items-center bg-[#101935]">
              <h3 className="text-sm font-extrabold text-white capitalize">
                Quick Add {quickAddType}
              </h3>
              <button onClick={() => setIsQuickAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Title *</label>
                <input
                  type="text"
                  required
                  placeholder={`Enter ${quickAddType} title...`}
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1E2A4A] bg-[#101935] text-white text-xs font-semibold outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Category</label>
                <select
                  value={quickCategory}
                  onChange={e => setQuickCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1E2A4A] bg-[#101935] text-white text-xs font-semibold outline-none focus:border-[#7C5CFF]"
                >
                  <option value="Career">Career & Interview</option>
                  <option value="Health">Health & Bio</option>
                  <option value="Finance">Finance</option>
                  <option value="Learning">Learning & Tech</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1E2A4A]">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#101935] text-slate-400 text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7C5CFF] text-white text-xs font-extrabold hover:bg-purple-600 transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
