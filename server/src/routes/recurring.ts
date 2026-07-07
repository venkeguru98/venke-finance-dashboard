import { Router, Request, Response } from 'express';
import { query, execute, get } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Secure all endpoints in this router
router.use(authMiddleware);

// Helper to calculate the next billing date
function calculateNextDate(currentDateStr: string, frequency: string): string {
  const date = new Date(currentDateStr);
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

  switch (frequency.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Fallback to monthly
  }
  return date.toISOString().slice(0, 10);
}

// ─── GET /api/recurring-rules ──────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const rules = await query(
      `SELECT r.*, c.name as category_name, c.color as category_color 
       FROM recurring_rules r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.next_date ASC`,
      [req.user!.id]
    );
    res.json(rules);
  } catch (error: any) {
    console.error('[Recurring Rules Fetch Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/recurring-rules ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { name, amount, type, category_id, payment_method, frequency, next_date } = req.body;
  if (!name || !amount || !type || !category_id || !payment_method || !frequency || !next_date) {
    return res.status(400).json({ error: 'Missing required bill fields.' });
  }

  try {
    const result = await execute(
      `INSERT INTO recurring_rules (user_id, name, amount, type, category_id, payment_method, frequency, next_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, name, amount, type, category_id, payment_method, frequency, next_date]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    console.error('[Recurring Rule Create Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT /api/recurring-rules/:id ──────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { name, amount, type, category_id, payment_method, frequency, next_date } = req.body;
  try {
    await execute(
      `UPDATE recurring_rules SET name=?, amount=?, type=?, category_id=?, payment_method=?, frequency=?, next_date=? 
       WHERE id=? AND user_id=?`,
      [name, amount, type, category_id, payment_method, frequency, next_date, req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Recurring Rule Update Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/recurring-rules/:id ───────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await execute(
      'DELETE FROM recurring_rules WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Recurring Rule Delete Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/recurring-rules/:id/trigger ─────────────────────────────────
router.post('/:id/trigger', async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const { id } = req.params;

  try {
    // 1. Get the rule details
    const rule = await get('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?', [id, uid]);
    if (!rule) {
      return res.status(404).json({ error: 'Recurring bill not found.' });
    }

    const currentTriggerDate = rule.next_date;
    const todayStr = new Date().toISOString().slice(0, 10);

    // 2. Insert into transactions
    const note = `Auto-paid: ${rule.name} (${rule.frequency})`;
    await execute(
      `INSERT INTO transactions (user_id, date, amount, type, category_id, payment_method, notes, recurring_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, currentTriggerDate, rule.amount, rule.type, rule.category_id, rule.payment_method, note, rule.id]
    );

    // 3. Calculate next run date
    const nextDate = calculateNextDate(currentTriggerDate, rule.frequency);

    // 4. Update the rule's status
    await execute(
      'UPDATE recurring_rules SET last_triggered = ?, next_date = ? WHERE id = ? AND user_id = ?',
      [todayStr, nextDate, rule.id, uid]
    );

    res.json({ success: true, next_date: nextDate });
  } catch (error: any) {
    console.error('[Recurring Rule Trigger Error]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
