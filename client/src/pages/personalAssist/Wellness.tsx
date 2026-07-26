import { useEffect, useState } from 'react';
import { 
  Sparkles, Camera, Flame, Droplets, Utensils, Activity, MessageSquare, 
  Settings, X, BarChart2, ShieldAlert
} from 'lucide-react';
import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function Wellness() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics'>('dashboard');

  // Real Database States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Date selection
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTextLoggerOpen, setIsTextLoggerOpen] = useState(false);
  const [isImageScannerOpen, setIsImageScannerOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  // Natural Language Food Logger State
  const [nlpInput, setNlpInput] = useState('');
  const [analyzingNlp, setAnalyzingNlp] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Image Scanner State
  const [imageDescription, setImageDescription] = useState('Chicken Biryani with Salad');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Exercise Form State
  const [exerciseType, setExerciseType] = useState('Walking');
  const [durationMins, setDurationMins] = useState(30);
  const [intensity, setIntensity] = useState('Moderate');

  // AI Assistant Q&A
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [askingAi, setAskingAi] = useState(false);

  // Profile Edit State
  const [editAge, setEditAge] = useState(30);
  const [editSex, setEditSex] = useState('Male');
  const [editHeight, setEditHeight] = useState(170);
  const [editWeight, setEditWeight] = useState(70);
  const [editActivity, setEditActivity] = useState('Moderately Active');
  const [editGoal, setEditGoal] = useState('Maintain Weight');

  const fetchRealData = async () => {
    try {
      const [dashRes, profRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/wellness/dashboard?date=${selectedDate}`),
        axios.get(`${API}/wellness/profile`),
        axios.get(`${API}/wellness/analytics`)
      ]);

      setDashboardData(dashRes.data || null);
      setProfile(profRes.data || null);
      setAnalytics(analyticsRes.data || null);

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

  // Handle Profile Update
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

  // Handle AI Text Food Analysis
  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;
    setAnalyzingNlp(true);
    try {
      const res = await axios.post(`${API}/wellness/food/analyze-text`, { text: nlpInput });
      setAiAnalysisResult(res.data);
    } catch (err: any) {
      alert('Failed to analyze food input.');
    } finally {
      setAnalyzingNlp(false);
    }
  };

  // Handle AI Image Scanner Analysis
  const handleAnalyzeImage = async () => {
    setAnalyzingImage(true);
    try {
      const res = await axios.post(`${API}/wellness/food/analyze-image`, { imageDescription });
      setAiAnalysisResult(res.data);
      setIsImageScannerOpen(false);
    } catch (err: any) {
      alert('Failed to analyze food image.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Confirm and Save AI Meal to Database (plus auto-sync to Shared Calendar)
  const handleConfirmSaveMeal = async () => {
    if (!aiAnalysisResult) return;
    try {
      await axios.post(`${API}/wellness/meals`, {
        meal_type: aiAnalysisResult.mealType || 'Lunch',
        date: selectedDate,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        items: aiAnalysisResult.items,
        ai_estimated: aiAnalysisResult.aiEstimated ? 1 : 0
      });
      setAiAnalysisResult(null);
      setIsTextLoggerOpen(false);
      setNlpInput('');
      fetchRealData();
    } catch (err: any) {
      alert('Failed to save meal.');
    }
  };

  // Log Quick Water Intake
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

  // Log Exercise Activity
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

  // Handle Ask Venke AI Assistant
  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAskingAi(true);
    try {
      const res = await axios.post(`${API}/wellness/ai/ask`, { question: aiQuestion });
      setAiAnswer(res.data.answer);
    } catch (err: any) {
      setAiAnswer('Unable to query history at this moment.');
    } finally {
      setAskingAi(false);
    }
  };

  const summary = dashboardData?.summary || {
    caloriesConsumed: 0,
    dailyTarget: profile?.daily_calorie_target || 2000,
    remainingCalories: profile?.daily_calorie_target || 2000,
    caloriesBurned: 0,
    netCalories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    waterConsumedL: 0,
    waterTargetL: 2.5
  };

  const consumedPct = Math.min(100, Math.round((summary.caloriesConsumed / summary.dailyTarget) * 100));
  const waterPct = Math.min(100, Math.round((summary.waterConsumedL / summary.waterTargetL) * 100));

  return (
    <div className="space-y-5 font-sans text-slate-800 animate-in fade-in duration-300 pb-16">
      
      {/* ── TOP HEADER TOOLBAR ─────────────────────────────────────────────── */}
      <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl">
            <Utensils size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Venke Wellness & Nutrition <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">AI Powered</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Smart Calorie Tracking • Natural Language Food AI • Shared Calendar Sync</p>
          </div>
        </div>

        {/* Date Selector & Mode Switcher */}
        <div className="flex items-center space-x-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-teal-500"
          />

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Analytics
            </button>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition"
            title="Wellness Profile Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* ── TODAY'S WELLNESS SUMMARY & MACRO RING BAR ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Calorie Target Progress Card */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">DAILY CALORIE BALANCE</span>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">{summary.caloriesConsumed} <span className="text-sm font-normal text-slate-500">/ {summary.dailyTarget} kcal</span></h2>
                </div>
                <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold rounded-xl">
                  {consumedPct}% Target
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${consumedPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Food Consumed: <strong>{summary.caloriesConsumed} kcal</strong></span>
                  <span>Burned: <strong className="text-emerald-700">-{summary.caloriesBurned} kcal</strong></span>
                </div>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-150 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Remaining</span>
                  <span className="text-sm font-black text-slate-800 font-mono">{summary.remainingCalories} kcal</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Net Calories</span>
                  <span className="text-sm font-black text-teal-700 font-mono">{summary.netCalories} kcal</span>
                </div>
              </div>
            </div>

            {/* Macros Breakdown Card */}
            <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BarChart2 size={16} className="text-teal-600" /> Macronutrients & Water Intake
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Selected Date: {selectedDate}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Protein */}
                <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-rose-800">Protein</span>
                  <div className="text-lg font-black text-rose-950 font-mono">{summary.proteinG} g</div>
                  <div className="w-full h-1.5 bg-rose-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (summary.proteinG / 90) * 100)}%` }} />
                  </div>
                </div>

                {/* Carbohydrates */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-800">Carbs</span>
                  <div className="text-lg font-black text-amber-950 font-mono">{summary.carbsG} g</div>
                  <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (summary.carbsG / 250) * 100)}%` }} />
                  </div>
                </div>

                {/* Fats */}
                <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-purple-800">Fats</span>
                  <div className="text-lg font-black text-purple-950 font-mono">{summary.fatG} g</div>
                  <div className="w-full h-1.5 bg-purple-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (summary.fatG / 70) * 100)}%` }} />
                  </div>
                </div>

                {/* Water */}
                <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-2xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-sky-800 flex items-center gap-1"><Droplets size={12} /> Water</span>
                    <span className="text-[9px] font-mono text-sky-600 font-bold">{summary.waterConsumedL} / {summary.waterTargetL} L</span>
                  </div>
                  <div className="text-lg font-black text-sky-950 font-mono">{summary.waterConsumedL} L</div>
                  <div className="w-full h-1.5 bg-sky-200 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${waterPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Water Quick Buttons */}
              <div className="pt-2 flex items-center space-x-2 flex-wrap text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-2">Quick Log Water:</span>
                <button onClick={() => handleLogWater(250)} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold rounded-xl border border-sky-200 transition">
                  +250 ml
                </button>
                <button onClick={() => handleLogWater(500)} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold rounded-xl border border-sky-200 transition">
                  +500 ml
                </button>
                <button onClick={() => handleLogWater(750)} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold rounded-xl border border-sky-200 transition">
                  +750 ml
                </button>
                <button onClick={() => handleLogWater(1000)} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold rounded-xl border border-sky-200 transition">
                  +1.0 L
                </button>
              </div>

            </div>

          </div>

          {/* ── QUICK ACTION LOGGERS (AI NATURAL LANGUAGE + CAMERA + EXERCISE) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. AI Natural Language Food Logger */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4.5 rounded-3xl shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                  <Sparkles size={14} /> AI Food Logger
                </span>
              </div>
              <p className="text-xs text-emerald-50">Type what you ate in plain natural language (e.g. "3 idlis with sambar & tea")</p>
              <button
                onClick={() => setIsTextLoggerOpen(true)}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs transition shadow flex items-center justify-center space-x-1.5"
              >
                <Sparkles size={16} />
                <span>+ Log Food with AI</span>
              </button>
            </div>

            {/* 2. AI Food Image Scanner */}
            <div className="bg-gradient-to-br from-teal-700 to-cyan-800 text-white p-4.5 rounded-3xl shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-100 flex items-center gap-1">
                  <Camera size={14} /> AI Photo Scanner
                </span>
              </div>
              <p className="text-xs text-cyan-50">Analyze meal photos to estimate portion sizes, calories & macronutrients</p>
              <button
                onClick={() => setIsImageScannerOpen(true)}
                className="w-full py-2.5 bg-white hover:bg-cyan-50 text-cyan-950 font-black rounded-2xl text-xs transition shadow flex items-center justify-center space-x-1.5"
              >
                <Camera size={16} />
                <span>📷 Scan Food Photo</span>
              </button>
            </div>

            {/* 3. Exercise & Activity Logger */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4.5 rounded-3xl shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Flame size={14} /> Activity Logger
                </span>
              </div>
              <p className="text-xs text-slate-300">Log walking, running, gym, yoga or sports to calculate calories burned</p>
              <button
                onClick={() => setIsExerciseModalOpen(true)}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-2xl text-xs transition shadow flex items-center justify-center space-x-1.5"
              >
                <Flame size={16} />
                <span>🔥 Log Activity</span>
              </button>
            </div>

          </div>

          {/* ── LOGGED MEALS & EXERCISE LIST ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Logged Meals List */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Utensils size={15} className="text-orange-500" /> Today's Meals ({dashboardData?.meals?.length || 0})
                </h3>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                  Auto-synced to Calendar
                </span>
              </div>

              {(!dashboardData?.meals || dashboardData.meals.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-2">
                  <p>No meals logged for this date.</p>
                  <button onClick={() => setIsTextLoggerOpen(true)} className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs">
                    + Log Food with AI
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboardData.meals.map((m: any) => (
                    <div key={m.id} className="p-3.5 rounded-2xl border border-orange-200 bg-orange-50/40 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-black uppercase text-orange-800 bg-orange-100 px-2 py-0.5 rounded">
                            {m.meal_type}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 mt-1">{m.notes || m.meal_type}</h4>
                        </div>
                        <span className="text-xs font-mono font-black text-orange-700 bg-white px-2.5 py-1 rounded-xl border border-orange-200">
                          {m.total_calories} kcal
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-600 font-mono pt-1">
                        <span>P: <strong className="text-rose-700">{m.protein_g}g</strong></span>
                        <span>C: <strong className="text-amber-700">{m.carbs_g}g</strong></span>
                        <span>F: <strong className="text-purple-700">{m.fat_g}g</strong></span>
                        <span className="text-slate-400 ml-auto">{m.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logged Exercise Sessions */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Activity size={15} className="text-emerald-600" /> Logged Activities
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Auto-synced to Calendar
                </span>
              </div>

              {(!dashboardData?.exercises || dashboardData.exercises.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-2">
                  <p>No workouts logged for this date.</p>
                  <button onClick={() => setIsExerciseModalOpen(true)} className="px-3 py-1 bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs">
                    + Log Activity
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboardData.exercises.map((ex: any) => (
                    <div key={ex.id} className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{ex.activity_type}</h4>
                        <span className="text-[10px] text-slate-500 font-medium">{ex.duration_mins} mins • {ex.intensity}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                        -{ex.calories_burned} kcal
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── ASK VENKE AI ASSISTANT (NATURAL LANGUAGE Q&A) ───────────────── */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-teal-600" /> Ask Venke AI Wellness Assistant
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Backed by Database History</span>
            </div>

            <form onSubmit={handleAskAi} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'How much protein did I eat today?' or 'How was my food today?'"
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 font-medium"
              />
              <button
                type="submit"
                disabled={askingAi}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-xs transition shadow-sm"
              >
                {askingAi ? 'Querying...' : 'Ask AI'}
              </button>
            </form>

            {aiAnswer && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200/80 rounded-2xl text-xs text-teal-950 font-medium animate-in fade-in duration-200">
                <strong className="text-teal-800 font-bold block mb-1">✦ Venke AI Response:</strong>
                {aiAnswer}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── WEEKLY & MONTHLY WELLNESS ANALYTICS TAB ───────────────────────── */
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-150 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">Weekly & Monthly Wellness Trends</h2>
            <p className="text-xs text-slate-500 font-medium">Historical calorie balances, macro averages & exercise logs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Avg Daily Calories</span>
              <div className="text-xl font-black text-slate-900 font-mono">{analytics?.avgDailyCalories || 0} kcal</div>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-700">Avg Daily Protein</span>
              <div className="text-xl font-black text-rose-950 font-mono">{analytics?.avgDailyProtein || 0} g</div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-700">Avg Daily Carbs</span>
              <div className="text-xl font-black text-amber-950 font-mono">{analytics?.avgDailyCarbs || 0} g</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700">Avg Daily Fat</span>
              <div className="text-xl font-black text-purple-950 font-mono">{analytics?.avgDailyFat || 0} g</div>
            </div>
          </div>

          {/* Calorie Trend Log */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Recent Calorie Logged Totals</h3>
            {(!analytics?.recentDailyTotals || analytics.recentDailyTotals.length === 0) ? (
              <p className="text-xs text-slate-400 font-medium py-4">No historical records available yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.recentDailyTotals.map((item: any) => (
                  <div key={item.date} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-mono font-bold">
                    <span>{item.date}</span>
                    <span className="text-emerald-700">{item.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 1. AI NATURAL LANGUAGE FOOD LOGGER MODAL ─────────────────────── */}
      {isTextLoggerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" /> AI Natural Language Food Logger
              </h3>
              <button onClick={() => { setIsTextLoggerOpen(false); setAiAnalysisResult(null); }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAnalyzeText} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">What did you eat?</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. 'I ate 3 idlis with sambar and one cup tea with sugar'"
                  value={nlpInput}
                  onChange={e => setNlpInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={analyzingNlp}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  {analyzingNlp ? 'Analyzing...' : 'Analyze with AI ✦'}
                </button>
              </div>
            </form>

            {/* AI Result Review Table (User Review Required Rule) */}
            {aiAnalysisResult && (
              <div className="space-y-3 pt-3 border-t border-slate-150 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-slate-800">AI Analysis Breakdown</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Confidence: {aiAnalysisResult.confidence}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  {aiAnalysisResult.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-bold">{item.quantity} {item.unit} {item.food_name}</span>
                      <span className="font-mono text-slate-600">{item.calories} kcal (P: {item.protein}g, C: {item.carbs}g, F: {item.fat}g)</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center font-bold font-mono text-xs text-slate-900 pt-1">
                    <span>TOTAL ESTIMATE:</span>
                    <span>{aiAnalysisResult.totalCalories} kcal</span>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-600 flex-shrink-0" />
                  <span>{aiAnalysisResult.disclaimer}</span>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setAiAnalysisResult(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Edit Input
                  </button>
                  <button
                    onClick={handleConfirmSaveMeal}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-sm"
                  >
                    ✓ Confirm & Save Meal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. AI FOOD IMAGE SCANNER MODAL ──────────────────────────────── */}
      {isImageScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-600" /> AI Food Photo Scanner
              </h3>
              <button onClick={() => setIsImageScannerOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-8 border-2 border-dashed border-cyan-200 rounded-2xl bg-cyan-50/40 text-center space-y-2 cursor-pointer">
                <Camera size={28} className="mx-auto text-cyan-600" />
                <p className="font-bold text-slate-700">Click to upload or capture food photo</p>
                <span className="text-[10px] text-slate-400 block">Supports JPG, PNG, WEBP</span>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Select / Describe Sample Meal</label>
                <select
                  value={imageDescription}
                  onChange={e => setImageDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                >
                  <option value="Chicken Biryani with Salad">Chicken Biryani with Salad</option>
                  <option value="South Indian Meals Dosa Sambar">South Indian Dosa with Sambar</option>
                  <option value="Fruit Bowl Banana Apple">Fresh Fruit Salad</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImageScannerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnalyzeImage}
                  disabled={analyzingImage}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow"
                >
                  {analyzingImage ? 'Scanning Photo...' : 'Scan Photo 📷'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. EXERCISE ACTIVITY MODAL ───────────────────────────────────── */}
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

      {/* ── 4. WELLNESS PROFILE MODAL ───────────────────────────────────── */}
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
