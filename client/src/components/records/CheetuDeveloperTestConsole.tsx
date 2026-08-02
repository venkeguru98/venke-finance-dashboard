import { useState } from 'react';
import axios from 'axios';
import { ShieldAlert, Play, Send, Calendar, CheckCircle2, AlertTriangle, X, Terminal, Cpu } from 'lucide-react';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface CheetuDeveloperTestConsoleProps {
  onClose: () => void;
  onRefreshData: () => void;
}

export default function CheetuDeveloperTestConsole({ onClose, onRefreshData }: CheetuDeveloperTestConsoleProps) {
  const [simDate, setSimDate] = useState<string>('2026-08-31');
  const [sendTelegram, setSendTelegram] = useState<boolean>(false);
  const [commitChanges, setCommitChanges] = useState<boolean>(false);
  const [showCommitConfirm, setShowCommitConfirm] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [testLogs, setTestLogs] = useState<any[]>([]);

  const handleRunSimulation = async (actionType: 'month-start' | 'month-end-forecast' | 'due-reminder' | 'missed-payment') => {
    setLoading(true);
    setValidationReport(null);
    try {
      const res = await axios.post(`${API}/records/automation/chit/developer-simulate`, {
        simDate,
        actionType,
        commitChanges,
        sendTelegram
      });

      const resData = res.data.result;
      setSimulationResult(resData);

      // Add entry to test logs
      const newLog = {
        id: Date.now(),
        type: actionType,
        simDate,
        telegramSent: sendTelegram ? resData.telegramMeta?.status : 'Skipped',
        affectedCount: resData.affectedChitsCount || 0,
        time: new Date().toLocaleTimeString()
      };
      setTestLogs(prev => [newLog, ...prev]);

      if (commitChanges) onRefreshData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Simulation error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    setLoading(true);
    setSimulationResult(null);
    try {
      const res = await axios.post(`${API}/records/automation/chit/developer-validate`);
      setValidationReport(res.data.report);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Validation error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-[#050816] border border-[#1E2A4A] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* PERMANENT SAFETY BANNER */}
        <div className="bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-950/90 border-b border-purple-500/30 p-3.5 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  DEVELOPER TEST MODE
                </span>
                <span className="text-xs font-extrabold text-white">Simulation Engine</span>
              </div>
              <p className="text-[10px] text-purple-200 font-medium">
                Simulation Mode Active — Production records remain 100% isolated & untouched by default.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl bg-purple-950/60 border border-purple-700/50 text-slate-300 hover:text-white hover:bg-purple-900 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs font-semibold text-slate-300">

          {/* CONTROLS BAR: DATE OVERRIDE & SAFETY TOGGLES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0B1228] p-4.5 rounded-2xl border border-[#1E2A4A]">
            
            {/* SIMULATED DATE OVERRIDE */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#635BFF]" /> Simulation Date Override
              </label>
              <input
                type="date"
                value={simDate}
                onChange={e => setSimDate(e.target.value)}
                className="w-full bg-[#101935] border border-[#1E2A4A] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#635BFF]"
              />
              <span className="text-[9px] text-slate-500 block">Evaluates month-start & forecasts against this date</span>
            </div>

            {/* LIVE TELEGRAM TOGGLE */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-cyan-400" /> Send Live Test Telegram Messages
              </label>
              <button
                onClick={() => setSendTelegram(!sendTelegram)}
                className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between font-bold text-xs transition ${
                  sendTelegram ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-[#101935] border-[#1E2A4A] text-slate-400'
                }`}
              >
                <span>{sendTelegram ? '● Telegram Delivery ON' : '○ Preview Only (OFF)'}</span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {sendTelegram ? 'LIVE TELEGRAM' : 'DRY RUN'}
                </span>
              </button>
            </div>

            {/* DANGEROUS COMMIT TOGGLE */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Database Commit Toggle
              </label>
              <button
                onClick={() => {
                  if (!commitChanges) setShowCommitConfirm(true);
                  else setCommitChanges(false);
                }}
                className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between font-bold text-xs transition ${
                  commitChanges ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-[#101935] border-[#1E2A4A] text-slate-400'
                }`}
              >
                <span>{commitChanges ? '⚠️ DB Commit ENABLED' : '🔒 Dry Run Only (Safe)'}</span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {commitChanges ? 'WRITES DB' : 'READ ONLY'}
                </span>
              </button>
            </div>
          </div>

          {/* SIMULATION ACTION BUTTONS */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[#635BFF]" /> Run Simulation Workflows
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleRunSimulation('month-start')}
                disabled={loading}
                className="p-3 rounded-2xl bg-[#0B1228] border border-[#1E2A4A] hover:border-[#635BFF] text-white font-bold text-xs text-left transition space-y-1 disabled:opacity-50"
              >
                <div className="text-[#635BFF] font-black uppercase text-[10px]">01 Month Start</div>
                <div className="text-white">Run Month-Start Sim</div>
              </button>

              <button
                onClick={() => handleRunSimulation('month-end-forecast')}
                disabled={loading}
                className="p-3 rounded-2xl bg-[#0B1228] border border-[#1E2A4A] hover:border-purple-500 text-white font-bold text-xs text-left transition space-y-1 disabled:opacity-50"
              >
                <div className="text-purple-400 font-black uppercase text-[10px]">31 Month-End</div>
                <div className="text-white">Run Forecast Sim</div>
              </button>

              <button
                onClick={() => handleRunSimulation('due-reminder')}
                disabled={loading}
                className="p-3 rounded-2xl bg-[#0B1228] border border-[#1E2A4A] hover:border-cyan-500 text-white font-bold text-xs text-left transition space-y-1 disabled:opacity-50"
              >
                <div className="text-cyan-400 font-black uppercase text-[10px]">Reminder</div>
                <div className="text-white">Run Due Reminder</div>
              </button>

              <button
                onClick={() => handleRunSimulation('missed-payment')}
                disabled={loading}
                className="p-3 rounded-2xl bg-[#0B1228] border border-[#1E2A4A] hover:border-amber-500 text-white font-bold text-xs text-left transition space-y-1 disabled:opacity-50"
              >
                <div className="text-amber-400 font-black uppercase text-[10px]">Alert</div>
                <div className="text-white">Run Missed Alert</div>
              </button>
            </div>
          </div>

          {/* FULL VALIDATION SUITE BUTTON */}
          <div className="flex justify-between items-center bg-[#0B1228] p-3.5 rounded-2xl border border-[#1E2A4A]">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#635BFF]" />
              <div>
                <h4 className="text-xs font-black text-white">Full System Health Validation</h4>
                <p className="text-[10px] text-slate-400 font-medium">Runs 7-point diagnostic test across scheduler, Telegram, and overrides.</p>
              </div>
            </div>
            <button
              onClick={handleRunValidation}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5249FF] text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span>{loading ? 'Running Tests...' : 'Run Full System Validation'}</span>
            </button>
          </div>

          {/* SIMULATION RESULTS & COMPARISON PANEL */}
          {simulationResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* COMPARISON MATRIX TABLE */}
              <div className="bg-[#0B1228] p-4.5 rounded-2xl border border-[#1E2A4A] space-y-3">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#635BFF]" /> Simulation Impact Comparison Matrix
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1E2A4A] text-[10px] text-slate-500 font-bold uppercase">
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3">Current State</th>
                        <th className="py-2 px-3 text-[#635BFF]">Simulated State ({simulationResult.simDateStr})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2A4A] text-xs">
                      <tr>
                        <td className="py-2.5 px-3 text-slate-400 font-bold">Months Paid</td>
                        <td className="py-2.5 px-3 text-white font-mono">{simulationResult.comparison?.monthsPaid.current}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">{simulationResult.comparison?.monthsPaid.simulated}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-400 font-bold">Total Amount Paid</td>
                        <td className="py-2.5 px-3 text-white font-mono">₹{simulationResult.comparison?.totalPaid.current.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹{simulationResult.comparison?.totalPaid.simulated.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-400 font-bold">Remaining Liability</td>
                        <td className="py-2.5 px-3 text-white font-mono">₹{simulationResult.comparison?.remainingLiability.current.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-mono font-bold">₹{simulationResult.comparison?.remainingLiability.simulated.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-400 font-bold">Telegram Status</td>
                        <td className="py-2.5 px-3 text-slate-500">{simulationResult.comparison?.telegramStatus.current}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-400">{simulationResult.comparison?.telegramStatus.simulated}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TELEGRAM DELIVERY VERIFICATION CARD & PREVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TELEGRAM PREVIEW CARD */}
                <div className="bg-[#0e1626] p-4 rounded-2xl border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                    <span className="text-[10px] font-black uppercase text-sky-400 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-sky-400" /> Telegram Message Preview
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Simulated Target: {simulationResult.simDateStr}</span>
                  </div>
                  <div className="bg-[#172136] p-3 rounded-xl border border-slate-700/60 font-sans text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                    <div dangerouslySetInnerHTML={{ __html: simulationResult.previewMessage }} />
                  </div>
                </div>

                {/* TELEGRAM DELIVERY METADATA */}
                <div className="bg-[#0B1228] p-4 rounded-2xl border border-[#1E2A4A] space-y-3">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Telegram Delivery Verification
                  </h4>
                  <div className="space-y-2 text-xs font-mono bg-[#101935] p-3 rounded-xl border border-[#1E2A4A]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-bold ${simulationResult.telegramMeta?.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {simulationResult.telegramMeta?.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Message ID:</span>
                      <span className="text-slate-300">{simulationResult.telegramMeta?.messageId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HTTP Code:</span>
                      <span className="text-slate-300">{simulationResult.telegramMeta?.httpStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timestamp:</span>
                      <span className="text-slate-400 text-[10px]">{simulationResult.telegramMeta?.deliveryTimestamp}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#1E2A4A] pt-1">
                      <span className="text-slate-500">Latency:</span>
                      <span className="text-white font-bold">{simulationResult.telegramMeta?.durationMs} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VALIDATION SUITE REPORT MATRIX */}
          {validationReport && (
            <div className="bg-[#0B1228] p-4.5 rounded-2xl border border-[#1E2A4A] space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#1E2A4A] pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#635BFF]" /> {validationReport.reportTitle}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Executed at {new Date(validationReport.executedAt).toLocaleString()}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  validationReport.overallStatus === 'SYSTEM READY'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {validationReport.overallStatus}
                </span>
              </div>

              <div className="space-y-2">
                {validationReport.checks.map((chk: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-[#101935] border border-[#1E2A4A] rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-white block">{chk.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{chk.details}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      chk.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEVELOPER TEST LOGS HISTORY */}
          {testLogs.length > 0 && (
            <div className="bg-[#0B1228] p-4.5 rounded-2xl border border-[#1E2A4A] space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Developer Simulation Logs ({testLogs.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {testLogs.map(l => (
                  <div key={l.id} className="flex justify-between items-center text-xs p-2 bg-[#101935] border border-[#1E2A4A] rounded-xl font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#635BFF] font-bold uppercase">{l.type}</span>
                      <span className="text-slate-400">SimDate: {l.simDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-300 block">{l.telegramSent}</span>
                      <span className="text-[10px] text-slate-500">{l.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMMIT CONFIRMATION MODAL */}
      {showCommitConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-[#0B1228] border border-rose-500/40 rounded-3xl p-6 max-w-md space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
            <h3 className="text-base font-extrabold text-white">Confirm Database Commitment</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Enabling DB Commit will allow test simulations to <b>write real records into `chit_payments`</b> and recalculate totals. Are you sure?
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowCommitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                Cancel (Keep Safe)
              </button>
              <button
                onClick={() => {
                  setCommitChanges(true);
                  setShowCommitConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Enable DB Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
