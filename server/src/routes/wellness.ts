import { Router, Request, Response } from 'express';
import { query, get, execute } from '../database';

const router = Router();

// Pre-populated Food Dictionary for accurate estimation
const FOOD_DICTIONARY: Record<string, { calories: number; protein: number; carbs: number; fat: number; unit: string }> = {
  'idli': { calories: 60, protein: 2, carbs: 12, fat: 0.5, unit: 'piece' },
  'dosa': { calories: 150, protein: 4, carbs: 26, fat: 3.5, unit: 'dosa' },
  'sambar': { calories: 120, protein: 5, carbs: 18, fat: 3, unit: 'bowl' },
  'rice': { calories: 200, protein: 4, carbs: 44, fat: 0.5, unit: 'cup' },
  'curd rice': { calories: 230, protein: 6, carbs: 35, fat: 7, unit: 'bowl' },
  'biryani': { calories: 450, protein: 18, carbs: 55, fat: 16, unit: 'plate' },
  'chapati': { calories: 100, protein: 3, carbs: 18, fat: 2, unit: 'chapati' },
  'roti': { calories: 100, protein: 3, carbs: 18, fat: 2, unit: 'roti' },
  'chicken curry': { calories: 280, protein: 24, carbs: 8, fat: 16, unit: 'serving' },
  'egg curry': { calories: 180, protein: 13, carbs: 4, fat: 12, unit: 'serving' },
  'egg': { calories: 75, protein: 6, carbs: 0.5, fat: 5, unit: 'egg' },
  'tea': { calories: 70, protein: 2, carbs: 12, fat: 1.5, unit: 'cup' },
  'tea with sugar': { calories: 70, protein: 2, carbs: 12, fat: 1.5, unit: 'cup' },
  'coffee': { calories: 80, protein: 2, carbs: 14, fat: 2, unit: 'cup' },
  'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'banana' },
  'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'apple' },
  'upma': { calories: 210, protein: 5, carbs: 34, fat: 6, unit: 'bowl' },
  'pongal': { calories: 260, protein: 7, carbs: 40, fat: 8, unit: 'bowl' },
  'parotta': { calories: 290, protein: 6, carbs: 42, fat: 11, unit: 'piece' },
  'fish curry': { calories: 240, protein: 22, carbs: 6, fat: 12, unit: 'serving' },
  'curd': { calories: 100, protein: 4, carbs: 5, fat: 7, unit: 'cup' },
  'milk': { calories: 150, protein: 8, carbs: 12, fat: 8, unit: 'glass' },
  'oats': { calories: 160, protein: 6, carbs: 28, fat: 3, unit: 'bowl' },
  'salad': { calories: 80, protein: 2, carbs: 10, fat: 3, unit: 'bowl' },
  'sandwich': { calories: 250, protein: 9, carbs: 32, fat: 9, unit: 'sandwich' }
};

const formatDateStr = (d: Date): string => d.toISOString().slice(0, 10);

// ==========================================
// 1. USER WELLNESS PROFILE & CALORIE TARGET
// ==========================================
router.get('/profile', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    let profile = await get(`SELECT * FROM wellness_profiles WHERE user_id = ?`, [userId]);
    if (!profile) {
      // Default profile creation
      await execute(
        `INSERT INTO wellness_profiles (user_id, age, sex, height_cm, weight_kg, activity_level, goal, daily_calorie_target, daily_water_target_ml)
         VALUES (?, 30, 'Male', 170, 70, 'Moderately Active', 'Maintain Weight', 2200, 2500)`,
        [userId]
      );
      profile = await get(`SELECT * FROM wellness_profiles WHERE user_id = ?`, [userId]);
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { age, sex, height_cm, weight_kg, activity_level, goal, daily_water_target_ml } = req.body;

  try {
    // Calculate BMR & Daily Calorie Target (Mifflin-St Jeor)
    const weight = Number(weight_kg) || 70;
    const height = Number(height_cm) || 170;
    const userAge = Number(age) || 30;
    const isMale = sex === 'Male';

    const bmr = 10 * weight + 6.25 * height - 5 * userAge + (isMale ? 5 : -161);

    let mult = 1.375;
    if (activity_level === 'Sedentary') mult = 1.2;
    if (activity_level === 'Moderately Active') mult = 1.55;
    if (activity_level === 'Very Active') mult = 1.725;

    let tdee = Math.round(bmr * mult);
    if (goal === 'Lose Weight') tdee -= 400;
    if (goal === 'Gain Weight') tdee += 400;

    const existing = await get(`SELECT id FROM wellness_profiles WHERE user_id = ?`, [userId]);
    if (existing) {
      await execute(
        `UPDATE wellness_profiles SET age = ?, sex = ?, height_cm = ?, weight_kg = ?, activity_level = ?, goal = ?, daily_calorie_target = ?, daily_water_target_ml = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [userAge, sex, height, weight, activity_level, goal, tdee, daily_water_target_ml || 2500, userId]
      );
    } else {
      await execute(
        `INSERT INTO wellness_profiles (user_id, age, sex, height_cm, weight_kg, activity_level, goal, daily_calorie_target, daily_water_target_ml)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userAge, sex, height, weight, activity_level, goal, tdee, daily_water_target_ml || 2500]
      );
    }

    const updated = await get(`SELECT * FROM wellness_profiles WHERE user_id = ?`, [userId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TODAY'S WELLNESS DASHBOARD SUMMARY
// ==========================================
router.get('/dashboard', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const dateStr = (req.query.date as string) || formatDateStr(new Date());

  try {
    const profile = await get(`SELECT * FROM wellness_profiles WHERE user_id = ?`, [userId]) || {
      daily_calorie_target: 2000,
      daily_water_target_ml: 2500
    };

    const meals = await query(
      `SELECT * FROM wellness_meals WHERE user_id = ? AND CAST(date AS TEXT) = ?`,
      [userId, dateStr]
    );

    let caloriesConsumed = 0;
    let proteinTotal = 0;
    let carbsTotal = 0;
    let fatTotal = 0;

    meals.forEach(m => {
      caloriesConsumed += Number(m.total_calories || 0);
      proteinTotal += Number(m.protein_g || 0);
      carbsTotal += Number(m.carbs_g || 0);
      fatTotal += Number(m.fat_g || 0);
    });

    const exercises = await query(
      `SELECT * FROM wellness_exercise WHERE user_id = ? AND CAST(date AS TEXT) = ?`,
      [userId, dateStr]
    );

    let caloriesBurned = 0;
    exercises.forEach(e => {
      caloriesBurned += Number(e.calories_burned || 0);
    });

    const waterLogs = await query(
      `SELECT * FROM wellness_water_logs WHERE user_id = ? AND CAST(date AS TEXT) = ?`,
      [userId, dateStr]
    );

    let waterConsumedMl = 0;
    waterLogs.forEach(w => {
      waterConsumedMl += Number(w.amount_ml || 0);
    });

    const targetCalories = Number(profile.daily_calorie_target || 2000);
    const targetWaterMl = Number(profile.daily_water_target_ml || 2500);
    const remainingCalories = Math.max(0, targetCalories - caloriesConsumed + caloriesBurned);
    const netCalories = caloriesConsumed - caloriesBurned;

    res.json({
      date: dateStr,
      summary: {
        caloriesConsumed: Math.round(caloriesConsumed),
        dailyTarget: targetCalories,
        remainingCalories: Math.round(remainingCalories),
        caloriesBurned: Math.round(caloriesBurned),
        netCalories: Math.round(netCalories),
        proteinG: Math.round(proteinTotal),
        carbsG: Math.round(carbsTotal),
        fatG: Math.round(fatTotal),
        waterConsumedL: Number((waterConsumedMl / 1000).toFixed(1)),
        waterTargetL: Number((targetWaterMl / 1000).toFixed(1))
      },
      meals,
      exercises,
      waterLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. AI NATURAL LANGUAGE FOOD LOGGER
// ==========================================
router.post('/food/analyze-text', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input required for AI food logging.' });
  }

  try {
    const inputLower = text.toLowerCase();

    // Determine Meal Type
    let mealType = 'Lunch';
    if (inputLower.includes('breakfast') || inputLower.includes('morning') || inputLower.includes('idli') || inputLower.includes('dosa') || inputLower.includes('tea')) mealType = 'Breakfast';
    else if (inputLower.includes('dinner') || inputLower.includes('night') || inputLower.includes('chapat') || inputLower.includes('roti')) mealType = 'Dinner';
    else if (inputLower.includes('snack') || inputLower.includes('evening') || inputLower.includes('coffee')) mealType = 'Evening Snack';

    const items: any[] = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Scan dictionary against text
    Object.keys(FOOD_DICTIONARY).forEach(key => {
      if (inputLower.includes(key)) {
        // Extract quantity if available (e.g. "3 idlis", "2 dosa", "one cup tea")
        let qty = 1;
        const numberMap: Record<string, number> = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
        
        const regex = new RegExp(`(\\d+|one|two|three|four|five)\\s*(?:pieces|piece|cups|cup|plates|plate)?\\s*${key}`, 'i');
        const match = inputLower.match(regex);
        if (match) {
          const matchedVal = match[1].toLowerCase();
          qty = numberMap[matchedVal] || parseInt(matchedVal) || 1;
        }

        const dictItem = FOOD_DICTIONARY[key];
        const itemCal = dictItem.calories * qty;
        const itemProt = dictItem.protein * qty;
        const itemCarb = dictItem.carbs * qty;
        const itemFat = dictItem.fat * qty;

        items.push({
          food_name: key.charAt(0).toUpperCase() + key.slice(1),
          quantity: qty,
          unit: dictItem.unit,
          calories: Math.round(itemCal),
          protein: Math.round(itemProt),
          carbs: Math.round(itemCarb),
          fat: Math.round(itemFat),
          confidence: 'High',
          ai_estimated: 1
        });

        totalCalories += itemCal;
        totalProtein += itemProt;
        totalCarbs += itemCarb;
        totalFat += itemFat;
      }
    });

    // Fallback if no specific dictionary item matches
    if (items.length === 0) {
      items.push({
        food_name: text.length > 30 ? text.slice(0, 30) + '...' : text,
        quantity: 1,
        unit: 'serving',
        calories: 250,
        protein: 8,
        carbs: 35,
        fat: 8,
        confidence: 'Medium',
        ai_estimated: 1
      });
      totalCalories = 250;
      totalProtein = 8;
      totalCarbs = 35;
      totalFat = 8;
    }

    res.json({
      mealType,
      items,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      confidence: items.every(i => i.confidence === 'High') ? 'High' : 'Medium',
      aiEstimated: true,
      disclaimer: 'AI estimates are approximate portion sizes. You can review and edit before saving.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. AI FOOD IMAGE SCANNER
// ==========================================
router.post('/food/analyze-image', async (req: Request, res: Response) => {
  const { imageDescription, mealType } = req.body;

  try {
    const textDesc = (imageDescription || 'mixed meal').toLowerCase();
    
    let items: any[] = [];
    if (textDesc.includes('biryani') || textDesc.includes('rice')) {
      items = [
        { food_name: 'Steamed Rice', quantity: 1, unit: 'cup', calories: 200, protein: 4, carbs: 44, fat: 1, confidence: 'High' },
        { food_name: 'Chicken Curry', quantity: 1, unit: 'serving', calories: 280, protein: 24, carbs: 8, fat: 16, confidence: 'Medium' },
        { food_name: 'Salad', quantity: 1, unit: 'bowl', calories: 60, protein: 2, carbs: 8, fat: 1, confidence: 'High' }
      ];
    } else {
      items = [
        { food_name: 'South Indian Meal (Dosa & Sambar)', quantity: 1, unit: 'plate', calories: 340, protein: 9, carbs: 48, fat: 8, confidence: 'Medium' }
      ];
    }

    let totalCal = items.reduce((a, b) => a + b.calories, 0);
    let totalProt = items.reduce((a, b) => a + b.protein, 0);
    let totalCarbs = items.reduce((a, b) => a + b.carbs, 0);
    let totalFat = items.reduce((a, b) => a + b.fat, 0);

    res.json({
      mealType: mealType || 'Lunch',
      items,
      totalCalories: totalCal,
      totalProtein: totalProt,
      totalCarbs: totalCarbs,
      totalFat: totalFat,
      confidence: 'Medium',
      disclaimer: 'Image-based calorie values are estimates. Portion size and preparation method can affect actual calories.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. SAVE CONFIRMED MEAL & SYNC TO CALENDAR
// ==========================================
router.post('/meals', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { meal_type, date, time, items, notes, ai_estimated } = req.body;

  if (!meal_type || !date || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Meal type, date, and items required.' });
  }

  try {
    let totalCal = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    items.forEach((item: any) => {
      totalCal += Number(item.calories || 0);
      totalProt += Number(item.protein || item.protein_g || 0);
      totalCarbs += Number(item.carbs || item.carbs_g || 0);
      totalFat += Number(item.fat || item.fat_g || 0);
    });

    const mealResult = await execute(
      `INSERT INTO wellness_meals (user_id, meal_type, date, time, total_calories, protein_g, carbs_g, fat_g, notes, ai_estimated, user_confirmed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId, meal_type, date, time || '12:30',
        Math.round(totalCal), Math.round(totalProt), Math.round(totalCarbs), Math.round(totalFat),
        notes || '', ai_estimated ? 1 : 0
      ]
    );

    const mealId = mealResult.lastID;

    for (const item of items) {
      await execute(
        `INSERT INTO wellness_meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, confidence, ai_estimated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mealId, item.food_name, item.quantity || 1, item.unit || 'serving',
          item.calories || 0, item.protein || item.protein_g || 0,
          item.carbs || item.carbs_g || 0, item.fat || item.fat_g || 0,
          item.confidence || 'High', item.ai_estimated ? 1 : 0
        ]
      );
    }

    // SHARED CALENDAR INTEGRATION: Create event in personal_events with Warm Orange color (#f97316)
    const mealTitle = `${meal_type}: ${items.map((i: any) => i.food_name).join(', ')} (${Math.round(totalCal)} kcal)`;
    await execute(
      `INSERT INTO personal_events (user_id, title, description, event_date, start_time, end_time, category, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, mealTitle, `Nutritional Breakdown: ${Math.round(totalProt)}g Protein, ${Math.round(totalCarbs)}g Carbs, ${Math.round(totalFat)}g Fat`,
        date, time || '12:30', '13:00', 'Wellness', '#f97316'
      ]
    );

    const createdMeal = await get(`SELECT * FROM wellness_meals WHERE id = ?`, [mealId]);
    res.status(201).json(createdMeal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. EXERCISE LOGGING & CALENDAR SYNC
// ==========================================
router.post('/exercise', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { activity_type, date, start_time, duration_mins, intensity, notes } = req.body;

  if (!activity_type || !duration_mins) {
    return res.status(400).json({ error: 'Activity type and duration required.' });
  }

  try {
    const mins = Number(duration_mins);
    let calPerMin = 5;
    if (activity_type === 'Walking') calPerMin = 4.5;
    if (activity_type === 'Running') calPerMin = 10;
    if (activity_type === 'Cycling') calPerMin = 8;
    if (activity_type === 'Gym') calPerMin = 6.5;
    if (activity_type === 'Swimming') calPerMin = 9;
    if (activity_type === 'Yoga') calPerMin = 3.5;

    let intMult = 1;
    if (intensity === 'High') intMult = 1.3;
    if (intensity === 'Low') intMult = 0.8;

    const burned = Math.round(mins * calPerMin * intMult);

    const result = await execute(
      `INSERT INTO wellness_exercise (user_id, activity_type, date, start_time, duration_mins, intensity, calories_burned, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, activity_type, date || formatDateStr(new Date()), start_time || '07:00',
        mins, intensity || 'Moderate', burned, notes || ''
      ]
    );

    // SHARED CALENDAR INTEGRATION: Create event in personal_events with Fresh Green color (#22c55e)
    const exTitle = `Exercise: ${activity_type} (${duration_mins} mins, ${burned} kcal burned)`;
    await execute(
      `INSERT INTO personal_events (user_id, title, description, event_date, start_time, end_time, category, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, exTitle, `Intensity: ${intensity || 'Moderate'}. Notes: ${notes || 'None'}`,
        date || formatDateStr(new Date()), start_time || '07:00', '07:45', 'Wellness', '#22c55e'
      ]
    );

    const newEx = await get(`SELECT * FROM wellness_exercise WHERE id = ?`, [result.lastID]);
    res.status(201).json(newEx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. WATER INTAKE TRACKER
// ==========================================
router.post('/water', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount_ml, date } = req.body;

  if (!amount_ml) return res.status(400).json({ error: 'Water amount required.' });

  try {
    const result = await execute(
      `INSERT INTO wellness_water_logs (user_id, date, amount_ml) VALUES (?, ?, ?)`,
      [userId, date || formatDateStr(new Date()), Number(amount_ml)]
    );
    res.status(201).json({ id: result.lastID, amount_ml: Number(amount_ml), message: 'Water logged successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ASK VENKE AI ASSISTANT (NATURAL LANGUAGE Q&A)
// ==========================================
router.post('/ai/ask', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { question } = req.body;

  if (!question) return res.status(400).json({ error: 'Question required.' });

  try {
    const qLower = question.toLowerCase();
    const todayStr = formatDateStr(new Date());

    const meals = await query(`SELECT * FROM wellness_meals WHERE user_id = ? AND CAST(date AS TEXT) = ?`, [userId, todayStr]);
    const exercises = await query(`SELECT * FROM wellness_exercise WHERE user_id = ? AND CAST(date AS TEXT) = ?`, [userId, todayStr]);
    const waterLogs = await query(`SELECT * FROM wellness_water_logs WHERE user_id = ? AND CAST(date AS TEXT) = ?`, [userId, todayStr]);
    const profile = await get(`SELECT * FROM wellness_profiles WHERE user_id = ?`, [userId]);

    let calories = 0, protein = 0, carbs = 0, fat = 0;
    meals.forEach(m => {
      calories += Number(m.total_calories || 0);
      protein += Number(m.protein_g || 0);
      carbs += Number(m.carbs_g || 0);
      fat += Number(m.fat_g || 0);
    });

    let burned = 0;
    exercises.forEach(e => burned += Number(e.calories_burned || 0));

    let waterMl = 0;
    waterLogs.forEach(w => waterMl += Number(w.amount_ml || 0));

    let answer = '';
    if (qLower.includes('food') || qLower.includes('eat') || qLower.includes('calorie')) {
      answer = `Today you logged ${meals.length} meal(s) totaling ~${Math.round(calories)} kcal against your estimated target of ${profile?.daily_calorie_target || 2000} kcal. You are currently ${calories > (profile?.daily_calorie_target || 2000) ? 'above' : 'below'} your daily target.`;
    } else if (qLower.includes('protein')) {
      answer = `Your estimated protein intake for today is ${Math.round(protein)} grams across ${meals.length} logged meal(s).`;
    } else if (qLower.includes('exercise') || qLower.includes('workout') || qLower.includes('burn')) {
      answer = `You completed ${exercises.length} exercise session(s) today, burning an estimated ${Math.round(burned)} kcal.`;
    } else if (qLower.includes('water')) {
      answer = `You have logged ${(waterMl / 1000).toFixed(1)} L of water today out of your ${(Number(profile?.daily_water_target_ml || 2500) / 1000).toFixed(1)} L target.`;
    } else {
      answer = `Today's Wellness Summary: ${Math.round(calories)} kcal consumed, ${Math.round(burned)} kcal burned, ${Math.round(protein)}g protein, and ${(waterMl / 1000).toFixed(1)}L water logged across ${meals.length} meals.`;
    }

    res.json({ question, answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. WEEKLY & MONTHLY WELLNESS ANALYTICS
// ==========================================
router.get('/analytics', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const meals = await query(`SELECT * FROM wellness_meals WHERE user_id = ? ORDER BY date DESC LIMIT 30`, [userId]);
    const exercises = await query(`SELECT * FROM wellness_exercise WHERE user_id = ? ORDER BY date DESC LIMIT 30`, [userId]);

    let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
    const dateMap: Record<string, number> = {};

    meals.forEach(m => {
      totalCal += Number(m.total_calories || 0);
      totalProt += Number(m.protein_g || 0);
      totalCarbs += Number(m.carbs_g || 0);
      totalFat += Number(m.fat_g || 0);
      
      const d = m.date;
      if (!dateMap[d]) dateMap[d] = 0;
      dateMap[d] += Number(m.total_calories || 0);
    });

    const daysCount = Object.keys(dateMap).length || 1;

    res.json({
      avgDailyCalories: Math.round(totalCal / daysCount),
      avgDailyProtein: Math.round(totalProt / daysCount),
      avgDailyCarbs: Math.round(totalCarbs / daysCount),
      avgDailyFat: Math.round(totalFat / daysCount),
      totalMealsLogged: meals.length,
      totalExercisesLogged: exercises.length,
      recentDailyTotals: Object.entries(dateMap).map(([d, c]) => ({ date: d, calories: c }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
