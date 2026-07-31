import { useEffect, useState, lazy, Suspense } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Shield, Landmark, Bell, AlertTriangle, ChevronRight,
  TrendingUp, Coins, Wallet, CreditCard, ArrowUpRight, CheckCircle2, Layers, Activity
} from 'lucide-react';

// Lazy load sub-modules for extreme performance
const LicModule = lazy(() => import('../components/records/LicModule'));
const GoldModule = lazy(() => import('../components/records/GoldModule'));
const ChitModule = lazy(() => import('../components/records/ChitModule'));
const SavingsModule = lazy(() => import('../components/records/SavingsModule'));
const DebtModule = lazy(() => import('../components/records/DebtModule'));
const MutualModule = lazy(() => import('../components/records/MutualModule'));

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#635BFF', '#06B6D4', '#F59E0B', '#10B981', '#EC4899', '#EF4444', '#3B82F6'];

export default function FinancialRecords() {
  const [subView, setSubView] = useState<null | 'lic' | 'gold' | 'chit' | 'savings' | 'debt' | 'mutual'>(null);
  const [selectedCategory, setSelectedCategory] = useState<'lic' | 'gold' | 'chit' | 'savings' | 'debt' | 'mutual'>('mutual');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'assets' | 'liabilities' | 'investments'>('all');

  const [dashboardData, setDashboardData] = useState<any>({
    stats: {
      activeLicPolicies: 0,
      licPremiumDue: 0,
      digitalGoldInvested: 0,
      runningChitFunds: 0,
      upcomingChitPayments: 0,
      offlineSavingsBalance: 0,
      outstandingDebt: 0,
      receivableAmount: 0,
      mutualFundsValue: 0
    },
    reminders: [],
    charts: {
      licYearly: [],
      goldYearly: [],
      chitProgress: [],
      savingsBalances: []
    },
    timeline: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/dashboard`);
      setDashboardData(res.data || {
        stats: {
          activeLicPolicies: 0,
          licPremiumDue: 0,
          digitalGoldInvested: 0,
          runningChitFunds: 0,
          upcomingChitPayments: 0,
          offlineSavingsBalance: 0,
          outstandingDebt: 0,
          receivableAmount: 0,
          mutualFundsValue: 0
        },
        reminders: [],
        charts: {
          licYearly: [],
          goldYearly: [],
          chitProgress: [],
          savingsBalances: []
        },
        timeline: []
      });
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subView === null) {
      fetchDashboardData();
    }
  }, [subView]);

  if (subView !== null) {
    return (
      <Suspense fallback={<div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider">Loading record module...</div>}>
        {subView === 'lic' && <LicModule onBack={() => setSubView(null)} />}
        {subView === 'gold' && <GoldModule onBack={() => setSubView(null)} />}
        {subView === 'chit' && <ChitModule onBack={() => setSubView(null)} />}
        {subView === 'savings' && <SavingsModule onBack={() => setSubView(null)} />}
        {subView === 'debt' && <DebtModule onBack={() => setSubView(null)} />}
        {subView === 'mutual' && <MutualModule onBack={() => setSubView(null)} />}
      </Suspense>
    );
  }

  const { stats, reminders, charts, timeline } = dashboardData;

  // Record Master Definitions
  const recordCategories = [
    {
      id: 'mutual' as const,
      title: 'Mutual Funds & SIPs',
      group: 'investments',
      code: '# REC-MUTUAL',
      amount: stats.mutualFundsValue || 0,
      amountLabel: `₹${(stats.mutualFundsValue || 0).toLocaleString('en-IN')}`,
      subtext: 'Lump-sum & SIP growth portfolio',
      badge: 'Active Portfolio',
      icon: TrendingUp,
      color: '#8B5CF6', // Purple
      accentBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'lic' as const,
      title: 'LIC Life Insurance Policies',
      group: 'assets',
      code: '# REC-LIC',
      amount: stats.licPremiumDue || 0,
      amountLabel: `${stats.activeLicPolicies} Active Policies`,
      subtext: `Premium Due: ₹${stats.licPremiumDue.toLocaleString('en-IN')}`,
      badge: 'Life Cover',
      icon: Shield,
      color: '#06B6D4', // Cyan
      accentBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'gold' as const,
      title: 'Digital & Physical Gold',
      group: 'assets',
      code: '# REC-GOLD',
      amount: stats.digitalGoldInvested || 0,
      amountLabel: `₹${stats.digitalGoldInvested.toLocaleString('en-IN')}`,
      subtext: 'Holdings log & purchase history',
      badge: 'Precious Metals',
      icon: Coins,
      color: '#F59E0B', // Amber
      accentBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    },
    {
      id: 'savings' as const,
      title: 'Offline Bank & Cash Accounts',
      group: 'assets',
      code: '# REC-SAVINGS',
      amount: stats.offlineSavingsBalance || 0,
      amountLabel: `₹${stats.offlineSavingsBalance.toLocaleString('en-IN')}`,
      subtext: 'Bank balances & cash registries',
      badge: 'Liquid Reserves',
      icon: Wallet,
      color: '#3B82F6', // Blue
      accentBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'debt' as const,
      title: 'Debt & Receivables Manager',
      group: 'liabilities',
      code: '# REC-DEBT',
      amount: stats.outstandingDebt || 0,
      amountLabel: `Debt: ₹${stats.outstandingDebt.toLocaleString('en-IN')}`,
      subtext: `Receivable: ₹${stats.receivableAmount.toLocaleString('en-IN')}`,
      badge: 'Loans & Claims',
      icon: CreditCard,
      color: '#EF4444', // Red
      accentBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    {
      id: 'chit' as const,
      title: 'Chit Funds Registry',
      group: 'investments',
      code: '# REC-CHIT',
      amount: stats.runningChitFunds || 0,
      amountLabel: `${stats.runningChitFunds} Active Chits`,
      subtext: 'Installments & dividend schedules',
      badge: 'Recurring Chit',
      icon: Landmark,
      color: '#10B981', // Emerald
      accentBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  ];

  const filteredCategories = recordCategories.filter(cat => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'assets') return cat.group === 'assets';
    if (categoryFilter === 'liabilities') return cat.group === 'liabilities';
    if (categoryFilter === 'investments') return cat.group === 'investments';
    return true;
  });

  const activeRecordObj = recordCategories.find(c => c.id === selectedCategory) || recordCategories[0];

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-300">
      {/* FINNOVA SaaS HEADER */}
      <div className="bg-[#0B0F19] p-6 rounded-3xl border border-[#1E2638] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#635BFF]/15 border border-[#635BFF]/30 text-[#635BFF]">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Financial Records Hub</h1>
            <span className="text-[10px] font-black text-[#635BFF] bg-[#635BFF]/15 px-2.5 py-0.5 rounded-full border border-[#635BFF]/30 uppercase tracking-wider">
              Finnova ERP
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium max-w-xl">
            Centralized registry for long-term assets, liabilities, mutual funds, insurance policies, gold holdings, and offline accounts.
          </p>
        </div>

        {/* TOP FILTER TABS */}
        <div className="flex items-center space-x-1.5 p-1 bg-[#121826] border border-[#1E2638] rounded-2xl z-10 self-start md:self-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              categoryFilter === 'all'
                ? 'bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            All Records ({recordCategories.length})
          </button>
          <button
            onClick={() => setCategoryFilter('assets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              categoryFilter === 'assets'
                ? 'bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setCategoryFilter('liabilities')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              categoryFilter === 'liabilities'
                ? 'bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Liabilities
          </button>
          <button
            onClick={() => setCategoryFilter('investments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              categoryFilter === 'investments'
                ? 'bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Investments
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#635BFF] border-t-transparent rounded-full animate-spin"></div>
          <p>Loading Financial Records Hub...</p>
        </div>
      ) : (
        <>
          {/* SMART REMINDERS & NOTIFICATIONS */}
          {reminders.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> Smart Alerts & Reminders ({reminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reminders.map((rem: string, idx: number) => (
                  <div key={idx} className="p-3.5 bg-[#0B0F19]/80 border border-amber-500/25 rounded-2xl flex items-start space-x-3 text-xs text-amber-300 shadow-xl shadow-amber-500/5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="font-bold leading-normal">{rem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP METRIC CARDS ROW (FINNOVA STYLE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Mutual Funds */}
            <div className="bg-[#0B0F19] p-5 rounded-3xl border border-[#1E2638] shadow-xl relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mutual Funds & SIPs</span>
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight">₹{(stats.mutualFundsValue || 0).toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    Wealth Growth
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Active Portfolios</span>
                </div>
              </div>
            </div>

            {/* Metric 2: LIC Policies */}
            <div className="bg-[#0B0F19] p-5 rounded-3xl border border-[#1E2638] shadow-xl relative overflow-hidden group hover:border-[#06B6D4]/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active LIC Cover</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight">{stats.activeLicPolicies} <span className="text-xs font-semibold text-slate-400">Policies</span></p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                    Due: ₹{stats.licPremiumDue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Life Cover</span>
                </div>
              </div>
            </div>

            {/* Metric 3: Digital Gold */}
            <div className="bg-[#0B0F19] p-5 rounded-3xl border border-[#1E2638] shadow-xl relative overflow-hidden group hover:border-[#F59E0B]/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital Gold</span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight">₹{stats.digitalGoldInvested.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Precious Asset
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Hedge Reserve</span>
                </div>
              </div>
            </div>

            {/* Metric 4: Offline Balance & Debt */}
            <div className="bg-[#0B0F19] p-5 rounded-3xl border border-[#1E2638] shadow-xl relative overflow-hidden group hover:border-[#635BFF]/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Offline & Liabilities</span>
                <div className="p-2 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 text-[#635BFF]">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight">₹{stats.offlineSavingsBalance.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    Debt: ₹{stats.outstandingDebt.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Rec: ₹{stats.receivableAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CORE FINNOVA MASTER-DETAIL INTERACTIVE PANEL */}
          <div className="bg-[#0B0F19] border border-[#1E2638] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E2638]">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Record Inspector & Module Registry</span>
                  <span className="text-[10px] font-black text-[#635BFF] bg-[#635BFF]/15 px-2 py-0.5 rounded-md border border-[#635BFF]/30 uppercase">
                    Split-Pane Inspector
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Select any financial record category on the left to inspect metrics and trigger management tools.</p>
              </div>

              <div className="text-[10px] font-bold text-slate-400 bg-[#121826] px-3 py-1.5 rounded-xl border border-[#1E2638] flex items-center gap-1.5 self-start sm:self-auto">
                <Activity className="w-3.5 h-3.5 text-[#635BFF]" />
                <span>Showing {filteredCategories.length} Categories</span>
              </div>
            </div>

            {/* SPLIT-PANE CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT MASTER NAVIGATION LIST (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-1">Financial Record Master List</p>
                
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredCategories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const IconComp = cat.icon;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative flex items-center justify-between group ${
                          isSelected
                            ? 'bg-[#181F33] border-[#635BFF] shadow-lg shadow-[#635BFF]/10 ring-1 ring-[#635BFF]/40'
                            : 'bg-[#121826]/70 border-[#1E2638] hover:bg-[#181F33]/60 hover:border-slate-700'
                        }`}
                      >
                        {/* Selected Indicator Strip */}
                        {isSelected && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#635BFF] rounded-r-full shadow-md shadow-[#635BFF]" />
                        )}

                        <div className="flex items-center space-x-3.5 truncate pl-1">
                          <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${cat.accentBg}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-xs font-extrabold truncate transition-colors ${
                                isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                              }`}>
                                {cat.title}
                              </h3>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">{cat.subtext}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs font-black font-mono text-white block">{cat.amountLabel}</span>
                          <span className={`text-[9px] font-black uppercase tracking-wider block mt-0.5 ${
                            isSelected ? 'text-[#635BFF]' : 'text-slate-500'
                          }`}>
                            {cat.badge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT DETAIL INSPECTOR PANE (lg:col-span-7) */}
              <div className="lg:col-span-7 bg-[#121826]/90 border border-[#1E2638] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
                {/* Header banner inside detail pane */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1E2638] pb-4 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider uppercase">{activeRecordObj.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${activeRecordObj.accentBg}`}>
                          {activeRecordObj.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1">{activeRecordObj.title}</h3>
                    </div>

                    <button
                      onClick={() => setSubView(activeRecordObj.id)}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-[#635BFF] hover:bg-[#5249FF] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#635BFF]/25 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                    >
                      <span>Manage Module</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Metric Display */}
                  <div className="bg-[#0B0F19] p-5 rounded-2xl border border-[#1E2638] space-y-4">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Primary Record Metric</p>
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <p className="text-3xl font-black text-white font-mono tracking-tight">{activeRecordObj.amountLabel}</p>
                      <span className="text-xs font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active Ledger
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Category Specific Inspector Details */}
                  {selectedCategory === 'mutual' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Asset Class</span>
                        <span className="font-extrabold text-purple-400 text-sm">Equity & SIP Growth</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Valuation Source</span>
                        <span className="font-extrabold text-white text-sm">Live Portfolio NAV</span>
                      </div>
                    </div>
                  )}

                  {selectedCategory === 'lic' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Policies</span>
                        <span className="font-extrabold text-cyan-400 text-sm">{stats.activeLicPolicies} Registered Policies</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Upcoming Premium Due</span>
                        <span className="font-extrabold text-white text-sm font-mono">₹{stats.licPremiumDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {selectedCategory === 'gold' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Gold Holdings</span>
                        <span className="font-extrabold text-amber-400 text-sm">Digital & Vault Gold</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Asset Purpose</span>
                        <span className="font-extrabold text-white text-sm">Inflation Hedge & Wealth</span>
                      </div>
                    </div>
                  )}

                  {selectedCategory === 'savings' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Offline Balances</span>
                        <span className="font-extrabold text-blue-400 text-sm font-mono">₹{stats.offlineSavingsBalance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Liquidity Status</span>
                        <span className="font-extrabold text-emerald-400 text-sm">Immediate Available</span>
                      </div>
                    </div>
                  )}

                  {selectedCategory === 'debt' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding Debt</span>
                        <span className="font-extrabold text-rose-400 text-sm font-mono">₹{stats.outstandingDebt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Receivable Claims</span>
                        <span className="font-extrabold text-emerald-400 text-sm font-mono">₹{stats.receivableAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {selectedCategory === 'chit' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Running Chits</span>
                        <span className="font-extrabold text-emerald-400 text-sm">{stats.runningChitFunds} Active Groups</span>
                      </div>
                      <div className="p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2638] space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Yield Dividend</span>
                        <span className="font-extrabold text-purple-400 text-sm">Auction Dividend Active</span>
                      </div>
                    </div>
                  )}

                  {/* Operational Notes */}
                  <div className="p-4 bg-[#0B0F19]/60 border border-[#1E2638] rounded-2xl text-[11px] text-slate-400 font-medium space-y-1">
                    <p className="font-bold text-slate-200">📌 Finnova Registry Insights:</p>
                    <p>Click <strong className="text-white">"Manage Module"</strong> above to view complete transaction logs, add new policy or investment records, track dividends, or record offline bank account deposits.</p>
                  </div>
                </div>

                {/* Bottom Inspector Action Bar */}
                <div className="pt-4 border-t border-[#1E2638] flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Selected: <strong className="text-white">{activeRecordObj.title}</strong></span>
                  <button
                    onClick={() => setSubView(activeRecordObj.id)}
                    className="text-[#635BFF] hover:text-[#8B84FF] font-extrabold flex items-center gap-1 transition-colors"
                  >
                    <span>Open Detailed View</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: LIC & Gold Growth */}
            <div className="bg-[#0B0F19] border border-[#1E2638] p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2638] pb-3">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Yearly LIC & Gold Contributions</h3>
                <div className="flex items-center space-x-3 text-[10px] font-bold">
                  <span className="flex items-center text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500 mr-1"></span> LIC</span>
                  <span className="flex items-center text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span> Gold</span>
                </div>
              </div>
              <div className="h-56">
                {charts.licYearly.length === 0 && charts.goldYearly.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No contribution records to plot.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.licYearly.map((l: any) => {
                      const goldMatch = charts.goldYearly.find((g: any) => g.year === l.year);
                      return {
                        year: String(l.year),
                        LIC: l.total,
                        Gold: goldMatch ? goldMatch.total : 0
                      };
                    })}>
                      <XAxis dataKey="year" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e2638', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Bar dataKey="LIC" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gold" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Savings Share Pie */}
            <div className="bg-[#0B0F19] border border-[#1E2638] p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider border-b border-[#1E2638] pb-3">Offline Accounts Balance Share</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                <div className="h-56 sm:col-span-2">
                  {charts.savingsBalances.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No accounts found.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.savingsBalances}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="balance"
                        >
                          {charts.savingsBalances.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e2638', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {charts.savingsBalances.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2.5 text-[10px] p-2 bg-[#121826] rounded-xl border border-[#1E2638]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }} />
                      <div className="truncate flex-1">
                        <p className="font-bold text-white truncate">{entry.name}</p>
                        <p className="font-bold text-[9px] text-[#635BFF] font-mono">₹{entry.balance.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE AND RECENT ACTIVITY SECTION */}
          <div className="bg-[#0B0F19] border border-[#1E2638] p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider border-b border-[#1E2638] pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#635BFF]" /> Recent Hub Activities
            </h3>
            {timeline.length === 0 ? (
              <p className="text-slate-500 text-xs py-6 text-center font-semibold">No recent activities found in the ledger.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item: any, idx: number) => {
                  const isLic = item.type === 'lic';
                  const isGold = item.type === 'gold';
                  const isChit = item.type === 'chit';

                  const badgeColor = 
                    isLic ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    isGold ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    isChit ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20';

                  return (
                    <div key={idx} className="p-3.5 bg-[#121826] border border-[#1E2638] rounded-2xl flex items-center justify-between gap-3 text-xs hover:border-[#635BFF]/30 transition-all duration-200">
                      <div className="flex items-center space-x-3 truncate">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider shrink-0 ${badgeColor}`}>
                          {item.type}
                        </span>
                        <div className="truncate">
                          <p className="font-extrabold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{item.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-black text-white">₹{item.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
