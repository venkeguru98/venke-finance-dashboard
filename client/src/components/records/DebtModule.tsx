import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft, ShieldAlert, 
  ChevronDown, ChevronUp, Calendar, Trash, Activity, 
  CheckCircle2, Layers
} from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface DebtModuleProps {
  onBack: () => void;
}

export const PRIORITY_CONFIG: Record<string, { label: string; shortLabel: string; badgeClass: string; accentBar: string; dot: string; order: number }> = {
  pay_first: { label: 'Pay First', shortLabel: 'PAY FIRST', badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-400', accentBar: 'bg-rose-500', dot: '🔴', order: 1 },
  high:      { label: 'High Priority', shortLabel: 'HIGH', badgeClass: 'bg-orange-500/15 border-orange-500/30 text-orange-400', accentBar: 'bg-orange-500', dot: '🟠', order: 2 },
  medium:    { label: 'Medium Priority', shortLabel: 'MEDIUM', badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400', accentBar: 'bg-amber-500', dot: '🟡', order: 3 },
  low:       { label: 'Low Priority', shortLabel: 'LOW', badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', accentBar: 'bg-emerald-500', dot: '🟢', order: 4 },
  last:      { label: 'Last to Pay', shortLabel: 'LAST', badgeClass: 'bg-slate-500/15 border-slate-500/30 text-slate-400', accentBar: 'bg-slate-500', dot: '⚪', order: 5 },
};

export default function DebtModule({ onBack }: DebtModuleProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<'Priority' | 'Name' | 'NetBalance'>('Priority');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterType, setFilterType] = useState<'All' | 'Borrowed' | 'Lent'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Partially Settled' | 'Fully Settled'>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  // Expanded transactions for Settlement History
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);

  // Modals
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any | null>(null);
  const [accForm, setAccForm] = useState({
    account_name: '',
    description: '',
    priority: 'medium'
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<any | null>(null);
  const [txForm, setTxForm] = useState({
    type: 'Borrowed', // 'Borrowed' | 'Lent' | 'Settlement'
    settlementType: 'Repayment Made', // 'Repayment Made' | 'Collection Received'
    parentTxId: '', // Target transaction to settle
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchAccounts = async (selectId?: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/debts`);
      const list = res.data || [];
      setAccounts(list);
      
      if (list.length > 0) {
        let toSelect = list[0];
        if (selectId) {
          toSelect = list.find((a: any) => a.id === selectId) || list[0];
        } else if (activeAccount) {
          toSelect = list.find((a: any) => a.id === activeAccount.id) || list[0];
        }
        setActiveAccount(toSelect);
        fetchTransactions(toSelect.id);
      } else {
        setActiveAccount(null);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/records/debts/${id}/transactions`);
      setTransactions(res.data || []);
      setCurrentPage(1);
    } catch (_) {
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSelectAccount = (a: any) => {
    setActiveAccount(a);
    fetchTransactions(a.id);
    setExpandedTxId(null);
  };

  // Account CRUD
  const handleOpenAddAcc = () => {
    setEditingAcc(null);
    setAccForm({ account_name: '', description: '', priority: 'medium' });
    setShowAccModal(true);
  };

  const handleOpenEditAcc = (a: any) => {
    setEditingAcc(a);
    setAccForm({ account_name: a.account_name, description: a.description || '', priority: a.priority || 'medium' });
    setShowAccModal(true);
  };

  const handleQuickChangePriority = async (accId: number, newPriority: string) => {
    try {
      await axios.patch(`${API}/records/debts/${accId}/priority`, { priority: newPriority });
      fetchAccounts(activeAccount?.id);
    } catch (_) {
      alert('Error updating priority.');
    }
  };

  const handleAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAcc) {
        await axios.put(`${API}/records/debts/${editingAcc.id}`, accForm);
      } else {
        const res = await axios.post(`${API}/records/debts`, accForm);
        fetchAccounts(res.data.id);
        setShowAccModal(false);
        return;
      }
      fetchAccounts(activeAccount?.id);
      setShowAccModal(false);
    } catch (_) {
      alert('Error saving account.');
    }
  };

  const handleDeleteAcc = async (id: number) => {
    if (!confirm('Are you sure you want to delete this debt account and all its transactions?')) return;
    try {
      await axios.delete(`${API}/records/debts/${id}`);
      fetchAccounts();
    } catch (_) {
      alert('Error deleting account.');
    }
  };

  // Transaction CRUD
  const handleOpenAddTx = () => {
    if (!activeAccount) return;
    setEditingTx(null);
    setEditingSettlement(null);
    setTxForm({
      type: 'Borrowed',
      settlementType: 'Repayment Made',
      parentTxId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      notes: ''
    });
    setShowTxModal(true);
  };

  const handleOpenEditTx = (t: any) => {
    setEditingTx(t);
    setEditingSettlement(null);
    setTxForm({
      type: t.type,
      settlementType: 'Repayment Made',
      parentTxId: '',
      amount: String(t.amount),
      date: t.date.split('T')[0],
      description: t.description,
      notes: t.notes || ''
    });
    setShowTxModal(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    try {
      if (txForm.type === 'Settlement') {
        if (!txForm.parentTxId) {
          alert('Please select the original transaction to settle.');
          return;
        }
        const parentTx = transactions.find(t => t.id === Number(txForm.parentTxId));
        if (!parentTx) {
          alert('Selected original transaction not found.');
          return;
        }

        const currentSettledValue = editingSettlement ? Number(editingSettlement.amount) : 0;
        const maxAllowed = parentTx.outstandingAmount + currentSettledValue;
        const amountNum = Number(txForm.amount);

        if (isNaN(amountNum) || amountNum <= 0) {
          alert('Settlement amount must be a positive number.');
          return;
        }
        if (amountNum > maxAllowed) {
          alert(`Settlement amount (₹${amountNum.toLocaleString('en-IN')}) cannot exceed the remaining balance (₹${maxAllowed.toLocaleString('en-IN')}) of this transaction.`);
          return;
        }

        const payload = {
          amount: amountNum,
          date: txForm.date,
          notes: txForm.notes || txForm.description || 'Repayment'
        };

        if (editingSettlement) {
          await axios.put(`${API}/records/debts/settlements/${editingSettlement.id}`, payload);
        } else {
          await axios.post(`${API}/records/debts/transactions/${parentTx.id}/settlements`, payload);
        }
      } else {
        const payload = {
          type: txForm.type,
          amount: Number(txForm.amount),
          date: txForm.date,
          description: txForm.description,
          notes: txForm.notes || ''
        };

        if (editingTx) {
          const hasSettlements = editingTx.settlements && editingTx.settlements.length > 0;
          const isAmountChanged = Number(editingTx.amount) !== Number(txForm.amount);
          if (hasSettlements && isAmountChanged) {
            const proceed = confirm(
              'This transaction already has settlements recorded. Changing the original amount will preserve the settlements and recalculate the remaining balance. Are you sure you want to proceed?'
            );
            if (!proceed) return;
          }
          await axios.put(`${API}/records/debts/transactions/${editingTx.id}`, payload);
        } else {
          await axios.post(`${API}/records/debts/${activeAccount.id}/transactions`, payload);
        }
      }

      fetchAccounts(activeAccount.id);
      setShowTxModal(false);
    } catch (_) {
      alert('Error saving record.');
    }
  };

  const handleDeleteTx = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this debt record?')) return;
    try {
      await axios.delete(`${API}/records/debts/transactions/${txId}`);
      fetchAccounts(activeAccount.id);
    } catch (_) {
      alert('Error deleting transaction.');
    }
  };

  // Settlement Management
  const handleOpenAddSettlement = (txId: number, outstanding: number) => {
    const parentTx = transactions.find(t => t.id === txId);
    if (!parentTx) return;
    setEditingTx(null);
    setEditingSettlement(null);
    setTxForm({
      type: 'Settlement',
      settlementType: parentTx.type === 'Borrowed' ? 'Repayment Made' : 'Collection Received',
      parentTxId: String(txId),
      amount: String(outstanding),
      date: new Date().toISOString().split('T')[0],
      description: `Repayment for ${parentTx.description}`,
      notes: ''
    });
    setShowTxModal(true);
  };

  const handleOpenEditSettlement = (txId: number, s: any) => {
    const parentTx = transactions.find(t => t.id === txId);
    if (!parentTx) return;
    setEditingTx(null);
    setEditingSettlement(s);
    setTxForm({
      type: 'Settlement',
      settlementType: parentTx.type === 'Borrowed' ? 'Repayment Made' : 'Collection Received',
      parentTxId: String(txId),
      amount: String(s.amount),
      date: s.date.split('T')[0],
      description: s.notes || `Repayment for ${parentTx.description}`,
      notes: s.notes || ''
    });
    setShowTxModal(true);
  };

  const handleDeleteSettlement = async (sId: number) => {
    if (!confirm('Are you sure you want to delete this repayment settlement entry?')) return;
    try {
      await axios.delete(`${API}/records/debts/settlements/${sId}`);
      fetchAccounts(activeAccount.id);
    } catch (_) {
      alert('Error deleting settlement entry.');
    }
  };

  // CSV Success Callback
  const handleCsvSuccess = (msg: string) => {
    alert(msg);
    fetchAccounts(activeAccount?.id);
  };

  // Priority Summary Counts
  const getPriorityCounts = () => {
    const counts: Record<string, number> = { pay_first: 0, high: 0, medium: 0, low: 0, last: 0 };
    accounts.forEach(a => {
      const key = a.priority && counts[a.priority] !== undefined ? a.priority : 'medium';
      counts[key]++;
    });
    return counts;
  };

  const priorityCounts = getPriorityCounts();
  const totalAccountsCount = accounts.length || 1;

  // Filter & Sort Accounts
  const getFilteredAndSortedAccounts = () => {
    let list = accounts.filter(a => {
      if (filterPriority !== 'All' && (a.priority || 'medium') !== filterPriority) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'Priority') {
        const orderA = PRIORITY_CONFIG[a.priority || 'medium']?.order || 3;
        const orderB = PRIORITY_CONFIG[b.priority || 'medium']?.order || 3;
        if (orderA !== orderB) return orderA - orderB;
        return a.account_name.localeCompare(b.account_name);
      } else if (sortBy === 'NetBalance') {
        return (b.runningBalance || 0) - (a.runningBalance || 0);
      } else {
        return a.account_name.localeCompare(b.account_name);
      }
    });
  };

  const displayAccounts = getFilteredAndSortedAccounts();

  // Running stats for Dashboard
  const getOverallStats = () => {
    let totalBorrowed = 0;
    let totalLent = 0;
    let outstandingPay = 0;
    let outstandingReceive = 0;
    let settledAmount = 0;

    accounts.forEach(a => {
      totalBorrowed += a.totalBorrowed || 0;
      totalLent += a.totalLent || 0;
      outstandingPay += a.outstandingPay || 0;
      outstandingReceive += a.outstandingReceive || 0;
      settledAmount += a.settledAmount || 0;
    });

    return {
      totalBorrowed,
      totalLent,
      outstandingPay,
      outstandingReceive,
      settledAmount,
      pendingAmount: outstandingPay + outstandingReceive,
      netBalance: outstandingReceive - outstandingPay
    };
  };

  const overall = getOverallStats();

  // Health Score Calculation (0-100)
  const calculateDebtHealthScore = () => {
    if (accounts.length === 0) return { score: 100, label: 'Excellent', color: 'text-emerald-400' };
    const totalVolume = overall.totalBorrowed + overall.totalLent;
    if (totalVolume === 0) return { score: 100, label: 'Excellent', color: 'text-emerald-400' };

    const settledRatio = overall.settledAmount / (totalVolume || 1);
    let score = Math.round(50 + settledRatio * 50);

    if (priorityCounts.pay_first > 0) score -= 15;
    if (overall.outstandingPay > overall.totalBorrowed * 0.7) score -= 10;
    score = Math.max(10, Math.min(100, score));

    if (score >= 80) return { score, label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 60) return { score, label: 'Good', color: 'text-blue-400' };
    if (score >= 40) return { score, label: 'Needs Attention', color: 'text-amber-400' };
    return { score, label: 'Critical', color: 'text-rose-400' };
  };

  const health = calculateDebtHealthScore();

  // Filters logic
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      if (filterType !== 'All' && t.type !== filterType) return false;
      if (filterStatus !== 'All') {
        if (filterStatus === 'Pending' && t.status !== 'Pending') return false;
        if (filterStatus === 'Partially Settled' && t.status !== 'Partially Settled') return false;
        if (filterStatus === 'Fully Settled' && t.status !== 'Settled' && t.status !== 'Fully Settled') return false;
      }
      if (filterStartDate && new Date(t.date) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(t.date) > new Date(filterEndDate)) return false;
      return true;
    });
  };

  const filtered = getFilteredTransactions();

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedTransactions = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-300">
      {/* EXECUTIVE HERO HEADER */}
      <div className="bg-[#0B1228] p-6 rounded-3xl border border-[#1E2A4A] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center space-x-4 z-10">
          <button 
            onClick={onBack} 
            className="p-3 rounded-2xl bg-[#101935] border border-[#1E2A4A] text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150 shadow-md hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#635BFF]/15 border border-[#635BFF]/30 text-[#635BFF]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Debt Manager & Loan Registry</h1>
              <span className="text-[10px] font-black text-[#635BFF] bg-[#635BFF]/15 px-2.5 py-0.5 rounded-full border border-[#635BFF]/30 uppercase tracking-wider">
                Fintech CFO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
              Track borrowings, personal loans, lent items, outstanding repayments, and settlement audits.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 z-10 self-start md:self-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#101935] hover:bg-slate-800 text-slate-200 border border-[#1E2A4A] rounded-xl font-bold text-xs shadow-md transition-all duration-150 hover:-translate-y-0.5"
          >
            <span>Import CSV</span>
          </button>
          <Button 
            onClick={handleOpenAddAcc} 
            variant="primary" 
            className="text-xs font-bold py-2.5 px-4 bg-[#635BFF] hover:bg-[#5249FF] text-white rounded-xl shadow-lg shadow-[#635BFF]/25 transition-all duration-150 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Debt Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#635BFF] border-t-transparent rounded-full animate-spin"></div>
          <p>Loading Debt Manager Dashboard...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-12 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-[#635BFF] mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-white">No Debt Accounts Configured</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create your first debt account to track personal borrowings, loans given to friends, or company liabilities.
          </p>
          <Button onClick={handleOpenAddAcc} variant="primary" className="text-xs py-2.5 px-5 bg-[#635BFF] hover:bg-[#5249FF] text-white rounded-xl">
            Create Debt Account
          </Button>
        </div>
      ) : (
        <>
          {/* EXECUTIVE SUMMARY GLASS CARDS (4 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Borrowed */}
            <div className="bg-[#0B1228] p-5 rounded-3xl border border-[#1E2A4A] shadow-xl relative overflow-hidden group hover:border-rose-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Borrowed</span>
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight font-mono">₹{overall.totalBorrowed.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    Pay: ₹{overall.outstandingPay.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Borrowed Volume</span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Lent */}
            <div className="bg-[#0B1228] p-5 rounded-3xl border border-[#1E2A4A] shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Lent</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white tracking-tight font-mono">₹{overall.totalLent.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Rec: ₹{overall.outstandingReceive.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Assets Out</span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Settled */}
            <div className="bg-[#0B1228] p-5 rounded-3xl border border-[#1E2A4A] shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Settled</span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-emerald-400 tracking-tight font-mono">₹{overall.settledAmount.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Cleared Ledger
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Repaid Total</span>
                </div>
              </div>
            </div>

            {/* Card 4: Net Balance */}
            <div className="bg-[#0B1228] p-5 rounded-3xl border border-[#1E2A4A] shadow-xl relative overflow-hidden group hover:border-[#635BFF]/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Position</span>
                <div className="p-2 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 text-[#635BFF]">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-black tracking-tight font-mono ${overall.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overall.netBalance >= 0 ? '+' : ''}₹{overall.netBalance.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    overall.netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {overall.netBalance >= 0 ? 'Surplus Claim' : 'Net Obligation'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Receivable − Payable</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRIORITY ANALYTICS & DEBT HEALTH SECTION */}
          <div className="bg-[#0B1228] border border-[#1E2A4A] p-6 rounded-3xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Priority Distribution Bar */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#635BFF]" /> Priority Risk Distribution
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{accounts.length} Registered Accounts</span>
              </div>

              {/* Progress Bar Stack */}
              <div className="h-3 w-full bg-[#101935] rounded-full overflow-hidden flex border border-[#1E2A4A]">
                <div style={{ width: `${(priorityCounts.pay_first / totalAccountsCount) * 100}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Pay First: ${priorityCounts.pay_first}`} />
                <div style={{ width: `${(priorityCounts.high / totalAccountsCount) * 100}%` }} className="bg-orange-500 h-full transition-all duration-500" title={`High: ${priorityCounts.high}`} />
                <div style={{ width: `${(priorityCounts.medium / totalAccountsCount) * 100}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Medium: ${priorityCounts.medium}`} />
                <div style={{ width: `${(priorityCounts.low / totalAccountsCount) * 100}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Low: ${priorityCounts.low}`} />
                <div style={{ width: `${(priorityCounts.last / totalAccountsCount) * 100}%` }} className="bg-slate-500 h-full transition-all duration-500" title={`Last: ${priorityCounts.last}`} />
              </div>

              {/* Priority Chips Grid */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  🔴 Pay First: <strong>{priorityCounts.pay_first}</strong> ({Math.round((priorityCounts.pay_first / totalAccountsCount) * 100)}%)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                  🟠 High: <strong>{priorityCounts.high}</strong> ({Math.round((priorityCounts.high / totalAccountsCount) * 100)}%)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  🟡 Medium: <strong>{priorityCounts.medium}</strong> ({Math.round((priorityCounts.medium / totalAccountsCount) * 100)}%)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  🟢 Low: <strong>{priorityCounts.low}</strong> ({Math.round((priorityCounts.low / totalAccountsCount) * 100)}%)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
                  ⚪ Last: <strong>{priorityCounts.last}</strong> ({Math.round((priorityCounts.last / totalAccountsCount) * 100)}%)
                </span>
              </div>
            </div>

            {/* Right: Circular Debt Health Score */}
            <div className="lg:col-span-4 bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] flex items-center space-x-4">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#1E2A4A" strokeWidth="4" fill="transparent" />
                  <circle 
                    cx="32" cy="32" r="26" 
                    stroke="#635BFF" 
                    strokeWidth="4" 
                    fill="transparent"
                    strokeDasharray={163}
                    strokeDashoffset={163 - (163 * health.score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-black text-white font-mono">{health.score}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Debt Health Rating</span>
                <p className={`text-base font-extrabold ${health.color}`}>{health.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Based on settlement ratio & risk items</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT SPLIT LAYOUT (35% LEFT / 65% RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT ACCOUNT NAVIGATION PANEL (lg:col-span-4 = ~35%) */}
            <div className="lg:col-span-4 space-y-3.5">
              <div className="bg-[#0B1228] p-4 rounded-2xl border border-[#1E2A4A] flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-white">Accounts Registry</h3>
                  <p className="text-[10px] font-semibold text-slate-400">({displayAccounts.length} Filtered)</p>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-[#101935] border border-[#1E2A4A] rounded-lg text-[10px] font-bold text-slate-300 py-1 px-2 focus:outline-none"
                  >
                    <option value="Priority">Sort: Priority</option>
                    <option value="NetBalance">Sort: Net Balance</option>
                    <option value="Name">Sort: Name</option>
                  </select>

                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="bg-[#101935] border border-[#1E2A4A] rounded-lg text-[10px] font-bold text-slate-300 py-1 px-2 focus:outline-none"
                  >
                    <option value="All">All Priority</option>
                    <option value="pay_first">🔴 Pay First</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                    <option value="last">⚪ Last</option>
                  </select>
                </div>
              </div>

              {/* ACCOUNT CARDS LIST WITH 4PX PRIORITY ACCENT STRIPS */}
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
                {displayAccounts.length === 0 ? (
                  <div className="p-8 text-center bg-[#0B1228] border border-[#1E2A4A] rounded-2xl text-slate-400 text-xs italic font-semibold">
                    No debt accounts match the selected priority filter.
                  </div>
                ) : (
                  displayAccounts.map((a) => {
                    const isActive = activeAccount && activeAccount.id === a.id;
                    const priKey = a.priority || 'medium';
                    const priConfig = PRIORITY_CONFIG[priKey] || PRIORITY_CONFIG.medium;

                    return (
                      <div
                        key={a.id}
                        onClick={() => handleSelectAccount(a)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 group ${
                          isActive 
                            ? 'bg-[#101935] border-[#635BFF] shadow-lg shadow-[#635BFF]/10 ring-1 ring-[#635BFF]/40' 
                            : 'bg-[#0B1228]/80 border-[#1E2A4A] hover:bg-[#101935]/80 hover:border-slate-700 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* 4px Vertical Priority Accent Strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${priConfig.accentBar} rounded-r-full`} />

                        <div className="flex justify-between items-start pl-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-extrabold text-white text-xs tracking-tight group-hover:text-white truncate">{a.account_name}</h4>
                            </div>

                            <div className="mt-1 flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border flex items-center gap-1 ${priConfig.badgeClass}`}>
                                <span>{priConfig.dot}</span> {priConfig.shortLabel}
                              </span>

                              <select
                                value={priKey}
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  e.stopPropagation();
                                  handleQuickChangePriority(a.id, e.target.value);
                                }}
                                className="bg-[#050816] border border-[#1E2A4A] text-[8px] text-slate-400 font-bold rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                                title="Quick set priority"
                              >
                                <option value="pay_first">🔴 Pay First</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="low">🟢 Low</option>
                                <option value="last">⚪ Last</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenEditAcc(a); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="Edit Account"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteAcc(a.id); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {a.description && <p className="text-[10px] text-slate-400 font-medium truncate pl-2">{a.description}</p>}

                        <div className="flex justify-between items-center text-[11px] font-bold pt-2 border-t border-[#1E2A4A] pl-2">
                          <span className="text-slate-400 font-semibold">Net Balance</span>
                          <span className={`font-mono font-black ${a.runningBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {a.runningBalance >= 0 ? '+' : ''}₹{a.runningBalance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT DETAIL WORKSPACE (lg:col-span-8 = ~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {activeAccount && (
                <div className="bg-[#0B1228] border border-[#1E2A4A] p-6 rounded-3xl shadow-2xl space-y-6">
                  {/* WORKSPACE HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1E2A4A] pb-5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-extrabold text-white tracking-tight">{activeAccount.account_name} Ledger</h2>
                        
                        {(() => {
                          const activePriKey = activeAccount.priority || 'medium';
                          const activePriConfig = PRIORITY_CONFIG[activePriKey] || PRIORITY_CONFIG.medium;
                          return (
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-1 ${activePriConfig.badgeClass}`}>
                              <span>{activePriConfig.dot}</span> {activePriConfig.shortLabel}
                            </span>
                          );
                        })()}

                        {(activeAccount.outstandingPay === 0 && activeAccount.outstandingReceive === 0) ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-black">
                            Fully Settled
                          </span>
                        ) : (
                          <span className="bg-[#635BFF]/10 text-[#635BFF] border border-[#635BFF]/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-black">
                            Active Account
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        Running Account Balance: 
                        <span className={`font-mono font-black ml-2 text-sm ${activeAccount.runningBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {activeAccount.runningBalance >= 0 ? '+' : ''}₹{activeAccount.runningBalance.toLocaleString('en-IN')}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Button onClick={() => setShowImportModal(true)} variant="ghost" className="border border-[#1E2A4A] bg-[#101935] text-slate-300 hover:text-white text-xs py-2 px-3">
                        Import CSV
                      </Button>
                      <Button onClick={handleOpenAddTx} variant="primary" className="text-xs py-2 px-4 bg-[#635BFF] hover:bg-[#5249FF] text-white rounded-xl shadow-lg shadow-[#635BFF]/20">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Record
                      </Button>
                    </div>
                  </div>

                  {/* FLOATING GLASS FILTER BAR */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A]">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Type</label>
                      <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                        className="w-full h-10 bg-[#0B1228] border border-[#1E2A4A] rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs font-semibold"
                      >
                        <option value="All">All Types</option>
                        <option value="Borrowed">Borrowed</option>
                        <option value="Lent">Lent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Repayment Status</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="w-full h-10 bg-[#0B1228] border border-[#1E2A4A] rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs font-semibold"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Partially Settled">Partially Settled</option>
                        <option value="Fully Settled">Fully Settled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={e => setFilterStartDate(e.target.value)}
                        className="w-full h-10 bg-[#0B1228] border border-[#1E2A4A] rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">End Date</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={e => setFilterEndDate(e.target.value)}
                        className="w-full h-10 bg-[#0B1228] border border-[#1E2A4A] rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* TRANSACTION LEDGER TABLE / ROWS */}
                  {loadingDetails ? (
                    <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider">Querying ledger records...</div>
                  ) : filtered.length === 0 ? (
                    <div className="py-16 bg-[#101935]/60 border border-[#1E2A4A] rounded-2xl text-center text-slate-400 space-y-2">
                      <p className="text-xs font-bold text-white">No transactions match current filters.</p>
                      <p className="text-[10px] text-slate-500">Log a new record or adjust filter parameters.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* TRANSACTION ROWS LIST */}
                      <div className="space-y-3">
                        {paginatedTransactions.map((t) => {
                          const isExpanded = expandedTxId === t.id;

                          const statusBadgeClass = 
                            t.status === 'Settled' || t.status === 'Fully Settled'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : t.status === 'Partially Settled'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                          return (
                            <div key={t.id} className="bg-[#101935] border border-[#1E2A4A] rounded-2xl overflow-hidden shadow-md transition-all duration-200">
                              {/* Primary Row Header (64px Height) */}
                              <div className="p-4 min-h-[64px] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center space-x-3.5">
                                  <button 
                                    onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                                    className="p-2 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-400 hover:text-white transition"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#635BFF]" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>

                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-extrabold text-white text-xs">{t.description}</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-1 ${
                                        t.type === 'Borrowed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      }`}>
                                        {t.type === 'Borrowed' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                        {t.type}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusBadgeClass}`}>
                                        {t.status === 'Settled' ? 'Fully Settled' : t.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center space-x-2">
                                      <span>Date: {formatDisplayDate(t.date)}</span>
                                      {t.notes && <span className="text-slate-400 truncate max-w-xs">· {t.notes}</span>}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end space-x-6">
                                  <div className="text-left md:text-right font-mono text-xs">
                                    <p className="font-black text-white">Original: ₹{t.amount.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-emerald-400 font-bold">Settled: ₹{t.settledAmount.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-slate-400 font-black">Rem: ₹{t.outstandingAmount.toLocaleString('en-IN')}</p>
                                  </div>

                                  <div className="flex items-center space-x-1.5">
                                    <button 
                                      onClick={() => handleOpenEditTx(t)}
                                      className="p-2 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-400 hover:text-white transition"
                                      title="Edit Record"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTx(t.id)}
                                      className="p-2 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-400 hover:text-rose-400 transition"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* EXPANDED SETTLEMENT AUDIT PANEL */}
                              {isExpanded && (
                                <div className="p-4 bg-[#0B0F19] border-t border-[#1E2A4A] space-y-4 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between border-b border-[#1E2A4A] pb-3">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5 text-[#635BFF]" /> Settlement & Repayment Audit History
                                    </span>

                                    {t.outstandingAmount > 0 && (
                                      <Button 
                                        onClick={() => handleOpenAddSettlement(t.id, t.outstandingAmount)}
                                        variant="primary" 
                                        className="text-[10px] py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Add Repayment Entry
                                      </Button>
                                    )}
                                  </div>

                                  {t.settlements.length === 0 ? (
                                    <p className="text-slate-500 text-xs py-2 italic font-semibold">No settlement entries recorded for this transaction yet.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                      {t.settlements.map((s: any) => (
                                        <div key={s.id} className="flex justify-between items-center p-3 bg-[#101935] border border-[#1E2A4A] rounded-xl text-xs">
                                          <div className="space-y-0.5">
                                            <p className="font-mono font-black text-white">₹{s.amount.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold">{s.notes || (t.type === 'Borrowed' ? 'Repayment Made' : 'Collection Received')}</p>
                                          </div>

                                          <div className="flex items-center space-x-3">
                                            <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                                              <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDisplayDate(s.date)}
                                            </span>
                                            <button 
                                              onClick={() => handleOpenEditSettlement(t.id, s)}
                                              className="p-1 text-slate-400 hover:text-white transition"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={() => handleDeleteSettlement(s.id)}
                                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                                            >
                                              <Trash className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-[#1E2A4A] flex justify-between items-center text-xs font-black uppercase">
                                    <span className="text-slate-400">Remaining Outstanding Balance</span>
                                    <span className="font-mono text-emerald-400 text-sm">₹{t.outstandingAmount.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* PAGINATION CONTROLS */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-[#1E2A4A]">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Page {currentPage} of {totalPages}</span>
                          <div className="flex space-x-2">
                            <Button 
                              disabled={currentPage === 1} 
                              onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                              variant="ghost" 
                              className="border border-[#1E2A4A] bg-[#101935] px-3 py-1.5 text-xs font-bold text-slate-300"
                            >
                              Prev
                            </Button>
                            <Button 
                              disabled={currentPage === totalPages} 
                              onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                              variant="ghost" 
                              className="border border-[#1E2A4A] bg-[#101935] px-3 py-1.5 text-xs font-bold text-slate-300"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ACCOUNT MODAL */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowAccModal(false)} />
          <form onSubmit={handleAccSubmit} className="relative bg-[#101935] border border-[#1E2A4A] rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4 z-10">
            <h3 className="text-sm font-black text-white border-b border-[#1E2A4A] pb-3 uppercase tracking-wider">
              {editingAcc ? 'Edit Debt Account' : 'New Debt Account'}
            </h3>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Account Name *</label>
              <input
                type="text" required
                value={accForm.account_name}
                onChange={e => setAccForm(f => ({ ...f, account_name: e.target.value }))}
                placeholder="e.g. Friends, SBI Loan, Ashok"
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Priority *</label>
              <select
                value={accForm.priority}
                onChange={e => setAccForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] font-bold text-xs"
              >
                <option value="pay_first">🔴 Pay First (Highest Priority)</option>
                <option value="high">🟠 High Priority</option>
                <option value="medium">🟡 Medium Priority (Default)</option>
                <option value="low">🟢 Low Priority</option>
                <option value="last">⚪ Last to Pay</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Description / Notes</label>
              <textarea
                value={accForm.description}
                onChange={e => setAccForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes or account terms..."
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs h-20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#1E2A4A]">
              <Button type="button" onClick={() => setShowAccModal(false)} variant="ghost" className="border border-[#1E2A4A] text-slate-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-[#635BFF] hover:bg-[#5249FF] text-white text-xs font-bold py-2 px-4">
                Save Account
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TRANSACTION / SETTLEMENT MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowTxModal(false)} />
          <form onSubmit={handleTxSubmit} className="relative bg-[#101935] border border-[#1E2A4A] rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4 z-10">
            <h3 className="text-sm font-black text-white border-b border-[#1E2A4A] pb-3 uppercase tracking-wider">
              {txForm.type === 'Settlement' 
                ? (editingSettlement ? 'Edit Settlement Entry' : 'Log Repayment / Settlement')
                : (editingTx ? 'Edit Debt Record' : 'Log New Debt Record')}
            </h3>

            {txForm.type !== 'Settlement' && (
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Record Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm(f => ({ ...f, type: 'Borrowed' }))}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs ${
                      txForm.type === 'Borrowed' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-[#0B1228] border-[#1E2A4A] text-slate-400'
                    }`}
                  >
                    Borrowed (Liability)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm(f => ({ ...f, type: 'Lent' }))}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs ${
                      txForm.type === 'Lent' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#0B1228] border-[#1E2A4A] text-slate-400'
                    }`}
                  >
                    Lent (Asset)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Amount (₹) *</label>
                <input
                  type="number" step="any" required
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] font-mono font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Date *</label>
                <input
                  type="date" required
                  value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Description / Title *</label>
              <input
                type="text" required
                value={txForm.description}
                onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Loan for laptop purchase"
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Notes / References</label>
              <textarea
                value={txForm.notes}
                onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional audit details..."
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] text-xs h-16"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#1E2A4A]">
              <Button type="button" onClick={() => setShowTxModal(false)} variant="ghost" className="border border-[#1E2A4A] text-slate-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-[#635BFF] hover:bg-[#5249FF] text-white text-xs font-bold py-2 px-4">
                Save Record
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && activeAccount && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleCsvSuccess}
          importUrl={`${API}/records/debts/${activeAccount.id}/import`}
          moduleType="debt"
        />
      )}
    </div>
  );
}
