import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Pencil, Trash2, X, CheckCircle2, Info, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import Button from '../components/ui/Button';

type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  limit_amount: number;
  spent: number;
  month: number;
  year: number;
};

type Category = { id: number; name: string; color: string; type: string };

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

const MONTHS_LIST = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const YEARS_LIST = [2025, 2026, 2027, 2028];

export default function Budgets() {
  const now = new Date();
  // Filter States
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Log Expense State
  const [isLogExpenseOpen, setIsLogExpenseOpen] = useState(false);
  const [logCatId, setLogCatId] = useState<number | null>(null);
  const [logCatName, setLogCatName] = useState('');
  const [logExpenseData, setLogExpenseData] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    payment_method: 'UPI'
  });

  // Form State
  const [formData, setFormData] = useState({
    category_id: '',
    limit_amount: '',
    month: now.getMonth() + 1,
    year: now.getFullYear()
  });

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBudgets = () => {
    setLoading(true);
    axios.get(`${API}/budgets?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => setBudgets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(res.data.filter((c: Category) => c.type === 'expense')))
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setErrorMessage('');
    setFormData({
      category_id: '',
      limit_amount: '',
      month: selectedMonth,
      year: selectedYear
    });
    setIsModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditingId(b.id);
    setErrorMessage('');
    setFormData({
      category_id: String(b.category_id),
      limit_amount: String(b.limit_amount),
      month: b.month,
      year: b.year
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this budget? Your transaction history won\'t be changed.')) return;
    try {
      await axios.delete(`${API}/budgets/${id}`);
      setBudgets(prev => prev.filter(b => b.id !== id));
      showToast('Budget deleted successfully');
    } catch (err) {
      showToast('Failed to delete budget');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const limit = Number(formData.limit_amount);
    if (limit <= 0) {
      setErrorMessage('Budget limit must be greater than zero.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API}/budgets/${editingId}`, { limit_amount: limit });
        showToast('Budget updated successfully');
      } else {
        await axios.post(`${API}/budgets`, {
          category_id: Number(formData.category_id),
          limit_amount: limit,
          month: Number(formData.month),
          year: Number(formData.year)
        });
        showToast('Budget created successfully');
      }
      fetchBudgets();
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to save budget limit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Quick Expense
  const handleLogExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logExpenseData.amount || Number(logExpenseData.amount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    try {
      await axios.post(`${API}/transactions`, {
        date: logExpenseData.date,
        amount: Number(logExpenseData.amount),
        type: 'expense',
        category_id: logCatId,
        payment_method: logExpenseData.payment_method,
        notes: logExpenseData.notes || `${logCatName} Expense`
      });
      showToast(`Logged expense of ₹${Number(logExpenseData.amount).toLocaleString('en-IN')} for ${logCatName}`);
      setIsLogExpenseOpen(false);
      fetchBudgets();
    } catch (err) {
      showToast('Failed to log expense.');
    }
  };

  const exportCSV = () => {
    if (budgets.length === 0) {
      showToast('No budgets to export');
      return;
    }
    const headers = ['Category', 'Limit Amount (₹)', 'Spent Amount (₹)', 'Remaining (₹)', 'Usage %', 'Status'];
    const rows = budgets.map(b => {
      const remaining = b.limit_amount - b.spent;
      const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
      const status = pct >= 100 ? 'Over Budget' : pct >= 80 ? 'Near Limit' : 'Healthy';
      return [b.category_name, b.limit_amount, b.spent, remaining, `${pct.toFixed(0)}%`, status];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgets-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Budgets CSV exported successfully');
  };

  // Helper for progress bar color
  const getProgressBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-red-500'; // 🔴 Red
    if (pct >= 81) return 'bg-orange-500'; // 🟠 Orange
    if (pct >= 51) return 'bg-blue-500'; // 🔵 Blue
    return 'bg-green-500'; // 🟢 Green
  };

  // Helper for status text / badge
  const getBudgetStatusInfo = (pct: number) => {
    if (pct >= 100) return { text: 'Over Budget', color: 'text-red-500 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20', dot: 'bg-red-500' };
    if (pct >= 80) return { text: 'Near Limit', color: 'text-orange-500 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20', dot: 'bg-orange-500' };
    return { text: 'Healthy', color: 'text-green-500 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20', dot: 'bg-green-500' };
  };

  // Calculate estimated days left in month
  const getDaysLeftInMonth = () => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const currentDay = now.getDate();
    return selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()
      ? Math.max(totalDays - currentDay, 0)
      : null;
  };

  const daysLeft = getDaysLeftInMonth();

  // Filters application
  const filteredBudgets = budgets.filter(b => {
    const matchCategory = filterCategory === 'all' || String(b.category_id) === filterCategory;
    const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
    const status = pct >= 100 ? 'over' : pct >= 80 ? 'near' : 'healthy';
    const matchStatus = filterStatus === 'all' || status === filterStatus;
    return matchCategory && matchStatus;
  });

  // Totals calculations
  const totalBudget = filteredBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalSpent = filteredBudgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Chart Data format
  const chartData = filteredBudgets.map(b => ({
    name: b.category_name,
    Limit: b.limit_amount,
    Spent: b.spent
  }));

  // Smart suggestions logic
  const getSmartSuggestions = () => {
    const suggestions: string[] = [];
    budgets.forEach(b => {
      const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
      if (pct >= 105) {
        suggestions.push(`You consistently exceed your ${b.category_name} budget by ₹${(b.spent - b.limit_amount).toLocaleString('en-IN')}. Consider increasing it next month.`);
      } else if (pct > 0 && pct < 20) {
        suggestions.push(`Your ${b.category_name} budget is highly underutilized (only ${pct.toFixed(0)}% spent). Consider reducing this limit to save more.`);
      }
    });
    return suggestions;
  };

  const smartSuggestions = getSmartSuggestions();

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budget Planner</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure monthly targets and view historical spending analyses.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={exportCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Report
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Set Limit
          </Button>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-500 font-semibold uppercase">Month:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
            >
              {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-500 font-semibold uppercase">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
            >
              {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-500 font-semibold uppercase">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-500 font-semibold uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
            >
              <option value="all">All Status</option>
              <option value="healthy">🟢 Healthy</option>
              <option value="near">🟠 Near Limit</option>
              <option value="over">🔴 Over Budget</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overall Budget Summary Panel */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Main Overview Summary */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Overall Budget Summary</h3>
                <p className="text-xs text-slate-500">Usage statistics for current filters</p>
              </div>
              <span className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                {overallPct.toFixed(0)}% Used
              </span>
            </div>
            
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(overallPct)}`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Limit</p>
                <p className="text-xl font-extrabold">₹{totalBudget.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Spent</p>
                <p className="text-xl font-extrabold text-red-500">₹{totalSpent.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Remaining</p>
                <p className={`text-xl font-extrabold ${totalRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{totalRemaining.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Side Indicator Card */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Month Status</p>
              {daysLeft !== null ? (
                <div>
                  <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white">{daysLeft} Days</h4>
                  <p className="text-xs text-slate-500 mt-1">Remaining in {MONTHS_LIST.find(m => m.value === selectedMonth)?.label}</p>
                </div>
              ) : (
                <div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Historical View</h4>
                  <p className="text-xs text-slate-500 mt-1">Viewing records of {MONTHS_LIST.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">Active Budgets: </span>
              {filteredBudgets.length} limit lines set.
            </div>
          </div>
        </div>
      )}

      {/* Main Budget Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-56 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-5xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No configured budgets</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">There are no custom limits configured matching your search. Click "Set Limit" to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.map(b => {
            const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
            const remaining = b.limit_amount - b.spent;
            const statusInfo = getBudgetStatusInfo(pct);

            return (
              <div key={b.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-shadow group relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: b.category_color }} />
                
                {/* Card Title Header */}
                <div className="flex justify-between items-center mb-3.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.category_color }} />
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{b.category_name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center space-x-1 ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1`} />
                      {statusInfo.text}
                    </span>
                    <div className="flex opacity-0 group-hover:opacity-100 transition space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLogCatId(b.category_id);
                          setLogCatName(b.category_name);
                          setLogExpenseData({
                            amount: '',
                            date: new Date().toISOString().slice(0, 10),
                            notes: `Manual spend logged for ${b.category_name}`,
                            payment_method: 'UPI'
                          });
                          setIsLogExpenseOpen(true);
                        }}
                        title="Add Spend Amount Directly"
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-green-500 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(b)} title="Edit Budget" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} title="Delete Budget" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress values */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Spent: ₹{b.spent.toLocaleString('en-IN')}</span>
                    <span>Limit: ₹{b.limit_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Detail Summary Footer */}
                <div className="flex justify-between items-center text-xs mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{pct.toFixed(0)}% consumed</span>
                  <span className={`font-semibold ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {remaining >= 0 ? `₹${remaining.toLocaleString('en-IN')} left` : `Over by ₹${Math.abs(remaining).toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Chart & Smart suggestions split */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Budget vs Spending Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Limit" name="Limit Amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" name="Actual Spent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Smart Suggestions and alerts */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Info className="w-5 h-5 text-primary mr-2" />
                Smart Recommendations
              </h3>
              {smartSuggestions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  All spending aligns beautifully with your set budget limits!
                </div>
              ) : (
                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                  {smartSuggestions.map((s, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
              Recommendations generate automatically based on real spending velocities.
            </div>
          </div>
        </div>
      )}

      {/* Main Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Budget Limit' : 'Configure New Budget'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Expense Category *</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Month *</label>
                      <select
                        value={formData.month}
                        onChange={e => setFormData(f => ({ ...f, month: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Year *</label>
                      <select
                        value={formData.year}
                        onChange={e => setFormData(f => ({ ...f, year: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Monthly Limit Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15000"
                  value={formData.limit_amount}
                  onChange={e => setFormData(f => ({ ...f, limit_amount: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  {editingId ? 'Save Changes' : 'Create Budget'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Log Expense Modal */}
      {isLogExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Log Spend for {logCatName}
              </h3>
              <button onClick={() => setIsLogExpenseOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogExpenseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Amount Spent (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={logExpenseData.amount}
                  onChange={e => setLogExpenseData(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Date *</label>
                <input
                  type="date"
                  required
                  value={logExpenseData.date}
                  onChange={e => setLogExpenseData(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Grocery items, metro ticket"
                  value={logExpenseData.notes}
                  onChange={e => setLogExpenseData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Payment Method</label>
                <select
                  value={logExpenseData.payment_method}
                  onChange={e => setLogExpenseData(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="UPI">UPI (GPay, PhonePe)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsLogExpenseOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Log Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
