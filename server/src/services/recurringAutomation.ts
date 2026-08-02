import { query, execute, get } from '../database';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Send Telegram Message Helper
export async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err: any) {
    console.error('[Automation Telegram Send Error]', err.message);
    return false;
  }
}

// Single Source Helper for Available Balance calculation
export async function getAvailableBalance(userId: number, monthPrefix: string): Promise<number> {
  try {
    const txs = await query(
      `SELECT t.*, c.name as category_name, c.type as category_type
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.date LIKE ?`,
      [userId, `${monthPrefix}%`]
    );

    let totalIncome = 0;
    let totalLivingExpenses = 0;
    let totalSavingsCommitments = 0;

    for (const t of txs) {
      const catType = (t.category_type || '').toLowerCase();
      const catName = (t.category_name || '').toLowerCase();
      const amt = Number(t.amount) || 0;

      if (catType === 'income') {
        totalIncome += amt;
      } else if (catType === 'savings' || ['lic', 'sip', 'chit', 'gold', 'investment', 'retirement', 'wealth'].some(k => catName.includes(k))) {
        totalSavingsCommitments += amt;
      } else if (catType === 'expense') {
        totalLivingExpenses += amt;
      }
    }

    const netMonthlySavings = totalIncome - totalLivingExpenses - totalSavingsCommitments;
    return Math.max(0, netMonthlySavings);
  } catch (_) {
    return 0;
  }
}

// ─── RECALCULATE CHIT METRICS HELPER ───────────────────────────────────────
export async function recalculateChitMetrics(chitId: number) {
  try {
    const paidRes = await get(
      `SELECT COUNT(*) as count, SUM(installment_amount) as total 
       FROM chit_payments WHERE chit_id = ? AND status = 'Paid'`,
      [chitId]
    );

    const chit = await get(`SELECT monthly_installment, total_months FROM chit_funds WHERE id = ?`, [chitId]);
    if (!chit) return;

    const monthsPaid = Number(paidRes?.count || 0);
    const totalPaid = Number(paidRes?.total || 0);

    // Keep chit_funds table synchronized
    await execute(
      `UPDATE chit_funds SET total_paid = ? WHERE id = ?`,
      [totalPaid, chitId]
    );
  } catch (err) {
    console.error('[Chit Metrics Recalculation Error]', err);
  }
}

// ─── RUN AUTOMATION ENGINE (GLOBAL CHETTU SCHEDULER) ──────────────────────
export async function runRecurringAutomation(userId: number = 1, forceRun: boolean = false) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const dateStr = now.toISOString().split('T')[0];

  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Fetch user telegram chat ID
  const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
  const chatId = user?.telegram_chat_id;

  // Fetch active commitment automation settings
  const rules = await query(
    `SELECT * FROM recurring_commitments WHERE user_id = ? ${forceRun ? '' : 'AND enabled = 1'}`,
    [userId]
  );

  for (const rule of rules) {
    const { id, module_type, entity_id, auto_create, auto_mark_paid, telegram_confirm, payment_day, last_executed_month, last_executed_year } = rule;
    processedCount++;

    try {
      if (module_type === 'chit') {
        const chit = await get('SELECT * FROM chit_funds WHERE id = ?', [entity_id]);
        if (!chit || chit.status === 'Completed' || chit.status === 'Closed') {
          skippedCount++;
          continue;
        }

        // Safeguard: Check monthly execution state (execute once per chit per month unless forceRun)
        if (!forceRun && last_executed_month === currentMonth && last_executed_year === currentYear) {
          skippedCount++;
          continue; // Already executed for this month
        }

        // 1. Find next unpaid payment schedule row
        let existing = await get(
          'SELECT * FROM chit_payments WHERE chit_id = ? AND month = ? AND year = ?',
          [entity_id, currentMonth, currentYear]
        );

        if (!existing) {
          existing = await get(
            "SELECT * FROM chit_payments WHERE chit_id = ? AND status != 'Paid' ORDER BY year ASC, month ASC LIMIT 1",
            [entity_id]
          );
        }

        if (existing) {
          // 2. Check manual override
          if (existing.status === 'Paid' && !existing.remarks?.includes('Auto-generated')) {
            await execute(
              `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, details)
               VALUES (?, ?, ?, 'Manual override detected', ?, ?, ?, 'User manually paid chit installment')`,
              [userId, module_type, entity_id, existing.installment_amount, existing.month, existing.year]
            );

            await execute(
              `UPDATE recurring_commitments SET last_executed_month = ?, last_executed_year = ? WHERE id = ?`,
              [currentMonth, currentYear, id]
            );
            skippedCount++;
            continue;
          }

          const amt = Number(existing.installment_amount) || Number(chit.monthly_installment) || 0;
          const status = auto_mark_paid ? 'Paid' : (existing.status || 'Pending');
          const pDate = dateStr;

          // 3. Mark payment paid & update payment date
          await execute(
            `UPDATE chit_payments SET status = ?, payment_date = ?, remarks = 'Auto-generated recurring installment' WHERE id = ?`,
            [status, auto_mark_paid ? pDate : existing.payment_date, existing.id]
          );

          // 4. Recalculate chit summary metrics
          await recalculateChitMetrics(entity_id);
          updatedCount++;

          // 5. Update execution tracking
          await execute(
            `UPDATE recurring_commitments SET last_run_date = ?, last_executed_month = ?, last_executed_year = ? WHERE id = ?`,
            [dateStr, currentMonth, currentYear, id]
          );

          // 6. Send Telegram confirmation
          let telegramSent = 0;
          if (telegram_confirm && chatId) {
            const instMonthName = new Date(2000, existing.month - 1).toLocaleString('en-US', { month: 'short' });
            const msg = `<b>Cheetu installment completed</b>\n\n` +
              `Chit: ${chit.chit_name}\n` +
              `Installment: ${instMonthName} ${existing.year}\n` +
              `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
              `Due: ${String(payment_day || 5).padStart(2, '0')} ${instMonthName} ${existing.year}\n` +
              `Paid: ${pDate}\n` +
              `Status: ${status}\n\n` +
              `Venke Finance`;

            const ok = await sendTelegramMessage(chatId, msg);
            if (ok) telegramSent = 1;
          }

          // 7. Log audit entry
          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Automated payment schedule row updated & synchronized')`,
            [userId, module_type, entity_id, auto_mark_paid ? 'Auto-marked Paid' : 'Auto-updated', amt, existing.month, existing.year, telegramSent]
          );
        } else {
          skippedCount++;
        }
      } else if (module_type === 'gold') {
        const gold = await get('SELECT * FROM digital_gold WHERE id = ?', [entity_id]);
        if (!gold) {
          skippedCount++;
          continue;
        }

        const existing = await get(
          'SELECT * FROM digital_gold_transactions WHERE gold_id = ? AND month = ? AND year = ?',
          [entity_id, currentMonth, currentYear]
        );

        if (existing) {
          if (!existing.remarks?.includes('Auto-generated')) {
            await execute(
              `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, details)
               VALUES (?, ?, ?, 'Manual override detected', ?, ?, ?, 'User manually logged gold purchase')`,
              [userId, module_type, entity_id, existing.amount, currentMonth, currentYear]
            );
          }
          skippedCount++;
          continue;
        }

        if (auto_create) {
          const amt = Number(gold.monthly_amount || 1000);
          await execute(
            `INSERT INTO digital_gold_transactions (gold_id, month, year, amount, remarks)
             VALUES (?, ?, ?, ?, 'Auto-generated recurring purchase')`,
            [entity_id, currentMonth, currentYear, amt]
          );
          updatedCount++;

          await execute(
            `UPDATE recurring_commitments SET last_run_date = ?, last_executed_month = ?, last_executed_year = ? WHERE id = ?`,
            [dateStr, currentMonth, currentYear, id]
          );

          let telegramSent = 0;
          if (telegram_confirm && chatId) {
            const monthName = now.toLocaleString('en-US', { month: 'long' });
            const msg = `<b>DigiGold purchase recorded</b>\n\n` +
              `Investment: ${gold.investment_name}\n` +
              `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
              `Month: ${monthName} ${currentYear}\n` +
              `Purchase Date: ${dateStr}\n` +
              `Status: Purchased\n\n` +
              `Venke Finance`;

            const ok = await sendTelegramMessage(chatId, msg);
            if (ok) telegramSent = 1;
          }

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, ?, ?, 'Auto-marked Purchased', ?, ?, ?, ?, 'Automated gold purchase entry')`,
            [userId, module_type, entity_id, amt, currentMonth, currentYear, telegramSent]
          );
        } else {
          skippedCount++;
        }
      } else if (module_type === 'lic') {
        const policy = await get('SELECT * FROM lic_policies WHERE id = ?', [entity_id]);
        if (!policy || policy.status === 'Completed') {
          skippedCount++;
          continue;
        }

        const existing = await get(
          'SELECT * FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?',
          [entity_id, currentMonth, currentYear]
        );

        if (existing) {
          if (!existing.remarks?.includes('Auto-generated')) {
            await execute(
              `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, details)
               VALUES (?, ?, ?, 'Manual override detected', ?, ?, ?, 'User manually logged premium entry')`,
              [userId, module_type, entity_id, existing.amount_paid, currentMonth, currentYear]
            );
          }
          skippedCount++;
          continue;
        }

        if (auto_create) {
          const status = auto_mark_paid ? 'Paid' : 'Pending';
          const amt = Number(policy.monthly_premium) || 0;

          await execute(
            `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, 'Auto-generated recurring premium')`,
            [entity_id, currentMonth, currentYear, amt, dateStr, status]
          );
          updatedCount++;

          await execute(
            `UPDATE recurring_commitments SET last_run_date = ?, last_executed_month = ?, last_executed_year = ? WHERE id = ?`,
            [dateStr, currentMonth, currentYear, id]
          );

          let telegramSent = 0;
          if (telegram_confirm && chatId) {
            const msg = `<b>LIC premium recorded</b>\n\n` +
              `Policy: ${policy.policy_name} (#${policy.policy_number})\n` +
              `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
              `Due Date: ${dateStr}\n` +
              `Status: ${status}\n\n` +
              `Venke Finance`;

            const ok = await sendTelegramMessage(chatId, msg);
            if (ok) telegramSent = 1;
          }

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Automated premium entry generated')`,
            [userId, module_type, entity_id, auto_mark_paid ? 'Auto-marked Paid' : 'Auto-created', amt, currentMonth, currentYear, telegramSent]
          );
        } else {
          skippedCount++;
        }
      }
    } catch (err: any) {
      failedCount++;
      console.error(`[Automation Error] Module: ${module_type}, ID: ${entity_id}`, err);
    }
  }

  return { processedCount, updatedCount, skippedCount, failedCount };
}

// ─── GENERATE NEXT MONTH COMMITMENT FORECAST (TELEGRAM) ────────────────────
export async function generateNextMonthForecast(userId: number = 1, isHeadsUp: boolean = false): Promise<{ text: string; totalCommitments: number }> {
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();
  const nextMonthName = nextMonthDate.toLocaleString('en-US', { month: 'long' });

  // 1. Fetch available balance for current month context
  const currMonthPrefix = now.toISOString().slice(0, 7);
  const availableBalance = await getAvailableBalance(userId, currMonthPrefix);

  // 2. Fetch active rules
  const activeRules = await query(
    `SELECT * FROM recurring_commitments WHERE user_id = ? AND enabled = 1`,
    [userId]
  );

  let cheetuItems: Array<{ name: string; amount: number; dueDay: number }> = [];
  let licItems: Array<{ name: string; amount: number; dueDay: number }> = [];
  let goldItems: Array<{ name: string; amount: number; dueDay: number }> = [];

  let cheetuTotal = 0;
  let licTotal = 0;
  let goldTotal = 0;

  for (const rule of activeRules) {
    if (rule.module_type === 'chit') {
      const chit = await get('SELECT * FROM chit_funds WHERE id = ?', [rule.entity_id]);
      if (chit && chit.status === 'Running') {
        const nextPayment = await get(
          "SELECT * FROM chit_payments WHERE chit_id = ? AND status != 'Paid' ORDER BY year ASC, month ASC LIMIT 1",
          [rule.entity_id]
        );
        const amt = Number(nextPayment?.installment_amount) || Number(chit.monthly_installment) || 0;
        const dueDay = rule.payment_day || 5;
        cheetuItems.push({ name: chit.chit_name, amount: amt, dueDay });
        cheetuTotal += amt;
      }
    } else if (rule.module_type === 'lic') {
      const policy = await get('SELECT * FROM lic_policies WHERE id = ?', [rule.entity_id]);
      if (policy && policy.status === 'Running') {
        const amt = Number(policy.monthly_premium) || 0;
        const dueDay = policy.premium_due_day || rule.payment_day || 12;
        licItems.push({ name: policy.policy_name, amount: amt, dueDay });
        licTotal += amt;
      }
    } else if (rule.module_type === 'gold') {
      const gold = await get('SELECT * FROM digital_gold WHERE id = ?', [rule.entity_id]);
      if (gold) {
        const amt = Number(gold.monthly_amount || 1000);
        const dueDay = rule.payment_day || 1;
        goldItems.push({ name: gold.investment_name, amount: amt, dueDay });
        goldTotal += amt;
      }
    }
  }

  const totalNextCommitment = cheetuTotal + licTotal + goldTotal;
  const expectedDiff = availableBalance - totalNextCommitment;
  const isShortfall = expectedDiff < 0;

  if (isHeadsUp) {
    const headsUpText = `<b>Heads-up: ${nextMonthName} Commitments Forecast</b>\n\n` +
      `Estimated Next Month Commitments: <b>₹${totalNextCommitment.toLocaleString('en-IN')}</b>\n` +
      `Current Available Balance: <b>₹${availableBalance.toLocaleString('en-IN')}</b>\n\n` +
      (isShortfall 
        ? `⚠️ Estimated Shortfall: <b>₹${Math.abs(expectedDiff).toLocaleString('en-IN')}</b>\nFinal detailed commitment forecast will run on the last day of this month at 8:00 PM.`
        : `✅ Estimated Surplus: <b>₹${expectedDiff.toLocaleString('en-IN')}</b>\nFinal detailed commitment forecast will run on the last day of this month at 8:00 PM.`) +
      `\n\nVenke Finance`;
    return { text: headsUpText, totalCommitments: totalNextCommitment };
  }

  // Consolidated Forecast Message
  let text = `<b>Venke Finance — ${nextMonthName} ${nextYear} Commitment Forecast</b>\n\n`;
  text += `Available Balance: <b>₹${availableBalance.toLocaleString('en-IN')}</b>\n`;
  text += `Next Month Commitments: <b>₹${totalNextCommitment.toLocaleString('en-IN')}</b>\n`;

  if (isShortfall) {
    text += `Expected Shortfall: <b style="color: #F43F5E;">₹${Math.abs(expectedDiff).toLocaleString('en-IN')}</b>\n\n`;
  } else {
    text += `Expected Surplus: <b style="color: #10B981;">₹${expectedDiff.toLocaleString('en-IN')}</b>\n\n`;
  }

  if (cheetuItems.length > 0) {
    text += `<b>Cheetu chit funds</b>\n`;
    cheetuItems.sort((a, b) => a.dueDay - b.dueDay).forEach(item => {
      text += `• ${item.name}: ₹${item.amount.toLocaleString('en-IN')} (Due: ${String(item.dueDay).padStart(2, '0')} ${nextMonthName.slice(0, 3)})\n`;
    });
    text += `\n`;
  }

  if (licItems.length > 0) {
    text += `<b>LIC policies</b>\n`;
    licItems.sort((a, b) => a.dueDay - b.dueDay).forEach(item => {
      text += `• ${item.name}: ₹${item.amount.toLocaleString('en-IN')} (Due: ${String(item.dueDay).padStart(2, '0')} ${nextMonthName.slice(0, 3)})\n`;
    });
    text += `\n`;
  }

  if (goldItems.length > 0) {
    text += `<b>PhonePe DigiGold</b>\n`;
    goldItems.sort((a, b) => a.dueDay - b.dueDay).forEach(item => {
      text += `• ${item.name}: ₹${item.amount.toLocaleString('en-IN')} (${String(item.dueDay).padStart(2, '0')} ${nextMonthName.slice(0, 3)})\n`;
    });
    text += `\n`;
  }

  text += `<b>Total Next Month Commitment</b>\n₹${totalNextCommitment.toLocaleString('en-IN')}\n\n`;
  text += `Breakdown:\n`;
  text += `• Cheetu: ₹${cheetuTotal.toLocaleString('en-IN')}\n`;
  text += `• LIC: ₹${licTotal.toLocaleString('en-IN')}\n`;
  text += `• DigiGold: ₹${goldTotal.toLocaleString('en-IN')}\n\n`;

  if (totalNextCommitment >= 50000) {
    text += `⚠️ <b>High Commitment Alert</b>\nYour ${nextMonthName} commitments exceed ₹50,000. Total: ₹${totalNextCommitment.toLocaleString('en-IN')}\n\n`;
  }

  text += `💡 <b>Recommendation</b>\n`;
  if (isShortfall) {
    text += `You need an additional ₹${Math.abs(expectedDiff).toLocaleString('en-IN')} before ${nextMonthName} begins.\n\n`;
  } else {
    text += `You have sufficient funds (₹${expectedDiff.toLocaleString('en-IN')} surplus) to cover all ${nextMonthName} commitments.\n\n`;
  }

  text += `Venke Finance`;

  return { text, totalCommitments: totalNextCommitment };
}

// ─── GLOBAL CHEETTU AUTOPILOT STATUS HELPER ────────────────────────────────
export async function getGlobalCheetuAutopilotStatus(userId: number = 1) {
  let activeChits = await query(`SELECT * FROM chit_funds WHERE user_id = ? AND (status = 'Running' OR status IS NULL OR status != 'Completed')`, [userId]);
  if (!activeChits || activeChits.length === 0) {
    activeChits = await query(`SELECT * FROM chit_funds WHERE user_id = ?`, [userId]);
  }
  const activeCount = activeChits ? activeChits.length : 0;

  const rules = await query(`SELECT * FROM recurring_commitments WHERE user_id = ? AND module_type = 'chit'`, [userId]);
  const isEnabled = rules.some(r => r.enabled === 1);

  const lastLog = await get(
    `SELECT * FROM recurring_automation_logs WHERE user_id = ? AND module_type = 'chit' ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  const user = await get(`SELECT telegram_chat_id FROM users WHERE id = ?`, [userId]);
  const isTelegramLinked = !!(user && user.telegram_chat_id);

  // Compute next global run date (1st of next month at 12:05 AM)
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextRunStr = `01 ${nextMonthDate.toLocaleString('en-US', { month: 'short' })} ${nextMonthDate.getFullYear()} • 12:05 AM`;

  const logs = await query(
    `SELECT * FROM recurring_automation_logs WHERE user_id = ? AND module_type = 'chit' ORDER BY created_at DESC LIMIT 15`,
    [userId]
  );

  return {
    enabled: isEnabled ? 1 : 0,
    activeCount,
    lastRunDate: lastLog ? lastLog.created_at : null,
    lastAction: lastLog ? lastLog.action : 'No runs yet',
    nextRunStr,
    isTelegramLinked,
    health: isEnabled ? 'Healthy' : 'Paused',
    logs
  };
}
