import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Plus, Search, RefreshCw, Calendar, Flame, LayoutGrid, CheckCircle2, Target, AlertTriangle, TrendingUp, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#F97316'];

// Default widget visibility states
const DEFAULT_WIDGETS = {
  summaryCards: true,
  financialInsights: true,
  quickActions: true,
  healthScore: true,
  cashFlow: true,
  budgetWatch: true,
  recentTransactions: true,
  goalsWidget: true,
  breakdownWidget: true,
  heatmapWidget: true,
  forecastWidget: true,
  kpiWidget: true,
  momWidget: true
};

export default function Dashboard() {
  const now = new Date();
  const navigate = useNavigate();
  
  // Data States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customization State
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Carousel Refs & Drag Interaction Handlers
  const insightsScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingInsights, setIsDraggingInsights] = useState(false);
  const insightsStartX = useRef(0);
  const insightsScrollLeft = useRef(0);

  const handleInsightsMouseDown = (e: React.MouseEvent) => {
    if (!insightsScrollRef.current) return;
    setIsDraggingInsights(true);
    insightsStartX.current = e.pageX - insightsScrollRef.current.offsetLeft;
    insightsScrollLeft.current = insightsScrollRef.current.scrollLeft;
  };

  const handleInsightsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingInsights || !insightsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - insightsScrollRef.current.offsetLeft;
    const walk = (x - insightsStartX.current) * 1.5;
    insightsScrollRef.current.scrollLeft = insightsScrollLeft.current - walk;
  };

  const handleInsightsMouseUpOrLeave = () => {
    setIsDraggingInsights(false);
  };

  const scrollInsights = (direction: 'left' | 'right') => {
    if (!insightsScrollRef.current) return;
    const scrollAmount = 305;
    insightsScrollRef.current.scrollTo({
      left: insightsScrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
      behavior: 'smooth'
    });
  };

  // Drawer States
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerPaymentMethod, setDrawerPaymentMethod] = useState('All');
  const [drawerDateStart, setDrawerDateStart] = useState('');
  const [drawerDateEnd, setDrawerDateEnd] = useState('');
  const [drawerMinAmount, setDrawerMinAmount] = useState('');
  const [drawerMaxAmount, setDrawerMaxAmount] = useState('');
  const [drawerSortBy, setDrawerSortBy] = useState<'newest' | 'oldest' | 'high' | 'low'>('newest');
  const [collapsedMonths, setCollapsedMonths] = useState<string[]>([]);

  // KPI Hover Preview Panel State
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mobileSheetCard, setMobileSheetCard] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawer resets & defaults
  useEffect(() => {
    if (selectedInsight) {
      setDrawerSearch('');
      setDrawerPaymentMethod('All');
      setDrawerDateStart('');
      setDrawerDateEnd('');
      setDrawerMinAmount('');
      setDrawerMaxAmount('');
      setDrawerSortBy('newest');

      // Pre-collapse older months
      const catTx = transactions.filter(t => t.category_id === selectedInsight.id);
      const uniqueMonths = Array.from(new Set(catTx.map(t => t.date.slice(0, 7)))).sort().reverse();
      const currentMonthPrefix = new Date().toISOString().slice(0, 7);
      const toCollapse = uniqueMonths.filter(m => m !== currentMonthPrefix);
      setCollapsedMonths(toCollapse);
    }
  }, [selectedInsight, transactions]);

  // Drawer Category Cycling Navigation
  const handlePrevCategory = () => {
    const list = getTrendInsights();
    const idx = list.findIndex(i => i.id === selectedInsight.id);
    if (idx > 0) {
      setSelectedInsight(list[idx - 1]);
    } else {
      setSelectedInsight(list[list.length - 1]);
    }
  };

  const handleNextCategory = () => {
    const list = getTrendInsights();
    const idx = list.findIndex(i => i.id === selectedInsight.id);
    if (idx < list.length - 1) {
      setSelectedInsight(list[idx + 1]);
    } else {
      setSelectedInsight(list[0]);
    }
  };

  // Drawer Transaction Exporting
  const handleExportCSV = (txList: any[], catName: string) => {
    const headers = ['Date', 'Description', 'Amount', 'Payment Method', 'Category'];
    const rows = txList.map(t => [
      t.date,
      t.notes || '',
      t.amount,
      t.payment_method || '',
      catName
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${catName.replace(/\s+/g, '_')}_Transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic inside Drawer
  const getFilteredTransactions = () => {
    if (!selectedInsight) return [];
    let list = transactions.filter(t => t.category_id === selectedInsight.id);

    if (drawerSearch.trim()) {
      const q = drawerSearch.toLowerCase();
      list = list.filter(t => (t.notes || '').toLowerCase().includes(q) || (t.tags || '').toLowerCase().includes(q));
    }

    if (drawerPaymentMethod !== 'All') {
      list = list.filter(t => t.payment_method === drawerPaymentMethod);
    }

    if (drawerDateStart) {
      list = list.filter(t => t.date >= drawerDateStart);
    }
    if (drawerDateEnd) {
      list = list.filter(t => t.date <= drawerDateEnd);
    }

    if (drawerMinAmount) {
      list = list.filter(t => t.amount >= Number(drawerMinAmount));
    }
    if (drawerMaxAmount) {
      list = list.filter(t => t.amount <= Number(drawerMaxAmount));
    }

    if (drawerSortBy === 'newest') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (drawerSortBy === 'oldest') {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (drawerSortBy === 'high') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (drawerSortBy === 'low') {
      list.sort((a, b) => a.amount - b.amount);
    }

    return list;
  };

  // Grouped Collapsible list constructor
  const getGroupedTransactions = (list: any[]) => {
    const groups: { [key: string]: any[] } = {};
    list.forEach(t => {
      const monthPrefix = t.date.slice(0, 7);
      if (!groups[monthPrefix]) {
        groups[monthPrefix] = [];
      }
      groups[monthPrefix].push(t);
    });

    return Object.keys(groups).sort().reverse().map(key => {
      const txs = groups[key];
      const total = txs.reduce((sum, t) => sum + t.amount, 0);
      const avg = total / txs.length;
      const amounts = txs.map(t => t.amount);
      const max = Math.max(...amounts);
      const min = Math.min(...amounts);
      
      const dObj = new Date(key + '-02');
      const label = dObj.toLocaleString('default', { month: 'long', year: 'numeric' });

      return {
        key,
        label,
        txs,
        total,
        avg,
        max,
        min
      };
    });
  };



  // Modals inside Dashboard for Quick Actions
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txFormType, setTxFormType] = useState<'income' | 'expense'>('expense');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [txFormData, setTxFormData] = useState({
    amount: '',
    notes: '',
    category_id: '',
    payment_method: 'UPI',
    date: now.toISOString().slice(0, 10)
  });

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [chartsRes, txRes, budgetsRes, goalsRes, categoriesRes, rulesRes] = await Promise.all([
        axios.get(`${API}/analytics/charts`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/budgets`),
        axios.get(`${API}/goals`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/recurring-rules`)
      ]);
      setMonthlyData(chartsRes.data.monthly || []);
      setCategoryData(chartsRes.data.categories || []);
      setTransactions(txRes.data || []);
      setBudgets(budgetsRes.data || []);
      setGoals(goalsRes.data || []);
      setCategories(categoriesRes.data || []);
      setRules(rulesRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: any) {
      // 401 errors are handled by the Axios interceptor (auto-redirects to login)
      if (e?.response?.status === 401) return;
      console.error('[Dashboard fetchAll error]', e);
      const serverErr = e.response?.data?.error || e.message || 'Could not connect to the server.';
      setError(serverErr);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => { fetchAll(); }, []);

  const saveLayout = (newWidgets: typeof widgets) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard_widgets', JSON.stringify(newWidgets));
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txFormData.amount || Number(txFormData.amount) <= 0) return;
    try {
      await axios.post(`${API}/transactions`, {
        date: txFormData.date,
        amount: Number(txFormData.amount),
        type: txFormType,
        category_id: Number(txFormData.category_id),
        payment_method: txFormData.payment_method,
        notes: txFormData.notes || `${txFormType} Transaction`
      });
      setIsAddTxOpen(false);
      setTxFormData({ amount: '', notes: '', category_id: '', payment_method: 'UPI', date: now.toISOString().slice(0, 10) });
      fetchAll();
    } catch (_) {
      alert('Failed to add transaction.');
    }
  };

  // Get greeting message
  const getGreeting = () => {
    const hours = now.getHours();
    if (hours < 12) return 'Good Morning, Venke 👋';
    if (hours < 17) return 'Good Afternoon, Venke 👋';
    return 'Good Evening, Venke 👋';
  };

  // Previous Month & Current Month Calculations
  const getTotalsByPeriod = () => {
    const currMonthPrefix = now.toISOString().slice(0, 7);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonth.toISOString().slice(0, 7);

    const currMonthTx = transactions.filter(t => t.date.startsWith(currMonthPrefix));
    const prevMonthTx = transactions.filter(t => t.date.startsWith(prevMonthPrefix));

    const calculateTotals = (list: any[]) => {
      const inc = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const sav = list.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);
      return { income: inc, expenses: exp, savings: sav, balance: inc - exp - sav };
    };

    const current = calculateTotals(currMonthTx);
    const previous = calculateTotals(prevMonthTx);

    const calcPctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      current,
      previous,
      pctChange: {
        income: calcPctChange(current.income, previous.income),
        expenses: calcPctChange(current.expenses, previous.expenses),
        savings: calcPctChange(current.savings, previous.savings),
        balance: calcPctChange(current.balance, previous.balance),
        savingsRate: previous.income > 0 ? (current.income > 0 ? calcPctChange(
          (current.balance / current.income) * 100,
          (previous.balance / previous.income) * 100
        ) : 0) : 0
      }
    };
  };

  const totalsData = getTotalsByPeriod();
  const savingsRate = totalsData.current.income > 0 ? (totalsData.current.balance / totalsData.current.income) * 100 : 0;


  // Available Balance calculations
  const availableBalance = totalsData.current.balance;
  const availableBalancePctOfIncome = totalsData.current.income > 0 ? (availableBalance / totalsData.current.income) * 100 : 0;

  // Recurring bills due this month that are not yet paid
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const unpaidBillsSum = rules
    .filter(r => {
      const isDueThisMonth = r.next_date.startsWith(currentMonthStr);
      const wasPaidThisMonth = r.last_triggered && r.last_triggered.startsWith(currentMonthStr);
      return isDueThisMonth && !wasPaidThisMonth;
    })
    .reduce((sum, r) => sum + r.amount, 0);

  const forecastedBalance = availableBalance - unpaidBillsSum;
  
  let availableColor = 'text-green-500';
  let availableBg = 'bg-green-500';
  let statusBadgeBg = 'bg-green-100 dark:bg-green-950/40';
  let statusBadgeText = 'text-green-700 dark:text-green-400';
  
  if (availableBalance < 0) {
    availableColor = 'text-red-500';
    availableBg = 'bg-red-500';
    statusBadgeBg = 'bg-red-100 dark:bg-red-950/40';
    statusBadgeText = 'text-red-700 dark:text-red-400';
  } else if (availableBalancePctOfIncome < 20 || availableBalance < 5000) {
    availableColor = 'text-yellow-500';
    availableBg = 'bg-yellow-500';
    statusBadgeBg = 'bg-yellow-100 dark:bg-yellow-950/40';
    statusBadgeText = 'text-yellow-700 dark:text-yellow-400';
  }

  // KPI Hover helpers
  const currentMonthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleCardMouseEnter = (key: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredCard(key);
  };

  const handleCardMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredCard(null), 180);
  };

  const handlePanelMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handlePanelMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredCard(null), 180);
  };

  // Compute per-card preview data from already-loaded transactions
  const getKpiPreviewData = (cardKey: string) => {
    const prefix = now.toISOString().slice(0, 7);
    const currTx = transactions.filter(t => t.date.startsWith(prefix));

    if (cardKey === 'income') {
      const list = currTx.filter(t => t.type === 'income').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const total = list.reduce((s, t) => s + t.amount, 0);
      const largest = list.reduce((m, t) => t.amount > m ? t.amount : m, 0);
      const latestDate = list[0]?.date ? new Date(list[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
      return { total, count: list.length, largest, latestDate, recentTx: list.slice(0, 5) };
    }
    if (cardKey === 'expenses') {
      const list = currTx.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const total = list.reduce((s, t) => s + t.amount, 0);
      const largest = list.reduce((m, t) => t.amount > m ? t.amount : m, 0);
      const avg = list.length > 0 ? total / list.length : 0;
      const methods: Record<string, number> = {};
      list.forEach(t => { methods[t.payment_method || 'Other'] = (methods[t.payment_method || 'Other'] || 0) + 1; });
      const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      const highestDay = list.length > 0 ? new Date([...list].sort((a, b) => b.amount - a.amount)[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
      return { total, count: list.length, largest, avg, topMethod, highestDay, recentTx: list.slice(0, 5) };
    }
    if (cardKey === 'savings') {
      const list = currTx.filter(t => t.type === 'savings').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const total = list.reduce((s, t) => s + t.amount, 0);
      // Group by category
      const catMap: Record<string, number> = {};
      list.forEach(t => { catMap[t.category_name || 'Other'] = (catMap[t.category_name || 'Other'] || 0) + t.amount; });
      const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      return { total, count: list.length, cats, recentTx: list.slice(0, 5) };
    }
    if (cardKey === 'balance') {
      const recent = [...currTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
      return {
        income: totalsData.current.income,
        expenses: totalsData.current.expenses,
        savings: totalsData.current.savings,
        balance: totalsData.current.balance,
        recentTx: recent
      };
    }
    if (cardKey === 'netbalance') {
      // 6-month net balance trend
      const trend: { month: string; net: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const p = d.toISOString().slice(0, 7);
        const mx = transactions.filter(t => t.date.startsWith(p));
        const inc = mx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = mx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const sav = mx.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);
        trend.push({ month: d.toLocaleString('default', { month: 'short' }), net: inc - exp - sav });
      }
      return {
        income: totalsData.current.income,
        expenses: totalsData.current.expenses,
        savings: totalsData.current.savings,
        balance: totalsData.current.balance,
        trend
      };
    }
    return null;
  };

  // Sparklines Data helper
  const getSparklineData = (type: 'income' | 'expense' | 'balance' | 'savings') => {
    const data = transactions.slice(0, 10).reverse().map(t => {
      if (type === 'balance') {
        return t.type === 'income' ? t.amount : -t.amount;
      }
      return t.type === type ? t.amount : 0;
    });
    return data.map((v, i) => ({ value: v, idx: i }));
  };

  // Category Icon helper returning expressive emoji
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('food') || n.includes('eat') || n.includes('grocer') || n.includes('restaur')) return '🍔';
    if (n.includes('fuel') || n.includes('travel') || n.includes('car') || n.includes('petrol')) return '🚗';
    if (n.includes('home') || n.includes('rent') || n.includes('house') || n.includes('bill')) return '🏠';
    if (n.includes('invest') || n.includes('save') || n.includes('stock') || n.includes('mutual') || n.includes('gold')) return '💰';
    if (n.includes('medical') || n.includes('doctor') || n.includes('health') || n.includes('hospital')) return '🏥';
    if (n.includes('shop') || n.includes('cloth') || n.includes('store')) return '🛍️';
    if (n.includes('bill') || n.includes('util') || n.includes('elect') || n.includes('water')) return '🔌';
    if (n.includes('fun') || n.includes('movie') || n.includes('entertain') || n.includes('play')) return '🎬';
    return '🏷️';
  };

  // Trend insights calculator for all active expense/savings categories
  const getTrendInsights = () => {
    const today = new Date();
    const currentMonthPrefix = today.toISOString().slice(0, 7); // "YYYY-MM"
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonth.toISOString().slice(0, 7);

    // List of last 6 months prefixes (chronological order)
    const last6MonthsPrefixes: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6MonthsPrefixes.push(d.toISOString().slice(0, 7));
    }

    const insightCategories = categories.filter(c => c.type === 'expense' || c.type === 'savings');

    return insightCategories.map(cat => {
      const catTx = transactions.filter(t => t.category_id === cat.id);
      
      // Current Month transactions in this category
      const currMonthTx = catTx.filter(t => t.date.startsWith(currentMonthPrefix));
      const currMonthTotal = currMonthTx.reduce((sum, t) => sum + t.amount, 0);

      // Previous Month transactions
      const prevMonthTx = catTx.filter(t => t.date.startsWith(prevMonthPrefix));
      const prevMonthTotal = prevMonthTx.reduce((sum, t) => sum + t.amount, 0);

      // Diff & Pct Change
      const difference = currMonthTotal - prevMonthTotal;
      let pctChange = 0;
      if (prevMonthTotal > 0) {
        pctChange = ((currMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
      } else if (currMonthTotal > 0) {
        pctChange = 100;
      }

      // Sparkline (last 6 months totals)
      const sparklineData = last6MonthsPrefixes.map(prefix => {
        const total = catTx
          .filter(t => t.date.startsWith(prefix))
          .reduce((sum, t) => sum + t.amount, 0);
        
        const dObj = new Date(prefix + '-02'); // avoid timezone rollover
        return {
          month: dObj.toLocaleString('default', { month: 'short' }),
          amount: total
        };
      });

      // Highest single transaction date this month
      let highestSpendDay = '';
      if (currMonthTx.length > 0) {
        const sorted = [...currMonthTx].sort((a, b) => b.amount - a.amount);
        const d = new Date(sorted[0].date);
        highestSpendDay = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }

      // Last transaction date this month
      let lastTransactionDay = '';
      if (currMonthTx.length > 0) {
        const sorted = [...currMonthTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const d = new Date(sorted[0].date);
        lastTransactionDay = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }

      // All-time monthly average
      const uniqueMonths = Array.from(new Set(catTx.map(t => t.date.slice(0, 7))));
      const avgMonthlySpend = uniqueMonths.length > 0 
        ? catTx.reduce((sum, t) => sum + t.amount, 0) / uniqueMonths.length 
        : 0;

      // Color mapping: Green for decrease in spending/increase in savings, Red for increase in spending/decrease in savings, Blue for no change
      let colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      if (difference > 0) {
        colorClass = cat.type === 'savings'
          ? 'text-green-500 bg-green-500/10 border-green-500/20'
          : 'text-red-500 bg-red-500/10 border-red-500/20';
      } else if (difference < 0) {
        colorClass = cat.type === 'savings'
          ? 'text-red-500 bg-red-500/10 border-red-500/20'
          : 'text-green-500 bg-green-500/10 border-green-500/20';
      }

      // Flag for not enough history (less than 2 months of history)
      const notEnoughHistory = uniqueMonths.length < 2;

      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        color: cat.color || '#94a3b8',
        currMonthTotal,
        prevMonthTotal,
        difference,
        pctChange,
        sparklineData,
        highestSpendDay,
        lastTransactionDay,
        avgMonthlySpend,
        colorClass,
        notEnoughHistory,
        txCount: currMonthTx.length
      };
    }).filter(insight => insight.currMonthTotal > 0 || insight.prevMonthTotal > 0);
  };

  // Heatmap Data (spending by day for last 14 days)
  const getHeatmapData = () => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    return days.map(day => {
      const total = transactions
        .filter(t => t.type === 'expense' && t.date === day)
        .reduce((s, t) => s + t.amount, 0);
      
      const level = total > 5000 ? 'high' : total > 1000 ? 'medium' : total > 0 ? 'low' : 'none';
      return { day: day.slice(8, 10), date: day, amount: total, level };
    });
  };

  const heatmap = getHeatmapData();

  // Financial Health Score Calculation
  const calculateHealthScore = () => {
    let score = 60; // Base score
    // 1. Savings Rate contribution
    if (savingsRate >= 20) score += 20;
    else if (savingsRate >= 10) score += 10;
    else score -= 15;

    // 2. Budget utilization contribution
    const overBudgets = budgets.filter(b => b.spent > b.limit_amount).length;
    if (overBudgets > 0) score -= overBudgets * 8;
    else score += 10;

    // 3. Goal progression
    const totalGoals = goals.filter(g => g.status !== 'completed').length;
    if (totalGoals > 0) score += 10;

    return Math.min(Math.max(score, 10), 100);
  };

  const healthScore = calculateHealthScore();
  const getHealthStatus = () => {
    if (healthScore >= 80) return { text: 'Excellent', color: 'text-green-500 bg-green-500/10' };
    if (healthScore >= 60) return { text: 'Good', color: 'text-blue-500 bg-blue-500/10' };
    if (healthScore >= 40) return { text: 'Average', color: 'text-orange-500 bg-orange-500/10' };
    return { text: 'Poor', color: 'text-red-500 bg-red-500/10' };
  };
  const healthStatus = getHealthStatus();

  // Forecast month-end expenses
  const getForecast = () => {
    const currentDay = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const averageDaily = currentDay > 0 ? totalsData.current.expenses / currentDay : 0;
    const projectedEnd = averageDaily * totalDays;
    return {
      projectedEnd,
      savings: Math.max(totalsData.current.income - projectedEnd, 0)
    };
  };

  const forecast = getForecast();

  // KPI calculations
  const totalTx = transactions.length;
  const avgDailySpending = now.getDate() > 0 ? totalsData.current.expenses / now.getDate() : 0;
  const largestTx = transactions.reduce((max, t) => t.amount > max ? t.amount : max, 0);
  const highestExpCat = categoryData.length > 0 ? categoryData[0].name : '—';

  // Filter transactions
  const filteredTx = transactions
    .filter(t => {
      const matchSearch = t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(t.amount).includes(searchQuery);
      return matchSearch;
    })
    .slice(0, 7);

  const hasData = monthlyData.length > 0;
  const monthlyChartData = monthlyData.slice(-6);

  // Filter budgets to warn or over limit
  const criticalBudgets = budgets.filter(b => (b.spent / b.limit_amount) >= 0.8);
  const activeGoals = goals.filter(g => g.status !== 'completed').slice(0, 3);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-slate-500">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold">Loading customizable dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md text-center">
        <p className="text-red-700 dark:text-red-300 font-semibold mb-2">Backend not connected</p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button onClick={fetchAll} className="flex items-center mx-auto px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-700 transition">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Personalized Greeting Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 rounded-3xl border border-primary/15 relative overflow-hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{getGreeting()}</h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {totalsData.current.balance >= 0 
              ? `You saved ₹${totalsData.current.balance.toLocaleString('en-IN')} this month. Keep it up! 🚀`
              : `You spent ₹${Math.abs(totalsData.current.balance).toLocaleString('en-IN')} over your income this month. Keep an eye on budgets! ⚠️`}
          </p>
          <div className="text-[10px] text-slate-400 mt-2 font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            Last Updated: {lastUpdated}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition"
          >
            <LayoutGrid className="w-4 h-4 text-slate-500" />
            <span>{isCustomizing ? 'Done Customizing' : 'Customize Widgets'}</span>
          </button>
          <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition">
            <RefreshCw className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Customize Panel */}
      {isCustomizing && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-top duration-200">
          {Object.keys(widgets).map(key => (
            <label key={key} className="flex items-center space-x-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm">
              <input
                type="checkbox"
                checked={(widgets as any)[key]}
                onChange={e => saveLayout({ ...widgets, [key]: e.target.checked })}
                className="rounded text-primary focus:ring-primary w-4 h-4"
              />
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            </label>
          ))}
        </div>
      )}



      {/* KPI Hover Preview CSS */}
      <style>{`
        @keyframes kpiPanelIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes kpiPanelOut {
          from { opacity: 1; transform: translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateY(10px) scale(0.97); }
        }
        .kpi-panel-enter { animation: kpiPanelIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .sheet-up { animation: sheetUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* SUMMARY CARDS WIDGET */}
      {widgets.summaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">

          {/* ── Monthly Income ── */}
          <SummaryCard
            title="Monthly Income"
            monthLabel={currentMonthLabel}
            cardKey="income"
            amount={totalsData.current.income}
            pctChange={totalsData.pctChange.income}
            sparklineData={getSparklineData('income')}
            color="text-green-500"
            bg="bg-green-500"
            isHovered={hoveredCard === 'income'}
            onCardMouseEnter={() => handleCardMouseEnter('income')}
            onCardMouseLeave={handleCardMouseLeave}
            onMobileTap={() => setMobileSheetCard('income')}
            previewData={hoveredCard === 'income' ? getKpiPreviewData('income') : null}
            previewContent={hoveredCard === 'income' ? (
              <KpiIncomePanel
                data={getKpiPreviewData('income')}
                monthLabel={currentMonthLabel}
                navigate={navigate}
                onPanelMouseEnter={handlePanelMouseEnter}
                onPanelMouseLeave={handlePanelMouseLeave}
              />
            ) : null}
          />

          {/* ── Monthly Expenses ── */}
          <SummaryCard
            title="Monthly Expenses"
            monthLabel={currentMonthLabel}
            cardKey="expenses"
            amount={totalsData.current.expenses}
            pctChange={totalsData.pctChange.expenses}
            sparklineData={getSparklineData('expense')}
            color="text-red-500"
            bg="bg-red-500"
            inverseTrend
            isHovered={hoveredCard === 'expenses'}
            onCardMouseEnter={() => handleCardMouseEnter('expenses')}
            onCardMouseLeave={handleCardMouseLeave}
            onMobileTap={() => setMobileSheetCard('expenses')}
            previewContent={hoveredCard === 'expenses' ? (
              <KpiExpensesPanel
                data={getKpiPreviewData('expenses')}
                monthLabel={currentMonthLabel}
                navigate={navigate}
                onPanelMouseEnter={handlePanelMouseEnter}
                onPanelMouseLeave={handlePanelMouseLeave}
              />
            ) : null}
          />

          {/* ── Monthly Savings ── */}
          <SummaryCard
            title="Monthly Savings"
            monthLabel={currentMonthLabel}
            cardKey="savings"
            amount={totalsData.current.savings}
            pctChange={totalsData.pctChange.savings}
            sparklineData={getSparklineData('savings')}
            color={totalsData.pctChange.savings >= 0 ? "text-green-500" : "text-red-500"}
            bg={totalsData.pctChange.savings >= 0 ? "bg-green-500" : "bg-red-500"}
            isHovered={hoveredCard === 'savings'}
            onCardMouseEnter={() => handleCardMouseEnter('savings')}
            onCardMouseLeave={handleCardMouseLeave}
            onMobileTap={() => setMobileSheetCard('savings')}
            previewContent={hoveredCard === 'savings' ? (
              <KpiSavingsPanel
                data={getKpiPreviewData('savings')}
                monthLabel={currentMonthLabel}
                navigate={navigate}
                onPanelMouseEnter={handlePanelMouseEnter}
                onPanelMouseLeave={handlePanelMouseLeave}
              />
            ) : null}
          />

          {/* ── Available Balance ── */}
          <SummaryCard
            title="Available Balance"
            monthLabel={currentMonthLabel}
            cardKey="balance"
            amount={availableBalance}
            pctChange={totalsData.pctChange.balance}
            sparklineData={getSparklineData('balance')}
            color={availableColor}
            bg={availableBg}
            isHovered={hoveredCard === 'balance'}
            onCardMouseEnter={() => handleCardMouseEnter('balance')}
            onCardMouseLeave={handleCardMouseLeave}
            onMobileTap={() => setMobileSheetCard('balance')}
            previewContent={hoveredCard === 'balance' ? (
              <KpiBalancePanel
                data={getKpiPreviewData('balance')}
                unpaidBillsSum={unpaidBillsSum}
                forecastedBalance={forecastedBalance}
                statusBadgeBg={statusBadgeBg}
                statusBadgeText={statusBadgeText}
                monthLabel={currentMonthLabel}
                onPanelMouseEnter={handlePanelMouseEnter}
                onPanelMouseLeave={handlePanelMouseLeave}
              />
            ) : null}
          >
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 space-y-1">
              <div className="flex justify-between"><span>Income</span><span className="text-slate-900 dark:text-white font-bold">₹{totalsData.current.income.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="text-red-400 font-bold">-₹{totalsData.current.expenses.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Savings</span><span className="text-blue-400 font-bold">-₹{totalsData.current.savings.toLocaleString('en-IN')}</span></div>
              {unpaidBillsSum > 0 && (
                <div className="flex justify-between text-amber-500 font-bold"><span>Unpaid Bills</span><span>-₹{unpaidBillsSum.toLocaleString('en-IN')}</span></div>
              )}
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>
              <div className={`text-center font-extrabold mt-1 text-[10px] py-0.5 rounded ${statusBadgeBg} ${statusBadgeText}`}>
                {totalsData.current.income === 0 ? 'Add income to start tracking' : unpaidBillsSum > 0 ? `Forecast: ₹${forecastedBalance.toLocaleString('en-IN')}` : availableBalance >= 0 ? `Available: ₹${availableBalance.toLocaleString('en-IN')}` : `Overspent: -₹${Math.abs(availableBalance).toLocaleString('en-IN')}`}
              </div>
            </div>
          </SummaryCard>

          {/* ── Net Balance ── */}
          <SummaryCard
            title="Net Balance"
            monthLabel={currentMonthLabel}
            cardKey="netbalance"
            amount={totalsData.current.balance}
            pctChange={totalsData.pctChange.balance}
            sparklineData={getSparklineData('balance')}
            color={availableColor}
            bg={availableBg}
            isHovered={hoveredCard === 'netbalance'}
            onCardMouseEnter={() => handleCardMouseEnter('netbalance')}
            onCardMouseLeave={handleCardMouseLeave}
            onMobileTap={() => setMobileSheetCard('netbalance')}
            previewContent={hoveredCard === 'netbalance' ? (
              <KpiNetBalancePanel
                data={getKpiPreviewData('netbalance')}
                monthLabel={currentMonthLabel}
                onPanelMouseEnter={handlePanelMouseEnter}
                onPanelMouseLeave={handlePanelMouseLeave}
              />
            ) : null}
          >
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 space-y-1">
              <div className="flex justify-between"><span>Income</span><span className="text-slate-900 dark:text-white font-bold">₹{totalsData.current.income.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="text-red-400 font-bold">-₹{totalsData.current.expenses.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Savings</span><span className="text-blue-400 font-bold">-₹{totalsData.current.savings.toLocaleString('en-IN')}</span></div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>
              <div className={`text-center font-extrabold mt-1 text-[10px] py-0.5 rounded ${statusBadgeBg} ${statusBadgeText}`}>
                {totalsData.current.income === 0 ? 'Add income to start tracking' : totalsData.current.balance >= 0 ? `Net Balance: ₹${totalsData.current.balance.toLocaleString('en-IN')}` : `Net Deficit: -₹${Math.abs(totalsData.current.balance).toLocaleString('en-IN')}`}
              </div>
            </div>
          </SummaryCard>

          {/* ── Savings Rate ── */}
          <SummaryCard
            title="Savings Rate"
            monthLabel={currentMonthLabel}
            amount={savingsRate}
            isPercentage
            pctChange={totalsData.pctChange.savingsRate}
            color="text-orange-500"
            bg="bg-orange-500"
          />
        </div>
      )}

      {/* Mobile Bottom Sheet for KPI previews */}
      {mobileSheetCard && (
        <div
          className="fixed inset-0 z-50 flex items-end md:hidden"
          onClick={() => setMobileSheetCard(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full bg-slate-900 rounded-t-3xl border-t border-slate-700 max-h-[80vh] overflow-y-auto sheet-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-3 mb-2" />
            <div className="p-4 pb-8">
              {mobileSheetCard === 'income' && <KpiIncomePanel data={getKpiPreviewData('income')} monthLabel={currentMonthLabel} navigate={navigate} onPanelMouseEnter={() => {}} onPanelMouseLeave={() => {}} />}
              {mobileSheetCard === 'expenses' && <KpiExpensesPanel data={getKpiPreviewData('expenses')} monthLabel={currentMonthLabel} navigate={navigate} onPanelMouseEnter={() => {}} onPanelMouseLeave={() => {}} />}
              {mobileSheetCard === 'savings' && <KpiSavingsPanel data={getKpiPreviewData('savings')} monthLabel={currentMonthLabel} navigate={navigate} onPanelMouseEnter={() => {}} onPanelMouseLeave={() => {}} />}
              {mobileSheetCard === 'balance' && <KpiBalancePanel data={getKpiPreviewData('balance')} unpaidBillsSum={unpaidBillsSum} forecastedBalance={forecastedBalance} statusBadgeBg={statusBadgeBg} statusBadgeText={statusBadgeText} monthLabel={currentMonthLabel} onPanelMouseEnter={() => {}} onPanelMouseLeave={() => {}} />}
              {mobileSheetCard === 'netbalance' && <KpiNetBalancePanel data={getKpiPreviewData('netbalance')} monthLabel={currentMonthLabel} onPanelMouseEnter={() => {}} onPanelMouseLeave={() => {}} />}
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL INSIGHTS SECTION */}
      {widgets.financialInsights && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <style>{`
            @keyframes slideUpFade {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-slide-up {
              animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5.5 h-5.5 text-primary" /> Financial Insights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Smart category spending trends and sparkline comparisons compared to last month</p>
            </div>

            {/* Navigation Arrows */}
            {getTrendInsights().length > 0 && (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => scrollInsights('left')}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 transition-colors shadow-sm"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => scrollInsights('right')}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 transition-colors shadow-sm"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
          </div>

          {getTrendInsights().length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-500 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              No category spending trends available for this period. Add expenses or savings to view insights.
            </div>
          ) : (
            <div 
              ref={insightsScrollRef}
              onMouseDown={handleInsightsMouseDown}
              onMouseMove={handleInsightsMouseMove}
              onMouseUp={handleInsightsMouseUpOrLeave}
              onMouseLeave={handleInsightsMouseUpOrLeave}
              className="flex overflow-x-auto gap-5 pb-3 pt-1 no-scrollbar cursor-grab active:cursor-grabbing scroll-smooth select-none w-full"
            >
              {getTrendInsights().map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedInsight(item)}
                  className="shrink-0"
                >
                  <InsightCard 
                    item={item} 
                    index={idx} 
                    getCategoryIcon={getCategoryIcon} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEALTH SCORE & FORECAST ROWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health Score Widget */}
        {widgets.healthScore && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <Flame className="w-5 h-5 text-red-500 mr-2" /> Financial Health Score
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Overall rating based on current budgets, savings rate and targets</p>
            </div>
            
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
                <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '4s' }} />
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{healthScore}</span>
                  <span className="text-xs text-slate-400 block font-semibold">/100</span>
                </div>
              </div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full mt-4 uppercase tracking-wider ${healthStatus.color}`}>
                Status: {healthStatus.text}
              </span>
            </div>
            
            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
              Maintain savings rate above 20% to achieve Excellent score.
            </div>
          </div>
        )}

        {/* Forecast & Project Widget */}
        {widgets.forecastWidget && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 text-primary mr-2" /> Spend Forecasting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Projected spending patterns based on daily velocities</p>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1">Projected Month-End Spend</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">₹{forecast.projectedEnd.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1">Projected Savings Allocation</p>
                <p className="text-xl font-extrabold text-green-500">₹{forecast.savings.toFixed(0)}</p>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              Projections update instantly as new transaction values populate.
            </div>
          </div>
        )}

        {/* Dynamic KPI Widget */}
        {widgets.kpiWidget && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <CheckCircle2 className="w-5 h-5 text-primary mr-2" /> Key Performance Metrics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">General database indicators</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs py-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block font-semibold">Total Trades</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{totalTx}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block font-semibold">Avg Daily Spend</span>
                <span className="font-extrabold text-slate-900 dark:text-white">₹{avgDailySpending.toFixed(0)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block font-semibold">Largest Spend</span>
                <span className="font-extrabold text-slate-900 dark:text-white">₹{largestTx.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-medium">
                <span className="text-slate-500 block">Top Category</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{highestExpCat}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
              Historical calculations parsed from complete SQLite database rows.
            </div>
          </div>
        )}
      </div>

      {/* TREND CHART & SPENDING HEATMAP SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        {widgets.cashFlow && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Cash Flow Trends</h3>
            {!hasData ? (
              <div className="h-60 flex items-center justify-center text-slate-400">Add transactions to render trend</div>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15}/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}/>
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInc)"/>
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Heatmap Widget */}
        {widgets.heatmapWidget && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <Calendar className="w-5 h-5 text-primary mr-2" /> Spending Heatmap
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Visual indicators representing last 14 days spending levels</p>
            </div>

            <div className="grid grid-cols-7 gap-2.5 py-4">
              {heatmap.map(day => {
                const heatColor = 
                  day.level === 'high' ? 'bg-red-500 text-white font-bold ring-2 ring-red-300 dark:ring-red-900' :
                  day.level === 'medium' ? 'bg-orange-400 text-slate-900 font-semibold' :
                  day.level === 'low' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-medium' :
                  'bg-slate-100 dark:bg-slate-900 text-slate-400';
                
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ₹${day.amount.toLocaleString()}`}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs transition-all hover:scale-110 cursor-pointer ${heatColor}`}
                  >
                    {day.day}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-200 mr-1" />Low</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 mr-1" />Medium</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1" />High (&gt;₹5k)</span>
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC BUDGETS & SAVINGS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget watch */}
        {widgets.budgetWatch && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <AlertTriangle className="w-5 h-5 text-warning mr-2" /> Budget Watchlist
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Critical limits exceeding 80% consumption threshold</p>
            </div>
            
            {criticalBudgets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-green-500 mb-1" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All budgets safe</p>
                <p className="text-xs">No categories exceeded 80% limit</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {criticalBudgets.map(b => {
                  const pct = (b.spent / b.limit_amount) * 100;
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{b.category_name}</span>
                        <span className={pct >= 100 ? 'text-red-500 font-bold' : 'text-yellow-500 font-bold'}>
                          {pct.toFixed(0)}% (₹{b.spent.toLocaleString('en-IN')})
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Goals progress */}
        {widgets.goalsWidget && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <Target className="w-5 h-5 text-primary mr-2" /> Savings Milestones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Top active savings targets and progression ratios</p>
            </div>

            {activeGoals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <p className="text-2xl mb-1">🎯</p>
                <p>No active goals set</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {activeGoals.map(g => {
                  const pct = Math.min((g.current_saved / g.target_amount) * 100, 100);
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300 truncate w-36">{g.name}</span>
                        <span className="text-slate-500 font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EXPENSE BREAKDOWN WIDGET */}
      {widgets.breakdownWidget && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Expense Distribution</h3>
          {categoryData.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No category breakdown data available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-[200px] flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {categoryData.map((_e, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                      formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {categoryData.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹{Number(item.value).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INTERACTIVE RECENT ACTIVITY WITH GLOBAL SEARCH */}
      {widgets.recentTransactions && (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Global database search queries supported</p>
            </div>
            
            <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-64">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search description, category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-3xl mb-2">💳</p>
              <p className="text-sm font-semibold">No records match search filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTx.map(t => (
                <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.category_color || '#94A3B8' }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.notes || '—'}</p>
                      <p className="text-xs text-slate-500 font-semibold">{t.category_name} · {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-500' : t.type === 'expense' ? 'text-red-400' : 'text-blue-400'}`}>
                    {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-3 bg-slate-50/30 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 text-center">
            <a href="/transactions" className="text-xs font-bold text-primary hover:underline">View All Transactions →</a>
          </div>
        </div>
      )}

      {/* QUICK TRANSACTION MODAL */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                Quick Log {txFormType}
              </h3>
              <button onClick={() => setIsAddTxOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTxSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Amount (₹) *</label>
                <input
                  type="number" required min="1" placeholder="0.00"
                  value={txFormData.amount}
                  onChange={e => setTxFormData(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Category *</label>
                <select
                  required
                  value={txFormData.category_id}
                  onChange={e => setTxFormData(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                >
                  <option value="">Select category...</option>
                  {categories
                    .filter(c => txFormType === 'income' ? c.type === 'income' : c.type === 'expense')
                    .map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Description *</label>
                <input
                  type="text" required placeholder="e.g. Shopping, salary, fuel"
                  value={txFormData.notes}
                  onChange={e => setTxFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Date *</label>
                <input
                  type="date" required
                  value={txFormData.date}
                  onChange={e => setTxFormData(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsAddTxOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Add Transaction</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING QUICK ACTIONS BUTTON & DRAWER */}
      {widgets.quickActions && (
        <>
          {/* FLOATING ACTION BUTTON */}
          <button
            onClick={() => setIsQuickActionsOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-blue-600 active:scale-95 text-white p-4.5 rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-all hover:scale-110"
            title="Quick Actions"
          >
            <Plus className="w-6 h-6 animate-pulse" />
          </button>

          {/* FLOATING TASKBAR DRAWER */}
          {isQuickActionsOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Backdrop overlay */}
              <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsQuickActionsOpen(false)}
              />

              {/* Sidebar drawer body */}
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col space-y-6 animate-in slide-in-from-right duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-md text-slate-900 dark:text-white">Quick Actions</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Shortcuts taskbar</p>
                  </div>
                  <button 
                    onClick={() => setIsQuickActionsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col space-y-3 justify-start">
                  <button 
                    onClick={() => { setTxFormType('income'); setIsAddTxOpen(true); setIsQuickActionsOpen(false); }} 
                    className="w-full flex items-center space-x-3 text-xs font-bold bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-2xl transition-all border border-green-500/20"
                  >
                    <Plus className="w-4 h-4" /> <span>Add Income</span>
                  </button>
                  <button 
                    onClick={() => { setTxFormType('expense'); setIsAddTxOpen(true); setIsQuickActionsOpen(false); }} 
                    className="w-full flex items-center space-x-3 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl transition-all border border-red-500/20"
                  >
                    <Plus className="w-4 h-4" /> <span>Add Expense</span>
                  </button>
                  <a 
                    href="/budgets" 
                    className="w-full flex items-center space-x-3 text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 p-4 rounded-2xl transition-all border border-blue-500/20"
                  >
                    <Plus className="w-4 h-4" /> <span>Create Budget</span>
                  </a>
                  <a 
                    href="/goals" 
                    className="w-full flex items-center space-x-3 text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 p-4 rounded-2xl transition-all border border-purple-500/20"
                  >
                    <Plus className="w-4 h-4" /> <span>Create Goal</span>
                  </a>
                  <button 
                    onClick={() => { alert('Feature coming soon in multi-account sync!'); setIsQuickActionsOpen(false); }}
                    className="w-full flex items-center space-x-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 p-4 rounded-2xl transition-all border border-slate-200 dark:border-slate-850"
                  >
                    <span>Transfer Money</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MONTH-OVER-MONTH COMPARISON WIDGET AT BOTTOM */}
      {widgets.momWidget && (
        <div className="mt-8 pt-6 border-t border-slate-250 dark:border-slate-800">
          <MonthOverMonthComparisonWidget data={totalsData} navigate={navigate} />
        </div>
      )}

      {/* INSIGHT DRILL-DOWN DRAWER */}
      {selectedInsight && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
            onClick={() => setSelectedInsight(null)}
          />

          {/* Drawer Panel */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-slate-950 border-l border-slate-800 dark:border-slate-900 shadow-2xl flex flex-col h-screen overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-2xl p-2 bg-slate-900 rounded-xl">
                  {getCategoryIcon(selectedInsight.name)}
                </span>
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-1.5">
                    {selectedInsight.name} Transactions
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Financial Insights Drill-down</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Category Navigation Controls */}
                <button
                  onClick={handlePrevCategory}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Previous Category"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextCategory}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Next Category"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">This Month</span>
                  <p className="text-lg font-black text-white font-mono">
                    ₹<AnimatedNumber value={selectedInsight.currMonthTotal} />
                  </p>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Last Month</span>
                  <p className="text-lg font-black text-slate-350 font-mono">
                    ₹<AnimatedNumber value={selectedInsight.prevMonthTotal} />
                  </p>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Difference</span>
                  <p className={`text-lg font-black font-mono ${selectedInsight.difference > 0 ? (selectedInsight.type === 'savings' ? 'text-green-400' : 'text-red-400') : (selectedInsight.type === 'savings' ? 'text-red-400' : 'text-green-400')}`}>
                    {selectedInsight.difference > 0 ? '+' : '-'}₹<AnimatedNumber value={Math.abs(selectedInsight.difference)} />
                  </p>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Count</span>
                  <p className="text-lg font-black text-purple-400 font-mono">
                    <AnimatedNumber value={getFilteredTransactions().length} /> Tx
                  </p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Monthly area chart */}
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">6-Month Trend</h4>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedInsight.sparklineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <XAxis dataKey="month" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Methods breakdown */}
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment Methods</h4>
                  <div className="h-28 flex items-center justify-between">
                    <div className="w-[100px] h-full shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={Object.entries(
                              getFilteredTransactions().reduce((acc: any, curr: any) => {
                                const m = curr.payment_method || 'UPI';
                                acc[m] = (acc[m] || 0) + curr.amount;
                                return acc;
                              }, {})
                            ).map(([name, value]) => ({ name, value }))} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={18} 
                            outerRadius={30} 
                            dataKey="value"
                          >
                            {Object.entries(
                              getFilteredTransactions().reduce((acc: any, curr: any) => {
                                const m = curr.payment_method || 'UPI';
                                acc[m] = (acc[m] || 0) + curr.amount;
                                return acc;
                              }, {})
                            ).map((_entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ec4899'][idx % 4]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 pl-4 space-y-1.5 text-[10px] font-bold text-slate-400">
                      {Object.entries(
                        getFilteredTransactions().reduce((acc: any, curr: any) => {
                          const m = curr.payment_method || 'UPI';
                          acc[m] = (acc[m] || 0) + curr.amount;
                          return acc;
                        }, {})
                      ).map(([name, value]: any, idx) => (
                        <div key={name} className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'][idx % 4] }} />
                            {name}
                          </span>
                          <span className="text-white font-mono">₹{value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Header & Inputs */}
              <div className="bg-slate-900/40 border border-slate-850 p-4.5 rounded-xl space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filters & Controls</h4>
                  <button 
                    onClick={() => {
                      setDrawerSearch('');
                      setDrawerPaymentMethod('All');
                      setDrawerDateStart('');
                      setDrawerDateEnd('');
                      setDrawerMinAmount('');
                      setDrawerMaxAmount('');
                      setDrawerSortBy('newest');
                    }}
                    className="text-[9px] text-purple-400 hover:text-purple-300 font-extrabold uppercase"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-slate-500 mb-1 text-[10px]">Search Description</label>
                    <input 
                      type="text" placeholder="e.g. Lunch, taxi..."
                      value={drawerSearch}
                      onChange={e => setDrawerSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Payment Method</label>
                    <select
                      value={drawerPaymentMethod}
                      onChange={e => setDrawerPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px] font-medium"
                    >
                      <option value="All">All Methods</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Sort By</label>
                    <select
                      value={drawerSortBy}
                      onChange={e => setDrawerSortBy(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px] font-medium"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="high">Highest Amount</option>
                      <option value="low">Lowest Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Min Amount (₹)</label>
                    <input 
                      type="number" placeholder="Min"
                      value={drawerMinAmount}
                      onChange={e => setDrawerMinAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Max Amount (₹)</label>
                    <input 
                      type="number" placeholder="Max"
                      value={drawerMaxAmount}
                      onChange={e => setDrawerMaxAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Start Date</label>
                    <input 
                      type="date"
                      value={drawerDateStart}
                      onChange={e => setDrawerDateStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons (Export/Print) */}
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button 
                  onClick={() => handleExportCSV(getFilteredTransactions(), selectedInsight.name)} 
                  variant="ghost" 
                  className="text-xs py-2 px-4 border border-slate-800 hover:bg-slate-900 flex items-center gap-1.5 text-slate-350"
                >
                  📥 Export CSV
                </Button>
                <Button 
                  onClick={() => window.print()} 
                  variant="ghost" 
                  className="text-xs py-2 px-4 border border-slate-800 hover:bg-slate-900 flex items-center gap-1.5 text-slate-350"
                >
                  🖨️ Print
                </Button>
              </div>

              {/* Collapsible Monthly Grouped Transaction Lists */}
              <div className="space-y-4">
                {getGroupedTransactions(getFilteredTransactions()).length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-semibold border border-dashed border-slate-800 rounded-2xl">
                    No transactions match current filters.
                  </div>
                ) : (
                  getGroupedTransactions(getFilteredTransactions()).map(monthGroup => {
                    const isCollapsed = collapsedMonths.includes(monthGroup.key);
                    return (
                      <div key={monthGroup.key} className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-950">
                        {/* Month Header (clickable) */}
                        <div 
                          onClick={() => {
                            if (isCollapsed) {
                              setCollapsedMonths(collapsedMonths.filter(m => m !== monthGroup.key));
                            } else {
                              setCollapsedMonths([...collapsedMonths, monthGroup.key]);
                            }
                          }}
                          className="p-4 bg-slate-900/60 hover:bg-slate-900 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-900 select-none"
                        >
                          <div>
                            <h4 className="font-extrabold text-sm text-white">{monthGroup.label}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {monthGroup.txs.length} Transactions · Total: ₹{monthGroup.total.toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-4 text-xs font-bold text-slate-400">
                            <div className="text-left md:text-right text-[10px] text-slate-550 font-medium">
                              <span>Avg: ₹{Math.round(monthGroup.avg)}</span>
                              <span className="mx-1.5">·</span>
                              <span>Max: ₹{monthGroup.max}</span>
                              <span className="mx-1.5">·</span>
                              <span>Min: ₹{monthGroup.min}</span>
                            </div>
                            <span className="text-[10px] text-purple-400">{isCollapsed ? 'Expand ▲' : 'Collapse ▼'}</span>
                          </div>
                        </div>

                        {/* Month Transaction list */}
                        {!isCollapsed && (
                          <div className="p-3.5 space-y-2.5 bg-slate-950/20 max-h-96 overflow-y-auto no-scrollbar">
                            {monthGroup.txs.map(t => (
                              <div key={t.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center space-x-3">
                                  <div className="text-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 shrink-0 min-w-[50px]">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                      {new Date(t.date).toLocaleDateString('default', { month: 'short' })}
                                    </p>
                                    <p className="text-sm font-black text-white font-mono">
                                      {new Date(t.date).getDate()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-200">{t.notes || '—'}</p>
                                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                                      <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-400">{t.payment_method}</span>
                                      {t.tags && <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-400">{t.tags}</span>}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <p className="font-black text-sm text-red-400 font-mono">
                                    -₹{Number(t.amount).toLocaleString('en-IN')}
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-semibold uppercase">
                                    {new Date(t.date).toLocaleDateString('default', { month: 'long' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// MoM comparison Widget component
function MonthOverMonthComparisonWidget({ data, navigate }: { data: any; navigate: any }) {
  const { current, previous, pctChange } = data;
  
  // Empty state check (if no previous data exists)
  const prevMonthHasData = previous.income > 0 || previous.expenses > 0 || previous.savings > 0;

  const cards = [
    {
      id: 'income',
      title: 'Income Comparison',
      currentVal: current.income,
      prevVal: previous.income,
      diff: current.income - previous.income,
      pct: pctChange.income,
      isPositiveGood: true,
      path: '/analytics'
    },
    {
      id: 'expense',
      title: 'Expense Comparison',
      currentVal: current.expenses,
      prevVal: previous.expenses,
      diff: current.expenses - previous.expenses,
      pct: pctChange.expenses,
      isPositiveGood: false,
      path: '/analytics'
    },
    {
      id: 'savings',
      title: 'Savings Comparison',
      currentVal: current.savings,
      prevVal: previous.savings,
      diff: current.savings - previous.savings,
      pct: pctChange.savings,
      isPositiveGood: true,
      path: '/goals'
    },
    {
      id: 'balance',
      title: 'Net Balance Comparison',
      currentVal: current.balance,
      prevVal: previous.balance,
      diff: current.balance - previous.balance,
      pct: pctChange.balance,
      isPositiveGood: true,
      path: '/analytics'
    }
  ];

  return (
    <div className="space-y-4 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center space-x-2">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Month-over-Month Financial Comparison</h3>
      </div>

      {!prevMonthHasData ? (
        <div className="py-6 text-center text-sm text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          No previous month data available. Add historical transactions to view comparisons.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(c => {
              const isPositive = c.diff >= 0;
              const hasDiff = c.diff !== 0;
              
              // Color indicator rules
              let trendColor = 'text-slate-400 border-slate-200 dark:border-slate-800';
              if (hasDiff) {
                const isImprovement = c.isPositiveGood ? isPositive : !isPositive;
                trendColor = isImprovement 
                  ? 'text-green-500 border-green-200 dark:border-green-800' 
                  : 'text-red-500 border-red-200 dark:border-red-800';
              }

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(c.path)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all relative overflow-hidden group"
                >
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{c.title}</p>
                  
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      This Month: <span className="font-bold text-slate-900 dark:text-white">₹{c.currentVal.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Last Month: <span className="font-medium text-slate-700 dark:text-slate-300">₹{c.prevVal.toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  <div className={`mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center space-x-1.5 text-xs font-black ${trendColor}`}>
                    <span>{isPositive ? '▲' : '▼'}</span>
                    <span>
                      {isPositive ? '+' : '-'}₹{Math.abs(c.diff).toLocaleString('en-IN')} ({c.pct.toFixed(1)}%)
                    </span>
                  </div>

                  {/* HOVER TOOLTIP */}
                  <div className="absolute inset-0 bg-slate-900/95 dark:bg-slate-950/98 text-white p-3.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl">
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">Comparison Values</p>
                    <div className="text-[10px] space-y-0.5 font-semibold text-slate-300">
                      <p>Diff: ₹{c.diff.toLocaleString('en-IN')}</p>
                      <p>Ratio change: {c.pct.toFixed(2)}%</p>
                      <p>Prev: ₹{c.prevVal.toLocaleString('en-IN')}</p>
                      <p>Curr: ₹{c.currentVal.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* OVERALL FINANCIAL SUMMARY STATEMENTS */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 space-y-1">
            <p>• Income {pctChange.income >= 0 ? 'increased' : 'decreased'} by <span className={pctChange.income >= 0 ? 'text-green-500' : 'text-red-500'}>{Math.abs(pctChange.income).toFixed(1)}%</span> compared to last month.</p>
            <p>• Expenses {pctChange.expenses <= 0 ? 'decreased' : 'increased'} by <span className={pctChange.expenses <= 0 ? 'text-green-500' : 'text-red-500'}>{Math.abs(pctChange.expenses).toFixed(1)}%</span>.</p>
            <p>• Savings {pctChange.savings >= 0 ? 'increased' : 'decreased'} by <span className={pctChange.savings >= 0 ? 'text-green-500' : 'text-red-500'}>{Math.abs(pctChange.savings).toFixed(1)}%</span>.</p>
            <p>• Net Balance improved by <span className={current.balance - previous.balance >= 0 ? 'text-green-500' : 'text-red-500'}>₹{Math.abs(current.balance - previous.balance).toLocaleString('en-IN')}</span>.</p>
          </div>
        </>
      )}
    </div>
  );
}

// Sparkline Component using Recharts
function Sparkline({ data, color }: { data: any[]; color: string }) {
  return (
    <div className="w-20 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color === 'text-green-500' ? '#10B981' : color === 'text-red-500' ? '#EF4444' : '#3B82F6'} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCard({ title, monthLabel, cardKey, amount, pctChange, sparklineData, color, bg, isPercentage = false, inverseTrend = false, children, isHovered, onCardMouseEnter, onCardMouseLeave, onMobileTap, previewContent }: any) {
  const isPositive = pctChange >= 0;
  const isGood = inverseTrend ? !isPositive : isPositive;
  const cardRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isHovered && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      let left = rect.left;
      if (spaceRight < panelWidth + 12 && spaceLeft > panelWidth + 12) {
        left = rect.right - panelWidth;
      }
      if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
      if (left < 8) left = 8;
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 10,
        left,
        width: panelWidth,
        zIndex: 9999,
      });
    }
  }, [isHovered]);

  return (
    <div
      ref={cardRef}
      className={`bg-white dark:bg-slate-950 p-5 rounded-2xl border shadow-sm hover:shadow-xl transition-all relative overflow-visible group cursor-pointer select-none ${
        isHovered
          ? 'border-primary/50 ring-2 ring-primary/20 shadow-primary/10'
          : 'border-slate-200 dark:border-slate-800'
      }`}
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
      onClick={onMobileTap}
    >
      {/* Background glow orb */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bg} opacity-5 group-hover:opacity-15 transition-opacity duration-300`}></div>

      {/* Header: Title + Month Badge */}
      <div className="mb-2">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        {monthLabel && cardKey && (
          <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-primary/10 text-primary tracking-wide">
            📅 {monthLabel}
          </span>
        )}
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {isPercentage ? `${amount.toFixed(1)}%` : `₹${Number(amount).toLocaleString('en-IN')}`}
          </h2>
          <span className={`text-[10px] font-bold mt-1 inline-block ${isGood ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}% vs prev. month
          </span>
        </div>
        {sparklineData && <Sparkline data={sparklineData} color={color} />}
      </div>

      {children}

      {/* Hover indicator dot */}
      {cardKey && (
        <div className={`absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full transition-all duration-300 ${isHovered ? 'bg-primary scale-125' : 'bg-slate-300 dark:bg-slate-700'}`} />
      )}

      {/* Floating Preview Panel — rendered via portal-like fixed positioning */}
      {isHovered && previewContent && typeof document !== 'undefined' && (
        <div
          style={panelStyle}
          className="kpi-panel-enter hidden md:block"
        >
          {previewContent}
        </div>
      )}
    </div>
  );
}

// ─── Shared KPI Transaction Row ───────────────────────────────────────────────
function KpiTxRow({ t, amountColor = 'text-green-400' }: { t: any; amountColor?: string }) {
  const d = new Date(t.date);
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-800/60 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 text-center bg-slate-800 rounded-lg px-2 py-1 min-w-[40px]">
          <p className="text-[8px] text-slate-400 font-bold uppercase">{d.toLocaleString('default', { month: 'short' })}</p>
          <p className="text-xs font-black text-white leading-none">{d.getDate()}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-200 truncate max-w-[130px]">{t.notes || t.category_name || '—'}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-semibold">{t.payment_method || 'UPI'}</span>
            {t.category_name && <span className="text-[9px] text-slate-500 font-medium truncate max-w-[80px]">{t.category_name}</span>}
          </div>
        </div>
      </div>
      <span className={`text-xs font-black font-mono shrink-0 ${amountColor}`}>
        ₹{Number(t.amount).toLocaleString('en-IN')}
      </span>
    </div>
  );
}

// ─── KPI Panel Wrapper ────────────────────────────────────────────────────────
function KpiPanelWrapper({ children, onPanelMouseEnter, onPanelMouseLeave }: { children: React.ReactNode; onPanelMouseEnter: () => void; onPanelMouseLeave: () => void }) {
  return (
    <div
      onMouseEnter={onPanelMouseEnter}
      onMouseLeave={onPanelMouseLeave}
      className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
    >
      {children}
    </div>
  );
}

// ─── Income Preview Panel ─────────────────────────────────────────────────────
function KpiIncomePanel({ data, monthLabel, navigate, onPanelMouseEnter, onPanelMouseLeave }: any) {
  if (!data) return null;
  return (
    <KpiPanelWrapper onPanelMouseEnter={onPanelMouseEnter} onPanelMouseLeave={onPanelMouseLeave}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900/60 to-emerald-900/40 px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">💚</span>
          <div>
            <p className="text-[10px] font-black text-green-400 uppercase tracking-wider">Income</p>
            <p className="text-xs font-bold text-slate-300">{monthLabel}</p>
          </div>
        </div>
      </div>
      {/* Quick Summary */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[9px] font-black text-primary uppercase tracking-wider mb-2">💡 Quick Summary</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Total Income</p>
            <p className="text-sm font-black text-green-400 font-mono">₹{Number(data.total).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Transactions</p>
            <p className="text-sm font-black text-white">{data.count}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Largest</p>
            <p className="text-sm font-black text-green-300 font-mono">₹{Number(data.largest).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Latest</p>
            <p className="text-sm font-black text-slate-200">{data.latestDate}</p>
          </div>
        </div>
      </div>
      {/* Transactions */}
      {data.recentTx.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 mt-1">Recent Income</p>
          <div>{data.recentTx.map((t: any) => <KpiTxRow key={t.id} t={t} amountColor="text-green-400" />)}</div>
        </div>
      )}
      {/* Footer */}
      <button
        onClick={() => navigate('/transactions')}
        className="w-full py-2.5 text-[10px] font-black text-primary hover:text-white hover:bg-primary/20 transition-colors border-t border-slate-700/60 tracking-wider uppercase"
      >
        View All Income →
      </button>
    </KpiPanelWrapper>
  );
}

// ─── Expenses Preview Panel ───────────────────────────────────────────────────
function KpiExpensesPanel({ data, monthLabel, navigate, onPanelMouseEnter, onPanelMouseLeave }: any) {
  if (!data) return null;
  return (
    <KpiPanelWrapper onPanelMouseEnter={onPanelMouseEnter} onPanelMouseLeave={onPanelMouseLeave}>
      <div className="bg-gradient-to-r from-red-900/60 to-rose-900/40 px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">💸</span>
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Expenses</p>
            <p className="text-xs font-bold text-slate-300">{monthLabel}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-2">
        <p className="text-[9px] font-black text-primary uppercase tracking-wider mb-2">💡 Quick Summary</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Total</p>
            <p className="text-sm font-black text-red-400 font-mono">₹{Number(data.total).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Transactions</p>
            <p className="text-sm font-black text-white">{data.count}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Largest</p>
            <p className="text-sm font-black text-red-300 font-mono">₹{Number(data.largest).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Avg / Tx</p>
            <p className="text-sm font-black text-slate-200 font-mono">₹{Math.round(data.avg || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Top Method</p>
            <p className="text-xs font-black text-amber-300">{data.topMethod}</p>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Highest Day</p>
            <p className="text-xs font-black text-orange-300">{data.highestDay}</p>
          </div>
        </div>
      </div>
      {data.recentTx.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 mt-1">Recent Expenses</p>
          <div>{data.recentTx.map((t: any) => <KpiTxRow key={t.id} t={t} amountColor="text-red-400" />)}</div>
        </div>
      )}
      <button
        onClick={() => navigate('/transactions')}
        className="w-full py-2.5 text-[10px] font-black text-primary hover:text-white hover:bg-primary/20 transition-colors border-t border-slate-700/60 tracking-wider uppercase"
      >
        View All Expenses →
      </button>
    </KpiPanelWrapper>
  );
}

// ─── Savings Preview Panel ────────────────────────────────────────────────────
function KpiSavingsPanel({ data, monthLabel, navigate, onPanelMouseEnter, onPanelMouseLeave }: any) {
  if (!data) return null;
  return (
    <KpiPanelWrapper onPanelMouseEnter={onPanelMouseEnter} onPanelMouseLeave={onPanelMouseLeave}>
      <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/40 px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏦</span>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Savings</p>
            <p className="text-xs font-bold text-slate-300">{monthLabel}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-2">
        <p className="text-[9px] font-black text-primary uppercase tracking-wider mb-2">💡 Quick Summary</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Total Saved</p>
            <p className="text-sm font-black text-blue-400 font-mono">₹{Number(data.total).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-400 font-semibold">Transactions</p>
            <p className="text-sm font-black text-white">{data.count}</p>
          </div>
        </div>
        {data.cats.length > 0 && (
          <>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">By Category</p>
            <div className="space-y-1.5">
              {data.cats.map(([cat, amt]: [string, number]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold truncate max-w-[150px]">{cat}</span>
                  </div>
                  <span className="text-xs font-black text-blue-300 font-mono shrink-0">₹{Number(amt).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => navigate('/records')}
        className="w-full py-2.5 text-[10px] font-black text-primary hover:text-white hover:bg-primary/20 transition-colors border-t border-slate-700/60 tracking-wider uppercase"
      >
        View All Savings →
      </button>
    </KpiPanelWrapper>
  );
}

// ─── Available Balance Preview Panel ─────────────────────────────────────────
function KpiBalancePanel({ data, unpaidBillsSum, forecastedBalance, monthLabel, onPanelMouseEnter, onPanelMouseLeave }: any) {
  if (!data) return null;
  return (
    <KpiPanelWrapper onPanelMouseEnter={onPanelMouseEnter} onPanelMouseLeave={onPanelMouseLeave}>
      <div className="bg-gradient-to-r from-purple-900/60 to-violet-900/40 px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Available Balance</p>
            <p className="text-xs font-bold text-slate-300">{monthLabel}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-3">
        {/* Balance Breakdown */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Income</span>
            <span className="text-xs font-black text-green-400 font-mono">+₹{Number(data.income).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Expenses</span>
            <span className="text-xs font-black text-red-400 font-mono">−₹{Number(data.expenses).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Savings</span>
            <span className="text-xs font-black text-blue-400 font-mono">−₹{Number(data.savings).toLocaleString('en-IN')}</span>
          </div>
          {unpaidBillsSum > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Unpaid Bills</span>
              <span className="text-xs font-black text-amber-400 font-mono">−₹{Number(unpaidBillsSum).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="border-t border-dashed border-slate-700 pt-2 flex justify-between items-center">
            <span className="text-xs font-black text-slate-200">Balance</span>
            <span className={`text-sm font-black font-mono ${data.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{Number(data.balance).toLocaleString('en-IN')}</span>
          </div>
          {unpaidBillsSum > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-amber-400 font-bold">Forecasted Balance</span>
              <span className="text-xs font-black text-amber-300 font-mono">₹{Number(forecastedBalance).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
        {/* Recent Transactions */}
        {data.recentTx?.length > 0 && (
          <>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Recent Activity</p>
            <div>{data.recentTx.map((t: any) => <KpiTxRow key={t.id} t={t} amountColor={t.type === 'income' ? 'text-green-400' : 'text-red-400'} />)}</div>
          </>
        )}
      </div>
    </KpiPanelWrapper>
  );
}

// ─── Net Balance Preview Panel ────────────────────────────────────────────────
function KpiNetBalancePanel({ data, monthLabel, onPanelMouseEnter, onPanelMouseLeave }: any) {
  if (!data) return null;
  const maxNet = data.trend ? Math.max(...data.trend.map((d: any) => Math.abs(d.net)), 1) : 1;
  return (
    <KpiPanelWrapper onPanelMouseEnter={onPanelMouseEnter} onPanelMouseLeave={onPanelMouseLeave}>
      <div className="bg-gradient-to-r from-cyan-900/60 to-teal-900/40 px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Net Balance</p>
            <p className="text-xs font-bold text-slate-300">{monthLabel}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-3">
        {/* Calculation */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold">Income</span>
            <span className="text-xs font-black text-green-400 font-mono">₹{Number(data.income).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold">− Expenses</span>
            <span className="text-xs font-black text-red-400 font-mono">₹{Number(data.expenses).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold">− Savings</span>
            <span className="text-xs font-black text-blue-400 font-mono">₹{Number(data.savings).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-dashed border-slate-700 pt-1.5 flex justify-between items-center">
            <span className="text-xs font-black text-white">Net Balance</span>
            <span className={`text-sm font-black font-mono ${data.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{Number(data.balance).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 6-Month Trend Bar Chart */}
        {data.trend && (
          <>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">6-Month Net Trend</p>
            <div className="flex items-end gap-1.5 h-16">
              {data.trend.map((d: any, i: number) => {
                const heightPct = Math.abs(d.net) / maxNet * 100;
                const isPos = d.net >= 0;
                const isCurrent = i === data.trend.length - 1;
                return (
                  <div key={d.month} className="flex flex-col items-center flex-1 gap-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrent ? (isPos ? 'bg-cyan-400' : 'bg-red-400') : (isPos ? 'bg-cyan-700/60' : 'bg-red-700/60')
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${d.month}: ₹${d.net.toLocaleString('en-IN')}`}
                    />
                    <span className={`text-[8px] font-bold ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}`}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </KpiPanelWrapper>
  );
}

function XIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Counting animation component
function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const duration = 750; // ms
    const startTime = performance.now();
    let animFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      
      setDisplayValue(current);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, [value]);

  return <>{prefix}{Math.round(displayValue).toLocaleString('en-IN')}</>;
}

interface InsightCardProps {
  item: any;
  index: number;
  getCategoryIcon: (name: string) => string;
}

function InsightCard({ item, index, getCategoryIcon }: InsightCardProps) {
  const prevMonthTotal = item.prevMonthTotal || 0;
  const notEnoughHistory = item.notEnoughHistory;

  // 1. Redesign Badge logic based on the 4 cases:
  let badgeColorClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
  let badgeText = 'NEW';

  if (notEnoughHistory) {
    // Case 4: Insufficient history
    badgeText = 'No Data';
    badgeColorClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
  } else if (prevMonthTotal === 0) {
    // Case 1: Previous month was zero
    badgeText = 'First Month';
    badgeColorClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
  } else if (item.difference > 0) {
    // Case 2: Spending increased
    badgeText = `+₹${Math.round(item.difference)} ↑${Math.round(item.pctChange)}%`;
    badgeColorClass = item.type === 'savings'
      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
      : 'bg-red-500/10 text-red-500 border border-red-500/20';
  } else if (item.difference < 0) {
    // Case 3: Spending decreased
    badgeText = `-₹${Math.round(Math.abs(item.difference))} ↓${Math.round(Math.abs(item.pctChange))}%`;
    badgeColorClass = item.type === 'savings'
      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
      : 'bg-green-500/10 text-green-500 border border-green-500/20';
  } else {
    badgeText = 'No Change';
    badgeColorClass = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }

  const lineColor = badgeColorClass.includes('text-green-500') 
    ? '#10b981' 
    : badgeColorClass.includes('text-red-500') 
      ? '#ef4444' 
      : '#3b82f6';

  const lastMonthLabel = item.sparklineData[item.sparklineData.length - 1]?.month;

  // Format contextual label for average spending/savings
  const avgLabel = item.type === 'savings' 
    ? `Avg Saved: ₹${Math.round(item.avgMonthlySpend).toLocaleString('en-IN')}`
    : `Avg Spent: ₹${Math.round(item.avgMonthlySpend).toLocaleString('en-IN')}`;

  return (
    <div 
      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl w-[285px] h-[265px] flex-shrink-0 flex flex-col justify-between hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-lg dark:hover:bg-slate-900/60 dark:hover:border-slate-750 transition-all duration-250 ease-out cursor-grab active:cursor-grabbing animate-slide-up relative overflow-hidden group select-none"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Top row: Icon and Badge */}
      <div className="flex justify-between items-center w-full">
        <span className="text-2xl p-2 bg-slate-50 dark:bg-slate-900 rounded-xl flex-shrink-0" role="img" aria-label={item.name}>
          {getCategoryIcon(item.name)}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 transition-transform group-hover:scale-105 duration-200 ${badgeColorClass}`}>
          {badgeText}
        </span>
      </div>

      {/* Middle Section: Category Name & Current Month Total */}
      <div className="mt-3 space-y-1 flex-1">
        <h4 
          className="text-xs font-black text-slate-400 uppercase tracking-wider line-clamp-1 flex items-center cursor-help"
          title={item.name}
        >
          {item.name}
        </h4>
        <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
          ₹<AnimatedNumber value={item.currMonthTotal} />
        </p>
      </div>

      {/* Stats details section */}
      <div className="mt-2 space-y-1 text-[10px] font-bold text-slate-500">
        <div className="flex justify-between">
          <span>Last Month: <span className="text-slate-750 dark:text-slate-300 font-mono">₹{Math.round(prevMonthTotal).toLocaleString('en-IN')}</span></span>
          <span className="text-purple-400 font-extrabold">{item.txCount || 0} Tx</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-medium">{avgLabel}</span>
          {item.lastTransactionDay && (
            <span className="text-slate-400 font-medium">Last: {item.lastTransactionDay}</span>
          )}
        </div>
      </div>

      {/* Mini Sparkline anchored to the bottom */}
      <div className="w-full h-12 mt-2 -mx-5 -mb-5 relative overflow-hidden rounded-b-2xl self-end shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={item.sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke={lineColor} 
              strokeWidth={1.8} 
              fill={`url(#gradient-${item.id})`}
              dot={({ payload, cx, cy }) => {
                if (payload.month === lastMonthLabel) {
                  return <circle cx={cx} cy={cy} r={3.5} fill={lineColor} stroke={lineColor} strokeWidth={1} />;
                }
                return null;
              }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '10px', color: '#fff', padding: '4px 8px' }} 
              formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, '']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
