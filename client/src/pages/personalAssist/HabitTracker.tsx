import { useEffect, useState } from 'react';
import { Flame, Plus, CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function HabitTracker() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Health');
  const [color, setColor] = useState('#3B82F6');

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/personal/habits`);
      setHabits(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleToggleHabit = async (habitId: number, dateStr: string) => {
    try {
      await axios.post(`${API}/personal/habits/${habitId}/toggle`, { date: dateStr });
      fetchHabits();
    } catch (err: any) {
      alert('Failed to toggle habit.');
    }
  };

  const handleDeleteHabit = async (habitId: number) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await axios.delete(`${API}/personal/habits/${habitId}`);
      fetchHabits();
    } catch (err: any) {
      alert('Failed to delete habit.');
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await axios.post(`${API}/personal/habits`, {
        name, description, category, frequency: 'daily', color, start_date: todayStr
      });
      setName('');
      setDescription('');
      setIsModalOpen(false);
      fetchHabits();
    } catch (err: any) {
      alert('Failed to create habit.');
    }
  };

  // Generate last 7 days array for quick weekly checkmarks
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().slice(0, 10),
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      dateNum: d.getDate()
    };
  });

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              Habit Tracker
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">Daily Habit Streaks</h1>
          <p className="text-xs text-slate-400 font-medium">Build positive life routines with visual streak counters</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30"
        >
          <Plus size={16} />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-500 text-xs font-bold">
            Loading habits...
          </div>
        ) : habits.length === 0 ? (
          <div className="col-span-2 bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-3">
            <Flame className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No habits tracked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create habits like Yoga, Reading, Meditation, or Exercise to start your streak.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              + Create Habit
            </button>
          </div>
        ) : (
          habits.map(h => {
            const isCompletedToday = (h.completions || []).includes(todayStr);

            return (
              <div key={h.id} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
                
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color || '#3B82F6' }} />
                      <h3 className="text-sm font-black text-white">{h.name}</h3>
                    </div>
                    {h.description && <p className="text-xs text-slate-400">{h.description}</p>}
                    <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-850 inline-block">
                      {h.category}
                    </span>
                  </div>

                  {/* Streak Badge */}
                  <div className="bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                    <Flame size={16} className="animate-pulse" />
                    <span className="font-mono">{h.currentStreak || 0} Streak</span>
                  </div>
                </div>

                {/* Last 7 Days Checkmarks */}
                <div className="space-y-1.5 pt-2 border-t border-slate-850">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Past 7 Days Progress</span>
                  <div className="flex justify-between items-center">
                    {last7Days.map(day => {
                      const done = (h.completions || []).includes(day.dateStr);
                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => handleToggleHabit(h.id, day.dateStr)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${
                            done 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                              : 'bg-slate-900 border-slate-850 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase">{day.dayLabel}</span>
                          <span className="text-xs font-mono font-bold">{day.dateNum}</span>
                          {done ? <CheckCircle2 size={14} className="mt-1" /> : <Circle size={14} className="mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center border-t border-slate-850 pt-3">
                  <button 
                    onClick={() => handleToggleHabit(h.id, todayStr)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isCompletedToday 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isCompletedToday ? 'Completed Today!' : 'Mark Today Done'}</span>
                  </button>

                  <button onClick={() => handleDeleteHabit(h.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">Create New Habit</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Habit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Meditation, 30 Min Exercise, Read Book"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Why is this habit important..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Health">Health & Fitness</option>
                    <option value="Learning">Learning</option>
                    <option value="Mindset">Mindset & Care</option>
                    <option value="Career">Career & Focus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Badge Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
