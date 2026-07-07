import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { WifiOff, RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Analytics from './pages/Analytics';
import CalendarView from './pages/Calendar';
import Settings from './pages/Settings';
import FinancialRecords from './pages/FinancialRecords';
import Login from './pages/Login';
import Bills from './pages/Bills';

// Configure Axios globally to include JWT Bearer Token on all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Configure Axios to automatically catch 401 Unauthorized errors and wipe token
axios.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    window.location.reload();
  }
  return Promise.reject(error);
});

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={(t) => { localStorage.setItem('token', t); setToken(t); }} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <>
      {/* ── Offline Banner ──────────────────────────────────────── */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-3 bg-amber-500 text-slate-900 text-sm font-bold shadow-xl">
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>You are offline. Check your internet connection.</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto flex items-center gap-1.5 bg-slate-900/20 hover:bg-slate-900/40 px-3 py-1 rounded-full text-xs font-extrabold transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/financial-records" element={<FinancialRecords />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
    </>
  );
}

export default App;
