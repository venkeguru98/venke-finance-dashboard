import { useState, useEffect, type ReactNode, useMemo, memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, X, CalendarRange,
  Sliders
} from 'lucide-react';

// Memoized Nav Tab Component to prevent unnecessary parent re-renders
const NavTab = memo(({ 
  to, icon, label, badge, isActive 
}: { 
  to: string; icon: ReactNode; label: string; badge: string | null; isActive: boolean 
}) => {
  return (
    <NavLink
      to={to}
      className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-full font-bold text-xs transition-all duration-200 shrink-0 group ${
        isActive
          ? 'bg-gradient-to-r from-[#7C5CFF] to-blue-600 text-white shadow-md shadow-[#7C5CFF]/30'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="transition-transform duration-200 group-hover:scale-110 shrink-0">
        {icon}
      </span>
      <span className="whitespace-nowrap font-medium text-xs tracking-tight">
        {label}
      </span>
      {badge && (
        <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ml-1 shrink-0 ${
          isActive ? 'bg-white/20 text-white' : 'bg-[#7C5CFF]/20 text-[#7C5CFF]'
        }`}>
          {badge}
        </span>
      )}
    </NavLink>
  );
});

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  const financeNavItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', badge: null },
    { to: '/transactions', icon: <ReceiptText size={18} />, label: 'Transactions', badge: null },
    { to: '/financial-records', icon: <Wallet size={18} />, label: 'Records', badge: '3' },
    { to: '/budgets', icon: <PieChart size={18} />, label: 'Budgets', badge: null },
    { to: '/goals', icon: <Target size={18} />, label: 'Goals', badge: null },
    { to: '/bills', icon: <CalendarRange size={18} />, label: 'Bills', badge: '2' },
    { to: '/analytics', icon: <LineChart size={18} />, label: 'Analytics', badge: null },
    { to: '/calendar', icon: <CalendarDays size={18} />, label: 'Calendar', badge: null },
    { to: '/import', icon: <Upload size={18} />, label: 'Import', badge: null },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings', badge: null },
  ];

  // Cmd / Ctrl + K Keyboard Shortcut Listener
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

  // Command Palette Items Filter
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#050814] text-slate-900 dark:text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* CSS Utility for Scrollbar Masking */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── 1. TOP-CENTERED FLOATING SEGMENTED NAVIGATION BAR ───────────────── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] hidden md:flex items-center space-x-1 p-1.5 rounded-full backdrop-blur-2xl bg-[#080a12]/85 dark:bg-[#080a12]/90 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] max-w-[92vw] overflow-x-auto no-scrollbar will-change-transform">
        {financeNavItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavTab
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* ── 2. FULL-WIDTH HEADER BAR (Brand Left, Quick Controls Right) ─────── */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 sm:px-8 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#050814]/70 backdrop-blur-md w-full">
        
        {/* Left: Brand Capsule */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFF] to-blue-600 flex items-center justify-center text-white shadow-md shadow-[#7C5CFF]/30 group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white uppercase leading-none font-sans">
              VENKE FINANCE
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#7C5CFF] mt-0.5">
              Track • Save • Grow
            </span>
          </div>
        </div>

        {/* Right: Quick Actions & Profile */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Cmd + K Trigger */}
          <div 
            onClick={() => setIsCmdKOpen(true)}
            className="flex items-center rounded-full px-3.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0b1228]/80 text-slate-400 hover:border-[#7C5CFF] cursor-pointer transition shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <span className="hidden sm:inline font-medium text-slate-400">Search OS...</span>
            <span className="text-[10px] font-mono text-[#7C5CFF] border border-[#7C5CFF]/30 px-1.5 py-0.5 rounded font-bold ml-1.5">⌘K</span>
          </div>

          <button className="p-2 rounded-full relative transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <Bell className="w-4.5 h-4.5 text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#7C5CFF] rounded-full animate-pulse" />
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

      {/* ── 3. FULL-WIDTH PAGE CONTAINER (Top Padding 96px for Floating Nav) ──── */}
      <div className="w-full min-h-screen pt-24 px-4 sm:px-8 pb-24 md:pb-8">
        <main className="w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>

      {/* ── 4. FLOATING MOBILE BOTTOM DOCK (Mobile Only) ────────────────────── */}
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

      {/* ── 5. GLOBAL COMMAND PALETTE MODAL (Ctrl / Cmd + K) ────────────────── */}
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
