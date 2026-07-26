import { Settings, Sparkles } from 'lucide-react';

export default function PersonalSettings() {
  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 animate-in fade-in duration-300 max-w-3xl">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-teal-600" />
          <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Personal Assist Settings
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Workspace Preferences</h1>
        <p className="text-xs text-slate-500 font-medium">Configure category tags, notifications & personal planning preferences</p>
      </div>

      {/* Preferences Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" /> Personal Assist Configuration
        </h3>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <span className="font-bold text-slate-900 block">Default Daily Start Section</span>
              <span className="text-[11px] text-slate-500">Default section when adding new daily tasks</span>
            </div>
            <select className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none font-bold">
              <option value="morning">Morning Routine</option>
              <option value="afternoon">Afternoon Focus</option>
              <option value="evening">Evening Wind Down</option>
            </select>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <span className="font-bold text-slate-900 block">Auto-calculate Streak</span>
              <span className="text-[11px] text-slate-500">Include completed daily tasks in streak calculation</span>
            </div>
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          </div>
        </div>
      </div>

    </div>
  );
}
