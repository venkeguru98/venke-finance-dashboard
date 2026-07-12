import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft, ShieldAlert, ChevronDown, ChevronUp, Calendar, Trash } from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface DebtModuleProps {
  onBack: () => void;
}

export default function DebtModule({ onBack }: DebtModuleProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'All' | 'Borrowed' | 'Lent'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Partially Settled' | 'Fully Settled'>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Expanded transactions for Settlement History
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);

  // Modals
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any | null>(null);
  const [accForm, setAccForm] = useState({
    account_name: '',
    description: ''
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
    setAccForm({ account_name: '', description: '' });
    setShowAccModal(true);
  };

  const handleOpenEditAcc = (a: any) => {
    setEditingAcc(a);
    setAccForm({ account_name: a.account_name, description: a.description || '' });
    setShowAccModal(true);
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
      pendingAmount: outstandingPay + outstandingReceive
    };
  };

  const overall = getOverallStats();

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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <button onClick={onBack} className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-purple-400" /> Debt Manager & Loan Registry
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Track borrowings, personal loans, lent items, outstanding repayments, and settlement audits.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddAcc} variant="primary" className="text-xs font-bold py-2.5 bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1.5" /> New Debt Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading debt log...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No Debt accounts configured yet. Create one to begin logging borrowings or lent assets.</p>
          <Button onClick={handleOpenAddAcc} variant="primary" className="text-xs py-2.5 bg-purple-600 hover:bg-purple-700">
            Create Debt Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT SIDEBAR: LIST OF DEBT ACCOUNTS */}
          <div className="lg:col-span-1 space-y-3.5">
            <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">Debt Accounts ({accounts.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {accounts.map((a) => {
                const isActive = activeAccount && activeAccount.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelectAccount(a)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-2 relative ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/2' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-extrabold text-white text-[13px] truncate">{a.account_name}</p>
                      <div className="flex space-x-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEditAcc(a); }}
                          className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteAcc(a.id); }}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {a.description && <p className="text-[10px] text-slate-500 font-semibold truncate">{a.description}</p>}
                    
                    <div className="flex justify-between items-center text-[10px] font-bold mt-2 pt-2 border-t border-slate-900/60">
                      <span className="text-slate-500">Net Balance</span>
                      <span className={`font-mono font-black ${a.runningBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {a.runningBalance >= 0 ? '+' : ''}₹{a.runningBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {(a.outstandingPay === 0 && a.outstandingReceive === 0) && (
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider mt-1.5 pt-1 border-t border-slate-900/40 text-green-400">
                        <span>Status</span>
                        <span className="bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">Closed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT VIEWPORT: DASHBOARD STATS AND TRANSACTION LEDGER */}
          <div className="lg:col-span-3 space-y-6">
            {/* OVERVIEW STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/20 border border-slate-900 p-4.5 rounded-3xl">
              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Borrowed</p>
                <p className="text-base font-black text-white font-mono mt-1">₹{overall.totalBorrowed.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Lent</p>
                <p className="text-base font-black text-white font-mono mt-1">₹{overall.totalLent.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Settled</p>
                <p className="text-base font-black text-green-400 font-mono mt-1">₹{overall.settledAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Outstanding to Pay</p>
                <p className="text-base font-black text-red-400 font-mono mt-1">₹{overall.outstandingPay.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-green-500/5 border border-green-500/10 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Outstanding to Receive</p>
                <p className="text-base font-black text-green-400 font-mono mt-1">₹{overall.outstandingReceive.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Net Balance</p>
                <p className={`text-base font-black font-mono mt-1 ${overall.outstandingReceive - overall.outstandingPay >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {overall.outstandingReceive - overall.outstandingPay >= 0 ? '+' : ''}₹{(overall.outstandingReceive - overall.outstandingPay).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* LEDGER DETAILS PANEL */}
            {activeAccount && (
              <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                      {activeAccount.account_name} Ledger
                      {(activeAccount.outstandingPay === 0 && activeAccount.outstandingReceive === 0) ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                          Closed (Fully Settled)
                        </span>
                      ) : (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                          Active
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Running account balance: 
                      <span className={`font-mono font-black ml-1.5 ${activeAccount.runningBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {activeAccount.runningBalance >= 0 ? '+' : ''}₹{activeAccount.runningBalance.toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="border border-slate-800 text-slate-400 hover:text-white text-[11px] py-1.5">
                      Import CSV
                    </Button>
                    <Button onClick={handleOpenAddTx} variant="primary" className="text-xs py-1.5 bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Log Record
                    </Button>
                  </div>
                </div>

                {/* FILTERS PANEL */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20 p-3.5 rounded-2xl border border-slate-900/60">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Type</label>
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1 px-2 text-white focus:outline-none text-[11px]"
                    >
                      <option value="All">All Types</option>
                      <option value="Borrowed">Borrowed</option>
                      <option value="Lent">Lent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Repayment Status</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1 px-2 text-white focus:outline-none text-[11px]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Partially Settled">Partially Settled</option>
                      <option value="Fully Settled">Fully Settled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={e => setFilterStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1 px-2 text-white focus:outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={e => setFilterEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1 px-2 text-white focus:outline-none text-[11px]"
                    />
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-10 text-slate-400 font-bold">Querying ledger records...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 border border-slate-900 rounded-2xl text-center text-slate-500">
                    No transactions match current filters. Log a new record or adjust filter options.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* TABLE */}
                    <div className="border border-slate-900 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase border-b border-slate-900">
                            <th className="py-2.5 px-3.5 w-10"></th>
                            <th className="py-2.5 px-2">Date</th>
                            <th className="py-2.5 px-2">Record details</th>
                            <th className="py-2.5 px-2">Type</th>
                            <th className="py-2.5 px-2">Status</th>
                            <th className="py-2.5 px-2 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTransactions.map((t) => {
                            const isExpanded = expandedTxId === t.id;
                            return (
                              <React.Fragment key={t.id}>
                                <tr className="border-b border-slate-900/40 hover:bg-slate-900/20">
                                  <td className="py-2.5 px-3.5 text-center">
                                    <button 
                                      onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                                      className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-white transition"
                                    >
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-2 font-mono text-white text-[11px]">{formatDisplayDate(t.date)}</td>
                                  <td className="py-2.5 px-2">
                                    <p className="font-extrabold text-white leading-normal">{t.description}</p>
                                    {t.notes && <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-normal">{t.notes}</p>}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border ${
                                      t.type === 'Borrowed' 
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                                    }`}>
                                      {t.type === 'Borrowed' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-black border ${
                                      t.status === 'Settled'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/10'
                                        : t.status === 'Partially Settled'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                                        : 'bg-red-500/10 text-red-400 border-red-500/10'
                                    }`}>
                                      {t.status === 'Settled' ? 'Fully Settled' : t.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-mono text-[10px] leading-relaxed">
                                    <p className="font-extrabold text-white">Original: ₹{t.amount.toLocaleString('en-IN')}</p>
                                    <p className="text-green-400 font-bold">Settled: ₹{t.settledAmount.toLocaleString('en-IN')}</p>
                                    <p className="text-slate-400 font-black">Remaining: ₹{t.outstandingAmount.toLocaleString('en-IN')}</p>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center space-x-1.5">
                                      <button onClick={() => handleOpenEditTx(t)} className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-900 transition">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteTx(t.id)} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded Settlements Segment */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="p-4 bg-slate-950/80 border-b border-slate-900">
                                      <div className="space-y-3.5">
                                        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Settlement & Repayments History</p>
                                          {t.outstandingAmount > 0 && (
                                            <Button 
                                              onClick={() => handleOpenAddSettlement(t.id, t.outstandingAmount)}
                                              variant="primary" 
                                              className="text-[9px] py-1 px-2.5 bg-green-600 hover:bg-green-700"
                                            >
                                              Add Repayment entry
                                            </Button>
                                          )}
                                        </div>

                                        {t.settlements.length === 0 ? (
                                          <p className="text-slate-500 text-[10px] font-semibold py-1">No settlements logged for this debt entry.</p>
                                        ) : (
                                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1 pb-1">
                                            {t.settlements.map((s: any) => (
                                              <div key={s.id} className="flex justify-between items-center p-2.5 bg-slate-900/30 border border-slate-900 rounded-xl text-[10px]">
                                                <div className="space-y-0.5">
                                                  <p className="font-extrabold text-white">₹{s.amount.toLocaleString('en-IN')}</p>
                                                  <p className="text-slate-500 font-semibold">{s.notes || (t.type === 'Borrowed' ? 'Repayment Made' : 'Collection Received')}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-slate-400 font-mono flex items-center gap-1 mr-2">
                                                    <Calendar className="w-3 h-3 text-slate-500" /> {formatDisplayDate(s.date)}
                                                  </span>
                                                  <button 
                                                    onClick={() => handleOpenEditSettlement(t.id, s)}
                                                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition"
                                                    title="Edit Entry"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDeleteSettlement(s.id)}
                                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition"
                                                    title="Delete Entry"
                                                  >
                                                    <Trash className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <div className="pt-2.5 border-t border-slate-900 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                          <span>Remaining Balance</span>
                                          <span className="font-mono text-white text-[11px]">₹{t.outstandingAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 shrink-0">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Page {currentPage} of {totalPages}</span>
                        <div className="flex space-x-2">
                          <Button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                            variant="ghost" 
                            className="border border-slate-900 px-3 py-1 text-[11px]"
                          >
                            Prev
                          </Button>
                          <Button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                            variant="ghost" 
                            className="border border-slate-900 px-3 py-1 text-[11px]"
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
      )}

      {/* ACCOUNT MODAL */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccModal(false)} />
          <form onSubmit={handleAccSubmit} className="relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-black text-white border-b border-slate-900 pb-2 uppercase tracking-wider">
              {editingAcc ? 'Edit Debt Account' : 'New Debt Account'}
            </h3>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Account Name *</label>
              <input
                type="text" required
                value={accForm.account_name}
                onChange={e => setAccForm(f => ({ ...f, account_name: e.target.value }))}
                placeholder="e.g. Friends, SBI Loan, Ashok"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Description</label>
              <textarea
                value={accForm.description}
                onChange={e => setAccForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes or details"
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3.5 pt-2">
              <Button onClick={() => setShowAccModal(false)} variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 px-5 text-white">Save</Button>
            </div>
          </form>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTxModal(false)} />
          <form onSubmit={handleTxSubmit} className="relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-black text-white border-b border-slate-900 pb-2 uppercase tracking-wider">
              {editingSettlement ? 'Edit Settlement' : editingTx ? 'Edit Debt Record' : 'Log New Record'}
            </h3>

            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 border border-slate-850 rounded-xl">
              <button
                type="button"
                disabled={!!editingTx || !!editingSettlement}
                onClick={() => setTxForm(f => ({ ...f, type: 'Borrowed' }))}
                className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                  txForm.type === 'Borrowed' ? 'bg-red-500/20 text-red-400 border border-red-500/10' : 'text-slate-400 hover:text-white'
                } disabled:opacity-50`}
              >
                Borrowed
              </button>
              <button
                type="button"
                disabled={!!editingTx || !!editingSettlement}
                onClick={() => setTxForm(f => ({ ...f, type: 'Lent' }))}
                className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                  txForm.type === 'Lent' ? 'bg-green-500/20 text-green-400 border border-green-500/10' : 'text-slate-400 hover:text-white'
                } disabled:opacity-50`}
              >
                Lent
              </button>
              <button
                type="button"
                disabled={!!editingTx || !!editingSettlement}
                onClick={() => setTxForm(f => ({ ...f, type: 'Settlement' }))}
                className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                  txForm.type === 'Settlement' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/10' : 'text-slate-400 hover:text-white'
                } disabled:opacity-50`}
              >
                Settlement
              </button>
            </div>

            {txForm.type === 'Settlement' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Settlement Type *</label>
                  <select
                    disabled={!!editingSettlement}
                    value={txForm.settlementType}
                    onChange={e => {
                      const val = e.target.value;
                      setTxForm(f => ({ ...f, settlementType: val, parentTxId: '' }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-bold"
                  >
                    <option value="Repayment Made">Repayment Made (I paid money back)</option>
                    <option value="Collection Received">Collection Received (I received money back)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Original Transaction *</label>
                  <select
                    disabled={!!editingSettlement}
                    required
                    value={txForm.parentTxId}
                    onChange={e => {
                      const val = e.target.value;
                      const targetType = txForm.settlementType === 'Repayment Made' ? 'Borrowed' : 'Lent';
                      const eligible = transactions.filter(t => t.type === targetType && (t.status !== 'Settled' || String(t.id) === val));
                      const selectedTx = eligible.find(tx => String(tx.id) === val);
                      setTxForm(f => ({ 
                        ...f, 
                        parentTxId: val,
                        amount: selectedTx ? String(selectedTx.outstandingAmount) : '',
                        description: selectedTx ? `Repayment for ${selectedTx.description}` : ''
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-bold"
                  >
                    <option value="">-- Select Transaction --</option>
                    {(() => {
                      const targetType = txForm.settlementType === 'Repayment Made' ? 'Borrowed' : 'Lent';
                      const eligible = transactions.filter(t => t.type === targetType && (t.status !== 'Settled' || String(t.id) === txForm.parentTxId));
                      return eligible.map(tx => (
                        <option key={tx.id} value={tx.id}>
                          {tx.description} (Orig: ₹{tx.amount.toLocaleString()} | Rem: ₹{tx.outstandingAmount.toLocaleString()})
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Amount *</label>
                <input
                  type="number" required min="0" step="any"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="₹0.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
                />
                {(() => {
                  if (txForm.type === 'Settlement' && txForm.parentTxId) {
                    const selectedParent = transactions.find(t => String(t.id) === txForm.parentTxId);
                    if (selectedParent) {
                      const currentSettledValue = editingSettlement ? Number(editingSettlement.amount) : 0;
                      const maxAllowed = selectedParent.outstandingAmount + currentSettledValue;
                      return (
                        <p className="text-[9px] text-slate-500 mt-1 font-semibold">
                          Max allowed: <span className="text-purple-400">₹{maxAllowed.toLocaleString('en-IN')}</span>
                        </p>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Date *</label>
                <input
                  type="date" required
                  value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Description *</label>
              <input
                type="text" required
                value={txForm.description}
                onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Car purchase, SBI loan deposit"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">Additional Notes</label>
              <textarea
                value={txForm.notes}
                onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes or details"
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3.5 pt-2">
              <Button onClick={() => setShowTxModal(false)} variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 px-5 text-white">
                {editingSettlement || editingTx ? 'Save' : 'Log'}
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
