import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Pencil, Trash2, CheckCircle2, FileSpreadsheet,
  Sparkles, PieChart as PieChartIcon, Search,
  Zap, Copy, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  Lock, ShoppingBag, Calendar, X
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
  mode?: 'flexible' | 'strict' | 'rollover' | 'ignore';
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
  essential: { label: 'Essential ◆', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10' },
  important: { label: 'Important ◆', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-sm shadow-purple-500/10' },
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

// Helper: Identify non-negotiable fixed commitments
export const isFixedCommitment = (catName: string, grp: string): boolean => {
  const name = catName.toLowerCase();
  if (grp === 'Debt' || grp === 'Insurance') return true;
  if (name.includes('rent') || name.includes('lic') || name.includes('sip') || name.includes('chit') || name.includes('emi') || name.includes('loan') || name.includes('debt')) {
    return true;
  }
  return false;
};

// Helper: Refined Priority Order Sorting Score
export const getPriorityOrderScore = (b: Budget, grp: string, effLimit: number): number => {
  const isOver = b.spent > effLimit;
  const pct = effLimit > 0 ? (b.spent / effLimit) * 100 : 0;
  const isNearLimit = pct >= 90 && b.spent < effLimit;
  const isCompleted = b.spent === effLimit && effLimit > 0;
  const isNotStarted = b.spent === 0;

  if (isOver) return 1;
  if (isNearLimit) return 2;
  if (grp === 'Debt' || grp === 'Insurance') return 3;
  if (grp === 'Savings' || grp === 'Investments') return 4;
  if (isNotStarted) return 7;
  if (isCompleted) return 6;
  return 5; // On Track
};

export default function Budgets() {
  const now = new Date();
  
  // Filter & Navigation States
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'tracking' | 'plan' | 'ai'>('plan');
  const [filterCategoryGroup, setFilterCategoryGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'remaining' | 'pct' | 'spent' | 'name'>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable Rows State
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Data States
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plannerSummary, setPlannerSummary] = useState<any>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemainingModalOpen, setIsRemainingModalOpen] = useState(false);
  const [remainingSearchQuery, setRemainingSearchQuery] = useState('');
  const [remainingFilterGroup, setRemainingFilterGroup] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search state inside Configure Budget Modal
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Dynamic Salary Allocation State
  const [salaryIncome, setSalaryIncome] = useState<number>(74000);
  const [salaryAllocations, setSalaryAllocations] = useState<SalaryAllocItem[]>([]);

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

  const toggleRowExpanded = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchBudgetsAndData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, summaryRes, salaryRes, recsRes, goalsRes, catRes, txRes] = await Promise.all([
        axios.get(`${API}/budgets?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/planner-summary?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/salary-allocation?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/budgets/ai-recommendations`),
        axios.get(`${API}/goals`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/transactions`)
      ]);

      const allCats: Category[] = catRes.data.filter((c: Category) => c.type !== 'income');
      setCategories(allCats);
      setBudgets(budgetsRes.data);
      setPlannerSummary(summaryRes.data);
      setAiRecs(recsRes.data || []);
      setGoals(goalsRes.data || []);
      setTransactions(txRes.data || []);

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
            chit: 'Cheetu Savings',
            lic: 'LIC Premium',
            mutual_funds: 'Mutual Funds SIP',
            gold: 'Digital Gold',
            essential_expenses: 'Food',
            debt_repayment: 'Debts',
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
              percentage: inc > 0 ? parseFloat(((amt / inc) * 100).toFixed(1)) : 0,
              mode: 'flexible' as const
            };
          }).filter(item => item.amount > 0 || item.category_id > 0);
        }

        if (items.length === 0 && allCats.length > 0) {
          const defaultAllocations = [
            { name: 'Food', amount: 8000 },
            { name: 'Fuel', amount: 3000 },
            { name: 'Bills', amount: 5000 },
            { name: 'Electricity', amount: 2500 },
            { name: 'Debts', amount: 22000 },
            { name: 'Cheetu Savings', amount: 21285 },
            { name: 'Digital Gold', amount: 5000 },
            { name: 'Emergency Reserve', amount: 5000 }
          ];

          items = defaultAllocations.map(def => {
            const matchCat = allCats.find(c => c.name.toLowerCase().includes(def.name.toLowerCase()));
            if (!matchCat) return null;
            return {
              category_id: matchCat.id,
              category_name: matchCat.name,
              category_group: getCategoryGroup(matchCat),
              amount: def.amount,
              percentage: inc > 0 ? parseFloat(((def.amount / inc) * 100).toFixed(1)) : 0,
              mode: 'flexible' as const
            };
          }).filter(Boolean) as SalaryAllocItem[];
        }

        setSalaryAllocations(items);
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

  // Group categories for modal dropdown
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
      percentage: pct,
      mode: 'flexible' as const
    };

    setSalaryAllocations(prev => [...prev, newItem]);
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

  const handleUpdateSalaryAllocMode = (catId: number, mode: 'flexible' | 'strict' | 'rollover' | 'ignore') => {
    setSalaryAllocations(prev => prev.map(item => item.category_id === catId ? { ...item, mode } : item));
  };

  const handleRemoveSalaryAllocItem = (catId: number) => {
    setSalaryAllocations(prev => prev.filter(item => item.category_id !== catId));
  };

  // Atomic "Save Monthly Plan & Auto-Generate Budgets"
  const handleSaveMonthlyPlanAndGenerateBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/budgets/save-monthly-plan`, {
        month: selectedMonth,
        year: selectedYear,
        income_amount: salaryIncome,
        allocations: salaryAllocations
      });

      showToast(`Monthly Plan saved! ${res.data.count} budgets automatically updated.`);
      fetchBudgetsAndData();
      setActiveTab('tracking');
    } catch (err) {
      showToast('Error saving monthly plan');
    }
  };

  // AI Smart Category Suggestions (6-month trailing average spend)
  const handleApplyAiSmartSuggestions = async () => {
    try {
      const res = await axios.get(`${API}/budgets/category-suggestions`);
      const suggestionsList = res.data;

      setSalaryAllocations(prev => prev.map(item => {
        const sug = suggestionsList.find((s: any) => s.category_id === item.category_id);
        if (sug && sug.suggested_amount > 0) {
          const amt = Number(sug.suggested_amount);
          const pct = salaryIncome > 0 ? parseFloat(((amt / salaryIncome) * 100).toFixed(1)) : 0;
          return { ...item, amount: amt, percentage: pct };
        }
        return item;
      }));

      showToast('Applied AI 6-month trailing average spend suggestions!');
    } catch (err) {
      showToast('Error fetching AI suggestions');
    }
  };

  const handleDuplicatePrevMonthPlan = async () => {
    try {
      const res = await axios.post(`${API}/budgets/salary-allocation/copy-prev`, {
        target_month: selectedMonth,
        target_year: selectedYear
      });
      showToast(`Duplicated plan from ${res.data.duplicated_from}!`);
      fetchBudgetsAndData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'No plan found for previous month to copy.');
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
    const headers = ['Category', 'Type Group', 'Planned Amount', 'Base Limit', 'Rollover', 'Effective Limit', 'Actual Spent', 'Remaining', 'Status', 'Expected Completion', 'Priority'];
    const rows = budgets.map(b => {
      const matchCat = categories.find(c => c.id === b.category_id);
      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
      const allocItem = salaryAllocations.find(a => a.category_id === b.category_id);
      const effLimit = b.effectiveLimit || b.limit_amount;
      return [
        b.category_name,
        grp,
        allocItem ? allocItem.amount : 0,
        b.limit_amount,
        b.rollover_amount || 0,
        effLimit,
        b.spent,
        b.remaining,
        (b.spent > effLimit) ? 'Overspent' : (b.spent === effLimit ? 'Completed' : 'On Track'),
        b.forecastedEnd || 0,
        b.priority || 'essential'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monthly_Plan_${selectedYear}_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salary allocation summary totals
  const totalAllocatedAmount = salaryAllocations.reduce((sum, item) => sum + item.amount, 0);
  const totalAllocatedPct = salaryIncome > 0 ? parseFloat(((totalAllocatedAmount / salaryIncome) * 100).toFixed(1)) : 0;
  const remainingUnallocatedIncome = salaryIncome - totalAllocatedAmount;
  const isOverAllocated = remainingUnallocatedIncome < 0;

  // Breakdown by Targets
  const savingsTarget = salaryAllocations.filter(a => a.category_group === 'Savings').reduce((s, a) => s + a.amount, 0);
  const investmentTarget = salaryAllocations.filter(a => a.category_group === 'Investments').reduce((s, a) => s + a.amount, 0);
  const debtTarget = salaryAllocations.filter(a => a.category_group === 'Debt').reduce((s, a) => s + a.amount, 0);

  // Status counts for Today's Financial Status Overview
  const statusCounts = useMemo(() => {
    let completed = 0;
    let onTrack = 0;
    let nearLimit = 0;
    let overspent = 0;
    let notStarted = 0;

    budgets.forEach(b => {
      const effLimit = b.effectiveLimit || b.limit_amount;
      const pct = effLimit > 0 ? (b.spent / effLimit) * 100 : 0;
      if (b.spent === 0) notStarted++;
      else if (b.spent === effLimit) completed++;
      else if (b.spent > effLimit) overspent++;
      else if (pct >= 90) nearLimit++;
      else onTrack++;
    });

    return { completed, onTrack, nearLimit, overspent, notStarted };
  }, [budgets]);

  // Health Score status text & color
  const healthScore = plannerSummary?.healthScore || 85;
  let healthLabel = 'Excellent';
  let healthBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10';

  if (healthScore < 50) {
    healthLabel = 'Critical';
    healthBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/10';
  } else if (healthScore < 70) {
    healthLabel = 'Needs Attention';
    healthBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10';
  } else if (healthScore < 85) {
    healthLabel = 'Good';
    healthBadgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10';
  }

  // Filter & Sort Budgets for Vertical Priority Dashboard
  const processedBudgets = useMemo(() => {
    let list = budgets.filter(b => {
      const matchCat = categories.find(c => c.id === b.category_id);
      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
      const effLimit = b.effectiveLimit || b.limit_amount;
      const pct = effLimit > 0 ? (b.spent / effLimit) * 100 : 0;
      
      let status = 'ontrack';
      if (b.spent === 0) status = 'notstarted';
      else if (b.spent === effLimit) status = 'completed';
      else if (b.spent > effLimit) status = 'overspent';
      else if (pct >= 90) status = 'nearlimit';

      if (filterCategoryGroup !== 'all' && grp !== filterCategoryGroup) return false;
      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (filterPriority !== 'all' && (b.priority || 'essential') !== filterPriority) return false;
      if (searchQuery.trim() && !b.category_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      const matchCatA = categories.find(c => c.id === a.category_id);
      const matchCatB = categories.find(c => c.id === b.category_id);
      const grpA = matchCatA ? getCategoryGroup(matchCatA) : 'Expenses';
      const grpB = matchCatB ? getCategoryGroup(matchCatB) : 'Expenses';
      const effA = a.effectiveLimit || a.limit_amount;
      const effB = b.effectiveLimit || b.limit_amount;

      if (sortBy === 'priority') {
        const scoreA = getPriorityOrderScore(a, grpA, effA);
        const scoreB = getPriorityOrderScore(b, grpB, effB);
        return scoreA - scoreB;
      }
      if (sortBy === 'remaining') return (effB - b.spent) - (effA - a.spent);
      if (sortBy === 'pct') return (b.spent / (effA || 1)) - (a.spent / (effB || 1));
      if (sortBy === 'spent') return b.spent - a.spent;
      if (sortBy === 'name') return a.category_name.localeCompare(b.category_name);
      return 0;
    });

    return list;
  }, [budgets, categories, filterCategoryGroup, filterStatus, filterPriority, searchQuery, sortBy]);

  // Separate into Fixed Commitments & Debt vs Variable Expenses & Savings
  const fixedCommitmentBudgets = useMemo(() => {
    return processedBudgets.filter(b => {
      const matchCat = categories.find(c => c.id === b.category_id);
      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
      return isFixedCommitment(b.category_name, grp);
    });
  }, [processedBudgets, categories]);

  const variableBudgets = useMemo(() => {
    return processedBudgets.filter(b => {
      const matchCat = categories.find(c => c.id === b.category_id);
      const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
      return !isFixedCommitment(b.category_name, grp);
    });
  }, [processedBudgets, categories]);

  const selectedMonthLabel = MONTHS_LIST.find(m => m.value === selectedMonth)?.label || '';
  const overallCompletionPct = totalAllocatedAmount > 0 ? Math.min(100, Math.round(((plannerSummary?.actualExpenses || 0) / totalAllocatedAmount) * 100)) : 0;
  const remainingBudgetValue = totalAllocatedAmount - (plannerSummary?.actualExpenses || 0);

  // Monthly Pace Timeline Calculations
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
  const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const expectedPaceAmount = Math.round((totalAllocatedAmount / daysInMonth) * currentDay);
  const actualSpentTotal = plannerSummary?.actualExpenses || 0;
  const paceDifference = actualSpentTotal - expectedPaceAmount;
  const isAbovePace = paceDifference > 0;

  return (
    <div className="space-y-10 min-h-screen bg-[#050816] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-blue-900/10 text-white p-3 md:p-8">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B1228]/95 border border-purple-500/40 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION (GLASS TOOLBAR HERO) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-7 rounded-3xl shadow-2xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <PieChartIcon className="w-8 h-8 text-purple-400" /> Monthly Financial Planning & Execution
          </h1>
          <p className="text-xs text-slate-400 mt-1">Luxury fintech operating system — Plan once per month, track automatically from transactions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-[#050816] border border-[#1E2A4A] rounded-2xl p-1.5">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
            >
              {MONTHS_LIST.map(m => <option key={m.value} value={m.value} className="bg-[#0B1228]">{m.label}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
            >
              {YEARS_LIST.map(y => <option key={y} value={y} className="bg-[#0B1228]">{y}</option>)}
            </select>
          </div>

          <Button onClick={exportBudgetCSV} variant="ghost" className="border border-[#1E2A4A] text-slate-300 hover:text-white text-xs py-2.5 px-4 rounded-2xl">
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" /> Export CSV
          </Button>

          <Button onClick={openAdd} variant="ghost" className="text-xs border border-[#1E2A4A] text-slate-400 hover:text-white py-2.5 px-4 rounded-2xl">
            <Plus className="w-4 h-4 mr-1.5" /> Manual Override
          </Button>
        </div>
      </div>

      {/* TOP TAB NAVIGATION */}
      <div className="flex border-b border-[#1E2A4A]/60 gap-8 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('plan')}
          className={`pb-4 text-xs font-black uppercase tracking-wider transition duration-200 border-b-2 flex items-center gap-2 ${
            activeTab === 'plan' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>💵 1. Monthly Financial Plan</span>
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-lg text-[9px]">Plan Once</span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`pb-4 text-xs font-black uppercase tracking-wider transition duration-200 border-b-2 flex items-center gap-2 ${
            activeTab === 'tracking' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>📊 2. Budget Tracking (Actual vs Plan)</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px]">Command Center</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-4 text-xs font-black uppercase tracking-wider transition duration-200 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ai' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 3. Venke AI Advisor ({aiRecs.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 text-sm font-semibold">Loading luxury financial operating system...</div>
      ) : (
        <>
          {/* TAB 1: MONTHLY FINANCIAL PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-8">
              {/* PRIMARY PLANNING HEADER CARD */}
              <div className="bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-8 rounded-3xl space-y-6 shadow-2xl">
                <div className="border-b border-[#1E2A4A]/60 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      💵 Monthly Financial Plan — {selectedMonthLabel} {selectedYear}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Plan your income allocation once. Clicking "Save Monthly Plan" automatically generates your category budgets.</p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <Button onClick={handleApplyAiSmartSuggestions} variant="ghost" className="border border-[#1E2A4A] text-slate-300 text-xs py-2 px-3 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> AI Suggested Plan
                    </Button>

                    <Button onClick={handleDuplicatePrevMonthPlan} variant="ghost" className="border border-[#1E2A4A] text-slate-300 text-xs py-2 px-3 rounded-xl">
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Duplicate Previous Month
                    </Button>

                    <select
                      onChange={e => {
                        if (e.target.value) {
                          handleAddSalaryAllocItem(Number(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                    >
                      <option value="">+ Add Category to Plan</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({getCategoryGroup(c)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TARGET BREAKDOWN CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Income</p>
                    <input
                      type="number" min="0" required
                      value={salaryIncome}
                      onChange={e => setSalaryIncome(Number(e.target.value) || 0)}
                      className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-1 px-2 text-white font-mono font-black text-sm mt-1 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Planned Total</p>
                    <p className="text-base font-black text-purple-400 font-mono mt-1">₹{totalAllocatedAmount.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">{totalAllocatedPct}% of income</p>
                  </div>

                  <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining Unallocated</p>
                    <p className={`text-base font-black font-mono mt-1 ${isOverAllocated ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₹{remainingUnallocatedIncome.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">{isOverAllocated ? '⚠️ Over budget' : '✅ Balanced'}</p>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider">Savings Target</p>
                    <p className="text-base font-black text-white font-mono mt-1">₹{savingsTarget.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Reserve / Funds</p>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-wider">Investment Target</p>
                    <p className="text-base font-black text-white font-mono mt-1">₹{investmentTarget.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">SIP / Gold / Stocks</p>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <p className="text-[10px] text-amber-400 font-black uppercase tracking-wider">Debt Target</p>
                    <p className="text-base font-black text-white font-mono mt-1">₹{debtTarget.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Repayment pool</p>
                  </div>
                </div>

                {isOverAllocated && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Warning: Your planned allocation exceeds monthly income by ₹{Math.abs(remainingUnallocatedIncome).toLocaleString('en-IN')}. Adjust allocation amounts before saving.</span>
                  </div>
                )}

                {/* DYNAMIC ALLOCATION TABLE */}
                <form onSubmit={handleSaveMonthlyPlanAndGenerateBudgets} className="space-y-6">
                  {salaryAllocations.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-[#1E2A4A] rounded-2xl">
                      No categories added to monthly financial plan yet. Select a category from the dropdown above to begin planning.
                    </p>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1E2A4A] text-[10px] text-slate-400 font-black uppercase tracking-wider">
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Group</th>
                            <th className="py-3 px-4 text-right">Planned Amount (₹)</th>
                            <th className="py-3 px-4 text-right">% of Income</th>
                            <th className="py-3 px-4 text-center">Automation Mode</th>
                            <th className="py-3 px-4 text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2A4A]/60 font-semibold">
                          {salaryAllocations.map(item => (
                            <tr key={item.category_id} className="hover:bg-[#101935]/40 transition">
                              <td className="py-3.5 px-4 text-white font-extrabold">{item.category_name}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border bg-[#050816] text-slate-300 border-[#1E2A4A]">
                                  {item.category_group}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <input
                                  type="number" min="0" step="any" required
                                  value={item.amount}
                                  onChange={e => handleUpdateSalaryAllocAmount(item.category_id, Number(e.target.value))}
                                  className="w-32 bg-[#050816] border border-[#1E2A4A] rounded-xl py-1.5 px-3 text-right text-white font-mono text-xs font-bold focus:ring-1 focus:ring-purple-500"
                                />
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-extrabold">
                                {item.percentage}%
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <select
                                  value={item.mode || 'flexible'}
                                  onChange={e => handleUpdateSalaryAllocMode(item.category_id, e.target.value as any)}
                                  className="bg-[#050816] border border-[#1E2A4A] text-[10px] font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                                >
                                  <option value="flexible">Flexible</option>
                                  <option value="strict">Strict Limit</option>
                                  <option value="rollover">Rollover</option>
                                  <option value="ignore">Ignore</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSalaryAllocItem(item.category_id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* DESKTOP SAVE BUTTON */}
                  <div className="hidden md:flex justify-end pt-2">
                    <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs px-6 py-3 font-extrabold flex items-center gap-2 rounded-2xl shadow-xl shadow-purple-600/20">
                      <Zap className="w-4 h-4 text-amber-300" />
                      Save Monthly Plan & Auto-Generate Budgets
                    </Button>
                  </div>

                  {/* MOBILE STICKY ACTION BAR */}
                  <div className="md:hidden sticky bottom-0 left-0 right-0 z-40 bg-[#0B1228]/95 backdrop-blur-md border-t border-[#1E2A4A] p-4 flex items-center justify-between gap-3 shadow-2xl rounded-t-3xl -mx-7 -mb-7">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Remaining</p>
                      <p className={`text-sm font-black font-mono ${isOverAllocated ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{remainingUnallocatedIncome.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs py-2.5 px-5 font-extrabold flex items-center gap-2 min-h-[44px] rounded-xl">
                      <Zap className="w-4 h-4 text-amber-300" />
                      Save Plan
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET TRACKING VERTICAL PRIORITY DASHBOARD */}
          {activeTab === 'tracking' && (
            <div className="space-y-8">
              {/* UNIFIED STICKY COMMAND CENTER HEADER WHILE SCROLLING */}
              <div className="sticky top-0 z-30 bg-[#0B1228]/95 backdrop-blur-xl border-b border-[#1E2A4A]/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl -mt-4">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Budget</span>
                    <span className={`text-base font-black font-mono tracking-tight ${remainingBudgetValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{remainingBudgetValue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="border-l border-[#1E2A4A] pl-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completion</span>
                    <span className="text-sm font-mono font-black text-purple-400">{overallCompletionPct}%</span>
                  </div>

                  <div className="hidden sm:block border-l border-[#1E2A4A] pl-4">
                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-black ${healthBadgeColor}`}>
                      Health: {healthLabel} ({healthScore}/100)
                    </span>
                  </div>
                </div>

                {/* FILTERS & SEARCH INTEGRATED INTO STICKY BAR */}
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-white rounded-xl py-1.5 pl-8 pr-3 focus:outline-none"
                    />
                  </div>

                  <select
                    value={filterCategoryGroup}
                    onChange={e => setFilterCategoryGroup(e.target.value)}
                    className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Groups</option>
                    <option value="Expenses">🍽 Expenses</option>
                    <option value="Savings">💰 Savings</option>
                    <option value="Investments">📈 Investments</option>
                    <option value="Debt">💳 Debt</option>
                    <option value="Insurance">🛡 Insurance</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="overspent">Overspent</option>
                    <option value="nearlimit">Near Limit</option>
                    <option value="ontrack">On Track</option>
                    <option value="completed">Completed</option>
                    <option value="notstarted">Not Started</option>
                  </select>

                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Priorities</option>
                    <option value="essential">Essential</option>
                    <option value="important">Important</option>
                    <option value="optional">Optional</option>
                    <option value="avoid">Avoid / Reduce</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-purple-400 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="priority">Sort: Priority Order</option>
                    <option value="remaining">Sort: Remaining Amount</option>
                    <option value="pct">Sort: % Executed</option>
                    <option value="spent">Sort: Highest Spending</option>
                    <option value="name">Sort: Alphabetical</option>
                  </select>
                </div>
              </div>

              {/* SINGLE UNIFIED HERO ANALYTICS CARD WITH DOMINANT REMAINING BUDGET */}
              <div className="bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2A4A]/60 pb-4">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      📊 Monthly Financial Summary — {selectedMonthLabel} {selectedYear}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Single-surface execution tracking comparing planned allocations against actual spent from transactions.</p>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-extrabold flex items-center gap-2 self-start md:self-auto shadow-sm shadow-emerald-500/10">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> Live Transaction Sync Active
                  </span>
                </div>

                {plannerSummary && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* LEFT: SVG CIRCULAR COMPLETION RING */}
                    <div className="lg:col-span-3 flex items-center justify-center p-5 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-purple-500 transition-all duration-700 ease-out"
                            strokeDasharray={`${overallCompletionPct}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-black font-mono text-white">{overallCompletionPct}%</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Completed</span>
                        </div>
                      </div>
                    </div>

                    {/* CENTER: INCOME, PLANNED, SPENT */}
                    <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                      <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl hover:border-blue-500/40 transition-colors">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Income Received</p>
                        <p className="text-sm font-black text-white font-mono mt-1">₹{salaryIncome.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl hover:border-purple-500/40 transition-colors">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Planned Budget</p>
                        <p className="text-sm font-black text-purple-400 font-mono mt-1">₹{totalAllocatedAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl hover:border-rose-500/40 transition-colors">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Spent Amount on Budget</p>
                        <p className="text-sm font-black text-rose-400 font-mono mt-1">₹{plannerSummary.actualExpenses.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* RIGHT: INTERACTIVE REMAINING AMOUNT TO SPEND HERO CARD */}
                    <div 
                      onClick={() => setIsRemainingModalOpen(true)}
                      className="lg:col-span-4 p-6 bg-[#101935]/90 border border-[#1E2A4A]/60 hover:border-emerald-500/60 hover:bg-[#101935] cursor-pointer transition-all duration-200 rounded-2xl flex flex-col justify-between space-y-2.5 group relative overflow-hidden shadow-lg shadow-emerald-500/5"
                      title="Click to view category-wise remaining budget breakdown"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                          <span>Remaining Amount to Spend</span>
                          <span className="text-xs group-hover:scale-125 transition-transform">🔍</span>
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-black ${healthBadgeColor}`}>
                          Health: {healthLabel}
                        </span>
                      </div>
                      <p className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${remainingBudgetValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{remainingBudgetValue.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#1E2A4A]/60 text-[9px] font-bold">
                        <span className="text-emerald-400/90 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                          <span>Click for category-wise breakdown</span>
                          <span>→</span>
                        </span>
                        <span className="text-slate-400 font-mono">{budgets.filter(b => (b.remaining || 0) > 0).length} categories with remaining budget</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MONTHLY TIMELINE & PACE CARD */}
              <div className="bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2A4A]/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      {selectedMonthLabel} Spending Pace — Day {currentDay} of {daysInMonth}
                    </h3>
                  </div>

                  <span className={`text-xs font-mono font-extrabold ${isAbovePace ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isAbovePace ? `Above pace by ₹${paceDifference.toLocaleString('en-IN')} ⚠️` : `On Track (Under pace by ₹${Math.abs(paceDifference).toLocaleString('en-IN')}) ✅`}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full bg-[#050816] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((currentDay / daysInMonth) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                    <span>Expected Spending by Today: ₹{expectedPaceAmount.toLocaleString('en-IN')}</span>
                    <span>Actual Spent: ₹{actualSpentTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* TRANSLUCENT STATUS COMMAND BAR */}
              <div className="bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-4 rounded-3xl space-y-3 shadow-xl">
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider mr-2">Today's Status:</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                    Completed ✓ ({statusCounts.completed})
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    On Track ({statusCounts.onTrack})
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm shadow-orange-500/10">
                    Near Limit ⚠ ({statusCounts.nearLimit})
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/10">
                    Overspent ▲ ({statusCounts.overspent})
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                    Not Started ({statusCounts.notStarted})
                  </span>
                </div>
              </div>

              {/* VERTICAL PRIORITY DASHBOARD SECTIONS */}
              <div className="space-y-10">
                {/* SECTION 1: FIXED COMMITMENTS & DEBT */}
                {fixedCommitmentBudgets.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-[#0B1228]/80 p-5 rounded-2xl border border-[#1E2A4A]/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                          <Lock className="w-4 h-4 text-purple-400" /> 🔒 Fixed Commitments & Mandatory Debt ({fixedCommitmentBudgets.length})
                        </h3>
                        <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-400">
                          <span>Planned: ₹{fixedCommitmentBudgets.reduce((s, b) => s + (b.effectiveLimit || b.limit_amount), 0).toLocaleString('en-IN')}</span>
                          <span>Spent: ₹{fixedCommitmentBudgets.reduce((s, b) => s + b.spent, 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Group Level Progress Bar */}
                      <div className="h-1.5 w-full bg-[#050816] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (fixedCommitmentBudgets.reduce((s, b) => s + b.spent, 0) / (fixedCommitmentBudgets.reduce((s, b) => s + (b.effectiveLimit || b.limit_amount), 0) || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {fixedCommitmentBudgets.map(b => renderCategoryPriorityRow(b))}
                    </div>
                  </div>
                )}

                {/* SECTION 2: VARIABLE EXPENSES & SAVINGS */}
                {variableBudgets.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-[#0B1228]/80 p-5 rounded-2xl border border-[#1E2A4A]/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                          <ShoppingBag className="w-4 h-4 text-emerald-400" /> 🛒 Variable Expenses & Savings ({variableBudgets.length})
                        </h3>
                        <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-400">
                          <span>Planned: ₹{variableBudgets.reduce((s, b) => s + (b.effectiveLimit || b.limit_amount), 0).toLocaleString('en-IN')}</span>
                          <span>Spent: ₹{variableBudgets.reduce((s, b) => s + b.spent, 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Group Level Progress Bar */}
                      <div className="h-1.5 w-full bg-[#050816] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (variableBudgets.reduce((s, b) => s + b.spent, 0) / (variableBudgets.reduce((s, b) => s + (b.effectiveLimit || b.limit_amount), 0) || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {variableBudgets.map(b => renderCategoryPriorityRow(b))}
                    </div>
                  </div>
                )}

                {processedBudgets.length === 0 && (
                  <div className="bg-[#0B1228]/60 border border-[#1E2A4A]/50 rounded-3xl p-12 text-center space-y-4">
                    <p className="text-slate-400 text-sm font-semibold">No active budgets match your filters for {selectedMonthLabel} {selectedYear}.</p>
                    <Button onClick={() => setActiveTab('plan')} variant="primary" className="text-xs py-2.5 px-6 bg-purple-600 hover:bg-purple-700 rounded-xl">
                      Go to Monthly Financial Plan to Set Allocations
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VENKE AI ADVISOR */}
          {activeTab === 'ai' && (
            <div className="space-y-8">
              <div className="bg-[#0B1228]/80 backdrop-blur-xl border border-[#1E2A4A]/50 p-8 rounded-3xl space-y-6 shadow-2xl">
                <div className="border-b border-[#1E2A4A]/60 pb-4">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Venke AI Budget Optimization Recommendations
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Automated intelligence analyzing your 6-month trailing averages to optimize category limits and free up savings for goals.</p>
                </div>

                {aiRecs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No limit adjustments recommended right now. Your budget limits align well with historical spending!</p>
                ) : (
                  <div className="space-y-4">
                    {aiRecs.map((rec, i) => (
                      <div key={i} className="p-5 bg-[#101935]/70 border border-[#1E2A4A]/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-sm flex items-center gap-2">
                            {rec.category_name} ({rec.type === 'increase' ? 'Limit Increase Advised' : 'Limit Reduction Opportunity'})
                          </span>
                          <p className="text-xs text-slate-400">{rec.reason}</p>
                          <div className="flex items-center space-x-4 text-xs font-mono font-bold text-slate-300 mt-2">
                            <span>Current: ₹{rec.current_limit.toLocaleString('en-IN')}</span>
                            <span>6-Mo Avg: ₹{rec.avg_spent.toLocaleString('en-IN')}</span>
                            <span className="text-purple-400">Suggested: ₹{rec.recommended_limit.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <Button onClick={() => handleApplyAiRec(rec)} variant="primary" className="text-xs py-2 px-5 bg-purple-600 hover:bg-purple-700 shrink-0 rounded-xl">
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

      {/* MANUAL OVERRIDE BUDGET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleSubmit} className="relative bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-7 shadow-2xl w-full max-w-md space-y-4 text-white">
            <h3 className="text-sm font-black border-b border-[#1E2A4A] pb-3 uppercase tracking-wider">
              {editingId ? 'Edit Category Budget' : 'Manual Override Budget'}
            </h3>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">{errorMessage}</p>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Search & Select Category *</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter category list..."
                  value={categorySearchQuery}
                  onChange={e => setCategorySearchQuery(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-2 pl-9 pr-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500 mb-2"
                />
              </div>

              <select
                disabled={!!editingId}
                required
                value={formData.category_id}
                onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500 max-h-48"
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

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Monthly Limit (₹) *</label>
              <input
                type="number" required min="1" step="any"
                value={formData.limit_amount}
                onChange={e => setFormData(f => ({ ...f, limit_amount: e.target.value }))}
                placeholder="₹8,000"
                className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white font-mono text-xs font-bold focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(f => ({ ...f, priority: e.target.value as any }))}
                  className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                >
                  <option value="essential">Essential</option>
                  <option value="important">Important</option>
                  <option value="optional">Optional</option>
                  <option value="avoid">Avoid / Reduce</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Link to Goal</label>
                <select
                  value={formData.linked_goal_id}
                  onChange={e => setFormData(f => ({ ...f, linked_goal_id: e.target.value }))}
                  className="w-full bg-[#050816] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- None --</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {/* Rollover controls */}
            <div className="p-3 bg-[#050816] border border-[#1E2A4A] rounded-2xl space-y-2">
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
                  <label className="block text-[9px] text-slate-400 font-bold uppercase">Unused Rollover Balance (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={formData.rollover_amount}
                    onChange={e => setFormData(f => ({ ...f, rollover_amount: e.target.value }))}
                    className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-1.5 px-3 text-white font-mono text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button onClick={() => setIsModalOpen(false)} variant="ghost" className="text-slate-400">Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-white rounded-xl">
                {isSubmitting ? 'Saving...' : 'Save Budget'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── CATEGORY REMAINING BUDGET BREAKDOWN MODAL ────────────────────────────── */}
      {isRemainingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#081226] border border-[#1E2A4A] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* MODAL HEADER */}
            <div className="p-6 border-b border-[#1E2A4A] bg-[#050816] flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    Remaining Amount to Spend — Category Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedMonthLabel} {selectedYear} • {budgets.length} Budgeted Categories
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-[#0B1228] border border-[#1E2A4A] px-3.5 py-1.5 rounded-xl text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Remaining</span>
                  <span className={`text-base font-black font-mono ${remainingBudgetValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{remainingBudgetValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <button 
                  onClick={() => setIsRemainingModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL SEARCH & FILTERS BAR */}
            <div className="p-4 bg-[#0B1228]/90 border-b border-[#1E2A4A] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by category name..."
                  value={remainingSearchQuery}
                  onChange={e => setRemainingSearchQuery(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-white rounded-xl py-1.5 pl-8 pr-3 focus:outline-none"
                />
              </div>

              <select
                value={remainingFilterGroup}
                onChange={e => setRemainingFilterGroup(e.target.value)}
                className="bg-[#050816] border border-[#1E2A4A] text-xs font-bold text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Category Groups</option>
                <option value="Expenses">🍽 Expenses</option>
                <option value="Savings">💰 Savings</option>
                <option value="Investments">📈 Investments</option>
                <option value="Debt">💳 Debt</option>
                <option value="Insurance">🛡 Insurance</option>
              </select>
            </div>

            {/* MODAL CATEGORY LIST CONTENT */}
            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
              {(() => {
                const filteredBudgets = budgets.filter(b => {
                  const matchCat = categories.find(c => c.id === b.category_id);
                  const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
                  const matchesSearch = b.category_name.toLowerCase().includes(remainingSearchQuery.toLowerCase());
                  const matchesGroup = remainingFilterGroup === 'all' || grp === remainingFilterGroup;
                  return matchesSearch && matchesGroup;
                });

                if (filteredBudgets.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold">
                      No matching category remaining budgets found.
                    </div>
                  );
                }

                return filteredBudgets.map(b => {
                  const matchCat = categories.find(c => c.id === b.category_id);
                  const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';
                  const effLimit = b.effectiveLimit || b.limit_amount;
                  const remaining = effLimit - b.spent;
                  const pct = effLimit > 0 ? Math.min(100, (b.spent / effLimit) * 100) : 0;
                  const isOver = b.spent > effLimit;

                  return (
                    <div 
                      key={b.id} 
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isOver 
                          ? 'bg-rose-500/10 border-rose-500/30' 
                          : remaining === 0
                            ? 'bg-[#0B1228] border-[#1E2A4A]' 
                            : 'bg-[#0D1830] border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: b.category_color }} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-white text-sm">{b.category_name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-white/10 text-slate-300">
                              {grp}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Spent ₹{b.spent.toLocaleString('en-IN')} / ₹{effLimit.toLocaleString('en-IN')} planned
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 justify-between sm:justify-end shrink-0">
                        {/* PROGRESS BAR */}
                        <div className="w-28 space-y-1">
                          <div className="h-1.5 w-full bg-[#050816] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOver ? 'bg-rose-500' : 'bg-emerald-400'
                              }`} 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                          <p className="text-[9px] font-mono font-bold text-slate-400 text-right">{pct.toFixed(0)}% spent</p>
                        </div>

                        {/* CATEGORY REMAINING AMOUNT */}
                        <div className="text-right min-w-[110px]">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Remaining</span>
                          <span className={`text-base font-black font-mono ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {remaining >= 0 ? `₹${remaining.toLocaleString('en-IN')}` : `-₹${Math.abs(remaining).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-[#1E2A4A] bg-[#050816] flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-400 font-semibold">
                Tip: Remaining budget automatically syncs with your live transaction entries.
              </span>
              <Button 
                onClick={() => setIsRemainingModalOpen(false)} 
                variant="ghost" 
                className="px-5 py-2 text-xs font-bold border border-[#1E2A4A] text-white hover:bg-white/10 rounded-xl"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  // Helper render function for financial tile with 4px left priority accent strip & remaining amount as primary metric
  function renderCategoryPriorityRow(b: Budget) {
    const effLimit = b.effectiveLimit || b.limit_amount;
    const pct = effLimit > 0 ? Math.min(100, (b.spent / effLimit) * 100) : 0;
    const isOver = b.spent > effLimit;
    const isCompleted = b.spent === effLimit && effLimit > 0;
    const isNotStarted = b.spent === 0;
    const isExpanded = !!expandedRows[b.id];

    let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10';
    let statusText = 'On Track';
    let barColor = 'bg-emerald-500';
    let stripColor = 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]';

    const matchCat = categories.find(c => c.id === b.category_id);
    const grp = matchCat ? getCategoryGroup(matchCat) : 'Expenses';

    if (isNotStarted) {
      statusBadge = 'bg-slate-800/80 text-slate-400 border-slate-700';
      statusText = 'Not Started';
      barColor = 'bg-slate-700';
      stripColor = 'bg-slate-700';
    } else if (isCompleted) {
      statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10';
      statusText = 'Completed ✓';
      barColor = 'bg-emerald-500';
      stripColor = 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]';
    } else if (isOver) {
      statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/10';
      statusText = 'Overspent ▲';
      barColor = 'bg-rose-500';
      stripColor = 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]';
    } else if (pct >= 90) {
      statusBadge = 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-sm shadow-orange-500/10';
      statusText = 'Near Limit ⚠';
      barColor = 'bg-orange-500';
      stripColor = 'bg-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
    } else if (grp === 'Savings') {
      barColor = 'bg-blue-500';
      stripColor = 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]';
    } else if (grp === 'Investments') {
      barColor = 'bg-purple-500';
      stripColor = 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]';
    }

    const priBadge = PRIORITY_BADGES[b.priority || 'essential'];
    const allocItem = salaryAllocations.find(a => a.category_id === b.category_id);
    const remainingAmount = effLimit - b.spent;

    // Filter recent monthly transactions for this category
    const catTransactions = transactions.filter(t => {
      if (t.category_id !== b.category_id) return false;
      if (!t.date) return false;
      const d = new Date(t.date);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    }).slice(0, 5);

    return (
      <div
        key={b.id}
        className="bg-[#101935]/70 hover:bg-[#162248] border border-[#1E2A4A]/50 rounded-2xl overflow-hidden transition-all duration-220 hover:-translate-y-0.5 hover:shadow-2xl relative flex"
      >
        {/* 4PX LEFT PRIORITY ACCENT STRIP WITH GLOW */}
        <div className={`w-1 shrink-0 ${stripColor}`} />

        <div className="flex-1">
          {/* MAIN HORIZONTAL FINANCIAL TILE */}
          <div
            onClick={() => toggleRowExpanded(b.id)}
            className="p-5 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
          >
            <div className="flex items-center space-x-3.5">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: b.category_color }} />
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                  <h4 className="font-extrabold text-white text-base tracking-tight">{b.category_name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusBadge}`}>
                    {statusText}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${priBadge.color}`}>
                    {priBadge.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {isCompleted ? 'Budget completed ✅' : isOver ? `Exceeded by ₹${(b.spent - effLimit).toLocaleString('en-IN')} ⚠️` : isNotStarted ? `No transactions yet • ₹${effLimit.toLocaleString('en-IN')} available` : `Expected Completion: ₹${(b.forecastedEnd || 0).toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6 shrink-0">
              {/* PRIMARY VISUAL METRIC: REMAINING AMOUNT */}
              <div className="text-right">
                <p className={`text-xl font-black font-mono tracking-tight ${remainingAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {remainingAmount >= 0 ? `₹${remainingAmount.toLocaleString('en-IN')}` : `-₹${Math.abs(remainingAmount).toLocaleString('en-IN')}`}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1.5">remaining</span>
                </p>
                <p className="text-xs font-mono font-semibold text-slate-400 mt-0.5">
                  Spent ₹{b.spent.toLocaleString('en-IN')} / ₹{effLimit.toLocaleString('en-IN')}
                </p>
              </div>

              {/* 6PX PREMIUM GRADIENT PROGRESS BAR */}
              <div className="w-28 space-y-1 hidden sm:block">
                <div className="h-1.5 w-full bg-[#050816] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] font-mono font-extrabold text-slate-400 text-right">{pct.toFixed(0)}%</p>
              </div>

              {/* EXPAND TOGGLE BUTTON */}
              <button className="p-1.5 text-slate-400 hover:text-white transition">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* EXPANDED INLINE DETAILS & ACTIONS (220ms EASE-OUT TRANSITION) */}
          {isExpanded && (
            <div className="p-6 bg-[#0B1228]/90 border-t border-[#1E2A4A]/60 space-y-4 animate-in fade-in slide-in-from-top-1 duration-220">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-[#050816]/80 p-4 rounded-2xl border border-[#1E2A4A]/50">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Planned Allocation</span>
                  <p className="font-mono font-black text-purple-400 text-sm mt-0.5">₹{allocItem ? allocItem.amount.toLocaleString('en-IN') : effLimit.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Actual Spent</span>
                  <p className="font-mono font-black text-white text-sm mt-0.5">₹{b.spent.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Remaining Budget</span>
                  <p className={`font-mono font-black text-sm mt-0.5 ${remainingAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{remainingAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Automation Mode</span>
                  <p className="font-mono font-extrabold text-slate-300 uppercase text-[10px] mt-1">{allocItem?.mode || 'flexible'}</p>
                </div>
              </div>

              {/* RECENT TRANSACTIONS FOR THIS MONTH */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Monthly Transactions ({catTransactions.length})</span>
                </h5>

                {catTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-[#050816]/50 rounded-xl border border-[#1E2A4A]/40">No transactions recorded for {b.category_name} in {selectedMonthLabel} {selectedYear}.</p>
                ) : (
                  <div className="space-y-2">
                    {catTransactions.map((t: any) => (
                      <div key={t.id} className="p-3.5 bg-[#050816]/70 border border-[#1E2A4A]/50 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-white text-xs">{t.notes || t.category_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t.date} • {t.payment_method}</p>
                        </div>
                        <span className="font-mono font-black text-rose-400 text-sm">₹{Number(t.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FOCUSED QUICK ACTIONS */}
              <div className="flex items-center space-x-3 pt-3 border-t border-[#1E2A4A]/60 justify-end">
                <Button onClick={() => openEdit(b)} variant="ghost" className="text-xs py-1.5 px-4 border border-[#1E2A4A] text-slate-300 hover:text-white rounded-xl">
                  <Pencil className="w-3.5 h-3.5 mr-1 text-purple-400" /> Edit Plan
                </Button>
                <Button onClick={() => handleDelete(b.id)} variant="ghost" className="text-xs py-1.5 px-4 border border-[#1E2A4A] text-rose-400 hover:text-rose-300 rounded-xl">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

