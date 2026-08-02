import { useEffect, useState } from 'react';
import axios from 'axios';
import { Zap, History, CheckCircle2 } from 'lucide-react';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface ReadOnlyChitAutomationCardProps {
  chitId: number;
  defaultAmount: number;
}

export default function ReadOnlyChitAutomationCard({ chitId, defaultAmount }: ReadOnlyChitAutomationCardProps) {
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [data, setData] = useState<any>({
    settings: null,
    logs: [],
    nextInstallment: null
  });

  const fetchChitAutomationInfo = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/automation/chit/${chitId}`);
      setData(res.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chitId) fetchChitAutomationInfo();
  }, [chitId]);

  if (loading) {
    return (
      <div className="bg-[#0B1228] p-4 rounded-2xl border border-[#1E2A4A] text-slate-400 text-xs animate-pulse">
        Loading Chit Autopilot Status...
      </div>
    );
  }

  const isEnabled = data.settings?.enabled === 1;
  const nextInst = data.nextInstallment;
  const monthName = nextInst
    ? new Date(2000, nextInst.month - 1).toLocaleString('en-US', { month: 'long' })
    : new Date().toLocaleString('en-US', { month: 'long' });

  const yearNum = nextInst ? nextInst.year : new Date().getFullYear();
  const amt = nextInst ? Number(nextInst.installment_amount) : defaultAmount;
  const dueDay = data.settings?.payment_day || 5;

  const lastLog = data.logs && data.logs.length > 0 ? data.logs[0] : null;

  return (
    <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-5 shadow-xl space-y-3 text-xs font-semibold text-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2A4A] pb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${isEnabled ? 'bg-[#635BFF]/15 border-[#635BFF]/30 text-[#635BFF]' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-white">Chit Autopilot Status</h4>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isEnabled ? '● Active' : '○ Paused'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Payment schedule is the single source of truth.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 rounded-xl bg-[#101935] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold flex items-center space-x-1"
          >
            <History className="w-3.5 h-3.5 text-[#635BFF]" />
            <span>History ({data.logs.length})</span>
          </button>
        </div>
      </div>

      {/* READ ONLY NEXT SCHEDULED INSTALLMENT INFO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A]">
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Next Scheduled Installment</span>
          <p className="text-xs font-extrabold text-white mt-0.5">
            {monthName} {yearNum}: <span className="font-mono text-emerald-400">₹{amt.toLocaleString('en-IN')}</span>
          </p>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Due: {String(dueDay).padStart(2, '0')} {monthName.slice(0, 3)} {yearNum}
          </span>
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
            Chit Autopilot Log History
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
