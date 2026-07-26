import { useEffect, useState } from 'react';
import { 
  Sparkles, Flame, Droplets, Utensils, 
  Settings, X, ChevronLeft, ChevronRight,
  Plus, MoreVertical
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function Wellness() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Database Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Active AI Tab inside Add Food card
  const [addFoodTab, setAddFoodTab] = useState<'Type' | 'Voice' | 'Photo' | 'Search'>('Type');

  // Input States
  const [nlpInput, setNlpInput] = useState('');
  const [analyzingNlp, setAnalyzingNlp] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState<string>('Lunch');

  // Exercise Form State
  const [exerciseType, setExerciseType] = useState('Walking');
  const [durationMins, setDurationMins] = useState(45);
  const [intensity, setIntensity] = useState('Moderate');

  // Profile Edit State
  const [editAge, setEditAge] = useState(30);
  const [editSex, setEditSex] = useState('Male');
  const [editHeight, setEditHeight] = useState(170);
  const [editWeight, setEditWeight] = useState(70);
  const [editActivity, setEditActivity] = useState('Moderately Active');
  const [editGoal, setEditGoal] = useState('Maintain Weight');

  const fetchRealData = async () => {
    try {
      const [dashRes, profRes] = await Promise.all([
        axios.get(`${API}/wellness/dashboard?date=${selectedDate}`),
        axios.get(`${API}/wellness/profile`)
      ]);

      setDashboardData(dashRes.data || null);
      setProfile(profRes.data || null);

      if (profRes.data) {
        setEditAge(profRes.data.age || 30);
        setEditSex(profRes.data.sex || 'Male');
        setEditHeight(profRes.data.height_cm || 170);
        setEditWeight(profRes.data.weight_kg || 70);
        setEditActivity(profRes.data.activity_level || 'Moderately Active');
        setEditGoal(profRes.data.goal || 'Maintain Weight');
      }
    } catch (err: any) {
      console.error('Failed to load wellness data:', err);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, [selectedDate]);

  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleGoToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/wellness/profile`, {
        age: editAge,
        sex: editSex,
        height_cm: editHeight,
        weight_kg: editWeight,
        activity_level: editActivity,
        goal: editGoal
      });
      setIsProfileModalOpen(false);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to update profile.');
    }
  };

  // AI Text Analysis
  const handleAnalyzeText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryText = nlpInput.trim() || '3 idli with sambar and tea';
    setAnalyzingNlp(true);
    try {
      const res = await axios.post(`${API}/wellness/food/analyze-text`, { text: queryText });
      setAiAnalysisResult(res.data);
    } catch (err: any) {
      alert('Failed to analyze food input.');
    } finally {
      setAnalyzingNlp(false);
    }
  };

  // Save Meal to DB and auto-sync to Shared Calendar
  const handleConfirmSaveMeal = async () => {
    if (!aiAnalysisResult) return;
    try {
      await axios.post(`${API}/wellness/meals`, {
        meal_type: targetMealType || aiAnalysisResult.mealType || 'Lunch',
        date: selectedDate,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        items: aiAnalysisResult.items,
        ai_estimated: 1
      });
      setAiAnalysisResult(null);
      setNlpInput('');
      fetchRealData();
    } catch (err: any) {
      alert('Failed to save meal.');
    }
  };

  // Log Water
  const handleLogWater = async (amountMl: number) => {
    try {
      await axios.post(`${API}/wellness/water`, {
        amount_ml: amountMl,
        date: selectedDate
      });
      fetchRealData();
    } catch (err: any) {
      alert('Failed to log water.');
    }
  };

  // Log Exercise
  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/wellness/exercise`, {
        activity_type: exerciseType,
        date: selectedDate,
        duration_mins: durationMins,
        intensity
      });
      setIsExerciseModalOpen(false);
      fetchRealData();
    } catch (err: any) {
      alert('Failed to log exercise.');
    }
  };

  const summary = dashboardData?.summary || {
    caloriesConsumed: 1240,
    dailyTarget: profile?.daily_calorie_target || 2000,
    remainingCalories: 760,
    caloriesBurned: 320,
    netCalories: 920,
    proteinG: 48,
    carbsG: 150,
    fatG: 42,
    waterConsumedL: 1.5,
    waterTargetL: 2.5
  };

  const targetCal = summary.dailyTarget;
  const consumedCal = summary.caloriesConsumed;
  const remCal = summary.remainingCalories;

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-300 pb-16">
      
      {/* ── TOP HEADER TOOLBAR ─────────────────────────────────────────────── */}
      <div className="bg-white px-5 py-3.5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left Title & Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-sm shadow">
            ✦
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              VENKE ASSIST WELLNESS <span className="text-[9px] bg-teal-100 text-teal-800 font-extrabold px-2 py-0.5 rounded-full uppercase">AI Nutrition</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Smart Nutrition • Activity • Habits • AI Insights</p>
          </div>
        </div>

        {/* Date Selector Controls matching reference image */}
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-800 space-x-2 border border-slate-200/60">
            <span>Today • {selectedDate}</span>
            <button onClick={handlePrevDate} className="text-slate-400 hover:text-slate-700">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNextDate} className="text-slate-400 hover:text-slate-700">
              <ChevronRight size={16} />
            </button>
          </div>

          <button onClick={handleGoToday} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition">
            Today
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none"
          />

          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition">
              <Settings size={16} />
            </button>
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border border-amber-300 shadow-sm">
              VG
            </div>
          </div>
        </div>

      </div>

      {/* ── TOP THREE SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 1. CALORIE SUMMARY GAUGE CARD */}
        <div className="lg:col-span-4 bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CALORIE SUMMARY</span>
          
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative w-36 h-20 flex flex-col items-center justify-end overflow-hidden">
              {/* Semi-circular gauge arc */}
              <div className="w-36 h-36 border-[12px] border-slate-100 border-t-teal-500 border-r-teal-500 rounded-full rotate-[135deg]" />
              <div className="absolute bottom-0 text-center">
                <span className="text-2xl font-black text-slate-900 font-mono block leading-none">{consumedCal.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">of {targetCal.toLocaleString()} kcal</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs font-bold text-teal-700 bg-teal-50/70 border border-teal-200/80 py-1.5 rounded-2xl">
            {remCal} kcal remaining
          </div>
        </div>

        {/* 2. MACRONUTRIENTS CARD */}
        <div className="lg:col-span-5 bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MACRONUTRIENTS</span>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 cursor-pointer hover:text-slate-700">Details &gt;</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {/* Protein */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 p-2.5 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 block">Protein</span>
              <div className="text-sm font-black text-emerald-950 font-mono">{summary.proteinG} <span className="text-[10px] font-normal text-slate-500">/ 120 g</span></div>
              <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (summary.proteinG / 120) * 100)}%` }} />
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-amber-50/50 border border-amber-200/60 p-2.5 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 block">Carbs</span>
              <div className="text-sm font-black text-amber-950 font-mono">{summary.carbsG} <span className="text-[10px] font-normal text-slate-500">/ 250 g</span></div>
              <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (summary.carbsG / 250) * 100)}%` }} />
              </div>
            </div>

            {/* Fat */}
            <div className="bg-purple-50/50 border border-purple-200/60 p-2.5 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-800 block">Fat</span>
              <div className="text-sm font-black text-purple-950 font-mono">{summary.fatG} <span className="text-[10px] font-normal text-slate-500">/ 65 g</span></div>
              <div className="w-full h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (summary.fatG / 65) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. WATER INTAKE CARD */}
        <div className="lg:col-span-3 bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">WATER INTAKE</span>
          
          <div className="flex items-center space-x-2">
            <Droplets className="text-sky-500 fill-sky-500" size={24} />
            <span className="text-xl font-black text-slate-900 font-mono">{summary.waterConsumedL} / {summary.waterTargetL} L</span>
          </div>

          {/* Drop icons */}
          <div className="flex items-center space-x-1.5 text-sky-400 py-1">
            {Array.from({ length: 8 }).map((_, idx) => (
              <span key={idx} className={`text-xs ${idx < Math.round((summary.waterConsumedL / summary.waterTargetL) * 8) ? 'text-sky-500' : 'text-slate-200'}`}>💧</span>
            ))}
          </div>

          <button 
            onClick={() => handleLogWater(250)}
            className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-2xl text-xs transition border border-sky-200/80"
          >
            + Add Water (250 ml)
          </button>
        </div>

      </div>

      {/* ── MAIN WORKSPACE CONTENT (2 COLUMNS MATCHING REFERENCE IMAGE) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ── LEFT COLUMN (FOOD DIARY + UNIVERSAL ADD + AI CARD + WEEKLY SUMMARY) */}
        <div className="lg:col-span-7 space-y-4">

          {/* 1. TODAY'S FOOD DIARY SECTION */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Utensils size={15} className="text-amber-500" /> TODAY'S FOOD DIARY
              </h3>
              <span className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-slate-700">Full Diary &gt;</span>
            </div>

            {/* MEAL SECTIONS */}
            <div className="space-y-3">
              
              {/* BREAKFAST */}
              <div className="p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-500">☀️</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">BREAKFAST</h4>
                    <span className="text-[10px] text-slate-400 font-mono">07:30 AM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-black text-amber-600">420 kcal</span>
                    <MoreVertical size={14} className="text-slate-400 cursor-pointer" />
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-700 font-medium pl-6 border-l-2 border-amber-300">
                  <div className="flex justify-between"><span>• 3 Idli</span><span className="font-mono text-slate-400">180 kcal</span></div>
                  <div className="flex justify-between"><span>• Sambar</span><span className="font-mono text-slate-400">150 kcal</span></div>
                  <div className="flex justify-between"><span>• Tea with Sugar</span><span className="font-mono text-slate-400">90 kcal</span></div>
                </div>

                <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-500 pt-1">
                  <span><strong className="text-emerald-700">P 12g</strong></span>
                  <span><strong className="text-amber-700">C 65g</strong></span>
                  <span><strong className="text-purple-700">F 8g</strong></span>
                </div>
              </div>

              {/* LUNCH */}
              <div className="p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-500">🍲</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">LUNCH</h4>
                    <span className="text-[10px] text-slate-400 font-mono">01:15 PM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-black text-amber-600">650 kcal</span>
                    <MoreVertical size={14} className="text-slate-400 cursor-pointer" />
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-700 font-medium pl-6 border-l-2 border-amber-300">
                  <div className="flex justify-between"><span>• Rice (1 cup)</span><span className="font-mono text-slate-400">205 kcal</span></div>
                  <div className="flex justify-between"><span>• Chicken Curry (1 serving)</span><span className="font-mono text-slate-400">350 kcal</span></div>
                  <div className="flex justify-between"><span>• Curd (100 g)</span><span className="font-mono text-slate-400">60 kcal</span></div>
                </div>

                <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-500 pt-1">
                  <span><strong className="text-emerald-700">P 32g</strong></span>
                  <span><strong className="text-amber-700">C 70g</strong></span>
                  <span><strong className="text-purple-700">F 18g</strong></span>
                </div>
              </div>

              {/* EVENING SNACK */}
              <div className="p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span>🍎</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">EVENING SNACK</h4>
                    <span className="text-[10px] text-slate-400 font-mono">04:45 PM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-black text-amber-600">170 kcal</span>
                    <MoreVertical size={14} className="text-slate-400 cursor-pointer" />
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-700 font-medium pl-6 border-l-2 border-amber-300">
                  <div className="flex justify-between"><span>• Banana (1 medium)</span><span className="font-mono text-slate-400">100 kcal</span></div>
                  <div className="flex justify-between"><span>• Tea without Sugar</span><span className="font-mono text-slate-400">70 kcal</span></div>
                </div>

                <div className="flex items-center space-x-3 text-[10px] font-mono font-bold text-slate-500 pt-1">
                  <span><strong className="text-emerald-700">P 2g</strong></span>
                  <span><strong className="text-amber-700">C 27g</strong></span>
                  <span><strong className="text-purple-700">F 1g</strong></span>
                </div>
              </div>

              {/* DINNER PLACEHOLDER */}
              <div className="p-3 border border-dashed border-slate-200 rounded-2xl text-center">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">🌙 DINNER <span className="text-[10px] font-mono font-normal">08:15 PM</span></span>
                </div>
                <button 
                  onClick={() => { setTargetMealType('Dinner'); setNlpInput(''); }}
                  className="w-full py-1.5 mt-2 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
                >
                  + Add Dinner
                </button>
              </div>

              {/* LATE NIGHT SNACK PLACEHOLDER */}
              <div className="p-3 border border-dashed border-slate-200 rounded-2xl text-center">
                <button 
                  onClick={() => { setTargetMealType('Late Night Snack'); setNlpInput(''); }}
                  className="w-full py-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
                >
                  + Add Snack
                </button>
              </div>

            </div>
          </div>

          {/* 2. ONE UNIVERSAL "+ ADD" BUTTON & BAR */}
          <div className="space-y-2">
            <button 
              onClick={() => handleAnalyzeText()}
              className="w-full py-3 bg-[#009688] hover:bg-[#00897b] text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>+ ADD</span>
            </button>

            {/* Sub-action bar matching reference image */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-[10px] font-bold text-slate-600 bg-white p-2.5 rounded-2xl border border-slate-200/80">
              <div onClick={() => setAddFoodTab('Type')} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">🍽️</span>
                <span>Food / Meal</span>
              </div>
              <div onClick={() => setAddFoodTab('Photo')} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">📷</span>
                <span>Scan Photo</span>
              </div>
              <div onClick={() => setAddFoodTab('Voice')} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">🎤</span>
                <span>Voice Input</span>
              </div>
              <div onClick={() => setAddFoodTab('Search')} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">🔍</span>
                <span>Search Food</span>
              </div>
              <div onClick={() => setIsExerciseModalOpen(true)} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">🏃</span>
                <span>Exercise</span>
              </div>
              <div onClick={() => handleLogWater(250)} className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">💧</span>
                <span>Water</span>
              </div>
              <div className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">🎯</span>
                <span>Habit</span>
              </div>
              <div className="p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                <span className="text-base block mb-0.5">📝</span>
                <span>Note</span>
              </div>
            </div>
          </div>

          {/* 3. ADD FOOD WITH AI CARD (TANGLISH & INDIAN INTELLIGENCE) */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">ADD FOOD WITH AI</h3>
              <span className="text-[10px] text-slate-400">How do you want to add food?</span>
            </div>

            {/* Input Method Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['Type', 'Voice', 'Photo', 'Search'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAddFoodTab(tab)}
                  className={`py-1 rounded-lg text-center transition ${addFoodTab === tab ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Natural Text Input Form */}
            <form onSubmit={handleAnalyzeText} className="space-y-3 text-xs">
              <textarea
                rows={2}
                placeholder="3 idli with sambar and tea"
                value={nlpInput}
                onChange={e => setNlpInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 outline-none focus:border-teal-500 font-medium"
              />

              <button
                type="submit"
                disabled={analyzingNlp}
                className="w-full py-2.5 bg-[#009688] hover:bg-[#00897b] text-white font-black rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                <Sparkles size={14} />
                <span>{analyzingNlp ? 'Analyzing...' : '✦ Analyze with AI'}</span>
              </button>
            </form>

            <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px] text-slate-500 font-medium">
              💡 <strong>Tips:</strong> You can type in English, Tamil, or mix of both. Example: <em>"oru plate biryani"</em>, <em>"2 dosa chutney"</em>
            </div>
          </div>

          {/* 4. AI RESULT REVIEW CARD */}
          {aiAnalysisResult && (
            <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900">AI RESULT</h3>
                  <span className="text-[10px] text-slate-400">Detected from your input</span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Confidence: {aiAnalysisResult.confidence}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {aiAnalysisResult.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <div>
                      <h4 className="font-bold text-slate-800">{item.food_name}</h4>
                      <span className="text-[10px] text-slate-400">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block">{item.calories} kcal</span>
                      <span className="text-[9px] font-mono text-slate-400">P {item.protein}g • C {item.carbs}g • F {item.fat}g</span>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center font-black font-mono text-xs text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL</span>
                  <span>{aiAnalysisResult.totalCalories} kcal</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  onClick={() => setAiAnalysisResult(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Edit Portion
                </button>
                <button 
                  onClick={handleConfirmSaveMeal}
                  className="px-4 py-1.5 bg-[#009688] hover:bg-[#00897b] text-white font-black rounded-xl text-xs shadow-sm"
                >
                  Save Meal
                </button>
              </div>
            </div>
          )}

          {/* 5. WEEKLY SUMMARY BAR CHART CARD */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">WEEKLY SUMMARY <span className="text-slate-400 font-normal">(Jul 20 - Jul 26)</span></h3>
              <span className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-slate-700">View Analytics &gt;</span>
            </div>

            <div className="grid grid-cols-4 text-center text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Calories</span>
                <span className="font-black text-slate-900 font-mono">1,820 kcal</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Protein</span>
                <span className="font-black text-slate-900 font-mono">72 g</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Water</span>
                <span className="font-black text-slate-900 font-mono">1.8 L</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Workouts</span>
                <span className="font-black text-slate-900 font-mono">5 Sessions</span>
              </div>
            </div>

            {/* Mon-Sun Bar chart visual */}
            <div className="flex justify-between items-end h-24 pt-4 px-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const heights = [60, 75, 80, 70, 85, 90, 65];
                return (
                  <div key={day} className="flex flex-col items-center gap-1.5">
                    <div className="w-4 bg-slate-100 rounded-full h-16 flex items-end">
                      <div className="w-full bg-teal-500 rounded-full" style={{ height: `${heights[idx]}%` }} />
                    </div>
                    <span>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (AI INSIGHTS + NEXT MEAL + ACTIVITY + HYDRATION) ── */}
        <div className="lg:col-span-5 space-y-4">

          {/* 1. AI INSIGHTS CARD */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                AI INSIGHTS <span className="bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">AI</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800">Good job! You're doing great today.</p>

              <div className="space-y-2 text-[11px] text-slate-600 font-medium pt-1">
                <div className="flex items-start space-x-2">
                  <span className="text-teal-600 mt-0.5">⏱️</span>
                  <div>
                    <strong className="text-slate-800 block">You have {remCal} kcal remaining</strong>
                    <span>Good to reach your daily goal</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">⚠️</span>
                  <div>
                    <strong className="text-slate-800 block">Protein intake is a bit low</strong>
                    <span>Add more protein in your next meal</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-sky-500 mt-0.5">💧</span>
                  <div>
                    <strong className="text-slate-800 block">Water intake is on track</strong>
                    <span>Great! Keep it consistent</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">🔥</span>
                  <div>
                    <strong className="text-slate-800 block">You burned {summary.caloriesBurned} kcal</strong>
                    <span>Through activities</span>
                  </div>
                </div>
              </div>

              <div className="pt-1 text-center">
                <span className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer">View Full Analysis &gt;</span>
              </div>
            </div>
          </div>

          {/* 2. AI SUGGESTED NEXT MEAL CARD */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">AI SUGGESTED NEXT MEAL</h3>
              <span className="text-[10px] text-slate-400">Based on your progress</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>🍳</span>
                  <div>
                    <h4 className="font-bold text-slate-900">3 Eggs + 2 Chapati</h4>
                    <span className="text-[10px] text-slate-400 font-mono">~480 kcal • P 30g</span>
                  </div>
                </div>
                <button onClick={() => { setNlpInput('3 Eggs and 2 Chapati'); handleAnalyzeText(); }} className="text-teal-700 hover:text-teal-900 font-bold text-xs">
                  + Add
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>🍗</span>
                  <div>
                    <h4 className="font-bold text-slate-900">Chicken + Rice + Veggies</h4>
                    <span className="text-[10px] text-slate-400 font-mono">~520 kcal • P 35g</span>
                  </div>
                </div>
                <button onClick={() => { setNlpInput('Chicken Rice and Veggies'); handleAnalyzeText(); }} className="text-teal-700 hover:text-teal-900 font-bold text-xs">
                  + Add
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>🥣</span>
                  <div>
                    <h4 className="font-bold text-slate-900">Curd + Fruit + Nuts</h4>
                    <span className="text-[10px] text-slate-400 font-mono">~350 kcal • P 15g</span>
                  </div>
                </div>
                <button onClick={() => { setNlpInput('Curd Fruit and Nuts'); handleAnalyzeText(); }} className="text-teal-700 hover:text-teal-900 font-bold text-xs">
                  + Add
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium pt-1">
              <strong>Why these?</strong> You need ~55g more protein to reach your target.
            </div>
          </div>

          {/* 3. TODAY'S ACTIVITY CARD */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">TODAY'S ACTIVITY</h3>
              <span onClick={() => setIsExerciseModalOpen(true)} className="text-[10px] font-bold text-teal-700 cursor-pointer">Edit</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-600">🏃</span>
                  <div>
                    <h4 className="font-bold text-slate-900">Morning Walk</h4>
                    <span className="text-[10px] text-slate-400">45 min • Moderate</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700">210 kcal <span className="text-[9px] font-normal text-slate-400 block text-right">Burned</span></span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-600">🧘</span>
                  <div>
                    <h4 className="font-bold text-slate-900">Yoga</h4>
                    <span className="text-[10px] text-slate-400">20 min • Light</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700">110 kcal <span className="text-[9px] font-normal text-slate-400 block text-right">Burned</span></span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-150 font-black">
                <span>Total Burned</span>
                <span className="font-mono text-emerald-700 text-sm">320 kcal</span>
              </div>
            </div>
          </div>

          {/* 4. HYDRATION TRACKER CARD */}
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">HYDRATION TRACKER</h3>
              <span className="text-[10px] font-bold text-slate-400 cursor-pointer">Edit Goal</span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mini donut chart */}
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-sky-500 border-r-sky-500 border-b-sky-500" />
                <div className="absolute text-center">
                  <span className="text-xs font-black font-mono text-slate-900 block leading-none">1.5 L</span>
                  <span className="text-[8px] text-slate-400">of 2.5 L</span>
                </div>
              </div>

              <div className="flex-1 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-600"><span>07:00 AM</span><span className="font-bold">250 ml</span></div>
                <div className="flex justify-between text-slate-600"><span>09:30 AM</span><span className="font-bold">250 ml</span></div>
                <div className="flex justify-between text-slate-600"><span>12:00 PM</span><span className="font-bold">500 ml</span></div>
                <div className="flex justify-between text-slate-600"><span>03:00 PM</span><span className="font-bold">250 ml</span></div>
                <div className="flex justify-between text-slate-600"><span>06:30 PM</span><span className="font-bold">250 ml</span></div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── EXERCISE ACTIVITY MODAL ─────────────────────────────────────── */}
      {isExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-600" /> Log Activity
              </h3>
              <button onClick={() => setIsExerciseModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExercise} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Activity Type</label>
                <select
                  value={exerciseType}
                  onChange={e => setExerciseType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                >
                  <option value="Walking">Walking</option>
                  <option value="Running">Running</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Gym">Gym Workout</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Yoga">Yoga</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="5"
                  value={durationMins}
                  onChange={e => setDurationMins(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Intensity</label>
                <select
                  value={intensity}
                  onChange={e => setIntensity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExerciseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition shadow"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WELLNESS PROFILE MODAL ──────────────────────────────────────── */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-600" /> Wellness Profile & Goals
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={e => setEditAge(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Sex</label>
                  <select
                    value={editSex}
                    onChange={e => setEditSex(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={editHeight}
                    onChange={e => setEditHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={editWeight}
                    onChange={e => setEditWeight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Activity Level</label>
                <select
                  value={editActivity}
                  onChange={e => setEditActivity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                >
                  <option value="Sedentary">Sedentary (Little or no exercise)</option>
                  <option value="Lightly Active">Lightly Active (1-3 days/week)</option>
                  <option value="Moderately Active">Moderately Active (3-5 days/week)</option>
                  <option value="Very Active">Very Active (6-7 days/week)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Goal</label>
                <select
                  value={editGoal}
                  onChange={e => setEditGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                >
                  <option value="Maintain Weight">Maintain Weight</option>
                  <option value="Lose Weight">Lose Weight (-400 kcal/day)</option>
                  <option value="Gain Weight">Gain Weight (+400 kcal/day)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-sm"
                >
                  Calculate & Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
