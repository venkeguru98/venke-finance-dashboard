import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Plus, Edit2, Trash2, ArrowLeft, Coins } from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface GoldModuleProps {
  onBack: () => void;
}

export default function GoldModule({ onBack }: GoldModuleProps) {
  const [investments, setInvestments] = useState<any[]>([]);
  const [activeGold, setActiveGold] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    thisYearTotal: 0,
    lastYearTotal: 0,
    overallTotal: 0,
    yearlySummary: []
  });
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Forms
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [editingGold, setEditingGold] = useState<any | null>(null);
  const [goldForm, setGoldForm] = useState({
    investment_name: '',
    platform: 'PhonePe',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    remarks: ''
  });

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/gold`);
      setInvestments(res.data || []);
      if (res.data && res.data.length > 0) {
        if (!activeGold) {
          handleSelectGold(res.data[0]);
        } else {
          const updated = res.data.find((g: any) => g.id === activeGold.id);
          if (updated) {
            setActiveGold(updated);
            fetchDetails(updated.id);
          }
        }
      } else {
        setActiveGold(null);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/records/gold/${id}/transactions`);
      setTransactions(res.data.transactions || []);
      setSummary(res.data.summary || {
        thisYearTotal: 0,
        lastYearTotal: 0,
        overallTotal: 0,
        yearlySummary: []
      });
      setCurrentPage(1);
    } catch (_) {
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleSelectGold = (g: any) => {
    setActiveGold(g);
    fetchDetails(g.id);
  };

  const handleOpenAddGold = () => {
    setEditingGold(null);
    setGoldForm({
      investment_name: '',
      platform: 'PhonePe',
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setShowGoldModal(true);
  };

  const handleOpenEditGold = (g: any) => {
    setEditingGold(g);
    setGoldForm({
      investment_name: g.investment_name,
      platform: g.platform,
      start_date: g.start_date,
      end_date: g.end_date || ''
    });
    setShowGoldModal(true);
  };

  const handleGoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGold) {
        await axios.put(`${API}/records/gold/${editingGold.id}`, goldForm);
      } else {
        await axios.post(`${API}/records/gold`, goldForm);
      }
      setShowGoldModal(false);
      fetchInvestments();
    } catch (_) {
      alert('Error saving investment.');
    }
  };

  const handleDeleteGold = async (id: number) => {
    if (!confirm('Are you sure you want to delete this gold investment tracker and all its buy records?')) return;
    try {
      await axios.delete(`${API}/records/gold/${id}`);
      setActiveGold(null);
      fetchInvestments();
    } catch (_) {
      alert('Error deleting gold tracker.');
    }
  };

  const handleOpenAddTx = () => {
    if (!activeGold) return;
    setTxForm({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: '',
      remarks: ''
    });
    setShowTxModal(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGold) return;
    const data = {
      ...txForm,
      month: Number(txForm.month),
      year: Number(txForm.year),
      amount: Number(txForm.amount)
    };

    try {
      await axios.post(`${API}/records/gold/${activeGold.id}/transactions`, data);
      setShowTxModal(false);
      fetchInvestments(); // updates active investment total
    } catch (_) {
      alert('Error logging buy transaction.');
    }
  };

  const handleDeleteTx = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this gold investment record?')) return;
    try {
      await axios.delete(`${API}/records/gold/transactions/${txId}`);
      fetchInvestments();
    } catch (_) {
      alert('Error deleting transaction record.');
    }
  };

  // Compile monthly trend for Chart (Recharts)
  const getMonthlyChartData = () => {
    // Return last 12 months in chronological order
    const list = [...transactions].reverse();
    return list.map((t: any) => {
      const d = new Date(2000, t.month - 1);
      return {
        name: d.toLocaleString('default', { month: 'short' }) + ' ' + String(t.year).slice(2),
        Amount: t.amount
      };
    });
  };

  const getYearlyChartData = () => {
    const list = [...summary.yearlySummary].reverse();
    return list.map((y: any) => ({
      year: String(y.year),
      Amount: y.total
    }));
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
              <Coins className="w-6 h-6 text-amber-500" /> PhonePe DigiGold Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Track your digital gold savings, platform contributions, and yearly growth trends</p>
          </div>
        </div>
        <Button onClick={handleOpenAddGold} variant="primary" className="text-xs font-bold py-2.5 px-4.5 bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-1.5" /> Add Gold Account
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading gold tracker...</div>
      ) : investments.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No Digital Gold trackers configured. Start by creating one!</p>
          <Button onClick={handleOpenAddGold} variant="primary" className="text-xs py-2.5 bg-amber-500 hover:bg-amber-600">
            Create Gold Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LIST */}
          <div className="space-y-3.5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Gold Accounts ({investments.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {investments.map((g) => {
                const isActive = activeGold && activeGold.id === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGold(g)}
                    className={`p-4.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3.5 ${
                      isActive 
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white">{g.investment_name}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Platform: {g.platform}</p>
                      </div>
                      <span className="bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        Gold
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Total Invested</p>
                        <p className="font-black text-amber-500 text-sm mt-0.5">₹{g.totalInvested.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-semibold">
                        <p className="text-slate-500 font-bold uppercase text-[9px]">Started</p>
                        <p className="mt-0.5">{formatDisplayDate(g.start_date)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE ACCOUNT DETAILS */}
          {activeGold && (
            <div className="lg:col-span-2 space-y-6">
              {/* DETAILS CARD */}
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">{activeGold.investment_name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Platform: <code className="text-amber-500 font-bold">{activeGold.platform}</code> | Started: {formatDisplayDate(activeGold.start_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="text-xs py-2 px-3 border border-slate-800 text-slate-400 hover:text-white">
                      Import CSV
                    </Button>
                    <Button onClick={() => handleOpenEditGold(activeGold)} variant="ghost" className="text-xs py-2 px-3">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button onClick={() => handleDeleteGold(activeGold.id)} variant="ghost" className="text-xs py-2 px-3 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* STATS MATRIX */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Overall Invested</p>
                    <p className="text-md font-black text-amber-500 mt-1">₹{summary.overallTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Invested This Year</p>
                    <p className="text-md font-black text-white mt-1">₹{summary.thisYearTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Invested Last Year</p>
                    <p className="text-md font-black text-slate-400 mt-1">₹{summary.lastYearTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Contributions</p>
                    <p className="text-md font-black text-slate-350 mt-1">{transactions.length} buys</p>
                  </div>
                </div>

                {/* CHARTS CONTAINER */}
                {transactions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monthly Buy Trend</h4>
                      <div className="h-40 bg-slate-900/20 border border-slate-850/60 p-2.5 rounded-2xl">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getMonthlyChartData()}>
                            <defs>
                              <linearGradient id="goldColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Area type="monotone" dataKey="Amount" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#goldColor)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Yearly Contribution Share</h4>
                      <div className="h-40 bg-slate-900/20 border border-slate-850/60 p-2.5 rounded-2xl">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getYearlyChartData()}>
                            <XAxis dataKey="year" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Bar dataKey="Amount" fill="#d97706" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* TIMELINE AND HISTORY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* YEARLY SUMMARY LIST */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Yearly Summaries</h3>
                  {loadingDetails ? (
                    <p className="text-slate-500 text-xs font-semibold">Loading stats...</p>
                  ) : summary.yearlySummary.length === 0 ? (
                    <p className="text-slate-500 text-xs font-semibold">No transactions logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {summary.yearlySummary.map((y: any) => (
                        <div key={y.year} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl">
                          <span className="font-bold text-slate-350">{y.year}</span>
                          <span className="font-black text-amber-500">₹{y.total.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TRANSACTION HISTORY */}
                <div className="md:col-span-2 bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-1">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Monthly Buy History</h3>
                    <Button onClick={handleOpenAddTx} variant="primary" className="text-[10px] py-1.5 px-3 bg-amber-500 hover:bg-amber-600">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Log Purchase
                    </Button>
                  </div>

                  {loadingDetails ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">Loading records...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">No transactions recorded. Click Log Purchase above to record a gold buy.</div>
                  ) : (() => {
                    const totalPages = Math.ceil(transactions.length / rowsPerPage);
                    const paginated = transactions.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-900 text-slate-500 font-bold">
                                <th className="py-2.5 pr-2">Period</th>
                                <th className="py-2.5 px-2">Amount</th>
                                <th className="py-2.5 px-2">Remarks</th>
                                <th className="py-2.5 pl-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((t) => {
                                const dateObj = new Date(2000, t.month - 1);
                                const monthStr = dateObj.toLocaleString('default', { month: 'short' });
                                return (
                                  <tr key={t.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                                    <td className="py-2.5 pr-2 font-bold text-white">{monthStr} {t.year}</td>
                                    <td className="py-2.5 px-2 font-black text-amber-500">₹{t.amount.toLocaleString('en-IN')}</td>
                                    <td className="py-2.5 px-2 text-slate-400 truncate max-w-[150px]" title={t.remarks}>{t.remarks || '-'}</td>
                                    <td className="py-2.5 pl-2 text-right">
                                      <button onClick={() => handleDeleteTx(t.id)} className="p-1 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-slate-900">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
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

      {/* CREATE/EDIT GOLD MODAL */}
      {showGoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">{editingGold ? 'Edit Gold Tracker' : 'Create Gold Tracker'}</h3>
              <button onClick={() => setShowGoldModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleGoldSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div>
                <label className="block text-slate-400 mb-1">Investment Name *</label>
                <input
                  type="text" required placeholder="e.g. PhonePe DigiGold"
                  value={goldForm.investment_name}
                  onChange={e => setGoldForm(f => ({ ...f, investment_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Platform *</label>
                  <input
                    type="text" required placeholder="e.g. PhonePe"
                    value={goldForm.platform}
                    onChange={e => setGoldForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date" required
                    value={goldForm.start_date}
                    onChange={e => setGoldForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={goldForm.end_date}
                  onChange={e => setGoldForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowGoldModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-amber-500 hover:bg-amber-600">Save Tracker</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">Log Gold Purchase</h3>
              <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Month *</label>
                  <select
                    value={txForm.month}
                    onChange={e => setTxForm(f => ({ ...f, month: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const d = new Date(2000, i);
                      return <option key={i+1} value={i+1}>{d.toLocaleString('default', { month: 'long' })}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Year *</label>
                  <input
                    type="number" required
                    value={txForm.year}
                    onChange={e => setTxForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Amount Invested *</label>
                <input
                  type="number" required placeholder="e.g. 500"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text" placeholder="e.g. Regular monthly SIP"
                  value={txForm.remarks}
                  onChange={e => setTxForm(f => ({ ...f, remarks: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowTxModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-amber-500 hover:bg-amber-600">Record Buy</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && activeGold && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            alert(msg);
            fetchInvestments();
          }}
          importUrl={`${API}/records/gold/${activeGold.id}/import`}
          moduleType="gold"
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
