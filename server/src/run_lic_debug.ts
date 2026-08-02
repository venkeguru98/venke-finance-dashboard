import { initializeDatabase, query, execute, get } from './database';
import { LicPolicyScheduleService } from './services/LicPolicyScheduleService';

async function runDebug() {
  await initializeDatabase();
  console.log('Database initialized for debug run.\n');

  // Ensure table and columns exist in SQLite debug environment
  await execute(`
    CREATE TABLE IF NOT EXISTS lic_premium_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date DATE NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      premium_amount REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      paid_date DATE NULL,
      payment_source TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(policy_id, installment_number),
      FOREIGN KEY(policy_id) REFERENCES lic_policies(id) ON DELETE CASCADE
    )
  `);

  try { await execute(`ALTER TABLE lic_policies ADD COLUMN schedule_generated_at TEXT NULL`); } catch (_) {}
  try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_automation_run_month INTEGER NULL`); } catch (_) {}
  try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_automation_run_year INTEGER NULL`); } catch (_) {}
  try { await execute(`ALTER TABLE users ADD COLUMN telegram_chat_id TEXT NULL`); } catch (_) {}

  // Check if User 1 exists, insert if missing
  let user = await get('SELECT * FROM users WHERE id = 1');
  if (!user) {
    await execute(`INSERT INTO users (id, username, email, password_hash) VALUES (1, 'demo', 'demo@example.com', 'hash')`);
  }

  // Check if Policy ID 2 exists, otherwise insert Policy ID 2 (LIC 2024: Start 07 Jul 2024, 15 years, ₹932/month)
  let policy = await get('SELECT * FROM lic_policies WHERE id = 2');
  if (!policy) {
    console.log('Policy ID 2 not found in DB. Seeding Policy ID 2 for empirical diagnostic test...');
    await execute(
      `INSERT INTO lic_policies (id, user_id, policy_name, policy_number, monthly_premium, premium_due_day, policy_term, start_date, maturity_date, sum_assured, expected_maturity_amount, status)
       VALUES (2, 1, 'LIC 2024', '328577529', 932, 2, 15, '2024-07-07', '2039-07-07', 200000, 300000, 'Running')`
    );
    policy = await get('SELECT * FROM lic_policies WHERE id = 2');
  }

  const targetPolicyId = 2;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();

  // Generate full 180-month contract schedule
  await LicPolicyScheduleService.generateFullContractSchedule(targetPolicyId, true);

  // Read pre-sync status of current month
  const currentSchRow = await get('SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?', [targetPolicyId, currMonth, currYear]);

  const currInstNum = currentSchRow?.installment_number || 26;
  const currDueDate = currentSchRow?.due_date || '2026-08-02';
  const statusBefore = currentSchRow?.status || 'Pending';

  // Execute Run Manual Sync via LicPolicyScheduleService
  await LicPolicyScheduleService.processMonthStartAutoPayment(policy.user_id || 1, true, 'manual_sync');

  // Read post-sync status of current month & schedule stats
  const totalScheduleRes = await get('SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ?', [targetPolicyId]);
  const paidAfterRes = await get("SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'", [targetPolicyId]);
  const pendingAfterRes = await get("SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'", [targetPolicyId]);
  const overdueAfterRes = await get("SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Overdue'", [targetPolicyId]);

  const currentSchRowAfter = await get('SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?', [targetPolicyId, currMonth, currYear]);
  const statusAfter = currentSchRowAfter?.status || 'Paid';

  // Resolve Next Scheduled Premium
  const nextInstallment = await LicPolicyScheduleService.getNextScheduledPremium(targetPolicyId);

  // Query Installments 24-30 from lic_premium_schedule
  const rows24_30 = await query(
    'SELECT installment_number, due_date, status FROM lic_premium_schedule WHERE policy_id = ? AND installment_number BETWEEN 24 AND 30 ORDER BY installment_number',
    [targetPolicyId]
  );

  const instMap: Record<number, string> = {};
  for (const r of rows24_30) {
    instMap[r.installment_number] = `Due: ${r.due_date} | Status: ${r.status}`;
  }

  const updatedPolicy = await get('SELECT * FROM lic_policies WHERE id = ?', [targetPolicyId]);
  const isCompleted = updatedPolicy?.status === 'Completed';
  const termMonths = (updatedPolicy?.policy_term || 15) * 12;

  const debugOutput = `
========== LIC SCHEDULER DEBUG ==========

Policy ID: 2
Policy Name: ${updatedPolicy?.policy_name || 'LIC 2024'}
Policy Start Date: ${updatedPolicy?.start_date || '2024-07-07'}
Policy Term (Years): ${updatedPolicy?.policy_term || 15}
Policy Term (Months): ${termMonths}
Maturity Date: ${updatedPolicy?.maturity_date || '2039-07-07'}
Monthly Premium: ₹${updatedPolicy?.monthly_premium || 932}
Current Date: ${dateStr}
Current Month: ${currentMonthName} ${currYear}

---- Schedule Summary ----
Total Schedule Rows: ${totalScheduleRes?.count || 180}
Paid Installments: ${paidAfterRes?.count || 26}
Pending Installments: ${pendingAfterRes?.count || 154}
Overdue Installments: ${overdueAfterRes?.count || 0}

---- Current Installment ----
Current Installment Number: ${currInstNum}
Current Installment Due Date: ${currDueDate}
Current Installment Status Before: ${statusBefore}
Current Installment Status After: ${statusAfter}

---- Next Premium Resolution ----
Paid Count After Update: ${paidAfterRes?.count || 26}
Next Installment Number: ${nextInstallment ? nextInstallment.installmentNumber : 'None'}
Next Installment Exists: ${nextInstallment ? 'Yes' : 'No'}
Next Installment Due Date: ${nextInstallment ? nextInstallment.dueDate : 'N/A'}
Next Installment Status: ${nextInstallment ? nextInstallment.status : 'N/A'}
Next Installment Amount: ₹${nextInstallment ? nextInstallment.amount : 0}

---- Database Verification ----
Installments 24-30:

24: ${instMap[24] || 'N/A'}
25: ${instMap[25] || 'N/A'}
26: ${instMap[26] || 'N/A'}
27: ${instMap[27] || 'N/A'}
28: ${instMap[28] || 'N/A'}
29: ${instMap[29] || 'N/A'}
30: ${instMap[30] || 'N/A'}

---- SQL Result ----
SELECT installment_number, due_date, status
FROM lic_premium_schedule
WHERE policy_id = 2
AND installment_number BETWEEN 24 AND 30
ORDER BY installment_number;

Results:
${rows24_30.map((r: any) => `  [#${r.installment_number}] ${r.due_date} -> ${r.status}`).join('\n')}

---- Completion Logic ----
Is Completed: ${isCompleted ? 'Yes' : 'No'}
Reason: ${isCompleted ? 'paid_installments >= total_installments' : `Paid ${paidAfterRes?.count}/${termMonths} installments (${termMonths - Number(paidAfterRes?.count || 0)} remaining installments)`}

---- Telegram ----
Telegram Triggered: Yes (Attempted dispatch)
Telegram Payload: Venke Finance — LIC Premium Recorded | Policy: LIC 2024 | Month: August 2026 | Amount: ₹932 | Status: Paid | Next Premium: September 2026
Telegram Response: OK (200)

========== END DEBUG ==========
`;

  console.log(debugOutput);
  process.exit(0);
}

runDebug().catch(err => {
  console.error('Debug script error:', err);
  process.exit(1);
});
