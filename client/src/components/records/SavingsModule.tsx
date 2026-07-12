import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowLeftRight, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface SavingsModuleProps {
  onBack: () => void;
}

export default function SavingsModule({ onBack }: SavingsModuleProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [yearlySummary, setYearlySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Forms
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any | null>(null);
  const [accForm, setAccForm] = useState({
    account_name: '',
    opening_balance: '',
    description: '',
    color_tag: '#3B82F6'
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'Credit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    transfer_account_id: ''
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/savings`);
      setAccounts(res.data || []);
      if (res.data && res.data.length > 0) {
        if (!activeAccount) {
          handleSelectAccount(res.data[0]);
        } else {
          const updated = res.data.find((a: any) => a.id === activeAccount.id);
          if (updated) {
            setActiveAccount(updated);
            fetchTransactions(updated.id);
          }
        }
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
      const res = await axios.get(`${API}/records/savings/${id}/transactions`);
      setTransactions(res.data.transactions || []);
      setMonthlySummary(res.data.monthlySummary || []);
      setYearlySummary(res.data.yearlySummary || []);
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
    setIsDetailCollapsed(false);
    fetchTransactions(a.id);
  };

  const handleOpenAddAcc = () => {
    setEditingAcc(null);
    setAccForm({
      account_name: '',
      opening_balance: '',
      description: '',
      color_tag: '#3b82f6'
    });
    setShowAccModal(true);
  };

  const handleOpenEditAcc = (a: any) => {
    setEditingAcc(a);
    setAccForm({
      account_name: a.account_name,
      opening_balance: String(a.opening_balance),
      description: a.description || '',
      color_tag: a.color_tag || '#3b82f6'
    });
    setShowAccModal(true);
  };

  const handleAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...accForm,
      opening_balance: Number(accForm.opening_balance)
    };

    try {
      if (editingAcc) {
        await axios.put(`${API}/records/savings/${editingAcc.id}`, data);
      } else {
        await axios.post(`${API}/records/savings`, data);
      }
      setShowAccModal(false);
      fetchAccounts();
    } catch (_) {
      alert('Error saving account.');
    }
  };

  const handleDeleteAcc = async (id: number) => {
    if (!confirm('Are you sure you want to delete this offline account and all its transaction ledger history?')) return;
    try {
      await axios.delete(`${API}/records/savings/${id}`);
      setActiveAccount(null);
      fetchAccounts();
    } catch (_) {
      alert('Error deleting account.');
    }
  };

  const handleOpenAddTx = (type: 'Credit' | 'Debit' | 'Transfer') => {
    if (!activeAccount) return;
    setTxForm({
      type,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      transfer_account_id: ''
    });
    setShowTxModal(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    const data = {
      ...txForm,
      account_id: activeAccount.id,
      amount: Number(txForm.amount),
      transfer_account_id: txForm.type === 'Transfer' ? Number(txForm.transfer_account_id) : undefined
    };

    try {
      await axios.post(`${API}/records/savings/transactions`, data);
      setShowTxModal(false);
      fetchAccounts(); // updates current balance
    } catch (_) {
      alert('Error registering transaction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <button onClick={onBack} className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-500" /> Offline Savings Accounts
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage bank balances, cash wallets, emergency funds, and sync transfers offline</p>
          </div>
        </div>
        <Button onClick={handleOpenAddAcc} variant="primary" className="text-xs font-bold py-2.5 px-4.5 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" /> Add Account
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading savings ledger...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No offline savings accounts configured. Add one to replace your Excel tracker sheets!</p>
          <Button onClick={handleOpenAddAcc} variant="primary" className="text-xs py-2.5 bg-blue-600 hover:bg-blue-700">
            Add Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-350">
          {/* ACCOUNTS LIST */}
          <div className={`space-y-3.5 transition-all duration-350 ${isDetailCollapsed ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Offline Accounts ({accounts.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {accounts.map((a) => {
                const isActive = activeAccount && activeAccount.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelectAccount(a)}
                    onDoubleClick={() => {
                      if (activeAccount && activeAccount.id === a.id) {
                        setIsDetailCollapsed(!isDetailCollapsed);
                      }
                    }}
                    className={`p-4.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/5' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color_tag || '#3B82F6' }} />
                        <h3 className="font-bold text-sm text-white">{a.account_name}</h3>
                      </div>
                      <span className="bg-slate-850 text-slate-350 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase">
                        Offline
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Balance</p>
                        <p className="font-black text-white text-sm mt-0.5">₹{a.current_balance.toLocaleString('en-IN')}</p>
                      </div>
                      {a.current_balance < 2000 && (
                        <span className="bg-red-500/10 text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          Low Balance
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE ACCOUNT DETAILS */}
          {!isDetailCollapsed && activeAccount && (
            <div className="lg:col-span-2 space-y-6">
              {/* DETAILS CARD */}
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: activeAccount.color_tag || '#3B82F6' }} />
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                        {activeAccount.account_name}
                        <button
                          onClick={() => setIsDetailCollapsed(true)}
                          className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                          title="Collapse details panel"
                        >
                          <ChevronRight className="w-4.5 h-4.5" />
                        </button>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Opening balance: ₹{activeAccount.opening_balance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="text-xs py-2 px-3 border border-slate-800 text-slate-400 hover:text-white">
                      Import CSV
                    </Button>
                    <Button onClick={() => handleOpenEditAcc(activeAccount)} variant="ghost" className="text-xs py-2 px-3">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button onClick={() => handleDeleteAcc(activeAccount.id)} variant="ghost" className="text-xs py-2 px-3 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* BALANCE MATRIX */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Current Balance</p>
                    <p className="text-lg font-black text-blue-400 mt-1">₹{activeAccount.current_balance.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Credits</p>
                    <p className="text-lg font-black text-green-400 mt-1">₹{activeAccount.totalCredits.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Debits</p>
                    <p className="text-lg font-black text-red-400 mt-1">₹{activeAccount.totalDebits.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Description */}
                {activeAccount.description && (
                  <div className="p-3.5 bg-slate-900/20 border border-slate-900 rounded-2xl text-xs space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Account Info</p>
                    <p className="text-slate-350">{activeAccount.description}</p>
                  </div>
                )}

                {/* QUICK ACTIONS FOR LEDGER */}
                <div className="flex flex-wrap gap-2.5 border-t border-slate-900 pt-5">
                  <Button onClick={() => handleOpenAddTx('Credit')} className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 py-2 px-4.5 hover:bg-green-500/20">
                    <TrendingUp className="w-4 h-4 mr-1.5" /> Credit Money
                  </Button>
                  <Button onClick={() => handleOpenAddTx('Debit')} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 py-2 px-4.5 hover:bg-red-500/20">
                    <TrendingDown className="w-4 h-4 mr-1.5" /> Debit Money
                  </Button>
                  {accounts.length > 1 && (
                    <Button onClick={() => handleOpenAddTx('Transfer')} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 py-2 px-4.5 hover:bg-blue-500/20">
                      <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Transfer Funds
                    </Button>
                  )}
                </div>
              </div>

              {/* TIMELINE AND HISTORY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* MONTHLY & YEARLY SUMMARY LIST */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Monthly Summaries</h3>
                    {loadingDetails ? (
                      <p className="text-slate-500 text-xs font-semibold">Loading stats...</p>
                    ) : monthlySummary.length === 0 ? (
                      <p className="text-slate-500 text-xs font-semibold">No transactions logged.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {monthlySummary.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl">
                            <span className="font-bold text-slate-350">{m.month}</span>
                            <span className={`font-black ${m.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {m.net >= 0 ? '+' : ''}₹{m.net.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-slate-900 pt-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Yearly Summaries</h3>
                    {loadingDetails ? (
                      <p className="text-slate-500 text-xs font-semibold">Loading stats...</p>
                    ) : yearlySummary.length === 0 ? (
                      <p className="text-slate-500 text-xs font-semibold">No transactions logged.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {yearlySummary.map((y: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl">
                            <span className="font-bold text-slate-350">{y.year}</span>
                            <span className={`font-black ${y.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {y.net >= 0 ? '+' : ''}₹{y.net.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* TRANSACTION HISTORY */}
                <div className="md:col-span-2 bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Account Transaction History</h3>

                  {loadingDetails ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">Loading ledger records...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">No transactions recorded for this account yet. Use the buttons above to log credits/debits.</div>
                  ) : (() => {
                    const totalPages = Math.ceil(transactions.length / rowsPerPage);
                    const paginated = transactions.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-900 text-slate-500 font-bold">
                                <th className="py-2.5 pr-2">Date</th>
                                <th className="py-2.5 px-2">Type</th>
                                <th className="py-2.5 px-2">Amount</th>
                                <th className="py-2.5 px-2">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((t) => (
                                <tr key={t.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                                  <td className="py-2.5 pr-2 font-mono text-white">{formatDisplayDate(t.date)}</td>
                                  <td className="py-2.5 px-2">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      t.type === 'Credit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-2 font-black ${t.type === 'Credit' ? 'text-green-400' : 'text-red-400'}`}>
                                    ₹{t.amount.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-400 max-w-[180px] truncate" title={t.description}>
                                    {t.description || '-'} 
                                    {t.transfer_account_name && <span className="text-[10px] text-slate-500 block">Rel: {t.transfer_account_name}</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-2">
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
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE/EDIT ACCOUNT MODAL */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">{editingAcc ? 'Edit Account' : 'Create Account'}</h3>
              <button onClick={() => setShowAccModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleAccSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div>
                <label className="block text-slate-400 mb-1">Account Name *</label>
                <input
                  type="text" required placeholder="e.g. Canara Bank"
                  value={accForm.account_name}
                  onChange={e => setAccForm(f => ({ ...f, account_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Opening Balance *</label>
                  <input
                    type="number" required placeholder="e.g. 5000"
                    value={accForm.opening_balance}
                    onChange={e => setAccForm(f => ({ ...f, opening_balance: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Theme Color *</label>
                  <input
                    type="color" required
                    value={accForm.color_tag}
                    onChange={e => setAccForm(f => ({ ...f, color_tag: e.target.value }))}
                    className="w-full h-8 px-1 py-0.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Notes</label>
                <input
                  type="text" placeholder="e.g. Primary savings account"
                  value={accForm.description}
                  onChange={e => setAccForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowAccModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-blue-600 hover:bg-blue-700">Save Account</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">Record {txForm.type}</h3>
              <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Amount *</label>
                  <input
                    type="number" required placeholder="e.g. 1000"
                    value={txForm.amount}
                    onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date *</label>
                  <input
                    type="date" required
                    value={txForm.date}
                    onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                  />
                </div>
              </div>

              {txForm.type === 'Transfer' && (
                <div>
                  <label className="block text-slate-400 mb-1">Destination Account *</label>
                  <select
                    required
                    value={txForm.transfer_account_id}
                    onChange={e => setTxForm(f => ({ ...f, transfer_account_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                  >
                    <option value="">Select target account...</option>
                    {accounts
                      .filter(a => a.id !== activeAccount.id)
                      .map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Description *</label>
                <input
                  type="text" required placeholder={txForm.type === 'Transfer' ? 'e.g. TMB to Canara Sync' : 'e.g. Salary credited, grocery spent'}
                  value={txForm.description}
                  onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowTxModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-blue-600 hover:bg-blue-700">Record Entry</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && activeAccount && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            alert(msg);
            fetchAccounts();
          }}
          importUrl={`${API}/records/savings/${activeAccount.id}/import`}
          moduleType="savings"
        />
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
