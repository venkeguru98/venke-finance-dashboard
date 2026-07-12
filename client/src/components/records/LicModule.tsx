import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Calendar, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import CsvImportModal from './CsvImportModal';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface LicModuleProps {
  onBack: () => void;
}

export default function LicModule({ onBack }: LicModuleProps) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<any | null>(null);
  const [premiums, setPremiums] = useState<any[]>([]);
  const [yearlySummary, setYearlySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Forms
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [policyForm, setPolicyForm] = useState({
    policy_name: '',
    policy_number: '',
    monthly_premium: '',
    start_date: '',
    maturity_date: '',
    premium_due_day: '5',
    policy_term: '10',
    sum_assured: '',
    expected_maturity_amount: '',
    status: 'Running'
  });

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumForm, setPremiumForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount_paid: '',
    paid_date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    remarks: ''
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/lic`);
      setPolicies(res.data || []);
      if (res.data && res.data.length > 0) {
        // Auto-select first policy if none active
        if (!activePolicy) {
          handleSelectPolicy(res.data[0]);
        } else {
          // Refresh active policy data
          const updated = res.data.find((p: any) => p.id === activePolicy.id);
          if (updated) {
            setActivePolicy(updated);
            fetchPremiums(updated.id);
          }
        }
      } else {
        setActivePolicy(null);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiums = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/records/lic/${id}/premiums`);
      setPremiums(res.data.premiums || []);
      setYearlySummary(res.data.yearlySummary || []);
      setCurrentPage(1);
    } catch (_) {
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSelectPolicy = (p: any) => {
    setActivePolicy(p);
    fetchPremiums(p.id);
  };

  const handleOpenAddPolicy = () => {
    setEditingPolicy(null);
    setPolicyForm({
      policy_name: '',
      policy_number: '',
      monthly_premium: '',
      start_date: '',
      maturity_date: '',
      premium_due_day: '5',
      policy_term: '10',
      sum_assured: '',
      expected_maturity_amount: '',
      status: 'Running'
    });
    setShowPolicyModal(true);
  };

  const handleOpenEditPolicy = (p: any) => {
    setEditingPolicy(p);
    setPolicyForm({
      policy_name: p.policy_name,
      policy_number: p.policy_number,
      monthly_premium: String(p.monthly_premium),
      start_date: p.start_date,
      maturity_date: p.maturity_date,
      premium_due_day: String(p.premium_due_day),
      policy_term: String(p.policy_term),
      sum_assured: String(p.sum_assured),
      expected_maturity_amount: String(p.expected_maturity_amount),
      status: p.status
    });
    setShowPolicyModal(true);
  };

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...policyForm,
      monthly_premium: Number(policyForm.monthly_premium),
      premium_due_day: Number(policyForm.premium_due_day),
      policy_term: Number(policyForm.policy_term),
      sum_assured: Number(policyForm.sum_assured),
      expected_maturity_amount: Number(policyForm.expected_maturity_amount)
    };

    try {
      if (editingPolicy) {
        await axios.put(`${API}/records/lic/${editingPolicy.id}`, data);
      } else {
        await axios.post(`${API}/records/lic`, data);
      }
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (_) {
      alert('Error saving policy.');
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!confirm('Are you sure you want to delete this policy and all its premium logs?')) return;
    try {
      await axios.delete(`${API}/records/lic/${id}`);
      setActivePolicy(null);
      fetchPolicies();
    } catch (_) {
      alert('Error deleting policy.');
    }
  };

  const handleOpenAddPremium = () => {
    if (!activePolicy) return;
    setPremiumForm({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount_paid: String(activePolicy.monthly_premium),
      paid_date: new Date().toISOString().split('T')[0],
      status: 'Paid',
      remarks: ''
    });
    setShowPremiumModal(true);
  };

  const handlePremiumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicy) return;
    const data = {
      ...premiumForm,
      month: Number(premiumForm.month),
      year: Number(premiumForm.year),
      amount_paid: Number(premiumForm.amount_paid)
    };

    try {
      await axios.post(`${API}/records/lic/${activePolicy.id}/premiums`, data);
      setShowPremiumModal(false);
      fetchPolicies(); // refresh policy computed details
    } catch (_) {
      alert('Error logging premium.');
    }
  };

  const handleDeletePremium = async (premiumId: number) => {
    if (!confirm('Are you sure you want to delete this premium history log?')) return;
    try {
      await axios.delete(`${API}/records/lic/premiums/${premiumId}`);
      fetchPolicies(); // refresh policy details
    } catch (_) {
      alert('Error deleting premium log.');
    }
  };

  // Math summaries this year
  const getThisYearPaidTotal = () => {
    const currentYear = new Date().getFullYear();
    const item = yearlySummary.find(y => y.year === currentYear);
    return item ? item.total : 0;
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
              <Shield className="w-6 h-6 text-cyan-400" /> LIC Policies Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Track multiple insurance policies, premium histories, and maturity calendars</p>
          </div>
        </div>
        <Button onClick={handleOpenAddPolicy} variant="primary" className="text-xs font-bold py-2.5 px-4.5">
          <Plus className="w-4 h-4 mr-1.5" /> Add Policy
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading policies data...</div>
      ) : policies.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-10 text-center space-y-4">
          <p className="text-slate-400 text-sm">No active LIC policies found. Start by adding one!</p>
          <Button onClick={handleOpenAddPolicy} variant="primary" className="text-xs py-2.5">
            Create Policy
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* POLICIES LIST */}
          <div className="space-y-3.5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Your Policies ({policies.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {policies.map((p) => {
                const isActive = activePolicy && activePolicy.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPolicy(p)}
                    className={`p-4.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/5' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white">{p.policy_name}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No: {p.policy_number}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        p.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Monthly Premium</p>
                        <p className="font-black text-white mt-0.5">₹{p.monthly_premium.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Completion</p>
                        <p className="font-black text-cyan-400 mt-0.5">{p.completionPct}%</p>
                      </div>
                    </div>

                    {p.isPremiumPending && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Premium Pending for current month!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE POLICY DETAILS */}
          {activePolicy && (
            <div className="lg:col-span-2 space-y-6">
              {/* DETAILS CARD */}
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">{activePolicy.policy_name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Policy Number: <code className="text-cyan-400 font-bold">{activePolicy.policy_number}</code></p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowImportModal(true)} variant="ghost" className="text-xs py-2 px-3 border border-slate-800 text-slate-400 hover:text-white">
                      Import CSV
                    </Button>
                    <Button onClick={() => handleOpenEditPolicy(activePolicy)} variant="ghost" className="text-xs py-2 px-3">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button onClick={() => handleDeletePolicy(activePolicy.id)} variant="ghost" className="text-xs py-2 px-3 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* PROGRESS WHEEL ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Circle indicator */}
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="50" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                        <circle cx="64" cy="64" r="50" stroke="#06b6d4" strokeWidth="8" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - activePolicy.completionPct / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{activePolicy.completionPct}%</span>
                        <span className="text-[9px] text-slate-400 uppercase font-black">Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* Installment numbers */}
                  <div className="space-y-4 md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Premiums Paid</p>
                      <p className="text-md font-black text-white mt-1">{activePolicy.premiumsPaid} / {activePolicy.totalInstallments}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Premiums Remaining</p>
                      <p className="text-md font-black text-white mt-1">{activePolicy.premiumsRemaining} months</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total Premium Paid</p>
                      <p className="text-md font-black text-green-400 mt-1">₹{activePolicy.totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Premium Remaining</p>
                      <p className="text-md font-black text-slate-400 mt-1">₹{activePolicy.totalRemaining.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* MATURITY ROW */}
                <div className="bg-slate-900/40 border border-slate-850 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Maturity Date: {formatDisplayDate(activePolicy.maturity_date)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Start Date: {formatDisplayDate(activePolicy.start_date)} ({activePolicy.policy_term} years term)</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-extrabold text-cyan-400">{activePolicy.daysRemaining.toLocaleString()} days countdown</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">({activePolicy.monthsRemaining} months remaining)</p>
                  </div>
                </div>

                {/* POLICY TARGET SUM DETAILS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-slate-900 pt-5">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Sum Assured</p>
                    <p className="font-black text-white text-sm mt-0.5">₹{activePolicy.sum_assured.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Expected Maturity</p>
                    <p className="font-black text-cyan-400 text-sm mt-0.5">₹{activePolicy.expected_maturity_amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Paid This Year</p>
                    <p className="font-black text-green-400 text-sm mt-0.5">₹{getThisYearPaidTotal().toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Premium Due Day</p>
                    <p className="font-black text-white text-sm mt-0.5">Every {activePolicy.premium_due_day}th of the month</p>
                  </div>
                </div>
              </div>

              {/* YEARLY PAYMENTS CARD */}
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

                {/* PREMIUM PAYMENT HISTORY */}
                <div className="md:col-span-2 bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-1">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Premium Payment History</h3>
                    {activePolicy.status === 'Running' && (
                      <Button onClick={handleOpenAddPremium} variant="primary" className="text-[10px] py-1.5 px-3">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Log Premium
                      </Button>
                    )}
                  </div>

                  {loadingDetails ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">Loading premium history...</div>
                  ) : premiums.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">No logged premiums found. Click Log Premium above to start.</div>
                  ) : (() => {
                    const totalPages = Math.ceil(premiums.length / rowsPerPage);
                    const paginated = premiums.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-900 text-slate-500 font-bold">
                                <th className="py-2.5 pr-2">Period</th>
                                <th className="py-2.5 px-2">Amount Paid</th>
                                <th className="py-2.5 px-2">Paid Date</th>
                                <th className="py-2.5 px-2">Remarks</th>
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
                                    <td className="py-2.5 px-2 font-black text-green-400">₹{p.amount_paid.toLocaleString('en-IN')}</td>
                                    <td className="py-2.5 px-2 text-slate-400 font-mono">{formatDisplayDate(p.paid_date)}</td>
                                    <td className="py-2.5 px-2 text-slate-400 truncate max-w-[120px]" title={p.remarks}>{p.remarks || '-'}</td>
                                    <td className="py-2.5 pl-2 text-right">
                                      <button onClick={() => handleDeletePremium(p.id)} className="p-1 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-slate-900">
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

      {/* POLICY CREATE/EDIT MODAL */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">{editingPolicy ? 'Edit LIC Policy' : 'Create LIC Policy'}</h3>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handlePolicySubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Policy Name *</label>
                  <input
                    type="text" required placeholder="e.g. LIC Jeevan Anand"
                    value={policyForm.policy_name}
                    onChange={e => setPolicyForm(f => ({ ...f, policy_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Policy Number *</label>
                  <input
                    type="text" required placeholder="e.g. 345678234"
                    value={policyForm.policy_number}
                    onChange={e => setPolicyForm(f => ({ ...f, policy_number: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Monthly Premium *</label>
                  <input
                    type="number" required placeholder="e.g. 932"
                    value={policyForm.monthly_premium}
                    onChange={e => setPolicyForm(f => ({ ...f, monthly_premium: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Premium Due Day *</label>
                  <input
                    type="number" required min="1" max="31"
                    value={policyForm.premium_due_day}
                    onChange={e => setPolicyForm(f => ({ ...f, premium_due_day: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Policy Term (Years) *</label>
                  <input
                    type="number" required min="1" max="100"
                    value={policyForm.policy_term}
                    onChange={e => setPolicyForm(f => ({ ...f, policy_term: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Policy Start Date *</label>
                  <input
                    type="date" required
                    value={policyForm.start_date}
                    onChange={e => setPolicyForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Maturity Date *</label>
                  <input
                    type="date" required
                    value={policyForm.maturity_date}
                    onChange={e => setPolicyForm(f => ({ ...f, maturity_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Sum Assured *</label>
                  <input
                    type="number" required placeholder="e.g. 100000"
                    value={policyForm.sum_assured}
                    onChange={e => setPolicyForm(f => ({ ...f, sum_assured: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Expected Maturity Amt *</label>
                  <input
                    type="number" required placeholder="e.g. 180000"
                    value={policyForm.expected_maturity_amount}
                    onChange={e => setPolicyForm(f => ({ ...f, expected_maturity_amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              {editingPolicy && (
                <div>
                  <label className="block text-slate-400 mb-1">Policy Status</label>
                  <select
                    value={policyForm.status}
                    onChange={e => setPolicyForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  >
                    <option value="Running">Running</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowPolicyModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-cyan-600 hover:bg-cyan-700">Save Policy</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM LOGGER MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-md text-white">Log Premium Payment</h3>
              <button onClick={() => setShowPremiumModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handlePremiumSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Month *</label>
                  <select
                    value={premiumForm.month}
                    onChange={e => setPremiumForm(f => ({ ...f, month: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
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
                    value={premiumForm.year}
                    onChange={e => setPremiumForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Amount Paid *</label>
                  <input
                    type="number" required
                    value={premiumForm.amount_paid}
                    onChange={e => setPremiumForm(f => ({ ...f, amount_paid: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Paid Date *</label>
                  <input
                    type="date" required
                    value={premiumForm.paid_date}
                    onChange={e => setPremiumForm(f => ({ ...f, paid_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text" placeholder="e.g. Paid online, transaction ID 384729"
                  value={premiumForm.remarks}
                  onChange={e => setPremiumForm(f => ({ ...f, remarks: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3.5 pt-3 border-t border-slate-900">
                <Button variant="ghost" type="button" onClick={() => setShowPremiumModal(false)} className="text-xs">Cancel</Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-4.5 bg-cyan-600 hover:bg-cyan-700">Record Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && activePolicy && (
        <CsvImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            alert(msg);
            fetchPolicies();
          }}
          importUrl={`${API}/records/lic/${activePolicy.id}/import`}
          moduleType="lic"
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
