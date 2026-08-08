import { useState, useEffect, type ReactNode, useMemo, memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, X, CalendarRange,
  Sliders
} from 'lucide-react';

// Memoized Nav Tab Component for 60 FPS interaction continuity
const NavTab = memo(({ 
  to, icon, label, badge, isActive 
}: { 
  to: string; icon: ReactNode; label: string; badge: string | null; isActive: boolean 
}) => {
  return (
    <NavLink
      to={to}
      className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-full font-bold text-xs transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0 group ${
        isActive
          ? 'bg-gradient-to-r from-[#5B5FEF] via-[#7C4DFF] to-[#A855F7] text-white shadow-lg shadow-[#7C4DFF]/35 scale-[1.02]'
          : 'text-slate-400 hover:text-white hover:bg-white/5 hover:-translate-y-0.5'
      }`}
    >
      <span className="transition-transform duration-180 group-hover:scale-110 shrink-0">
        {icon}
      </span>
      <span className="whitespace-nowrap font-medium text-xs tracking-tight">
        {label}
      </span>
      {badge && (
        <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ml-1 shrink-0 ${
          isActive ? 'bg-white/20 text-white' : 'bg-[#7C4DFF]/25 text-[#7C4DFF]'
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
    { to: '/', icon: <LayoutDashboard size={17} />, label: 'Dashboard', badge: null },
    { to: '/transactions', icon: <ReceiptText size={17} />, label: 'Transactions', badge: null },
    { to: '/financial-records', icon: <Wallet size={17} />, label: 'Records', badge: '3' },
    { to: '/budgets', icon: <PieChart size={17} />, label: 'Budgets', badge: null },
    { to: '/goals', icon: <Target size={17} />, label: 'Goals', badge: null },
    { to: '/bills', icon: <CalendarRange size={17} />, label: 'Bills', badge: '2' },
    { to: '/analytics', icon: <LineChart size={17} />, label: 'Analytics', badge: null },
    { to: '/calendar', icon: <CalendarDays size={17} />, label: 'Calendar', badge: null },
    { to: '/import', icon: <Upload size={17} />, label: 'Import', badge: null },
    { to: '/settings', icon: <Settings size={17} />, label: 'Settings', badge: null },
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
      
      {/* Dynamic Keyframes for Breathing Glow & Scrollbar Masking */}
      <style>{`
        @keyframes logoBreath {
          0%, 100% { box-shadow: 0 0 15px rgba(124, 77, 255, 0.35); }
          50% { box-shadow: 0 0 28px rgba(168, 85, 247, 0.65); }
        }
        .animate-logo-breath {
          animation: logoBreath 6s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── 1. THREE-ZONE ADAPTIVE HEADER (72px Height, Safe Area Padding) ──── */}
      <header className="fixed top-0 left-0 right-0 h-[72px] flex items-center justify-between px-4 sm:px-8 z-[1000] border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#050814]/85 backdrop-blur-xl w-full">
        
        {/* ── LEFT ZONE (Width 240px: Logo & Brand Capsule, Never Compressed) ── */}
        <div className="w-56 sm:w-60 shrink-0 flex items-center space-x-3">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5FEF] via-[#7C4DFF] to-[#A855F7] flex items-center justify-center text-white animate-logo-breath group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white uppercase leading-none font-sans">
                VENKE FINANCE
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#7C4DFF] mt-1">
                Track • Save • Grow
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER ZONE (Flex-1: Floating Segmented Navigation Capsule) ───── */}
        <div className="flex-1 hidden md:flex items-center justify-center px-4 max-w-[840px] overflow-hidden">
          <nav className="h-[52px] flex items-center space-x-1 px-2 py-1 rounded-full backdrop-blur-[18px] bg-[#0A1024]/80 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)] max-w-full overflow-x-auto no-scrollbar will-change-transform">
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
        </div>

        {/* ── RIGHT ZONE (Width 240px: Search, Bell, Profile, Never Compressed) ─ */}
        <div className="w-56 sm:w-60 shrink-0 flex items-center justify-end space-x-2.5">
          {/* Cmd + K Trigger */}
          <div 
            onClick={() => setIsCmdKOpen(true)}
            className="flex items-center rounded-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0b1228]/80 text-slate-400 hover:border-[#7C4DFF] cursor-pointer transition shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            <span className="hidden lg:inline font-medium text-slate-400">Search OS...</span>
            <span className="text-[10px] font-mono text-[#7C4DFF] border border-[#7C4DFF]/30 px-1.5 py-0.5 rounded font-bold ml-1">⌘K</span>
          </div>

          {/* Notification Bell */}
          <button className="p-2 rounded-full relative transition-transform hover:rotate-6 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Bell className="w-4.5 h-4.5 text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#7C4DFF] rounded-full animate-pulse" />
          </button>

          {/* User Profile */}
          <div 
            onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
            className="flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-[#7C4DFF]/40"
            title="Click to logout"
          >
            <UserCircle className="w-7 h-7 text-[#7C4DFF]" />
            <span className="text-xs font-bold hidden sm:block text-slate-200">Venke</span>
          </div>
        </div>
      </header>

      {/* ── 2. FULL-WIDTH WORKSPACE CONTAINER (Top Padding 96px for Header) ───── */}
      <div className="w-full min-h-screen pt-24 px-4 sm:px-8 pb-24 md:pb-8">
        <main className="w-full max-w-[1600px] mx-auto">
          {children}
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
                isActive ? 'text-[#7C4DFF] font-black scale-110' : 'text-slate-400 hover:text-white'
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
              <Wallet className="w-6 h-6 text-[#7C4DFF]" />
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
                className="p-4 rounded-2xl bg-[#0b1228] border border-white/10 text-white flex items-center space-x-3 cursor-pointer hover:border-[#7C4DFF]"
              >
                <span className="text-[#7C4DFF]">{item.icon}</span>
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
              <Search className="w-5 h-5 text-[#7C4DFF] shrink-0" />
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
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#7C4DFF]/20 border border-transparent hover:border-[#7C4DFF]/40 cursor-pointer flex justify-between items-center group transition"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">{item.title}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-[#7C4DFF]">{item.cat}</span>
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
