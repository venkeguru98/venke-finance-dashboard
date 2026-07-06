import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type DayData = {
  expense: number;
  income: number;
  isHigh: boolean;
  details: string[];
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayData, setDayData] = useState<Record<number, DayData>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDay = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchCalendarData = () => {
    axios.get(`${API}/analytics/calendar?month=${monthKey}`)
      .then(res => setDayData(res.data))
      .catch(() => setDayData({}));
  };

  useEffect(() => { fetchCalendarData(); }, [monthKey]);

  const goPrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const goNext = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const emptyDays = Array.from({ length: startingDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Monthly totals
  const monthExpense = Object.values(dayData).reduce((s, d) => s + (d.expense || 0), 0);
  const monthIncome = Object.values(dayData).reduce((s, d) => s + (d.income || 0), 0);
  const daysWithData = Object.keys(dayData).length;

  const selectedData = selectedDay ? dayData[selectedDay] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <p className="text-slate-500 dark:text-slate-400">View your daily income and spending at a glance.</p>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Month Expenses</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">₹{monthExpense.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Month Income</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">₹{monthIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Active Days</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{daysWithData} / {daysInMonth}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{MONTH_NAMES[month]} {year}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={goToday} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition">Today</button>
              <button onClick={goPrev} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition">
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button onClick={goNext} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition">
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {emptyDays.map(i => (
              <div key={`e-${i}`} className="min-h-[90px] p-1.5 border-r border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30"></div>
            ))}
            {days.map(day => {
              const data = dayData[day];
              const isToday = isCurrentMonth && today.getDate() === day;
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`min-h-[90px] p-1.5 border-r border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-all ${
                    isSelected ? 'bg-primary/5 ring-2 ring-primary ring-inset' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <span className={`inline-flex w-7 h-7 items-center justify-center text-sm font-medium rounded-full ${
                    isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>{day}</span>

                  {data && (
                    <div className="mt-1 space-y-0.5">
                      {data.income > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold truncate">
                          +₹{data.income.toLocaleString('en-IN')}
                        </div>
                      )}
                      {data.expense > 0 && (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded font-semibold truncate ${
                          data.isHigh ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          -₹{data.expense.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {selectedDay ? `${MONTH_NAMES[month]} ${selectedDay}` : 'Day Details'}
          </h3>

          {!selectedDay ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <CalendarIcon className="w-12 h-12 opacity-30" />
              <p className="text-sm">Click a day to see details</p>
            </div>
          ) : !selectedData ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <p className="text-3xl">😴</p>
              <p className="text-sm font-medium">No transactions on this day</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedData.income > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase mb-1">Income</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">+₹{selectedData.income.toLocaleString('en-IN')}</p>
                </div>
              )}
              {selectedData.expense > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase mb-1">Expenses</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">-₹{selectedData.expense.toLocaleString('en-IN')}</p>
                </div>
              )}

              {selectedData.details && selectedData.details.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Breakdown</p>
                  <ul className="space-y-2">
                    {selectedData.details.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
