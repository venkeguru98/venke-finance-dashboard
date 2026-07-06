import { useState } from 'react';
import axios from 'axios';
import { Wallet, LogIn, UserPlus, ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const res = await axios.post(`${API}/auth/register`, { email, password });
        if (res.data.success) {
          // Auto login after registration
          const loginRes = await axios.post(`${API}/auth/login`, { email, password });
          onLogin(loginRes.data.token);
        }
      } else {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        onLogin(res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">VENKE Finance Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">Secure remote access log book & statistics</p>
          </div>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button 
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${!isRegister ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${isRegister ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Register
          </button>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/50 p-3.5 rounded-2xl flex items-start space-x-2 text-red-400 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-350">
          <div>
            <label className="block mb-1.5 text-slate-400">Email Address *</label>
            <input 
              type="email" required placeholder="name@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4.5 py-3.5 rounded-2xl border border-slate-850 bg-slate-900/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Password *</label>
            <input 
              type="password" required placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4.5 py-3.5 rounded-2xl border border-slate-850 bg-slate-900/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block mb-1.5 text-slate-400">Confirm Password *</label>
              <input 
                type="password" required placeholder="••••••••" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4.5 py-3.5 rounded-2xl border border-slate-850 bg-slate-900/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          )}

          <Button 
            variant="primary" type="submit" disabled={loading} 
            className="w-full py-3.5 rounded-2xl font-extrabold text-sm tracking-wide mt-2 hover:scale-[1.01] transition-transform"
          >
            {loading ? 'Authenticating...' : isRegister ? (
              <span className="flex items-center justify-center"><UserPlus className="w-4 h-4 mr-2" /> Create Isolated Account</span>
            ) : (
              <span className="flex items-center justify-center"><LogIn className="w-4 h-4 mr-2" /> Sign In to Dashboard</span>
            )}
          </Button>
        </form>

        <div className="pt-2 text-center text-[10px] text-slate-500 font-bold leading-relaxed">
          Isolated Data Privacy • AES-256 Hashed Credentials • JWT SSL Guard
        </div>
      </div>
    </div>
  );
}
