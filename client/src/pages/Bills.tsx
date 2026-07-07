import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarRange, Plus, CheckCircle2, AlertCircle, RefreshCw, Trash2, Calendar, CreditCard, DollarSign } from 'lucide-react';
import Button from '../components/ui/Button';
import confetti from 'canvas-confetti';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function Bills() {
  const [rules, setRules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'manage'>('timeline');

  // Modal & Form state
  const [isOpen, setIsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'expense',
    category_id: '',
    payment_method: 'UPI',
    frequency: 'monthly',
    next_date: new Date().toISOString().slice(0, 10)
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rulesRes, catsRes] = await Promise.all([
        axios.get(`${API}/recurring-rules`),
        axios.get(`${API}/categories`)
      ]);
      setRules(rulesRes.data || []);
      setCategories(catsRes.data || []);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to load recurring bills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      amount: '',
      type: 'expense',
      category_id: categories.filter(c => c.type === 'expense')[0]?.id || '',
      payment_method: 'UPI',
      frequency: 'monthly',
      next_date: new Date().toISOString().slice(0, 10)
    });
    setIsOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      amount: String(rule.amount),
      type: rule.type,
      category_id: String(rule.category_id),
      payment_method: rule.payment_method,
      frequency: rule.frequency,
      next_date: rule.next_date
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.category_id) return;

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: parseInt(formData.category_id, 10)
      };

      if (editingRule) {
        await axios.put(`${API}/recurring-rules/${editingRule.id}`, payload);
      } else {
        await axios.post(`${API}/recurring-rules`, payload);
      }
      setIsOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save recurring bill.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await axios.delete(`${API}/recurring-rules/${id}`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete.');
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    try {
      await axios.post(`${API}/recurring-rules/${id}/trigger`);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 }
      });
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to trigger payment.');
    }
  };

  // Calculations for current month bills
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"

  // Filter bills due this month
  const billsThisMonth = rules.map(rule => {
    const isDueThisMonth = rule.next_date.startsWith(currentMonthStr);
    const wasPaidThisMonth = rule.last_triggered && rule.last_triggered.startsWith(currentMonthStr);
    return {
      ...rule,
      isDueThisMonth,
      wasPaidThisMonth,
      status: wasPaidThisMonth ? 'paid' : (isDueThisMonth ? 'unpaid' : 'upcoming')
    };
  });

  const totalMonthlyBills = billsThisMonth
    .filter(b => b.isDueThisMonth || b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const unpaidMonthlyBills = billsThisMonth
    .filter(b => b.status === 'unpaid')
    .reduce((sum, b) => sum + b.amount, 0);

  const paidMonthlyBills = billsThisMonth
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-500">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Loading bills and subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branded Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            <CalendarRange className="w-7 h-7 text-primary mr-2" />
            Bills & Subscriptions
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Manage recurring commitments, track payment calendars, and forecast available balance.
          </p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-1.5 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> Add Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Bills This Month</p>
            <p className="text-xl font-bold text-white mt-0.5">₹{totalMonthlyBills.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Remaining Unpaid</p>
            <p className="text-xl font-bold text-white mt-0.5">₹{unpaidMonthlyBills.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Logged / Paid</p>
            <p className="text-xl font-bold text-white mt-0.5">₹{paidMonthlyBills.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex bg-slate-905 border border-slate-800 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'timeline'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Timeline Calendar
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manage'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Manage Rules ({rules.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-3xl text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* TAB 1: Timeline Calendar */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-6">
          <h2 className="text-md font-bold text-white flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Billing Cycle Timeline — {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>

          {billsThisMonth.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-semibold text-sm">
              No recurring bills configured. Switch to "Manage Rules" to add one!
            </div>
          ) : (
            <div className="space-y-4">
              {billsThisMonth.map((bill) => (
                <div
                  key={bill.id}
                  className={`border p-4.5 rounded-3xl flex flex-wrap items-center justify-between gap-4 transition-all ${
                    bill.status === 'paid'
                      ? 'border-emerald-950 bg-emerald-950/10'
                      : 'border-slate-850 bg-slate-900/20'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                      style={{ backgroundColor: bill.category_color || '#6366f1' }}
                    >
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{bill.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Due: {new Date(bill.next_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • Frequency: {bill.frequency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-extrabold text-white">₹{bill.amount.toLocaleString('en-IN')}</p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 uppercase ${
                          bill.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>

                    {bill.status === 'unpaid' && (
                      <Button
                        onClick={() => handleMarkAsPaid(bill.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 py-2 px-3 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Manage Rules */}
      {activeTab === 'manage' && (
        <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-md font-bold text-white">Active Recurring Rules</h2>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-semibold text-sm">
              No subscription templates found. Click "Add Bill" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4">Next Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-3.5 px-4 font-bold text-white">{rule.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rule.category_color }} />
                          {rule.category_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{rule.payment_method}</td>
                      <td className="py-3.5 px-4 capitalize">{rule.frequency}</td>
                      <td className="py-3.5 px-4">{rule.next_date}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white">₹{rule.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-xs font-semibold text-slate-350">
            <h2 className="text-lg font-black text-white">{editingRule ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-slate-400">Bill/Subscription Name *</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Netflix, Gym, House Rent"
                  className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-slate-400">Amount (₹) *</label>
                  <input
                    type="number" step="0.01" required value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="299"
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-400">Transaction Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-slate-400">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  >
                    {categories.filter(c => c.type === formData.type).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-400">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-slate-400">Billing Frequency *</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-400">Next Due Date *</label>
                  <input
                    type="date" required value={formData.next_date}
                    onChange={e => setFormData({ ...formData, next_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" onClick={() => setIsOpen(false)} className="bg-slate-900 text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="shadow-md shadow-primary/20">
                  {editingRule ? 'Save Changes' : 'Create Bill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
