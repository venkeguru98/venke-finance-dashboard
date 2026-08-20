import { Router, Request, Response } from 'express';
import { query, execute } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Protect all planner endpoints
router.use(authMiddleware);

// ─── 1. SUMMARY BADGE COUNTS ──────────────────────────────────────────────────
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().slice(0, 10);

    const overdueRows = await query(
      `SELECT COUNT(*) as cnt FROM planner_tasks WHERE user_id = ? AND status != 'completed' AND due_at < ?`,
      [userId, nowIso]
    );
    const todayRows = await query(
      `SELECT COUNT(*) as cnt FROM planner_tasks WHERE user_id = ? AND status != 'completed' AND (CAST(due_at AS TEXT) LIKE ? OR due_at >= ?)`,
      [userId, `${todayStr}%`, `${todayStr}T00:00:00`]
    );
    const reminderRows = await query(
      `SELECT COUNT(*) as cnt FROM planner_reminders WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    const overdueCount = parseInt(overdueRows[0]?.cnt || overdueRows[0]?.count || '0', 10);
    const todayCount = parseInt(todayRows[0]?.cnt || todayRows[0]?.count || '0', 10);
    const importantRemindersCount = parseInt(reminderRows[0]?.cnt || reminderRows[0]?.count || '0', 10);

    res.json({
      overdueCount,
      todayCount,
      importantRemindersCount,
      hasNotifications: overdueCount > 0 || todayCount > 0
    });
  } catch (err: any) {
    console.error('[Planner API Error /summary]:', err.message);
    res.status(500).json({ error: 'Failed to fetch planner summary' });
  }
});

// ─── 2. TASKS API ─────────────────────────────────────────────────────────────
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const tasks = await query(
      `SELECT * FROM planner_tasks WHERE user_id = ? ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, priority DESC, due_at ASC, id DESC`,
      [userId]
    );
    res.json(tasks);
  } catch (err: any) {
    console.error('[Planner API Error GET /tasks]:', err.message);
    res.status(500).json({ error: 'Failed to fetch planner tasks' });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const {
      title,
      description = '',
      status = 'todo',
      priority = 'medium',
      due_at = null,
      reminder_at = null,
      recurring_rule = 'none',
      tags = '',
      notes = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    await execute(
      `INSERT INTO planner_tasks (user_id, title, description, status, priority, due_at, reminder_at, recurring_rule, tags, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title.trim(), description, status, priority, due_at, reminder_at, recurring_rule, tags, notes]
    );

    const newTasks = await query(
      `SELECT * FROM planner_tasks WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );
    res.status(201).json(newTasks[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error POST /tasks]:', err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const taskId = req.params.id;
    const {
      title,
      description = '',
      status = 'todo',
      priority = 'medium',
      due_at = null,
      reminder_at = null,
      recurring_rule = 'none',
      tags = '',
      notes = ''
    } = req.body;

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await execute(
      `UPDATE planner_tasks 
       SET title = ?, description = ?, status = ?, priority = ?, due_at = ?, reminder_at = ?, recurring_rule = ?, tags = ?, notes = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, description, status, priority, due_at, reminder_at, recurring_rule, tags, notes, completedAt, taskId, userId]
    );

    const updated = await query(`SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error PUT /tasks/:id]:', err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.patch('/tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const taskId = req.params.id;
    const { completed = true } = req.body;
    const newStatus = completed ? 'completed' : 'todo';
    const completedAt = completed ? new Date().toISOString() : null;

    await execute(
      `UPDATE planner_tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [newStatus, completedAt, taskId, userId]
    );

    const updated = await query(`SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error PATCH /tasks/:id/complete]:', err.message);
    res.status(500).json({ error: 'Failed to toggle task completion' });
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const taskId = req.params.id;
    await execute(`DELETE FROM planner_tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
    res.json({ success: true, id: taskId });
  } catch (err: any) {
    console.error('[Planner API Error DELETE /tasks/:id]:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ─── 3. STICKY NOTES API ──────────────────────────────────────────────────────
router.get('/notes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const notes = await query(
      `SELECT * FROM planner_notes WHERE user_id = ? AND archived = 0 ORDER BY pinned DESC, updated_at DESC, id DESC`,
      [userId]
    );
    res.json(notes);
  } catch (err: any) {
    console.error('[Planner API Error GET /notes]:', err.message);
    res.status(500).json({ error: 'Failed to fetch planner notes' });
  }
});

router.post('/notes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const {
      title,
      content = '',
      color = 'default',
      priority = 'normal',
      pinned = 0,
      reminder_at = null,
      tags = '',
      checklist = '[]',
      rotation = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required' });
    }

    const jsonChecklist = typeof checklist === 'string' ? checklist : JSON.stringify(checklist || []);

    await execute(
      `INSERT INTO planner_notes (user_id, title, content, color, priority, pinned, reminder_at, tags, checklist, rotation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title.trim(), content, color, priority, pinned ? 1 : 0, reminder_at, tags, jsonChecklist, rotation || 0]
    );

    const newNotes = await query(
      `SELECT * FROM planner_notes WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );
    res.status(201).json(newNotes[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error POST /notes]:', err.message);
    res.status(500).json({ error: 'Failed to create sticky note' });
  }
});

router.put('/notes/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const noteId = req.params.id;
    const {
      title,
      content = '',
      color = 'default',
      priority = 'normal',
      pinned = 0,
      archived = 0,
      reminder_at = null,
      tags = '',
      checklist = '[]',
      rotation = 0
    } = req.body;

    const jsonChecklist = typeof checklist === 'string' ? checklist : JSON.stringify(checklist || []);

    await execute(
      `UPDATE planner_notes 
       SET title = ?, content = ?, color = ?, priority = ?, pinned = ?, archived = ?, reminder_at = ?, tags = ?, checklist = ?, rotation = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, content, color, priority, pinned ? 1 : 0, archived ? 1 : 0, reminder_at, tags, jsonChecklist, rotation || 0, noteId, userId]
    );

    const updated = await query(`SELECT * FROM planner_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error PUT /notes/:id]:', err.message);
    res.status(500).json({ error: 'Failed to update sticky note' });
  }
});

router.patch('/notes/:id/pin', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const noteId = req.params.id;
    const { pinned } = req.body;

    await execute(
      `UPDATE planner_notes SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [pinned ? 1 : 0, noteId, userId]
    );

    const updated = await query(`SELECT * FROM planner_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error PATCH /notes/:id/pin]:', err.message);
    res.status(500).json({ error: 'Failed to pin note' });
  }
});

router.post('/notes/:id/convert-to-task', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const noteId = req.params.id;

    const notes = await query(`SELECT * FROM planner_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
    if (!notes || notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = notes[0];
    await execute(
      `INSERT INTO planner_tasks (user_id, title, description, status, priority, tags)
       VALUES (?, ?, ?, 'todo', 'medium', ?)`,
      [userId, note.title, note.content || '', note.tags || '']
    );

    // Archive the note
    await execute(`UPDATE planner_notes SET archived = 1 WHERE id = ? AND user_id = ?`, [noteId, userId]);

    res.json({ success: true, message: 'Converted sticky note to task successfully' });
  } catch (err: any) {
    console.error('[Planner API Error POST /notes/:id/convert-to-task]:', err.message);
    res.status(500).json({ error: 'Failed to convert note to task' });
  }
});

router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const noteId = req.params.id;
    await execute(`DELETE FROM planner_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
    res.json({ success: true, id: noteId });
  } catch (err: any) {
    console.error('[Planner API Error DELETE /notes/:id]:', err.message);
    res.status(500).json({ error: 'Failed to delete sticky note' });
  }
});

// ─── 4. REMINDERS API ─────────────────────────────────────────────────────────
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const reminders = await query(
      `SELECT * FROM planner_reminders WHERE user_id = ? AND status = 'pending' ORDER BY reminder_at ASC`,
      [userId]
    );
    res.json(reminders);
  } catch (err: any) {
    console.error('[Planner API Error GET /reminders]:', err.message);
    res.status(500).json({ error: 'Failed to fetch planner reminders' });
  }
});

router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const { title, reminder_at, recurring_rule = 'none' } = req.body;

    if (!title || !reminder_at) {
      return res.status(400).json({ error: 'Title and reminder_at time are required' });
    }

    await execute(
      `INSERT INTO planner_reminders (user_id, title, reminder_at, recurring_rule, status) VALUES (?, ?, ?, ?, 'pending')`,
      [userId, title.trim(), reminder_at, recurring_rule]
    );

    const created = await query(`SELECT * FROM planner_reminders WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId]);
    res.status(201).json(created[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error POST /reminders]:', err.message);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.delete('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const reminderId = req.params.id;
    await execute(`DELETE FROM planner_reminders WHERE id = ? AND user_id = ?`, [reminderId, userId]);
    res.json({ success: true, id: reminderId });
  } catch (err: any) {
    console.error('[Planner API Error DELETE /reminders/:id]:', err.message);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// ─── 5. GOALS API ─────────────────────────────────────────────────────────────
router.get('/goals', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const goals = await query(
      `SELECT * FROM planner_goals WHERE user_id = ? ORDER BY status ASC, created_at DESC`,
      [userId]
    );
    res.json(goals);
  } catch (err: any) {
    console.error('[Planner API Error GET /goals]:', err.message);
    res.status(500).json({ error: 'Failed to fetch planner goals' });
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const {
      title,
      category = 'personal',
      target_description = '',
      deadline = null,
      progress = 0,
      notes = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Goal title is required' });
    }

    await execute(
      `INSERT INTO planner_goals (user_id, title, category, target_description, deadline, progress, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [userId, title.trim(), category, target_description, deadline, progress || 0, notes]
    );

    const created = await query(`SELECT * FROM planner_goals WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId]);
    res.status(201).json(created[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error POST /goals]:', err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const goalId = req.params.id;
    const {
      title,
      category = 'personal',
      target_description = '',
      deadline = null,
      progress = 0,
      notes = '',
      status = 'active'
    } = req.body;

    await execute(
      `UPDATE planner_goals 
       SET title = ?, category = ?, target_description = ?, deadline = ?, progress = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, category, target_description, deadline, progress, notes, status, goalId, userId]
    );

    const updated = await query(`SELECT * FROM planner_goals WHERE id = ? AND user_id = ?`, [goalId, userId]);
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('[Planner API Error PUT /goals/:id]:', err.message);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const goalId = req.params.id;
    await execute(`DELETE FROM planner_goals WHERE id = ? AND user_id = ?`, [goalId, userId]);
    res.json({ success: true, id: goalId });
  } catch (err: any) {
    console.error('[Planner API Error DELETE /goals/:id]:', err.message);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ─── 6. SMART PLANNING ASSISTANT ("Plan My Day") ─────────────────────────────
router.post('/smart-plan', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1;
    const pendingTasks = await query(
      `SELECT * FROM planner_tasks WHERE user_id = ? AND status != 'completed' ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, due_at ASC`,
      [userId]
    );

    if (!pendingTasks || pendingTasks.length === 0) {
      return res.json({
        hasTasks: false,
        message: "Your schedule is clear! Enjoy your day or capture new ideas.",
        suggestions: []
      });
    }

    // Assign realistic time slots starting from 09:30 AM
    let currentHour = 9;
    let currentMin = 30;

    const suggestions = pendingTasks.map((t: any) => {
      const timeSlotStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} ${currentHour >= 12 ? 'PM' : 'AM'}`;
      currentMin += 45;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin -= 60;
      }

      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        suggestedTime: timeSlotStr,
        reason: t.priority === 'urgent' || t.priority === 'high' ? 'High Priority Focus' : 'Standard Routine Task'
      };
    });

    res.json({
      hasTasks: true,
      message: `Analyzed ${pendingTasks.length} tasks and created your suggested focus flow for today.`,
      suggestions
    });
  } catch (err: any) {
    console.error('[Planner API Error POST /smart-plan]:', err.message);
    res.status(500).json({ error: 'Failed to generate smart daily plan' });
  }
});

export default router;
