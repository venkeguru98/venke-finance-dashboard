import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { 
  Shield, Coins, Landmark, Wallet, Bell, AlertTriangle, ChevronRight
} from 'lucide-react';

// Sub modules
import LicModule from '../components/records/LicModule';
import GoldModule from '../components/records/GoldModule';
import ChitModule from '../components/records/ChitModule';
import SavingsModule from '../components/records/SavingsModule';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function FinancialRecords() {
  const [subView, setSubView] = useState<null | 'lic' | 'gold' | 'chit' | 'savings'>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: {
      activeLicPolicies: 0,
      licPremiumDue: 0,
      digitalGoldInvested: 0,
      runningChitFunds: 0,
      upcomingChitPayments: 0,
      offlineSavingsBalance: 0
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
          offlineSavingsBalance: 0
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

  if (subView === 'lic') {
    return <LicModule onBack={() => setSubView(null)} />;
  }
  if (subView === 'gold') {
    return <GoldModule onBack={() => setSubView(null)} />;
  }
  if (subView === 'chit') {
    return <ChitModule onBack={() => setSubView(null)} />;
  }
  if (subView === 'savings') {
    return <SavingsModule onBack={() => setSubView(null)} />;
  }

  const { stats, reminders, charts, timeline } = dashboardData;

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-350">
      {/* HUB HEADER */}
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-xl font-bold text-white">Financial Records</h1>
        <p className="text-xs text-slate-400 mt-1">Manage long-term investments, savings, LIC policies, chit funds and offline account balances.</p>
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

          {/* SUMMARY CARDS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Active LIC Policies</p>
              <p className="text-lg font-black text-white">{stats.activeLicPolicies}</p>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">LIC Premium Due</p>
              <p className="text-lg font-black text-cyan-400">₹{stats.licPremiumDue.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">DigiGold Invested</p>
              <p className="text-lg font-black text-amber-500">₹{stats.digitalGoldInvested.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Running Chits</p>
              <p className="text-lg font-black text-white">{stats.runningChitFunds}</p>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Upcoming Chit Payments</p>
              <p className="text-lg font-black text-purple-400">₹{stats.upcomingChitPayments.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Offline Savings Balance</p>
              <p className="text-lg font-black text-blue-400">₹{stats.offlineSavingsBalance.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* THE 4 MODULAR HUB NAVIGATION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5.5">
            <div 
              onClick={() => setSubView('lic')}
              className="group p-5.5 bg-slate-950/40 border border-slate-850 hover:border-cyan-500/30 hover:bg-slate-900/40 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-all">
                  <Shield className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">LIC Policies</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Track multiple policies, monthly premiums, paid progress counts, and maturity countdowns.</p>
              </div>
            </div>

            <div 
              onClick={() => setSubView('gold')}
              className="group p-5.5 bg-slate-950/40 border border-slate-850 hover:border-amber-500/30 hover:bg-slate-900/40 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:scale-105 transition-all">
                  <Coins className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white group-hover:text-amber-500 transition-colors">Digital Gold</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Monitor digital gold accounts, record transactions, and analyze growth graphs.</p>
              </div>
            </div>

            <div 
              onClick={() => setSubView('chit')}
              className="group p-5.5 bg-slate-950/40 border border-slate-850 hover:border-purple-500/30 hover:bg-slate-900/40 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-all">
                  <Landmark className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">Chit Funds</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Manage Cheetu group cycles, adjust flexible dividends, and log monthly payment timelines.</p>
              </div>
            </div>

            <div 
              onClick={() => setSubView('savings')}
              className="group p-5.5 bg-slate-950/40 border border-slate-850 hover:border-blue-500/30 hover:bg-slate-900/40 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:scale-105 transition-all">
                  <Wallet className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">Offline Accounts</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Replaces spreadsheets like Canara or TMB. Track offline assets, cash holdings, and transfers.</p>
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
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
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
