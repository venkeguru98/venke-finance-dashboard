import { useEffect, useState } from 'react';
import { 
  Sun, Sunrise, Sunset, Plus, CheckCircle2, Circle, Trash2, X 
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function MyDay() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayStr, setTodayStr] = useState(new Date().toISOString().slice(0, 10));

  // Add Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [section, setSection] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const fetchTodayTasks = async () => {
    try {
      const res = await axios.get(`${API}/personal/tasks?date=${todayStr}`);
      setTasks(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, [todayStr]);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`${API}/personal/tasks/${id}/status`, { status: nextStatus });
      fetchTodayTasks();
    } catch (err: any) {
      alert('Failed to update status.');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`${API}/personal/tasks/${id}`);
      fetchTodayTasks();
    } catch (err: any) {
      alert('Failed to delete task.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await axios.post(`${API}/personal/tasks`, {
        title,
        description,
        date: todayStr,
        priority,
        category: 'Personal',
        section
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchTodayTasks();
    } catch (err: any) {
      alert('Failed to create task.');
    }
  };

  const morningTasks = tasks.filter(t => t.section === 'morning' || !t.section);
  const afternoonTasks = tasks.filter(t => t.section === 'afternoon');
  const eveningTasks = tasks.filter(t => t.section === 'evening');

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              Daily Planner
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">My Day Planner</h1>
          <p className="text-xs text-slate-400 font-medium">Organize tasks into Morning, Afternoon & Evening routines</p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={todayStr}
            onChange={e => setTodayStr(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs font-mono text-white outline-none"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-white">Daily Target</span>
          <span className="font-mono text-emerald-400 font-black">{completedCount} of {tasks.length} Completed ({progressPct}%)</span>
        </div>
        <div className="w-full sm:w-64 bg-slate-900 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* 3 Time Sections: Morning, Afternoon, Evening */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Morning Section */}
        <TaskSectionCard
          title="Morning Routine"
          subtitle="Start strong (6:00 AM - 12:00 PM)"
          icon={<Sunrise className="w-5 h-5 text-amber-400" />}
          tasks={morningTasks}
          onToggleStatus={handleToggleStatus}
          onDeleteTask={handleDeleteTask}
          onAddTask={() => { setSection('morning'); setIsModalOpen(true); }}
        />

        {/* Afternoon Section */}
        <TaskSectionCard
          title="Afternoon Focus"
          subtitle="Peak productivity (12:00 PM - 5:00 PM)"
          icon={<Sun className="w-5 h-5 text-blue-400" />}
          tasks={afternoonTasks}
          onToggleStatus={handleToggleStatus}
          onDeleteTask={handleDeleteTask}
          onAddTask={() => { setSection('afternoon'); setIsModalOpen(true); }}
        />

        {/* Evening Section */}
        <TaskSectionCard
          title="Evening Wind Down"
          subtitle="Reflect & relax (5:00 PM - 10:00 PM)"
          icon={<Sunset className="w-5 h-5 text-purple-400" />}
          tasks={eveningTasks}
          onToggleStatus={handleToggleStatus}
          onDeleteTask={handleDeleteTask}
          onAddTask={() => { setSection('evening'); setIsModalOpen(true); }}
        />

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">Add Task for My Day</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning jog, Client meeting"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Add notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Section</label>
                  <select
                    value={section}
                    onChange={e => setSection(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function TaskSectionCard({ 
  title, subtitle, icon, tasks, onToggleStatus, onDeleteTask, onAddTask 
}: { 
  title: string; subtitle: string; icon: any; tasks: any[]; 
  onToggleStatus: (id: number, status: string) => void; 
  onDeleteTask: (id: number) => void; 
  onAddTask: () => void;
}) {
  return (
    <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
      <div className="flex justify-between items-center border-b border-slate-850 pb-3">
        <div className="flex items-center space-x-2.5">
          {icon}
          <div>
            <h3 className="text-sm font-extrabold text-white">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        <button onClick={onAddTask} className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 transition">
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-2 min-h-[220px]">
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-medium">
            No tasks scheduled. Click + to add.
          </div>
        ) : (
          tasks.map(t => (
            <div 
              key={t.id}
              className={`p-3 rounded-2xl border transition flex items-start justify-between gap-2 ${
                t.status === 'completed' 
                  ? 'bg-slate-900/40 border-slate-850 opacity-60' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div 
                onClick={() => onToggleStatus(t.id, t.status)} 
                className="flex items-start space-x-2.5 cursor-pointer flex-1"
              >
                {t.status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className={`text-xs font-bold block ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                    {t.title}
                  </span>
                  {t.description && <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      t.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                      t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {t.priority}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{t.category}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => onDeleteTask(t.id)} className="text-slate-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-bold border-t border-slate-850 pt-2 flex justify-between">
        <span>{tasks.filter(t => t.status === 'completed').length}/{tasks.length} Completed</span>
      </div>
    </div>
  );
}
