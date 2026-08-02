import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Zap, Play, Pause, Calendar, History, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface RecurringAutomationPanelProps {
  moduleType: 'chit' | 'gold' | 'lic';
  entityId: number;
  entityName: string;
  defaultAmount: number;
  dueDay?: number;
}

export default function RecurringAutomationPanel({
  moduleType,
  entityId,
  entityName,
  defaultAmount,
  dueDay = 1
}: RecurringAutomationPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [settings, setSettings] = useState<any>({
    enabled: 0,
    auto_create: 1,
    auto_mark_paid: 0,
    telegram_confirm: 1,
    telegram_reminder: 1,
    payment_day: dueDay,
    reminder_days_before: 3,
    frequency: 'monthly'
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [nextInstallment, setNextInstallment] = useState<any | null>(null);

  const fetchAutomationData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/automation/${moduleType}/${entityId}`);
      if (res.data.settings) setSettings(res.data.settings);
      if (res.data.logs) setLogs(res.data.logs);
      if (res.data.nextInstallment) setNextInstallment(res.data.nextInstallment);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchAutomationData();
    }
  }, [moduleType, entityId]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/records/automation/${moduleType}/${entityId}`, settings);
      alert('Automation settings saved successfully.');
      fetchAutomationData();
    } catch (_) {
      alert('Error saving automation settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutomationNow = async () => {
    setRunning(true);
    try {
      await axios.post(`${API}/records/automation/${moduleType}/${entityId}/run`);
      alert(`Automation executed for ${entityName}.`);
      fetchAutomationData();
    } catch (_) {
      alert('Error executing automation.');
    } finally {
      setRunning(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      const res = await axios.post(`${API}/records/automation/${moduleType}/${entityId}/pause`);
      setSettings((s: any) => ({ ...s, enabled: res.data.enabled }));
      fetchAutomationData();
    } catch (_) {
      alert('Error toggling automation state.');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0B1228] p-4 rounded-2xl border border-[#1E2A4A] text-slate-400 text-xs font-semibold animate-pulse">
        Loading automation configuration...
      </div>
    );
  }

  const isEnabled = settings.enabled === 1;
  const nextMonthName = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleString('en-US', { month: 'short' });

  return (
    <div className="bg-[#0B1228] border border-[#1E2A4A] rounded-3xl p-5 shadow-2xl space-y-4 text-xs font-semibold text-slate-300">
      {/* HEADER & STATUS CHIPS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2A4A] pb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${isEnabled ? 'bg-[#635BFF]/15 border-[#635BFF]/30 text-[#635BFF]' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">Recurring Commitment Autopilot</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isEnabled ? '● Active' : '○ Paused'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Automated record creation, status updates, and Telegram reminders.</p>
          </div>
        </div>

        {/* READ-ONLY FORECAST CHIP */}
        <div className="flex items-center space-x-2 bg-[#101935] px-3 py-1.5 rounded-xl border border-[#1E2A4A] shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#635BFF]" />
          <div>
            <span className="text-[9px] text-slate-400 block font-bold">
              {nextInstallment ? `Next Scheduled (${new Date(2000, nextInstallment.month - 1).toLocaleString('en-US', { month: 'short' })} ${nextInstallment.year})` : `Next Month (${nextMonthName})`}
            </span>
            <span className="text-xs font-black text-white font-mono">
              ₹{(nextInstallment ? nextInstallment.installment_amount : defaultAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#101935] p-3 rounded-2xl border border-[#1E2A4A]">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunAutomationNow}
            disabled={running}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#635BFF] hover:bg-[#5249FF] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Running...' : 'Run Automation Now'}</span>
          </button>

          <button
            onClick={handleTogglePause}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] hover:border-slate-600 text-slate-200 font-bold text-xs transition"
          >
            {isEnabled ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isEnabled ? 'Pause Autopilot' : 'Resume Autopilot'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold"
          >
            <span>Settings</span>
            {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] text-slate-300 hover:text-white transition text-xs font-bold"
          >
            <History className="w-3.5 h-3.5" />
            <span>Logs ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE SETTINGS FORM */}
      {showSettings && (
        <form onSubmit={handleSaveSettings} className="bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] space-y-4 animate-in fade-in duration-200">
          <h4 className="text-xs font-extrabold text-white border-b border-[#1E2A4A] pb-2 uppercase tracking-wider">
            Autopilot Configuration Settings
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled === 1}
                onChange={e => setSettings((s: any) => ({ ...s, enabled: e.target.checked ? 1 : 0 }))}
                className="rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4"
              />
              <span className="font-bold text-xs text-white">Enable Autopilot</span>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_create === 1}
                onChange={e => setSettings((s: any) => ({ ...s, auto_create: e.target.checked ? 1 : 0 }))}
                className="rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4"
              />
              <span className="font-bold text-xs text-white">Auto-Create Record</span>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_mark_paid === 1}
                onChange={e => setSettings((s: any) => ({ ...s, auto_mark_paid: e.target.checked ? 1 : 0 }))}
                className="rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4"
              />
              <span className="font-bold text-xs text-white">Auto-Mark as Paid</span>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.telegram_confirm === 1}
                onChange={e => setSettings((s: any) => ({ ...s, telegram_confirm: e.target.checked ? 1 : 0 }))}
                className="rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4"
              />
              <span className="font-bold text-xs text-white">Telegram Confirmations</span>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0B1228] border border-[#1E2A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.telegram_reminder === 1}
                onChange={e => setSettings((s: any) => ({ ...s, telegram_reminder: e.target.checked ? 1 : 0 }))}
                className="rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4"
              />
              <span className="font-bold text-xs text-white">Telegram Reminders</span>
            </label>

            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Payment Day of Month</label>
              <input
                type="number" min={1} max={31}
                value={settings.payment_day}
                onChange={e => setSettings((s: any) => ({ ...s, payment_day: Number(e.target.value) }))}
                className="w-full bg-[#0B1228] border border-[#1E2A4A] rounded-xl py-1.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF] font-bold text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#1E2A4A]">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5249FF] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Autopilot Settings'}
            </button>
          </div>
        </form>
      )}

      {/* AUDIT LOG HISTORY DRAWER */}
      {showHistory && (
        <div className="bg-[#101935] p-4 rounded-2xl border border-[#1E2A4A] space-y-3 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-[#1E2A4A] pb-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#635BFF]" /> Automation Audit Execution History
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">{logs.length} Log Entries</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-500 text-xs py-3 text-center italic font-semibold">No automated executions logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {logs.map((l: any) => (
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
                    <span className="text-slate-400 block">{new Date(l.created_at).toLocaleDateString()}</span>
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
