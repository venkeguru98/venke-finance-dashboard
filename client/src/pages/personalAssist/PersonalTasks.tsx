import { useEffect, useState } from 'react';
import { 
  CheckSquare, Plus, Search, Trash2, Edit, CheckCircle2, 
  Circle, Calendar, X 
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalTasks() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  // Filter States
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'completed' | 'high'>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [category, setCategory] = useState('Personal');
  const [section, setSection] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [notes, setNotes] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = `${API}/personal/tasks?`;
      if (filter !== 'all') url += `filter=${filter}&`;
      if (priorityFilter !== 'all') url += `priority=${priorityFilter}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await axios.get(url);
      setTasks(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter, priorityFilter, search]);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`${API}/personal/tasks/${id}/status`, { status: nextStatus });
      fetchTasks();
    } catch (err: any) {
      alert('Failed to update status.');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`${API}/personal/tasks/${id}`);
      fetchTasks();
    } catch (err: any) {
      alert('Failed to delete task.');
    }
  };

  const handleOpenEdit = (task: any) => {
    setEditTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setDate(task.date);
    setPriority(task.priority);
    setCategory(task.category);
    setSection(task.section || 'morning');
    setNotes(task.notes || '');
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditTaskId(null);
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setPriority('medium');
    setCategory('Personal');
    setSection('morning');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    try {
      if (editTaskId) {
        await axios.put(`${API}/personal/tasks/${editTaskId}`, {
          title, description, date, priority, category, section, notes
        });
      } else {
        await axios.post(`${API}/personal/tasks`, {
          title, description, date, priority, category, section, notes
        });
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert('Failed to save task.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Task Manager
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">All Personal Tasks</h1>
          <p className="text-xs text-slate-400 font-medium">Filter, search, organize & schedule your daily objectives</p>
        </div>

        <button 
          onClick={handleOpenNew}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold">
          {(['all', 'today', 'overdue', 'completed', 'high'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl capitalize transition ${
                filter === f 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search & Priority Filter */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-slate-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 outline-none capitalize"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

      </div>

      {/* Task Cards List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No tasks found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create your first task or change your filter criteria.</p>
            <button onClick={handleOpenNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              + Add Task
            </button>
          </div>
        ) : (
          tasks.map(t => (
            <div 
              key={t.id}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                t.status === 'completed' 
                  ? 'bg-slate-950/60 border-slate-850 opacity-60' 
                  : 'bg-slate-950 border-slate-800 hover:border-indigo-500/40 shadow-xl'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button onClick={() => handleToggleStatus(t.id, t.status)} className="mt-0.5 flex-shrink-0">
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500 hover:text-indigo-400" />
                  )}
                </button>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold ${t.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                      {t.title}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      t.priority === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      t.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                  
                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {t.date}
                    </span>
                    <span>Category: <strong className="text-indigo-300">{t.category}</strong></span>
                    <span className="capitalize">Section: {t.section}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button onClick={() => handleOpenEdit(t)} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteTask(t.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">
                {editTaskId ? 'Edit Task' : 'Create Task'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Career">Career</option>
                    <option value="Learning">Learning</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
