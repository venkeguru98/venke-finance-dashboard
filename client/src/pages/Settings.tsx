import { useState, useEffect } from 'react';
import { Moon, Sun, User, Palette, Database, Trash2, Download, Plus, X, ShieldAlert, Sparkles, FolderSync } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/ui/Button';

// Dynamic API URL for developer server (5173) vs production served assets
const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

type Category = { id: number; name: string; color: string; type: string; user_id: number | null };

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6',
  '#84CC16', '#22C55E', '#0EA5E9', '#A855F7', '#F43F5E'
];

export default function Settings() {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#3B82F6' });
  const [txCount, setTxCount] = useState(0);

  // System Status State
  const [systemStatus, setSystemStatus] = useState({
    appVersion: '2.1.0',
    serverStatus: 'Offline',
    databaseStatus: 'Disconnected',
    databaseSize: '0 KB',
    localIp: '127.0.0.1',
    serverPort: 5000,
    lastBackupDate: 'Never'
  });
  const [backups, setBackups] = useState<any[]>([]);
  const [restoring, setRestoring] = useState(false);

  const fetchCategories = () => {
    axios.get(`${API}/categories`).then(res => setCategories(res.data)).catch(() => {});
  };

  const fetchSystemStatus = () => {
    axios.get(`${API}/system/status`)
      .then(res => setSystemStatus(res.data))
      .catch(() => console.warn('Could not connect to system status API'));
    
    axios.get(`${API}/system/backups`)
      .then(res => setBackups(res.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCategories();
    axios.get(`${API}/transactions`).then(res => setTxCount(res.data.length)).catch(() => {});
    fetchSystemStatus();
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post(`${API}/categories`, catForm).catch(() => {});
    fetchCategories();
    setIsAddCatOpen(false);
    setCatForm({ name: '', type: 'expense', color: '#3B82F6' });
  };

  const deleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category? Existing transactions won\'t be affected.')) return;
    await axios.delete(`${API}/categories/${id}`).catch(() => {});
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const clearAllData = async () => {
    if (!window.confirm('⚠️ This will delete ALL your transactions. This cannot be undone. Are you sure?')) return;
    if (!window.confirm('FINAL WARNING: This action is irreversible. Proceed?')) return;
    alert('Please use the database directly to clear all data. This is a safety feature.');
  };

  const exportCSV = () => {
    axios.get(`${API}/transactions`).then(res => {
      const tx = res.data;
      if (tx.length === 0) { alert('No transactions to export'); return; }
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Notes'];
      const rows = tx.map((t: any) => [t.date, t.type, t.category_name, t.amount, t.payment_method, `"${(t.notes || '').replace(/"/g, '""')}"`]);
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finspace-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => alert('Failed to export. Check if the backend is running.'));
  };

  // Backups Action Handlers
  const handleCreateBackup = async () => {
    try {
      await axios.post(`${API}/system/backup`);
      alert('Backup database snapshot created successfully!');
      fetchSystemStatus();
    } catch (_) {
      alert('Failed to trigger database backup.');
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`⚠️ Restore data from backup: ${filename}? This will overwrite your current SQLite file.`)) return;
    setRestoring(true);
    try {
      await axios.post(`${API}/system/restore`, { filename });
      alert('Database restore complete! Refreshing ledger data...');
      window.location.reload();
    } catch (_) {
      alert('Failed to restore backup.');
    } finally {
      setRestoring(false);
    }
  };

  const handleExportDB = () => {
    window.open(`${API}/system/db-export`, '_blank');
  };

  const userCategories = categories.filter(c => c.user_id !== null);
  const defaultCategories = categories.filter(c => c.user_id === null);

  // Computed Local App URL for QR code scan
  const mobileAccessUrl = `http://${systemStatus.localIp}:${systemStatus.serverPort}`;

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Customize your VENKE Finance experience and configure local deployment.</p>
      </div>

      {/* Application & Server Settings (MoM enhancements) */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white">
            <Sparkles className="w-5 h-5 mr-2 text-primary" /> Application Settings & Networking
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">App Version</span>
                <span className="text-slate-900 dark:text-white font-bold">{systemStatus.appVersion}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Server Status</span>
                <span className="text-green-500 font-extrabold uppercase">{systemStatus.serverStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Database Status</span>
                <span className="text-primary font-extrabold uppercase">{systemStatus.databaseStatus} ({systemStatus.databaseSize})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Last Backup Date</span>
                <span className="text-slate-900 dark:text-white">{systemStatus.lastBackupDate}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase">Local Access Details</span>
              <p className="text-slate-850 dark:text-slate-250">
                To connect from your mobile phone or tablet on the same Wi-Fi, open this address:
              </p>
              <a href={mobileAccessUrl} target="_blank" rel="noreferrer" className="text-primary font-black underline text-sm block">
                {mobileAccessUrl}
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-850 text-center space-y-3">
            <QRCodeSVG value={mobileAccessUrl} size={110} level="H" includeMargin={true} className="rounded-lg border border-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Wi-Fi Scan QR</span>
              <span className="text-[9px] text-slate-500">Scan to open on mobile phone browser</span>
            </div>
          </div>
        </div>
      </section>

      {/* Database Backups System */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white">
            <Database className="w-5 h-5 mr-2 text-primary" /> Database Snapshots & Recovery
          </h2>
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={handleCreateBackup}>
              Backup Now
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportDB}>
              Export SQLite file
            </Button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {restoring && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 text-xs font-black flex items-center space-x-2 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
              <span>Restoring database... Please do not close settings.</span>
            </div>
          )}

          {backups.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No historical database backups found in local backups directory. Click "Backup Now" to create one.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
              {backups.map(b => (
                <div key={b.filename} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{b.filename}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{b.date} · {b.size}</span>
                  </div>
                  <button
                    disabled={restoring}
                    onClick={() => handleRestoreBackup(b.filename)}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-black rounded-lg transition"
                  >
                    <FolderSync className="w-3.5 h-3.5" /> <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white"><Palette className="w-5 h-5 mr-2 text-primary" />Appearance</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-slate-500">Switch between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-14 h-7 rounded-full relative transition-colors ${isDark ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${isDark ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {isDark ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white"><User className="w-5 h-5 mr-2 text-primary" />Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-2xl font-bold">V</div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">VENKE GURU SUDHAKAR</p>
              <p className="text-sm text-slate-500">Local user · {txCount} transactions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Management */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white"><Palette className="w-5 h-5 mr-2 text-primary" />Categories</h2>
          <Button variant="primary" size="sm" onClick={() => setIsAddCatOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
          </Button>
        </div>
        <div className="p-6 space-y-4">
          {/* User Categories */}
          {userCategories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Custom Categories</p>
              <div className="space-y-2">
                {userCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 group">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                      <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : c.type === 'savings' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>{c.type}</span>
                    </div>
                    <button onClick={() => deleteCategory(c.id)} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Categories */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Default Categories</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {defaultCategories.map(c => (
                <div key={c.id} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }}></div>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{c.name}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-black">{c.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h2 className="font-bold flex items-center text-slate-900 dark:text-white"><Database className="w-5 h-5 mr-2 text-primary" />Legacy Data Options</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Export Transactions</p>
              <p className="text-sm text-slate-500">Download all transactions as a CSV file</p>
            </div>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">Clear All Data</p>
                <p className="text-sm text-slate-500">Permanently delete all transactions</p>
              </div>
              <Button variant="danger" size="sm" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" /> Clear Data
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Custom Category</h3>
              <button onClick={() => setIsAddCatOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category Name *</label>
                <input
                  type="text" required placeholder="e.g. Gym, Subscriptions, Pet Care"
                  value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['expense', 'income', 'savings'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setCatForm(f => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-sm font-semibold capitalize border-2 transition ${
                        catForm.type === t
                          ? t === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : t === 'expense' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button key={c} type="button" onClick={() => setCatForm(f => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full transition-all border-2 ${catForm.color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsAddCatOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Add Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
