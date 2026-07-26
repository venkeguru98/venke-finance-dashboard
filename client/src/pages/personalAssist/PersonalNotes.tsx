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
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">
              Personal Notes
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Life Notes & Ideas</h1>
          <p className="text-xs text-slate-500 font-medium">Keep quick thoughts, reference notes & journal entries stored safely</p>
        </div>

        <button 
          onClick={handleOpenNew}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center bg-slate-50 px-3 py-2 text-xs">
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search notes by title, content or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-slate-800 text-xs w-full placeholder:text-slate-400"
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs font-bold">
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-sm">
            <StickyNote className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No notes found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create notes to store ideas, meeting summaries, or personal thoughts.</p>
            <button onClick={handleOpenNew} className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-sm">
              + New Note
            </button>
          </div>
        ) : (
          filteredNotes.map(n => (
            <div 
              key={n.id} 
              className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between space-y-3 relative group transition ${
                n.is_pinned === 1 ? 'border-teal-400 bg-teal-50/20' : 'border-slate-200/80 hover:border-teal-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded">
                    {n.category || 'General'}
                  </span>

                  <button 
                    onClick={() => handleTogglePin(n)}
                    className={`p-1.5 rounded-lg transition ${n.is_pinned === 1 ? 'text-amber-500 bg-amber-100' : 'text-slate-400 hover:text-slate-700'}`}
                    title={n.is_pinned ? 'Unpin' : 'Pin note'}
                  >
                    <Pin size={14} className={n.is_pinned ? 'fill-amber-500' : ''} />
                  </button>
                </div>

                <h3 className="text-sm font-black text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-150">
                {n.tags && (
                  <div className="flex items-center space-x-1 text-[10px] text-teal-700 font-mono">
                    <Tag size={12} />
                    <span>{n.tags}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>{new Date(n.created_at || Date.now()).toLocaleDateString()}</span>
                  
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleOpenEdit(n)} className="text-slate-400 hover:text-slate-700 p-1">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDeleteNote(n.id)} className="text-slate-400 hover:text-red-600 p-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">
                {editId ? 'Edit Note' : 'Create Personal Note'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Note title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Content</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write your thoughts..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="General">General</option>
                    <option value="Ideas">Ideas & Brainstorm</option>
                    <option value="Journal">Personal Journal</option>
                    <option value="Work">Work & Projects</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Tags</label>
                  <input
                    type="text"
                    placeholder="e.g. react, health"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="pinCheck" className="text-slate-700 font-bold cursor-pointer">Pin to top</label>
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
