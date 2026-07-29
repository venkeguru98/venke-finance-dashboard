import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, CheckCircle2, FileSpreadsheet,
  Shield, Sparkles, PieChart as PieChartIcon, Target
} from 'lucide-react';
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
  rollover_enabled?: number;
  rollover_amount?: number;
  linked_goal_id?: number | null;
  linked_goal_name?: string;
  priority?: 'essential' | 'important' | 'optional' | 'avoid';
  effectiveLimit?: number;
  remaining?: number;
  pctUsed?: number;
  forecastedEnd?: number;
  isForecastOver?: boolean;
  daysLeft?: number;
};

type Category = { id: number; name: string; color: string; type: string };
type Goal = { id: number; name: string; target_amount: number; current_saved: number };

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

const PRIORITY_BADGES = {
  essential: { label: 'Essential', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  important: { label: 'Important', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  optional:  { label: 'Optional', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  avoid:     { label: 'Avoid / Reduce', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export default function Budgets() {
  const now = new Date();
  
  // Filter & Navigation States
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'forecast' | 'ai'>('overview');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Data States
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plannerSummary, setPlannerSummary] = useState<any>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Salary Allocation Form State
  const [salaryAllocForm, setSalaryAllocForm] = useState({
    income_amount: '105000',
    chit: '25000',
    lic: '2430',
    mutual_funds: '5000',
    gold: '1000',
    essential_expenses: '30000',
    debt_repayment: '15000',
    emergency_reserve: '5000',
    house_fund: '21570'
  });

  // Budget Add/Edit Form State
  const [formData, setFormData] = useState({
    category_id: '',
    limit_amount: '',
    month: selectedMonth,
    year: selectedYear,
    rollover_enabled: false,
    rollover_amount: '0',
    linked_goal_id: '',
    priority: 'essential'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBudgetsAndData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, summaryRes, salaryRes, recsRes, goalsRes, catRes] = await Promise.all([
        axios.get(`${API}/budgets?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/planner-summary?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/salary-allocation?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/ai-recommendations`),
        axios.get(`${API}/goals`),
        axios.get(`${API}/categories`)
      ]);

      setBudgets(budgetsRes.data);
      setPlannerSummary(summaryRes.data);
      if (salaryRes.data && salaryRes.data.allocation_json) {
        setSalaryAllocForm({
          income_amount: String(salaryRes.data.income_amount || 105000),
          ...salaryRes.data.allocation_json
        });
      }
      setAiRecs(recsRes.data || []);
      setGoals(goalsRes.data || []);
      setCategories(catRes.data.filter((c: Category) => c.type === 'expense'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetsAndData();
  }, [selectedMonth, selectedYear]);

  const openAdd = () => {
    setEditingId(null);
    setErrorMessage('');
    setFormData({
      category_id: '',
      limit_amount: '',
      month: selectedMonth,
      year: selectedYear,
      rollover_enabled: false,
      rollover_amount: '0',
      linked_goal_id: '',
      priority: 'essential'
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
      year: b.year,
      rollover_enabled: Boolean(b.rollover_enabled),
      rollover_amount: String(b.rollover_amount || 0),
      linked_goal_id: b.linked_goal_id ? String(b.linked_goal_id) : '',
      priority: b.priority || 'essential'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this budget entry? Existing transaction history will not be changed.')) return;
    try {
      await axios.delete(`${API}/budgets/${id}`);
      fetchBudgetsAndData();
      showToast('Budget entry deleted successfully');
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
      const payload = {
        category_id: Number(formData.category_id),
        limit_amount: limit,
        month: formData.month,
        year: formData.year,
        rollover_enabled: formData.rollover_enabled ? 1 : 0,
        rollover_amount: Number(formData.rollover_amount || 0),
        linked_goal_id: formData.linked_goal_id ? Number(formData.linked_goal_id) : null,
        priority: formData.priority
      };

      if (editingId) {
        await axios.put(`${API}/budgets/${editingId}`, payload);
        showToast('Budget limit updated successfully');
      } else {
        await axios.post(`${API}/budgets`, payload);
        showToast('New budget configured successfully');
      }
      setIsModalOpen(false);
      fetchBudgetsAndData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to save budget entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSalaryAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const incomeAmt = Number(salaryAllocForm.income_amount || 0);
      const allocJson = {
        chit: salaryAllocForm.chit,
        lic: salaryAllocForm.lic,
        mutual_funds: salaryAllocForm.mutual_funds,
        gold: salaryAllocForm.gold,
        essential_expenses: salaryAllocForm.essential_expenses,
        debt_repayment: salaryAllocForm.debt_repayment,
        emergency_reserve: salaryAllocForm.emergency_reserve,
        house_fund: salaryAllocForm.house_fund
      };

      await axios.post(`${API}/budgets/salary-allocation`, {
        month: selectedMonth,
        year: selectedYear,
        income_amount: incomeAmt,
        allocation_json: allocJson
      });

      showToast('Salary allocation plan saved successfully!');
      fetchBudgetsAndData();
    } catch (err) {
      showToast('Error saving salary allocation plan');
    }
  };

  const handleApplyAiRec = async (rec: any) => {
    const targetB = budgets.find(b => b.category_name === rec.category_name);
    if (!targetB) return;
    try {
      await axios.put(`${API}/budgets/${targetB.id}`, {
        limit_amount: rec.recommended_limit,
        rollover_enabled: targetB.rollover_enabled,
        rollover_amount: targetB.rollover_amount,
        linked_goal_id: targetB.linked_goal_id,
        priority: targetB.priority
      });
      showToast(`Updated ${rec.category_name} budget limit to ₹${rec.recommended_limit.toLocaleString('en-IN')}`);
      fetchBudgetsAndData();
    } catch (err) {
      showToast('Failed to apply recommendation');
    }
  };

  const exportBudgetCSV = () => {
    const headers = ['Category', 'Base Limit', 'Rollover', 'Effective Limit', 'Spent', 'Remaining', 'Status', 'Forecast End', 'Linked Goal', 'Priority'];
    const rows = budgets.map(b => [
      b.category_name,
      b.limit_amount,
      b.rollover_amount || 0,
      b.effectiveLimit || b.limit_amount,
      b.spent,
      b.remaining,
      (b.spent > (b.effectiveLimit || b.limit_amount)) ? 'Over Budget' : 'On Track',
      b.forecastedEnd || 0,
      b.linked_goal_name || 'None',
      b.priority || 'essential'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Budget_Planner_${selectedYear}_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Budgets List
  const filteredBudgets = budgets.filter(b => {
    if (filterCategory !== 'all' && String(b.category_id) !== filterCategory) return false;
    if (filterPriority !== 'all' && (b.priority || 'essential') !== filterPriority) return false;
    return true;
  });

  const selectedMonthLabel = MONTHS_LIST.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="space-y-6">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-purple-500/40 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <PieChartIcon className="w-6 h-6 text-purple-400" /> Advanced Budget Planner & Forecasting
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Smart salary allocation, predictive month-end spend forecasting, rollover budgets, and AI recommendations.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-850 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
            >
              {MONTHS_LIST.map(m => <option key={m.value} value={m.value} className="bg-slate-900">{m.label}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
            >
              {YEARS_LIST.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
            </select>
          </div>

          <Button onClick={exportBudgetCSV} variant="ghost" className="border border-slate-800 text-slate-300 hover:text-white text-xs py-2">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-green-400" /> Export CSV
          </Button>

          <Button onClick={openAdd} variant="primary" className="text-xs font-bold py-2 bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1.5" /> Configure Budget
          </Button>
        </div>
      </div>

      {/* TOP TAB NAVIGATION */}
      <div className="flex border-b border-slate-900 gap-6 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'overview' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📊 Overview & Category Budgets
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'salary' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          💵 Salary Allocation Planner
        </button>
        <button
          onClick={() => setActiveTab('forecast')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'forecast' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📈 Predictive Spend Forecast
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ai' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Venke AI Advisor ({aiRecs.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm font-semibold">Loading budget planning intelligence...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & CATEGORY BUDGETS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* TOP SUMMARY CARDS GRID */}
              {plannerSummary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Actual Income</p>
                    <p className="text-base font-black text-white font-mono mt-1">₹{plannerSummary.actualIncome.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">Logged received</p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Planned Budget</p>
                    <p className="text-base font-black text-purple-400 font-mono mt-1">₹{plannerSummary.plannedExpenses.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">Configured limits</p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Actual Spent</p>
                    <p className="text-base font-black text-red-400 font-mono mt-1">₹{plannerSummary.actualExpenses.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">Categorized expenses</p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Budget Remaining</p>
                    <p className="text-base font-black text-emerald-400 font-mono mt-1">₹{plannerSummary.budgetRemaining.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">Unspent pool</p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Budget Saved</p>
                    <p className="text-base font-black text-blue-400 font-mono mt-1">₹{plannerSummary.budgetSaved.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">Under budget pool</p>
                  </div>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <p className="text-[9px] text-purple-400 font-black uppercase tracking-wider">Health Score</p>
                    <p className="text-base font-black text-white font-mono mt-1">{plannerSummary.healthScore} / 100</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                      {plannerSummary.healthScore >= 80 ? '🟢 Excellent' : plannerSummary.healthScore >= 60 ? '🟡 Good' : '🔴 Needs Attention'}
                    </p>
                  </div>
                </div>
              )}

              {/* SEGMENTED HEALTH PROGRESS BAR */}
              {plannerSummary && (
                <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" /> Overall Monthly Budget Utilization
                    </span>
                    <span className="font-mono text-slate-300">
                      ₹{plannerSummary.actualExpenses.toLocaleString('en-IN')} / ₹{(plannerSummary.plannedExpenses + plannerSummary.totalRollover).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Multi-zone color progress bar */}
                  {(() => {
                    const totalLimit = plannerSummary.plannedExpenses + plannerSummary.totalRollover;
                    const pct = totalLimit > 0 ? Math.min(100, (plannerSummary.actualExpenses / totalLimit) * 100) : 0;
                    let barColor = 'bg-emerald-500';
                    if (pct >= 100) barColor = 'bg-rose-500';
                    else if (pct >= 90) barColor = 'bg-orange-500';
                    else if (pct >= 70) barColor = 'bg-amber-500';

                    return (
                      <div className="space-y-1.5">
                        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden p-0.5">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                          <span>0%</span>
                          <span>70% (Healthy)</span>
                          <span>90% (Warning)</span>
                          <span>100% (Limit)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* FILTERS & CATEGORY CARDS */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Category Budgets ({filteredBudgets.length})
                  </h2>

                  <div className="flex items-center space-x-2">
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="essential">Essential</option>
                      <option value="important">Important</option>
                      <option value="optional">Optional</option>
                      <option value="avoid">Avoid / Reduce</option>
                    </select>
                  </div>
                </div>

                {filteredBudgets.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
                    <p className="text-slate-400 text-sm">No budget limits configured for {selectedMonthLabel} {selectedYear}.</p>
                    <Button onClick={openAdd} variant="primary" className="text-xs py-2 bg-purple-600 hover:bg-purple-700">
                      Configure Category Budget
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBudgets.map(b => {
                      const effLimit = b.effectiveLimit || b.limit_amount;
                      const pct = effLimit > 0 ? Math.min(100, (b.spent / effLimit) * 100) : 0;
                      const isOver = b.spent > effLimit;

                      let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      let statusText = 'On Track';
                      if (isOver) {
                        statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        statusText = 'Over Budget';
                      } else if (pct >= 90) {
                        statusBadge = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                        statusText = 'Critical (90%+)';
                      } else if (pct >= 70) {
                        statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        statusText = 'Warning (70%+)';
                      }

                      const priBadge = PRIORITY_BADGES[b.priority || 'essential'];

                      return (
                        <div
                          key={b.id}
                          className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-3xl space-y-3.5 dashboard-card-hover transition hover:border-purple-500/30 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.category_color }} />
                                <h3 className="font-extrabold text-white text-sm">{b.category_name}</h3>
                              </div>
                              <div className="mt-1 flex items-center space-x-1.5 flex-wrap gap-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${priBadge.color}`}>
                                  {priBadge.label}
                                </span>
                                {b.linked_goal_name && (
                                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border bg-purple-500/10 text-purple-400 border-purple-500/20 flex items-center gap-1">
                                    <Target className="w-2.5 h-2.5" /> {b.linked_goal_name}
                                  </span>
                                )}
                                {b.rollover_enabled === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                    🔄 +₹{(b.rollover_amount || 0).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button onClick={() => openEdit(b)} className="p-1 text-slate-500 hover:text-white transition">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(b.id)} className="p-1 text-slate-500 hover:text-rose-400 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Limit vs Spent Amount */}
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">Spent / Effective Limit</p>
                              <p className="text-base font-black text-white font-mono mt-0.5">
                                ₹{b.spent.toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-semibold">/ ₹{effLimit.toLocaleString('en-IN')}</span>
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${statusBadge}`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOver ? 'bg-rose-500' : pct >= 90 ? 'bg-orange-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                              <span>{pct.toFixed(0)}% used</span>
                              <span>
                                {isOver
                                  ? `Over by ₹${(b.spent - effLimit).toLocaleString('en-IN')}`
                                  : `Remaining: ₹${(effLimit - b.spent).toLocaleString('en-IN')}`}
                              </span>
                            </div>
                          </div>

                          {/* Forecast pill */}
                          <div className="pt-2 border-t border-slate-900/60 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-medium">Month-End Forecast:</span>
                            <span className={`font-mono font-black ${b.isForecastOver ? 'text-rose-400' : 'text-slate-300'}`}>
                              ₹{(b.forecastedEnd || 0).toLocaleString('en-IN')} {b.isForecastOver ? '⚠️' : '✅'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SALARY ALLOCATION PLANNER */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="border-b border-slate-900 pb-3">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    💵 Monthly Salary Allocation Plan ({selectedMonthLabel} {selectedYear})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Plan your income allocations across fixed commitments, investments, savings, essential expenses, and emergency reserves before spending.</p>
                </div>

                <form onSubmit={handleSaveSalaryAllocation} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Monthly Income (₹) *</label>
                      <input
                        type="number" required min="0"
                        value={salaryAllocForm.income_amount}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, income_amount: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono font-bold text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Chit Contribution (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.chit}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, chit: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">LIC Premium (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.lic}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, lic: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Mutual Funds SIP (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.mutual_funds}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, mutual_funds: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Digital Gold (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.gold}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, gold: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Essential Expenses (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.essential_expenses}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, essential_expenses: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Debt Repayment (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.debt_repayment}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, debt_repayment: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Emergency Reserve (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.emergency_reserve}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, emergency_reserve: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Bangalore House Fund (₹)</label>
                      <input
                        type="number" min="0"
                        value={salaryAllocForm.house_fund}
                        onChange={e => setSalaryAllocForm(f => ({ ...f, house_fund: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs px-6 py-2">
                      Save Salary Allocation Plan
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: PREDICTIVE SPEND FORECAST */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-4">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  📈 Month-End Predictive Spend Projection
                </h2>
                <p className="text-xs text-slate-400">Based on your daily spending velocity and category limits for {selectedMonthLabel} {selectedYear}.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {budgets.map(b => (
                    <div key={b.id} className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white text-xs">{b.category_name}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          b.isForecastOver ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {b.isForecastOver ? 'Over Forecast' : 'Within Limit'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end text-xs font-mono">
                        <span className="text-slate-400">Current Spend: ₹{b.spent.toLocaleString('en-IN')}</span>
                        <span className="text-purple-400 font-bold">Est. Final: ₹{(b.forecastedEnd || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VENKE AI ADVISOR */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Venke AI Budget Optimization Recommendations
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Automated intelligence analyzing your 6-month trailing averages to optimize category limits and free up savings for goals.</p>
                </div>

                {aiRecs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No limit adjustments recommended right now. Your budget limits align well with historical spending!</p>
                ) : (
                  <div className="space-y-3.5">
                    {aiRecs.map((rec, i) => (
                      <div key={i} className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-xs flex items-center gap-2">
                            {rec.category_name} ({rec.type === 'increase' ? 'Limit Increase Advised' : 'Limit Reduction Opportunity'})
                          </span>
                          <p className="text-xs text-slate-400">{rec.reason}</p>
                          <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-300 mt-1">
                            <span>Current: ₹{rec.current_limit.toLocaleString('en-IN')}</span>
                            <span>6-Mo Avg: ₹{rec.avg_spent.toLocaleString('en-IN')}</span>
                            <span className="text-purple-400">Suggested: ₹{rec.recommended_limit.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <Button onClick={() => handleApplyAiRec(rec)} variant="primary" className="text-xs py-1.5 px-4 bg-purple-600 hover:bg-purple-700 shrink-0">
                          Apply Recommendation
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CONFIGURE BUDGET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleSubmit} className="relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <h3 className="text-sm font-black text-white border-b border-slate-900 pb-2 uppercase tracking-wider">
              {editingId ? 'Edit Category Budget' : 'New Category Budget'}
            </h3>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">{errorMessage}</p>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Category *</label>
              <select
                disabled={!!editingId}
                required
                value={formData.category_id}
                onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
              >
                <option value="">-- Select Expense Category --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Monthly Limit (₹) *</label>
              <input
                type="number" required min="1" step="any"
                value={formData.limit_amount}
                onChange={e => setFormData(f => ({ ...f, limit_amount: e.target.value }))}
                placeholder="₹8,000"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-xs font-bold focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(f => ({ ...f, priority: e.target.value as any }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                >
                  <option value="essential">Essential</option>
                  <option value="important">Important</option>
                  <option value="optional">Optional</option>
                  <option value="avoid">Avoid / Reduce</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Link to Goal</label>
                <select
                  value={formData.linked_goal_id}
                  onChange={e => setFormData(f => ({ ...f, linked_goal_id: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- None --</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {/* Rollover controls */}
            <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-2xl space-y-2">
              <label className="flex items-center space-x-2 text-xs font-extrabold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rollover_enabled}
                  onChange={e => setFormData(f => ({ ...f, rollover_enabled: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>Enable Rollover Budgeting</span>
              </label>

              {formData.rollover_enabled && (
                <div className="space-y-1 pt-1">
                  <label className="block text-[9px] text-slate-500 font-bold uppercase">Unused Rollover Balance (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={formData.rollover_amount}
                    onChange={e => setFormData(f => ({ ...f, rollover_amount: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button onClick={() => setIsModalOpen(false)} variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 px-5 text-white">
                {isSubmitting ? 'Saving...' : 'Save Budget'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
