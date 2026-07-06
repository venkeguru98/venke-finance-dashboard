import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Plus, Search, RefreshCw, Calendar, Flame, LayoutGrid, CheckCircle2, Target, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#F97316'];

// Default widget visibility states
const DEFAULT_WIDGETS = {
  summaryCards: true,
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

  // Modals inside Dashboard for Quick Actions
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txFormType, setTxFormType] = useState<'income' | 'expense'>('expense');
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
      const [chartsRes, txRes, budgetsRes, goalsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/analytics/charts`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/budgets`),
        axios.get(`${API}/goals`),
        axios.get(`${API}/categories`)
      ]);
      setMonthlyData(chartsRes.data.monthly || []);
      setCategoryData(chartsRes.data.categories || []);
      setTransactions(txRes.data || []);
      setBudgets(budgetsRes.data || []);
      setGoals(goalsRes.data || []);
      setCategories(categoriesRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError('Could not connect to the server. Make sure the backend is running on port 5000.');
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

      {/* MONTH-OVER-MONTH COMPARISON WIDGET */}
      {widgets.momWidget && (
        <MonthOverMonthComparisonWidget data={totalsData} navigate={navigate} />
      )}

      {/* QUICK ACTIONS ROW */}
      {widgets.quickActions && (
        <div className="bg-white dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => { setTxFormType('income'); setIsAddTxOpen(true); }} className="flex items-center space-x-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl transition shadow-sm">
              <Plus className="w-4 h-4" /> <span>Add Income</span>
            </button>
            <button onClick={() => { setTxFormType('expense'); setIsAddTxOpen(true); }} className="flex items-center space-x-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition shadow-sm">
              <Plus className="w-4 h-4" /> <span>Add Expense</span>
            </button>
            <a href="/budgets" className="flex items-center space-x-1.5 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl transition shadow-sm">
              <Plus className="w-4 h-4" /> <span>Create Budget</span>
            </a>
            <a href="/goals" className="flex items-center space-x-1.5 text-xs font-bold bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl transition shadow-sm">
              <Plus className="w-4 h-4" /> <span>Create Goal</span>
            </a>
            <button onClick={() => alert('Feature coming soon in multi-account sync!')} className="flex items-center space-x-1.5 text-xs font-bold bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl transition shadow-sm">
              <span>Transfer Money</span>
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS WIDGET */}
      {widgets.summaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          <SummaryCard
            title="Monthly Income"
            amount={totalsData.current.income}
            pctChange={totalsData.pctChange.income}
            sparklineData={getSparklineData('income')}
            color="text-green-500"
            bg="bg-green-500"
            tooltipContent={[
              `Current Month Income: ₹${totalsData.current.income.toLocaleString()}`,
              `Last Month Income: ₹${totalsData.previous.income.toLocaleString()}`,
              `MoM Change: ${totalsData.pctChange.income.toFixed(1)}%`
            ]}
          />
          <SummaryCard
            title="Monthly Expenses"
            amount={totalsData.current.expenses}
            pctChange={totalsData.pctChange.expenses}
            sparklineData={getSparklineData('expense')}
            color="text-red-500"
            bg="bg-red-500"
            inverseTrend
            tooltipContent={[
              `Current Month Spend: ₹${totalsData.current.expenses.toLocaleString()}`,
              `Last Month Spend: ₹${totalsData.previous.expenses.toLocaleString()}`,
              `MoM Change: ${totalsData.pctChange.expenses.toFixed(1)}%`
            ]}
          />
          <SummaryCard
            title="Monthly Savings"
            amount={totalsData.current.savings}
            pctChange={totalsData.pctChange.savings}
            sparklineData={getSparklineData('savings')}
            color={totalsData.pctChange.savings >= 0 ? "text-green-500" : "text-red-500"}
            bg={totalsData.pctChange.savings >= 0 ? "bg-green-500" : "bg-red-500"}
            tooltipContent={[
              `Current Month Savings: ₹${totalsData.current.savings.toLocaleString()}`,
              `Last Month Savings: ₹${totalsData.previous.savings.toLocaleString()}`,
              `MoM Change: ${totalsData.pctChange.savings.toFixed(1)}%`
            ]}
          />
          <SummaryCard
            title="Available Balance"
            amount={availableBalance}
            pctChange={totalsData.pctChange.balance}
            sparklineData={getSparklineData('balance')}
            color={availableColor}
            bg={availableBg}
            tooltipContent={[
              `Monthly Income:      ₹${totalsData.current.income.toLocaleString('en-IN')}`,
              `− Expenses:          ₹${totalsData.current.expenses.toLocaleString('en-IN')}`,
              `− Monthly Savings:   ₹${totalsData.current.savings.toLocaleString('en-IN')}`,
              `────────────────────────────`,
              `Available Balance:   ₹${availableBalance.toLocaleString('en-IN')}`
            ]}
          >
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Income</span>
                <span className="text-slate-900 dark:text-white font-bold">₹{totalsData.current.income.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Expenses</span>
                <span className="text-red-400 font-bold">-₹{totalsData.current.expenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Savings</span>
                <span className="text-blue-400 font-bold">-₹{totalsData.current.savings.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>
              <div className={`text-center font-extrabold mt-1 text-[10px] py-0.5 rounded ${statusBadgeBg} ${statusBadgeText}`}>
                {totalsData.current.income === 0 ? (
                  "Add income to start tracking"
                ) : availableBalance >= 0 ? (
                  `Available: ₹${availableBalance.toLocaleString('en-IN')}`
                ) : (
                  `Overspent: -₹${Math.abs(availableBalance).toLocaleString('en-IN')}`
                )}
              </div>
            </div>
          </SummaryCard>
          <SummaryCard
            title="Net Balance"
            amount={totalsData.current.balance}
            pctChange={totalsData.pctChange.balance}
            sparklineData={getSparklineData('balance')}
            color={availableColor}
            bg={availableBg}
            tooltipContent={[
              `Monthly Income:      ₹${totalsData.current.income.toLocaleString('en-IN')}`,
              `− Expenses:          ₹${totalsData.current.expenses.toLocaleString('en-IN')}`,
              `− Monthly Savings:   ₹${totalsData.current.savings.toLocaleString('en-IN')}`,
              `────────────────────────────`,
              `Net Balance:         ₹${totalsData.current.balance.toLocaleString('en-IN')}`
            ]}
          >
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Income</span>
                <span className="text-slate-900 dark:text-white font-bold">₹{totalsData.current.income.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Expenses</span>
                <span className="text-red-400 font-bold">-₹{totalsData.current.expenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Savings</span>
                <span className="text-blue-400 font-bold">-₹{totalsData.current.savings.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>
              <div className={`text-center font-extrabold mt-1 text-[10px] py-0.5 rounded ${statusBadgeBg} ${statusBadgeText}`}>
                {totalsData.current.income === 0 ? (
                  "Add income to start tracking"
                ) : totalsData.current.balance >= 0 ? (
                  `Net Balance: ₹${totalsData.current.balance.toLocaleString('en-IN')}`
                ) : (
                  `Net Deficit: -₹${Math.abs(totalsData.current.balance).toLocaleString('en-IN')}`
                )}
              </div>
            </div>
          </SummaryCard>
          <SummaryCard
            title="Savings Rate"
            amount={savingsRate}
            isPercentage
            pctChange={totalsData.pctChange.savingsRate}
            color="text-orange-500"
            bg="bg-orange-500"
            tooltipContent={[
              `Formula: (Income - Expenses) / Income`,
              `Current Savings Rate: ${savingsRate.toFixed(1)}%`,
              `Last Month Savings Rate: ${(totalsData.previous.income > 0 ? (totalsData.previous.balance / totalsData.previous.income) * 100 : 0).toFixed(1)}%`
            ]}
          />
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

function SummaryCard({ title, amount, pctChange, sparklineData, color, bg, isPercentage = false, inverseTrend = false, tooltipContent, children }: any) {
  const isPositive = pctChange >= 0;
  const isGood = inverseTrend ? !isPositive : isPositive;

  return (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bg} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
      
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

      {/* HOVER TOOLTIP OVERLAY */}
      {tooltipContent && (
        <div className="absolute inset-0 bg-slate-900/95 dark:bg-slate-950/98 text-white p-3.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl z-10">
          <p className="text-[10px] font-black text-primary uppercase tracking-wider">Calculations Details</p>
          <div className="text-[10px] space-y-0.5 font-semibold text-slate-350 leading-normal">
            {tooltipContent.map((line: string, idx: number) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
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
