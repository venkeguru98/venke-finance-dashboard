import { useEffect, useState } from 'react';
import { Flame, Plus, CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function HabitTracker() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Health');
  const [color, setColor] = useState('#14b8a6');

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

  const handleDeleteHabit = async (id: number) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await axios.delete(`${API}/personal/habits/${id}`);
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

  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        dateStr: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: i === 0
      });
    }
    return dates;
  };

  const last7Days = getLast7Days();

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
              Habit Tracker
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Daily Habits & Streaks</h1>
          <p className="text-xs text-slate-500 font-medium">Build consistent routines and track 7-day completion heatmaps</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs font-bold">
            Loading habits...
          </div>
        ) : habits.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-sm">
            <Flame className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No habits tracked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create habits like Morning Jog, Reading, or Meditation to track your streak.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-sm">
              + Track Habit
            </button>
          </div>
        ) : (
          habits.map(h => {
            const isCompletedToday = h.completions?.includes(todayStr);

            return (
              <div 
                key={h.id} 
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-300 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded">
                        {h.category || 'Health'}
                      </span>
                      <div className="flex items-center space-x-1 text-xs font-bold text-amber-500">
                        <Flame size={14} className="fill-amber-400" />
                        <span>{h.streak || 0} Streak</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{h.name}</h3>
                    {h.description && <p className="text-xs text-slate-500">{h.description}</p>}
                  </div>

                  <button onClick={() => handleDeleteHabit(h.id)} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 7-Day Completion Heatmap Row */}
                <div className="space-y-2 pt-2 border-t border-slate-150">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Past 7 Days Log</span>
                  
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {last7Days.map(d => {
                      const isDone = h.completions?.includes(d.dateStr);

                      return (
                        <div key={d.dateStr} className="flex flex-col items-center space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold">{d.dayName}</span>
                          <button
                            onClick={() => handleToggleHabit(h.id, d.dateStr)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                              isDone
                                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Today Action */}
                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-[11px] text-slate-500">Today: <strong className={isCompletedToday ? 'text-teal-600' : 'text-slate-400'}>{isCompletedToday ? 'Completed ✓' : 'Pending'}</strong></span>
                  <button
                    onClick={() => handleToggleHabit(h.id, todayStr)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      isCompletedToday 
                        ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-sm'
                    }`}
                  >
                    {isCompletedToday ? 'Done Today ✓' : 'Check Today'}
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Create New Habit</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Habit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Jog, 30 Min Reading, Drink Water"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Why this habit matters..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  >
                    <option value="Health">Health & Fitness</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Learning">Learning & Mind</option>
                    <option value="Mindfulness">Mindfulness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Color Theme</label>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-1 py-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
