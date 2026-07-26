import { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalGoals() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Career');

  // Milestone Modal
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
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
    if (!title.trim()) return;
    try {
      await axios.post(`${API}/personal/goals`, {
        title, description, target_date: targetDate, category, progress: 0
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to create goal.');
    }
  };

  const handleUpdateProgress = async (goalId: number, currentProgress: number, delta: number) => {
    const nextProg = Math.max(0, Math.min(100, currentProgress + delta));
    try {
      await axios.put(`${API}/personal/goals/${goalId}`, { progress: nextProg });
      fetchGoals();
    } catch (err: any) {
      alert('Failed to update progress.');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await axios.delete(`${API}/personal/goals/${id}`);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to delete goal.');
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalId || !milestoneTitle.trim()) return;
    try {
      await axios.post(`${API}/personal/goals/${activeGoalId}/milestones`, {
        title: milestoneTitle
      });
      setMilestoneTitle('');
      setActiveGoalId(null);
      fetchGoals();
    } catch (err: any) {
      alert('Failed to add milestone.');
    }
  };

  const handleToggleMilestone = async (milestoneId: number, isCompleted: boolean) => {
    try {
      await axios.patch(`${API}/personal/goals/milestones/${milestoneId}/toggle`, {
        is_completed: !isCompleted
      });
      fetchGoals();
    } catch (err: any) {
      alert('Failed to toggle milestone.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">
              Personal Goals
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Goals & Milestones</h1>
          <p className="text-xs text-slate-500 font-medium">Track long-term objectives and break them down into actionable milestones</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs font-bold">
            Loading goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-sm">
            <Target className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No goals set</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Set meaningful goals for your career, health, or learning journey.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-sm">
              + Set Goal
            </button>
          </div>
        ) : (
          goals.map(g => (
            <div 
              key={g.id} 
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-300 transition"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded">
                    {g.category || 'Personal'}
                  </span>
                  <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 className="text-sm font-black text-slate-900">{g.title}</h3>
                {g.description && <p className="text-xs text-slate-500 leading-relaxed">{g.description}</p>}
                
                {g.target_date && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Target Date: {g.target_date}
                  </div>
                )}
              </div>

              {/* Progress Slider Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-150">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Goal Progress</span>
                  <span className="text-teal-700 font-mono">{g.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${g.progress}%` }} />
                </div>

                <div className="flex justify-end space-x-1.5 pt-1">
                  <button 
                    onClick={() => handleUpdateProgress(g.id, g.progress, -10)} 
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200"
                  >
                    -10%
                  </button>
                  <button 
                    onClick={() => handleUpdateProgress(g.id, g.progress, 10)} 
                    className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold hover:bg-teal-200"
                  >
                    +10%
                  </button>
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-2 pt-2 border-t border-slate-150">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span className="uppercase tracking-wider">Milestones Checklist</span>
                  <button onClick={() => setActiveGoalId(g.id)} className="text-teal-700 hover:underline">
                    + Add Milestone
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {g.milestones?.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic block">No milestones added.</span>
                  ) : (
                    g.milestones?.map((m: any) => (
                      <div 
                        key={m.id} 
                        onClick={() => handleToggleMilestone(m.id, m.is_completed === 1)}
                        className="flex items-center space-x-2 text-xs cursor-pointer hover:text-slate-900 transition"
                      >
                        {m.is_completed === 1 ? (
                          <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />
                        ) : (
                          <Circle size={14} className="text-slate-400 flex-shrink-0" />
                        )}
                        <span className={m.is_completed === 1 ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                          {m.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Set Personal Goal</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Learn React Native, Run Half Marathon"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Why is this goal important?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Target Date</label>
                  <input
                    type="date"
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
                    <option value="Career">Career & Skill</option>
                    <option value="Health">Health & Fitness</option>
                    <option value="Learning">Learning & Education</option>
                    <option value="Life">Life & Relationship</option>
                  </select>
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
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {activeGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Add Goal Milestone</h3>
              <button onClick={() => setActiveGoalId(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Milestone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete module 1, Register for exam"
                  value={milestoneTitle}
                  onChange={e => setMilestoneTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveGoalId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
