import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Clock, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  // Event Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await axios.get(`${API}/personal/events?month=${monthStr}`);
      setEvents(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  const handlePrev = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    try {
      await axios.post(`${API}/personal/events`, {
        title, description, event_date: eventDate, start_time: startTime, end_time: endTime, location
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert('Failed to create event.');
    }
  };

  const monthLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Personal Calendar
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">{monthLabel}</h1>
          <p className="text-xs text-slate-400 font-medium">Manage appointments, deadlines and schedule events</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs font-bold text-white shadow-inner">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-indigo-300 font-extrabold uppercase tracking-wider min-w-[120px] text-center text-xs">
              {monthLabel}
            </span>
            <button onClick={handleNext} className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white">
              <ChevronRight size={18} />
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus size={16} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Scheduled Events for {monthLabel}</h3>
        
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">
            No events scheduled for this month. Click + Add Event to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {ev.category || 'Personal'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">{ev.event_date}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                {ev.description && <p className="text-xs text-slate-400">{ev.description}</p>}
                
                <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono pt-1">
                  {ev.start_time && <span className="flex items-center gap-1"><Clock size={12} /> {ev.start_time} - {ev.end_time || ''}</span>}
                  {ev.location && <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">Create Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strategy Workshop, Doctor appointment"
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
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Office, Zoom"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
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
