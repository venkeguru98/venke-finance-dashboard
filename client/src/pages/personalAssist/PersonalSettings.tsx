import { Settings, Sparkles } from 'lucide-react';

export default function PersonalSettings() {
  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-300 max-w-3xl">
      
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
            Personal Assist Settings
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">Workspace Preferences</h1>
        <p className="text-xs text-slate-400 font-medium">Configure category tags, notifications & personal planning preferences</p>
      </div>

      {/* Preferences Section */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 text-xs">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" /> Personal Assist Configuration
        </h3>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-850">
            <div>
              <span className="font-bold text-white block">Default Daily Start Section</span>
              <span className="text-[11px] text-slate-400">Default section when adding new daily tasks</span>
            </div>
            <select className="bg-slate-800 text-white rounded-xl px-3 py-1.5 outline-none font-bold">
              <option value="morning">Morning Routine</option>
              <option value="afternoon">Afternoon Focus</option>
              <option value="evening">Evening Wind Down</option>
            </select>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-850">
            <div>
              <span className="font-bold text-white block">Auto-calculate Streak</span>
              <span className="text-[11px] text-slate-400">Include completed daily tasks in streak calculation</span>
            </div>
            <input type="checkbox" defaultChecked className="rounded bg-slate-800 text-indigo-500" />
          </div>
        </div>
      </div>

    </div>
  );
}
