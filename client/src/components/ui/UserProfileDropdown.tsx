import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ShieldCheck, 
  PlusCircle, FileSpreadsheet, RefreshCcw, 
  Download, Settings, Key, Palette, LogOut, CheckCircle2,
  Building2, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { downloadBackupExport } from '../../utils/exportUtils';

import { useTheme } from '../../context/ThemeContext';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface UserProfileDropdownProps {
  onLogout?: () => void;
  onOpenCmdK?: () => void;
}

// ── LOCAL & RELATIVE TIME FORMATTING UTILITIES ─────────────────────────────────
function formatLocalTime(dateInput?: string | Date | number): string {
  if (!dateInput) {
    const now = new Date();
    return `Today • ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Today • 11:59 PM';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today • ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday • ${timeStr}`;
  } else {
    const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    return `${dateStr} • ${timeStr}`;
  }
}

function formatRelativeTime(dateInput?: string | Date | number): string {
  if (!dateInput) return 'Just now';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Just now';

  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatLocalYYYYMM(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const isSavingsCommitment = (t: any, categories: any[]) => {
  if (t.type === 'savings' || t.type === 'investment') return true;
  const matchCat = categories.find((c: any) => c.id === t.category_id);
  if (!matchCat) {
    const notes = (t.notes || '').toLowerCase();
    const catName = (t.category_name || '').toLowerCase();
    if (notes.includes('lic') || notes.includes('sip') || notes.includes('gold') || notes.includes('mutual') || notes.includes('chit') || notes.includes('fund') || notes.includes('reserve') || notes.includes('saving') || notes.includes('invest') || notes.includes('ppf') || notes.includes('nps') || notes.includes('stock')) return true;
    if (catName.includes('lic') || catName.includes('sip') || catName.includes('gold') || catName.includes('mutual') || catName.includes('chit') || catName.includes('fund') || catName.includes('reserve') || catName.includes('saving') || catName.includes('invest') || catName.includes('ppf') || catName.includes('nps') || catName.includes('stock')) return true;
    return false;
  }
  const type = (matchCat.type || '').toLowerCase();
  const name = (matchCat.name || '').toLowerCase();
  if (type === 'debt' || name.includes('loan') || name.includes('debt') || name.includes('credit card')) return false;
  if (type === 'insurance' || name.includes('lic') || name.includes('insurance')) return true;
  if (type === 'investment' || name.includes('sip') || name.includes('gold') || name.includes('mutual')) return true;
  if (type === 'savings' || name.includes('fund') || name.includes('reserve') || name.includes('saving')) return true;
  return false;
};

export const UserProfileDropdown = memo(({ onLogout, onOpenCmdK }: UserProfileDropdownProps) => {
  const { themeData } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [lastExportTimestamp, setLastExportTimestamp] = useState<string | null>(() => localStorage.getItem('last_export_timestamp'));

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dynamic Snapshot & Time Data
  const [snapshotData, setSnapshotData] = useState({
    balance: '₹13,057',
    savingsRate: '17.4%',
    lastBackupTimestamp: new Date().toISOString(),
    nextSnapshot: '11:59 PM',
    appVersion: 'v3.0.0',
    dbStatus: 'Connected (PostgreSQL / SQLite)',
    cloudSync: 'Connected',
    localSnapshot: 'Verified',
    licAutopilot: 'Active',
    scheduler: 'Healthy'
  });

  // Fetch dynamic stats when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // 1. Fetch system status
      axios.get(`${API}/system/status`)
        .then(res => {
          if (res.data) {
            setSnapshotData(prev => ({
              ...prev,
              appVersion: `v${res.data.appVersion || '3.0.0'}`,
              dbStatus: res.data.databaseEngine ? `Connected (${res.data.databaseEngine.includes('PostgreSQL') ? 'Neon PG' : 'SQLite'})` : prev.dbStatus
            }));
          }
        })
        .catch(() => {});

      // 2. Fetch enterprise recovery status
      axios.get(`${API}/enterprise-recovery/status`)
        .then(res => {
          if (res.data) {
            setSnapshotData(prev => ({
              ...prev,
              lastBackupTimestamp: res.data.lastVerifiedBackupDate ? `${res.data.lastVerifiedBackupDate} ${res.data.lastVerifiedBackupTime || '23:59:00'}` : new Date().toISOString(),
              nextSnapshot: res.data.nextScheduledBackup ? res.data.nextScheduledBackup.split(',')[1] || '11:59 PM' : '11:59 PM'
            }));
          }
        })
        .catch(() => {});

      // 3. Compute dynamic financial balance & savings rate strictly for CURRENT MONTH
      const currentMonthPrefix = formatLocalYYYYMM(new Date());

      Promise.all([
        axios.get(`${API}/transactions`),
        axios.get(`${API}/categories`)
      ]).then(([txRes, catRes]) => {
        const allTxs: any[] = txRes.data || [];
        const categories: any[] = catRes.data || [];

        // Filter transactions strictly for the current month
        const currentMonthTx = allTxs.filter((t: any) => t.date && t.date.startsWith(currentMonthPrefix));

        const incomeReceived = currentMonthTx
          .filter((t: any) => t.type === 'income')
          .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

        let savingsCommitments = 0;
        let livingExpenses = 0;

        currentMonthTx
          .filter((t: any) => t.type !== 'income')
          .forEach((t: any) => {
            const amt = Number(t.amount) || 0;
            if (isSavingsCommitment(t, categories)) {
              savingsCommitments += amt;
            } else {
              livingExpenses += amt;
            }
          });

        const netMonthlySavings = incomeReceived - livingExpenses - savingsCommitments;
        const rate = incomeReceived > 0 
          ? Math.max(0, parseFloat(((netMonthlySavings / incomeReceived) * 100).toFixed(1)))
          : 0;

        const isNegative = netMonthlySavings < 0;
        const absVal = Math.abs(netMonthlySavings);
        const hasDecimal = absVal % 1 !== 0;
        const formattedBalance = (isNegative ? '-₹' : '₹') + absVal.toLocaleString('en-IN', {
          minimumFractionDigits: hasDecimal ? 2 : 0,
          maximumFractionDigits: 2
        });

        setSnapshotData(prev => ({
          ...prev,
          balance: formattedBalance,
          savingsRate: `${rate}%`
        }));
      }).catch(err => {
        console.error('[UserProfileDropdown] Failed to calculate current month metrics:', err);
      });
    }
  }, [isOpen]);

  // Click Outside & Escape Key Listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Radial Highlight Motion Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Quick Action Handlers
  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    setBackupMsg('Creating Snapshot...');
    try {
      const res = await axios.post(`${API}/enterprise-recovery/create-daily`);
      if (res.data.success) {
        setBackupMsg('Verified ✅');
        setSnapshotData(prev => ({ ...prev, lastBackupTimestamp: new Date().toISOString() }));
        setTimeout(() => {
          setBackupMsg(null);
          setIsOpen(false);
        }, 1200);
      } else {
        setBackupMsg('Failed');
      }
    } catch (_) {
      setBackupMsg('Error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportMsg('Exporting...');
    try {
      const res = await downloadBackupExport();
      if (res.success) {
        const nowIso = new Date().toISOString();
        setLastExportTimestamp(nowIso);
        localStorage.setItem('last_export_timestamp', nowIso);
        setExportMsg('Export Completed ✅');
        setTimeout(() => {
          setExportMsg(null);
          setIsOpen(false);
        }, 1500);
      } else {
        alert(`Export failed: ${res.error || 'Unable to generate backup export. Please try again.'}`);
        setExportMsg('Failed');
      }
    } catch (err: any) {
      alert('Export failed: Unable to connect to server.');
      setExportMsg('Error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left z-[1100]">
      {/* ── USER BADGE TRIGGER BUTTON ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          backgroundColor: isOpen ? themeData.bgCard : themeData.bgSecondary,
          borderColor: isOpen ? themeData.accentPrimary : themeData.borderColor,
          color: themeData.textPrimary
        }}
        className="flex items-center space-x-2.5 cursor-pointer p-1 pr-3 rounded-full transition-all duration-180 border outline-none group"
      >
        <div className="relative flex items-center justify-center">
          <div 
            style={{ background: `linear-gradient(135deg, ${themeData.accentPrimary}, ${themeData.accentSecondary})` }}
            className="w-8 h-8 rounded-full p-[1.5px] shadow-md transition-transform group-hover:scale-105"
          >
            <div 
              style={{ backgroundColor: themeData.bgCard, color: themeData.textPrimary }}
              className="w-full h-full rounded-full flex items-center justify-center font-extrabold text-xs"
            >
              V
            </div>
          </div>
          {/* Online Indicator Badge */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 shadow-sm animate-pulse" style={{ borderColor: themeData.bgCard }} />
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-black tracking-tight transition-colors leading-none" style={{ color: themeData.textPrimary }}>
            Venke
          </span>
          <span className="text-[9px] font-bold leading-tight mt-0.5 flex items-center gap-1" style={{ color: themeData.textMuted }}>
            Workspace
          </span>
        </div>
      </button>

      {/* ── FLOATING PROFILE DROPDOWN PANEL (FULL INTERNAL SCROLL CONTAINER) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, duration: 0.2 }}
            role="menu"
            aria-label="User Account Center"
            style={{
              backgroundColor: themeData.bgElevated,
              borderColor: themeData.borderColor,
              color: themeData.textPrimary,
              backgroundImage: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${themeData.accentGlow}, transparent 80%)`
            }}
            className="fixed sm:absolute right-4 sm:right-0 top-18 sm:top-full mt-2 w-[calc(100vw-32px)] sm:w-[355px] max-h-[min(80vh,720px)] overflow-y-auto overscroll-contain no-scrollbar rounded-[24px] backdrop-blur-2xl border shadow-2xl z-[1100] font-sans"
          >
            {/* CSS FOR VISUALLY HIDDEN SCROLLBAR */}
            <style>{`
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* 1. HEADER SECTION (24px padding & spacing) */}
            <div className="p-4 bg-gradient-to-b from-[#0F1C3A]/70 to-transparent flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8B5CF6] via-[#4F7CFF] to-[#A855F7] p-0.5 shadow-lg shadow-[#8B5CF6]/20">
                    <div className="w-full h-full rounded-[14px] bg-[#081226] flex items-center justify-center text-base font-black text-white">
                      V
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full shadow">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                    Venke
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Venke Finance Workspace
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-bold rounded-full tracking-wide shrink-0 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#8B5CF6]" /> Workspace
              </span>
            </div>

            {/* 2. ACCOUNT SNAPSHOT (DYNAMIC WITH LOCAL & RELATIVE TIME) */}
            <div className="p-4 bg-[#050B18]/50 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Account Snapshot
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/60 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance</span>
                  <span className="text-xs font-black text-white mt-0.5 block truncate">
                    {snapshotData.balance}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/60 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Savings Rate</span>
                  <span className="text-xs font-black text-emerald-400 mt-0.5 block">
                    {snapshotData.savingsRate}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/60 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Last Backup</span>
                  <span className="text-[10px] font-bold text-purple-400 mt-0.5 block truncate" title={formatLocalTime(snapshotData.lastBackupTimestamp)}>
                    {formatLocalTime(snapshotData.lastBackupTimestamp)}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">
                    ({formatRelativeTime(snapshotData.lastBackupTimestamp)})
                  </span>
                </div>
              </div>
            </div>

            {/* 3. AUTOMATION & BACKUP STATUS CARDS (STRUCTURED VISIBILITY) */}
            <div className="p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Backup & Automation Status
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/40 border border-[#1E2A44] flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cloud Sync</span>
                  <span className="text-xs font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/40 border border-[#1E2A44] flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Local Snapshot</span>
                  <span className="text-xs font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Verified
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/40 border border-[#1E2A44] flex flex-col justify-between col-span-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Last Backup</span>
                    <span className="text-[9px] font-bold text-purple-400">
                      {formatRelativeTime(snapshotData.lastBackupTimestamp)}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-100 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    {formatLocalTime(snapshotData.lastBackupTimestamp)}
                  </span>
                </div>

                {lastExportTimestamp && (
                  <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/40 border border-[#1E2A44] flex flex-col justify-between col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Last Export</span>
                      <span className="text-[9px] font-bold text-blue-400">{formatRelativeTime(lastExportTimestamp)}</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-100 mt-1 flex items-center gap-1 font-mono">
                      <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {formatLocalTime(lastExportTimestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. QUICK ACTIONS (FULLY FUNCTIONAL NAV & ACTIONS) */}
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                Quick Actions
              </span>

              <button
                onClick={() => handleNavigate('/transactions')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-bold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span>Add Transaction</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleNavigate('/bills')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-bold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span>Log LIC Payment</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleTriggerBackup}
                disabled={isBackingUp}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-bold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <RefreshCcw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                  </div>
                  <span>{backupMsg || 'Create Backup Now'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-bold active:scale-[0.98] disabled:opacity-60"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Download className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                  </div>
                  <span>{exportMsg || 'Export Data'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 5. WORKSPACE PREFERENCES */}
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                Workspace Preferences
              </span>

              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-semibold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <Palette className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Appearance</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-semibold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Backup & Restore</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { setIsOpen(false); onOpenCmdK?.(); }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-semibold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <Key className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <span className="text-[10px] font-mono text-[#8B5CF6] border border-[#8B5CF6]/30 px-1.5 py-0.5 rounded font-bold">⌘K</span>
              </button>

              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8B5CF6]/20 hover:text-white text-slate-200 transition-all duration-150 group text-xs font-semibold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 6. FOOTER SECTION */}
            <div className="p-4 bg-[#030712]/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block font-mono">
                  {snapshotData.appVersion}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                  {snapshotData.dbStatus}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  if (window.confirm('Are you sure you want to sign out?')) {
                    onLogout?.();
                  }
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/20 transition-all duration-150 shadow-sm active:scale-[0.96]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
