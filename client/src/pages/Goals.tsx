import { useState, useEffect } from 'react';
import { Plus, Trophy, Pencil, Trash2, X, Target, PlusCircle } from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  current_saved: number;
  deadline: string;
  status: 'active' | 'completed';
};

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

const EMPTY_FORM = {
  name: '',
  target_amount: '',
  current_saved: '',
  deadline: '',
};

const GOAL_ICONS = ['🏠', '🚗', '✈️', '💻', '🎓', '💍', '🛡️', '📈', '🎯', '🏖️'];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedIcon, setSelectedIcon] = useState('🎯');

  const fetchGoals = () => {
    setLoading(true);
    axios.get(`${API}/goals`)
      .then(res => setGoals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGoals(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setSelectedIcon('🎯');
    setIsModalOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setFormData({
      name: g.name,
      target_amount: String(g.target_amount),
      current_saved: String(g.current_saved),
      deadline: g.deadline?.slice(0, 10) || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this goal?')) return;
    await axios.delete(`${API}/goals/${id}`).catch(() => {});
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleMarkComplete = async (g: Goal) => {
    await axios.put(`${API}/goals/${g.id}`, { ...g, status: 'completed', current_saved: g.target_amount }).catch(() => {});
    fetchGoals();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      name: `${selectedIcon} ${formData.name}`,
      target_amount: Number(formData.target_amount),
      current_saved: Number(formData.current_saved || 0),
      deadline: formData.deadline,
      status: 'active',
    };
    try {
      if (editingId) {
        await axios.put(`${API}/goals/${editingId}`, payload);
      } else {
        await axios.post(`${API}/goals`, payload);
      }
      fetchGoals();
      setIsModalOpen(false);
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalSaved = activeGoals.reduce((s, g) => s + g.current_saved, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Savings Goals</h1>
          <p className="text-slate-500 dark:text-slate-400">Track your financial milestones and dreams.</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Goal
        </Button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">Active Goals</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{activeGoals.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider mb-1">Total Saved</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">₹{totalSaved.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mb-1">Completed</p>
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{completedGoals.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-52 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-6xl">🎯</div>
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">No goals yet</p>
          <p className="text-slate-500 text-sm">Click "Add Goal" to start tracking your financial dreams.</p>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeGoals.map(goal => {
                  const pct = Math.min((goal.current_saved / goal.target_amount) * 100, 100);
                  const remaining = goal.target_amount - goal.current_saved;
                  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={goal.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 group hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{goal.name}</h3>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleMarkComplete(goal)} title="Mark complete" className="p-1.5 text-slate-400 hover:text-green-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Trophy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(goal)} className="p-1.5 text-slate-400 hover:text-primary transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{goal.current_saved.toLocaleString('en-IN')}</span>
                          <span className="text-sm text-slate-500">/ ₹{goal.target_amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span className="flex items-center"><Target className="w-3 h-3 mr-1" />{pct.toFixed(0)}% done</span>
                        <span>₹{remaining.toLocaleString('en-IN')} left</span>
                        <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}</span>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={openAdd}
                  className="h-full min-h-[180px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <PlusCircle className="w-10 h-10 mb-2" />
                  <span className="text-sm font-medium">Add Goal</span>
                </button>
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Completed 🎉</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-5 group relative">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-green-800 dark:text-green-300">{goal.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <button onClick={() => handleDelete(goal.id)} className="p-1 text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{goal.target_amount.toLocaleString('en-IN')}</p>
                    <div className="h-2 bg-green-200 dark:bg-green-800 rounded-full mt-3">
                      <div className="h-full bg-green-500 rounded-full w-full"></div>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">Goal achieved! 🎊</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Goal' : 'Add New Goal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Pick an Icon</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-2xl p-2 rounded-xl transition border-2 ${selectedIcon === icon ? 'border-primary bg-primary/10' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Goal Name *</label>
                <input
                  type="text" required placeholder="e.g. New Laptop, Vacation, Emergency Fund"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Target Amount (₹) *</label>
                  <input
                    type="number" required min="1" placeholder="100000"
                    value={formData.target_amount}
                    onChange={e => setFormData(f => ({ ...f, target_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Already Saved (₹)</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={formData.current_saved}
                    onChange={e => setFormData(f => ({ ...f, current_saved: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Target Date *</label>
                <input
                  type="date" required
                  value={formData.deadline}
                  onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  {editingId ? 'Save Changes' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
