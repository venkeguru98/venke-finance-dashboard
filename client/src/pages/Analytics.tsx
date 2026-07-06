import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { RefreshCw, ShieldCheck, HeartPulse, Award } from 'lucide-react';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const COLORS = ['#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#F97316'];

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ income: 0, expenses: 0, balance: 0, savingsRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [chartsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/analytics/charts`),
        axios.get(`${API}/analytics/summary`),
      ]);
      setMonthlyData(chartsRes.data.monthly || []);
      setCategoryData(chartsRes.data.categories || []);
      setSummary(summaryRes.data);
    } catch {
      setError('Backend not connected. Please make sure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const netSavings = monthlyData.map(d => ({ ...d, net: d.income - d.expense }));
  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? ((totalNet / totalIncome) * 100) : 0;

  // 50/30/20 Rule Calculations
  // Needs: Rent, Bills, Utilities, Medical, Insurance, EMI
  // Wants: Food, Travel, Shopping, Entertainment, Miscellaneous
  // Savings: Investment, Savings, SIP
  const getBudgetRuleBreakdown = () => {
    let needs = 0;
    let wants = 0;
    let savings = summary.income * (summary.savingsRate / 100);

    categoryData.forEach(cat => {
      const name = cat.name.toLowerCase();
      if (name.includes('rent') || name.includes('bill') || name.includes('utility') || name.includes('medical') || name.includes('insurance') || name.includes('emi') || name.includes('fuel')) {
        needs += cat.value;
      } else {
        wants += cat.value;
      }
    });

    const totalAllocated = needs + wants + savings;
    if (totalAllocated === 0) return { needsPct: 0, wantsPct: 0, savingsPct: 0 };

    return {
      needsPct: totalAllocated > 0 ? (needs / totalAllocated) * 100 : 0,
      wantsPct: totalAllocated > 0 ? (wants / totalAllocated) * 100 : 0,
      savingsPct: totalAllocated > 0 ? (savings / totalAllocated) * 100 : 0,
      needs,
      wants,
      savings
    };
  };

  const rule = getBudgetRuleBreakdown();

  // Financial Health Score
  const getFinancialHealthScore = () => {
    let score = 50; // Base score
    
    // Savings rate contributions
    if (avgSavingsRate >= 30) score += 25;
    else if (avgSavingsRate >= 20) score += 15;
    else if (avgSavingsRate >= 10) score += 5;
    else score -= 10;

    // Debt & Needs check
    if (rule.needsPct > 60) score -= 15;
    else if (rule.needsPct < 50) score += 10;

    // Wants check
    if (rule.wantsPct > 40) score -= 10;
    else score += 5;

    return Math.min(Math.max(score, 10), 100);
  };

  const healthScore = getFinancialHealthScore();

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
      Loading analytics...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <p className="text-red-500 font-semibold">{error}</p>
      <button onClick={fetchData} className="flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-700 transition">
        <RefreshCw className="w-4 h-4 mr-2" /> Retry
      </button>
    </div>
  );

  if (monthlyData.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="text-6xl">📊</div>
      <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">No data to analyze yet</p>
      <p className="text-slate-500 text-sm">Add some transactions first, then come back to see your analytics.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-slate-500 dark:text-slate-400">Deep dive into your financial patterns and trends.</p>
        </div>
        <button onClick={fetchData} className="flex items-center space-x-2 text-sm text-slate-500 hover:text-primary transition bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
          <RefreshCw className="w-4 h-4" /><span>Sync</span>
        </button>
      </div>

      {/* Financial Health Score & 50/30/20 Rule Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center">
              <HeartPulse className="w-5 h-5 text-red-500 mr-2" />
              Financial Health Score
            </h3>
            <p className="text-xs text-slate-500">Based on your savings rate and category distributions</p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
              <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '3s' }} />
              <div className="text-center">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{healthScore}</span>
                <span className="text-xs text-slate-400 block font-semibold">/ 100</span>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              {healthScore >= 80 ? '👑 Excellent Financial Health' : healthScore >= 60 ? '👍 Stable Financial Position' : '⚠️ Action Needed: High Expenses'}
            </p>
          </div>

          <div className="text-xs text-slate-500 text-center border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-center space-x-1">
            <Award className="w-4 h-4 text-warning" />
            <span>Top percentile in savings optimization</span>
          </div>
        </div>

        {/* 50/30/20 Rule */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <ShieldCheck className="w-5 h-5 text-primary mr-2" />
              50/30/20 Budgeting Rule Analysis
            </h3>
            <p className="text-xs text-slate-500">Standard targets: 50% Needs, 30% Wants, 20% Savings</p>
          </div>

          <div className="space-y-4 py-2">
            {/* Needs */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Needs (Target: 50%)</span>
                <span>{rule.needsPct.toFixed(0)}% (₹{(rule.needs || 0).toLocaleString('en-IN')})</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-red-400`} style={{ width: `${Math.min(rule.needsPct, 100)}%` }} />
              </div>
            </div>

            {/* Wants */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Wants (Target: 30%)</span>
                <span>{rule.wantsPct.toFixed(0)}% (₹{(rule.wants || 0).toLocaleString('en-IN')})</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-yellow-500`} style={{ width: `${Math.min(rule.wantsPct, 100)}%` }} />
              </div>
            </div>

            {/* Savings */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Savings & Investment (Target: 20%)</span>
                <span>{rule.savingsPct.toFixed(0)}% (₹{(rule.savings || 0).toLocaleString('en-IN')})</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-green-500`} style={{ width: `${Math.min(rule.savingsPct, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-start space-x-2">
            <InfoIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {rule.needsPct > 55 ? 'Your Needs are slightly high. Try reviewing fixed subscription costs.' : 'Excellent allocations! Your budget rule targets are exceptionally balanced.'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Monthly Cash Flow breakdown</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                cursor={{ fill: '#334155', opacity: 0.1 }}
              />
              <Legend wrapperStyle={{ paddingTop: '16px' }} />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Savings Trend Line */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Net Savings Progression</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netSavings} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Net']}
              />
              <Line type="monotone" dataKey="net" name="Net Savings" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Top Spending Categories</h3>
          {categoryData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400">No expense data</div>
          ) : (
            <div className="space-y-4">
              {categoryData.slice(0, 5).map((cat, i) => {
                const maxVal = categoryData[0]?.value || 1;
                const pct = (cat.value / maxVal) * 100;
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{Number(cat.value).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Category Distribution</h3>
          {categoryData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400">No expense data</div>
          ) : (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                      {categoryData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categoryData.slice(0, 6).map((cat, i) => (
                  <div key={cat.name} className="flex items-center space-x-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-slate-600 dark:text-slate-400 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
