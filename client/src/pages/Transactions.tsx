import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Pencil, Folder } from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';

type Transaction = {
  id: number;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
  category_name: string;
  category_color: string;
  payment_method: string;
  notes: string;
  category_id: number;
};

type Category = { id: number; name: string; color: string; type: string };

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  type: 'expense' as 'income' | 'expense' | 'savings',
  category_id: '',
  payment_method: 'UPI',
  notes: ''
};

const TYPE_COLORS: Record<string, string> = {
  income: 'text-green-500',
  expense: 'text-red-400',
  savings: 'text-blue-400'
};

const TYPE_SIGN: Record<string, string> = {
  income: '+',
  expense: '-',
  savings: '→'
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');

  const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

  // Fetch categories
  useEffect(() => {
    axios.get(`${API}/categories`).then(res => setCategories(res.data)).catch(() => {
      setCategories([
        { id: 1, name: 'Food & Dining', color: '#F59E0B', type: 'expense' },
        { id: 2, name: 'Travel', color: '#3B82F6', type: 'expense' },
        { id: 3, name: 'Fuel', color: '#6B7280', type: 'expense' },
        { id: 4, name: 'Rent', color: '#8B5CF6', type: 'expense' },
        { id: 5, name: 'Shopping', color: '#EC4899', type: 'expense' },
        { id: 6, name: 'Entertainment', color: '#10B981', type: 'expense' },
      ]);
    });
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/transactions`);
      setTransactions(res.data || []);
    } catch (_) {
      console.warn('Network offline. Yielding fallback mock transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsAddingCat(false);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      date: t.date,
      amount: String(t.amount),
      type: t.type,
      category_id: String(t.category_id),
      payment_method: t.payment_method,
      notes: t.notes
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await axios.delete(`${API}/transactions/${id}`);
    } catch (_) {}
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      date: formData.date,
      amount: Number(formData.amount),
      type: formData.type,
      category_id: Number(formData.category_id),
      payment_method: formData.payment_method,
      notes: formData.notes
    };

    try {
      if (editingId) {
        await axios.put(`${API}/transactions/${editingId}`, payload);
      } else {
        await axios.post(`${API}/transactions`, payload);
      }
      fetchTransactions();
      setIsModalOpen(false);
    } catch (_) {
      // Offline: update UI optimistically
      const cat = categories.find(c => c.id === Number(formData.category_id));
      if (editingId) {
        setTransactions(prev => prev.map(t => t.id === editingId
          ? { ...t, ...payload, category_name: cat?.name || '', category_color: cat?.color || '#ccc' }
          : t
        ));
      } else {
        const newTx: Transaction = {
          id: Date.now(),
          ...payload,
          category_name: cat?.name || '',
          category_color: cat?.color || '#ccc',
        };
        setTransactions(prev => [newTx, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Totals for selected filter
  const totals = {
    income: transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    savings: transactions.filter(t => t.type === 'savings').reduce((a, t) => a + t.amount, 0),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Add, edit and track all your money movements.</p>
        </div>
        <Button variant="primary" onClick={openAddModal} className="w-full sm:w-auto text-xs font-bold py-2.5 hover:scale-[1.02] transition-transform">
          <Plus className="w-4.5 h-4.5 mr-1.5" /> Add Transaction
        </Button>
      </div>

      {/* Summary Cards Row (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800 p-4.5 rounded-2xl flex flex-col justify-between h-20 shadow-sm hover:scale-[1.01] transition-transform">
          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Total Income</span>
          <p className="text-xl font-extrabold text-green-700 dark:text-green-300">₹{totals.income.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800 p-4.5 rounded-2xl flex flex-col justify-between h-20 shadow-sm hover:scale-[1.01] transition-transform">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Total Expenses</span>
          <p className="text-xl font-extrabold text-red-700 dark:text-red-300">₹{totals.expense.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800 p-4.5 rounded-2xl flex flex-col justify-between h-20 shadow-sm hover:scale-[1.01] transition-transform">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Savings</span>
          <p className="text-xl font-extrabold text-blue-700 dark:text-blue-300">₹{totals.savings.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Horizontally Scrollable Tab Bar for Filters */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none whitespace-nowrap border-b border-slate-200 dark:border-slate-800">
        {(['all', 'income', 'expense', 'savings'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              filterType === type
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {type === 'all' ? '💼 All Transactions' : type === 'income' ? '🟢 Income' : type === 'expense' ? '🔴 Expenses' : '🔵 Savings'}
          </button>
        ))}
      </div>

      {/* Responsive Transactions View */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse w-full"></div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="flex flex-col items-center space-y-3 text-slate-400">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
              <Folder className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">No transactions logged</p>
            <p className="text-xs text-slate-550 max-w-xs leading-relaxed">Choose an active filter or create a new entry to get started.</p>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Desktop Wide Screen Table View */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {t.notes || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.category_color || '#94A3B8' }}></div>
                          <span>{t.category_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{t.payment_method}</td>
                      <td className={`px-6 py-4 text-right font-extrabold whitespace-nowrap text-sm ${TYPE_COLORS[t.type]}`}>
                        {TYPE_SIGN[t.type]}₹{Number(t.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2.5 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEditModal(t)} className="text-slate-400 hover:text-primary transition p-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 transition p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Mobile Responsive Card List View */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.map((t) => (
              <div 
                key={t.id} 
                className="bg-white dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{t.notes || 'No notes description'}</p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-xs font-black font-mono ${TYPE_COLORS[t.type]}`}>
                    {TYPE_SIGN[t.type]}₹{Number(t.amount).toLocaleString('en-IN')}
                  </p>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.category_color || '#94A3B8' }} />
                    <span className="text-slate-600 dark:text-slate-400">{t.category_name || '—'}</span>
                  </div>
                  <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500">{t.payment_method}</span>
                </div>

                <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <button onClick={() => openEditModal(t)} className="text-slate-400 hover:text-primary flex items-center space-x-1 p-1 border border-slate-100 dark:border-slate-900 rounded-lg">
                    <Pencil className="w-3 h-3" /> <span>Edit</span>
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 flex items-center space-x-1 p-1 border border-slate-100 dark:border-slate-900 rounded-lg">
                    <Trash2 className="w-3 h-3" /> <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal (Responsive Mobile Bottom/Full sheet layout) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-5 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {editingId ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable form panel) */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              
              {/* Type selector buttons */}
              <div>
                <label className="block mb-1.5">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['expense', 'income', 'savings'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, type, category_id: '' }))}
                      className={`py-2.5 rounded-xl font-extrabold capitalize transition-all border-2 text-[11px] ${
                        formData.type === type
                          ? type === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : type === 'expense' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-400 hover:border-slate-350'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date inputs (Single columns on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-4.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-4.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Description inputs */}
              <div>
                <label className="block mb-1.5">Description *</label>
                <input
                  type="text"
                  required
                  placeholder={formData.type === 'income' ? 'e.g. Monthly Salary' : formData.type === 'savings' ? 'e.g. SIP, RD Savings' : 'e.g. Shopping, Rent, Food'}
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Category & Payment Method inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 flex justify-between items-center">
                    <span>Category *</span>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCat(!isAddingCat)} 
                      className="text-[10px] text-primary hover:underline font-black"
                    >
                      {isAddingCat ? 'Select Category' : '+ Create Custom'}
                    </button>
                  </label>
                  
                  {isAddingCat ? (
                    <div className="space-y-2 p-3 bg-slate-55 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-805">
                      <input
                        type="text"
                        placeholder="Category Name"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1">
                          {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCatColor(c)}
                              className={`w-4 h-4 rounded-full border ${newCatColor === c ? 'border-black dark:border-white scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newCatName.trim()) return;
                            try {
                              const res = await axios.post(`${API}/categories`, {
                                name: newCatName.trim(),
                                type: formData.type,
                                color: newCatColor
                              });
                              if (res.data.success) {
                                const newId = res.data.id;
                                const newCategory = {
                                  id: newId,
                                  name: newCatName.trim(),
                                  type: formData.type,
                                  color: newCatColor
                                };
                                setCategories(prev => [...prev, newCategory]);
                                setFormData(f => ({ ...f, category_id: String(newId) }));
                                setIsAddingCat(false);
                                setNewCatName('');
                              }
                            } catch (_) {
                              const newId = Date.now();
                              const newCategory = {
                                  id: newId,
                                  name: newCatName.trim(),
                                  type: formData.type,
                                  color: newCatColor
                              };
                              setCategories(prev => [...prev, newCategory]);
                              setFormData(f => ({ ...f, category_id: String(newId) }));
                              setIsAddingCat(false);
                              setNewCatName('');
                            }
                          }}
                          className="px-2.5 py-1 bg-primary text-white text-[10px] font-black rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.category_id}
                      onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-4.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choose category</option>
                      {categories.filter(c => c.type === formData.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5">Payment Method *</label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={e => setFormData(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-4.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons (Stacked on mobile screens) */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3.5 pt-4 border-t border-slate-100 dark:border-slate-850">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto font-bold py-2.5">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full sm:w-auto font-bold py-2.5">
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
