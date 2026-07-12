import { useEffect, useState, lazy, Suspense } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { 
  Shield, Landmark, Bell, AlertTriangle, ChevronRight, ShieldAlert
} from 'lucide-react';

// Lazy load sub-modules for extreme performance
const LicModule = lazy(() => import('../components/records/LicModule'));
const GoldModule = lazy(() => import('../components/records/GoldModule'));
const ChitModule = lazy(() => import('../components/records/ChitModule'));
const SavingsModule = lazy(() => import('../components/records/SavingsModule'));
const DebtModule = lazy(() => import('../components/records/DebtModule'));

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function FinancialRecords() {
  const [subView, setSubView] = useState<null | 'lic' | 'gold' | 'chit' | 'savings' | 'debt'>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: {
      activeLicPolicies: 0,
      licPremiumDue: 0,
      digitalGoldInvested: 0,
      runningChitFunds: 0,
      upcomingChitPayments: 0,
      offlineSavingsBalance: 0,
      outstandingDebt: 0,
      receivableAmount: 0
    },
    reminders: [],
    charts: {
      licYearly: [],
      goldYearly: [],
      chitProgress: [],
      savingsBalances: []
    },
    timeline: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/dashboard`);
      setDashboardData(res.data || {
        stats: {
          activeLicPolicies: 0,
          licPremiumDue: 0,
          digitalGoldInvested: 0,
          runningChitFunds: 0,
          upcomingChitPayments: 0,
          offlineSavingsBalance: 0,
          outstandingDebt: 0,
          receivableAmount: 0
        },
        reminders: [],
        charts: {
          licYearly: [],
          goldYearly: [],
          chitProgress: [],
          savingsBalances: []
        },
        timeline: []
      });
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subView === null) {
      fetchDashboardData();
    }
  }, [subView]);

  if (subView !== null) {
    return (
      <Suspense fallback={<div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider">Loading component...</div>}>
        {subView === 'lic' && <LicModule onBack={() => setSubView(null)} />}
        {subView === 'gold' && <GoldModule onBack={() => setSubView(null)} />}
        {subView === 'chit' && <ChitModule onBack={() => setSubView(null)} />}
        {subView === 'savings' && <SavingsModule onBack={() => setSubView(null)} />}
        {subView === 'debt' && <DebtModule onBack={() => setSubView(null)} />}
      </Suspense>
    );
  }

  const { stats, reminders, charts, timeline } = dashboardData;

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-350">
      {/* HUB HEADER */}
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Financial Records Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Manage long-term assets, liabilities, investments, policies, and offline account registries.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">Loading Financial Records Hub...</div>
      ) : (
        <>
          {/* SMART REMINDERS / NOTIFICATION CARDS */}
          {reminders.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> Smart Alerts & Reminders ({reminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reminders.map((rem: string, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-950/40 border border-amber-500/20 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-300 shadow-lg shadow-amber-500/2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="font-bold leading-normal">{rem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK SUMMARY CARDS */}
          <div className="space-y-2.5">
            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quick Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Active LIC</p>
                <p className="text-sm font-black text-white">{stats.activeLicPolicies}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Premium Due</p>
                <p className="text-sm font-black text-cyan-400">₹{stats.licPremiumDue.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Digital Gold</p>
                <p className="text-sm font-black text-amber-500">₹{stats.digitalGoldInvested.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Running Chits</p>
                <p className="text-sm font-black text-white">{stats.runningChitFunds}</p>
              </div>
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Offline Balance</p>
                <p className="text-sm font-black text-blue-400">₹{stats.offlineSavingsBalance.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Outstanding Debt</p>
                <p className="text-sm font-black text-red-400">₹{stats.outstandingDebt.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3.5 bg-green-500/5 border border-green-500/10 rounded-2xl space-y-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Receivable</p>
                <p className="text-sm font-black text-green-400 font-mono">₹{stats.receivableAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* OVERVIEW SECTIONS */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* FINANCIAL ASSETS */}
            <div className="space-y-3 bg-slate-950/20 border border-slate-900 p-5 rounded-3xl">
              <h2 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                <Shield className="w-4 h-4 text-cyan-400" /> Financial Assets
              </h2>
              <div className="space-y-3">
                <div 
                  onClick={() => setSubView('lic')}
                  className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-cyan-500/30 hover:bg-slate-900/40 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors">LIC Policies</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Track policies, monthly premium schedules, and maturity countdowns.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
                </div>

                <div 
                  onClick={() => setSubView('gold')}
                  className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-amber-500/30 hover:bg-slate-900/40 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-amber-500 transition-colors">Digital Gold</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Monitor gold holdings, purchases history logs, and growth charts.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
                </div>

                <div 
                  onClick={() => setSubView('savings')}
                  className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-blue-500/30 hover:bg-slate-900/40 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-blue-400 transition-colors">Offline Accounts</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manage bank account balances, offline assets, and cash logs.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>

            {/* LIABILITIES */}
            <div className="space-y-3 bg-slate-950/20 border border-slate-900 p-5 rounded-3xl">
              <h2 className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Liabilities
              </h2>
              <div className="space-y-3">
                <div 
                  onClick={() => setSubView('debt')}
                  className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-purple-500/30 hover:bg-slate-900/40 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">Debt Manager</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Register loans, borrowed totals, outstanding receivable/payable sums.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>

            {/* INVESTMENTS */}
            <div className="space-y-3 bg-slate-950/20 border border-slate-900 p-5 rounded-3xl">
              <h2 className="text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                <Landmark className="w-4 h-4 text-purple-400" /> Investments
              </h2>
              <div className="space-y-3">
                <div 
                  onClick={() => setSubView('chit')}
                  className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-purple-500/30 hover:bg-slate-900/40 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">Chit Funds</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manage chit groups, flexible installments, and dividend schedules.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: LIC & Gold Growth */}
            <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Yearly LIC & Gold Contributions</h3>
              <div className="h-56">
                {charts.licYearly.length === 0 && charts.goldYearly.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No contribution records to plot.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.licYearly.map((l: any) => {
                      const goldMatch = charts.goldYearly.find((g: any) => g.year === l.year);
                      return {
                        year: String(l.year),
                        LIC: l.total,
                        Gold: goldMatch ? goldMatch.total : 0
                      };
                    })}>
                      <XAxis dataKey="year" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Bar dataKey="LIC" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Gold" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Savings Share Pie */}
            <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Offline Accounts Balance Share</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                <div className="h-56 sm:col-span-2">
                  {charts.savingsBalances.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No accounts found.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.savingsBalances}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="balance"
                        >
                          {charts.savingsBalances.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {charts.savingsBalances.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-[10px] p-1.5 bg-slate-900/40 rounded-xl">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }} />
                      <div className="truncate flex-1">
                        <p className="font-bold text-white truncate">{entry.name}</p>
                        <p className="font-bold text-[9px] text-slate-400">₹{entry.balance.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE AND RECENT ACTIVITY SECTION */}
          <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Recent Hub Activities</h3>
            {timeline.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">No recent activities found in the ledger.</p>
            ) : (
              <div className="space-y-3.5">
                {timeline.map((item: any, idx: number) => {
                  const isLic = item.type === 'lic';
                  const isGold = item.type === 'gold';
                  const isChit = item.type === 'chit';

                  const badgeColor = 
                    isLic ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    isGold ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    isChit ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20';

                  return (
                    <div key={idx} className="p-3.5 bg-slate-900/40 border border-slate-900 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-3 truncate">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider shrink-0 ${badgeColor}`}>
                          {item.type}
                        </span>
                        <div className="truncate">
                          <p className="font-black text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-white">₹{item.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
