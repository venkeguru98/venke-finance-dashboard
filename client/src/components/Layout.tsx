import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, Menu, X, CalendarRange,
  Sparkles, ChevronDown, CheckSquare, Flame, StickyNote, Sun, Apple
} from 'lucide-react';

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isPersonal = location.pathname.startsWith('/personal-assist');

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const closeDrawer = () => setIsDrawerOpen(false);

  const financeNavItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/transactions', icon: <ReceiptText size={20} />, label: 'Transactions' },
    { to: '/financial-records', icon: <Wallet size={20} />, label: 'Records' },
    { to: '/budgets', icon: <PieChart size={20} />, label: 'Budgets' },
    { to: '/goals', icon: <Target size={20} />, label: 'Goals' },
    { to: '/bills', icon: <CalendarRange size={20} />, label: 'Bills' },
    { to: '/analytics', icon: <LineChart size={20} />, label: 'Analytics' },
    { to: '/calendar', icon: <CalendarDays size={20} />, label: 'Calendar' },
  ];

  const personalNavItems = [
    { to: '/personal-assist', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/personal-assist/my-day', icon: <Sun size={20} />, label: 'My Day' },
    { to: '/personal-assist/calendar', icon: <CalendarDays size={20} />, label: 'Calendar' },
    { to: '/personal-assist/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { to: '/personal-assist/habits', icon: <Flame size={20} />, label: 'Habits' },
    { to: '/personal-assist/goals', icon: <Target size={20} />, label: 'Goals' },
    { to: '/personal-assist/wellness', icon: <Apple size={20} />, label: 'Wellness' },
    { to: '/personal-assist/notes', icon: <StickyNote size={20} />, label: 'Notes' },
    { to: '/personal-assist/reminders', icon: <Bell size={20} />, label: 'Reminders' },
    { to: '/personal-assist/analytics', icon: <LineChart size={20} />, label: 'Analytics' },
    { to: '/personal-assist/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const currentNavItems = isPersonal ? personalNavItems : financeNavItems;

  const renderModuleSwitcher = () => (
    <div className="relative">
      <button 
        onClick={() => setSwitcherOpen(!switcherOpen)} 
        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-2xl border transition ${
          isPersonal 
            ? 'bg-teal-50 border-teal-200/80 text-teal-950 hover:bg-teal-100/60' 
            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-850'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isPersonal ? (
            <div className="w-6 h-6 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-xs shadow-md">
              ✦
            </div>
          ) : (
            <Wallet className="w-4.5 h-4.5 text-primary flex-shrink-0" />
          )}
          <div className="flex flex-col text-left">
            <span className={`font-extrabold text-xs tracking-tight uppercase leading-none ${isPersonal ? 'text-teal-950 font-black' : 'text-slate-900 dark:text-white'}`}>
              {isPersonal ? 'VENKE ASSIST' : 'VENKE FINANCE'}
            </span>
            <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isPersonal ? 'text-teal-600' : 'text-slate-400 dark:text-slate-500'}`}>
              {isPersonal ? 'Plan • Track • Achieve' : 'Track • Save • Grow'}
            </span>
          </div>
        </div>
        <ChevronDown size={14} className={isPersonal ? 'text-teal-700 ml-2' : 'text-slate-400 ml-2'} />
      </button>

      {switcherOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <button 
            onClick={() => { setSwitcherOpen(false); navigate('/'); }} 
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition ${
              !isPersonal ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-extrabold">VENKE FINANCE</span>
              <span className="text-[8px] opacity-75 font-normal text-slate-500">Wealth, Accounts & Ledger</span>
            </div>
          </button>
          <button 
            onClick={() => { setSwitcherOpen(false); navigate('/personal-assist'); }} 
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition ${
              isPersonal ? 'bg-teal-500/15 text-teal-800 border border-teal-500/30' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-600" />
            <div className="flex flex-col">
              <span className="font-extrabold">PERSONAL ASSIST</span>
              <span className="text-[8px] opacity-75 font-normal text-slate-500">Planner, Tasks, Habits & Goals</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex h-screen transition-colors overflow-hidden font-sans ${
      isPersonal 
        ? 'bg-[#e5eeea] text-slate-800 p-2 md:p-3 gap-2 md:gap-3' 
        : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
    }`}>
      
      {/* Desktop Sidebar */}
      <aside className={`w-52 md:w-56 flex flex-col hidden md:flex flex-shrink-0 transition-all ${
        isPersonal
          ? 'bg-white rounded-3xl border border-slate-200/80 shadow-lg'
          : 'border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
      }`}>
        <div className="h-16 flex flex-col justify-center px-3 border-b border-slate-100 dark:border-slate-800">
          {renderModuleSwitcher()}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {currentNavItems.map(item => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              end={item.to === '/' || item.to === '/personal-assist'} 
              isPersonal={isPersonal}
            />
          ))}
          {!isPersonal && (
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/60">
              <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" isPersonal={isPersonal} />
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <NavItem 
            to={isPersonal ? '/personal-assist/settings' : '/settings'} 
            icon={<Settings size={20} />} 
            label="Settings" 
            isPersonal={isPersonal}
          />
        </div>
      </aside>

      {/* Mobile Collapsible Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
          
          <aside className={`relative flex w-64 max-w-xs flex-col h-full p-4 shadow-2xl animate-in slide-in-from-left duration-200 z-10 ${
            isPersonal ? 'bg-white text-slate-800' : 'bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex-1 pr-2">
                {renderModuleSwitcher()}
              </div>
              <button onClick={closeDrawer} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              {currentNavItems.map(item => (
                <NavItem 
                  key={item.to} 
                  to={item.to} 
                  icon={item.icon} 
                  label={item.label} 
                  onClick={closeDrawer} 
                  end={item.to === '/' || item.to === '/personal-assist'}
                  isPersonal={isPersonal}
                />
              ))}
              {!isPersonal && (
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60">
                  <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" onClick={closeDrawer} isPersonal={isPersonal} />
                </div>
              )}
            </nav>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <NavItem to={isPersonal ? '/personal-assist/settings' : '/settings'} icon={<Settings size={20} />} label="Settings" onClick={closeDrawer} isPersonal={isPersonal} />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col overflow-hidden relative ${
        isPersonal ? 'bg-white rounded-3xl border border-slate-200/80 shadow-lg' : ''
      }`}>
        {/* Top Navbar */}
        <header className={`h-16 flex items-center justify-between px-4 md:px-6 z-10 flex-shrink-0 ${
          isPersonal 
            ? 'bg-white border-b border-slate-150 text-slate-800' 
            : 'border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm'
        }`}>
          <div className="flex items-center space-x-3">
            <button onClick={toggleDrawer} className={`p-2 rounded-xl md:hidden border transition ${
              isPersonal 
                ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'
            }`}>
              <Menu size={20} />
            </button>
            
            <div className={`flex items-center rounded-full px-3.5 py-1.5 w-44 sm:w-64 md:w-80 text-xs border ${
              isPersonal
                ? 'bg-slate-100/80 border-slate-200/80 text-slate-800'
                : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-900 dark:text-white'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder={isPersonal ? "Search a task..." : "Search transactions..."} 
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 text-slate-900 dark:text-white font-medium"
              />
              {isPersonal && <span className="text-[10px] font-mono text-slate-400 ml-1 font-bold">⌘S</span>}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className={`p-2 rounded-full relative transition ${
              isPersonal ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full"></span>
            </button>
            <div 
              onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
              className={`flex items-center space-x-2 cursor-pointer p-1 pr-2.5 rounded-full transition ${
                isPersonal ? 'hover:bg-slate-100 bg-slate-50 border border-slate-200/80' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Click to logout"
            >
              <UserCircle className={`w-7 h-7 ${isPersonal ? 'text-teal-700' : 'text-slate-400'}`} />
              <span className="text-xs font-bold hidden sm:block">John Doe</span>
            </div>
          </div>
        </header>
        
        {/* Page Content Container */}
        <div className={`flex-1 overflow-auto ${isPersonal ? 'p-4 md:p-5' : 'p-4 md:p-6 pb-20 md:pb-6'}`}>
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>

        {/* Sticky Mobile Bottom Navigation */}
        <nav className={`fixed bottom-0 left-0 right-0 h-16 backdrop-blur-md border-t flex justify-around items-center z-40 md:hidden px-3 shadow-lg ${
          isPersonal ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-white/95 dark:bg-slate-950/95 border-slate-200 dark:border-slate-800'
        }`}>
          {isPersonal ? (
            <>
              <BottomTab to="/personal-assist" icon={<LayoutDashboard size={20} />} label="Dashboard" isPersonal={isPersonal} />
              <BottomTab to="/personal-assist/my-day" icon={<Sun size={20} />} label="My Day" isPersonal={isPersonal} />
              <BottomTab to="/personal-assist/calendar" icon={<CalendarDays size={20} />} label="Calendar" isPersonal={isPersonal} />
              <BottomTab to="/personal-assist/tasks" icon={<CheckSquare size={20} />} label="Tasks" isPersonal={isPersonal} />
              <BottomTab to="/personal-assist/habits" icon={<Flame size={20} />} label="Habits" isPersonal={isPersonal} />
            </>
          ) : (
            <>
              <BottomTab to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isPersonal={isPersonal} />
              <BottomTab to="/transactions" icon={<ReceiptText size={20} />} label="TXs" isPersonal={isPersonal} />
              <BottomTab to="/financial-records" icon={<Wallet size={20} />} label="Ledger" isPersonal={isPersonal} />
              <BottomTab to="/budgets" icon={<PieChart size={20} />} label="Budgets" isPersonal={isPersonal} />
              <BottomTab to="/analytics" icon={<LineChart size={20} />} label="Insights" isPersonal={isPersonal} />
            </>
          )}
        </nav>
      </main>
    </div>
  );
}

function NavItem({ 
  to, icon, label, onClick, end, isPersonal 
}: { 
  to: string; icon: ReactNode; label: string; onClick?: () => void; end?: boolean; isPersonal?: boolean 
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3.5 py-2 rounded-2xl transition-all duration-180 text-xs font-bold group ${
          isActive 
            ? isPersonal 
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 border-l-2 border-l-white' 
              : 'bg-primary text-white shadow-md shadow-primary/20 border-l-2 border-l-white' 
            : isPersonal
              ? 'text-slate-600 hover:bg-teal-50/60 hover:text-teal-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`
      }
    >
      <span className="transition-transform duration-180 ease-out group-hover:translate-x-0.5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function BottomTab({ to, icon, label, isPersonal }: { to: string; icon: ReactNode; label: string; isPersonal?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center space-y-0.5 w-14 h-12 rounded-xl transition-all duration-200 ${
          isActive 
            ? isPersonal ? 'text-teal-600 font-black scale-105' : 'text-primary font-black scale-105' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`
      }
    >
      {icon}
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </NavLink>
  );
}
