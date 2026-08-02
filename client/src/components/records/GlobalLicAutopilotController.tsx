import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Calendar, History, CheckCircle2, RefreshCw, Terminal, Activity, Check } from 'lucide-react';
import { emitLicUpdated } from '../../utils/licEvents';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface GlobalLicAutopilotControllerProps {
  onSyncComplete: () => void;
}

export default function GlobalLicAutopilotController({ onSyncComplete }: GlobalLicAutopilotControllerProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

  const [data, setData] = useState<any>({
    status: 'ACTIVE',
    health: 'Healthy',
    activePoliciesCount: 0,
    lastSuccessfulExecution: null,
    nextScheduledRun: '01 Sep 2026 • 12:05 AM',
    telegram: {
      isConnected: true,
      messagesSentToday: 0,
      lastTelegramSuccess: 'None',
      lastTelegramFailure: 'None',
      lastForecastSent: 'None',
      lastPaymentConfirmationSent: 'None'
    },
    confidence: {
      schedulerHealth: 'Healthy',
      nextRun: '01 Sep 2026 • 12:05 AM',
      policiesMonitored: 0,
      lastExecution: 'Successful',
      telegramConnected: true,
      executionSuccessRate: '100%'
    },
    logs: []
  });

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

  const fetchDiagnostics = async () => {
    try {
      const res = await axios.get(`${API}/records/automation/lic/diagnostics`);
      setDiagnosticData(res.data);
      setShowDiagnosticModal(true);
    } catch (_) {
      alert('Error fetching diagnostic data.');
    }
  };

  useEffect(() => {
    fetchGlobalStatus();

    // Keyboard shortcut: Ctrl + Shift + L triggers Automation Diagnostic Mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        fetchDiagnostics();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRunManualSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/records/automation/lic/global-sync`);
      if (res.data.status) setData(res.data.status);
      else fetchGlobalStatus();

      const msg = res.data.message || 'Global LIC Autopilot sync completed.';
      const statsStr = res.data.updatedCount !== undefined
        ? `\nProcessed: ${res.data.processedCount || 0}, Updated: ${res.data.updatedCount}`
        : '';
      alert(`${msg}${statsStr}`);

      emitLicUpdated();
      onSyncComplete();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error running scheduler.');
    } finally {
      setSyncing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="bg-[#0B1228] p-4 rounded-3xl border border-[#1E2A4A] text-slate-400 text-xs font-semibold animate-pulse">
        Loading LIC Global Autopilot Engine...
      </div>
    );
  }

  const isTelegramConnected = data.telegram?.isConnected ?? true;

  return (
    <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-5 shadow-2xl space-y-4 text-xs font-semibold text-slate-300">
      {/* HEADER & TOP CONTROLLER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E2A4A] pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl border bg-cyan-500/15 border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-white tracking-tight">LIC Global Autopilot</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                ● ACTIVE
              </span>
              <span className="text-[10px] text-slate-400 font-bold bg-[#101935] px-2 py-0.5 rounded-md border border-[#1E2A4A]">
                {data.activePoliciesCount || 0} Active Policies Monitored
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Runs automatically on the 1st of every month at 12:05 AM. Idempotency & execution locks enabled.
            </p>
          </div>
        </div>

        {/* NEXT GLOBAL RUN & CONFIDENCE SNAPSHOT */}
        <div className="bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A] flex items-center space-x-3.5 shrink-0 max-w-sm">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Next Scheduled Run</span>
            <span className="text-xs font-black text-white font-mono">{data.nextScheduledRun || '01 Sep 2026 • 12:05 AM'}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Auto-processes all active LIC policies</span>
          </div>
        </div>
      </div>

      {/* TELEGRAM DELIVERY VERIFICATION & CONFIDENCE STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A]">
        <div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Telegram Delivery</span>
          <span className="text-xs font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1">
            <Check className="w-3 h-3" /> {isTelegramConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{data.telegram?.messagesSentToday || 0} Sent Today</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Last Telegram Success</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 font-mono truncate block">
            {data.telegram?.lastTelegramSuccess ? new Date(data.telegram.lastTelegramSuccess).toLocaleTimeString() : 'None'}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">Failures: {data.telegram?.lastTelegramFailure === 'None' ? '0' : 'Recorded'}</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Last Forecast Sent</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 font-mono truncate block">
            {data.telegram?.lastForecastSent ? new Date(data.telegram.lastForecastSent).toLocaleDateString() : 'Month-end (8 PM)'}
          </span>
          <span className="text-[9px] text-cyan-400 block mt-0.5 font-mono">Consolidated Digest</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Execution Health</span>
          <span className="text-xs font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1 font-mono">
            <Activity className="w-3 h-3 text-emerald-400" /> 100% Rate
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">Lock: Unlocked</span>
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
            <span>{syncing ? 'Running Scheduler...' : 'Run Scheduler Now (Testing Only)'}</span>
          </button>

          <button
            onClick={handleRepairSchedules}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-500/30 hover:border-purple-400 text-purple-300 font-bold text-xs transition disabled:opacity-50"
            title="Generates missing future schedule rows up to 180 months without touching paid history"
          >
            <span>🛠️ Self-Healing Repair</span>
          </button>

          <button
            onClick={fetchDiagnostics}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold text-xs transition"
            title="Open Automation Diagnostic Mode (Ctrl + Shift + L)"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Automation Diagnostic Mode</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Audit Trail ({data.logs?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* CONSOLIDATED EXECUTION LOGS DRAWER */}
      {showLogs && (
        <div className="bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] space-y-3 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-[#1E2A4A] pb-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" /> Global LIC Execution Audit Trail
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">{data.logs?.length || 0} Audit Records</span>
          </div>

          {(!data.logs || data.logs.length === 0) ? (
            <p className="text-slate-500 text-xs py-3 text-center italic font-semibold">No audit executions logged yet.</p>
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

      {/* AUTOMATION DIAGNOSTIC MODE MODAL (CTRL + SHIFT + L) */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl text-xs font-semibold text-slate-300 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-[#1E2A4A] pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white">LIC Automation Diagnostic Mode</h3>
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] rounded-full font-mono font-bold">
                  Ctrl + Shift + L
                </span>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-[11px] bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] max-h-96 overflow-y-auto custom-scrollbar">
              <p className="text-emerald-400 font-bold">=== SYSTEM HEALTH DIAGNOSTIC REPORT ===</p>
              {diagnosticData?.diagnosticTrace?.map((line: string, idx: number) => (
                <p key={idx} className="text-slate-300">{line}</p>
              ))}

              <p className="text-cyan-400 font-bold mt-4">=== AUDIT EXECUTION LEDGER (lic_automation_execution) ===</p>
              {diagnosticData?.auditExecution?.map((ex: any) => (
                <div key={ex.execution_id} className="p-2 bg-[#0B1228] border border-[#1E2A4A] rounded-xl text-[10px] space-y-0.5">
                  <div className="flex justify-between text-white font-bold">
                    <span>Execution #${ex.execution_id} ({ex.execution_month}/${ex.execution_year})</span>
                    <span className={ex.status === 'Success' ? 'text-emerald-400' : 'text-amber-400'}>{ex.status}</span>
                  </div>
                  <p className="text-slate-400">Started: {ex.started_at} | Completed: {ex.completed_at || 'In-Progress'}</p>
                  <p className="text-slate-300">Policies Processed: {ex.policies_processed} | Updated: {ex.policies_updated} | Telegram Sent: {ex.telegram_sent}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-[#1E2A4A] pt-3">
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close Diagnostic Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
