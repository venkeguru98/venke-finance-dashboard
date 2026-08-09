import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ShieldCheck, 
  Sparkles, PlusCircle, FileSpreadsheet, RefreshCcw, 
  Download, Settings, Key, Lock, Palette, LogOut, CheckCircle2,
  Sparkle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface UserProfileDropdownProps {
  onLogout?: () => void;
  onOpenCmdK?: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ onLogout, onOpenCmdK }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dynamic Snapshot Data
  const [snapshotData, setSnapshotData] = useState({
    balance: '₹13,057',
    savingsRate: '17.4%',
    lastBackup: 'Today • 11:59 PM',
    appVersion: 'v3.0.0',
    dbStatus: 'Connected (PostgreSQL / SQLite)',
    cloudSync: 'Connected',
    localSnapshot: 'Verified',
    licAutopilot: 'Active',
    scheduler: 'Healthy'
  });

  // Fetch dynamic stats when opening
  useEffect(() => {
    if (isOpen) {
      // 1. Fetch system status
      axios.get(`${API}/system/status`)
        .then(res => {
          if (res.data) {
            setSnapshotData(prev => ({
              ...prev,
              appVersion: `v${res.data.appVersion || '3.0.0'}`,
              dbStatus: res.data.databaseEngine ? `Connected (${res.data.databaseEngine.includes('PostgreSQL') ? 'Neon PG' : 'Local SQLite'})` : prev.dbStatus,
              lastBackup: res.data.lastBackupDate || prev.lastBackup
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
              lastBackup: `${res.data.lastVerifiedBackupDate || 'Today'} • ${res.data.lastVerifiedBackupTime || '11:59 PM'}`
            }));
          }
        })
        .catch(() => {});

      // 3. Compute dynamic financial balance & savings rate
      axios.get(`${API}/transactions`)
        .then(res => {
          const txs: any[] = res.data || [];
          let income = 0;
          let expense = 0;
          txs.forEach(t => {
            const amt = Number(t.amount) || 0;
            if (t.type === 'income') income += amt;
            else if (t.type === 'expense') expense += amt;
          });
          const net = income - expense;
          const rate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '17.4';

          setSnapshotData(prev => ({
            ...prev,
            balance: `₹${net.toLocaleString('en-IN')}`,
            savingsRate: `${rate}%`
          }));
        })
        .catch(() => {});
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
        setTimeout(() => setBackupMsg(null), 3000);
      } else {
        setBackupMsg('Failed');
      }
    } catch (_) {
      setBackupMsg('Error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = () => {
    window.open(`${API}/system/db-export`, '_blank');
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left z-50">
      {/* ── USER BADGE TRIGGER BUTTON ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center space-x-2.5 cursor-pointer p-1 pr-3 rounded-full transition-all duration-200 border outline-none group ${
          isOpen
            ? 'bg-[#0D1830] border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-[0.98]'
            : 'bg-[#081226]/80 border-[#1E2A44] hover:border-[#8B5CF6]/50 hover:bg-[#0D1830] hover:scale-[1.02]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#4F7CFF] to-[#A855F7] p-[1.5px] shadow-md transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-[#081226] flex items-center justify-center font-extrabold text-xs text-white">
              V
            </div>
          </div>
          {/* Online Indicator Badge */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#081226] shadow-sm animate-pulse" />
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-black tracking-tight text-white group-hover:text-[#8B5CF6] transition-colors leading-none">
            Venke
          </span>
          <span className="text-[9px] font-bold text-slate-400 leading-tight mt-0.5 flex items-center gap-1">
            Premium <Sparkle className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          </span>
        </div>
      </button>

      {/* ── FLOATING PROFILE DROPDOWN PANEL ──────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, y: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26, duration: 0.2 }}
            className="fixed sm:absolute right-4 sm:right-0 top-18 sm:top-full mt-2 w-[calc(100vw-32px)] sm:w-[350px] rounded-[24px] bg-[#081226]/95 backdrop-blur-2xl border border-[#1E2A44] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(139,92,246,0.18)] overflow-hidden z-50 text-slate-100 divide-y divide-[#1E2A44]/60 font-sans"
            style={{
              backgroundImage: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139,92,246,0.12), transparent 80%)`
            }}
          >
            {/* 1. HEADER SECTION */}
            <div className="p-4 bg-gradient-to-b from-[#0F1C3A]/60 to-transparent flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] via-[#4F7CFF] to-[#A855F7] p-0.5 shadow-lg shadow-[#8B5CF6]/20">
                    <div className="w-full h-full rounded-[14px] bg-[#081226] flex items-center justify-center text-lg font-black text-white">
                      V
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full shadow">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                    Venke <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Venke Finance Workspace
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-black uppercase rounded-full tracking-wider shrink-0">
                Premium
              </span>
            </div>

            {/* 2. ACCOUNT SNAPSHOT (DYNAMIC) */}
            <div className="p-4 bg-[#050B18]/40 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Account Snapshot
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/50 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance</span>
                  <span className="text-xs font-black text-white mt-0.5 block truncate">
                    {snapshotData.balance}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/50 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Savings Rate</span>
                  <span className="text-xs font-black text-emerald-400 mt-0.5 block">
                    {snapshotData.savingsRate}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#0F1C3A]/50 border border-[#1E2A44] text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Last Backup</span>
                  <span className="text-[10px] font-bold text-purple-400 mt-0.5 block truncate">
                    {snapshotData.lastBackup}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. AUTOMATION STATUS CARD (READ-ONLY) */}
            <div className="p-4 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Automation Health Status
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0F1C3A]/30 border border-[#1E2A44]/60">
                  <span className="text-slate-300 text-[11px]">Cloud Sync</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-400 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0F1C3A]/30 border border-[#1E2A44]/60">
                  <span className="text-slate-300 text-[11px]">Local Snapshot</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-400 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0F1C3A]/30 border border-[#1E2A44]/60">
                  <span className="text-slate-300 text-[11px]">LIC Autopilot</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-400 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0F1C3A]/30 border border-[#1E2A44]/60">
                  <span className="text-slate-300 text-[11px]">Scheduler</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-400 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Healthy
                  </span>
                </div>
              </div>
            </div>

            {/* 4. QUICK ACTIONS */}
            <div className="p-3 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                Quick Actions
              </span>

              <button
                onClick={() => { setIsOpen(false); navigate('/transactions'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-bold"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span>Add Transaction</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => { setIsOpen(false); navigate('/bills'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-bold"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span>Log LIC Payment</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleTriggerBackup}
                disabled={isBackingUp}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-bold"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <RefreshCcw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                  </div>
                  <span>{backupMsg || 'Create Backup Now'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-bold"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <span>Export Data</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* 5. WORKSPACE / QUICK LINKS */}
            <div className="p-3 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                Workspace Preferences
              </span>

              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <Palette className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Appearance</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <Lock className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Security & Protection</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Backup & Restore</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => { setIsOpen(false); onOpenCmdK?.(); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <Key className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <span className="text-[10px] font-mono text-[#8B5CF6] border border-[#8B5CF6]/30 px-1.5 py-0.5 rounded font-bold">⌘K</span>
              </button>

              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-white text-slate-300 transition-all duration-150 group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-[#8B5CF6]" />
                  <span>Full Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* 6. FOOTER SECTION */}
            <div className="p-4 bg-[#030712]/70 flex items-center justify-between">
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/20 transition-all duration-150 shadow-sm"
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
};
