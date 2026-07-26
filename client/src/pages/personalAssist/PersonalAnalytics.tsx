import { useEffect, useState } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function PersonalAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${API}/personal/dashboard`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAnalytics();
  }, []);

  const todayStats = data?.todayStats || { streak: 0, completed: 0, total: 0 };
  const monthlyStats = data?.monthlyStats || { total: 0, completed: 0, pending: 0, overdue: 0, completionPct: 0 };
  const goalStats = data?.goalStats || { active: 0, completed: 0, avgProgress: 0 };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-2">
          <LineChartIcon className="w-5 h-5 text-teal-600" />
          <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Productivity Analytics
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Productivity Insights</h1>
        <p className="text-xs text-slate-500 font-medium">Track your task completion velocity, habit streaks and long-term goal progression</p>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Completion Rate</span>
          <div className="text-2xl font-black font-mono text-teal-600">{monthlyStats.completionPct}%</div>
          <span className="text-[10px] text-slate-500 font-bold">{monthlyStats.completed} of {monthlyStats.total} Tasks Completed</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Current Streak</span>
          <div className="text-2xl font-black font-mono text-amber-500">{todayStats.streak} Days</div>
          <span className="text-[10px] text-slate-500 font-bold">Active Daily Routine</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Goal Velocity</span>
          <div className="text-2xl font-black font-mono text-indigo-600">{goalStats.avgProgress}%</div>
          <span className="text-[10px] text-slate-500 font-bold">{goalStats.active} Active Goals</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Overdue Index</span>
          <div className="text-2xl font-black font-mono text-red-600">{monthlyStats.overdue}</div>
          <span className="text-[10px] text-slate-500 font-bold">Action Items Pending</span>
        </div>

      </div>

    </div>
  );
}
