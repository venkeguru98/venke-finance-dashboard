import { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, X, Clock, 
  ChevronDown, CheckCircle2, Circle, Flame, RefreshCw, Filter, Sparkles, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Real Database Data States
  const [activities, setActivities] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Active Filters
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    task: true,
    event: true,
    habit: true,
    reminder: true,
    milestone: true,
    deadline: true,
    personal: true
  });

  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    Personal: true,
    Career: true,
    Learning: true,
    Health: true,
    Family: true,
    Important: true
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<'task' | 'event' | 'habit' | 'reminder' | 'deadline' | 'personal'>('event');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('Personal');

  // Selected Activity Action Modal
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchRealData = async () => {
    try {
      const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      
      const [actRes, statsRes] = await Promise.all([
        axios.get(`${API}/personal/activities?month=${monthStr}`),
        axios.get(`${API}/personal/dashboard?month=${monthStr}`)
      ]);

      setActivities(actRes.data || []);
      setDashboardStats(statsRes.data || null);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, [selectedDate]);

  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleGoToday = () => {
    setSelectedDate(new Date());
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await axios.post(`${API}/personal/activities`, {
        activity_type: activityType,
        title,
        description,
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        category,
        priority: 'medium',
        repeat_frequency: 'none'
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to create activity.');
    }
  };

  const handleToggleActivityStatus = async (act: any) => {
    const nextStatus = act.status === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`${API}/personal/activities/${act.source_table}/${act.original_id}`, {
        status: nextStatus
      });
      if (selectedActivity) setSelectedActivity(null);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to update status.');
    }
  };

  const handleRescheduleActivity = async (act: any, daysToAdd: number) => {
    const d = new Date(act.date);
    d.setDate(d.getDate() + daysToAdd);
    const newDateStr = d.toISOString().slice(0, 10);
    try {
      await axios.patch(`${API}/personal/activities/${act.source_table}/${act.original_id}`, {
        date: newDateStr
      });
      if (selectedActivity) setSelectedActivity(null);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to reschedule activity.');
    }
  };

  const handleDeleteActivity = async (act: any) => {
    if (!window.confirm(`Delete ${act.title}?`)) return;
    try {
      await axios.delete(`${API}/personal/activities/${act.source_table}/${act.original_id}`);
      if (selectedActivity) setSelectedActivity(null);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to delete activity.');
    }
  };

  const handleRescheduleAllOverdue = async () => {
    try {
      await axios.post(`${API}/personal/overdue/reschedule-all`);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to reschedule overdue items.');
    }
  };

  // Mini Calendar Calculations
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = selectedDate.toLocaleString('default', { month: 'long' });
  const selectedDateNum = selectedDate.getDate();
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);

  // Group activities by date
  const activitiesByDate: Record<string, any[]> = {};
  activities.forEach(a => {
    if (!activitiesByDate[a.date]) activitiesByDate[a.date] = [];
    activitiesByDate[a.date].push(a);
  });

  // Filter activities based on activeFilter toggles & category toggles
  const filteredActivities = activities.filter(a => {
    const typeMatch = activeFilters[a.activity_type] !== false;
    const catMatch = activeCategories[a.category] !== false;
    return typeMatch && catMatch;
  });

  // Next Up Activity Calculation
  const nextUpActivity = filteredActivities
    .filter(a => a.date >= todayStr && a.status !== 'completed')
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))[0];

  // Weekly Days Array (e.g. 7 days starting from Monday)
  const getWeeklyDays = () => {
    const days = [];
    const currentDayOfWeek = selectedDate.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + mondayOffset + i);
      const fullDateStr = d.toISOString().slice(0, 10);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: d.getDate(),
        fullDateStr,
        isToday: fullDateStr === todayStr,
        isSelected: fullDateStr === selectedDateStr
      });
    }
    return days;
  };
  const weeklyDays = getWeeklyDays();

  // Helper for activity block color styles
  const getColorStyles = (color: string, type: string) => {
    if (type === 'habit') return 'bg-[#d8f3f8] text-[#0d5966] border-l-4 border-[#1293a8]';
    if (type === 'reminder') return 'bg-[#fbe3f3] text-[#7a2562] border-l-4 border-[#b83195]';
    switch (color) {
      case 'cyan':
        return 'bg-[#d8f3f8] text-[#0d5966] border-l-4 border-[#1293a8]';
      case 'magenta':
        return 'bg-[#fbe3f3] text-[#7a2562] border-l-4 border-[#b83195]';
      case 'purple':
        return 'bg-[#e9e1fa] text-[#4c3180] border-l-4 border-[#6941b0]';
      case 'peach':
      default:
        return 'bg-[#faebd7] text-[#7b4c11] border-l-4 border-[#b87313]';
    }
  };

  const timeSlots = ['08 AM', '09 AM', '10 AM', '11 AM', '12 PM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM'];

  const todayStats = dashboardStats?.todayStats || { total: 0, completed: 0, pending: 0, overdue: 0, streak: 0 };
  const monthlyStats = dashboardStats?.monthlyStats || { total: 0, completed: 0, pending: 0, overdue: 0, completionPct: 0 };

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-300 pb-12">
      
      {/* ── TOP REAL PRODUCTIVITY KPI SUMMARY BAR ─────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Personal Operating Command Center</h1>
            <p className="text-xs text-slate-500 font-medium">Daily Planning • Real-time Sync • Persistent Database</p>
          </div>
        </div>

        {/* Real KPI Pills */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">Today's Progress</span>
            <span className="text-xs font-mono font-black text-teal-700">
              {todayStats.total > 0 ? Math.round((todayStats.completed / todayStats.total) * 100) : 0}%
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">Streak</span>
            <span className="text-xs font-mono font-black text-amber-500 flex items-center gap-1">
              <Flame size={12} className="fill-amber-400" /> {todayStats.streak} Days
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">Overdue</span>
            <span className="text-xs font-mono font-black text-red-600">{todayStats.overdue} Items</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">Monthly Rate</span>
            <span className="text-xs font-mono font-black text-teal-700">{monthlyStats.completionPct}%</span>
          </div>

          {todayStats.overdue > 0 && (
            <button
              onClick={handleRescheduleAllOverdue}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-2xl text-xs font-extrabold transition border border-red-200"
              title="Reschedule all overdue tasks to today"
            >
              <RefreshCw size={12} />
              <span>Reschedule Overdue</span>
            </button>
          )}

          <button
            onClick={() => {
              setTargetDate(selectedDateStr);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition"
          >
            <Plus size={16} />
            <span>+ ADD ACTIVITY</span>
          </button>
        </div>

      </div>

      {/* ── MAIN REDESIGNED COMMAND CENTER GRID ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT COLUMN (MINI CALENDAR + NEXT UP + FILTERS) ───────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* 1. Mini Monthly Calendar connected to DB */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-black text-slate-800">{monthName} {year}</h2>
              <div className="flex items-center space-x-1">
                <button onClick={handlePrevDate} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNextDate} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`offset-${i}`} className="py-1.5 text-slate-300">
                  {28 + i}
                </div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = dStr === selectedDateStr;
                const isToday = dStr === todayStr;
                const dayHasActivities = (activitiesByDate[dStr] || []).length > 0;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(dayNum);
                      setSelectedDate(d);
                    }}
                    className={`py-1.5 rounded-full flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30'
                        : isToday
                        ? 'bg-teal-100 text-teal-900 font-extrabold border border-teal-300'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {dayHasActivities && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-teal-500 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DYNAMIC "NEXT UP" Card from Real Database */}
          <div className="bg-[#007b7b] text-white p-4.5 rounded-3xl shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-100/90 flex items-center gap-1">
                ✦ NEXT UP ACTIVITY
              </span>
              {nextUpActivity && (
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleRescheduleActivity(nextUpActivity, 1)}
                    className="px-2 py-0.5 rounded-lg bg-teal-800/80 hover:bg-teal-800 text-[10px] text-teal-100 font-bold"
                    title="Snooze to Tomorrow"
                  >
                    +1 Day
                  </button>
                  <button 
                    onClick={() => handleToggleActivityStatus(nextUpActivity)}
                    className="w-6 h-6 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center text-xs font-black shadow"
                    title="Mark Complete"
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>

            {nextUpActivity ? (
              <div className="space-y-1.5">
                <h3 className="text-base font-black tracking-tight leading-snug">{nextUpActivity.title}</h3>
                <div className="flex items-center space-x-3 text-xs text-teal-100 font-medium">
                  <span className="flex items-center gap-1"><Clock size={12} /> {nextUpActivity.start_time} - {nextUpActivity.end_time}</span>
                  <span className="font-mono text-[10px] bg-teal-800/60 px-2 py-0.5 rounded uppercase">{nextUpActivity.category}</span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center space-y-2">
                <p className="text-xs text-teal-100 font-medium">No upcoming activities scheduled</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow"
                >
                  + Add Activity
                </button>
              </div>
            )}
          </div>

          {/* 3. FILTERS CHECKLIST CARD (FULLY FUNCTIONAL) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center px-1 border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Activity Type Filters</h3>
              <Filter size={14} className="text-slate-400" />
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600">
              {Object.entries({
                task: 'Tasks',
                event: 'Events',
                habit: 'Habits',
                reminder: 'Reminders',
                milestone: 'Goal Milestones',
                deadline: 'Deadlines',
                personal: 'Personal Activities'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer hover:text-slate-900 transition">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      checked={activeFilters[key] !== false}
                      onChange={e => setActiveFilters({ ...activeFilters, [key]: e.target.checked })}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activities.filter(a => a.activity_type === key).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. CATEGORY FILTERS CARD */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center px-1 border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Categories</h3>
              <ChevronDown size={14} className="text-slate-400" />
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600">
              {['Personal', 'Career', 'Learning', 'Health', 'Family', 'Important'].map(cat => (
                <label key={cat} className="flex items-center space-x-2.5 cursor-pointer hover:text-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={activeCategories[cat] !== false}
                    onChange={e => setActiveCategories({ ...activeCategories, [cat]: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT MAIN SCHEDULE WORKSPACE ───────────────────────────────── */}
        <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 min-h-[620px]">
          
          {/* Main Workspace Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
            
            {/* Selected Date Navigator */}
            <div className="flex items-center space-x-2">
              <button onClick={handlePrevDate} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {monthName}, {selectedDateNum} {year}
              </h2>
              <button onClick={handleNextDate} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <ChevronRight size={18} />
              </button>
              
              <button 
                onClick={handleGoToday}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition ml-2"
              >
                Today
              </button>
            </div>

            {/* View Mode Switcher + Create Activity Button */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1 rounded-lg capitalize transition ${viewMode === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 rounded-lg capitalize transition ${viewMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded-lg capitalize transition ${viewMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Monthly
                </button>
              </div>

              <button
                onClick={() => {
                  setTargetDate(selectedDateStr);
                  setIsModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition"
              >
                <Plus size={16} />
                <span>+ ADD ACTIVITY</span>
              </button>
            </div>

          </div>

          {/* ── DAILY VIEW ──────────────────────────────────────────────────── */}
          {viewMode === 'daily' && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-b border-slate-150 pb-2">
                <span>Detailed Daily Schedule for {selectedDateStr}</span>
                <span>{filteredActivities.filter(a => a.date === selectedDateStr).length} Items Scheduled</span>
              </div>

              <div className="space-y-2">
                {filteredActivities.filter(a => a.date === selectedDateStr).length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs font-medium space-y-2">
                    <p>No activities scheduled for this date.</p>
                    <button 
                      onClick={() => { setTargetDate(selectedDateStr); setIsModalOpen(true); }}
                      className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm"
                    >
                      + Add Activity for {selectedDateStr}
                    </button>
                  </div>
                ) : (
                  filteredActivities.filter(a => a.date === selectedDateStr).map(act => (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-3.5 rounded-2xl border transition shadow-sm cursor-pointer flex items-center justify-between gap-3 ${getColorStyles(act.color, act.activity_type)}`}
                    >
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleActivityStatus(act); }}
                          className="flex-shrink-0"
                        >
                          {act.status === 'completed' ? (
                            <CheckCircle2 size={18} className="text-teal-700" />
                          ) : (
                            <Circle size={18} className="text-slate-500 hover:text-slate-800" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-xs font-bold ${act.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                              {act.title}
                            </h4>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/60">
                              {act.activity_type}
                            </span>
                          </div>
                          {act.description && <p className="text-[11px] opacity-80 mt-0.5">{act.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono font-bold">
                        <span>{act.start_time} - {act.end_time}</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── WEEKLY VIEW ─────────────────────────────────────────────────── */}
          {viewMode === 'weekly' && (
            <>
              {/* Weekly Day Columns Header */}
              <div className="grid grid-cols-8 gap-2 text-center border-b border-slate-150 pb-2 pl-14">
                {weeklyDays.map(d => (
                  <div 
                    key={d.fullDateStr} 
                    onClick={() => setSelectedDate(new Date(d.fullDateStr))}
                    className={`space-y-0.5 cursor-pointer p-1 rounded-xl transition ${d.isSelected ? 'bg-teal-50 border border-teal-200' : ''}`}
                  >
                    <span className="text-[11px] font-bold text-slate-400 block">{d.name}</span>
                    <span className={`text-base font-black font-mono block ${d.isToday ? 'text-teal-700 font-extrabold' : 'text-slate-800'}`}>
                      {d.dateNum}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline Grid with Hour Slots */}
              <div className="space-y-4 relative pt-1 max-h-[500px] overflow-y-auto">
                {timeSlots.map(timeLabel => (
                  <div key={timeLabel} className="flex items-start text-xs min-h-[65px] group border-b border-slate-100 pb-2">
                    
                    {/* Left Hour Label */}
                    <div className="w-14 text-[10px] font-mono font-bold text-slate-400 pt-1 flex-shrink-0">
                      {timeLabel}
                    </div>

                    {/* Day Columns for this time slot */}
                    <div className="flex-1 grid grid-cols-7 gap-2 relative">
                      {weeklyDays.map(d => {
                        const slotEvents = filteredActivities.filter(a => {
                          if (a.date !== d.fullDateStr) return false;
                          const hourNum = parseInt(timeLabel);
                          const isPM = timeLabel.includes('PM') && hourNum !== 12;
                          const slotHour = isPM ? hourNum + 12 : (hourNum === 12 && timeLabel.includes('AM') ? 0 : hourNum);
                          
                          const actHour = parseInt(a.start_time || '09');
                          return actHour === slotHour;
                        });
                        
                        return (
                          <div 
                            key={`${d.fullDateStr}-${timeLabel}`}
                            onClick={() => {
                              setTargetDate(d.fullDateStr);
                              const hourNum = parseInt(timeLabel);
                              const isPM = timeLabel.includes('PM') && hourNum !== 12;
                              const slotHour = isPM ? hourNum + 12 : hourNum;
                              setStartTime(`${String(slotHour).padStart(2, '0')}:00`);
                              setEndTime(`${String(slotHour + 1).padStart(2, '0')}:00`);
                              setIsModalOpen(true);
                            }}
                            className="min-h-[55px] rounded-xl border border-transparent group-hover:border-slate-100 transition p-1 cursor-pointer"
                          >
                            {slotEvents.map(ev => (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedActivity(ev); }}
                                className={`p-2 rounded-2xl space-y-0.5 transition shadow-sm mb-1 cursor-pointer hover:scale-[1.02] ${getColorStyles(ev.color, ev.activity_type)} ${ev.status === 'completed' ? 'opacity-60 line-through' : ''}`}
                              >
                                <h4 className="text-[11px] font-bold leading-tight truncate">{ev.title}</h4>
                                <div className="flex items-center space-x-1 text-[9px] opacity-80 font-medium">
                                  <Clock size={10} />
                                  <span>{ev.start_time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── MONTHLY VIEW ────────────────────────────────────────────────── */}
          {viewMode === 'monthly' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 border-b border-slate-150 pb-2">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`month-offset-${i}`} className="min-h-[80px] bg-slate-50/50 rounded-2xl p-1 text-slate-300 text-xs">
                    {28 + i}
                  </div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayActivities = filteredActivities.filter(a => a.date === dStr);
                  const isSelected = dStr === selectedDateStr;

                  return (
                    <div
                      key={`month-cell-${dayNum}`}
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(dayNum);
                        setSelectedDate(d);
                      }}
                      className={`min-h-[85px] rounded-2xl p-1.5 border transition cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-teal-50/60 border-teal-400 shadow-sm' 
                          : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className={dStr === todayStr ? 'text-teal-700 font-extrabold' : 'text-slate-800'}>{dayNum}</span>
                        {dayActivities.length > 0 && (
                          <span className="text-[9px] font-mono text-slate-400">{dayActivities.length}</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayActivities.slice(0, 2).map(act => (
                          <div 
                            key={act.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${getColorStyles(act.color, act.activity_type)}`}
                          >
                            {act.title}
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <span className="text-[8px] font-bold text-slate-400 block text-right">+{dayActivities.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── CREATE / EDIT ACTIVITY MODAL ──────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" /> Create Activity
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3 text-xs">
              
              {/* Activity Type Picker */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">Activity Type</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
                  {(['task', 'event', 'habit', 'reminder', 'deadline', 'personal'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityType(t)}
                      className={`py-1 rounded-xl capitalize transition ${activityType === t ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Activity title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Career">Career</option>
                    <option value="Learning">Learning</option>
                    <option value="Health">Health</option>
                    <option value="Family">Family</option>
                    <option value="Important">Important</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition shadow-md"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ACTIVITY DETAILS & ACTIONS MODAL ─────────────────────────────── */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-150 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded">
                  {selectedActivity.activity_type}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">{selectedActivity.title}</h3>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              {selectedActivity.description && <p>{selectedActivity.description}</p>}
              <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-500 pt-1">
                <span>Date: {selectedActivity.date}</span>
                <span>Time: {selectedActivity.start_time}</span>
              </div>
              <div>Category: <strong className="text-teal-700">{selectedActivity.category}</strong></div>
              <div>Status: <strong className="capitalize">{selectedActivity.status}</strong></div>
            </div>

            <div className="pt-3 flex flex-col space-y-2">
              <button
                onClick={() => handleToggleActivityStatus(selectedActivity)}
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {selectedActivity.status === 'completed' ? 'Reopen Activity' : 'Mark Completed ✓'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRescheduleActivity(selectedActivity, 1)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Reschedule +1 Day
                </button>
                <button
                  onClick={() => handleRescheduleActivity(selectedActivity, 7)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Reschedule +1 Wk
                </button>
              </div>

              <button
                onClick={() => handleDeleteActivity(selectedActivity)}
                className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition"
              >
                Delete Activity
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
