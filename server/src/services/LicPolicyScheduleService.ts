import { query, execute, get } from '../database';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class LicPolicyScheduleService {
  // ─── 1. TELEGRAM NOTIFICATION DISPATCHER ───────────────────────────────────
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
      console.error('[LicPolicyScheduleService Telegram Error]', err.message);
      return false;
    }
  }

  // ─── 2. ACTIVE POLICY DETERMINATION ─────────────────────────────────────────
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

  // ─── 3. FULL LIFECYCLE CONTRACT SCHEDULE GENERATOR ────────────────────────
  static async generateFullContractSchedule(policyId: number, forceRegenerate: boolean = false): Promise<{ success: boolean; rowsGenerated: number; validation: any }> {
    try {
      const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
      if (!policy || !policy.start_date) {
        return { success: false, rowsGenerated: 0, validation: { error: 'Policy not found or missing start date' } };
      }

      // Check if already generated and forceRegenerate is false
      if (!forceRegenerate && policy.schedule_generated_at) {
        const countRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ?`, [policyId]);
        const totalPolicyMonths = Number(policy.policy_term || 10) * 12;
        if (Number(countRes?.count || 0) === totalPolicyMonths) {
          return {
            success: true,
            rowsGenerated: totalPolicyMonths,
            validation: { message: 'Schedule already exists and complete. Skipped regeneration.' }
          };
        }
      }

      const now = new Date();
      const currYear = now.getFullYear();
      const currMonth = now.getMonth() + 1;

      const startDate = new Date(policy.start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      const termYears = Number(policy.policy_term || 10);
      const freq = (policy.frequency || policy.premium_frequency || 'monthly').toLowerCase();
      
      let stepMonths = 1;
      let totalInstallments = termYears * 12;

      if (freq.includes('quarter')) {
        stepMonths = 3;
        totalInstallments = termYears * 4;
      } else if (freq.includes('half') || freq.includes('semi')) {
        stepMonths = 6;
        totalInstallments = termYears * 2;
      } else if (freq.includes('year') || freq.includes('annual')) {
        stepMonths = 12;
        totalInstallments = termYears * 1;
      }

      const monthlyAmt = Number(policy.monthly_premium) || 0;
      const dueDay = policy.premium_due_day || 5;

      let y = startYear;
      let m = startMonth;

      // Fetch all existing historical paid records from execution ledger (lic_premium_history)
      const historicalPaidRecords = await query(
        `SELECT * FROM lic_premium_history WHERE policy_id = ? AND LOWER(status) = 'paid'`,
        [policyId]
      );
      const historicalPaidSet = new Set(historicalPaidRecords.map((r: any) => `${r.year}-${r.month}`));

      let insertedCount = 0;

      for (let i = 1; i <= totalInstallments; i++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
        
        // Determine status based on historical ledger or past date
        const isPast = (y < currYear) || (y === currYear && m < currMonth);
        const hasHistoryPaid = historicalPaidSet.has(`${y}-${m}`);

        let initialStatus = 'Pending';
        let initialPaidDate: string | null = null;
        let initialSource: string | null = null;

        if (hasHistoryPaid) {
          initialStatus = 'Paid';
          const matchHist = historicalPaidRecords.find((r: any) => r.year === y && r.month === m);
          initialPaidDate = matchHist?.paid_date || dateStr;
          initialSource = 'manual_import';
        } else if (isPast) {
          initialStatus = 'Paid';
          initialPaidDate = dateStr;
          initialSource = 'auto_backfill';
        } else if (y === currYear && m === currMonth) {
          initialStatus = 'Pending';
        }

        const existingRow = await get(
          `SELECT id, status FROM lic_premium_schedule WHERE policy_id = ? AND installment_number = ?`,
          [policyId, i]
        );

        if (existingRow) {
          await execute(
            `UPDATE lic_premium_schedule 
             SET due_date = ?, month = ?, year = ?, premium_amount = ? 
             WHERE id = ?`,
            [dateStr, m, y, monthlyAmt, existingRow.id]
          );
        } else {
          await execute(
            `INSERT INTO lic_premium_schedule 
             (policy_id, installment_number, due_date, month, year, premium_amount, status, paid_date, payment_source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [policyId, i, dateStr, m, y, monthlyAmt, initialStatus, initialPaidDate, initialSource]
          );
          insertedCount++;
        }

        // MANDATORY PARITY RULE: Mirror Paid installments into lic_premium_history
        if (initialStatus === 'Paid') {
          const existingHist = await get(
            `SELECT id FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
            [policyId, m, y]
          );
          if (!existingHist) {
            await execute(
              `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
               VALUES (?, ?, ?, ?, ?, 'Paid', ?)`,
              [policyId, m, y, monthlyAmt, initialPaidDate || dateStr, 'Historical Backfill']
            );
          }
        }

        // Increment month by stepMonths
        m += stepMonths;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
      }

      // Mark schedule_generated_at timestamp
      await execute(`UPDATE lic_policies SET schedule_generated_at = CURRENT_TIMESTAMP WHERE id = ?`, [policyId]);

      // MIGRATION VALIDATION CHECK
      const finalCountRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ?`, [policyId]);
      const finalPaidRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`, [policyId]);
      const finalPendingRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'`, [policyId]);
      const finalOverdueRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Overdue'`, [policyId]);

      const totalRows = Number(finalCountRes?.count || 0);
      const paidRows = Number(finalPaidRes?.count || 0);
      const pendingRows = Number(finalPendingRes?.count || 0);
      const overdueRows = Number(finalOverdueRes?.count || 0);

      const isValid = totalRows === totalInstallments && (paidRows + pendingRows + overdueRows === totalRows);

      const validation = {
        isValid,
        totalPolicyMonths: totalInstallments,
        totalRows,
        paidRows,
        pendingRows,
        overdueRows
      };

      if (!isValid) {
        console.error(`[LicPolicyScheduleService Validation Failed] Policy #${policyId}: Expected ${totalInstallments} rows, got ${totalRows}.`);
      }

      await LicPolicyScheduleService.recalculateMetrics(policyId);

      return { success: isValid, rowsGenerated: insertedCount, validation };
    } catch (err: any) {
      console.error('[LicPolicyScheduleService Full Schedule Error]', err);
      return { success: false, rowsGenerated: 0, validation: { error: err.message } };
    }
  }

  // ─── 4. SCHEDULE INTEGRITY CHECK & AUTOMATIC REPAIR ────────────────────────
  static async syncScheduleWithPaymentHistory(policyId: number) {
    try {
      const paidScheduleRows = await query(
        `SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`,
        [policyId]
      );

      for (const sch of paidScheduleRows) {
        const histRow = await get(
          `SELECT id FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
          [policyId, sch.month, sch.year]
        );
        if (!histRow) {
          await execute(
            `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
             VALUES (?, ?, ?, ?, ?, 'Paid', ?)`,
            [policyId, sch.month, sch.year, sch.premium_amount, sch.paid_date || sch.due_date, 'Auto-synced from schedule']
          );
        }
      }
    } catch (err) {
      console.error('[LicPolicyScheduleService History Sync Error]', err);
    }
  }

  static async verifyAndRepairScheduleIntegrity(policyId: number): Promise<boolean> {
    try {
      const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
      if (!policy) return false;

      const totalExpected = Number(policy.policy_term || 10) * 12;
      const countRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ?`, [policyId]);
      const currentRows = Number(countRes?.count || 0);

      if (currentRows !== totalExpected) {
        console.warn(`[LicPolicyScheduleService Integrity Check Failed] Policy #${policyId}: Total rows (${currentRows}) != Expected (${totalExpected}). Auto-repairing schedule...`);
        await LicPolicyScheduleService.generateFullContractSchedule(policyId, true);
      }

      await LicPolicyScheduleService.syncScheduleWithPaymentHistory(policyId);
      return true;
    } catch (err) {
      console.error('[LicPolicyScheduleService Integrity Check Error]', err);
      return false;
    }
  }

  // ─── 5. UNIFIED NEXT SCHEDULED PREMIUM POINTER RESOLUTION ─────────────────
  static async getNextScheduledPremium(policyId: number) {
    // Run Schedule Integrity Check first
    await LicPolicyScheduleService.verifyAndRepairScheduleIntegrity(policyId);

    const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
    if (!policy) return null;

    // Primary Logic: Query earliest pending/overdue installment by installment_number ASC
    const nextRow = await get(
      `SELECT * FROM lic_premium_schedule 
       WHERE policy_id = ? AND status IN ('Pending', 'Overdue') 
       ORDER BY installment_number ASC LIMIT 1`,
      [policyId]
    );

    if (!nextRow) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const mIndex = Number(nextRow.month) - 1;
    const monthName = monthNames[mIndex] || `Month ${nextRow.month}`;
    const monthShort = monthShorts[mIndex] || `M${nextRow.month}`;
    const dueDay = String(policy.premium_due_day || 5).padStart(2, '0');
    const amount = Number(nextRow.premium_amount || policy.monthly_premium || 0);

    return {
      id: nextRow.id,
      policyId: policy.id,
      policy_id: policy.id,
      policyName: policy.policy_name,
      installmentNumber: nextRow.installment_number,
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

  // ─── 6. RECALCULATE POLICY METRICS & SYNCHRONIZE EXECUTIVE LEDGER ─────────
  static async recalculateMetrics(policyId: number) {
    try {
      const paidRes = await get(
        `SELECT COUNT(*) as count, SUM(premium_amount) as total 
         FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`,
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
            await LicPolicyScheduleService.sendTelegram(user.telegram_chat_id, msg);
          }

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, details)
             VALUES (?, 'lic', ?, 'Policy Matured', 0, ?, ?, 'All policy contract installments fully paid')`,
            [policy.user_id || 1, policyId, new Date().getMonth() + 1, new Date().getFullYear()]
          );
        }
      } else {
        await execute(`UPDATE lic_policies SET status = 'Running' WHERE id = ?`, [policyId]);
      }
    } catch (err) {
      console.error('[LicPolicyScheduleService Recalculate Error]', err);
    }
  }

  // ─── 7. MONTH-START AUTOMATION & SCHEDULER IDEMPOTENCY ─────────────────
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

    // Run summary sync & contract schedule initialization
    await LicPolicyScheduleService.getSummary(userId);

    const allLicPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);
    const activePolicies = allLicPolicies.filter((p: any) => LicPolicyScheduleService.isPolicyActive(p));

    for (const policy of activePolicies) {
      processedCount++;
      try {
        // SCHEDULER IDEMPOTENCY CHECK
        if (!forceRun && policy.last_automation_run_month === currentMonth && policy.last_automation_run_year === currentYear) {
          skippedCount++;
          traces.push(`Policy #${policy.id} (${policy.policy_name}): Already automated for ${currentMonthName} ${currentYear}. Idempotency lock active.`);
          continue;
        }

        // Find current month contract schedule entry
        let scheduleRow = await get(
          'SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?',
          [policy.id, currentMonth, currentYear]
        );

        if (!scheduleRow) {
          await LicPolicyScheduleService.generateFullContractSchedule(policy.id, true);
          scheduleRow = await get(
            'SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?',
            [policy.id, currentMonth, currentYear]
          );
        }

        if (scheduleRow) {
          if (scheduleRow.status === 'Paid') {
            skippedCount++;
            traces.push(`Policy #${policy.id} (${policy.policy_name}): ${currentMonthName} ${currentYear} is already Paid. Skipped.`);
            continue;
          }

          const amt = Number(scheduleRow.premium_amount || policy.monthly_premium || 0);

          // MANDATORY IMMUTABILITY RULE: Update ONLY status, paid_date, and payment_source!
          await execute(
            `UPDATE lic_premium_schedule 
             SET status = 'Paid', paid_date = ?, payment_source = ? 
             WHERE id = ?`,
            [dateStr, source, scheduleRow.id]
          );

          // Mirror execution to lic_premium_history ledger (no duplicate)
          const histRow = await get(
            `SELECT id FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
            [policy.id, currentMonth, currentYear]
          );
          if (histRow) {
            await execute(
              `UPDATE lic_premium_history SET status = 'Paid', paid_date = ?, remarks = ? WHERE id = ?`,
              [dateStr, `Auto-generated (${source})`, histRow.id]
            );
          } else {
            await execute(
              `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks)
               VALUES (?, ?, ?, ?, ?, 'Paid', ?)`,
              [policy.id, currentMonth, currentYear, amt, dateStr, `Auto-generated (${source})`]
            );
          }

          // Mark idempotency state lock in policy
          await execute(
            `UPDATE lic_policies SET last_automation_run_month = ?, last_automation_run_year = ? WHERE id = ?`,
            [currentMonth, currentYear, policy.id]
          );

          await LicPolicyScheduleService.recalculateMetrics(policy.id);
          updatedCount++;

          const nextRow = await LicPolicyScheduleService.getNextScheduledPremium(policy.id);
          let nextPremStr = 'All Premiums Completed ✓';
          let nextDueStr = 'N/A';
          if (nextRow) {
            nextPremStr = `${nextRow.monthYearStr}`;
            nextDueStr = `${nextRow.dueDate}`;
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
              `Next Premium: <b>${nextPremStr}</b>\n` +
              `Due: <b>${nextDueStr}</b>\n\n` +
              `Venke Finance`;

            const ok = await LicPolicyScheduleService.sendTelegram(chatId, msg);
            if (ok) telegramSent = 1;
          }

          const structuredLog = `[SCHEDULER] Policy ID: ${policy.id} | Installment: ${scheduleRow.installment_number} | Target Month: ${currentMonthName} ${currentYear} | Marked Paid: Success | Source: ${source} | Next Premium: ${nextPremStr} | Telegram: ${telegramSent ? 'Success' : 'Skipped'}`;

          traces.push(`Policy #${policy.id} (${policy.policy_name}): Installment #${scheduleRow.installment_number} (${currentMonthName} ${currentYear}) marked Paid via ${source}. Next Premium: ${nextPremStr}.`);

          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, 'lic', ?, 'Auto-marked Paid', ?, ?, ?, ?, ?)`,
            [userId, policy.id, amt, currentMonth, currentYear, telegramSent, structuredLog]
          );
        }
      } catch (err: any) {
        failedCount++;
        console.error(`[LicPolicyScheduleService Month-Start Error] Policy ID: ${policy.id}`, err);
      }
    }

    return { processedCount, updatedCount, skippedCount, failedCount, traces };
  }

  // ─── 8. MONTH-END FORECAST REMINDER PIPELINE ──────────────────────────────
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
    const activePolicies = allLicPolicies.filter((p: any) => LicPolicyScheduleService.isPolicyActive(p));

    let licItems: Array<{ name: string; amount: number; dueDay: number }> = [];
    let totalCommitments = 0;

    for (const policy of activePolicies) {
      // Query contract schedule for next month entry
      const schRow = await get(
        `SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?`,
        [policy.id, nextMonthDate.getMonth() + 1, nextYear]
      );

      const amt = Number(schRow?.premium_amount || policy.monthly_premium || 0);
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

    text += `Total LIC Commitment: <b>₹${totalCommitments.toLocaleString('en-IN')}</b>\n`;
    text += `Available Balance: <b>₹${availableBalance.toLocaleString('en-IN')}</b>\n`;

    if (isShortfall) {
      text += `Expected Shortfall: <b>₹${Math.abs(surplus).toLocaleString('en-IN')}</b>\n`;
      text += `Recommendation: Keep ₹${Math.abs(surplus).toLocaleString('en-IN')} available before ${nextMonthName} begins.\n\n`;
    } else {
      text += `Expected Surplus: <b>₹${surplus.toLocaleString('en-IN')}</b>\n\n`;
    }

    text += `Venke Finance`;

    return { text, totalCommitments };
  }

  // ─── 9. 3-DAY DUE DATE REMINDERS PIPELINE ─────────────────────────
  static async processDueReminders(userId: number = 1) {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    const currDay = now.getDate();

    const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
    const chatId = user?.telegram_chat_id;
    if (!chatId) return;

    const allPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);
    const activePolicies = allPolicies.filter((p: any) => LicPolicyScheduleService.isPolicyActive(p));

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
          const msg = `<b>LIC Premium Due Reminder</b>\n\n` +
            `Policy: <b>${policy.policy_name}</b>\n` +
            `Amount: <b>₹${Number(policy.monthly_premium).toLocaleString('en-IN')}</b>\n` +
            `Due: <b>${dueStr}</b>\n` +
            `Days Remaining: <b>3</b>\n\n` +
            `Venke Finance`;

          const ok = await LicPolicyScheduleService.sendTelegram(chatId, msg);
          const structuredLog = `[SCHEDULER] Policy ID: ${policy.id} | Action: Reminder Sent | Due Date: ${dueStr} | Telegram: ${ok ? 'Success' : 'Skipped'}`;
          await execute(
            `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
             VALUES (?, 'lic', ?, 'Reminder Sent', ?, ?, ?, ?, ?)`,
            [userId, policy.id, policy.monthly_premium, currMonth, currYear, ok ? 1 : 0, structuredLog]
          );
        }
      }
    }
  }

  // ─── 10. ADMIN MANUAL SYNC PIPELINE ──────────────────────────────────────
  static async processManualSync(userId: number = 1) {
    return await LicPolicyScheduleService.processMonthStartAutoPayment(userId, true, 'manual_sync');
  }

  // ─── 11. UNIFIED SHARED SUMMARY AGGREGATION SERVICE ──────────────────────
  static async getSummary(userId: number = 1) {
    const allPolicies = await query(`SELECT * FROM lic_policies WHERE user_id = ?`, [userId]);

    for (const p of allPolicies) {
      // Initialize full contract schedule for policy if missing
      if (!p.schedule_generated_at) {
        await LicPolicyScheduleService.generateFullContractSchedule(p.id);
      }

      const paidRes = await get(
        `SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`,
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

    const activePoliciesList = allPolicies.filter((p: any) => LicPolicyScheduleService.isPolicyActive(p));
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
      const active = LicPolicyScheduleService.isPolicyActive(p);
      const monthlyAmt = Number(p.monthly_premium || 0);
      if (active) monthlyPremiumTotal += monthlyAmt;
      totalCoverage += Number(p.sum_assured || 0);

      const paidRes = await get(
        `SELECT COUNT(*) as count, SUM(premium_amount) as total 
         FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`,
        [p.id]
      );
      const yearPaidRes = await get(
        `SELECT SUM(premium_amount) as total 
         FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid' AND year = ?`,
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
      nextUnpaidRow = await LicPolicyScheduleService.getNextScheduledPremium(activeIds[0]);
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
