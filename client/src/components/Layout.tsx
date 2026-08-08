import { useState, useEffect, type ReactNode, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, X, CalendarRange,
  Command, Sliders
} from 'lucide-react';

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  const financeNavItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', badge: null },
    { to: '/transactions', icon: <ReceiptText size={20} />, label: 'Transactions', badge: null },
    { to: '/financial-records', icon: <Wallet size={20} />, label: 'Records', badge: '3' },
    { to: '/budgets', icon: <PieChart size={20} />, label: 'Budgets', badge: null },
    { to: '/goals', icon: <Target size={20} />, label: 'Goals', badge: null },
    { to: '/bills', icon: <CalendarRange size={20} />, label: 'Bills', badge: '2' },
    { to: '/analytics', icon: <LineChart size={20} />, label: 'Analytics', badge: null },
    { to: '/calendar', icon: <CalendarDays size={20} />, label: 'Calendar', badge: null },
    { to: '/import', icon: <Upload size={20} />, label: 'Import', badge: null },
  ];

  // Cmd / Ctrl + K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsCmdKOpen(false);
        setIsMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Command palette navigation search items
  const cmdResults = useMemo(() => {
    const items = [
      { title: 'Dashboard', route: '/', cat: 'Navigation' },
      { title: 'Transactions Ledger', route: '/transactions', cat: 'Navigation' },
      { title: 'Financial Records', route: '/financial-records', cat: 'Navigation' },
      { title: 'Monthly Budgets Planner', route: '/budgets', cat: 'Navigation' },
      { title: 'Financial Goals', route: '/goals', cat: 'Navigation' },
      { title: 'Recurring Bills & LIC', route: '/bills', cat: 'Navigation' },
      { title: 'Analytics & Insights', route: '/analytics', cat: 'Navigation' },
      { title: 'Cashflow Heatmap Calendar', route: '/calendar', cat: 'Navigation' },
      { title: 'Import Bank Statements', route: '/import', cat: 'Tools' },
      { title: 'Settings & Security', route: '/settings', cat: 'Settings' },
    ];
    return items.filter(i => i.title.toLowerCase().includes(cmdQuery.toLowerCase()));
  }, [cmdQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050814] text-slate-900 dark:text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* ── 1. 2026 FLOATING ADAPTIVE VERTICAL NAVIGATION DOCK (Desktop) ────── */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`fixed left-5 top-5 bottom-5 z-50 hidden md:flex flex-col justify-between backdrop-blur-2xl bg-[#080a12]/85 dark:bg-[#080a12]/90 border border-white/10 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out ${
          isExpanded ? 'w-64 p-4' : 'w-[72px] p-3'
        }`}
      >
        {/* Dock Header (Brand Capsule) */}
        <div className="flex items-center space-x-3 overflow-hidden pb-4 border-b border-white/10">
          <div 
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C5CFF] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-[#7C5CFF]/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            <Wallet className="w-5 h-5 text-white" />
          </div>

          {isExpanded && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left duration-200">
              <span className="font-extrabold text-xs tracking-tight text-white uppercase leading-none font-sans">
                VENKE FINANCE
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#7C5CFF] mt-1">
                Track • Save • Grow
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items list */}
        <nav className="flex-1 my-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {financeNavItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`group relative flex items-center rounded-2xl transition-all duration-200 font-bold text-xs ${
                  isExpanded ? 'px-3.5 py-2.5 space-x-3' : 'w-11 h-11 justify-center mx-auto'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7C5CFF] to-blue-600 text-white shadow-lg shadow-[#7C5CFF]/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Active Indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-sm" />
                )}

                {/* Icon */}
                <span className="transition-transform duration-200 group-hover:scale-110 shrink-0">
                  {item.icon}
                </span>

                {/* Label (Expanded state) */}
                {isExpanded && (
                  <span className="truncate flex-1 animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}

                {/* Badge */}
                {item.badge && (
                  <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#7C5CFF]/20 text-[#7C5CFF]'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Floating Glass Tooltip (Collapsed state) */}
                {!isExpanded && (
                  <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[#0b1228] border border-white/10 text-white text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Dock Footer (Settings & Controls) */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          {/* Cmd + K Trigger */}
          <button
            onClick={() => setIsCmdKOpen(true)}
            className={`w-full flex items-center rounded-2xl bg-white/5 border border-white/10 hover:border-[#7C5CFF] text-slate-400 hover:text-white transition ${
              isExpanded ? 'px-3 py-2 space-x-2' : 'w-11 h-11 justify-center mx-auto'
            }`}
            title="Command Palette (Cmd + K)"
          >
            <Command className="w-4 h-4 text-[#7C5CFF] shrink-0" />
            {isExpanded && <span className="text-xs font-bold flex-1 text-left">Search OS</span>}
            {isExpanded && <span className="text-[9px] font-mono text-slate-500 border border-white/10 px-1.5 py-0.5 rounded">⌘K</span>}
          </button>

          {/* Settings Nav */}
          <NavLink
            to="/settings"
            className={`group relative flex items-center rounded-2xl transition-all duration-200 font-bold text-xs ${
              isExpanded ? 'px-3.5 py-2.5 space-x-3' : 'w-11 h-11 justify-center mx-auto'
            } ${
              location.pathname === '/settings'
                ? 'bg-gradient-to-r from-[#7C5CFF] to-blue-600 text-white shadow-lg shadow-[#7C5CFF]/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate">Settings</span>}
            {!isExpanded && (
              <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[#0b1228] border border-white/10 text-white text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* ── 2. DYNAMIC WORKSPACE CONTENT WRAPPER (Shifted for Dock) ────────── */}
      <div className={`transition-all duration-300 ease-out flex flex-col min-h-screen ${
        isExpanded ? 'md:pl-[280px]' : 'md:pl-28'
      }`}>
        
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 z-30 flex-shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#050814]/70 backdrop-blur-md sticky top-0">
          <div className="flex items-center space-x-3">
            {/* Cmd + K Search Trigger */}
            <div 
              onClick={() => setIsCmdKOpen(true)}
              className="flex items-center rounded-full px-4 py-2 w-48 sm:w-72 md:w-96 text-xs border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0b1228]/80 text-slate-400 hover:border-[#7C5CFF] cursor-pointer transition shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <span className="flex-1 font-medium truncate">Search transactions, records...</span>
              <span className="text-[10px] font-mono text-[#7C5CFF] border border-[#7C5CFF]/30 px-1.5 py-0.5 rounded font-bold">⌘K</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full relative transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell className="w-4.5 h-4.5 text-slate-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#7C5CFF] rounded-full animate-pulse"></span>
            </button>
            <div 
              onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
              className="flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              title="Click to logout"
            >
              <UserCircle className="w-7 h-7 text-[#7C5CFF]" />
              <span className="text-xs font-bold hidden sm:block">Venke</span>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── 3. FLOATING MOBILE BOTTOM DOCK (Mobile Only) ────────────────────── */}
      <nav className="fixed bottom-4 left-4 right-4 h-16 backdrop-blur-2xl bg-[#080a12]/90 border border-white/10 rounded-full shadow-2xl z-50 md:hidden flex justify-around items-center px-4">
        {[
          { to: '/', icon: <LayoutDashboard size={20} />, label: 'Home' },
          { to: '/transactions', icon: <ReceiptText size={20} />, label: 'TXs' },
          { to: '/financial-records', icon: <Wallet size={20} />, label: 'Records' },
          { to: '/budgets', icon: <PieChart size={20} />, label: 'Budgets' },
        ].map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center space-y-0.5 w-12 h-12 rounded-full transition-all ${
                isActive ? 'text-[#7C5CFF] font-black scale-110' : 'text-slate-400 hover:text-white'
              }`
            }
          >
            {tab.icon}
            <span className="text-[8px] font-bold uppercase">{tab.label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setIsMobileSheetOpen(true)}
          className="flex flex-col items-center justify-center space-y-0.5 w-12 h-12 rounded-full text-slate-400 hover:text-white transition"
        >
          <Sliders size={20} />
          <span className="text-[8px] font-bold uppercase">More</span>
        </button>
      </nav>

      {/* Mobile Full-Screen Navigation Sheet */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl p-6 flex flex-col justify-between animate-in fade-in duration-200 md:hidden">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-[#7C5CFF]" />
              <span className="font-extrabold text-sm tracking-tight text-white uppercase">VENKE FINANCE</span>
            </div>
            <button onClick={() => setIsMobileSheetOpen(false)} className="p-2 rounded-full bg-white/10 text-white">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 my-auto">
            {financeNavItems.map(item => (
              <div
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  setIsMobileSheetOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#0b1228] border border-white/10 text-white flex items-center space-x-3 cursor-pointer hover:border-[#7C5CFF]"
              >
                <span className="text-[#7C5CFF]">{item.icon}</span>
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <button
              onClick={() => { navigate('/settings'); setIsMobileSheetOpen(false); }}
              className="flex items-center space-x-2 text-xs font-bold text-slate-400"
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button
              onClick={() => { if(window.confirm('Sign out?')) onLogout?.(); }}
              className="text-xs font-bold text-rose-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── 4. GLOBAL COMMAND PALETTE MODAL (Ctrl / Cmd + K) ────────────────── */}
      {isCmdKOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1228] border border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center space-x-3 bg-[#080a12]">
              <Search className="w-5 h-5 text-[#7C5CFF] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search Venke Finance OS..."
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none font-medium"
              />
              <span className="text-[10px] font-mono text-slate-400 border border-white/10 px-2 py-0.5 rounded">ESC</span>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {cmdResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-semibold">
                  No matching items found.
                </div>
              ) : (
                cmdResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(item.route);
                      setIsCmdKOpen(false);
                    }}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#7C5CFF]/20 border border-transparent hover:border-[#7C5CFF]/40 cursor-pointer flex justify-between items-center group transition"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">{item.title}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-[#7C5CFF]">{item.cat}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
