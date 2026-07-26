import { useEffect, useState } from 'react';
import { StickyNote, Plus, Search, Pin, Trash2, Edit3, Tag, X } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalNotes() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/personal/notes`);
      setNotes(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (editId) {
        await axios.put(`${API}/personal/notes/${editId}`, {
          title, content, category, tags, is_pinned: isPinned
        });
      } else {
        await axios.post(`${API}/personal/notes`, {
          title, content, category, tags, is_pinned: isPinned
        });
      }
      setIsModalOpen(false);
      fetchNotes();
    } catch (err: any) {
      alert('Failed to save note.');
    }
  };

  const handleTogglePin = async (note: any) => {
    try {
      await axios.put(`${API}/personal/notes/${note.id}`, {
        ...note,
        is_pinned: !note.is_pinned
      });
      fetchNotes();
    } catch (err: any) {
      alert('Failed to pin note.');
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`${API}/personal/notes/${id}`);
      fetchNotes();
    } catch (err: any) {
      alert('Failed to delete note.');
    }
  };

  const handleOpenNew = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setTags('');
    setIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n: any) => {
    setEditId(n.id);
    setTitle(n.title);
    setContent(n.content || '');
    setCategory(n.category || 'General');
    setTags(n.tags || '');
    setIsPinned(n.is_pinned === 1);
    setIsModalOpen(true);
  };

  const filteredNotes = notes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Personal Notes
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">Life Notes & Ideas</h1>
          <p className="text-xs text-slate-400 font-medium">Keep quick thoughts, reference notes & journal entries stored safely in database</p>
        </div>

        <button 
          onClick={handleOpenNew}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-indigo-600/30 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center bg-slate-900 px-3 py-2 text-xs">
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search notes by title, content or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-slate-500"
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs font-bold">
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="col-span-full bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-3">
            <StickyNote className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No notes found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create notes to store ideas, meeting summaries, or personal thoughts.</p>
            <button onClick={handleOpenNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              + New Note
            </button>
          </div>
        ) : (
          filteredNotes.map(n => (
            <div 
              key={n.id} 
              className={`bg-slate-950 p-5 rounded-3xl border shadow-2xl flex flex-col justify-between space-y-3 relative group transition ${
                n.is_pinned === 1 ? 'border-indigo-500/50 bg-indigo-950/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                    {n.category || 'General'}
                  </span>

                  <button 
                    onClick={() => handleTogglePin(n)}
                    className={`p-1.5 rounded-lg transition ${n.is_pinned === 1 ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 hover:text-white'}`}
                    title={n.is_pinned ? 'Unpin' : 'Pin note'}
                  >
                    <Pin size={14} className={n.is_pinned ? 'fill-amber-400' : ''} />
                  </button>
                </div>

                <h3 className="text-sm font-black text-white">{n.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-850">
                {n.tags && (
                  <div className="flex items-center space-x-1 text-[10px] text-indigo-300 font-mono">
                    <Tag size={12} />
                    <span>{n.tags}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{new Date(n.created_at || Date.now()).toLocaleDateString()}</span>
                  
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleOpenEdit(n)} className="text-slate-400 hover:text-white p-1">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDeleteNote(n.id)} className="text-slate-400 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black uppercase text-white">
                {editId ? 'Edit Note' : 'Create Personal Note'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Note title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Content</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write your thoughts..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
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
                    <option value="General">General</option>
                    <option value="Ideas">Ideas & Brainstorm</option>
                    <option value="Journal">Personal Journal</option>
                    <option value="Work">Work & Projects</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tags (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. react, health, book"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800"
                />
                <label htmlFor="pinCheck" className="text-slate-300 font-bold cursor-pointer">Pin to top of notes</label>
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
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
