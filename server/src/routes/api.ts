import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { query, execute, get, closeDatabase, reopenDatabase } from '../database';
import { authMiddleware } from '../middleware/auth';
import os from 'os';

const router = Router();

// ─── Apply JWT auth to ALL routes in this router ──────────────────────────
router.use(authMiddleware);

// ─── Cloudinary Setup (with local disk fallback) ──────────────────────────
const CLOUDINARY_ENABLED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('[Storage] Cloudinary cloud storage enabled.');
} else {
  console.log('[Storage] Using local disk storage (set CLOUDINARY_* env vars for cloud storage).');
}

// ─── Multer Storage Config ────────────────────────────────────────────────
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});

// Always buffer in memory when Cloudinary is enabled; otherwise disk
const upload = CLOUDINARY_ENABLED
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
  : multer({ storage: diskStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: upload a file buffer to Cloudinary or save to disk
async function storeFile(req: any, userId: number): Promise<string | null> {
  if (!req.file) return null;

  if (CLOUDINARY_ENABLED) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `venke-finance/${userId}/receipts`,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || null);
        }
      );
      stream.end(req.file.buffer);
    });
  } else {
    // Local disk — file already saved by multer
    return `/uploads/${req.file.filename}`;
  }
}

// ─── Helper: local file path from URL ────────────────────────────────────
function getLocalPath(filePath: string): string {
  return path.resolve(__dirname, '../../../', filePath.replace(/^\//, ''));
}

// ─── Backup dir ───────────────────────────────────────────────────────────
const backupsDir = path.resolve(__dirname, '../../../backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

function getLocalIpAddress() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

// ════════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════════
router.get('/categories', async (req, res) => {
  try {
    // Return global categories (user_id IS NULL) plus user's own categories
    const categories = await query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type, name',
      [req.user!.id]
    );
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required.' });
  try {
    const result = await execute(
      'INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)',
      [req.user!.id, name, type, color || '#6B7280']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await execute('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ════════════════════════════════════════════════════════════════
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC
       LIMIT 500`,
      [req.user!.id]
    );
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/transactions', async (req, res) => {
  const { date, amount, type, category_id, payment_method, notes, tags } = req.body;
  if (!date || !amount || !type || !category_id || !payment_method) {
    return res.status(400).json({ error: 'Missing required transaction fields.' });
  }
  try {
    const result = await execute(
      `INSERT INTO transactions (user_id, date, amount, type, category_id, payment_method, notes, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, date, amount, type, category_id, payment_method, notes || '', tags || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/transactions/:id', async (req, res) => {
  const { date, amount, type, category_id, payment_method, notes } = req.body;
  try {
    await execute(
      `UPDATE transactions SET date=?, amount=?, type=?, category_id=?, payment_method=?, notes=? 
       WHERE id=? AND user_id=?`,
      [date, amount, type, category_id, payment_method, notes || '', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    await execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  ANALYTICS
// ════════════════════════════════════════════════════════════════
router.get('/analytics/summary', async (req, res) => {
  const uid = req.user!.id;
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '%';
    const [incomeRes, expenseRes, savingsRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income' AND date LIKE ?`, [uid, currentMonth]),
      query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense' AND date LIKE ?`, [uid, currentMonth]),
      query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='savings' AND date LIKE ?`, [uid, currentMonth]),
    ]);
    const income = incomeRes[0]?.total || 0;
    const expenses = expenseRes[0]?.total || 0;
    const savings = savingsRes[0]?.total || 0;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    res.json({ income, expenses, savings, balance: income - expenses - savings, savingsRate: parseFloat(savingsRate.toFixed(1)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/charts', async (req, res) => {
  const uid = req.user!.id;
  try {
    const categoryResult = await query(
      `SELECT c.name, c.color, COALESCE(SUM(t.amount),0) as value
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
       GROUP BY c.id, c.name, c.color
       ORDER BY value DESC LIMIT 8`,
      [uid]
    );

    const monthlyResult = await query(
      `SELECT 
         strftime('%Y-%m', date) as month_raw,
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
         COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense,
         COALESCE(SUM(CASE WHEN type='savings' THEN amount ELSE 0 END),0) as savings
       FROM transactions WHERE user_id = ?
       GROUP BY month_raw ORDER BY month_raw DESC LIMIT 12`,
      [uid]
    );

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const formattedMonthly = monthlyResult.reverse().map((row: any) => {
      const monthIndex = parseInt(row.month_raw.split('-')[1], 10) - 1;
      return { name: months[monthIndex], income: row.income, expense: row.expense, savings: row.savings };
    });
    res.json({ categories: categoryResult, monthly: formattedMonthly });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/calendar', async (req, res) => {
  const uid = req.user!.id;
  try {
    const monthParam = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const calendarResult = await query(
      `SELECT 
         strftime('%d', date) as day_str,
         COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense,
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
         GROUP_CONCAT(notes || ' (₹' || amount || ')', '||') as details
       FROM transactions WHERE user_id = ? AND date LIKE ?
       GROUP BY day_str`,
      [uid, `${monthParam}%`]
    );
    const expenseDays: Record<number, any> = {};
    calendarResult.forEach((row: any) => {
      const dayNum = parseInt(row.day_str, 10);
      expenseDays[dayNum] = {
        expense: row.expense, income: row.income,
        isHigh: row.expense > 5000,
        details: row.details ? row.details.split('||') : [],
      };
    });
    res.json(expenseDays);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  BUDGETS
// ════════════════════════════════════════════════════════════════
router.get('/budgets', async (req, res) => {
  const uid = req.user!.id;
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : (now.getMonth() + 1);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const currentMonth = `${year}-${String(month).padStart(2, '0')}%`;

    const budgets = await query(
      `SELECT b.*, c.name as category_name, c.color as category_color,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t 
           WHERE t.category_id = b.category_id AND t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
         ), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?`,
      [uid, currentMonth, uid, month, year]
    );
    res.json(budgets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/budgets', async (req, res) => {
  const uid = req.user!.id;
  const { category_id, limit_amount, month, year } = req.body;
  const now = new Date();
  const targetMonth = month ? parseInt(month, 10) : (now.getMonth() + 1);
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();
  if (!limit_amount || limit_amount <= 0) return res.status(400).json({ error: 'Budget limit must be greater than zero.' });
  try {
    const existing = await query(
      'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [uid, category_id, targetMonth, targetYear]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'A budget for this category already exists this month.' });
    const result = await execute(
      'INSERT INTO budgets (user_id, category_id, limit_amount, month, year) VALUES (?, ?, ?, ?, ?)',
      [uid, category_id, limit_amount, targetMonth, targetYear]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/budgets/:id', async (req, res) => {
  const { limit_amount } = req.body;
  if (!limit_amount || limit_amount <= 0) return res.status(400).json({ error: 'Budget limit must be greater than zero.' });
  try {
    await execute('UPDATE budgets SET limit_amount=? WHERE id=? AND user_id=?', [limit_amount, req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/budgets/:id', async (req, res) => {
  try {
    await execute('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  GOALS
// ════════════════════════════════════════════════════════════════
router.get('/goals', async (req, res) => {
  try {
    const goals = await query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.user!.id]);
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/goals', async (req, res) => {
  const { name, target_amount, current_saved, deadline } = req.body;
  try {
    const result = await execute(
      'INSERT INTO goals (user_id, name, target_amount, current_saved, deadline) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, name, target_amount, current_saved || 0, deadline]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/goals/:id', async (req, res) => {
  const { name, target_amount, current_saved, deadline, status } = req.body;
  try {
    await execute(
      'UPDATE goals SET name=?, target_amount=?, current_saved=?, deadline=?, status=? WHERE id=? AND user_id=?',
      [name, target_amount, current_saved, deadline, status || 'active', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/goals/:id', async (req, res) => {
  try {
    await execute('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  IMPORT
// ════════════════════════════════════════════════════════════════
router.post('/import', async (req, res) => {
  const uid = req.user!.id;
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) return res.status(400).json({ error: 'Expected an array of transactions.' });
  try {
    let inserted = 0;
    for (const t of transactions) {
      let catId = 15;
      let type = t.amount >= 0 ? 'income' : 'expense';
      const cat = await query("SELECT id, type FROM categories WHERE name LIKE ? LIMIT 1", [`%${t.category}%`]);
      if (cat.length > 0) {
        catId = cat[0].id;
        type = cat[0].type;
      }
      const absAmount = Math.abs(t.amount);
      const date = t.date ? new Date(t.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      await execute(
        'INSERT INTO transactions (user_id, date, amount, type, category_id, payment_method, notes, is_imported) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [uid, date, absAmount, type, catId, t.payment_method || 'Bank Transfer', t.description || '']
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  FINANCIAL RECORDS — DEBTS & LOANS
// ════════════════════════════════════════════════════════════════
router.get('/debts', async (req, res) => {
  try {
    const data = await query('SELECT * FROM debts_loans WHERE user_id = ? ORDER BY date DESC', [req.user!.id]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/debts', async (req, res) => {
  const { person_name, amount, type, date, due_date, status, notes } = req.body;
  try {
    const result = await execute(
      'INSERT INTO debts_loans (user_id, person_name, amount, type, date, due_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user!.id, person_name, amount, type, date, due_date || null, status || 'pending', notes || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/debts/:id', async (req, res) => {
  const { person_name, amount, type, date, due_date, status, notes } = req.body;
  try {
    await execute(
      'UPDATE debts_loans SET person_name=?, amount=?, type=?, date=?, due_date=?, status=?, notes=? WHERE id=? AND user_id=?',
      [person_name, amount, type, date, due_date || null, status, notes || '', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/debts/:id', async (req, res) => {
  try {
    await execute('DELETE FROM debts_loans WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  DEPOSITS
// ════════════════════════════════════════════════════════════════
router.get('/deposits', async (req, res) => {
  try {
    const data = await query('SELECT * FROM deposits WHERE user_id = ? ORDER BY start_date DESC', [req.user!.id]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposits', async (req, res) => {
  const { name, category, monthly_amount, total_amount_paid, start_date, maturity_date, status, notes } = req.body;
  try {
    const result = await execute(
      'INSERT INTO deposits (user_id, name, category, monthly_amount, total_amount_paid, start_date, maturity_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user!.id, name, category, monthly_amount || 0, total_amount_paid || 0, start_date, maturity_date || null, status || 'active', notes || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/deposits/:id', async (req, res) => {
  const { name, category, monthly_amount, total_amount_paid, start_date, maturity_date, status, notes } = req.body;
  try {
    await execute(
      'UPDATE deposits SET name=?, category=?, monthly_amount=?, total_amount_paid=?, start_date=?, maturity_date=?, status=?, notes=? WHERE id=? AND user_id=?',
      [name, category, monthly_amount || 0, total_amount_paid || 0, start_date, maturity_date || null, status, notes || '', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/deposits/:id', async (req, res) => {
  try {
    await execute('DELETE FROM deposits WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  MONEY TRANSFERS
// ════════════════════════════════════════════════════════════════
router.get('/transfers', async (req, res) => {
  try {
    const data = await query('SELECT * FROM money_transfers WHERE user_id = ? ORDER BY date DESC', [req.user!.id]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/transfers', async (req, res) => {
  const { from_account, to_account, amount, date, purpose, notes } = req.body;
  try {
    const result = await execute(
      'INSERT INTO money_transfers (user_id, from_account, to_account, amount, date, purpose, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user!.id, from_account, to_account, amount, date, purpose || '', notes || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/transfers/:id', async (req, res) => {
  const { from_account, to_account, amount, date, purpose, notes } = req.body;
  try {
    await execute(
      'UPDATE money_transfers SET from_account=?, to_account=?, amount=?, date=?, purpose=?, notes=? WHERE id=? AND user_id=?',
      [from_account, to_account, amount, date, purpose || '', notes || '', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/transfers/:id', async (req, res) => {
  try {
    await execute('DELETE FROM money_transfers WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  CHIT FUNDS
// ════════════════════════════════════════════════════════════════
router.get('/chit-funds', async (req, res) => {
  try {
    const data = await query('SELECT * FROM chit_funds WHERE user_id = ? ORDER BY start_date DESC', [req.user!.id]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chit-funds', async (req, res) => {
  const { name, monthly_amount, total_paid, remaining_installments, start_date, end_date, status, notes } = req.body;
  try {
    const result = await execute(
      'INSERT INTO chit_funds (user_id, name, monthly_amount, total_paid, remaining_installments, start_date, end_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user!.id, name, monthly_amount, total_paid || 0, remaining_installments, start_date, end_date, status || 'active', notes || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chit-funds/:id', async (req, res) => {
  const { name, monthly_amount, total_paid, remaining_installments, start_date, end_date, status, notes } = req.body;
  try {
    await execute(
      'UPDATE chit_funds SET name=?, monthly_amount=?, total_paid=?, remaining_installments=?, start_date=?, end_date=?, status=?, notes=? WHERE id=? AND user_id=?',
      [name, monthly_amount, total_paid || 0, remaining_installments, start_date, end_date, status, notes || '', req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chit-funds/:id', async (req, res) => {
  try {
    await execute('DELETE FROM chit_funds WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  PERSONAL NOTES
// ════════════════════════════════════════════════════════════════
router.get('/notes', async (req, res) => {
  try {
    const data = await query(
      'SELECT * FROM personal_notes WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC',
      [req.user!.id]
    );
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notes', async (req, res) => {
  const { title, content, is_pinned } = req.body;
  try {
    const result = await execute(
      'INSERT INTO personal_notes (user_id, title, content, is_pinned) VALUES (?, ?, ?, ?)',
      [req.user!.id, title || '', content, is_pinned ? 1 : 0]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notes/:id', async (req, res) => {
  const { title, content, is_pinned } = req.body;
  try {
    await execute(
      'UPDATE personal_notes SET title=?, content=?, is_pinned=? WHERE id=? AND user_id=?',
      [title || '', content, is_pinned ? 1 : 0, req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    await execute('DELETE FROM personal_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  DOCUMENTS (with Cloudinary)
// ════════════════════════════════════════════════════════════════
router.get('/documents', async (req, res) => {
  try {
    const data = await query('SELECT * FROM documents WHERE user_id = ? ORDER BY upload_date DESC', [req.user!.id]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/documents', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const file_path = await storeFile(req, req.user!.id);
    const name = req.body.name || req.file.originalname;
    const file_type = req.file.mimetype;
    const upload_date = new Date().toISOString().slice(0, 10);
    const result = await execute(
      'INSERT INTO documents (user_id, name, file_path, file_type, upload_date) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, name, file_path, file_type, upload_date]
    );
    res.json({ success: true, id: result.lastID, file_path });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await get('SELECT file_path FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    if (doc && doc.file_path && !doc.file_path.startsWith('http')) {
      const fullPath = getLocalPath(doc.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await execute('DELETE FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  LEDGER ENTRIES (with Cloudinary)
// ════════════════════════════════════════════════════════════════
router.get('/ledger-entries', async (req, res) => {
  const { record_type, record_id } = req.query;
  try {
    let sql = 'SELECT * FROM ledger_entries';
    const params: any[] = [];
    if (record_type && record_id) {
      sql += ' WHERE record_type = ? AND record_id = ?';
      params.push(record_type, Number(record_id));
    }
    sql += ' ORDER BY payment_date DESC';
    const entries = await query(sql, params);
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to sync parent aggregates after ledger changes
async function syncParent(record_type: string, record_id: number) {
  if (record_type === 'deposit') {
    await execute(
      `UPDATE deposits SET total_amount_paid = COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE record_type='deposit' AND record_id=?),0) WHERE id=?`,
      [record_id, record_id]
    );
  } else if (record_type === 'chit') {
    await execute(
      `UPDATE chit_funds SET total_paid = COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE record_type='chit' AND record_id=?),0) WHERE id=?`,
      [record_id, record_id]
    );
  } else if (record_type === 'debt') {
    const debt = await query('SELECT amount FROM debts_loans WHERE id=?', [record_id]);
    const paidSum = await query(`SELECT SUM(amount) as totalPaid FROM ledger_entries WHERE record_type='debt' AND record_id=?`, [record_id]);
    const totalPaid = paidSum[0]?.totalPaid || 0;
    const status = totalPaid >= (debt[0]?.amount || 0) ? 'paid' : 'pending';
    await execute('UPDATE debts_loans SET status=? WHERE id=?', [status, record_id]);
  }
}

router.post('/ledger-entries', upload.single('file'), async (req, res) => {
  const { record_id, record_type, month_year, payment_date, amount, payment_type, notes } = req.body;
  try {
    const attachment_path = await storeFile(req, req.user!.id);
    const result = await execute(
      `INSERT INTO ledger_entries (record_id, record_type, month_year, payment_date, amount, payment_type, notes, attachment_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Number(record_id), record_type, month_year, payment_date, Number(amount), payment_type || 'UPI', notes || '', attachment_path]
    );
    await syncParent(record_type, Number(record_id));
    res.json({ success: true, id: result.lastID, attachment_path });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/ledger-entries/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { month_year, payment_date, amount, payment_type, notes } = req.body;
  try {
    const oldEntry = await get('SELECT * FROM ledger_entries WHERE id=?', [id]);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found.' });
    const attachment_path = req.file ? await storeFile(req, req.user!.id) : oldEntry.attachment_path;
    await execute(
      `UPDATE ledger_entries SET month_year=?, payment_date=?, amount=?, payment_type=?, notes=?, attachment_path=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [month_year, payment_date, Number(amount), payment_type, notes || '', attachment_path, id]
    );
    await syncParent(oldEntry.record_type, oldEntry.record_id);
    res.json({ success: true, attachment_path });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/ledger-entries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const oldEntry = await get('SELECT * FROM ledger_entries WHERE id=?', [id]);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found.' });
    await execute('DELETE FROM ledger_entries WHERE id=?', [id]);
    await syncParent(oldEntry.record_type, oldEntry.record_id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  SYSTEM (Backup / Status / Settings)
// ════════════════════════════════════════════════════════════════
router.get('/system/status', async (req, res) => {
  try {
    const dbFilePath = path.resolve(__dirname, '../../../database.sqlite');
    let dbSize = 'Cloud DB';
    if (fs.existsSync(dbFilePath)) {
      const stats = fs.statSync(dbFilePath);
      dbSize = `${(stats.size / 1024).toFixed(1)} KB`;
    }
    const files = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
    let lastBackup = 'Never';
    if (files.length > 0) {
      const sorted = files
        .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());
      lastBackup = sorted[0].time.toLocaleString('en-IN');
    }
    res.json({
      appVersion: '3.0.0',
      serverStatus: 'Running',
      databaseStatus: 'Connected',
      databaseSize: dbSize,
      cloudStorage: CLOUDINARY_ENABLED ? 'Cloudinary' : 'Local Disk',
      localIp: getLocalIpAddress(),
      serverPort: process.env.PORT || 5000,
      lastBackupDate: lastBackup,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/system/backup', async (_req, res) => {
  try {
    const dbFilePath = path.resolve(__dirname, '../../../database.sqlite');
    if (!fs.existsSync(dbFilePath)) return res.status(400).json({ error: 'SQLite database not found. (Cloud DB does not support local backup.)' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupsDir, `database-backup-${timestamp}.sqlite`);
    fs.copyFileSync(dbFilePath, backupPath);
    res.json({ success: true, filename: `database-backup-${timestamp}.sqlite` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/system/backups', async (_req, res) => {
  try {
    const files = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
    const list = files.map(f => {
      const fp = path.join(backupsDir, f);
      const stats = fs.statSync(fp);
      return { filename: f, size: `${(stats.size / 1024).toFixed(1)} KB`, date: stats.mtime.toLocaleString('en-IN') };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/system/restore', async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Filename is required.' });
  // Prevent path traversal
  const safeFilename = path.basename(filename);
  const backupPath = path.join(backupsDir, safeFilename);
  if (!fs.existsSync(backupPath)) return res.status(400).json({ error: 'Backup file not found.' });
  try {
    const dbFilePath = path.resolve(__dirname, '../../../database.sqlite');
    await closeDatabase();
    fs.copyFileSync(backupPath, dbFilePath);
    await reopenDatabase();
    res.json({ success: true });
  } catch (error: any) {
    try { await reopenDatabase(); } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

router.get('/system/db-export', async (req, res) => {
  try {
    const dbFilePath = path.resolve(__dirname, '../../../database.sqlite');
    if (fs.existsSync(dbFilePath)) {
      return res.download(dbFilePath, 'venke-finance-backup.sqlite');
    }

    // Cloud PostgreSQL Mode: Query all financial tables and output as a JSON download
    const tables = [
      'users', 'categories', 'recurring_rules', 'transactions', 
      'savings_investments', 'budgets', 'goals', 'notifications', 
      'debts_loans', 'deposits', 'chit_funds', 'lic_policies', 
      'gold_investments', 'debt_settlements', 'lic_premiums', 
      'chit_payments', 'gold_transactions', 'mutual_funds', 'mutual_fund_transactions'
    ];

    const backupData: any = {};
    for (const table of tables) {
      try {
        backupData[table] = await query(`SELECT * FROM ${table}`);
      } catch (_) {
        // Table may not exist or not initialized
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=venke-finance-cloud-backup.json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
