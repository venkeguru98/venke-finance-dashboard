import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, ArrowLeft, Landmark, Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface ChitModuleProps {
  onBack: () => void;
}

export default function ChitModule({ onBack }: ChitModuleProps) {
  const [chits, setChits] = useState<any[]>([]);
  const [activeChit, setActiveChit] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [yearlySummary, setYearlySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Forms
  const [showChitModal, setShowChitModal] = useState(false);
  const [editingChit, setEditingChit] = useState<any | null>(null);
  const [chitForm, setChitForm] = useState({
    chit_name: '',
    monthly_installment: '',
    start_date: '',
    closing_date: '',
    total_months: '20',
    organizer_name: '',
    notes: '',
    status: 'Running'
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    installment_amount: '',
    status: 'Pending',
    payment_date: '',
    remarks: ''
  });

  const fetchChits = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/chits`);
      setChits(res.data || []);
      if (res.data && res.data.length > 0) {
        if (!activeChit) {
          handleSelectChit(res.data[0]);
        } else {
          const updated = res.data.find((c: any) => c.id === activeChit.id);
          if (updated) {
            setActiveChit(updated);
            fetchPayments(updated.id);
          }
        }
      } else {
        setActiveChit(null);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/records/chits/${id}/payments`);
      setPayments(res.data.payments || []);
      setYearlySummary(res.data.yearlySummary || []);
      setCurrentPage(1);
    } catch (_) {
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchChits();
  }, []);

  const handleSelectChit = (c: any) => {
    setActiveChit(c);
    setIsDetailCollapsed(false);
    fetchPayments(c.id);
  };

  const handleOpenAddChit = () => {
    setEditingChit(null);
    setChitForm({
      chit_name: '',
      monthly_installment: '',
      start_date: '',
      closing_date: '',
      total_months: '20',
      organizer_name: '',
      notes: '',
      status: 'Running'
    });
    setShowChitModal(true);
  };

  const handleOpenEditChit = (c: any) => {
    setEditingChit(c);
    setChitForm({
      chit_name: c.chit_name,
      monthly_installment: String(c.monthly_installment),
      start_date: c.start_date,
      closing_date: c.closing_date,
      total_months: String(c.total_months),
      organizer_name: c.organizer_name || '',
      notes: c.notes || '',
      status: c.status
    });
    setShowChitModal(true);
  };

  const handleChitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...chitForm,
      monthly_installment: Number(chitForm.monthly_installment),
      total_months: Number(chitForm.total_months)
    };

    try {
      if (editingChit) {
        await axios.put(`${API}/records/chits/${editingChit.id}`, data);
      } else {
        await axios.post(`${API}/records/chits`, data);
      }
      setShowChitModal(false);
      fetchChits();
    } catch (_) {
      alert('Error saving chit fund.');
    }
  };

  const handleDeleteChit = async (id: number) => {
    if (!confirm('Are you sure you want to delete this chit fund and its monthly schedule logs?')) return;
    try {
      await axios.delete(`${API}/records/chits/${id}`);
      setActiveChit(null);
      fetchChits();
    } catch (_) {
      alert('Error deleting chit.');
    }
  };

  const handleOpenEditPayment = (p: any) => {
    setEditingPayment(p);
    setPaymentForm({
      installment_amount: String(p.installment_amount),
      status: p.status,
      payment_date: p.payment_date || new Date().toISOString().split('T')[0],
      remarks: p.remarks || ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const data = {
      ...paymentForm,
      installment_amount: Number(paymentForm.installment_amount)
    };

    try {
      await axios.put(`${API}/records/chits/payments/${editingPayment.id}`, data);
      setShowPaymentModal(false);
      fetchChits(); // Recalculate summary details
    } catch (_) {
      alert('Error updating payment.');
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
              <Landmark className="w-6 h-6 text-purple-400" /> Chit Fund (Cheetu) Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage multiple auction groups, flexible installment amounts, and dividend history logs</p>
          </div>
        </div>
        <Button onClick={handleOpenAddChit} variant="primary" className="text-xs font-bold py-2.5 px-4.5 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-1.5" /> Create Chit Group
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading chit groups...</div>
      ) : chits.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No Chit Funds configured. Click below to register your first chit!</p>
          <Button onClick={handleOpenAddChit} variant="primary" className="text-xs py-2.5 bg-purple-600 hover:bg-purple-700">
            Create Chit Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-350">
          {/* POLICIES LIST */}
          <div className={`space-y-3.5 transition-all duration-350 ${isDetailCollapsed ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Chit Groups ({chits.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {chits.map((c) => {
                const isActive = activeChit && activeChit.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectChit(c)}
                    onDoubleClick={() => {
                      if (activeChit && activeChit.id === c.id) {
                        setIsDetailCollapsed(!isDetailCollapsed);
                      }
                    }}
                    className={`p-4.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500/50 shadow-lg shadow-purple-500/5' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white">{c.chit_name}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Organizer: {c.organizer_name || 'Personal'}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        c.status === 'Running' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase">This Month Due</p>
                         <p className="font-black text-white mt-0.5">₹{c.currentMonthDue.toLocaleString('en-IN')}</p>
                       </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Paid Progress</p>
                        <p className="font-black text-purple-400 mt-0.5">{c.completionPct}%</p>
                      </div>
                    </div>

                    {c.isPaymentPending && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Payment Pending for this month!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE DETAILS */}
          {!isDetailCollapsed && activeChit && (
            <div className="lg:col-span-2 space-y-6">
              {/* DETAILS CARD */}
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                      {activeChit.chit_name}
                      <button
                        onClick={() => setIsDetailCollapsed(true)}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                        title="Collapse details panel"
                      >
                        <ChevronRight className="w-4.5 h-4.5" />
                      </button>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Organizer: <code className="text-purple-400 font-bold">{activeChit.organizer_name || 'N/A'}</code></p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="text-xs py-2 px-3 border border-slate-800 text-slate-400 hover:text-white">
                      Import CSV
                    </Button>
                    <Button onClick={() => handleOpenEditChit(activeChit)} variant="ghost" className="text-xs py-2 px-3">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button onClick={() => handleDeleteChit(activeChit.id)} variant="ghost" className="text-xs py-2 px-3 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* PROGRESS WHEEL ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="50" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                        <circle cx="64" cy="64" r="50" stroke="#a855f7" strokeWidth="8" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - activeChit.completionPct / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{activeChit.completionPct}%</span>
                        <span className="text-[9px] text-slate-400 uppercase font-black">Logged</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Months Paid</p>
                      <p className="text-md font-black text-white mt-1">{activeChit.monthsPaid} / {activeChit.total_months} months</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Months Remaining</p>
                      <p className="text-md font-black text-white mt-1">{activeChit.monthsLeft} months left</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total Amount Paid</p>
                      <p className="text-md font-black text-green-400 mt-1">₹{activeChit.totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Remaining Liability</p>
                      <p className="text-md font-black text-slate-400 mt-1">₹{activeChit.remainingAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* TIMELINE ROW */}
                <div className="bg-slate-900/40 border border-slate-850 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Closing Date: {formatDisplayDate(activeChit.closing_date)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Start Date: {formatDisplayDate(activeChit.start_date)} ({activeChit.total_months} months cycle)</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-extrabold text-purple-400">{activeChit.daysRemaining.toLocaleString()} days countdown</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">({activeChit.monthsLeft} months remaining)</p>
                  </div>
                </div>

                {/* CHIT NOTES */}
                {activeChit.notes && (
                  <div className="p-3.5 bg-slate-900/20 border border-slate-900 rounded-2xl text-xs space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Notes & Organizer Info</p>
                    <p className="text-slate-350 leading-relaxed">{activeChit.notes}</p>
                  </div>
                )}
              </div>

              {/* SCHEDULE DETAIL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* YEARLY SUMMARY LIST */}
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Yearly Summaries</h3>
                  {loadingDetails ? (
                    <p className="text-slate-500 text-xs font-semibold">Loading stats...</p>
                  ) : yearlySummary.length === 0 ? (
                    <p className="text-slate-500 text-xs font-semibold">No payment history yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {yearlySummary.map((y) => (
                        <div key={y.year} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl">
                          <span className="font-bold text-slate-350">{y.year}</span>
                          <span className="font-black text-white">₹{y.total.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PAYMENT SCHEDULE TABLE */}
                <div className="md:col-span-2 bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Payment Schedule</h3>

                  {loadingDetails ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">Loading schedule...</div>
                  ) : (() => {
                    const totalPages = Math.ceil(payments.length / rowsPerPage);
                    const paginated = payments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-900 text-slate-500 font-bold">
                                <th className="py-2.5 pr-2">Installment</th>
                                <th className="py-2.5 px-2">Amount Due</th>
                                <th className="py-2.5 px-2">Status</th>
                                <th className="py-2.5 px-2">Paid Date</th>
                                <th className="py-2.5 pl-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((p) => {
                                const dateObj = new Date(2000, p.month - 1);
                                const monthStr = dateObj.toLocaleString('default', { month: 'short' });
                                return (
                                  <tr key={p.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                                    <td className="py-2.5 pr-2 font-bold text-white">{monthStr} {p.year}</td>
                                    <td className="py-2.5 px-2 font-black text-white">₹{p.installment_amount.toLocaleString('en-IN')}</td>
                                    <td className="py-2.5 px-2">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        p.status === 'Paid' ? 'bg-green-500/10 text-green-400' :
                                        p.status === 'Late' ? 'bg-red-500/10 text-red-400' :
                                        'bg-amber-500/10 text-amber-400'
                                      }`}>
                                        {p.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-400 font-mono">{p.payment_date ? formatDisplayDate(p.payment_date) : '-'}</td>
                                    <td className="py-2.5 pl-2 text-right">
                                      <button onClick={() => handleOpenEditPayment(p)} className="p-1 text-purple-400 hover:bg-slate-900 rounded-lg transition" title="Log/Edit Payment">
                                        <Edit2 className="w-3.5 h-3.5" />
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

      {/* CREATE CHIT MODAL */}
      {showChitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">{editingChit ? 'Edit Chit Group' : 'Create Chit Group'}</h3>
              <button onClick={() => setShowChitModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleChitSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Chit Name *</label>
                  <input
                    type="text" required placeholder="e.g. Cheetu Group 50k"
                    value={chitForm.chit_name}
                    onChange={e => setChitForm(f => ({ ...f, chit_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Organizer Name</label>
                  <input
                    type="text" placeholder="e.g. Ramesh Babu"
                    value={chitForm.organizer_name}
                    onChange={e => setChitForm(f => ({ ...f, organizer_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Monthly Installment *</label>
                  <input
                    type="number" required placeholder="e.g. 2500"
                    value={chitForm.monthly_installment}
                    onChange={e => setChitForm(f => ({ ...f, monthly_installment: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Total Cycle Months *</label>
                  <input
                    type="number" required min="1" max="100"
                    value={chitForm.total_months}
                    onChange={e => setChitForm(f => ({ ...f, total_months: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={chitForm.status}
                    onChange={e => setChitForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  >
                    <option value="Running">Running</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date" required
                    value={chitForm.start_date}
                    onChange={e => setChitForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Closing Date *</label>
                  <input
                    type="date" required
                    value={chitForm.closing_date}
                    onChange={e => setChitForm(f => ({ ...f, closing_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Terms</label>
                <textarea
                  placeholder="e.g. Dividend logic, auction day details..."
                  value={chitForm.notes}
                  onChange={e => setChitForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium h-20"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowChitModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-purple-600 hover:bg-purple-700">Save Chit</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INSTALLMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">Edit Installment / Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div>
                <label className="block text-slate-400 mb-1">Installment Amount (₹) * (Varies each month due to dividends)</label>
                <input
                  type="number" required
                  value={paymentForm.installment_amount}
                  onChange={e => setPaymentForm(f => ({ ...f, installment_amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Payment Status *</label>
                  <select
                    value={paymentForm.status}
                    onChange={e => setPaymentForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Late">Late</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text" placeholder="e.g. Dividend ₹450 received"
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm(f => ({ ...f, remarks: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowPaymentModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-purple-600 hover:bg-purple-700">Save Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && activeChit && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            alert(msg);
            fetchChits();
          }}
          importUrl={`${API}/records/chits/${activeChit.id}/import`}
          moduleType="chit"
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
