import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { EnterpriseRecoveryService, getBackupRootDir } from '../services/EnterpriseRecoveryService';

const router = Router();

// GET /api/enterprise-recovery/status
router.get('/status', async (_req, res) => {
  try {
    const status = await EnterpriseRecoveryService.getSystemRecoveryStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching system recovery status' });
  }
});

// GET /api/enterprise-recovery/backup-status
router.get('/backup-status', async (_req, res) => {
  try {
    const status = await EnterpriseRecoveryService.getSystemRecoveryStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching backup status' });
  }
});

// POST /api/enterprise-recovery/trigger-backup
router.post('/trigger-backup', async (_req, res) => {
  try {
    const result = await EnterpriseRecoveryService.createDailyImmutableSnapshot('automatic');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error triggering backup' });
  }
});

// GET /api/enterprise-recovery/ledger
router.get('/ledger', async (_req, res) => {
  try {
    const entries = await EnterpriseRecoveryService.getLedgerEntries(50);
    res.json({ entries, count: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching backup ledger' });
  }
});

// GET /api/enterprise-recovery/health
router.get('/health', async (_req, res) => {
  try {
    const health = await EnterpriseRecoveryService.calculateBackupHealthScore();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error calculating health score' });
  }
});

// GET /api/enterprise-recovery/external-path
router.get('/external-path', (_req, res) => {
  try {
    const externalPath = EnterpriseRecoveryService.getExternalBackupDir();
    const exists = fs.existsSync(externalPath);
    res.json({ externalPath, verified: exists });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enterprise-recovery/external-path
router.post('/external-path', (req, res) => {
  try {
    const { customPath } = req.body || {};
    if (!customPath) return res.status(400).json({ error: 'customPath is required' });
    const result = EnterpriseRecoveryService.setExternalBackupDir(customPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enterprise-recovery/download-golden-bundle
router.get('/download-golden-bundle', (_req, res) => {
  try {
    const backupRoot = getBackupRootDir();
    const bundlePath = path.join(backupRoot, 'latest', 'latest_recovery_bundle.zip');

    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({ error: 'Golden recovery bundle not yet generated' });
    }

    res.download(bundlePath, 'latest_recovery_bundle.zip');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enterprise-recovery/download-latest-snapshot
router.get('/download-latest-snapshot', async (_req, res) => {
  try {
    const backupRoot = getBackupRootDir();
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateSpecificSqlite = path.join(backupRoot, todayStr, `venke-finance-recovery-${todayStr}.sqlite`);
    const latestSqlite = path.join(backupRoot, 'latest', 'venke_finance_latest.sqlite');

    let downloadPath = '';
    let downloadFileName = `venke-finance-recovery-${todayStr}.sqlite`;

    if (fs.existsSync(dateSpecificSqlite)) {
      downloadPath = dateSpecificSqlite;
    } else if (fs.existsSync(latestSqlite)) {
      downloadPath = latestSqlite;
    } else {
      const result = await EnterpriseRecoveryService.createDailyImmutableSnapshot('automatic');
      if (result.success && result.folderPath) {
        const createdPath = path.join(result.folderPath, `venke-finance-recovery-${todayStr}.sqlite`);
        if (fs.existsSync(createdPath)) downloadPath = createdPath;
      }
    }

    if (!downloadPath || !fs.existsSync(downloadPath)) {
      return res.status(404).json({ error: 'No recovery snapshot available to download' });
    }

    res.download(downloadPath, downloadFileName);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error downloading backup snapshot' });
  }
});

// Helper: Human-readable display names for schema tables
function getTableDisplayName(tableName: string): string {
  const nameMap: Record<string, string> = {
    users: 'User Profiles',
    categories: 'Categories',
    recurring_rules: 'Recurring Rules',
    transactions: 'Transactions Ledger',
    savings_investments: 'Savings & Investments',
    goals: 'Financial Goals',
    budgets: 'Budget Planner Limits',
    notifications: 'Notifications',
    debts_loans: 'Debts & Loans',
    deposits: 'Deposits',
    money_transfers: 'Money Transfers',
    chit_funds: 'Chit Funds',
    chit_payments: 'Chit Payments',
    lic_policies: 'LIC Policies',
    lic_premium_history: 'LIC Premium History',
    digital_gold: 'Digital Gold Holdings',
    digital_gold_transactions: 'Digital Gold Transactions',
    savings_accounts: 'Savings Accounts',
    savings_transactions: 'Savings Transactions',
    personal_tasks: 'Personal Tasks',
    personal_habits: 'Habits Tracker',
    habit_completions: 'Habit Log',
    personal_goals: 'Personal Milestones',
    goal_milestones: 'Goal Steps',
    personal_notes: 'Sticky Notes',
    personal_reminders: 'Reminders',
    personal_events: 'Calendar Events',
    debt_accounts: 'Debt Accounts',
    debt_transactions: 'Debt Repayments',
    mutual_funds: 'Mutual Funds',
    mutual_fund_transactions: 'Mutual Fund SIPs',
    wellness_profiles: 'Wellness Profiles',
    wellness_meals: 'Wellness Meal Logs',
    wellness_exercise: 'Wellness Workouts',
    wellness_water_logs: 'Water Intake Logs',
    recurring_commitments: 'Recurring Commitments',
    recurring_automation_logs: 'Automation Audit Logs'
  };
  if (nameMap[tableName]) return nameMap[tableName];
  return tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── GET /api/enterprise-recovery/records/explorer-tables ────────────────────────
// Dynamic discovery of all application tables and live row counts
router.get('/records/explorer-tables', async (_req, res) => {
  try {
    const { totalRecords, counts } = await EnterpriseRecoveryService.getLiveTableCounts();
    const targetTables = EnterpriseRecoveryService.TARGET_TABLES;

    const tables = targetTables.map(tableName => ({
      name: tableName,
      displayName: getTableDisplayName(tableName),
      recordCount: counts[tableName] || 0,
      verified: true
    }));

    // Sort tables by record count descending, then alphabetically
    tables.sort((a, b) => b.recordCount - a.recordCount || a.displayName.localeCompare(b.displayName));

    res.json({
      totalRecords,
      totalTables: tables.length,
      lastVerifiedAt: new Date().toISOString(),
      tables
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to load database table metadata' });
  }
});

// ── GET /api/enterprise-recovery/records/table/:tableName ───────────────────────
// Server-paginated, read-only inspection of table rows with parameterization
router.get('/records/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
    const search = (req.query.search as string || '').trim();

    // 1. Strict Allowlist Validation (Prevents SQL Injection & System Table Access)
    const allowedTables = EnterpriseRecoveryService.TARGET_TABLES;
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid or unsupported database table' });
    }

    const offset = (page - 1) * pageSize;

    // 2. Fetch sample row / columns to discover field metadata
    let rows: any[] = [];
    let totalRecords = 0;

    if (search) {
      // Discover text columns to safely search across
      const sample = await query(`SELECT * FROM "${tableName}" LIMIT 1`);
      const sampleRow = sample && sample[0] ? sample[0] : {};
      const columnKeys = Object.keys(sampleRow);
      
      const textCols = columnKeys.filter(k => 
        typeof sampleRow[k] === 'string' || 
        k.includes('title') || k.includes('name') || k.includes('desc') || k.includes('category') || k.includes('tag') || k.includes('type')
      );

      if (textCols.length > 0) {
        const whereClauses = textCols.map(c => `"${c}" LIKE ?`).join(' OR ');
        const searchParams = textCols.map(() => `%${search}%`);

        const countRes = await query(`SELECT COUNT(*) as count FROM "${tableName}" WHERE ${whereClauses}`, searchParams);
        totalRecords = parseInt((countRes && countRes[0] && countRes[0].count) || '0', 10);

        rows = await query(
          `SELECT * FROM "${tableName}" WHERE ${whereClauses} ORDER BY 1 DESC LIMIT ? OFFSET ?`,
          [...searchParams, pageSize, offset]
        );
      } else {
        const countRes = await query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        totalRecords = parseInt((countRes && countRes[0] && countRes[0].count) || '0', 10);
        rows = await query(`SELECT * FROM "${tableName}" ORDER BY 1 DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
      }
    } else {
      const countRes = await query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      totalRecords = parseInt((countRes && countRes[0] && countRes[0].count) || '0', 10);

      try {
        rows = await query(`SELECT * FROM "${tableName}" ORDER BY 1 DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
      } catch (_) {
        rows = await query(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`, [pageSize, offset]);
      }
    }

    // 3. Dynamic Column Discovery & Formatting
    let columnKeys: string[] = [];
    if (rows.length > 0) {
      columnKeys = Object.keys(rows[0]);
    } else {
      const sample = await query(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (sample && sample[0]) columnKeys = Object.keys(sample[0]);
    }

    const columns = columnKeys.map(k => {
      let type = 'string';
      const lower = k.toLowerCase();
      if (lower.includes('amount') || lower.includes('balance') || lower.includes('limit') || lower.includes('price') || lower.includes('premium') || lower.includes('value') || lower.includes('rate') || lower.includes('cost')) {
        type = 'currency';
      } else if (lower.includes('date') || lower.includes('at') || lower.includes('time') || lower.includes('timestamp')) {
        type = 'date';
      } else if (lower.includes('id') || lower.includes('count') || lower.includes('number') || lower.includes('month') || lower.includes('year') || lower.includes('day')) {
        type = 'number';
      } else if (lower.includes('is_') || lower.includes('has_') || lower.includes('enabled') || lower.includes('active') || lower.includes('pinned') || lower.includes('verified')) {
        type = 'boolean';
      }

      // Convert raw field name to Human-Friendly Display Label
      const label = k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      return { name: k, label, type };
    });

    // 4. Sanitize sensitive fields (e.g. passwords/hashes in users table)
    const sanitizedRecords = rows.map(row => {
      const sanitized = { ...row };
      for (const k of Object.keys(sanitized)) {
        if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token_hash')) {
          sanitized[k] = '[PROTECTED]';
        }
      }
      return sanitized;
    });

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    res.json({
      table: tableName,
      displayName: getTableDisplayName(tableName),
      columns,
      records: sanitizedRecords,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to fetch database records' });
  }
});

export default router;
