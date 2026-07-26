import { Router, Request, Response } from 'express';
import { query, execute, get } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Helper for formatting date as YYYY-MM-DD
const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ==========================================
// 1. PERSONAL DASHBOARD ANALYTICS & SUMMARY
// ==========================================
router.get('/dashboard', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const todayStr = formatDateStr(new Date());
  const monthParam = (req.query.month as string) || todayStr.slice(0, 7);

  try {
    // Today's task counts
    const todayTasks = await query(
      `SELECT status, priority FROM personal_tasks WHERE user_id = ? AND date = ?`,
      [userId, todayStr]
    );

    const completedToday = todayTasks.filter(t => t.status === 'completed').length;
    const pendingToday = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

    // Overdue tasks
    const overdueRes = await get(
      `SELECT COUNT(*) as cnt FROM personal_tasks WHERE user_id = ? AND date < ? AND status NOT IN ('completed', 'cancelled')`,
      [userId, todayStr]
    );
    const overdueCount = Number(overdueRes?.cnt || 0);

    // Monthly task statistics
    const monthTasks = await query(
      `SELECT id, date, status, priority, category, title FROM personal_tasks WHERE user_id = ? AND date LIKE ?`,
      [userId, `${monthParam}%`]
    );

    const monthTotal = monthTasks.length;
    const monthCompleted = monthTasks.filter(t => t.status === 'completed').length;
    const monthPending = monthTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const monthOverdue = monthTasks.filter(t => t.date < todayStr && t.status !== 'completed' && t.status !== 'cancelled').length;
    const completionPct = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

    // Habit completion stats for today
    const activeHabits = await query(`SELECT * FROM personal_habits WHERE user_id = ?`, [userId]);
    const todayHabitCompletions = await query(
      `SELECT habit_id FROM habit_completions WHERE user_id = ? AND completed_date = ?`,
      [userId, todayStr]
    );
    const completedHabitsTodayCount = todayHabitCompletions.length;

    // Calculate Habit Streak (consecutive days up to today with at least 1 completed habit or task)
    let currentStreak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dStr = formatDateStr(checkDate);
      const hasHabit = await get(`SELECT id FROM habit_completions WHERE user_id = ? AND completed_date = ? LIMIT 1`, [userId, dStr]);
      const hasTask = await get(`SELECT id FROM personal_tasks WHERE user_id = ? AND date = ? AND status = 'completed' LIMIT 1`, [userId, dStr]);
      if (hasHabit || hasTask) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          // Check yesterday if today has not completed items yet
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    // Active goals summary
    const goalsRes = await query(
      `SELECT id, title, category, progress_pct, status FROM personal_goals WHERE user_id = ? AND status != 'archived'`,
      [userId]
    );
    const activeGoalsCount = goalsRes.filter(g => g.status !== 'completed').length;
    const completedGoalsCount = goalsRes.filter(g => g.status === 'completed').length;
    const avgGoalProgress = goalsRes.length > 0 
      ? Math.round(goalsRes.reduce((acc, g) => acc + Number(g.progress_pct || 0), 0) / goalsRes.length) 
      : 0;

    // Upcoming active reminders
    const upcomingReminders = await query(
      `SELECT * FROM personal_reminders WHERE user_id = ? AND is_active = 1 AND reminder_date >= ? ORDER BY reminder_date ASC, reminder_time ASC LIMIT 5`,
      [userId, todayStr]
    );

    res.json({
      todayStr,
      monthParam,
      todayStats: {
        total: todayTasks.length,
        completed: completedToday,
        pending: pendingToday,
        overdue: overdueCount,
        habitsTotal: activeHabits.length,
        habitsCompleted: completedHabitsTodayCount,
        streak: currentStreak
      },
      monthlyStats: {
        total: monthTotal,
        completed: monthCompleted,
        pending: monthPending,
        overdue: monthOverdue,
        completionPct
      },
      goalStats: {
        active: activeGoalsCount,
        completed: completedGoalsCount,
        avgProgress: avgGoalProgress
      },
      upcomingReminders,
      monthTasks
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TASK MANAGEMENT CRUD
// ==========================================
router.get('/tasks', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { date, month, filter, priority, status, search } = req.query;

  try {
    let sql = `SELECT * FROM personal_tasks WHERE user_id = ?`;
    const params: any[] = [userId];

    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
    } else if (month) {
      sql += ` AND date LIKE ?`;
      params.push(`${month}%`);
    }

    if (filter === 'today') {
      const todayStr = formatDateStr(new Date());
      sql += ` AND date = '${todayStr}'`;
    } else if (filter === 'overdue') {
      const todayStr = formatDateStr(new Date());
      sql += ` AND date < '${todayStr}' AND status NOT IN ('completed', 'cancelled')`;
    } else if (filter === 'completed') {
      sql += ` AND status = 'completed'`;
    }

    if (priority) {
      sql += ` AND priority = ?`;
      params.push(priority);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ? OR category LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY date ASC, priority DESC, start_time ASC`;
    const tasks = await query(sql, params);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    title, description, date, start_time, end_time,
    priority, category, section, notes, is_recurring, recurrence_rule
  } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }

  try {
    const result = await execute(
      `INSERT INTO personal_tasks (
        user_id, title, description, date, start_time, end_time,
        priority, category, section, notes, is_recurring, recurrence_rule
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, title, description || '', date, start_time || null, end_time || null,
        priority || 'medium', category || 'Personal', section || 'morning',
        notes || '', is_recurring ? 1 : 0, recurrence_rule || null
      ]
    );

    const newTask = await get(`SELECT * FROM personal_tasks WHERE id = ?`, [result.lastID]);
    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  const {
    title, description, date, start_time, end_time,
    priority, category, status, section, notes, is_recurring, recurrence_rule
  } = req.body;

  try {
    const existing = await get(`SELECT id FROM personal_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    if (!existing) return res.status(404).json({ error: 'Task not found.' });

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await execute(
      `UPDATE personal_tasks SET 
        title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
        priority = ?, category = ?, status = ?, section = ?, notes = ?,
        is_recurring = ?, recurrence_rule = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title, description || '', date, start_time || null, end_time || null,
        priority || 'medium', category || 'Personal', status || 'pending',
        section || 'morning', notes || '', is_recurring ? 1 : 0, recurrence_rule || null,
        completedAt, taskId, userId
      ]
    );

    const updated = await get(`SELECT * FROM personal_tasks WHERE id = ?`, [taskId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/tasks/:id/status', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  const { status } = req.body;

  try {
    const existing = await get(`SELECT id FROM personal_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    if (!existing) return res.status(404).json({ error: 'Task not found.' });

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await execute(
      `UPDATE personal_tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [status, completedAt, taskId, userId]
    );

    const updated = await get(`SELECT * FROM personal_tasks WHERE id = ?`, [taskId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  try {
    await execute(`DELETE FROM personal_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. HABIT TRACKER & COMPLETIONS
// ==========================================
router.get('/habits', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const habits = await query(`SELECT * FROM personal_habits WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    const completions = await query(`SELECT * FROM habit_completions WHERE user_id = ?`, [userId]);

    // Attach completions map and calculate streaks per habit
    const result = habits.map((h: any) => {
      const hCompletions = completions.filter((c: any) => c.habit_id === h.id);
      const completionDates = new Set(hCompletions.map((c: any) => c.completed_date));

      let currentStreak = 0;
      let checkDate = new Date();
      for (let i = 0; i < 365; i++) {
        const dStr = formatDateStr(checkDate);
        if (completionDates.has(dStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (i === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      return {
        ...h,
        completions: Array.from(completionDates),
        currentStreak,
        totalCompletions: completionDates.size
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/habits', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, category, frequency, target_days_per_week, color, icon, start_date, reminder_time } = req.body;

  if (!name) return res.status(400).json({ error: 'Habit name is required.' });

  try {
    const result = await execute(
      `INSERT INTO personal_habits (user_id, name, description, category, frequency, target_days_per_week, color, icon, start_date, reminder_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, name, description || '', category || 'Health', frequency || 'daily',
        target_days_per_week || 7, color || '#3B82F6', icon || 'CheckCircle',
        start_date || formatDateStr(new Date()), reminder_time || null
      ]
    );

    const newHabit = await get(`SELECT * FROM personal_habits WHERE id = ?`, [result.lastID]);
    res.status(201).json(newHabit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/habits/:id/toggle', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const habitId = req.params.id;
  const dateStr = req.body.date || formatDateStr(new Date());

  try {
    const existing = await get(
      `SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_date = ?`,
      [habitId, userId, dateStr]
    );

    if (existing) {
      await execute(`DELETE FROM habit_completions WHERE id = ?`, [existing.id]);
      res.json({ habitId: Number(habitId), date: dateStr, completed: false });
    } else {
      await execute(
        `INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES (?, ?, ?)`,
        [habitId, userId, dateStr]
      );
      res.json({ habitId: Number(habitId), date: dateStr, completed: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/habits/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const habitId = req.params.id;

  try {
    await execute(`DELETE FROM personal_habits WHERE id = ? AND user_id = ?`, [habitId, userId]);
    res.json({ message: 'Habit deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PERSONAL GOALS & MILESTONES
// ==========================================
router.get('/goals', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const goals = await query(`SELECT * FROM personal_goals WHERE user_id = ? ORDER BY target_date ASC`, [userId]);
    const milestones = await query(`SELECT * FROM goal_milestones WHERE user_id = ?`, [userId]);

    const result = goals.map((g: any) => {
      const gMilestones = milestones.filter((m: any) => m.goal_id === g.id);
      return {
        ...g,
        milestones: gMilestones
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, description, category, start_date, target_date, progress_pct } = req.body;

  if (!title || !target_date) return res.status(400).json({ error: 'Title and target date required.' });

  try {
    const result = await execute(
      `INSERT INTO personal_goals (user_id, title, description, category, start_date, target_date, progress_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, title, description || '', category || 'Personal',
        start_date || formatDateStr(new Date()), target_date, progress_pct || 0
      ]
    );

    const newGoal = await get(`SELECT * FROM personal_goals WHERE id = ?`, [result.lastID]);
    res.status(201).json({ ...newGoal, milestones: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/goals/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goalId = req.params.id;
  const { title, description, category, target_date, progress_pct, status } = req.body;

  try {
    await execute(
      `UPDATE personal_goals SET title = ?, description = ?, category = ?, target_date = ?, progress_pct = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [title, description, category, target_date, progress_pct, status, goalId, userId]
    );
    const updated = await get(`SELECT * FROM personal_goals WHERE id = ?`, [goalId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/goals/:id/milestones', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goalId = req.params.id;
  const { title, target_date } = req.body;

  if (!title) return res.status(400).json({ error: 'Milestone title is required.' });

  try {
    const result = await execute(
      `INSERT INTO goal_milestones (goal_id, user_id, title, target_date) VALUES (?, ?, ?, ?)`,
      [goalId, userId, title, target_date || null]
    );

    // Auto-update goal progress percentage based on completed milestones
    const allM = await query(`SELECT is_completed FROM goal_milestones WHERE goal_id = ?`, [goalId]);
    const completedM = allM.filter(m => m.is_completed === 1).length;
    const progressPct = allM.length > 0 ? Math.round((completedM / allM.length) * 100) : 0;
    await execute(`UPDATE personal_goals SET progress_pct = ? WHERE id = ?`, [progressPct, goalId]);

    const newMilestone = await get(`SELECT * FROM goal_milestones WHERE id = ?`, [result.lastID]);
    res.status(201).json(newMilestone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/milestones/:id/toggle', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const milestoneId = req.params.id;

  try {
    const existing = await get(`SELECT * FROM goal_milestones WHERE id = ? AND user_id = ?`, [milestoneId, userId]);
    if (!existing) return res.status(404).json({ error: 'Milestone not found.' });

    const newCompleted = existing.is_completed === 1 ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    await execute(
      `UPDATE goal_milestones SET is_completed = ?, completed_at = ? WHERE id = ?`,
      [newCompleted, completedAt, milestoneId]
    );

    // Update goal progress %
    const allM = await query(`SELECT is_completed FROM goal_milestones WHERE goal_id = ?`, [existing.goal_id]);
    const completedM = allM.filter(m => m.is_completed === 1).length;
    const progressPct = allM.length > 0 ? Math.round((completedM / allM.length) * 100) : 0;
    const status = progressPct === 100 ? 'completed' : 'in_progress';
    await execute(`UPDATE personal_goals SET progress_pct = ?, status = ? WHERE id = ?`, [progressPct, status, existing.goal_id]);

    res.json({ id: Number(milestoneId), is_completed: newCompleted, goal_progress: progressPct });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goalId = req.params.id;

  try {
    await execute(`DELETE FROM personal_goals WHERE id = ? AND user_id = ?`, [goalId, userId]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. PERSONAL NOTES
// ==========================================
router.get('/notes', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const notes = await query(
      `SELECT * FROM personal_notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC`,
      [userId]
    );
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, content, category, tags, is_pinned, color } = req.body;

  if (!title) return res.status(400).json({ error: 'Note title is required.' });

  try {
    const result = await execute(
      `INSERT INTO personal_notes (user_id, title, content, category, tags, is_pinned, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, content || '', category || 'General', tags || '', is_pinned ? 1 : 0, color || '#1e293b']
    );
    const newNote = await get(`SELECT * FROM personal_notes WHERE id = ?`, [result.lastID]);
    res.status(201).json(newNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notes/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const noteId = req.params.id;
  const { title, content, category, tags, is_pinned, color } = req.body;

  try {
    await execute(
      `UPDATE personal_notes SET title = ?, content = ?, category = ?, tags = ?, is_pinned = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [title, content, category, tags, is_pinned ? 1 : 0, color, noteId, userId]
    );
    const updated = await get(`SELECT * FROM personal_notes WHERE id = ?`, [noteId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notes/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const noteId = req.params.id;

  try {
    await execute(`DELETE FROM personal_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
    res.json({ message: 'Note deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. REMINDERS & CALENDAR EVENTS
// ==========================================
router.get('/reminders', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const reminders = await query(`SELECT * FROM personal_reminders WHERE user_id = ? ORDER BY reminder_date ASC`, [userId]);
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reminders', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, description, reminder_date, reminder_time, repeat_frequency } = req.body;

  if (!title || !reminder_date) return res.status(400).json({ error: 'Title and date required.' });

  try {
    const result = await execute(
      `INSERT INTO personal_reminders (user_id, title, description, reminder_date, reminder_time, repeat_frequency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, description || '', reminder_date, reminder_time || null, repeat_frequency || 'none']
    );
    const newRem = await get(`SELECT * FROM personal_reminders WHERE id = ?`, [result.lastID]);
    res.status(201).json(newRem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/reminders/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const remId = req.params.id;

  try {
    await execute(`DELETE FROM personal_reminders WHERE id = ? AND user_id = ?`, [remId, userId]);
    res.json({ message: 'Reminder deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { month } = req.query;

  try {
    let sql = `SELECT * FROM personal_events WHERE user_id = ?`;
    const params: any[] = [userId];
    if (month) {
      sql += ` AND event_date LIKE ?`;
      params.push(`${month}%`);
    }
    sql += ` ORDER BY event_date ASC, start_time ASC`;
    const events = await query(sql, params);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, description, event_date, start_time, end_time, location, category, color } = req.body;

  if (!title || !event_date) return res.status(400).json({ error: 'Title and event date required.' });

  try {
    const result = await execute(
      `INSERT INTO personal_events (user_id, title, description, event_date, start_time, end_time, location, category, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description || '', event_date, start_time || null, end_time || null, location || '', category || 'Personal', color || '#8B5CF6']
    );
    const newEv = await get(`SELECT * FROM personal_events WHERE id = ?`, [result.lastID]);
    res.status(201).json(newEv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/events/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const eventId = req.params.id;

  try {
    await execute(`DELETE FROM personal_events WHERE id = ? AND user_id = ?`, [eventId, userId]);
    res.json({ message: 'Event deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. UNIFIED COMMAND CENTER ACTIVITIES API
// ==========================================
router.get('/activities', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { month, date, type, search } = req.query;

  try {
    const activities: any[] = [];
    const todayStr = formatDateStr(new Date());

    // 1. Fetch Tasks (Fixed Color: Pink)
    let taskSql = `SELECT * FROM personal_tasks WHERE user_id = ?`;
    const taskParams: any[] = [userId];
    if (month) {
      taskSql += ` AND date LIKE ?`;
      taskParams.push(`${month}%`);
    } else if (date) {
      taskSql += ` AND date = ?`;
      taskParams.push(date);
    }
    const tasks = await query(taskSql, taskParams);
    tasks.forEach(t => {
      activities.push({
        id: `task-${t.id}`,
        original_id: t.id,
        activity_type: t.category === 'Meetings' ? 'event' : (t.priority === 'critical' ? 'deadline' : 'task'),
        title: t.title,
        description: t.description,
        date: t.date,
        start_time: t.start_time || '09:00',
        end_time: t.end_time || '10:00',
        category: t.category || 'Personal',
        priority: t.priority || 'medium',
        status: t.status || 'pending',
        notes: t.notes || '',
        source_table: 'personal_tasks',
        color: t.priority === 'critical' ? 'red' : (t.category === 'Meetings' ? 'cyan' : 'pink')
      });
    });

    // 2. Fetch Events (Fixed Color: Cyan)
    let evSql = `SELECT * FROM personal_events WHERE user_id = ?`;
    const evParams: any[] = [userId];
    if (month) {
      evSql += ` AND event_date LIKE ?`;
      evParams.push(`${month}%`);
    } else if (date) {
      evSql += ` AND event_date = ?`;
      evParams.push(date);
    }
    const events = await query(evSql, evParams);
    events.forEach(e => {
      activities.push({
        id: `event-${e.id}`,
        original_id: e.id,
        activity_type: 'event',
        title: e.title,
        description: e.description,
        date: e.event_date,
        start_time: e.start_time || '10:00',
        end_time: e.end_time || '11:00',
        category: e.category || 'Personal',
        priority: 'medium',
        status: 'pending',
        source_table: 'personal_events',
        color: 'cyan'
      });
    });

    // 3. Fetch Habits (Fixed Color: Purple)
    const habits = await query(`SELECT * FROM personal_habits WHERE user_id = ?`, [userId]);
    for (const h of habits) {
      const completions = await query(`SELECT completed_date FROM habit_completions WHERE habit_id = ?`, [h.id]);
      const compDates = completions.map(c => c.completed_date);
      activities.push({
        id: `habit-${h.id}`,
        original_id: h.id,
        activity_type: 'habit',
        title: h.name,
        description: h.description,
        date: todayStr,
        start_time: '08:00',
        end_time: '08:30',
        category: h.category || 'Health',
        priority: 'medium',
        status: compDates.includes(todayStr) ? 'completed' : 'pending',
        streak: h.streak || 0,
        source_table: 'personal_habits',
        color: 'purple'
      });
    }

    // 4. Fetch Reminders (Fixed Color: Yellow)
    let remSql = `SELECT * FROM personal_reminders WHERE user_id = ?`;
    const remParams: any[] = [userId];
    if (month) {
      remSql += ` AND reminder_date LIKE ?`;
      remParams.push(`${month}%`);
    } else if (date) {
      remSql += ` AND reminder_date = ?`;
      remParams.push(date);
    }
    const reminders = await query(remSql, remParams);
    reminders.forEach(r => {
      activities.push({
        id: `reminder-${r.id}`,
        original_id: r.id,
        activity_type: 'reminder',
        title: r.title,
        description: r.description,
        date: r.reminder_date,
        start_time: r.reminder_time || '09:00',
        end_time: '09:15',
        category: 'Important',
        priority: 'high',
        status: 'pending',
        source_table: 'personal_reminders',
        color: 'yellow'
      });
    });

    // 5. Fetch Goal Milestones (Fixed Color: Violet)
    const milestones = await query(
      `SELECT m.*, g.title as goal_title, g.category as goal_category 
       FROM goal_milestones m 
       JOIN personal_goals g ON m.goal_id = g.id 
       WHERE g.user_id = ?`,
      [userId]
    );
    milestones.forEach(m => {
      activities.push({
        id: `milestone-${m.id}`,
        original_id: m.id,
        activity_type: 'milestone',
        title: `${m.goal_title}: ${m.title}`,
        description: `Goal Milestone for ${m.goal_title}`,
        date: m.target_date || todayStr,
        start_time: '14:00',
        end_time: '15:00',
        category: m.goal_category || 'Career',
        priority: 'high',
        status: m.is_completed === 1 ? 'completed' : 'pending',
        source_table: 'goal_milestones',
        color: 'violet'
      });
    });

    // Filter by type if provided
    let resultActivities = activities;
    if (type && type !== 'all') {
      resultActivities = resultActivities.filter(a => a.activity_type === type);
    }

    // Filter by search string if provided
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase();
      resultActivities = resultActivities.filter(a => 
        (a.title || '').toLowerCase().includes(q) || 
        (a.description || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q)
      );
    }

    res.json(resultActivities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Universal Activity Creation Endpoint
router.post('/activities', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    activity_type, title, description, date, start_time, end_time, 
    category, priority, repeat_frequency, notes 
  } = req.body;

  if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });

  try {
    if (activity_type === 'event' || activity_type === 'personal') {
      const result = await execute(
        `INSERT INTO personal_events (user_id, title, description, event_date, start_time, end_time, category, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description || '', date, start_time || '10:00', end_time || '11:00', category || 'Personal', '#14b8a6']
      );
      return res.status(201).json({ id: result.lastID, message: 'Event created' });
    } else if (activity_type === 'habit') {
      const result = await execute(
        `INSERT INTO personal_habits (user_id, name, description, category, frequency, color, start_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description || '', category || 'Health', repeat_frequency || 'daily', '#a855f7', date]
      );
      return res.status(201).json({ id: result.lastID, message: 'Habit created' });
    } else if (activity_type === 'reminder') {
      const result = await execute(
        `INSERT INTO personal_reminders (user_id, title, description, reminder_date, reminder_time, repeat_frequency)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, title, description || '', date, start_time || '09:00', repeat_frequency || 'none']
      );
      return res.status(201).json({ id: result.lastID, message: 'Reminder created' });
    } else {
      // Default: TASK, DEADLINE, MILESTONE
      const result = await execute(
        `INSERT INTO personal_tasks (user_id, title, description, date, start_time, end_time, priority, category, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description || '', date, start_time || '09:00', end_time || '10:00', priority || 'medium', category || 'Personal', notes || '']
      );
      return res.status(201).json({ id: result.lastID, message: 'Task created' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Activity Status or Date/Time (Bi-directional Sync)
router.patch('/activities/:type/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { type, id } = req.params;
  const { status, date, start_time, end_time } = req.body;

  try {
    if (type === 'personal_tasks' || type === 'task') {
      if (status !== undefined) {
        await execute(`UPDATE personal_tasks SET status = ? WHERE id = ? AND user_id = ?`, [status, id, userId]);
      }
      if (date) {
        await execute(`UPDATE personal_tasks SET date = ? WHERE id = ? AND user_id = ?`, [date, id, userId]);
      }
      if (start_time) {
        await execute(`UPDATE personal_tasks SET start_time = ?, end_time = ? WHERE id = ? AND user_id = ?`, [start_time, end_time || null, id, userId]);
      }
    } else if (type === 'personal_events' || type === 'event') {
      if (date) {
        await execute(`UPDATE personal_events SET event_date = ? WHERE id = ? AND user_id = ?`, [date, id, userId]);
      }
      if (start_time) {
        await execute(`UPDATE personal_events SET start_time = ?, end_time = ? WHERE id = ? AND user_id = ?`, [start_time, end_time || null, id, userId]);
      }
    } else if (type === 'personal_habits' || type === 'habit') {
      const todayStr = formatDateStr(new Date());
      const existing = await get(`SELECT id FROM habit_completions WHERE user_id = ? AND habit_id = ? AND completed_date = ?`, [userId, id, todayStr]);
      if (existing) {
        await execute(`DELETE FROM habit_completions WHERE id = ?`, [existing.id]);
      } else {
        await execute(`INSERT INTO habit_completions (user_id, habit_id, completed_date) VALUES (?, ?, ?)`, [userId, id, todayStr]);
      }
    } else if (type === 'personal_reminders' || type === 'reminder') {
      if (date) {
        await execute(`UPDATE personal_reminders SET reminder_date = ? WHERE id = ? AND user_id = ?`, [date, id, userId]);
      }
    } else if (type === 'goal_milestones' || type === 'milestone') {
      const isComp = status === 'completed' ? 1 : 0;
      await execute(`UPDATE goal_milestones SET is_completed = ? WHERE id = ?`, [isComp, id]);
      
      // Recalculate parent Goal Progress
      const milestone = await get(`SELECT goal_id FROM goal_milestones WHERE id = ?`, [id]);
      if (milestone) {
        const allMs = await query(`SELECT is_completed FROM goal_milestones WHERE goal_id = ?`, [milestone.goal_id]);
        if (allMs.length > 0) {
          const compMs = allMs.filter(m => m.is_completed === 1).length;
          const newPct = Math.round((compMs / allMs.length) * 100);
          await execute(`UPDATE personal_goals SET progress_pct = ? WHERE id = ?`, [newPct, milestone.goal_id]);
        }
      }
    }
    res.json({ message: 'Activity updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Activity
router.delete('/activities/:type/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { type, id } = req.params;

  try {
    if (type === 'personal_tasks' || type === 'task') {
      await execute(`DELETE FROM personal_tasks WHERE id = ? AND user_id = ?`, [id, userId]);
    } else if (type === 'personal_events' || type === 'event') {
      await execute(`DELETE FROM personal_events WHERE id = ? AND user_id = ?`, [id, userId]);
    } else if (type === 'personal_habits' || type === 'habit') {
      await execute(`DELETE FROM personal_habits WHERE id = ? AND user_id = ?`, [id, userId]);
      await execute(`DELETE FROM habit_completions WHERE habit_id = ? AND user_id = ?`, [id, userId]);
    } else if (type === 'personal_reminders' || type === 'reminder') {
      await execute(`DELETE FROM personal_reminders WHERE id = ? AND user_id = ?`, [id, userId]);
    } else if (type === 'goal_milestones' || type === 'milestone') {
      await execute(`DELETE FROM goal_milestones WHERE id = ?`, [id]);
    }
    res.json({ message: 'Activity deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reschedule All Overdue Items to Today
router.post('/overdue/reschedule-all', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const todayStr = formatDateStr(new Date());

  try {
    await execute(
      `UPDATE personal_tasks SET date = ? WHERE user_id = ? AND date < ? AND status NOT IN ('completed', 'cancelled')`,
      [todayStr, userId, todayStr]
    );
    res.json({ message: 'All overdue items rescheduled to today' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


