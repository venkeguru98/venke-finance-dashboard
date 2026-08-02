import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Pause, Calendar, History, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { emitLicUpdated } from '../../utils/licEvents';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface GlobalLicAutopilotControllerProps {
  onSyncComplete: () => void;
}

export default function GlobalLicAutopilotController({ onSyncComplete }: GlobalLicAutopilotControllerProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [data, setData] = useState<any>({
    enabled: 0,
    activeCount: 0,
    lastRunDate: null,
    lastAction: 'No runs yet',
    nextRunStr: '',
    isTelegramLinked: false,
    health: 'Paused',
    logs: []
  });

  const handleRepairSchedules = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/records/lic/repair-all-schedules`);
      if (res.data.status) setData(res.data.status);
      else fetchGlobalStatus();
      alert(res.data.message || 'Repaired full LIC schedules successfully.');
      emitLicUpdated();
      onSyncComplete();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error repairing LIC schedules.');
    } finally {
      setSyncing(false);
    }
  };

  const fetchGlobalStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/automation/lic/global-status`);
      setData(res.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStatus();
  }, []);

  const handleGlobalToggle = async () => {
    try {
      const res = await axios.post(`${API}/records/automation/lic/global-toggle`);
      if (res.data.status) setData(res.data.status);
      else fetchGlobalStatus();
      emitLicUpdated();
      onSyncComplete();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error toggling global LIC autopilot.');
    }
  };

  const handleRunManualSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/records/automation/lic/global-sync`);
      if (res.data.status) setData(res.data.status);
      else fetchGlobalStatus();

      const msg = res.data.message || 'Global LIC Sync completed.';
      const statsStr = res.data.updatedCount !== undefined
        ? `\nUpdated: ${res.data.updatedCount}, Skipped: ${res.data.skippedCount || 0}`
        : '';
      alert(`${msg}${statsStr}`);

      emitLicUpdated();
      onSyncComplete();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error running manual sync.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0B1228] p-4 rounded-3xl border border-[#1E2A4A] text-slate-400 text-xs font-semibold animate-pulse">
        Loading LIC Global Autopilot...
      </div>
    );
  }

  const isEnabled = data.enabled === 1;

  return (
    <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-5 shadow-2xl space-y-4 text-xs font-semibold text-slate-300">
      {/* HEADER & TOP CONTROLLER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E2A4A] pb-4">
        <div className="flex items-center space-x-3.5">
          <div className={`p-3 rounded-2xl border ${isEnabled ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-white tracking-tight">LIC Global Autopilot</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isEnabled ? '● Autopilot Active' : '○ Autopilot Paused'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold bg-[#101935] px-2 py-0.5 rounded-md border border-[#1E2A4A]">
                {data.activeCount} Active Policies
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Fixed monthly premium schedule. Backfills historical payments automatically.
            </p>
          </div>
        </div>

        {/* NEXT GLOBAL RUN CARD */}
        <div className="bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A] flex items-center space-x-3.5 shrink-0 max-w-sm">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Next Global Run</span>
            <span className="text-xs font-black text-white font-mono">{data.nextRunStr || '01 Oct 2026 • 12:05 AM'}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Processes all {data.activeCount} active LIC policies</span>
          </div>
        </div>
      </div>

      {/* GLOBAL CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A]">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunManualSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
            title="Execute global scheduler once for current month"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing Active Policies...' : 'Run Manual Sync'}</span>
          </button>

          <button
            onClick={handleRepairSchedules}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-500/30 hover:border-purple-400 text-purple-300 font-bold text-xs transition disabled:opacity-50"
            title="One-time repair: generates missing future schedule rows up to 180 months without touching paid history"
          >
            <span>🛠️ Repair LIC Schedule</span>
          </button>

          <button
            onClick={handleGlobalToggle}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0B1228] border border-[#1E2A4A] hover:border-slate-600 text-slate-200 font-bold text-xs transition"
          >
            {isEnabled ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isEnabled ? 'Pause LIC Autopilot' : 'Resume LIC Autopilot'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Global Execution Logs ({data.logs.length})</span>
          </button>
        </div>
      </div>

      {/* CONSOLIDATED EXECUTION LOGS DRAWER */}
      {showLogs && (
        <div className="bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] space-y-3 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-[#1E2A4A] pb-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" /> Global LIC Audit Execution Logs
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">{data.logs.length} Recent Log Entries</span>
          </div>

          {data.logs.length === 0 ? (
            <p className="text-slate-500 text-xs py-3 text-center italic font-semibold">No global executions logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {data.logs.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center p-2.5 bg-[#0B1228] border border-[#1E2A4A] rounded-xl text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                        l.action.includes('Manual')
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : l.action.includes('Auto')
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {l.action}
                      </span>
                      <span className="font-mono font-bold text-white">₹{Number(l.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{l.details || `Period: Month ${l.period_month}/${l.period_year}`}</p>
                  </div>

                  <div className="text-right font-mono text-[10px]">
                    <span className="text-slate-400 block">{new Date(l.created_at).toLocaleString()}</span>
                    {l.telegram_sent === 1 && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> Telegram Sent
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
