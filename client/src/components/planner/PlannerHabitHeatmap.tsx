import React from 'react';
import { Calendar, Flame } from 'lucide-react';

interface PlannerHabitHeatmapProps {
  tasks: any[];
}

export default function PlannerHabitHeatmap({ tasks }: PlannerHabitHeatmapProps) {
  const today = new Date();
  const currentMonth = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Generate 28 days for dot matrix heatmap
  const daysInGrid = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (27 - i));
    const isoDate = d.toISOString().slice(0, 10);

    // Count completed tasks for this day
    const completedCount = tasks.filter(t => t.status === 'completed' && t.completed_at && t.completed_at.slice(0, 10) === isoDate).length;

    // Intensity levels (0 to 3)
    let level = 0;
    if (completedCount >= 4) level = 3;
    else if (completedCount >= 2) level = 2;
    else if (completedCount >= 1) level = 1;

    return {
      date: isoDate,
      dayNum: d.getDate(),
      isToday: isoDate === today.toISOString().slice(0, 10),
      level,
      completedCount
    };
  });

  // Calculate streak count
  let currentStreak = 0;
  for (let i = daysInGrid.length - 1; i >= 0; i--) {
    if (daysInGrid[i].completedCount > 0) {
      currentStreak++;
    } else if (!daysInGrid[i].isToday) {
      break;
    }
  }

  return (
    <div className="p-4 bg-[#090D16] border border-white/10 rounded-3xl shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">{currentMonth} Habit Matrix</span>
        </div>

        <div className="flex items-center space-x-1 text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          <Flame className="w-3.5 h-3.5 fill-amber-400" />
          <span>{currentStreak} Day Streak</span>
        </div>
      </div>

      {/* 4x7 Dot Matrix Heatmap */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <span key={idx} className="text-[9px] font-bold text-slate-500 text-center uppercase">
            {day}
          </span>
        ))}
        {daysInGrid.map((item) => {
          let dotBg = 'bg-slate-800/80 border-slate-700/50';
          if (item.level === 3) dotBg = 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] border-purple-400';
          else if (item.level === 2) dotBg = 'bg-indigo-500/80 border-indigo-400';
          else if (item.level === 1) dotBg = 'bg-purple-900/60 border-purple-700/50';

          return (
            <div
              key={item.date}
              title={`${item.date}: ${item.completedCount} rituals completed`}
              className={`h-6 rounded-lg border flex items-center justify-center text-[9px] font-mono font-bold transition-all ${dotBg} ${
                item.isToday ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#090D16]' : ''
              }`}
            >
              <span className={item.level > 0 ? 'text-white' : 'text-slate-500'}>
                {item.dayNum}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-white/5">
        <span>Less active</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-slate-800" />
          <span className="w-2 h-2 rounded bg-purple-900/60" />
          <span className="w-2 h-2 rounded bg-indigo-500/80" />
          <span className="w-2 h-2 rounded bg-purple-500" />
        </div>
        <span>More active</span>
      </div>
    </div>
  );
}
