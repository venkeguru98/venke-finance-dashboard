import { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, X, Clock, ChevronDown 
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2025, 5, 18)); // Default June 18, 2025
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Filters State
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    meetings: true,
    taskDueDates: false,
    milestones: false,
    deadlines: false,
    personalEvents: true,
    birthdays: false
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDate, setTargetDate] = useState('2025-06-18');
  const [eventTitle, setEventTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('Meetings');
  const [colorScheme, setColorScheme] = useState<'cyan' | 'magenta' | 'purple' | 'peach'>('cyan');

  const fetchDashboardData = async () => {
    try {
      const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      await axios.get(`${API}/personal/dashboard?month=${monthStr}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    try {
      await axios.post(`${API}/personal/tasks`, {
        title: eventTitle,
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        category: category,
        priority: 'medium'
      });
      setEventTitle('');
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Failed to create event.');
    }
  };

  // Mini Calendar Calculations
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = selectedDate.toLocaleString('default', { month: 'long' });
  const selectedDateNum = selectedDate.getDate();

  // Weekly Days Array (e.g. June 16 Mon to June 19 Thu)
  const getWeeklyDays = () => {
    const days = [];
    const currentDayOfWeek = selectedDate.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    for (let i = 0; i < 4; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + mondayOffset + i);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dateNum: d.getDate(),
        fullDateStr: d.toISOString().slice(0, 10),
        isToday: d.getDate() === selectedDateNum
      });
    }
    return days;
  };
  const weeklyDays = getWeeklyDays();

  // Sample/DB Event Blocks Mapping with Reference Colors
  const sampleEvents = [
    { id: 1, dayIdx: 2, time: '09 AM', label: 'UX Huddle Call', range: '09:00 AM - 09:30 AM', color: 'cyan', avatars: ['👩', '👨'] },
    { id: 2, dayIdx: 3, time: '09 AM', label: 'Analytics Kickoff - Formix Insights', range: '09:00 AM - 10:00 AM', color: 'peach', avatars: ['👨', '👩', '👨', '👩'] },
    { id: 3, dayIdx: 0, time: '10 AM', label: 'Standup Meeting - NovaBoard Team', range: '09:45 AM - 10:45 AM', color: 'magenta', avatars: ['👨', '👩', '👨', '👩', '👨'], count: '+5' },
    { id: 4, dayIdx: 1, time: '10 AM', label: 'Frontend Dev Sync - API Mapping Task', range: '10:00 AM - 11:45 AM', color: 'magenta', avatars: [] },
    { id: 5, dayIdx: 2, time: '10 AM', label: 'Design Sync - Website Revamp', range: '10:00 AM - 10:45 AM', color: 'purple', avatars: [] },
    { id: 6, dayIdx: 0, time: '11 AM', label: 'UX Audit Sync - Waveflow Studio', range: '11:00 AM - 11:45 AM', color: 'cyan', avatars: [] },
    { id: 7, dayIdx: 1, time: '11 AM', label: 'Sprint Check-in - Tasklio', range: '11:00 AM - 12:00 PM', color: 'peach', avatars: ['👨', '👩', '👨', '👩'] },
    { id: 8, dayIdx: 3, time: '11 AM', label: 'Team Feedback Loop: Task Management UI', range: '11:00 AM - 12:00 PM', color: 'purple', avatars: ['👨', '👩'] },
    { id: 9, dayIdx: 0, time: '01 PM', label: 'Design Review: Dark Mode UI', range: '01:00 PM - 02:15 PM', color: 'peach', avatars: ['👨', '👩'] },
    { id: 10, dayIdx: 2, time: '01 PM', label: 'Client Review Call - Waveflow Studio', range: '01:00 PM - 02:00 PM', color: 'magenta', avatars: ['👨', '👩', '👨'] },
    { id: 11, dayIdx: 3, time: '01 PM', label: 'Dev Tools Demo + Q&A', range: '01:00 PM - 01:30 PM', color: 'cyan', avatars: ['👨', '👩', '👨'] },
  ];

  // Helper for color styles matching the reference image
  const getColorStyles = (color: string) => {
    switch (color) {
      case 'cyan':
        return 'bg-[#d8f3f8] text-[#0d5966] border-l-4 border-[#1293a8] hover:bg-[#c9eef5]';
      case 'magenta':
        return 'bg-[#fbe3f3] text-[#7a2562] border-l-4 border-[#b83195] hover:bg-[#f8d4ee]';
      case 'purple':
        return 'bg-[#e9e1fa] text-[#4c3180] border-l-4 border-[#6941b0] hover:bg-[#ded3f7]';
      case 'peach':
      default:
        return 'bg-[#faebd7] text-[#7b4c11] border-l-4 border-[#b87313] hover:bg-[#f7dfc1]';
    }
  };

  const timeSlots = ['09 AM', '10 AM', '11 AM', '12 PM', '01 PM', '02 PM'];

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* ── MAIN REDESIGNED PRODUCTIVITY GRID ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT COLUMN (MINI CALENDAR + NEXT UP + FILTERS) ───────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* 1. Mini Monthly Calendar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-black text-slate-800">{monthName} {year}</h2>
              <div className="flex items-center space-x-1">
                <button onClick={handlePrevMonth} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
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
                const isSelected = dayNum === selectedDateNum;
                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(dayNum);
                      setSelectedDate(d);
                    }}
                    className={`py-1.5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. NEXT UP Prominent Teal Activity Card */}
          <div className="bg-[#007b7b] text-white p-4 rounded-3xl shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-100/80">
                Meeting reminder
              </span>
              <div className="flex items-center space-x-1">
                <button className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-[10px] font-bold">
                  ✕
                </button>
                <button className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </button>
              </div>
            </div>

            <h3 className="text-base font-black tracking-tight">UX Huddle Call</h3>
            
            <div className="flex items-center space-x-1.5 text-xs text-teal-100 font-medium">
              <Clock size={13} />
              <span>09:00 - 09:30</span>
            </div>

            {/* Avatar Stack */}
            <div className="flex items-center space-x-1 pt-1">
              <div className="flex -space-x-1.5 overflow-hidden">
                <span className="w-6 h-6 rounded-full bg-teal-500 border border-[#007b7b] flex items-center justify-center text-[10px]">👩</span>
                <span className="w-6 h-6 rounded-full bg-amber-400 border border-[#007b7b] flex items-center justify-center text-[10px]">👨</span>
                <span className="w-6 h-6 rounded-full bg-indigo-500 border border-[#007b7b] flex items-center justify-center text-[10px]">👩</span>
              </div>
              <span className="text-[10px] text-teal-200 font-bold ml-1">+2</span>
            </div>
          </div>

          {/* 3. Filters Checklist Card */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Filters</h3>
              <ChevronDown size={14} className="text-slate-400" />
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600">
              {Object.entries({
                meetings: 'Meetings',
                taskDueDates: 'Task Due Dates',
                milestones: 'Milestones',
                deadlines: 'Deadlines',
                personalEvents: 'Personal Events',
                birthdays: 'Birthdays'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2.5 cursor-pointer hover:text-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={activeFilters[key] || false}
                    onChange={e => setActiveFilters({ ...activeFilters, [key]: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Other Calendars Section */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Other Calendars</h3>
              <ChevronDown size={14} className="text-slate-400" />
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
            </div>

            {/* View Mode Switcher + Create Event Button */}
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

              {/* Prominent Golden Yellow Create Event Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition"
              >
                <Plus size={16} />
                <span>Create Event</span>
              </button>
            </div>

          </div>

          {/* Timezone Indicator */}
          <div className="text-[10px] font-mono font-bold text-slate-400 pl-2">
            GMT+07
          </div>

          {/* Weekly Day Columns Header */}
          <div className="grid grid-cols-5 gap-2 text-center border-b border-slate-150 pb-2 pl-14">
            {weeklyDays.map(d => (
              <div key={d.fullDateStr} className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-400 block">{d.name}</span>
                <span className={`text-base font-black font-mono block ${d.isToday ? 'text-teal-700 font-extrabold' : 'text-slate-800'}`}>
                  {d.dateNum}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Grid with Hour Slots */}
          <div className="space-y-4 relative pt-1">
            {timeSlots.map(timeLabel => (
              <div key={timeLabel} className="flex items-start text-xs min-h-[70px] group border-b border-slate-100 pb-2">
                
                {/* Left Hour Label */}
                <div className="w-14 text-[10px] font-mono font-bold text-slate-400 pt-1 flex-shrink-0">
                  {timeLabel}
                </div>

                {/* Day Columns for this time slot */}
                <div className="flex-1 grid grid-cols-4 gap-2.5 relative">
                  {weeklyDays.map((d, dayIdx) => {
                    const slotEvents = sampleEvents.filter(e => e.dayIdx === dayIdx && e.time === timeLabel);
                    
                    return (
                      <div 
                        key={`${d.fullDateStr}-${timeLabel}`}
                        onClick={() => {
                          setTargetDate(d.fullDateStr);
                          setStartTime(timeLabel.includes('PM') ? '13:00' : '09:00');
                          setIsModalOpen(true);
                        }}
                        className="min-h-[60px] rounded-xl border border-transparent group-hover:border-slate-100 transition p-1 cursor-pointer"
                      >
                        {slotEvents.map(ev => (
                          <div
                            key={ev.id}
                            className={`p-2.5 rounded-2xl space-y-1 transition shadow-sm mb-1 ${getColorStyles(ev.color)}`}
                          >
                            <h4 className="text-xs font-bold leading-tight truncate">{ev.label}</h4>
                            <div className="flex items-center space-x-1 text-[9.5px] opacity-80 font-medium">
                              <Clock size={11} />
                              <span>{ev.range}</span>
                            </div>
                            
                            {/* Avatars */}
                            {ev.avatars && ev.avatars.length > 0 && (
                              <div className="flex items-center space-x-1 pt-1">
                                <div className="flex -space-x-1 overflow-hidden">
                                  {ev.avatars.map((av, aIdx) => (
                                    <span key={aIdx} className="w-4 h-4 rounded-full bg-white/80 border border-white/40 flex items-center justify-center text-[8px]">
                                      {av}
                                    </span>
                                  ))}
                                </div>
                                {ev.count && <span className="text-[8px] font-bold opacity-75">{ev.count}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── CREATE EVENT MODAL ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" /> Create Personal Event
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UX Huddle Call, Design Sync, Sprint Check-in"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-teal-500 font-medium"
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
                    <option value="Meetings">Meetings</option>
                    <option value="Personal Events">Personal Events</option>
                    <option value="Deadlines">Deadlines</option>
                    <option value="Task Due Dates">Task Due Dates</option>
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

              <div>
                <label className="block text-slate-600 font-bold mb-1">Card Color Theme</label>
                <div className="flex items-center space-x-3 pt-1">
                  {[
                    { id: 'cyan', bg: 'bg-[#d8f3f8]' },
                    { id: 'magenta', bg: 'bg-[#fbe3f3]' },
                    { id: 'purple', bg: 'bg-[#e9e1fa]' },
                    { id: 'peach', bg: 'bg-[#faebd7]' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorScheme(c.id as any)}
                      className={`w-7 h-7 rounded-full ${c.bg} border-2 transition ${colorScheme === c.id ? 'border-teal-600 scale-110' : 'border-transparent'}`}
                    />
                  ))}
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
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
