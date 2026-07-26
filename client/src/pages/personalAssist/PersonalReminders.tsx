import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Calendar, Clock, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalReminders() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reminderTime, setReminderTime] = useState('09:00');
  const [repeatFrequency, setRepeatFrequency] = useState('none');

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/personal/reminders`);
      setReminders(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reminderDate) return;
    try {
      await axios.post(`${API}/personal/reminders`, {
        title, description, reminder_date: reminderDate, reminder_time: reminderTime, repeat_frequency: repeatFrequency
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchReminders();
    } catch (err: any) {
      alert('Failed to create reminder.');
    }
  };

  const handleDeleteReminder = async (id: number) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await axios.delete(`${API}/personal/reminders/${id}`);
      fetchReminders();
    } catch (err: any) {
      alert('Failed to delete reminder.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">
              Reminders Timeline
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Personal Reminders</h1>
          <p className="text-xs text-slate-500 font-medium">Never miss important tasks, health checkups, or life milestones</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold">
            Loading reminders...
          </div>
        ) : reminders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-sm">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No active reminders</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Set reminders for upcoming events or daily habits.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-sm">
              + Set Reminder
            </button>
          </div>
        ) : (
          reminders.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl flex-shrink-0">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{r.title}</h3>
                  {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {r.reminder_date}</span>
                    {r.reminder_time && <span className="flex items-center gap-1"><Clock size={12} /> {r.reminder_time}</span>}
                    <span className="capitalize text-teal-700 font-bold">Repeat: {r.repeat_frequency}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => handleDeleteReminder(r.id)} className="text-slate-400 hover:text-red-600 p-1.5">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Create Personal Reminder</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor appointment, Car service"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
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
                    value={reminderDate}
                    onChange={e => setReminderDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Time</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Repeat Frequency</label>
                <select
                  value={repeatFrequency}
                  onChange={e => setRepeatFrequency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 capitalize"
                >
                  <option value="none">Does Not Repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
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
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
