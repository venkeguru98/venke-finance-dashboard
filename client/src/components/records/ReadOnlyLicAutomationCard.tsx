import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, History, CheckCircle2 } from 'lucide-react';
import { formatDisplayDate } from '../../utils/date';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface ReadOnlyLicAutomationCardProps {
  policyId: number;
  monthlyPremium: number;
  dueDay: number;
  maturityDate?: string;
  monthsRemaining?: number;
  totalRemaining?: number;
}

export default function ReadOnlyLicAutomationCard({
  policyId,
  monthlyPremium,
  dueDay,
  maturityDate,
  monthsRemaining,
  totalRemaining
}: ReadOnlyLicAutomationCardProps) {
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [data, setData] = useState<any>({
    settings: null,
    logs: []
  });

  const fetchLicAutomationInfo = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/automation/lic/${policyId}`);
      setData(res.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policyId) fetchLicAutomationInfo();
  }, [policyId]);

  if (loading) {
    return (
      <div className="bg-[#0B1228] p-4 rounded-2xl border border-[#1E2A4A] text-slate-400 text-xs animate-pulse">
        Loading LIC Policy Autopilot Status...
      </div>
    );
  }

  const isEnabled = data.settings?.enabled === 1;
  const lastLog = data.logs && data.logs.length > 0 ? data.logs[0] : null;

  return (
    <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-5 shadow-xl space-y-4 text-xs font-semibold text-slate-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2A4A] pb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${isEnabled ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-white">LIC Policy Autopilot Status</h4>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isEnabled ? '● Active' : '○ Paused'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Fixed monthly premium is the single source of truth.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 rounded-xl bg-[#101935] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold flex items-center space-x-1"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>History ({data.logs.length})</span>
          </button>
        </div>
      </div>

      {/* PREMIUM COVERAGE REMAINING METRICS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A]">
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Months Remaining</span>
          <p className="text-sm font-extrabold text-white mt-0.5 font-mono">
            {monthsRemaining !== undefined ? `${monthsRemaining} months` : 'N/A'}
          </p>
        </div>

        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Remaining Premium</span>
          <p className="text-sm font-extrabold text-cyan-400 mt-0.5 font-mono">
            ₹{totalRemaining !== undefined ? totalRemaining.toLocaleString('en-IN') : (monthlyPremium * (monthsRemaining || 0)).toLocaleString('en-IN')}
          </p>
        </div>

        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Maturity Date</span>
          <p className="text-sm font-extrabold text-slate-200 mt-0.5">
            {maturityDate ? formatDisplayDate(maturityDate) : 'N/A'}
          </p>
        </div>
      </div>

      {/* READ ONLY NEXT SCHEDULED PREMIUM INFO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A]">
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Next Scheduled Premium</span>
          {data.nextInstallment ? (
            <div>
              <p className="text-xs font-extrabold text-white mt-0.5">
                {new Date(2000, data.nextInstallment.month - 1).toLocaleString('en-US', { month: 'short' })} {data.nextInstallment.year}: <span className="font-mono text-emerald-400">₹{Number(data.nextInstallment.amount_paid || monthlyPremium).toLocaleString('en-IN')}</span>
              </p>
              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                Due: {String(dueDay || 12).padStart(2, '0')} {new Date(2000, data.nextInstallment.month - 1).toLocaleString('en-US', { month: 'short' })} {data.nextInstallment.year}
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold text-emerald-400 mt-0.5">
              All Premiums Completed ✓
            </p>
          )}
        </div>

        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Last Automated Execution</span>
          {lastLog ? (
            <div>
              <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {lastLog.action}
              </p>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                {new Date(lastLog.created_at).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-0.5">No previous runs recorded</p>
          )}
        </div>
      </div>

      {/* READ ONLY HISTORY LOGS */}
      {showHistory && (
        <div className="bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A] space-y-2 animate-in fade-in duration-200">
          <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block border-b border-[#1E2A4A] pb-1">
            LIC Autopilot Log History
          </span>
          {data.logs.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-1">No logs available.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {data.logs.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center text-[10px] p-2 bg-[#0B1228] border border-[#1E2A4A] rounded-lg">
                  <div>
                    <span className="font-bold text-white">{l.action}</span>
                    <span className="text-slate-400 font-mono ml-2">₹{Number(l.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-slate-500 font-mono">{new Date(l.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
