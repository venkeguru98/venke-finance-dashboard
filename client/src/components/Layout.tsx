import { useState, useEffect, type ReactNode, useMemo, memo, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, X, CalendarRange,
  Sliders, Pin, PinOff
} from 'lucide-react';

// Memoized Adaptive Nav Tab Component
const NavTab = memo(({ 
  to, icon, label, badge, isActive, showLabel, onClick 
}: { 
  to: string; icon: ReactNode; label: string; badge: string | null; isActive: boolean; showLabel: boolean; onClick?: () => void 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 450);
    onClick?.();
  };

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={`relative flex items-center justify-center rounded-full font-bold text-xs transition-all duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 group ${
        showLabel ? 'px-3.5 py-2 space-x-2' : 'w-11 h-11'
      } ${
        isPressed ? 'scale-[0.96]' : 'scale-100'
      } ${
        isActive
          ? 'bg-gradient-to-r from-[#8B5CF6] via-[#4F7CFF] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/35'
          : 'text-slate-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5'
      }`}
    >
      {/* Radial Gradient Ripple Feedback on Click */}
      {ripple && (
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" />
      )}

      {/* Active Indicator Accent Glow */}
      {isActive && !showLabel && (
        <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
      )}

      {/* Icon with Rotate & Scale Animation */}
      <span className="transition-transform duration-180 group-hover:scale-110 group-hover:rotate-2 shrink-0">
        {icon}
      </span>

      {/* Label Revealing on Hover Expansion */}
      {showLabel && (
        <span className="whitespace-nowrap font-semibold text-xs tracking-tight animate-in fade-in slide-in-from-left-1 duration-200">
          {label}
        </span>
      )}

      {/* Notification Badge */}
      {badge && (
        <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 animate-pulse ${
          isActive ? 'bg-white/20 text-white' : 'bg-[#8B5CF6]/30 text-[#8B5CF6]'
        } ${showLabel ? 'ml-1' : 'absolute -top-1 -right-1 border border-[#081226]'}`}>
          {badge}
        </span>
      )}

      {/* Floating Glass Tooltip when Collapsed */}
      {!showLabel && (
        <div className="absolute top-14 px-3 py-1.5 rounded-xl bg-[#081226] border border-[#1E2A44] text-white text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-180 pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  );
});

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  // Adaptive Dock States
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('dock_pinned') === 'true';
  });

  // Scroll-Aware Visibility States
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Immediate Scroll-Intent Detection Logic
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastY;

          if (Math.abs(diff) >= 1) {
            if (currentY <= 5) {
              setIsAtTop(true);
              setIsHeaderVisible(true);
            } else {
              setIsAtTop(false);
              if (diff > 0) {
                setIsHeaderVisible(false);
              } else if (diff < 0) {
                setIsHeaderVisible(true);
              }
            }
          }

          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDockMouseEnter = () => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    setIsHovered(true);
  };

  const handleDockMouseLeave = () => {
    if (isPinned) return;
    autoHideTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 2500);
  };

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    localStorage.setItem('dock_pinned', String(next));
    if (next) setIsHovered(true);
  };

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

  const showLabels = isPinned || isHovered;

  return (
    <div className="w-full min-h-screen bg-[#040816] text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* ── AMBIENT BACKGROUND LIGHTING LAYER ─────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        {/* Slow 25s Animated Ambient Light Bloom */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-radial from-[#8B5CF6]/15 via-[#4F7CFF]/10 to-transparent blur-[140px] animate-pulse" style={{ animationDuration: '25s' }} />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-radial from-[#A855F7]/10 to-transparent blur-[160px]" />
        {/* Subtle Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,8,22,0.6)_100%)] pointer-events-none" />
      </div>

      {/* Dynamic Keyframes for Breathing Glow & Scrollbar Masking */}
      <style>{`
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 0 30px rgba(79, 124, 255, 0.7); }
        }
        .animate-logo-glow {
          animation: logoGlow 5.5s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── 1. THREE-ZONE HEADER WITH SCROLL-AWARE FLOATING COMMAND DOCK ─────── */}
      <header
        className={`fixed top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 z-[1000] border-b border-[#1E2A44]/80 bg-[#081226]/85 backdrop-blur-2xl w-full transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAtTop ? 'h-[72px]' : 'h-[58px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
        } ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100 scale-100 blur-0 pointer-events-auto'
            : '-translate-y-[110%] opacity-0 scale-[0.985] blur-sm pointer-events-none'
        }`}
      >
        
        {/* ── LEFT ZONE (Width 240px: Logo Capsule) ───────────────────────── */}
        <div className="w-56 sm:w-60 shrink-0 flex items-center space-x-3">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className={`rounded-xl bg-gradient-to-br from-[#8B5CF6] via-[#4F7CFF] to-[#A855F7] flex items-center justify-center text-white animate-logo-glow group-hover:scale-105 transition-all duration-200 shrink-0 ${
              isAtTop ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
              <Wallet className={isAtTop ? "w-5 h-5" : "w-4 h-4"} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-tight text-white uppercase leading-none font-sans">
                VENKE FINANCE
              </span>
              {isAtTop && (
                <span className="text-[8px] font-black uppercase tracking-widest text-[#8B5CF6] mt-1 animate-in fade-in duration-150">
                  Track • Save • Grow
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER ZONE (Flex-1: Floating Adaptive Command Dock) ──────────── */}
        <div className="flex-1 hidden md:flex items-center justify-center px-4 max-w-[860px] overflow-hidden">
          <nav
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            className={`flex items-center space-x-1.5 px-3 rounded-[24px] backdrop-blur-2xl bg-[#081226]/90 border border-[#1E2A44] shadow-[0_16px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-w-full overflow-x-auto no-scrollbar will-change-transform ${
              isAtTop ? 'h-[64px]' : 'h-[48px]'
            } ${
              showLabels ? 'px-4' : 'px-2.5'
            }`}
          >
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
                  showLabel={showLabels}
                />
              );
            })}
          </nav>
        </div>

        {/* ── RIGHT ZONE (Width 240px: Search, Bell, Pin Toggle, Profile) ───── */}
        <div className="w-56 sm:w-60 shrink-0 flex items-center justify-end space-x-2">
          {/* Cmd + K Trigger */}
          <div 
            onClick={() => setIsCmdKOpen(true)}
            className="flex items-center rounded-full px-3 py-1.5 text-xs border border-[#1E2A44] bg-[#0D1830] text-slate-400 hover:border-[#8B5CF6] cursor-pointer transition shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            <span className="hidden lg:inline font-medium text-slate-400">Search...</span>
            <span className="text-[10px] font-mono text-[#8B5CF6] border border-[#8B5CF6]/30 px-1.5 py-0.5 rounded font-bold ml-1">⌘K</span>
          </div>

          {/* Notification Bell */}
          <button className="p-2 rounded-full relative transition-transform hover:rotate-6 hover:bg-[#0D1830]">
            <Bell className="w-4.5 h-4.5 text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
          </button>

          {/* Dock Pin Toggle */}
          <button 
            onClick={togglePin}
            className={`p-2 rounded-full hidden md:flex transition ${
              isPinned ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40' : 'text-slate-400 hover:bg-[#0D1830]'
            }`}
            title={isPinned ? 'Unpin Dock Auto-Hide' : 'Pin Dock Always Expanded'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          {/* User Profile */}
          <div 
            onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
            className="flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full transition-all duration-200 hover:bg-[#0D1830] border border-[#1E2A44] hover:border-[#8B5CF6]/40"
            title="Click to logout"
          >
            <UserCircle className="w-7 h-7 text-[#8B5CF6]" />
            <span className="text-xs font-bold hidden sm:block text-slate-200">Venke</span>
          </div>
        </div>
      </header>

      {/* ── 2. FULL-WIDTH WORKSPACE CONTAINER ────────────────────────────────── */}
      <div className="w-full min-h-screen pt-24 px-4 sm:px-8 pb-24 md:pb-8">
        <main className="w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>

      {/* ── 3. MOBILE FLOATING BOTTOM DOCK ───────────────────────────────────── */}
      <nav className={`fixed bottom-4 left-4 right-4 h-16 backdrop-blur-2xl bg-[#081226]/95 border border-[#1E2A44] rounded-full shadow-2xl z-50 md:hidden flex justify-around items-center px-4 transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isHeaderVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'
      }`}>
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
                isActive ? 'text-[#8B5CF6] font-black scale-110' : 'text-slate-400 hover:text-white'
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
        <div className="fixed inset-0 z-50 bg-[#040816]/90 backdrop-blur-2xl p-6 flex flex-col justify-between animate-in fade-in duration-200 md:hidden">
          <div className="flex justify-between items-center pb-4 border-b border-[#1E2A44]">
            <div className="flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-[#8B5CF6]" />
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
                className="p-4 rounded-2xl bg-[#081226] border border-[#1E2A44] text-white flex items-center space-x-3 cursor-pointer hover:border-[#8B5CF6]"
              >
                <span className="text-[#8B5CF6]">{item.icon}</span>
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#1E2A44] flex justify-between items-center">
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
          <div className="bg-[#081226] border border-[#1E2A44] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#1E2A44] flex items-center space-x-3 bg-[#040816]">
              <Search className="w-5 h-5 text-[#8B5CF6] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search Venke Finance OS..."
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none font-medium"
              />
              <span className="text-[10px] font-mono text-slate-400 border border-[#1E2A44] px-2 py-0.5 rounded">ESC</span>
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
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#8B5CF6]/20 border border-transparent hover:border-[#8B5CF6]/40 cursor-pointer flex justify-between items-center group transition"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">{item.title}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-[#8B5CF6]">{item.cat}</span>
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
