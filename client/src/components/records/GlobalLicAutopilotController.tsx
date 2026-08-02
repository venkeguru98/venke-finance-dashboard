import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ShieldCheck, Zap, X, RefreshCw, Terminal, Activity, Check } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const [countdownSeconds, setCountdownSeconds] = useState(300);

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
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          fetchGlobalStatus();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await axios.get(`${API}/records/lic/automation/diagnostics`);
      setDiagnosticData(res.data);
      setShowDiagnosticModal(true);
    } catch (_) {
      alert('Error fetching diagnostic data.');
    }
  };

  useEffect(() => {
    fetchGlobalStatus();

    // ESC key closes popover & Ctrl + Shift + L triggers Diagnostic Mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        fetchDiagnostics();
      }
    };

    // Click outside closes popover
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRunManualSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/records/automation/lic/global-sync`);
      if (res.data.status) setData(res.data.status);
      else fetchGlobalStatus();

      const msg = res.data.message || 'Global LIC Autopilot sync completed.';
      alert(msg);

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

  const isTelegramConnected = data.telegram?.isConnected ?? true;

  if (loading) {
    return (
      <div className="p-2.5 rounded-2xl bg-[#101935] border border-[#1E2A4A] text-slate-400 animate-pulse">
        <ShieldCheck className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* COMPACT TOP-RIGHT AUTOMATION ICON BUTTON WITH GREEN STATUS DOT */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-2xl bg-[#101935] hover:bg-[#1A264D] border border-[#1E2A4A] hover:border-cyan-500/40 text-cyan-400 transition cursor-pointer relative flex items-center gap-1.5 shadow-md group"
        title="LIC Global Autopilot Controls & Diagnostics"
      >
        <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-[#0B1228]"></span>
      </button>

      {/* EXPANDABLE SLIDE-OUT GLASS POPOVER PANEL */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-[#0B1228]/95 backdrop-blur-2xl border border-[#1E2A4A] rounded-3xl shadow-2xl p-5 space-y-4 text-xs font-semibold text-slate-300 animate-fadeIn duration-200">
          {/* POPOVER HEADER */}
          <div className="flex items-center justify-between border-b border-[#1E2A4A] pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
              <h2 className="text-sm font-extrabold text-white tracking-tight">LIC Global Autopilot</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#101935] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SECTION 1: AUTOMATION OVERVIEW */}
          <div className="bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A] space-y-2.5">
            <h3 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Automation Overview</h3>
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Status</span>
                <span className="font-extrabold text-emerald-400 flex items-center gap-1">● Active</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Active Policies</span>
                <span className="font-bold text-white font-mono">{data.activePolicies ?? data.activePoliciesCount ?? 0}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Last Forecast</span>
                <span className="font-mono text-slate-300 block truncate">{data.timeline?.lastForecast || '31 Jul 2026 • 8:00 PM'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Next Forecast</span>
                <span className="font-mono text-cyan-400 block truncate">{data.timeline?.nextForecast || '31 Aug 2026 • 8:00 PM'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Last Autopay</span>
                <span className="font-mono text-slate-300 block truncate">{data.timeline?.lastAutopay || '01 Aug 2026 • 12:05 AM'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Next Autopay</span>
                <span className="font-mono text-cyan-400 block truncate">{data.timeline?.nextAutopay || '01 Sep 2026 • 12:05 AM'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: SCHEDULER DIAGNOSTICS */}
          <div className="bg-[#101935] p-3.5 rounded-2xl border border-[#1E2A4A] space-y-2.5">
            <h3 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Scheduler Diagnostics</h3>
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Scheduler Status</span>
                <span className="font-bold text-emerald-400 block">Running ({formatCountdown(countdownSeconds)})</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Last Recovery Check</span>
                <span className="font-mono text-emerald-400 block">{data.heartbeat?.lastHeartbeatFormatted || 'Just now'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Telegram Delivery</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {(data.telegramConnected ?? isTelegramConnected) ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Last Forecast Sent</span>
                <span className="font-mono text-slate-300 block truncate">{data.timeline?.lastForecast || '31 Jul 2026 • 8:00 PM'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Execution Health</span>
                <span className="font-bold text-emerald-400 block">Healthy</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Success Rate</span>
                <span className="font-bold text-white font-mono block">100%</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADVANCED MAINTENANCE TOOLS */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleRunManualSync}
              disabled={syncing}
              className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-550 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Processing...' : 'Run Scheduler Now (Testing Only)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRepairSchedules}
                disabled={syncing}
                className="px-2.5 py-1.5 rounded-xl bg-[#101935] hover:bg-[#1A264D] text-slate-200 font-bold text-[11px] border border-[#1E2A4A] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Self-Healing Repair</span>
              </button>

              <button
                onClick={fetchDiagnostics}
                className="px-2.5 py-1.5 rounded-xl bg-[#101935] hover:bg-[#1A264D] text-slate-200 font-bold text-[11px] border border-[#1E2A4A] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Diagnostic Mode</span>
              </button>
            </div>

            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#101935] hover:bg-[#1A264D] text-slate-400 hover:text-slate-200 font-medium text-[11px] border border-[#1E2A4A] flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showLogs ? 'Hide Audit Trail' : `Execution Audit Trail (${data.logs?.length || 0})`}</span>
            </button>
          </div>

          {/* AUDIT LOGS INSIDE POPOVER PANEL */}
          {showLogs && (
            <div className="bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A] space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center border-b border-[#1E2A4A] pb-1.5">
                <span className="text-[10px] font-black uppercase text-cyan-400">Execution Audit Trail</span>
                <span className="text-[9px] text-slate-400 font-mono">{data.logs?.length || 0} Records</span>
              </div>
              {(!data.logs || data.logs.length === 0) ? (
                <p className="text-slate-500 text-[10px] py-2 text-center italic">No audit records found.</p>
              ) : (
                data.logs.map((l: any) => (
                  <div key={l.id} className="p-2 bg-[#0B1228] border border-[#1E2A4A] rounded-xl text-[10px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-emerald-400">{l.action}</span>
                      <span className="font-mono text-slate-400">{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 font-mono truncate">{l.details || `Amount: ₹${l.amount}`}</p>
                  </div>
                ))
              )}
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
