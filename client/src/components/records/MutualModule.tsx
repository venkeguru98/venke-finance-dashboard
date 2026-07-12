import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, ChevronRight, Trash
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Line
} from 'recharts';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const PIE_COLORS = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

interface MutualModuleProps {
  onBack: () => void;
}

export default function MutualModule({ onBack }: MutualModuleProps) {
  const [funds, setFunds] = useState<any[]>([]);
  const [activeFund, setActiveFund] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'SIP' | 'Lumpsum' | 'Redeemed' | 'Active'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'highest_return' | 'lowest_return' | 'latest_investment' | 'highest_investment'>('name');

  // Modals / Forms
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState<any | null>(null);
  const [fundForm, setFundForm] = useState({
    fund_name: '',
    category: 'Small Cap',
    fund_house: '',
    expense_ratio: '0.5',
    benchmark: 'Nifty Smallcap 250',
    risk_level: 'Very High',
    launch_year: '2015',
    notes: '',
    current_nav: '100.00'
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'SIP',
    amount: '',
    nav: '',
    units: '',
    remarks: ''
  });

  // Projection / Simulation inputs
  const [projSIP, setProjSIP] = useState(5000);
  const [projReturn, setProjReturn] = useState(12);
  const [projPeriod, setProjPeriod] = useState(5);

  // Interactive Chart Range (1M, 3M, 6M, 1Y, 3Y, Since)
  const [chartRange, setChartRange] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | 'Since'>('Since');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const fetchFunds = async (selectId?: number) => {
    try {
      const res = await axios.get(`${API}/records/mutual-funds`);
      const list = res.data || [];
      setFunds(list);
      if (list.length > 0) {
        const nextActive = selectId 
          ? list.find((f: any) => f.id === selectId) 
          : (activeFund ? list.find((f: any) => f.id === activeFund.id) : null);
        
        const selected = nextActive || list[0];
        setActiveFund(selected);
        fetchTransactions(selected.id);
      } else {
        setActiveFund(null);
        setTransactions([]);
      }
    } catch (_) {
      alert('Error fetching Mutual Funds data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (fundId: number) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/records/mutual-funds/${fundId}/transactions`);
      setTransactions(res.data || []);
      setCurrentPage(1);
    } catch (_) {
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const handleSelectFund = (f: any) => {
    setActiveFund(f);
    setIsDetailCollapsed(false);
    fetchTransactions(f.id);
  };

  // Fund Submit
  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFund) {
        await axios.put(`${API}/records/mutual-funds/${editingFund.id}`, fundForm);
        alert('Mutual Fund details updated!');
        fetchFunds(editingFund.id);
      } else {
        const res = await axios.post(`${API}/records/mutual-funds`, fundForm);
        alert('New Mutual Fund investment account added!');
        fetchFunds(res.data.id);
      }
      setShowFundModal(false);
    } catch (_) {
      alert('Failed to save Mutual Fund.');
    }
  };

  const handleOpenAddFund = () => {
    setEditingFund(null);
    setFundForm({
      fund_name: '',
      category: 'Small Cap',
      fund_house: '',
      expense_ratio: '0.5',
      benchmark: 'Nifty Smallcap 250',
      risk_level: 'Very High',
      launch_year: '2015',
      notes: '',
      current_nav: '100.00'
    });
    setShowFundModal(true);
  };

  const handleOpenEditFund = (f: any) => {
    setEditingFund(f);
    setFundForm({
      fund_name: f.fund_name,
      category: f.category,
      fund_house: f.fund_house,
      expense_ratio: String(f.expense_ratio || '0.5'),
      benchmark: f.benchmark || '',
      risk_level: f.risk_level || 'High',
      launch_year: String(f.launch_year || '2015'),
      notes: f.notes || '',
      current_nav: String(f.current_nav || '10.0')
    });
    setShowFundModal(true);
  };

  const handleDeleteFund = async (fundId: number) => {
    if (!confirm('Are you sure you want to delete this mutual fund? All associated transaction logs will be permanently deleted.')) return;
    try {
      await axios.delete(`${API}/records/mutual-funds/${fundId}`);
      fetchFunds();
    } catch (_) {
      alert('Error deleting mutual fund.');
    }
  };

  // Transaction Submit
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTx) {
        await axios.put(`${API}/records/mutual-funds/transactions/${editingTx.id}`, txForm);
      } else {
        await axios.post(`${API}/records/mutual-funds/${activeFund.id}/transactions`, txForm);
      }
      setShowTxModal(false);
      fetchFunds(activeFund.id);
    } catch (_) {
      alert('Error saving transaction.');
    }
  };

  const handleOpenAddTx = () => {
    setEditingTx(null);
    setTxForm({
      date: new Date().toISOString().split('T')[0],
      type: 'SIP',
      amount: '',
      nav: '',
      units: '',
      remarks: ''
    });
    setShowTxModal(true);
  };

  const handleOpenEditTx = (tx: any) => {
    setEditingTx(tx);
    setTxForm({
      date: tx.date.split('T')[0],
      type: tx.type,
      amount: String(tx.amount),
      nav: String(tx.nav),
      units: String(tx.units),
      remarks: tx.remarks || ''
    });
    setShowTxModal(true);
  };

  const handleDeleteTx = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this transaction entry?')) return;
    try {
      await axios.delete(`${API}/records/mutual-funds/transactions/${txId}`);
      fetchFunds(activeFund.id);
    } catch (_) {
      alert('Error deleting transaction.');
    }
  };

  // Auto calculate units or amount if one of them is updated in Tx form
  const handleTxFieldChange = (field: 'amount' | 'nav' | 'units', val: string) => {
    setTxForm(prev => {
      const next = { ...prev, [field]: val };
      const amount = Number(next.amount);
      const nav = Number(next.nav);
      const units = Number(next.units);

      if (field === 'amount' && nav > 0) {
        next.units = (amount / nav).toFixed(3);
      } else if (field === 'units' && nav > 0) {
        next.amount = (units * nav).toFixed(2);
      } else if (field === 'nav') {
        if (amount > 0) {
          next.units = (amount / nav).toFixed(3);
        } else if (units > 0) {
          next.amount = (units * nav).toFixed(2);
        }
      }
      return next;
    });
  };

  // Projection / Simulation calculations
  const calculateProjections = () => {
    if (!activeFund) return { conservative: 0, expected: 0, optimistic: 0, invested: 0 };
    const currentVal = activeFund.currentValue || 0;
    const rateCons = (projReturn - 3) / 100 / 12;
    const rateExp = projReturn / 100 / 12;
    const rateOpt = (projReturn + 3) / 100 / 12;
    const months = projPeriod * 12;

    const totalSIPInvested = projSIP * months;
    const totalInvested = activeFund.totalInvested + totalSIPInvested;

    // Conservative Future Value
    let fvCons = currentVal * Math.pow(1 + rateCons * 12, projPeriod);
    let fvSIPCons = projSIP * ((Math.pow(1 + rateCons, months) - 1) / rateCons) * (1 + rateCons);
    const conservative = fvCons + fvSIPCons;

    // Expected Future Value
    let fvExp = currentVal * Math.pow(1 + rateExp * 12, projPeriod);
    let fvSIPExp = projSIP * ((Math.pow(1 + rateExp, months) - 1) / rateExp) * (1 + rateExp);
    const expected = fvExp + fvSIPExp;

    // Optimistic Future Value
    let fvOpt = currentVal * Math.pow(1 + rateOpt * 12, projPeriod);
    let fvSIPOpt = projSIP * ((Math.pow(1 + rateOpt, months) - 1) / rateOpt) * (1 + rateOpt);
    const optimistic = fvOpt + fvSIPOpt;

    return {
      conservative: Math.round(conservative),
      expected: Math.round(expected),
      optimistic: Math.round(optimistic),
      invested: totalInvested
    };
  };

  const projections = calculateProjections();

  // Generate Growth Graph Data (computed from transaction history)
  const getGrowthGraphData = () => {
    if (transactions.length === 0 || !activeFund) return [];
    
    // Sort transactions oldest to newest
    const sorted = [...transactions].reverse();
    let accumulatedUnits = 0;
    let accumulatedInvestment = 0;
    const points: any[] = [];

    sorted.forEach(tx => {
      if (tx.type === 'SIP' || tx.type === 'Lumpsum') {
        accumulatedUnits += tx.units;
        accumulatedInvestment += tx.amount;
      } else {
        accumulatedUnits -= tx.units;
        accumulatedInvestment -= tx.amount;
      }

      const portfolioVal = accumulatedUnits * tx.nav;
      const profit = portfolioVal - accumulatedInvestment;

      points.push({
        date: tx.date.split('T')[0],
        nav: tx.nav,
        portfolioValue: Math.round(portfolioVal),
        profit: Math.round(profit),
        units: Number(accumulatedUnits.toFixed(3)),
        timestamp: new Date(tx.date).getTime()
      });
    });

    // Filter by selected time range
    if (chartRange === 'Since') return points;
    
    const cutoff = new Date();
    if (chartRange === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
    else if (chartRange === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
    else if (chartRange === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (chartRange === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);
    else if (chartRange === '3Y') cutoff.setFullYear(cutoff.getFullYear() - 3);

    return points.filter(p => p.timestamp >= cutoff.getTime());
  };

  const graphData = getGrowthGraphData();

  // Allocation Pie Chart Data
  const getAllocationData = () => {
    if (funds.length === 0) return [];
    const totalPortfolio = funds.reduce((sum, f) => sum + (f.currentValue || 0), 0);
    if (totalPortfolio === 0) return [];

    return funds.map(f => ({
      name: f.fund_name,
      value: Math.round(f.currentValue || 0),
      percentage: totalPortfolio > 0 ? (((f.currentValue || 0) / totalPortfolio) * 100).toFixed(1) : '0'
    }));
  };

  const allocationData = getAllocationData();

  // Monthly SIP Timeline logic (renders paid status for each month in the current year)
  const getSipTimeline = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    return months.map((m, idx) => {
      const isPaid = transactions.some(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() === currentYear && txDate.getMonth() === idx && t.type === 'SIP';
      });
      return { month: m, status: isPaid ? 'Paid' : 'Pending' };
    });
  };

  const sipTimeline = getSipTimeline();

  // Filtered & Sorted Funds
  const filteredFunds = funds
    .filter(f => {
      const matchesSearch = f.fund_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterType === 'All') return matchesSearch;
      if (filterType === 'Active') return matchesSearch && f.unitsHeld > 0;
      if (filterType === 'Redeemed') return matchesSearch && f.unitsHeld === 0 && f.transactionCount > 0;
      if (filterType === 'SIP') return matchesSearch && f.totalSips > 0;
      if (filterType === 'Lumpsum') return matchesSearch && f.totalSips === 0 && f.transactionCount > 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.fund_name.localeCompare(b.fund_name);
      if (sortBy === 'highest_return') return b.gainPct - a.gainPct;
      if (sortBy === 'lowest_return') return a.gainPct - b.gainPct;
      if (sortBy === 'highest_investment') return b.totalInvested - a.totalInvested;
      if (sortBy === 'latest_investment') return b.id - a.id;
      return 0;
    });

  // Paginated transactions
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const paginatedTransactions = transactions.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-350">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition group mb-1"
          >
            <span>&larr; Back to Records Hub</span>
          </button>
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Mutual Funds Portfolio</h1>
          <p className="text-xs text-slate-400 mt-1">Simulate, track, and log SIP and Lump-sum investments with scenario growth projection analyses.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddFund} variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs py-2 px-3 flex items-center gap-1.5 text-white">
            <Plus className="w-4 h-4" /> Add Fund
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading Mutual Funds Registry...</div>
      ) : funds.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No Mutual Funds added yet. Start by adding your first SIP or lump-sum investment.</p>
          <Button onClick={handleOpenAddFund} variant="primary" className="text-xs py-2.5 bg-purple-600 hover:bg-purple-700 text-white">
            Create Investment Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start transition-all duration-350">
          {/* LEFT PANEL: FUND LIST */}
          <div className={`space-y-3.5 transition-all duration-350 ${isDetailCollapsed ? 'lg:col-span-4' : 'lg:col-span-1'}`}>
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">Mutual Funds ({filteredFunds.length})</h2>
              
              {/* Search Bar */}
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search funds..."
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold"
              />

              {/* Filters */}
              <div className="flex flex-wrap gap-1">
                {['All', 'Active', 'SIP', 'Lumpsum', 'Redeemed'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      filterType === type 
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                        : 'bg-slate-950/40 border border-slate-850 hover:bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border-none outline-none text-purple-400 font-black cursor-pointer uppercase text-[10px]"
                >
                  <option value="name">Fund Name</option>
                  <option value="highest_return">Highest Return</option>
                  <option value="lowest_return">Lowest Return</option>
                  <option value="highest_investment">Highest Principal</option>
                  <option value="latest_investment">Latest Added</option>
                </select>
              </div>
            </div>

            {/* Funds Card Stack */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredFunds.map(f => {
                const isActive = activeFund && activeFund.id === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFund(f)}
                    onDoubleClick={() => {
                      if (activeFund && activeFund.id === f.id) {
                        setIsDetailCollapsed(!isDetailCollapsed);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-2 relative ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/2' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <p className="font-extrabold text-white text-[12px] leading-tight truncate">{f.fund_name}</p>
                      <span className="text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 whitespace-nowrap">
                        {f.category}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] border-t border-slate-900/60 pt-2 text-slate-400">
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Current Value</p>
                        <p className="font-black text-white mt-0.5">₹{Math.round(f.currentValue || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Return (Gain)</p>
                        <p className={`font-black mt-0.5 ${f.overallGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {f.overallGain >= 0 ? '+' : ''}{f.gainPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: FUND DETAIL DASHBOARD */}
          {!isDetailCollapsed && activeFund && (
            <div className="lg:col-span-3 space-y-6">
              {/* DETAILS CARD HEADER */}
              <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      {activeFund.fund_name}
                      <button
                        onClick={() => setIsDetailCollapsed(true)}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                        title="Collapse details panel"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Fund House: <span className="text-purple-400 font-extrabold">{activeFund.fund_house}</span> | Category: <span className="text-white font-extrabold">{activeFund.category}</span></p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="text-xs py-1.5 px-3 border border-slate-800 text-slate-400 hover:text-white">
                      Import CSV
                    </Button>
                    <button 
                      onClick={() => handleOpenEditFund(activeFund)}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
                      title="Edit Fund Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteFund(activeFund.id)}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-slate-750 transition"
                      title="Delete Fund"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section 1 — Portfolio Summary (KPI cards) */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2.5">Section 1 — Portfolio Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Current Value</p>
                      <p className="text-base font-black text-white font-mono mt-0.5">₹{Math.round(activeFund.currentValue).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Total Invested</p>
                      <p className="text-base font-black text-slate-400 font-mono mt-0.5">₹{Math.round(activeFund.totalInvested).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Overall Gain</p>
                      <p className={`text-base font-black font-mono mt-0.5 ${activeFund.overallGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{Math.round(activeFund.overallGain).toLocaleString('en-IN')} ({activeFund.gainPct.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Units Held</p>
                      <p className="text-sm font-black text-white font-mono mt-0.5">{activeFund.unitsHeld.toFixed(3)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Current NAV</p>
                      <p className="text-sm font-black text-purple-400 font-mono mt-0.5">₹{activeFund.current_nav.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">XIRR (Annualized)</p>
                      <p className="text-sm font-black text-green-400 font-mono mt-0.5">
                        {activeFund.xirr > 0 ? `${activeFund.xirr.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2 — Growth Graph */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Section 2 — Growth Graph</h4>
                    <div className="flex gap-1">
                      {['1M', '3M', '6M', '1Y', '3Y', 'Since'].map(r => (
                        <button
                          key={r}
                          onClick={() => setChartRange(r as any)}
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                            chartRange === r 
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
                              : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-56 bg-slate-950/60 border border-slate-900 p-3 rounded-2xl">
                    {graphData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs">No historical graph data available yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData}>
                          <defs>
                            <linearGradient id="growthColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#475569" fontSize={8} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                            itemStyle={{ color: '#c084fc', fontSize: '10px' }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            formatter={(value: any, name: any) => {
                              if (name === 'portfolioValue') return [`₹${value.toLocaleString()}`, 'Portfolio Value'];
                              if (name === 'profit') return [`₹${value.toLocaleString()}`, 'Gain'];
                              if (name === 'nav') return [`₹${value}`, 'NAV'];
                              if (name === 'units') return [value, 'Units'];
                              return [value, name];
                            }}
                          />
                          <Area type="monotone" dataKey="portfolioValue" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#growthColor)" />
                          <Line type="monotone" dataKey="nav" stroke="#3B82F6" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Section 3 — Investment History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Section 3 — Investment History</h4>
                    <Button onClick={handleOpenAddTx} variant="ghost" className="text-[10px] py-1 px-2.5 border border-purple-500/20 text-purple-400 hover:text-white">
                      + Add Log
                    </Button>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-900 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-900 text-slate-500 font-bold uppercase text-[9px]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-2">Type</th>
                          <th className="py-2.5 px-2 text-right">Amount</th>
                          <th className="py-2.5 px-2 text-right">NAV</th>
                          <th className="py-2.5 px-2 text-right">Units</th>
                          <th className="py-2.5 px-2 max-w-[150px] truncate">Remarks</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDetails ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-500">Loading ledger logs...</td>
                          </tr>
                        ) : paginatedTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-500">No investment records logged.</td>
                          </tr>
                        ) : (
                          paginatedTransactions.map((tx: any) => (
                            <tr key={tx.id} className="border-b border-slate-900/40 hover:bg-slate-900/20 text-white">
                              <td className="py-2.5 px-3 font-mono text-[10px]">{formatDisplayDate(tx.date)}</td>
                              <td className="py-2.5 px-2">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-black ${
                                  tx.type === 'SIP' ? 'bg-purple-500/20 text-purple-400' :
                                  tx.type === 'Lumpsum' ? 'bg-cyan-500/20 text-cyan-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-black font-mono">₹{tx.amount.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-400">₹{tx.nav.toFixed(2)}</td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-350">{tx.units.toFixed(3)}</td>
                              <td className="py-2.5 px-2 text-slate-400 max-w-[150px] truncate" title={tx.remarks}>{tx.remarks || '-'}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button onClick={() => handleOpenEditTx(tx)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleDeleteTx(tx.id)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition">
                                    <Trash className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-3 border-t border-slate-900 bg-slate-900/20">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Page {currentPage} of {totalPages}</span>
                        <div className="flex space-x-1.5">
                          <Button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            variant="ghost" className="px-2.5 py-1 text-[10px] border border-slate-880"
                          >
                            Prev
                          </Button>
                          <Button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            variant="ghost" className="px-2.5 py-1 text-[10px] border border-slate-880"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4 — Monthly SIP Timeline */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Section 4 — Monthly SIP Timeline ({new Date().getFullYear()})</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                    {sipTimeline.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-xl text-center border ${
                          item.status === 'Paid' 
                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                            : 'bg-slate-950/40 border-slate-900 text-slate-500'
                        }`}
                      >
                        <p className="font-black text-[10px]">{item.month}</p>
                        <p className="text-[8px] uppercase font-bold mt-0.5">{item.status}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5 — Allocation & Section 6 — Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Allocation Pie Chart */}
                  <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl flex flex-col justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Section 5 — Portfolio Allocation</h4>
                    <div className="h-44 flex items-center justify-center">
                      {allocationData.length === 0 ? (
                        <p className="text-slate-500">No allocation data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocationData}
                              cx="50%" cy="50%"
                              innerRadius={45} outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {allocationData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '9px' }}
                              formatter={(value: any, name: any, props: any) => [`₹${value.toLocaleString()} (${props.payload.percentage}%)`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    {/* Legend list */}
                    <div className="max-h-24 overflow-y-auto mt-2 text-[9px] uppercase tracking-wider space-y-1 custom-scrollbar">
                      {allocationData.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-400">
                          <div className="flex items-center space-x-1.5 truncate pr-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="truncate font-black">{item.name}</span>
                          </div>
                          <span className="font-mono text-white">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance stats */}
                  <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl space-y-3 flex flex-col justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Section 6 — Performance Stats</h4>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Absolute Return</p>
                        <p className={`font-black font-mono text-xs ${activeFund.overallGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {activeFund.overallGain >= 0 ? '+' : ''}{activeFund.gainPct.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">CAGR (Annualized)</p>
                        <p className="font-black font-mono text-xs text-white">{activeFund.cagr > 0 ? `${activeFund.cagr.toFixed(1)}%` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Holding Period</p>
                        <p className="font-black text-white">{activeFund.holdingPeriodDays} Days</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Avg NAV (Purchase)</p>
                        <p className="font-black font-mono text-white">₹{activeFund.avgPurchasePrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Total SIPs Logged</p>
                        <p className="font-black text-white">{activeFund.totalSips}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Today's Est Value</p>
                        <p className="font-black font-mono text-green-400">₹{Math.round(activeFund.currentValue).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 7 — Risk Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2.5">Section 7 — Fund Risk Profile</h4>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Risk Level</p>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          activeFund.risk_level === 'Very High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {activeFund.risk_level}
                        </span>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Benchmark</p>
                        <p className="font-extrabold text-white">{activeFund.benchmark || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Expense Ratio</p>
                        <p className="font-mono text-white font-black">{activeFund.expense_ratio}%</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Launch Year</p>
                        <p className="font-extrabold text-white">{activeFund.launch_year || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 8 — Notes */}
                  <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl flex flex-col justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Section 8 — Investment Notes</h4>
                    <p className="text-slate-400 italic font-medium whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                      {activeFund.notes || 'No personal notes created. Edit fund profile to log long-term strategies here.'}
                    </p>
                  </div>
                </div>

                {/* AI Investment Outlook */}
                <div className="bg-purple-950/10 border border-purple-500/10 p-5 rounded-3xl space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-wider">AI Investment Projection Outlook (Scenario Analysis)</h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      ⚠️ Projections are estimates based on historical returns and user assumptions. They are not guarantees of future performance.
                    </p>
                  </div>

                  {/* Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 bg-slate-950/40 p-4 border border-slate-900/60 rounded-2xl">
                    <div className="space-y-1">
                      <div className="flex justify-between font-black text-[9px] uppercase tracking-wider text-slate-400">
                        <span>Monthly SIP</span>
                        <span className="text-white">₹{projSIP.toLocaleString('en-IN')}</span>
                      </div>
                      <input 
                        type="range" min="500" max="100000" step="500"
                        value={projSIP} onChange={e => setProjSIP(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer h-1 rounded bg-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-black text-[9px] uppercase tracking-wider text-slate-400">
                        <span>Return Assumption</span>
                        <span className="text-white">{projReturn}%</span>
                      </div>
                      <input 
                        type="range" min="4" max="30" step="0.5"
                        value={projReturn} onChange={e => setProjReturn(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer h-1 rounded bg-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-black text-[9px] uppercase tracking-wider text-slate-400">
                        <span>Period</span>
                        <span className="text-white">{projPeriod} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="30" step="1"
                        value={projPeriod} onChange={e => setProjPeriod(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer h-1 rounded bg-slate-800"
                      />
                    </div>
                  </div>

                  {/* Future Values Scenarios Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl text-center space-y-1">
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                        Conservative Scenario (-3%)
                      </span>
                      <p className="text-base font-black text-white font-mono mt-1">₹{projections.conservative.toLocaleString('en-IN')}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-black">Est CAGR: {projReturn - 3}%</p>
                    </div>

                    <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-center space-y-1 shadow-lg shadow-purple-500/2">
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                        Expected Scenario (Base)
                      </span>
                      <p className="text-lg font-black text-purple-400 font-mono mt-1">₹{projections.expected.toLocaleString('en-IN')}</p>
                      <p className="text-[8px] text-purple-500 uppercase font-black">Est CAGR: {projReturn}%</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl text-center space-y-1">
                      <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                        Optimistic Scenario (+3%)
                      </span>
                      <p className="text-base font-black text-white font-mono mt-1">₹{projections.optimistic.toLocaleString('en-IN')}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-black">Est CAGR: {projReturn + 3}%</p>
                    </div>
                  </div>

                  {/* Summary math block */}
                  <div className="bg-slate-950/40 border border-slate-900 p-4.5 rounded-2xl text-[11px] font-black uppercase text-slate-400 space-y-1.5 flex flex-col sm:flex-row justify-between items-center">
                    <span>Summary:</span>
                    <span>Total Invested: <code className="text-white text-xs ml-1 font-mono">₹{projections.invested.toLocaleString('en-IN')}</code></span>
                    <span>Expected Wealth: <code className="text-purple-400 text-xs ml-1 font-mono">₹{projections.expected.toLocaleString('en-IN')}</code></span>
                    <span>Expected Profit: <code className="text-green-400 text-xs ml-1 font-mono">₹{Math.max(0, projections.expected - projections.invested).toLocaleString('en-IN')}</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FUND MODAL */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFundModal(false)} />
          <form onSubmit={handleFundSubmit} className="relative bg-slate-950 border border-slate-880 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4 text-xs">
            <h3 className="text-sm font-black text-white border-b border-slate-900 pb-2 uppercase tracking-wider">
              {editingFund ? 'Edit Mutual Fund Details' : 'Add New Mutual Fund'}
            </h3>
            
            <div className="space-y-1">
              <label className="block text-[9px] text-slate-500 font-bold uppercase">Fund Name *</label>
              <input
                type="text" required
                value={fundForm.fund_name}
                onChange={e => setFundForm(f => ({ ...f, fund_name: e.target.value }))}
                placeholder="e.g. Parag Parikh Flexi Cap Fund"
                className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Fund Category *</label>
                <select
                  value={fundForm.category}
                  onChange={e => setFundForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs uppercase"
                >
                  <option value="Small Cap">Small Cap</option>
                  <option value="Mid Cap">Mid Cap</option>
                  <option value="Large Cap">Large Cap</option>
                  <option value="Flexi Cap">Flexi Cap</option>
                  <option value="Index Fund">Index Fund</option>
                  <option value="ELSS Tax Saver">ELSS Tax Saver</option>
                  <option value="Hybrid / Debt">Hybrid / Debt</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Fund House *</label>
                <input
                  type="text" required
                  value={fundForm.fund_house}
                  onChange={e => setFundForm(f => ({ ...f, fund_house: e.target.value }))}
                  placeholder="e.g. Parag Parikh MF"
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Expense Ratio %</label>
                <input
                  type="number" step="0.01" min="0" max="5"
                  value={fundForm.expense_ratio}
                  onChange={e => setFundForm(f => ({ ...f, expense_ratio: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Current NAV *</label>
                <input
                  type="number" step="0.01" min="1" required
                  value={fundForm.current_nav}
                  onChange={e => setFundForm(f => ({ ...f, current_nav: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Risk Level</label>
                <select
                  value={fundForm.risk_level}
                  onChange={e => setFundForm(f => ({ ...f, risk_level: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs uppercase"
                >
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Benchmark</label>
                <input
                  type="text"
                  value={fundForm.benchmark}
                  onChange={e => setFundForm(f => ({ ...f, benchmark: e.target.value }))}
                  placeholder="e.g. Nifty 500 TRI"
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Launch Year</label>
                <input
                  type="number" min="1990" max="2030"
                  value={fundForm.launch_year}
                  onChange={e => setFundForm(f => ({ ...f, launch_year: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-slate-500 font-bold uppercase">Investment Notes</label>
              <textarea
                value={fundForm.notes}
                onChange={e => setFundForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Log long-term allocation strategy here..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-900">
              <Button onClick={() => setShowFundModal(false)} variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5">
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTxModal(false)} />
          <form onSubmit={handleTxSubmit} className="relative bg-slate-950 border border-slate-880 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4 text-xs">
            <h3 className="text-sm font-black text-white border-b border-slate-900 pb-2 uppercase tracking-wider">
              {editingTx ? 'Edit Transaction Log' : 'Add Investment Transaction'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Date *</label>
                <input
                  type="date" required
                  value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Type *</label>
                <select
                  value={txForm.type}
                  onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs uppercase"
                >
                  <option value="SIP">SIP</option>
                  <option value="Lumpsum">Lump sum</option>
                  <option value="Redemption">Redemption</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-slate-500 font-bold uppercase">NAV at Purchase *</label>
              <input
                type="number" step="0.0001" min="0.0001" required
                value={txForm.nav}
                onChange={e => handleTxFieldChange('nav', e.target.value)}
                placeholder="₹"
                className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Amount (₹) *</label>
                <input
                  type="number" step="0.01" min="1" required
                  value={txForm.amount}
                  onChange={e => handleTxFieldChange('amount', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Units Purchased *</label>
                <input
                  type="number" step="0.001" min="0.001" required
                  value={txForm.units}
                  onChange={e => handleTxFieldChange('units', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-slate-500 font-bold uppercase">Remarks</label>
              <input
                type="text"
                value={txForm.remarks}
                onChange={e => setTxForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional notes"
                className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-900">
              <Button onClick={() => setShowTxModal(false)} variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5">
                Save Log
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && activeFund && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            alert(msg);
            fetchFunds(activeFund.id);
          }}
          importUrl={`${API}/records/mutual-funds/${activeFund.id}/import`}
          moduleType="mutual"
        />
      )}
    </div>
  );
}
