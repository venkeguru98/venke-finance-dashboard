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

  const navItems = [
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col hidden md:flex flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <Wallet className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-md tracking-tight">VENKE finance</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60">
            <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" />
          </div>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Mobile Collapsible Navigation Drawer Slide-in Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
          
          {/* Drawer body */}
          <aside className="relative flex w-64 max-w-xs flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full p-5 shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            <div className="flex items-center justify-between pb-6 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center">
                <Wallet className="w-6 h-6 text-primary mr-2" />
                <span className="font-bold text-sm">VENKE finance</span>
              </div>
              <button onClick={closeDrawer} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              {navItems.map(item => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} onClick={closeDrawer} />
              ))}
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60">
                <NavItem to="/import" icon={<Upload size={20} />} label="Import Data" onClick={closeDrawer} />
              </div>
            </nav>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" onClick={closeDrawer} />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 z-10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {/* Hamburger menu trigger */}
            <button onClick={toggleDrawer} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 md:hidden hover:bg-slate-50 transition">
              <Menu size={20} />
            </button>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-3.5 py-1.5 w-44 sm:w-64 md:w-96 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div 
              onClick={() => { if(window.confirm('Are you sure you want to sign out?')) onLogout?.(); }}
              className="flex items-center space-x-2 cursor-pointer p-1 pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Click to logout"
            >
              <UserCircle className="w-7 h-7 text-slate-400" />
              <span className="text-xs font-semibold hidden sm:block">VENKE GURU SUDHAKAR</span>
            </div>
          </div>
        </header>
        
        {/* Page Content Container */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>

        {/* Sticky Mobile Bottom Navigation (Visible on mobile/tablet screens only) */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-40 md:hidden px-3 shadow-lg">
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

function NavItem({ to, icon, label, onClick }: { to: string; icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold ${
          isActive 
            ? 'bg-primary text-white shadow-md shadow-primary/20' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function BottomTab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center space-y-0.5 w-16 h-12 rounded-xl transition-all duration-200 ${
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
