import { query, execute, get } from '../database';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class LicAutomationScheduler {
  // ─── 1. TELEGRAM NOTIFICATION HELPER ───────────────────────────────────────
  static async sendTelegram(chatId: string | number, text: string): Promise<boolean> {
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
      console.error('[LicAutomationScheduler Telegram Error]', err.message);
      return false;
    }
  }

  // ─── 2. ACTIVE POLICY HELPER ──────────────────────────────────────────────
  static isPolicyActive(p: any): boolean {
    if (!p) return false;
    const s = (p.status || '').toString().trim().toLowerCase();
    if (['cancelled', 'closed', 'terminated', 'paused'].includes(s)) {
      return false;
    }
    if (s === 'completed' || s === 'matured') {
      const paidCount = Number(p.premiumsPaid || p.monthsPaid || 0);
      const totalMonths = Number(p.totalInstallments || (p.policy_term ? p.policy_term * 12 : 0));
      if (totalMonths > 0 && paidCount < totalMonths) {
        return true;
      }
      if (totalMonths > 0 && paidCount >= totalMonths) {
        return false;
      }
    }
    return true;
  }

  // ─── 3. FULL LIFECYCLE SCHEDULE GENERATOR ─────────────────────────────────
  static async generateFullSchedule(policyId: number) {
    try {
      const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
      if (!policy || !policy.start_date) return;

      const now = new Date();
      const currYear = now.getFullYear();
      const currMonth = now.getMonth() + 1;

      const startDate = new Date(policy.start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      const termYears = Number(policy.policy_term || 10);
      const totalPolicyMonths = termYears * 12;

      const monthlyAmt = Number(policy.monthly_premium) || 0;
      const dueDay = policy.premium_due_day || 5;

      let y = startYear;
      let m = startMonth;

      for (let i = 0; i < totalPolicyMonths; i++) {
        const existing = await get(
          `SELECT id, status FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
          [policyId, m, y]
        );

        if (!existing) {
          const isPast = (y < currYear) || (y === currYear && m < currMonth);
          const targetStatus = isPast ? 'Paid' : 'Pending';
          const pDate = isPast ? `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}` : null;

          await execute(
            `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [policyId, m, y, monthlyAmt, pDate, targetStatus, isPast ? 'Auto-backfilled historical premium' : 'Scheduled premium']
          );
        }

        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }

      await LicAutomationScheduler.recalculateMetrics(policyId);
    } catch (err) {
      console.error('[LicAutomationScheduler Full Schedule Error]', err);
    }
  }

  // ─── 4. RECALCULATE POLICY METRICS ─────────────────────────────────────────
  static async recalculateMetrics(policyId: number) {
    try {
      const paidRes = await get(
        `SELECT COUNT(*) as count, SUM(amount_paid) as total 
         FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`,
        [policyId]
      );

      const policy = await get(`SELECT policy_term, monthly_premium, maturity_date, policy_name, user_id, status FROM lic_policies WHERE id = ?`, [policyId]);
      if (!policy) return;

      const paidCount = Number(paidRes?.count || 0);
      const totalPaid = Number(paidRes?.total || 0);
      const termYears = Number(policy.policy_term || 10);
      const totalPolicyMonths = termYears * 12;

      await execute(`UPDATE lic_policies SET total_paid = ? WHERE id = ?`, [totalPaid, policyId]);

      if (totalPolicyMonths > 0 && paidCount >= totalPolicyMonths) {
        const wasCompleted = policy.status === 'Completed';
        await execute(`UPDATE lic_policies SET status = 'Completed' WHERE id = ?`, [policyId]);

        if (!wasCompleted) {
          const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [policy.user_id || 1]);
          if (user && user.telegram_chat_id) {
            const msg = `<b>Venke Finance — LIC Policy Matured 🎉</b>\n\n` +
              `Policy: <b>${policy.policy_name}</b>\n` +
              `Final premium completed (${totalPolicyMonths}/${totalPolicyMonths} paid).\n` +
              `Policy marked as Completed.\n\n` +
              `Venke Finance`;
            await LicAutomationScheduler.sendTelegram(user.telegram_chat_id, msg);
          }

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, details)
             VALUES (?, 'lic', ?, 'Policy Matured', 0, ?, ?, 'All policy premiums fully paid and schedule frozen')`,
            [policy.user_id || 1, policyId, new Date().getMonth() + 1, new Date().getFullYear()]
          );
        }
      } else {
        await execute(`UPDATE lic_policies SET status = 'Running' WHERE id = ?`, [policyId]);
      }
    } catch (err) {
      console.error('[LicAutomationScheduler Recalculate Error]', err);
    }
  }

  // ─── 5. UNIFIED DYNAMIC NEXT SCHEDULED PREMIUM RESOLVER ─────────────────
  static async resolveNextPremium(policyId: number) {
    const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
    if (!policy) return null;

    const totalExpected = Number(policy.policy_term || 10) * 12;
    const rowCheck = await get(`SELECT COUNT(*) as count FROM lic_premium_history WHERE policy_id = ?`, [policyId]);
    
    if (Number(rowCheck?.count || 0) < totalExpected) {
      console.warn(`[LicAutomationScheduler] Policy #${policyId} has ${rowCheck?.count || 0}/${totalExpected} schedule rows. Auto-generating full schedule...`);
      await LicAutomationScheduler.generateFullSchedule(policyId);
    }

    // Query earliest unpaid row using NULL-safe, case-insensitive query
    const nextRow = await get(
      `SELECT * FROM lic_premium_history 
       WHERE policy_id = ? AND (status IS NULL OR LOWER(status) != 'paid') 
       ORDER BY year ASC, month ASC LIMIT 1`,
      [policyId]
    );

    if (!nextRow) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const mIndex = Number(nextRow.month) - 1;
    const monthName = monthNames[mIndex] || `Month ${nextRow.month}`;
    const monthShort = monthShorts[mIndex] || `M${nextRow.month}`;
    const dueDay = String(policy.premium_due_day || 5).padStart(2, '0');
    const amount = Number(nextRow.amount_paid || policy.monthly_premium || 0);

    return {
      id: nextRow.id,
      policyId: policy.id,
      policy_id: policy.id,
      policyName: policy.policy_name,
      month: Number(nextRow.month),
      year: Number(nextRow.year),
      amount,
      amount_paid: amount,
      dueDay: policy.premium_due_day || 5,
      dueDate: `${dueDay} ${monthShort} ${nextRow.year}`,
      monthYearStr: `${monthName} ${nextRow.year}`,
      formattedStr: `${monthName} ${nextRow.year} • ₹${amount.toLocaleString('en-IN')}`,
      status: nextRow.status || 'Pending'
    };
  }

  // Backward compatibility alias for getNextScheduledPremium
  static async getNextScheduledPremium(policyId: number) {
    return await LicAutomationScheduler.resolveNextPremium(policyId);
  }

  // ─── 6. MONTH-START AUTO-PAYMENT & MANUAL SYNC PIPELINE ──────────────────
  static async processMonthStartAutoPayment(userId: number = 1, forceRun: boolean = false, source: 'automation' | 'manual_sync' = 'automation') {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const dateStr = now.toISOString().split('T')[0];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthName = monthNames[currentMonth - 1];

    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const traces: string[] = [];

    const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
    const chatId = user?.telegram_chat_id;

    // Run self-healing repair across all policies first
    await LicAutomationScheduler.getSummary(userId);

    const allLicPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);
    const activePolicies = allLicPolicies.filter((p: any) => LicAutomationScheduler.isPolicyActive(p));

    for (const policy of activePolicies) {
      processedCount++;
      try {
        const rowsBefore = await get(`SELECT COUNT(*) as count FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`, [policy.id]);

        let existing = await get(
          'SELECT * FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?',
          [policy.id, currentMonth, currentYear]
        );

        if (!existing) {
          const amt = Number(policy.monthly_premium) || 0;
          const dueDay = policy.premium_due_day || 5;
          await execute(
            `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
             VALUES (?, ?, ?, ?, ?, 'Pending', 'Scheduled premium')`,
            [policy.id, currentMonth, currentYear, amt, `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`]
          );
          existing = await get(
            'SELECT * FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?',
            [policy.id, currentMonth, currentYear]
          );
        }

        if (existing) {
          if (existing.status === 'Paid' && !existing.remarks?.includes('Auto-generated')) {
            skippedCount++;
            traces.push(`Policy #${policy.id} (${policy.policy_name}): ${currentMonthName} ${currentYear} already paid manually. Skipped.`);
            continue;
          }

          const amt = Number(policy.monthly_premium) || Number(existing.amount_paid) || 0;

          await execute(
            `UPDATE lic_premium_history SET status = 'Paid', paid_date = ?, remarks = 'Auto-generated recurring premium' WHERE id = ?`,
            [dateStr, existing.id]
          );

          await LicAutomationScheduler.recalculateMetrics(policy.id);
          updatedCount++;

          const rowsAfter = await get(`SELECT COUNT(*) as count FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`, [policy.id]);

          const nextRow = await LicAutomationScheduler.resolveNextPremium(policy.id);
          let nextPremStr = 'All Premiums Completed ✓';
          if (nextRow) {
            nextPremStr = `${nextRow.monthYearStr}`;
          }

          const dayStr = String(now.getDate()).padStart(2, '0');
          const shortMonth = now.toLocaleString('en-US', { month: 'short' });
          const formattedPaidDate = `${dayStr} ${shortMonth} ${currentYear}`;

          let telegramSent = 0;
          if (chatId) {
            const msg = `<b>Venke Finance — LIC Premium Recorded</b>\n\n` +
              `Policy: <b>${policy.policy_name}</b>\n` +
              `Month: <b>${currentMonthName} ${currentYear}</b>\n` +
              `Amount: <b>₹${amt.toLocaleString('en-IN')}</b>\n` +
              `Status: <b>Paid</b>\n` +
              `Paid on: <b>${formattedPaidDate}</b>\n` +
              `Next premium: <b>${nextPremStr}</b>\n\n` +
              `Venke Finance`;

            const ok = await LicAutomationScheduler.sendTelegram(chatId, msg);
            if (ok) telegramSent = 1;
          }

          const structuredLog = `[SCHEDULER] Policy ID: ${policy.id} | Target Month: ${currentMonthName} ${currentYear} | Pending Item Found: Yes | Marked Paid: Success | Next Premium Resolved: ${nextPremStr} | Telegram Dispatched: ${telegramSent ? 'Success' : 'Skipped'} | Metrics Sync: Success`;

          traces.push(`Policy #${policy.id} (${policy.policy_name}): Month ${currentMonthName} ${currentYear} marked Paid. Paid rows before: ${rowsBefore?.count || 0}, after: ${rowsAfter?.count || 0}. Next Premium: ${nextPremStr}. Telegram: ${telegramSent ? 'Success' : 'Skipped'}.`);

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, 'lic', ?, 'Auto-marked Paid', ?, ?, ?, ?, ?)`,
            [userId, policy.id, amt, currentMonth, currentYear, telegramSent, structuredLog]
          );
        }
      } catch (err: any) {
        failedCount++;
        console.error(`[LicAutomationScheduler Month-Start Error] Policy ID: ${policy.id}`, err);
      }
    }

    return { processedCount, updatedCount, skippedCount, failedCount, traces };
  }

  // ─── 7. MONTH-END FORECAST REMINDER PIPELINE ──────────────────────────────
  static async generateMonthEndForecast(userId: number = 1): Promise<{ text: string; totalCommitments: number }> {
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthName = nextMonthDate.toLocaleString('en-US', { month: 'long' });
    const nextMonthShort = nextMonthDate.toLocaleString('en-US', { month: 'short' });
    const nextYear = nextMonthDate.getFullYear();

    const currMonthPrefix = now.toISOString().slice(0, 7);

    // Compute Available Balance
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSavings = 0;
    try {
      const txs = await query(
        `SELECT t.*, c.name as category_name, c.type as category_type
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.date LIKE ?`,
        [userId, `${currMonthPrefix}%`]
      );
      for (const t of txs) {
        const catType = (t.category_type || '').toLowerCase();
        const catName = (t.category_name || '').toLowerCase();
        const amt = Number(t.amount) || 0;
        if (catType === 'income') totalIncome += amt;
        else if (catType === 'savings' || ['lic', 'sip', 'chit', 'gold'].some(k => catName.includes(k))) totalSavings += amt;
        else if (catType === 'expense') totalExpenses += amt;
      }
    } catch (_) {}
    const availableBalance = Math.max(0, totalIncome - totalExpenses - totalSavings);

    const allLicPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);
    const activePolicies = allLicPolicies.filter((p: any) => LicAutomationScheduler.isPolicyActive(p));

    let licItems: Array<{ name: string; amount: number; dueDay: number }> = [];
    let totalCommitments = 0;

    for (const policy of activePolicies) {
      const amt = Number(policy.monthly_premium) || 0;
      const dueDay = policy.premium_due_day || 5;
      licItems.push({ name: policy.policy_name, amount: amt, dueDay });
      totalCommitments += amt;
    }

    const surplus = availableBalance - totalCommitments;
    const isShortfall = surplus < 0;

    let text = `<b>Venke Finance — ${nextMonthName} ${nextYear} LIC Premium Forecast</b>\n\n`;

    if (licItems.length > 0) {
      licItems.sort((a, b) => a.dueDay - b.dueDay).forEach(item => {
        text += `<b>${item.name}</b>\n₹${item.amount.toLocaleString('en-IN')} | Due: ${String(item.dueDay).padStart(2, '0')} ${nextMonthShort}\n\n`;
      });
    }

    text += `Total LIC commitment: <b>₹${totalCommitments.toLocaleString('en-IN')}</b>\n`;
    text += `Available balance: <b>₹${availableBalance.toLocaleString('en-IN')}</b>\n`;

    if (isShortfall) {
      text += `Expected Shortfall: <b>₹${Math.abs(surplus).toLocaleString('en-IN')}</b>\n`;
      text += `Recommendation: Keep ₹${Math.abs(surplus).toLocaleString('en-IN')} available before ${nextMonthName} begins.\n\n`;
    } else {
      text += `Surplus: <b>₹${surplus.toLocaleString('en-IN')}</b>\n\n`;
    }

    text += `Venke Finance`;

    return { text, totalCommitments };
  }

  // ─── 8. 3-DAY DUE DATE REMINDERS PIPELINE ─────────────────────────
  static async processDueReminders(userId: number = 1) {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    const currDay = now.getDate();

    const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
    const chatId = user?.telegram_chat_id;
    if (!chatId) return;

    const allPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);
    const activePolicies = allPolicies.filter((p: any) => LicAutomationScheduler.isPolicyActive(p));

    for (const policy of activePolicies) {
      const dueDay = policy.premium_due_day || 5;
      const daysDiff = dueDay - currDay;

      if (daysDiff === 3) {
        const reminderSent = await get(
          `SELECT id FROM recurring_automation_logs 
           WHERE user_id = ? AND module_type = 'lic' AND entity_id = ? 
             AND action = 'Reminder Sent' AND period_month = ? AND period_year = ?`,
          [userId, policy.id, currMonth, currYear]
        );

        if (!reminderSent) {
          const monthName = now.toLocaleString('en-US', { month: 'short' });
          const dueStr = `${String(dueDay).padStart(2, '0')} ${monthName} ${currYear}`;
          const msg = `<b>LIC Premium Reminder</b>\n\n` +
            `Policy: <b>${policy.policy_name}</b>\n` +
            `Premium: <b>₹${Number(policy.monthly_premium).toLocaleString('en-IN')}</b>\n` +
            `Due Date: <b>${dueStr}</b>\n\n` +
            `Reminder: Premium due in 3 days. Please keep ₹${Number(policy.monthly_premium).toLocaleString('en-IN')} available.\n\n` +
            `Venke Finance`;

          const ok = await LicAutomationScheduler.sendTelegram(chatId, msg);
          const structuredLog = `[SCHEDULER] Policy ID: ${policy.id} | Action: Reminder Sent | Due Date: ${dueStr} | Telegram Dispatched: ${ok ? 'Success' : 'Skipped'}`;
          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, 'lic', ?, 'Reminder Sent', ?, ?, ?, ?, ?)`,
            [userId, policy.id, policy.monthly_premium, currMonth, currYear, ok ? 1 : 0, structuredLog]
          );
        }
      }
    }
  }

  // ─── 9. ADMIN MANUAL SYNC PIPELINE ────────────────────────────────────────
  static async processManualSync(userId: number = 1) {
    return await LicAutomationScheduler.processMonthStartAutoPayment(userId, true, 'manual_sync');
  }

  // ─── 10. UNIFIED SHARED SUMMARY AGGREGATION SERVICE ──────────────────────
  static async getSummary(userId: number = 1) {
    const allPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);

    for (const p of allPolicies) {
      const paidRes = await get(
        `SELECT COUNT(*) as count FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`,
        [p.id]
      );
      const paidCount = Number(paidRes?.count || 0);
      const termYears = Number(p.policy_term || 10);
      const totalPolicyMonths = termYears * 12;

      if (totalPolicyMonths > 0 && paidCount < totalPolicyMonths && (p.status === 'Completed' || p.status === 'completed')) {
        await execute(`UPDATE lic_policies SET status = 'Running' WHERE id = ?`, [p.id]);
        p.status = 'Running';
      } else if (totalPolicyMonths > 0 && paidCount >= totalPolicyMonths && p.status !== 'Completed') {
        await execute(`UPDATE lic_policies SET status = 'Completed' WHERE id = ?`, [p.id]);
        p.status = 'Completed';
      }
    }

    const activePoliciesList = allPolicies.filter((p: any) => LicAutomationScheduler.isPolicyActive(p));
    const activePolicies = activePoliciesList.length;
    const totalPolicies = allPolicies.length;

    let totalPremiumPaid = 0;
    let totalRemainingPremium = 0;
    let monthlyPremiumTotal = 0;
    let totalCoverage = 0;
    let paidThisYear = 0;
    let completionPercentageSum = 0;

    const currentYear = new Date().getFullYear();
    const today = new Date();
    let earliestMaturityDate: Date | null = null;

    for (const p of allPolicies) {
      const active = LicAutomationScheduler.isPolicyActive(p);
      const monthlyAmt = Number(p.monthly_premium || 0);
      if (active) monthlyPremiumTotal += monthlyAmt;
      totalCoverage += Number(p.sum_assured || 0);

      const paidRes = await get(
        `SELECT COUNT(*) as count, SUM(amount_paid) as total 
         FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`,
        [p.id]
      );
      const yearPaidRes = await get(
        `SELECT SUM(amount_paid) as total 
         FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid' AND year = ?`,
        [p.id, currentYear]
      );

      const paidCount = Number(paidRes?.count || 0);
      const paidSum = Number(paidRes?.total || 0);
      totalPremiumPaid += paidSum;
      paidThisYear += Number(yearPaidRes?.total || 0);

      const termYears = Number(p.policy_term || 10);
      const totalPolicyMonths = termYears * 12;
      const monthsRemaining = Math.max(0, totalPolicyMonths - paidCount);
      if (active) totalRemainingPremium += (monthsRemaining * monthlyAmt);

      const pct = totalPolicyMonths > 0 ? Math.min(100, Math.round((paidCount / totalPolicyMonths) * 100)) : 0;
      completionPercentageSum += pct;

      if (p.maturity_date && active) {
        const matDate = new Date(p.maturity_date);
        if (!earliestMaturityDate || matDate < earliestMaturityDate) {
          earliestMaturityDate = matDate;
        }
      }
    }

    const completionPercentage = totalPolicies > 0 ? Math.round(completionPercentageSum / totalPolicies) : 0;

    let maturityCountdownDays = 0;
    if (earliestMaturityDate) {
      const diff = earliestMaturityDate.getTime() - today.getTime();
      maturityCountdownDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const activeIds = activePoliciesList.map((p: any) => p.id);
    let nextUnpaidRow = null;
    if (activeIds.length > 0) {
      nextUnpaidRow = await LicAutomationScheduler.resolveNextPremium(activeIds[0]);
    }

    let upcomingPremiumDue = 'No upcoming premiums';
    let nextPremiumDate = null;
    let nextPremiumAmount = 0;
    let nextPremiumDueDate = null;
    let nextPremiumMonth = null;
    let nextPremiumYear = null;

    if (nextUnpaidRow) {
      upcomingPremiumDue = `${nextUnpaidRow.policyName} — ₹${Number(nextUnpaidRow.amount).toLocaleString('en-IN')} (Due: ${nextUnpaidRow.dueDate})`;
      nextPremiumDate = nextUnpaidRow.monthYearStr;
      nextPremiumAmount = Number(nextUnpaidRow.amount || 0);
      nextPremiumDueDate = nextUnpaidRow.dueDate;
      nextPremiumMonth = nextUnpaidRow.month;
      nextPremiumYear = nextUnpaidRow.year;
    } else if (activePolicies > 0) {
      upcomingPremiumDue = 'All Premiums Completed ✓';
    }

    return {
      activePolicies,
      totalPolicies,
      totalPremiumPaid,
      totalRemainingPremium,
      monthlyPremiumTotal,
      upcomingPremiumDue,
      nextPremiumDate,
      nextPremiumAmount,
      nextPremiumDueDate,
      nextPremiumMonth,
      nextPremiumYear,
      paidThisYear,
      completionPercentage,
      maturityCountdownDays,
      totalCoverage
    };
  }
}
