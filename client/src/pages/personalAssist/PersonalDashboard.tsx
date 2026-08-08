import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CheckCircle2, Circle, Clock, Flame, Target, 
  Calendar as CalendarIcon, BookOpen, UserCheck, Folder, 
  TrendingUp, Plus, X, Search, Send, 
  ArrowUpRight, Smile, Heart, Zap, Play, Pause, Command, Moon, Sun, Sunrise, Sunset,
  LayoutDashboard, Activity
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

// Format Long Date string
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

  // Command Palette State (Cmd + K)
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdSearchQuery, setCmdSearchQuery] = useState('');

  // Active View Tab in Task Engine
  const [taskTab, setTaskTab] = useState<'today' | 'next7' | 'later' | 'completed'>('today');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [selectedCalDate, setSelectedCalDate] = useState<number>(new Date().getDate());

  // Morning Routine Checklist Local State
  const [routineItems, setRoutineItems] = useState([
    { id: 1, text: 'Drink 500ml Water on Waking', done: true, category: 'Health' },
    { id: 2, text: '15 Mins Morning Mindfulness / Meditation', done: true, category: 'Mind' },
    { id: 3, text: 'Review Today Priority Tasks & Calendar', done: true, category: 'Productivity' },
    { id: 4, text: '45 Mins Physical Exercise / Workout', done: false, category: 'Fitness' },
    { id: 5, text: 'Read 20 Pages of Tech / Career Book', done: false, category: 'Learning' },
  ]);

  // Deep Work Velocity Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(4.5 * 3600); // 4.5 hrs default
  const [plannedWorkHours] = useState(6.0);

  // AI Assistant Panel State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Good evening Venke! 👋 Your peak cognitive focus window is active. Recommended priority: System Design interview prep & keeping living expenses focused on essentials.',
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
    '📚 Read 18 pages of "Designing Data-Intensive Applications" today.',
    '💡 Ambient AI: Your peak deep work productivity window is 09:00 - 11:30 AM.'
  ], []);

  const [insightIndex, setInsightIndex] = useState(0);
  const [insightFade, setInsightFade] = useState(false);

  // Time of Day Theme Engine
  const timeOfDayTheme = useMemo(() => {
    const hour = nowTime.getHours();
    if (hour >= 5 && hour < 12) {
      return {
        name: 'Morning Sunrise',
        icon: Sunrise,
        bgMesh: 'from-[#1e1b4b] via-[#0f172a] to-[#050816]',
        accentGlow: 'bg-amber-500/15',
        badgeBg: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
        skyTone: 'Warm Dawn Horizon 🌅'
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        name: 'Daylight Focus',
        icon: Sun,
        bgMesh: 'from-[#0369a1]/20 via-[#0B1228] to-[#050816]',
        accentGlow: 'bg-cyan-500/15',
        badgeBg: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
        skyTone: 'Clear Daylight Sky ☀️'
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        name: 'Cyber Evening Dusk',
        icon: Sunset,
        bgMesh: 'from-[#3b0764]/40 via-[#1e1b4b]/30 to-[#050816]',
        accentGlow: 'bg-purple-500/20',
        badgeBg: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
        skyTone: 'Purple Sunset Horizon 🌆'
      };
    } else {
      return {
        name: 'Indigo Night City Lights',
        icon: Moon,
        bgMesh: 'from-[#090d16] via-[#050816] to-[#02040a]',
        accentGlow: 'bg-[#7C5CFF]/15',
        badgeBg: 'bg-[#7C5CFF]/20 border-[#7C5CFF]/30 text-[#7C5CFF]',
        skyTone: 'Deep Indigo City Skyline 🌃'
      };
    }
  }, [nowTime]);

  // Keyboard Shortcuts (Cmd + K, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsCmdKOpen(false);
        setIsAiPanelOpen(false);
        setIsQuickAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Insight Ticker
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

  // Deep Work Timer
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
  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  const TimeIcon = timeOfDayTheme.icon;

  // Filter Command Palette Items
  const cmdPaletteItems = useMemo(() => [
    { title: 'Open Tasks Engine', category: 'Module', action: () => navigate('/personal-assist/tasks') },
    { title: 'Open Intelligent Calendar', category: 'Module', action: () => navigate('/personal-assist/calendar') },
    { title: 'Open Wellness & Bio-Health', category: 'Module', action: () => navigate('/personal-assist/wellness') },
    { title: 'Open Habit Tracker', category: 'Module', action: () => navigate('/personal-assist/habits') },
    { title: 'Open Life Goals Engine', category: 'Module', action: () => navigate('/personal-assist/goals') },
    { title: 'Open Personal Notes & Vault', category: 'Module', action: () => navigate('/personal-assist/notes') },
    { title: 'View Personal Finance Dashboard', category: 'Finance', action: () => navigate('/') },
    { title: 'Ask AI Personal Assistant', category: 'AI', action: () => setIsAiPanelOpen(true) },
    { title: '+ Add New High Priority Task', category: 'Quick Add', action: () => { setQuickAddType('task'); setIsQuickAddModal(true); } },
    { title: '+ Add New Habit Streak', category: 'Quick Add', action: () => { setQuickAddType('habit'); setIsQuickAddModal(true); } },
  ].filter(item => item.title.toLowerCase().includes(cmdSearchQuery.toLowerCase())), [cmdSearchQuery, navigate]);

  // Days in month helper for Calendar section
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  return (
    <div className="w-full min-h-screen bg-[#050816] text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* ── BACKGROUND LAYER 1 (position: fixed, inset: 0, z-index: -1) ──────── */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        {/* Animated Cyber Gradient Mesh Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${timeOfDayTheme.bgMesh} transition-all duration-1000`} />
        
        {/* Living Workspace Window Beam Reflections & Dust */}
        <div className="absolute top-0 right-0 w-[650px] h-[500px] bg-[#7C5CFF]/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/3 left-0 w-[500px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px]" />
        
        {/* Texture Overlay Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E2A4A_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* ── ARCHITECTURAL CSS GRID CONTAINER (100vw, Full Viewport Workspace) ── */}
      <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-[76px_1fr]">

        {/* ── LEFT DOCK NAVIGATION RAIL (Arc Browser / VisionOS Style Dock) ────── */}
        <aside className="hidden md:flex flex-col items-center justify-between py-6 px-3 bg-[#0B1228]/80 border-r border-[#1E2A4A] backdrop-blur-2xl z-30 sticky top-0 h-screen">
          
          {/* Top Brand Logo Dock Icon */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C5CFF] to-purple-600 flex items-center justify-center text-white shadow-xl shadow-[#7C5CFF]/30 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/personal-assist')}>
            <Sparkles className="w-5 h-5 text-white animate-spin-slow" />
          </div>

          {/* Navigation Module Dock Items */}
          <nav className="space-y-3">
            {[
              { label: 'HQ Home', route: '/personal-assist', icon: LayoutDashboard },
              { label: 'My Day', route: '/personal-assist/my-day', icon: Flame },
              { label: 'Calendar', route: '/personal-assist/calendar', icon: CalendarIcon },
              { label: 'Tasks', route: '/personal-assist/tasks', icon: CheckCircle2 },
              { label: 'Habits', route: '/personal-assist/habits', icon: Activity },
              { label: 'Goals', route: '/personal-assist/goals', icon: Target },
              { label: 'Wellness', route: '/personal-assist/wellness', icon: Heart },
              { label: 'Notes', route: '/personal-assist/notes', icon: BookOpen },
              { label: 'Finance', route: '/', icon: TrendingUp },
            ].map(item => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  title={item.label}
                  className="group relative w-11 h-11 rounded-2xl bg-[#101935]/80 border border-[#1E2A4A] hover:border-[#7C5CFF] hover:bg-[#7C5CFF]/20 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200"
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="absolute left-14 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-xs font-bold text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Dock Controls */}
          <div className="space-y-3">
            <button
              onClick={() => setIsCmdKOpen(true)}
              title="Command Palette (Cmd + K)"
              className="w-11 h-11 rounded-2xl bg-[#101935]/80 border border-[#1E2A4A] hover:border-[#7C5CFF] text-[#7C5CFF] flex items-center justify-center transition"
            >
              <Command className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* ── MAIN WORKSPACE CANVAS (Fluid Editorial Layout) ──────────────────── */}
        <main className="w-full p-4 sm:p-8 space-y-8 overflow-y-auto max-w-[1700px] mx-auto">

          {/* ── HERO SECTION (Occupies Top 36% of Viewport with Editorial Font) ── */}
          <section className="relative rounded-3xl bg-[#0B1228]/80 border border-[#1E2A4A] p-6 sm:p-10 shadow-2xl overflow-hidden backdrop-blur-2xl min-h-[36vh] flex flex-col justify-between">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${timeOfDayTheme.badgeBg}`}>
                    <TimeIcon className="w-3.5 h-3.5" /> {timeOfDayTheme.name}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">· 28°C Chennai · {timeOfDayTheme.skyTone}</span>
                </div>

                {/* Editorial Typography (56px-72px) */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-none">
                  Good evening, Venke 👋
                </h1>

                <p className="text-sm sm:text-base text-slate-400 font-medium">
                  Today is <span className="text-slate-200 font-bold">{formatLongDate(selectedDate)}</span>
                </p>

                <div className="flex items-center space-x-3 pt-1 flex-wrap gap-y-2">
                  <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#101935] border border-[#1E2A4A] text-xs text-purple-300 font-semibold">
                    <Zap className="w-4 h-4 text-[#7C5CFF] animate-pulse" />
                    <span>Current Focus: <strong>Financial discipline & career growth 🚀</strong></span>
                  </div>

                  <button
                    onClick={() => setIsCmdKOpen(true)}
                    className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#101935] border border-[#1E2A4A] hover:border-[#7C5CFF] text-xs text-slate-400 hover:text-white transition shadow-sm"
                  >
                    <Command className="w-4 h-4 text-[#7C5CFF]" />
                    <span className="font-bold">Cmd + K</span>
                    <span className="text-[10px] text-slate-500 font-mono">Search OS</span>
                  </button>
                </div>
              </div>

              {/* Digital Clock & Quote */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#101935]/90 p-5 rounded-2xl border border-[#1E2A4A] backdrop-blur-md shadow-2xl">
                <div className="text-center font-mono">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-wider">
                    {nowTime.toLocaleTimeString('en-IN')}
                  </div>
                  <span className="text-[9px] uppercase font-bold text-[#7C5CFF] tracking-widest block">Live Clock</span>
                </div>

                <div className="h-12 w-px bg-[#1E2A4A] hidden sm:block" />

                <div className="text-xs text-slate-300 max-w-xs italic leading-relaxed">
                  "Productivity is less about what you do with your time, and more about how you run your mind."
                </div>
              </div>
            </div>

            {/* Bio-Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-8 pt-6 border-t border-[#1E2A4A]/60">
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">⚡ Energy</span>
                <span className="text-sm font-extrabold text-[#00D68F]">88% High</span>
              </div>
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">😊 Mood</span>
                <span className="text-sm font-extrabold text-purple-400">⚡ Peak</span>
              </div>
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">😴 Sleep</span>
                <span className="text-sm font-extrabold text-blue-400">7.5 hrs</span>
              </div>
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">🧠 Deep Work</span>
                <span className="text-sm font-extrabold text-amber-400">{(timerSeconds / 3600).toFixed(1)} hrs</span>
              </div>
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">📋 Tasks</span>
                <span className="text-sm font-extrabold text-slate-200">{dashboardStats.todayTasksCompleted} / {dashboardStats.todayTasksTotal}</span>
              </div>
              <div className="p-3 bg-[#101935]/80 border border-[#1E2A4A] rounded-xl text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">🔥 Habit Streak</span>
                <span className="text-sm font-extrabold text-rose-400">{dashboardStats.currentStreak} Days</span>
              </div>
            </div>
          </section>

          {/* ── DYNAMIC INSIGHT RIBBON ────────────────────────────────────────── */}
          <div className="bg-[#0B1228]/80 border border-[#1E2A4A] rounded-2xl px-5 py-3 flex items-center justify-between shadow-md backdrop-blur-xl">
            <div className="flex items-center space-x-3 overflow-hidden">
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
              className="text-xs font-extrabold text-[#7C5CFF] hover:underline shrink-0 ml-2"
            >
              Ask Assistant →
            </button>
          </div>

          {/* ── WORKSPACE GALLERY (Horizontal Full-Bleed Feature Module Strip) ─ */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Workspace Operating Modules</h2>
              <span className="text-xs text-slate-500 font-semibold">10 Active Systems</span>
            </div>

            <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
              {[
                { title: 'Daily Focus', count: '5 Items', route: '/personal-assist/my-day', icon: Flame, color: 'from-amber-500/20 to-amber-950/40 border-amber-500/30' },
                { title: 'Tasks Engine', count: `${dashboardStats.todayTasksCompleted}/${dashboardStats.todayTasksTotal} Completed`, route: '/personal-assist/tasks', icon: CheckCircle2, color: 'from-blue-500/20 to-blue-950/40 border-blue-500/30' },
                { title: 'Intelligent Calendar', count: '3 Events Today', route: '/personal-assist/calendar', icon: CalendarIcon, color: 'from-purple-500/20 to-purple-950/40 border-purple-500/30' },
                { title: 'Wellness & Bio', count: '88% Score', route: '/personal-assist/wellness', icon: Heart, color: 'from-[#00D68F]/20 to-emerald-950/40 border-[#00D68F]/30' },
                { title: 'Personal Finance', count: `₹${(financeSummary.balance || 0).toLocaleString('en-IN')}`, route: '/', icon: TrendingUp, color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/30' },
                { title: 'Learning Vault', count: '72% DDIA Book', route: '/personal-assist/notes', icon: BookOpen, color: 'from-cyan-500/20 to-cyan-950/40 border-cyan-500/30' },
                { title: 'Life Goals', count: `${dashboardStats.avgGoalProgress}% Progress`, route: '/personal-assist/goals', icon: Target, color: 'from-rose-500/20 to-rose-950/40 border-rose-500/30' },
                { title: 'Journal & Reflection', count: 'Daily Log', route: '/personal-assist/notes', icon: Smile, color: 'from-pink-500/20 to-pink-950/40 border-pink-500/30' },
                { title: 'Relationships', count: '2 Follow-ups', route: '/personal-assist/reminders', icon: UserCheck, color: 'from-amber-400/20 to-amber-950/40 border-amber-400/30' },
                { title: 'Knowledge Vault', count: '14 Documents', route: '/personal-assist/notes', icon: Folder, color: 'from-[#7C5CFF]/20 to-purple-950/40 border-[#7C5CFF]/30' },
              ].map(mod => {
                const IconComp = mod.icon;
                return (
                  <div
                    key={mod.title}
                    onClick={() => navigate(mod.route)}
                    className={`w-60 h-44 shrink-0 rounded-2xl bg-gradient-to-br ${mod.color} border p-5 flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 shadow-xl group`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="p-2.5 rounded-xl bg-[#0B1228]/80 text-white border border-white/10 shadow-md">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white group-hover:text-[#7C5CFF] transition-colors">{mod.title}</h3>
                      <p className="text-xs text-slate-300 font-medium mt-1">{mod.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── PRIMARY VISUAL CALENDAR SECTION (7-Column Interactive Grid) ────── */}
          <section className="bg-[#0B1228]/80 border border-[#1E2A4A] p-6 sm:p-8 rounded-3xl backdrop-blur-2xl space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-[#7C5CFF]" /> Intelligent Calendar & Routine Timeline
                </h2>
                <p className="text-xs text-slate-400 font-medium">Monthly schedule, finance due dates (LIC, Chit), and interview prep</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(y => y - 1);
                    } else {
                      setCalendarMonth(m => m - 1);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#101935] border border-[#1E2A4A] hover:bg-[#1E2A4A] text-slate-300 text-xs font-bold"
                >
                  ← Prev
                </button>
                <span className="text-xs font-extrabold text-white px-3 font-mono">
                  {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(y => y + 1);
                    } else {
                      setCalendarMonth(m => m + 1);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#101935] border border-[#1E2A4A] hover:bg-[#1E2A4A] text-slate-300 text-xs font-bold"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* 7-Column Month Grid */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[10px] font-black uppercase text-slate-500 py-1 tracking-widest">{d}</div>
              ))}

              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 sm:h-20 rounded-xl bg-[#101935]/20 opacity-30" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = dayNum === selectedCalDate;
                const isToday = dayNum === new Date().getDate() && calendarMonth === new Date().getMonth();

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedCalDate(dayNum)}
                    className={`h-14 sm:h-20 p-2 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#7C5CFF] border-white text-white shadow-xl shadow-[#7C5CFF]/30 scale-105'
                        : isToday
                        ? 'bg-[#101935] border-[#7C5CFF] text-purple-300'
                        : 'bg-[#101935]/60 border-[#1E2A4A] hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold font-mono text-left">{dayNum}</span>
                    
                    {/* Event indicators */}
                    <div className="flex items-center space-x-1 justify-start">
                      {dayNum % 3 === 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Interview Prep" />}
                      {dayNum % 5 === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="LIC Premium Due" />}
                      {dayNum % 7 === 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Chit Fund Auction" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 12-COLUMN ASYMMETRIC EDITORIAL WORKSPACE ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column (4 Cols): Routines, Deep Work & Bio-Health */}
            <div className="lg:col-span-4 space-y-6">

              {/* Morning Routine Checklist */}
              <div className="bg-[#0B1228]/80 border border-[#1E2A4A] p-6 rounded-3xl shadow-xl space-y-4 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" /> Morning Routine
                  </h3>
                  <span className="text-xs text-emerald-400 font-bold">
                    {routineItems.filter(i => i.done).length} / {routineItems.length} Done
                  </span>
                </div>

                <div className="space-y-2.5">
                  {routineItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setRoutineItems(items => items.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
                      }}
                      className="flex items-center space-x-3 p-3 bg-[#101935] border border-[#1E2A4A] rounded-2xl hover:border-slate-700 cursor-pointer transition text-xs"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-[#00D68F] shrink-0" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                      )}
                      <span className={`font-semibold ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Work Velocity Timer */}
              <div className="bg-[#0B1228]/80 border border-[#1E2A4A] p-6 rounded-3xl shadow-xl space-y-4 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Deep Work Velocity
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Target: {plannedWorkHours}h</span>
                </div>

                <div className="p-5 bg-[#101935] rounded-2xl border border-[#1E2A4A] text-center space-y-3">
                  <div className="text-4xl font-black font-mono text-white tracking-widest">
                    {formatTimerHMS(timerSeconds)}
                  </div>

                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      isTimerRunning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#7C5CFF] text-white hover:bg-purple-600'
                    }`}
                  >
                    {isTimerRunning ? <><Pause className="w-4 h-4" /> Pause Focus Session</> : <><Play className="w-4 h-4" /> Start Focus Session</>}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Target Hours Progress</span>
                    <span>{((timerSeconds / 3600) / plannedWorkHours * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 bg-[#101935] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#7C5CFF] to-cyan-400 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (timerSeconds / 3600) / plannedWorkHours * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (8 Cols): Database Task Operating Engine & Habits OS */}
            <div className="lg:col-span-8 space-y-6">

              {/* Database Tasks Operating Engine */}
              <div className="bg-[#0B1228]/80 border border-[#1E2A4A] p-6 sm:p-8 rounded-3xl shadow-xl space-y-5 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                      <CheckCircle2 className="w-6 h-6 text-[#7C5CFF]" /> Database Tasks Operating Engine
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Priority-driven task execution with recurrence tracking</p>
                  </div>

                  {/* Task Filter Tabs */}
                  <div className="flex items-center space-x-1 p-1 bg-[#101935] rounded-xl border border-[#1E2A4A]">
                    {(['today', 'next7', 'later', 'completed'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setTaskTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                          taskTab === tab ? 'bg-[#7C5CFF] text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab === 'next7' ? 'Next 7 Days' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Add Task Input */}
                <div className="flex items-center space-x-2 bg-[#101935] border border-[#1E2A4A] rounded-2xl p-2.5">
                  <Plus className="w-5 h-5 text-[#7C5CFF] shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="Add high-priority task and press Enter..."
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleQuickAddSubmit(e);
                    }}
                    className="bg-transparent text-xs text-white placeholder:text-slate-500 outline-none w-full font-medium"
                  />
                  <button 
                    onClick={handleQuickAddSubmit}
                    className="px-4 py-2 bg-[#7C5CFF] text-white rounded-xl text-xs font-extrabold shrink-0 hover:bg-purple-600 transition"
                  >
                    Add Task
                  </button>
                </div>

                {/* Task List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                      No pending tasks found. All caught up! 🎉
                    </div>
                  ) : (
                    tasks.map(t => (
                      <div
                        key={t.id}
                        className="p-4 bg-[#101935]/90 border border-[#1E2A4A] rounded-2xl flex items-center justify-between hover:border-[#7C5CFF]/50 transition group"
                      >
                        <div className="flex items-center space-x-3.5">
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
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold mt-1">
                              <span className="text-[#7C5CFF]">{t.category || 'Career'}</span>
                              <span>·</span>
                              <span>Due: {t.date || 'Today'}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                          t.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {t.priority || 'High'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Habit Operating System Matrix */}
              <div className="bg-[#0B1228]/80 border border-[#1E2A4A] p-6 sm:p-8 rounded-3xl shadow-xl space-y-5 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                      <Flame className="w-6 h-6 text-rose-500" /> Habit Operating System Matrix
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Daily consistency streaks and completion percentages</p>
                  </div>

                  <button 
                    onClick={() => navigate('/personal-assist/habits')}
                    className="text-xs font-extrabold text-[#7C5CFF] hover:underline"
                  >
                    Manage Habits →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: '45 Mins Daily Exercise', streak: '🔥 9 Days', pct: 92, category: 'Health' },
                    { name: '30 Mins Tech Reading', streak: '🔥 14 Days', pct: 88, category: 'Learning' },
                    { name: '15 Mins Meditation', streak: '🔥 7 Days', pct: 100, category: 'Spirituality' },
                    { name: 'Track Expenses Daily', streak: '🔥 21 Days', pct: 95, category: 'Finance' },
                    { name: '2.5L Water Goal', streak: '🔥 5 Days', pct: 85, category: 'Health' },
                  ].map(h => (
                    <div key={h.name} className="p-4 bg-[#101935] border border-[#1E2A4A] rounded-2xl space-y-3 hover:border-[#7C5CFF]/40 transition">
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

        </main>
      </div>

      {/* ── 5. GLOBAL COMMAND PALETTE MODAL (Cmd + K) ────────────────────────── */}
      {isCmdKOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B1228] border border-[#1E2A4A] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#1E2A4A] flex items-center space-x-3 bg-[#101935]">
              <Search className="w-5 h-5 text-[#7C5CFF] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search Personal OS..."
                value={cmdSearchQuery}
                onChange={e => setCmdSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none font-medium"
              />
              <span className="text-[10px] font-mono text-slate-400 border border-[#1E2A4A] px-2 py-0.5 rounded">ESC to close</span>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {cmdPaletteItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-semibold">
                  No matching commands found.
                </div>
              ) : (
                cmdPaletteItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      item.action();
                      setIsCmdKOpen(false);
                    }}
                    className="p-3 rounded-xl bg-[#101935]/60 hover:bg-[#7C5CFF]/20 border border-transparent hover:border-[#7C5CFF]/40 cursor-pointer flex justify-between items-center group transition"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">{item.title}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#1E2A4A] text-[#7C5CFF]">{item.category}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. PERSISTENT AI PERSONAL ASSISTANT SIDE PANEL ──────────────────── */}
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

      {/* ── 7. FLOATING QUICK ACTION FAB ────────────────────────────────────── */}
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

      {/* ── 8. QUICK ADD MODAL ────────────────────────────────────────────────── */}
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
