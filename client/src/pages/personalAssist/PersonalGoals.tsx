import { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalGoals() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);

  // Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [targetDate, setTargetDate] = useState('');

  // Milestone Modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/personal/goals`);
      setGoals(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    try {
      await axios.post(`${API}/personal/goals`, {
        title, description, category, target_date: targetDate
      });
      setTitle('');
      setDescription('');
      setIsGoalModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to create goal.');
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !selectedGoalId) return;
    try {
      await axios.post(`${API}/personal/goals/${selectedGoalId}/milestones`, {
        title: milestoneTitle
      });
      setMilestoneTitle('');
      setIsMilestoneModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to create milestone.');
    }
  };

  const handleToggleMilestone = async (milestoneId: number) => {
    try {
      await axios.patch(`${API}/personal/milestones/${milestoneId}/toggle`);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to toggle milestone.');
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await axios.delete(`${API}/personal/goals/${goalId}`);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to delete goal.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Personal Objectives
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">Life Goals & Milestones</h1>
          <p className="text-xs text-slate-400 font-medium">Set long-term objectives and track progress through actionable milestones</p>
        </div>

        <button 
          onClick={() => setIsGoalModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Cards List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">
            Loading goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-3">
            <Target className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No active goals</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Set clear long-term goals and break them down into milestones.</p>
            <button onClick={() => setIsGoalModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              + Create Goal
            </button>
          </div>
        ) : (
          goals.map(g => (
            <div key={g.id} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
                      {g.category}
                    </span>
                    <h3 className="text-base font-black text-white">{g.title}</h3>
                  </div>
                  {g.description && <p className="text-xs text-slate-400 mt-1">{g.description}</p>}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-emerald-400 block">{g.progress_pct}% Completed</span>
                    <span className="text-[10px] text-slate-500 font-mono">Target: {g.target_date}</span>
                  </div>
                  <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${g.progress_pct}%` }} />
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Milestones Checklist</span>
                  <button 
                    onClick={() => { setSelectedGoalId(g.id); setIsMilestoneModalOpen(true); }}
                    className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <Plus size={12} />
                    <span>Add Milestone</span>
                  </button>
                </div>

                {(g.milestones || []).length === 0 ? (
                  <div className="text-slate-500 text-xs py-2 italic text-center bg-slate-900/40 rounded-xl">
                    No milestones added yet. Click + Add Milestone.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(g.milestones || []).map((m: any) => (
                      <div 
                        key={m.id}
                        onClick={() => handleToggleMilestone(m.id)}
                        className={`p-2.5 rounded-xl border transition flex items-center space-x-2 cursor-pointer ${
                          m.is_completed === 1 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        {m.is_completed === 1 ? (
                          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle size={16} className="text-slate-500 flex-shrink-0" />
                        )}
                        <span className={`text-xs font-bold truncate ${m.is_completed === 1 ? 'line-through opacity-75' : ''}`}>
                          {m.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">Create Personal Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master React & Node.js, Run a Half Marathon"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Goal details & motivation..."
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
                    <option value="Personal">Personal</option>
                    <option value="Career">Career & Skill</option>
                    <option value="Health">Health & Fitness</option>
                    <option value="Financial">Financial Goal</option>
                    <option value="Relationships">Relationships</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">Add Milestone</h3>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Milestone Action</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete module 1, Run 5km"
                  value={milestoneTitle}
                  onChange={e => setMilestoneTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
