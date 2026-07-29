import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Pencil, Trash2, CheckCircle2, FileSpreadsheet,
  Shield, Sparkles, PieChart as PieChartIcon, Target, Search,
  Zap, Copy, AlertTriangle, X
} from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';

type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  category_type?: string;
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

type SalaryAllocItem = {
  category_id: number;
  category_name: string;
  category_group: string;
  amount: number;
  percentage: number;
};

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

// Helper: Group categories accurately into unified master sections
export const getCategoryGroup = (cat: Category): 'Expenses' | 'Savings' | 'Investments' | 'Debt' | 'Insurance' => {
  const type = (cat.type || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();

  if (type === 'debt' || name.includes('loan') || name.includes('debt') || name.includes('credit card') || name.includes('borrow')) {
    return 'Debt';
  }

  if (type === 'insurance' || name.includes('lic') || name.includes('insurance') || name.includes('policy')) {
    return 'Insurance';
  }

  if (type === 'investment' || name.includes('sip') || name.includes('gold') || name.includes('mutual') || name.includes('stock') || name.includes('ppf') || name.includes('nps')) {
    return 'Investments';
  }

  if (type === 'savings' || name.includes('fund') || name.includes('reserve') || name.includes('saving') || name.includes('deposit') || name.includes('advance')) {
    return 'Savings';
  }

  return 'Expenses';
};

export default function Budgets() {
  const now = new Date();
  
  // Filter & Navigation States
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'forecast' | 'ai'>('overview');
  const [filterCategoryGroup, setFilterCategoryGroup] = useState<string>('all');
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
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search state inside Configure Budget Modal
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Dynamic Salary Allocation State
  const [salaryIncome, setSalaryIncome] = useState<number>(74000);
  const [salaryAllocations, setSalaryAllocations] = useState<SalaryAllocItem[]>([]);
  
  // Batch Generate Budgets selection state
  const [batchSelections, setBatchSelections] = useState<Record<number, boolean>>({});

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

      const allCats: Category[] = catRes.data.filter((c: Category) => c.type !== 'income');
      setCategories(allCats);
      setBudgets(budgetsRes.data);
      setPlannerSummary(summaryRes.data);
      setAiRecs(recsRes.data || []);
      setGoals(goalsRes.data || []);

      // Parse dynamic salary allocations
      if (salaryRes.data) {
        const inc = Number(salaryRes.data.income_amount || 74000);
        setSalaryIncome(inc);

        let items: SalaryAllocItem[] = [];
        const rawAlloc = salaryRes.data.allocation_json;

        if (Array.isArray(rawAlloc)) {
          items = rawAlloc;
        } else if (rawAlloc && typeof rawAlloc === 'object') {
          const keyMap: Record<string, string> = {
            chit: 'Chit Contribution',
            lic: 'LIC Premium',
            mutual_funds: 'Mutual Funds SIP',
            gold: 'Digital Gold',
            essential_expenses: 'Essential Expenses',
            debt_repayment: 'Debt Repayment',
            emergency_reserve: 'Emergency Reserve',
            house_fund: 'Bangalore House Fund'
          };

          items = Object.entries(rawAlloc).map(([k, v]) => {
            const displayName = keyMap[k] || k;
            const matchCat = allCats.find(c => c.name.toLowerCase() === displayName.toLowerCase());
            const catId = matchCat ? matchCat.id : 0;
            const amt = Number(v) || 0;
            const grp = matchCat ? getCategoryGroup(matchCat) : 'Savings';
            return {
              category_id: catId,
              category_name: matchCat ? matchCat.name : displayName,
              category_group: grp,
              amount: amt,
              percentage: inc > 0 ? parseFloat(((amt / inc) * 100).toFixed(1)) : 0
            };
          }).filter(item => item.amount > 0 || item.category_id > 0);
        }

        if (items.length === 0 && allCats.length > 0) {
          const defaultCatNames = ['Food', 'Bills', 'Debt Repayment', 'LIC Premium', 'Mutual Funds SIP', 'Emergency Reserve', 'Bangalore House Fund'];
          items = defaultCatNames.map(name => {
            const matchCat = allCats.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
            if (!matchCat) return null;
            return {
              category_id: matchCat.id,
              category_name: matchCat.name,
              category_group: getCategoryGroup(matchCat),
              amount: 5000,
              percentage: inc > 0 ? parseFloat(((5000 / inc) * 100).toFixed(1)) : 0
            };
          }).filter(Boolean) as SalaryAllocItem[];
        }

        setSalaryAllocations(items);

        // Pre-select all allocation items for batch budget creation modal
        const initBatchSel: Record<number, boolean> = {};
        items.forEach(it => { if (it.category_id > 0) initBatchSel[it.category_id] = true; });
        setBatchSelections(initBatchSel);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetsAndData();
  }, [selectedMonth, selectedYear]);

  // Group categories into Expenses, Savings, Investments, Debt, Insurance
  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {
      Expenses: [],
      Savings: [],
      Investments: [],
      Debt: [],
      Insurance: []
    };

    categories.forEach(c => {
      if (categorySearchQuery.trim()) {
        if (!c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())) return;
      }
      const grp = getCategoryGroup(c);
      groups[grp].push(c);
    });

    return groups;
  }, [categories, categorySearchQuery]);

  const openAdd = () => {
    setEditingId(null);
    setErrorMessage('');
    setCategorySearchQuery('');
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
    setCategorySearchQuery('');
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

  // Dynamic Salary Allocation Handlers
  const handleAddSalaryAllocItem = (catId: number) => {
    const matchCat = categories.find(c => c.id === catId);
    if (!matchCat) return;
    if (salaryAllocations.some(a => a.category_id === catId)) {
      showToast(`${matchCat.name} is already in your allocation plan.`);
      return;
    }

    const defaultAmt = 5000;
    const pct = salaryIncome > 0 ? parseFloat(((defaultAmt / salaryIncome) * 100).toFixed(1)) : 0;
    const newItem: SalaryAllocItem = {
      category_id: matchCat.id,
      category_name: matchCat.name,
      category_group: getCategoryGroup(matchCat),
      amount: defaultAmt,
      percentage: pct
    };

    setSalaryAllocations(prev => [...prev, newItem]);
    setBatchSelections(prev => ({ ...prev, [catId]: true }));
  };

  const handleUpdateSalaryAllocAmount = (catId: number, newAmt: number) => {
    const validAmt = Math.max(0, newAmt);
    setSalaryAllocations(prev => prev.map(item => {
      if (item.category_id === catId) {
        const pct = salaryIncome > 0 ? parseFloat(((validAmt / salaryIncome) * 100).toFixed(1)) : 0;
        return { ...item, amount: validAmt, percentage: pct };
      }
      return item;
    }));
  };

  const handleRemoveSalaryAllocItem = (catId: number) => {
    setSalaryAllocations(prev => prev.filter(item => item.category_id !== catId));
  };

  const handleSaveSalaryAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/budgets/salary-allocation`, {
        month: selectedMonth,
        year: selectedYear,
        income_amount: salaryIncome,
        allocation_json: salaryAllocations
      });

      showToast('Dynamic Salary Allocation Plan saved successfully!');
      fetchBudgetsAndData();
    } catch (err) {
      showToast('Error saving salary allocation plan');
    }
  };

  const handleDuplicatePrevMonthPlan = async () => {
    try {
      const res = await axios.post(`${API}/budgets/salary-allocation/copy-prev`, {
        target_month: selectedMonth,
        target_year: selectedYear
      });
      showToast(`Duplicated allocation plan from ${res.data.duplicated_from}!`);
      fetchBudgetsAndData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'No plan found for previous month to copy.');
    }
  };

  // Convert Batch Selected Allocations to Category Budgets (Fix 6)
  const handleBatchGenerateBudgets = async () => {
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of salaryAllocations) {
      if (!batchSelections[item.category_id]) continue;
      const existingB = budgets.find(b => b.category_id === item.category_id);
      if (existingB) {
        await axios.put(`${API}/budgets/${existingB.id}`, {
          limit_amount: item.amount,
          rollover_enabled: existingB.rollover_enabled,
          rollover_amount: existingB.rollover_amount,
          linked_goal_id: existingB.linked_goal_id,
          priority: existingB.priority
        });
        updatedCount++;
      } else {
        await axios.post(`${API}/budgets`, {
          category_id: item.category_id,
          limit_amount: item.amount,
          month: selectedMonth,
          year: selectedYear,
          rollover_enabled: 0,
          rollover_amount: 0,
          priority: item.category_group === 'Expenses' ? 'essential' : 'important'
        });
        createdCount++;
      }
    }

    setIsBatchModalOpen(false);
    showToast(`Batch Generated: ${createdCount} created, ${updatedCount} updated!`);
    fetchBudgetsAndData();
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
    const headers = ['Category', 'Type Group', 'Planned Allocation', 'Base Limit', 'Rollover', 'Effective Limit', 'Spent', 'Remaining', 'Status', 'Forecast End', 'Linked Goal', 'Priority'];
    const rows = budgets.map(b => {
      const matchCat = categories.find(c => c.id === b.category_id);
      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
      const allocItem = salaryAllocations.find(a => a.category_id === b.category_id);
      return [
        b.category_name,
        grp,
        allocItem ? allocItem.amount : 0,
        b.limit_amount,
        b.rollover_amount || 0,
        b.effectiveLimit || b.limit_amount,
        b.spent,
        b.remaining,
        (b.spent > (b.effectiveLimit || b.limit_amount)) ? 'Over Budget' : 'On Track',
        b.forecastedEnd || 0,
        b.linked_goal_name || 'None',
        b.priority || 'essential'
      ];
    });

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

  // Salary allocation summary totals
  const totalAllocatedAmount = salaryAllocations.reduce((sum, item) => sum + item.amount, 0);
  const totalAllocatedPct = salaryIncome > 0 ? parseFloat(((totalAllocatedAmount / salaryIncome) * 100).toFixed(1)) : 0;
  const remainingUnallocatedIncome = salaryIncome - totalAllocatedAmount;
  const isOverAllocated = remainingUnallocatedIncome < 0;

  // Filtered Budgets List
  const filteredBudgets = budgets.filter(b => {
    const matchCat = categories.find(c => c.id === b.category_id);
    const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
    if (filterCategoryGroup !== 'all' && grp !== filterCategoryGroup) return false;
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
          <p className="text-xs text-slate-400 mt-0.5">Unified category master synchronization, dynamic salary allocation, predictive spend forecasting, and AI recommendations.</p>
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
          📊 Overview & Category Budgets (Execution)
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'salary' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          💵 Dynamic Salary Allocation Planner (Planning)
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
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Category Group:</span>
                    <select
                      value={filterCategoryGroup}
                      onChange={e => setFilterCategoryGroup(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Category Groups</option>
                      <option value="Expenses">🍽 Expenses</option>
                      <option value="Savings">💰 Savings</option>
                      <option value="Investments">📈 Investments</option>
                      <option value="Debt">💳 Debt</option>
                      <option value="Insurance">🛡 Insurance</option>
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
                      const matchCat = categories.find(c => c.id === b.category_id);
                      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
                      const allocItem = salaryAllocations.find(a => a.category_id === b.category_id);

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
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border bg-slate-900 text-slate-300 border-slate-800">
                                  {grp}
                                </span>
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

                          {/* Full Cycle Comparison: Allocation | Budget Limit | Spent | Remaining */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-2.5 rounded-2xl border border-slate-850/60 text-[10px]">
                            <div>
                              <span className="text-slate-500 font-bold uppercase">Salary Plan:</span>
                              <p className="font-mono text-purple-400 font-black">₹{allocItem ? allocItem.amount.toLocaleString('en-IN') : '0'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase">Budget Limit:</span>
                              <p className="font-mono text-white font-black">₹{effLimit.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase">Actual Spent:</span>
                              <p className="font-mono text-rose-400 font-black">₹{b.spent.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase">Remaining:</span>
                              <p className={`font-mono font-black ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ₹{(effLimit - b.spent).toLocaleString('en-IN')}
                              </p>
                            </div>
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
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${statusBadge}`}>
                                {statusText}
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

          {/* TAB 2: DYNAMIC SALARY ALLOCATION PLANNER */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="border-b border-slate-900 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black text-white flex items-center gap-2">
                      💵 Dynamic Salary Allocation Planner ({selectedMonthLabel} {selectedYear})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Category-driven salary allocation using your transaction category master list with real-time percentage calculations.</p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <Button onClick={handleDuplicatePrevMonthPlan} variant="ghost" className="border border-slate-800 text-slate-300 text-xs py-1.5 px-3">
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Duplicate Previous Month
                    </Button>

                    <Button onClick={() => setIsBatchModalOpen(true)} variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs py-1.5 px-3">
                      <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300" /> Generate Budgets from Allocation
                    </Button>

                    <select
                      onChange={e => {
                        if (e.target.value) {
                          handleAddSalaryAllocItem(Number(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="">+ Add Category to Allocation</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({getCategoryGroup(c)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LIVE SALARY SUMMARY BAR WITH OVER-ALLOCATED WARNING */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Monthly Income (₹)</label>
                    <input
                      type="number" min="0" required
                      value={salaryIncome}
                      onChange={e => setSalaryIncome(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-white font-mono font-bold text-sm focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Allocated Total</p>
                    <p className="text-sm font-black text-purple-400 font-mono">
                      ₹{totalAllocatedAmount.toLocaleString('en-IN')} <span className="text-xs font-normal">({totalAllocatedPct}%)</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Remaining Unallocated Income</p>
                    <p className={`text-sm font-black font-mono flex items-center gap-1.5 ${isOverAllocated ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOverAllocated && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      ₹{remainingUnallocatedIncome.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {isOverAllocated && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Warning: Total allocated amount exceeds your monthly salary income by ₹{Math.abs(remainingUnallocatedIncome).toLocaleString('en-IN')}. Consider reducing allocation amounts.</span>
                  </div>
                )}

                {/* DYNAMIC SALARY ALLOCATION TABLE */}
                <form onSubmit={handleSaveSalaryAllocation} className="space-y-6">
                  {salaryAllocations.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-850 rounded-2xl">
                      No categories added to salary allocation yet. Select a category from the dropdown above to begin planning.
                    </p>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 text-[10px] text-slate-500 font-black uppercase tracking-wider">
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Group</th>
                            <th className="py-2.5 px-3 text-right">Allocation Amount (₹)</th>
                            <th className="py-2.5 px-3 text-right">% of Income</th>
                            <th className="py-2.5 px-3 text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60 font-semibold">
                          {salaryAllocations.map(item => (
                            <tr key={item.category_id} className="hover:bg-slate-900/30 transition">
                              <td className="py-3 px-3 text-white font-extrabold">{item.category_name}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border bg-slate-900 text-slate-300 border-slate-800">
                                  {item.category_group}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <input
                                  type="number" min="0" step="any" required
                                  value={item.amount}
                                  onChange={e => handleUpdateSalaryAllocAmount(item.category_id, Number(e.target.value))}
                                  className="w-32 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-right text-white font-mono text-xs font-bold focus:ring-1 focus:ring-purple-500"
                                />
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-purple-400 font-extrabold">
                                {item.percentage}%
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSalaryAllocItem(item.category_id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs px-6 py-2">
                      Save Dynamic Salary Allocation Plan
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

      {/* GENERATE BUDGETS FROM ALLOCATION BATCH MODAL (Fix 6) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBatchModalOpen(false)} />
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" /> Generate Category Budgets from Allocation Plan
              </h3>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select which allocated categories to convert into active budget limits for {selectedMonthLabel} {selectedYear}:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar p-1">
              {salaryAllocations.map(item => {
                const existingB = budgets.find(b => b.category_id === item.category_id);
                return (
                  <label
                    key={item.category_id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-850 rounded-2xl cursor-pointer hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={!!batchSelections[item.category_id]}
                        onChange={e => setBatchSelections(s => ({ ...s, [item.category_id]: e.target.checked }))}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-white">{item.category_name}</p>
                        <p className="text-[10px] text-slate-500">{item.category_group}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-mono font-black text-purple-400">₹{item.amount.toLocaleString('en-IN')}</p>
                      <p className="text-[9px] text-slate-500">
                        {existingB ? `Update limit (current: ₹${existingB.limit_amount})` : 'Create new budget limit'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button onClick={() => setIsBatchModalOpen(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleBatchGenerateBudgets} variant="primary" className="bg-purple-600 hover:bg-purple-700 px-5 text-white">
                Generate Selected Budgets
              </Button>
            </div>
          </div>
        </div>
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

            {/* Category Search Input */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Search & Select Category *</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter category list..."
                  value={categorySearchQuery}
                  onChange={e => setCategorySearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500 mb-2"
                />
              </div>

              <select
                disabled={!!editingId}
                required
                value={formData.category_id}
                onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500 max-h-48"
              >
                <option value="">-- Select Category from Master List --</option>
                {Object.entries(groupedCategories).map(([groupName, cats]) => {
                  if (cats.length === 0) return null;
                  return (
                    <optgroup key={groupName} label={`-- ${groupName} --`}>
                      {cats.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
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
