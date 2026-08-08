import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ReceiptText, Upload, Settings, Bell, Search, UserCircle, 
  Wallet, Target, LineChart, CalendarDays, PieChart, Menu, X, CalendarRange
} from 'lucide-react';

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  return (
    <div className="flex h-screen transition-colors overflow-hidden font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      
      {/* Desktop Sidebar */}
      <aside className="w-52 md:w-56 flex flex-col hidden md:flex flex-shrink-0 transition-all border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary text-white shadow-md shadow-primary/30">
              <Wallet size={22} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                VENKE FINANCE
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                Track • Save • Grow
              </span>
            </div>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {financeNavItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} end={item.to === '/'} />
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60">
            <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" />
          </div>
        </nav>

        {/* Footer Settings */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm transition-opacity" onClick={closeDrawer}>
          <aside className="w-64 h-full bg-white dark:bg-slate-950 p-4 flex flex-col shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-extrabold text-sm tracking-tight">VENKE FINANCE</span>
              </div>
              <button onClick={closeDrawer} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {financeNavItems.map((item) => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} onClick={closeDrawer} end={item.to === '/'} />
              ))}
              
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60">
                <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" onClick={closeDrawer} />
              </div>
            </nav>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" onClick={closeDrawer} />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 z-10 flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <button onClick={toggleDrawer} className="p-2 rounded-xl md:hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400">
              <Menu size={20} />
            </button>
            
            <div className="flex items-center rounded-full px-3.5 py-1.5 w-44 sm:w-64 md:w-80 text-xs border bg-slate-100 dark:bg-slate-800 border-transparent text-slate-900 dark:text-white">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full relative transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>
            <div 
              onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
              className="flex items-center space-x-2 cursor-pointer p-1 pr-2.5 rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Click to logout"
            >
              <UserCircle className="w-7 h-7 text-slate-400" />
              <span className="text-xs font-bold hidden sm:block">Venke</span>
            </div>
          </div>
        </header>
        
        {/* Page Content Container */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>

        {/* Sticky Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 backdrop-blur-md border-t flex justify-around items-center z-40 md:hidden px-3 shadow-lg bg-white/95 dark:bg-slate-950/95 border-slate-200 dark:border-slate-800">
          <BottomTab to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <BottomTab to="/transactions" icon={<ReceiptText size={20} />} label="TXs" />
          <BottomTab to="/financial-records" icon={<Wallet size={20} />} label="Ledger" />
          <BottomTab to="/budgets" icon={<PieChart size={20} />} label="Budgets" />
          <BottomTab to="/analytics" icon={<LineChart size={20} />} label="Insights" />
        </nav>
      </main>
    </div>
  );
}

function NavItem({ 
  to, icon, label, onClick, end 
}: { 
  to: string; icon: ReactNode; label: string; onClick?: () => void; end?: boolean 
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3.5 py-2 rounded-2xl transition-all duration-180 text-xs font-bold group ${
          isActive 
            ? 'bg-primary text-white shadow-md shadow-primary/20 border-l-2 border-l-white' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`
      }
    >
      <span className="transition-transform duration-180 ease-out group-hover:translate-x-0.5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function BottomTab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center space-y-0.5 w-14 h-12 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'text-primary font-black scale-105' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`
      }
    >
      {icon}
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </NavLink>
  );
}
