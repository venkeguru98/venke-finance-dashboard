import { Router, Request, Response } from 'express';
import { query, execute, get } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ==========================================
// 1. DASHBOARD & REMINDERS SUMMARY
// ==========================================
router.get('/dashboard', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  try {
    // 1.1 Summary Stats via Shared LIC Aggregation Service
    const licSummary = await getLicModuleSummary(userId);
    const activeLicCount = { count: licSummary.activePolicies };
    const licPremiumDue = licSummary.nextPremiumAmount || licSummary.monthlyPremiumTotal;
    const runningPolicies = await query(
      `SELECT id, monthly_premium, premium_due_day FROM lic_policies WHERE user_id = ? AND (status = 'Running' OR status = 'Active' OR status IS NULL)`,
      [userId]
    );

    const goldInvested = await get(
      `SELECT SUM(amount) as total FROM digital_gold_transactions t 
       JOIN digital_gold g ON t.gold_id = g.id 
       WHERE g.user_id = ?`,
      [userId]
    );

    const activeChitsCount = await get(
      `SELECT COUNT(*) as count FROM chit_funds WHERE user_id = ? AND status = 'Running'`,
      [userId]
    );

    // Upcoming Chit Payments (sum of pending chit installments due this month)
    const runningChits = await query(
      `SELECT id FROM chit_funds WHERE user_id = ? AND status = 'Running'`,
      [userId]
    );
    let upcomingChitPayments = 0;
    for (const chit of runningChits) {
      const pendingThisMonth = await get(
        `SELECT SUM(installment_amount) as total FROM chit_payments 
         WHERE chit_id = ? AND month = ? AND year = ? AND status = 'Pending'`,
        [chit.id, currentMonth, currentYear]
      );
      if (pendingThisMonth && pendingThisMonth.total) {
        upcomingChitPayments += pendingThisMonth.total;
      }
    }

    const savingsBalance = await get(
      `SELECT SUM(current_balance) as total FROM savings_accounts WHERE user_id = ?`,
      [userId]
    );

    // Compute outstanding debt and receivable amounts for Debt Manager
    const debtTx = await query(
      `SELECT id, amount, type, status FROM debt_transactions WHERE user_id = ?`,
      [userId]
    );
    let outstandingDebt = 0;
    let receivableAmount = 0;

    for (const tx of debtTx) {
      if (tx.status === 'Settled') continue;
      const settled = await get(
        `SELECT SUM(amount) as total FROM debt_settlements WHERE transaction_id = ?`,
        [tx.id]
      );
      const settledAmount = settled?.total || 0;
      const outstanding = Math.max(0, tx.amount - settledAmount);
      if (tx.type === 'Borrowed') {
        outstandingDebt += outstanding;
      } else if (tx.type === 'Lent') {
        receivableAmount += outstanding;
      }
    }

    // 1.2 Reminders Engine
    const reminders: string[] = [];

    // LIC reminders
    for (const policy of runningPolicies) {
      const policyDetails = await get(`SELECT policy_name, maturity_date FROM lic_policies WHERE id = ?`, [policy.id]);
      const paidThisMonth = await get(
        `SELECT COUNT(*) as count FROM lic_premium_history 
         WHERE policy_id = ? AND month = ? AND year = ? AND status = 'Paid'`,
        [policy.id, currentMonth, currentYear]
      );

      if (paidThisMonth.count === 0) {
        const daysLeft = policy.premium_due_day - currentDay;
        if (daysLeft < 0) {
          reminders.push(`⚠️ LIC Policy "${policyDetails.policy_name}" premium is OVERDUE (due day: ${policy.premium_due_day}th)`);
        } else if (daysLeft <= 5) {
          reminders.push(`🔔 LIC Policy "${policyDetails.policy_name}" premium is due in ${daysLeft} days (on the ${policy.premium_due_day}th)`);
        }
      }

      // LIC Maturity countdown (within 120 days)
      const maturity = new Date(policyDetails.maturity_date);
      const diffTime = maturity.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 120) {
        reminders.push(`🎯 LIC Policy "${policyDetails.policy_name}" matures in ${diffDays} days on ${policyDetails.maturity_date}`);
      }
    }

    // Chit reminders
    const chitsList = await query(
      `SELECT id, chit_name, closing_date, monthly_installment FROM chit_funds WHERE user_id = ? AND status = 'Running'`,
      [userId]
    );
    for (const chit of chitsList) {
      const pendingThisMonth = await get(
        `SELECT installment_amount FROM chit_payments 
         WHERE chit_id = ? AND month = ? AND year = ? AND status = 'Pending'`,
        [chit.id, currentMonth, currentYear]
      );
      if (pendingThisMonth) {
        reminders.push(`📅 Chit Fund "${chit.chit_name}" monthly payment of ₹${pendingThisMonth.installment_amount} is pending.`);
      }

      const closing = new Date(chit.closing_date);
      const diffTime = closing.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 45) {
        reminders.push(`🏁 Chit Fund "${chit.chit_name}" closes in ${diffDays} days on ${chit.closing_date}`);
      }
    }

    // Savings Account alerts
    const lowBalanceAccounts = await query(
      `SELECT account_name, current_balance FROM savings_accounts WHERE user_id = ? AND current_balance < 2000`,
      [userId]
    );
    for (const acc of lowBalanceAccounts) {
      reminders.push(`⚠️ Savings Account "${acc.account_name}" has low balance: ₹${acc.current_balance.toLocaleString('en-IN')} (min limit ₹2,000)`);
    }

    // 1.3 Chart Summaries
    const licYearly = await query(
      `SELECT year, SUM(amount_paid) as total FROM lic_premium_history h 
       JOIN lic_policies p ON h.policy_id = p.id 
       WHERE p.user_id = ? AND h.status = 'Paid' 
       GROUP BY year ORDER BY year ASC`,
      [userId]
    );

    const goldYearly = await query(
      `SELECT year, SUM(amount) as total FROM digital_gold_transactions t 
       JOIN digital_gold g ON t.gold_id = g.id 
       WHERE g.user_id = ? 
       GROUP BY year ORDER BY year ASC`,
      [userId]
    );

    const chitProgress = await query(
      `SELECT c.chit_name as name, COALESCE(SUM(p.installment_amount), 0) as paid, (c.monthly_installment * c.total_months) as total 
       FROM chit_funds c 
       LEFT JOIN chit_payments p ON c.id = p.chit_id AND p.status = 'Paid' 
       WHERE c.user_id = ? 
       GROUP BY c.id, c.chit_name, c.monthly_installment, c.total_months`,
      [userId]
    );

    const savingsBalances = await query(
      `SELECT account_name as name, current_balance as balance, color_tag as color FROM savings_accounts WHERE user_id = ?`,
      [userId]
    );

    // 1.4 Unified Activity Timeline
    const licTimeline = await query(
      `SELECT 'lic' as type, p.policy_name as name, h.amount_paid as amount, h.paid_date as date, 'Premium Paid' as description 
       FROM lic_premium_history h 
       JOIN lic_policies p ON h.policy_id = p.id 
       WHERE p.user_id = ? AND h.status = 'Paid' 
       ORDER BY h.paid_date DESC LIMIT 5`,
      [userId]
    );

    const goldTimeline = await query(
      `SELECT 'gold' as type, g.investment_name as name, t.amount as amount, t.created_at as date, t.remarks as description 
       FROM digital_gold_transactions t 
       JOIN digital_gold g ON t.gold_id = g.id 
       WHERE g.user_id = ? 
       ORDER BY t.created_at DESC LIMIT 5`,
      [userId]
    );

    const chitTimeline = await query(
      `SELECT 'chit' as type, c.chit_name as name, p.installment_amount as amount, p.payment_date as date, 'Installment Paid' as description 
       FROM chit_payments p 
       JOIN chit_funds c ON p.chit_id = c.id 
       WHERE c.user_id = ? AND p.status = 'Paid' 
       ORDER BY p.payment_date DESC LIMIT 5`,
      [userId]
    );

    const savingsTimeline = await query(
      `SELECT 'savings' as type, a.account_name as name, t.amount as amount, t.date, t.description 
       FROM savings_transactions t 
       JOIN savings_accounts a ON t.account_id = a.id 
       WHERE t.user_id = ? 
       ORDER BY t.date DESC LIMIT 5`,
      [userId]
    );

    // Helper to format date safely (handles both SQLite text dates and PG native Date objects)
    const formatDateStr = (d: any) => {
      if (!d) return '';
      if (d instanceof Date) {
        return d.toISOString().split('T')[0];
      }
      if (typeof d === 'string') {
        return d.split(' ')[0].split('T')[0];
      }
      return String(d);
    };

    // Compute mutual funds portfolio total value
    const fundsList = await query(`SELECT id, current_nav FROM mutual_funds WHERE user_id = ?`, [userId]);
    let mutualFundsValue = 0;
    for (const fund of fundsList) {
      const txs = await query(
        `SELECT amount, units, type FROM mutual_fund_transactions WHERE fund_id = ?`,
        [fund.id]
      );
      let unitsHeld = 0;
      for (const t of txs) {
        if (t.type === 'SIP' || t.type === 'Lumpsum') {
          unitsHeld += t.units;
        } else if (t.type === 'Redemption') {
          unitsHeld -= t.units;
        }
      }
      if (unitsHeld > 0) {
        mutualFundsValue += unitsHeld * fund.current_nav;
      }
    }

    // Combine and sort
    const allActivities = [
      ...licTimeline.map(x => ({ ...x, dateStr: formatDateStr(x.date) })),
      ...goldTimeline.map(x => ({ ...x, dateStr: formatDateStr(x.date) })),
      ...chitTimeline.map(x => ({ ...x, dateStr: formatDateStr(x.date) })),
      ...savingsTimeline.map(x => ({ ...x, dateStr: formatDateStr(x.date) }))
    ];

    allActivities.sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
    const timeline = allActivities.slice(0, 5);

    res.json({
      stats: {
        activeLicPolicies: Number(activeLicCount?.count || 0),
        licPremiumDue: Number(licPremiumDue || 0),
        digitalGoldInvested: Number(goldInvested?.total || 0),
        runningChitFunds: Number(activeChitsCount?.count || 0),
        upcomingChitPayments: Number(upcomingChitPayments || 0),
        offlineSavingsBalance: Number(savingsBalance?.total || 0),
        outstandingDebt: Number(outstandingDebt || 0),
        receivableAmount: Number(receivableAmount || 0),
        mutualFundsValue: Number(mutualFundsValue || 0)
      },
      reminders,
      charts: {
        licYearly,
        goldYearly,
        chitProgress,
        savingsBalances
      },
      timeline
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. LIC POLICIES MODULE
// ==========================================
router.get('/lic', async (req: Request, res: Response) => {
  try {
    const policies = await query(`SELECT * FROM lic_policies WHERE user_id = ? ORDER BY start_date DESC`, [req.user!.id]);
    const enriched = [];
    const today = new Date();
    
    for (const p of policies) {
      // Ensure contract schedule table is initialized
      await LicPolicyScheduleService.verifyAndRepairScheduleIntegrity(p.id);

      // Premium Paid Details from lic_premium_schedule
      const paidHist = await get(
        `SELECT SUM(premium_amount) as total, COUNT(*) as count 
         FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`,
        [p.id]
      );
      const totalPaid = Number(paidHist?.total || 0);
      const countPaid = Number(paidHist?.count || 0);

      const totalInstallments = p.policy_term * 12;
      const remainingInstallments = Math.max(0, totalInstallments - countPaid);
      const totalRemaining = remainingInstallments * p.monthly_premium;

      const maturity = new Date(p.maturity_date);
      const diffTime = maturity.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const monthsRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));
      const completionPct = Math.min(100, Math.round((countPaid / totalInstallments) * 100));

      const isCompleted = totalInstallments > 0 && countPaid >= totalInstallments;
      const nextScheduledPremium = await LicPolicyScheduleService.getNextScheduledPremium(p.id);

      console.log('\nLIC API RESPONSE', JSON.stringify({
        policyId: p.id,
        paidInstallments: countPaid,
        pendingInstallments: remainingInstallments,
        isCompleted,
        nextScheduledPremium
      }, null, 2));

      enriched.push({
        ...p,
        totalInstallments,
        premiumsPaid: countPaid,
        paidInstallments: countPaid,
        premiumsRemaining: remainingInstallments,
        pendingInstallments: remainingInstallments,
        totalPaid,
        totalRemaining,
        daysRemaining,
        monthsRemaining,
        completionPct,
        isCompleted,
        nextScheduledPremium,
        nextInstallment: nextScheduledPremium,
        isPremiumPending: !isCompleted && isPolicyActive(p)
      });
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lic', async (req: Request, res: Response) => {
  const { policy_name, policy_number, monthly_premium, start_date, maturity_date, premium_due_day, policy_term, sum_assured, expected_maturity_amount } = req.body;
  try {
    const result = await execute(
      `INSERT INTO lic_policies (user_id, policy_name, policy_number, monthly_premium, start_date, maturity_date, premium_due_day, policy_term, sum_assured, expected_maturity_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, policy_name, policy_number, monthly_premium, start_date, maturity_date, premium_due_day, policy_term, sum_assured, expected_maturity_amount]
    );
    const policyId = result.lastID;
    
    // Automatically backfill historical premium records (Past: Paid, Current/Future: Pending)
    await backfillLicHistoricalPremiums(policyId);
    const licSummary = await getLicModuleSummary(req.user!.id);

    res.json({ id: policyId, success: true, licSummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/lic/:id', async (req: Request, res: Response) => {
  const { policy_name, policy_number, monthly_premium, start_date, maturity_date, premium_due_day, policy_term, sum_assured, expected_maturity_amount, status } = req.body;
  try {
    await execute(
      `UPDATE lic_policies 
       SET policy_name=?, policy_number=?, monthly_premium=?, start_date=?, maturity_date=?, premium_due_day=?, policy_term=?, sum_assured=?, expected_maturity_amount=?, status=? 
       WHERE id=? AND user_id=?`,
      [policy_name, policy_number, monthly_premium, start_date, maturity_date, premium_due_day, policy_term, sum_assured, expected_maturity_amount, status, req.params.id, req.user!.id]
    );
    await recalculateLicMetrics(Number(req.params.id));
    const licSummary = await getLicModuleSummary(req.user!.id);
    res.json({ success: true, licSummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lic/:id', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM lic_policies WHERE id=? AND user_id=?`, [req.params.id, req.user!.id]);
    const licSummary = await getLicModuleSummary(req.user!.id);
    res.json({ success: true, licSummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Premium History Sub-routes
router.get('/lic/:id/premiums', async (req: Request, res: Response) => {
  try {
    const premiums = await query(
      `SELECT * FROM lic_premium_history WHERE policy_id = ? ORDER BY year DESC, month DESC`,
      [req.params.id]
    );
    
    // Calculate yearly totals
    const yearlyMap: any = {};
    premiums.forEach((h: any) => {
      if (h.status === 'Paid') {
        yearlyMap[h.year] = (yearlyMap[h.year] || 0) + h.amount_paid;
      }
    });

    const yearlySummary = Object.keys(yearlyMap).map(yr => ({
      year: Number(yr),
      total: yearlyMap[yr]
    })).sort((a,b) => b.year - a.year);

    res.json({ premiums, yearlySummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lic/:id/premiums', async (req: Request, res: Response) => {
  const { month, year, amount_paid, paid_date, status, remarks } = req.body;
  const policyId = Number(req.params.id);
  try {
    const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    // 1. Update contract schedule table lic_premium_schedule
    const targetStatus = status || 'Paid';
    const pDate = paid_date || new Date().toISOString().split('T')[0];

    const schRow = await get(
      `SELECT id FROM lic_premium_schedule WHERE policy_id = ? AND month = ? AND year = ?`,
      [policyId, month, year]
    );

    if (schRow) {
      await execute(
        `UPDATE lic_premium_schedule SET status = ?, paid_date = ?, payment_source = 'manual' WHERE id = ?`,
        [targetStatus, targetStatus === 'Paid' ? pDate : null, schRow.id]
      );
    } else {
      // Find installment_number from policy start_date
      const startDate = new Date(policy.start_date);
      const startY = startDate.getFullYear();
      const startM = startDate.getMonth() + 1;
      const instNum = Math.max(1, (year - startY) * 12 + (month - startM) + 1);

      await execute(
        `INSERT INTO lic_premium_schedule (policy_id, installment_number, due_date, month, year, premium_amount, status, paid_date, payment_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
        [policyId, instNum, `${year}-${String(month).padStart(2, '0')}-05`, month, year, amount_paid || policy.monthly_premium, targetStatus, targetStatus === 'Paid' ? pDate : null]
      );
    }

    // 2. Mirror/update execution ledger lic_premium_history
    const existingHist = await get(
      `SELECT id FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
      [policyId, month, year]
    );

    if (existingHist) {
      await execute(
        `UPDATE lic_premium_history SET amount_paid = ?, paid_date = ?, status = ?, remarks = ? WHERE id = ?`,
        [amount_paid, targetStatus === 'Paid' ? pDate : null, targetStatus, remarks || 'Manual Payment Entry', existingHist.id]
      );
    } else {
      await execute(
        `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [policyId, month, year, amount_paid, targetStatus === 'Paid' ? pDate : null, targetStatus, remarks || 'Manual Payment Entry']
      );
    }

    // 3. Recalculate metrics
    await LicPolicyScheduleService.recalculateMetrics(policyId);

    // 4. Dynamically resolve next scheduled premium pointer
    const nextScheduledPremium = await LicPolicyScheduleService.getNextScheduledPremium(policyId);

    const paidRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`, [policyId]);
    const pendingRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'`, [policyId]);

    const paidInstallments = Number(paidRes?.count || 0);
    const pendingInstallments = Number(pendingRes?.count || 0);
    const totalPolicyMonths = Number(policy.policy_term || 15) * 12;
    const isCompleted = totalPolicyMonths > 0 && paidInstallments >= totalPolicyMonths;

    res.json({
      success: true,
      policyId,
      paidInstallments,
      pendingInstallments,
      nextScheduledPremium,
      nextInstallment: nextScheduledPremium,
      isCompleted
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lic/premiums/:premiumId', async (req: Request, res: Response) => {
  try {
    const hist = await get(`SELECT policy_id, month, year FROM lic_premium_history WHERE id = ?`, [req.params.premiumId]);
    if (hist) {
      const policyId = hist.policy_id;
      // Mark schedule row back to Pending
      await execute(
        `UPDATE lic_premium_schedule SET status = 'Pending', paid_date = NULL, payment_source = NULL WHERE policy_id = ? AND month = ? AND year = ?`,
        [policyId, hist.month, hist.year]
      );
      await execute(`DELETE FROM lic_premium_history WHERE id = ?`, [req.params.premiumId]);
      await LicPolicyScheduleService.recalculateMetrics(policyId);

      const nextScheduledPremium = await LicPolicyScheduleService.getNextScheduledPremium(policyId);
      const paidRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`, [policyId]);
      const pendingRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'`, [policyId]);

      const policy = await get(`SELECT policy_term FROM lic_policies WHERE id = ?`, [policyId]);
      const paidInstallments = Number(paidRes?.count || 0);
      const pendingInstallments = Number(pendingRes?.count || 0);
      const totalPolicyMonths = Number(policy?.policy_term || 15) * 12;
      const isCompleted = totalPolicyMonths > 0 && paidInstallments >= totalPolicyMonths;

      return res.json({
        success: true,
        policyId,
        paidInstallments,
        pendingInstallments,
        nextScheduledPremium,
        nextInstallment: nextScheduledPremium,
        isCompleted
      });
    }
    await execute(`DELETE FROM lic_premium_history WHERE id = ?`, [req.params.premiumId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. DIGITAL GOLD MODULE
// ==========================================
router.get('/gold', async (req: Request, res: Response) => {
  try {
    const goldInvestments = await query(
      `SELECT * FROM digital_gold WHERE user_id = ? ORDER BY start_date DESC`,
      [req.user!.id]
    );
    
    const enriched = [];
    for (const g of goldInvestments) {
      const sum = await get(
        `SELECT SUM(amount) as total FROM digital_gold_transactions WHERE gold_id = ?`,
        [g.id]
      );
      enriched.push({
        ...g,
        totalInvested: sum.total || 0
      });
    }
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gold', async (req: Request, res: Response) => {
  const { investment_name, platform, start_date, end_date } = req.body;
  const endDateVal = (end_date && end_date.trim() !== '') ? end_date : null;
  try {
    const result = await execute(
      `INSERT INTO digital_gold (user_id, investment_name, platform, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, investment_name, platform, start_date, endDateVal]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/gold/:id', async (req: Request, res: Response) => {
  const { investment_name, platform, start_date, end_date } = req.body;
  const endDateVal = (end_date && end_date.trim() !== '') ? end_date : null;
  try {
    await execute(
      `UPDATE digital_gold SET investment_name=?, platform=?, start_date=?, end_date=? WHERE id=? AND user_id=?`,
      [investment_name, platform, start_date, endDateVal, req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/gold/:id', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM digital_gold WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gold Transaction details
router.get('/gold/:id/transactions', async (req: Request, res: Response) => {
  try {
    const txs = await query(
      `SELECT * FROM digital_gold_transactions WHERE gold_id = ? ORDER BY year DESC, month DESC`,
      [req.params.id]
    );

    const currentYear = new Date().getFullYear();
    let thisYearTotal = 0;
    let lastYearTotal = 0;
    let overallTotal = 0;
    const yearlyMap: any = {};

    txs.forEach((t: any) => {
      overallTotal += t.amount;
      if (t.year === currentYear) {
        thisYearTotal += t.amount;
      } else if (t.year === currentYear - 1) {
        lastYearTotal += t.amount;
      }
      yearlyMap[t.year] = (yearlyMap[t.year] || 0) + t.amount;
    });

    const yearlySummary = Object.keys(yearlyMap).map(yr => ({
      year: Number(yr),
      total: yearlyMap[yr]
    })).sort((a, b) => b.year - a.year);

    res.json({
      transactions: txs,
      summary: {
        thisYearTotal,
        lastYearTotal,
        overallTotal,
        yearlySummary
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gold/:id/transactions', async (req: Request, res: Response) => {
  const { month, year, amount, remarks } = req.body;
  try {
    const result = await execute(
      `INSERT INTO digital_gold_transactions (gold_id, month, year, amount, remarks) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, month, year, amount, remarks]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/gold/transactions/:txId', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM digital_gold_transactions WHERE id = ?`, [req.params.txId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. CHIT FUNDS (CHEETU) MODULE
// ==========================================
router.get('/chits', async (req: Request, res: Response) => {
  try {
    const chits = await query(`SELECT * FROM chit_funds WHERE user_id = ? ORDER BY start_date DESC`, [req.user!.id]);
    const enriched = [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    for (const c of chits) {
      const stats = await get(
        `SELECT 
           SUM(CASE WHEN status='Paid' THEN installment_amount ELSE 0 END) as total_paid, 
           SUM(CASE WHEN status='Paid' THEN 1 ELSE 0 END) as months_paid,
           SUM(CASE WHEN status!='Paid' THEN installment_amount ELSE 0 END) as remaining_amount
         FROM chit_payments WHERE chit_id = ?`,
        [c.id]
      );
      
      const totalPaid = Number(stats?.total_paid || 0);
      const monthsPaid = Number(stats?.months_paid || 0);
      const monthsLeft = Math.max(0, c.total_months - monthsPaid);
      const remainingAmount = Number(stats?.remaining_amount || 0);

      const closing = new Date(c.closing_date);
      const diffTime = closing.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const completionPct = Math.min(100, Math.round((monthsPaid / c.total_months) * 100));

      const pendingThisMonth = await get(
        `SELECT installment_amount, status FROM chit_payments 
         WHERE chit_id = ? AND month = ? AND year = ?`,
        [c.id, currentMonth, currentYear]
      );

      enriched.push({
        ...c,
        totalPaid,
        monthsPaid,
        monthsLeft,
        remainingAmount,
        daysRemaining,
        completionPct,
        currentMonthDue: pendingThisMonth?.installment_amount || c.monthly_installment,
        isPaymentPending: pendingThisMonth?.status === 'Pending' && c.status === 'Running'
      });
    }
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chits', async (req: Request, res: Response) => {
  const { chit_name, monthly_installment, start_date, closing_date, total_months, organizer_name, notes } = req.body;
  try {
    const result = await execute(
      `INSERT INTO chit_funds (user_id, chit_name, monthly_installment, start_date, closing_date, total_months, organizer_name, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, chit_name, monthly_installment, start_date, closing_date, total_months, organizer_name, notes]
    );
    const chitId = result.lastID;

    // Generate monthly payment schedule automatically
    const startDateObj = new Date(start_date);
    for (let i = 0; i < total_months; i++) {
      const scheduleDate = new Date(startDateObj);
      scheduleDate.setMonth(startDateObj.getMonth() + i);

      const month = scheduleDate.getMonth() + 1;
      const year = scheduleDate.getFullYear();

      await execute(
        `INSERT INTO chit_payments (chit_id, month, year, installment_amount, status) VALUES (?, ?, ?, ?, ?)`,
        [chitId, month, year, monthly_installment, 'Pending']
      );
    }

    res.json({ id: chitId, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/chits/:id', async (req: Request, res: Response) => {
  const { chit_name, monthly_installment, start_date, closing_date, total_months, organizer_name, notes, status } = req.body;
  try {
    await execute(
      `UPDATE chit_funds SET chit_name=?, monthly_installment=?, start_date=?, closing_date=?, total_months=?, organizer_name=?, notes=?, status=? WHERE id=? AND user_id=?`,
      [chit_name, monthly_installment, start_date, closing_date, total_months, organizer_name, notes, status, req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chits/:id', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM chit_funds WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Payments Schedule
router.get('/chits/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await query(
      `SELECT * FROM chit_payments WHERE chit_id = ? ORDER BY year ASC, month ASC`,
      [req.params.id]
    );

    // Calculate yearly totals
    const yearlyMap: any = {};
    payments.forEach((p: any) => {
      if (p.status === 'Paid') {
        yearlyMap[p.year] = (yearlyMap[p.year] || 0) + p.installment_amount;
      }
    });

    const yearlySummary = Object.keys(yearlyMap).map(yr => ({
      year: Number(yr),
      total: yearlyMap[yr]
    })).sort((a,b) => b.year - a.year);

    res.json({ payments, yearlySummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/chits/payments/:paymentId', async (req: Request, res: Response) => {
  const { installment_amount, status, payment_date, remarks } = req.body;
  try {
    await execute(
      `UPDATE chit_payments SET installment_amount=?, status=?, payment_date=?, remarks=? WHERE id=?`,
      [installment_amount, status, payment_date, remarks, req.params.paymentId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5. OFFLINE SAVINGS ACCOUNTS
// ==========================================
router.get('/savings', async (req: Request, res: Response) => {
  try {
    const accounts = await query(
      `SELECT * FROM savings_accounts WHERE user_id = ? ORDER BY account_name ASC`,
      [req.user!.id]
    );
    
    const enriched = [];
    for (const a of accounts) {
      const stats = await get(
        `SELECT 
           SUM(CASE WHEN type='Credit' THEN amount ELSE 0 END) as totalCredits,
           SUM(CASE WHEN type='Debit' THEN amount ELSE 0 END) as totalDebits
         FROM savings_transactions WHERE account_id = ?`,
        [a.id]
      );
      
      enriched.push({
        ...a,
        totalCredits: stats.totalCredits || 0,
        totalDebits: stats.totalDebits || 0
      });
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/savings', async (req: Request, res: Response) => {
  const { account_name, opening_balance, description, color_tag } = req.body;
  try {
    const result = await execute(
      `INSERT INTO savings_accounts (user_id, account_name, opening_balance, current_balance, description, color_tag) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user!.id, account_name, opening_balance, opening_balance, description, color_tag]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/savings/:id', async (req: Request, res: Response) => {
  const { account_name, opening_balance, description, color_tag } = req.body;
  try {
    const acc = await get(`SELECT current_balance, opening_balance FROM savings_accounts WHERE id=?`, [req.params.id]);
    const balanceDiff = opening_balance - acc.opening_balance;
    const newBalance = acc.current_balance + balanceDiff;

    await execute(
      `UPDATE savings_accounts SET account_name=?, opening_balance=?, current_balance=?, description=?, color_tag=? WHERE id=? AND user_id=?`,
      [account_name, opening_balance, newBalance, description, color_tag, req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/savings/:id', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM savings_accounts WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/savings/:id/transactions', async (req: Request, res: Response) => {
  const accountId = req.params.id;
  try {
    const txs = await query(
      `SELECT t.*, a2.account_name as transfer_account_name 
       FROM savings_transactions t
       LEFT JOIN savings_accounts a2 ON t.transfer_account_id = a2.id
       WHERE t.account_id = ? ORDER BY t.date DESC, t.id DESC`,
      [accountId]
    );

    // Generate monthly summaries
    const monthlyMap: any = {};
    const yearlyMap: any = {};
    txs.forEach((t: any) => {
      const year = new Date(t.date).getFullYear();
      const month = new Date(t.date).toLocaleString('default', { month: 'short' }) + ' ' + year;

      if (t.type === 'Credit') {
        monthlyMap[month] = (monthlyMap[month] || 0) + t.amount;
        yearlyMap[year] = (yearlyMap[year] || 0) + t.amount;
      } else if (t.type === 'Debit') {
        monthlyMap[month] = (monthlyMap[month] || 0) - t.amount;
        yearlyMap[year] = (yearlyMap[year] || 0) - t.amount;
      }
    });

    const monthlySummary = Object.keys(monthlyMap).map(m => ({ month: m, net: monthlyMap[m] }));
    const yearlySummary = Object.keys(yearlyMap).map(y => ({ year: Number(y), net: yearlyMap[y] }));

    res.json({ transactions: txs, monthlySummary, yearlySummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/savings/transactions', async (req: Request, res: Response) => {
  const { account_id, type, amount, date, description, transfer_account_id } = req.body;
  const userId = req.user!.id;
  try {
    if (type === 'Transfer') {
      if (!transfer_account_id) {
        return res.status(400).json({ error: 'Transfer account ID is required.' });
      }
      
      // 1. Debit Source Account
      await execute(
        `INSERT INTO savings_transactions (user_id, account_id, type, amount, date, description, transfer_account_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, account_id, 'Debit', amount, date, `Transfer to account: ${description}`, transfer_account_id]
      );
      await execute(
        `UPDATE savings_accounts SET current_balance = current_balance - ? WHERE id = ?`,
        [amount, account_id]
      );

      // 2. Credit Destination Account
      await execute(
        `INSERT INTO savings_transactions (user_id, account_id, type, amount, date, description, transfer_account_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, transfer_account_id, 'Credit', amount, date, `Transfer from account: ${description}`, account_id]
      );
      await execute(
        `UPDATE savings_accounts SET current_balance = current_balance + ? WHERE id = ?`,
        [amount, transfer_account_id]
      );

    } else {
      // Standard Credit or Debit
      await execute(
        `INSERT INTO savings_transactions (user_id, account_id, type, amount, date, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, account_id, type, amount, date, description]
      );
      const balanceAdjustment = type === 'Credit' ? amount : -amount;
      await execute(
        `UPDATE savings_accounts SET current_balance = current_balance + ? WHERE id = ?`,
        [balanceAdjustment, account_id]
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. DEBT MANAGER MODULE
// ==========================================

// Helper to update transaction status based on settlements
async function updateTransactionStatus(txId: number) {
  const tx = await get(`SELECT amount FROM debt_transactions WHERE id = ?`, [txId]);
  if (!tx) return;

  const settlements = await get(`SELECT SUM(amount) as total FROM debt_settlements WHERE transaction_id = ?`, [txId]);
  const totalSettled = Number(settlements?.total || 0);

  let newStatus = 'Pending';
  if (totalSettled >= tx.amount) {
    newStatus = 'Settled';
  } else if (totalSettled > 0) {
    newStatus = 'Partially Settled';
  }

  await execute(`UPDATE debt_transactions SET status = ? WHERE id = ?`, [newStatus, txId]);
}

router.get('/debts', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const accounts = await query(
      `SELECT * FROM debt_accounts WHERE user_id = ? ORDER BY account_name ASC`,
      [userId]
    );

    const enriched = [];
    for (const acc of accounts) {
      const txs = await query(
        `SELECT id, type, amount, status FROM debt_transactions WHERE account_id = ?`,
        [acc.id]
      );

      let totalBorrowed = 0;
      let totalLent = 0;
      let outstandingPay = 0;
      let outstandingReceive = 0;
      let settledAmount = 0;

      for (const t of txs) {
        const setRes = await get(
          `SELECT SUM(amount) as total FROM debt_settlements WHERE transaction_id = ?`,
          [t.id]
        );
        const settledVal = Number(setRes?.total || 0);
        settledAmount += settledVal;

        const outstanding = Math.max(0, t.amount - settledVal);

        if (t.type === 'Borrowed') {
          totalBorrowed += t.amount;
          outstandingPay += outstanding;
        } else {
          totalLent += t.amount;
          outstandingReceive += outstanding;
        }
      }

      enriched.push({
        ...acc,
        totalBorrowed,
        totalLent,
        outstandingPay,
        outstandingReceive,
        settledAmount,
        pendingAmount: outstandingPay + outstandingReceive,
        runningBalance: outstandingReceive - outstandingPay
      });
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debts', async (req: Request, res: Response) => {
  const { account_name, description, priority } = req.body;
  const validPriorities = ['pay_first', 'high', 'medium', 'low', 'last'];
  const priorityVal = validPriorities.includes(priority) ? priority : 'medium';
  try {
    const result = await execute(
      `INSERT INTO debt_accounts (user_id, account_name, description, priority) VALUES (?, ?, ?, ?)`,
      [req.user!.id, account_name, description || '', priorityVal]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/debts/:id', async (req: Request, res: Response) => {
  const { account_name, description, priority } = req.body;
  const validPriorities = ['pay_first', 'high', 'medium', 'low', 'last'];
  const priorityVal = validPriorities.includes(priority) ? priority : 'medium';
  try {
    await execute(
      `UPDATE debt_accounts SET account_name = ?, description = ?, priority = ? WHERE id = ? AND user_id = ?`,
      [account_name, description || '', priorityVal, Number(req.params.id), req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/debts/:id/priority', async (req: Request, res: Response) => {
  const { priority } = req.body;
  const validPriorities = ['pay_first', 'high', 'medium', 'low', 'last'];
  const priorityVal = validPriorities.includes(priority) ? priority : 'medium';
  try {
    await execute(
      `UPDATE debt_accounts SET priority = ? WHERE id = ? AND user_id = ?`,
      [priorityVal, Number(req.params.id), req.user!.id]
    );
    res.json({ success: true, priority: priorityVal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/debts/:id', async (req: Request, res: Response) => {
  try {
    await execute(
      `DELETE FROM debt_accounts WHERE id = ? AND user_id = ?`,
      [Number(req.params.id), req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions under account
router.get('/debts/:id/transactions', async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  try {
    const txs = await query(
      `SELECT * FROM debt_transactions WHERE account_id = ? ORDER BY date DESC, id DESC`,
      [accountId]
    );

    const enriched = [];
    for (const t of txs) {
      const settlements = await query(
        `SELECT * FROM debt_settlements WHERE transaction_id = ? ORDER BY date DESC`,
        [t.id]
      );
      const sumRes = await get(
        `SELECT SUM(amount) as total FROM debt_settlements WHERE transaction_id = ?`,
        [t.id]
      );
      const totalSettled = Number(sumRes?.total || 0);

      enriched.push({
        ...t,
        settlements,
        settledAmount: totalSettled,
        outstandingAmount: Math.max(0, t.amount - totalSettled)
      });
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debts/:id/transactions', async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  const { type, amount, date, description, notes } = req.body;
  try {
    const result = await execute(
      `INSERT INTO debt_transactions (user_id, account_id, type, amount, date, description, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, accountId, type, Number(amount), date, description, notes || '', 'Pending']
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/debts/transactions/:txId', async (req: Request, res: Response) => {
  const txId = Number(req.params.txId);
  const { type, amount, date, description, notes } = req.body;
  try {
    await execute(
      `UPDATE debt_transactions SET type = ?, amount = ?, date = ?, description = ?, notes = ? WHERE id = ?`,
      [type, Number(amount), date, description, notes || '', txId]
    );
    await updateTransactionStatus(txId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/debts/transactions/:txId', async (req: Request, res: Response) => {
  try {
    await execute(
      `DELETE FROM debt_transactions WHERE id = ?`,
      [Number(req.params.txId)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settlement history sub-routes
router.post('/debts/transactions/:txId/settlements', async (req: Request, res: Response) => {
  const txId = Number(req.params.txId);
  const { amount, date, notes } = req.body;
  try {
    const result = await execute(
      `INSERT INTO debt_settlements (transaction_id, amount, date, notes) VALUES (?, ?, ?, ?)`,
      [txId, Number(amount), date, notes || '']
    );
    await updateTransactionStatus(txId);
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/debts/settlements/:settlementId', async (req: Request, res: Response) => {
  const settlementId = Number(req.params.settlementId);
  try {
    const settlement = await get(`SELECT transaction_id FROM debt_settlements WHERE id = ?`, [settlementId]);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found.' });
    }
    await execute(`DELETE FROM debt_settlements WHERE id = ?`, [settlementId]);
    await updateTransactionStatus(settlement.transaction_id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/debts/settlements/:settlementId', async (req: Request, res: Response) => {
  const settlementId = Number(req.params.settlementId);
  const { amount, date, notes } = req.body;
  try {
    const settlement = await get(`SELECT transaction_id FROM debt_settlements WHERE id = ?`, [settlementId]);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found.' });
    }
    await execute(
      `UPDATE debt_settlements SET amount = ?, date = ?, notes = ? WHERE id = ?`,
      [Number(amount), date, notes || '', settlementId]
    );
    await updateTransactionStatus(settlement.transaction_id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV bulk import
router.post('/debts/:id/import', async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  const userId = req.user!.id;
  const { transactions } = req.body; // Array of { date, description, type, amount, notes }
  try {
    let imported = 0;
    for (const tx of transactions) {
      await execute(
        `INSERT INTO debt_transactions (user_id, account_id, type, amount, date, description, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, accountId, tx.type, Number(tx.amount), tx.date, tx.description, tx.notes || '', 'Pending']
      );
      imported++;
    }
    res.json({ success: true, count: imported });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lic/:id/import', async (req: Request, res: Response) => {
  const policyId = Number(req.params.id);
  const { transactions } = req.body;
  try {
    let count = 0;
    for (const tx of transactions) {
      const parts = tx.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      await execute(
        `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks) 
         VALUES (?, ?, ?, ?, ?, 'Paid', ?)`,
        [policyId, month, year, Number(tx.amount), tx.date, tx.description]
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gold/:id/import', async (req: Request, res: Response) => {
  const goldId = Number(req.params.id);
  const { transactions } = req.body;
  try {
    let count = 0;
    for (const tx of transactions) {
      const parts = tx.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      await execute(
        `INSERT INTO digital_gold_transactions (gold_id, month, year, amount, remarks) 
         VALUES (?, ?, ?, ?, ?)`,
        [goldId, month, year, Number(tx.amount), tx.description]
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chits/:id/import', async (req: Request, res: Response) => {
  const chitId = Number(req.params.id);
  const { transactions } = req.body;
  try {
    let count = 0;
    for (const tx of transactions) {
      const parts = tx.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      
      const existing = await get(
        `SELECT id FROM chit_payments WHERE chit_id = ? AND month = ? AND year = ?`,
        [chitId, month, year]
      );
      if (existing) {
        await execute(
          `UPDATE chit_payments SET installment_amount = ?, status = 'Paid', payment_date = ?, remarks = ? WHERE id = ?`,
          [Number(tx.amount), tx.date, tx.description, existing.id]
        );
      } else {
        await execute(
          `INSERT INTO chit_payments (chit_id, month, year, installment_amount, status, payment_date, remarks) 
           VALUES (?, ?, ?, ?, 'Paid', ?, ?)`,
          [chitId, month, year, Number(tx.amount), tx.date, tx.description]
        );
      }
      count++;
    }
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/savings/:id/import', async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  const userId = req.user!.id;
  const { transactions } = req.body;
  try {
    let count = 0;
    for (const tx of transactions) {
      await execute(
        `INSERT INTO savings_transactions (user_id, account_id, type, amount, date, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, accountId, tx.type, Number(tx.amount), tx.date, tx.description]
      );
      const balanceAdjustment = tx.type === 'Credit' ? Number(tx.amount) : -Number(tx.amount);
      await execute(
        `UPDATE savings_accounts SET current_balance = current_balance + ? WHERE id = ?`,
        [balanceAdjustment, accountId]
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. MUTUAL FUNDS INVESTMENT MANAGER
// ==========================================

// Helper to calculate XIRR
const calculateXIRR = (txs: any[], currentValue: number) => {
  if (txs.length === 0) return 0;
  
  const cashFlows = txs.map(t => ({
    amount: t.type === 'Redemption' ? Number(t.amount) : -Number(t.amount),
    date: new Date(t.date)
  }));
  
  // Add the final valuation flow today
  cashFlows.push({
    amount: currentValue,
    date: new Date()
  });

  const xirrFunction = (r: number) => {
    let val = 0;
    for (const cf of cashFlows) {
      const t = (cf.date.getTime() - cashFlows[0].date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      val += cf.amount / Math.pow(1 + r, t);
    }
    return val;
  };

  const xirrDerivative = (r: number) => {
    let val = 0;
    for (const cf of cashFlows) {
      const t = (cf.date.getTime() - cashFlows[0].date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      val += -t * cf.amount / Math.pow(1 + r, t + 1);
    }
    return val;
  };

  let rate = 0.1; // 10% guess
  for (let i = 0; i < 100; i++) {
    const f = xirrFunction(rate);
    const df = xirrDerivative(rate);
    if (Math.abs(df) < 1e-12) break;
    const nextRate = rate - f / df;
    if (Math.abs(nextRate - rate) < 1e-6) {
      rate = nextRate;
      break;
    }
    rate = nextRate;
  }
  if (isNaN(rate) || rate < -0.99 || rate > 5.0) {
    return 0;
  }
  return rate * 100;
};

// Retrieve all funds with computed metrics
router.get('/mutual-funds', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const funds = await query(
      `SELECT * FROM mutual_funds WHERE user_id = ? ORDER BY fund_name ASC`,
      [userId]
    );

    const result = [];
    for (const fund of funds) {
      const txs = await query(
        `SELECT * FROM mutual_fund_transactions WHERE fund_id = ? ORDER BY date ASC`,
        [fund.id]
      );

      let totalInvested = 0;
      let unitsHeld = 0;
      let totalSips = 0;

      for (const t of txs) {
        if (t.type === 'SIP' || t.type === 'Lumpsum') {
          totalInvested += t.amount;
          unitsHeld += t.units;
          if (t.type === 'SIP') totalSips++;
        } else if (t.type === 'Redemption') {
          totalInvested -= t.amount;
          unitsHeld -= t.units;
        }
      }

      // Safeguard negative/zero units
      if (unitsHeld < 0) unitsHeld = 0;
      if (totalInvested < 0) totalInvested = 0;

      const currentValue = unitsHeld * fund.current_nav;
      const overallGain = currentValue - totalInvested;
      const gainPct = totalInvested > 0 ? (overallGain / totalInvested) * 100 : 0;
      const avgPurchasePrice = unitsHeld > 0 ? totalInvested / unitsHeld : 0;

      // CAGR & Holding Period
      let holdingPeriodDays = 0;
      let cagr = 0;
      if (txs.length > 0) {
        const firstDate = new Date(txs[0].date);
        holdingPeriodDays = Math.ceil((new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        const years = holdingPeriodDays / 365.25;
        if (years > 0.05 && totalInvested > 0) {
          cagr = (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100;
        }
      }

      const xirr = calculateXIRR(txs, currentValue);

      result.push({
        ...fund,
        totalInvested,
        unitsHeld,
        currentValue,
        overallGain,
        gainPct,
        avgPurchasePrice,
        holdingPeriodDays,
        cagr,
        xirr,
        totalSips,
        transactionCount: txs.length
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy search requests to AMFI API to prevent CORS errors on frontend
router.get('/mutual-funds/proxy/search', async (req: Request, res: Response) => {
  const queryStr = String(req.query.q || '');
  if (queryStr.length < 3) {
    return res.json([]);
  }
  try {
    const apiRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(queryStr)}`);
    const data = await apiRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy details requests to AMFI API
router.get('/mutual-funds/proxy/details/:schemeCode', async (req: Request, res: Response) => {
  const schemeCode = req.params.schemeCode;
  try {
    const apiRes = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    const data = await apiRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new mutual fund
router.post('/mutual-funds', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { fund_name, category, fund_house, expense_ratio, benchmark, risk_level, launch_year, notes, current_nav, scheme_code } = req.body;
  if (!fund_name || !category || !fund_house) {
    return res.status(400).json({ error: 'Fund Name, Category and Fund House are required.' });
  }
  try {
    const result = await execute(
      `INSERT INTO mutual_funds (user_id, fund_name, category, fund_house, expense_ratio, benchmark, risk_level, launch_year, notes, current_nav, scheme_code) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, fund_name, category, fund_house, 
        Number(expense_ratio) || 0, benchmark || '', 
        risk_level || 'High', Number(launch_year) || null, 
        notes || '', Number(current_nav) || 10.0,
        scheme_code || null
      ]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update fund details
router.put('/mutual-funds/:id', async (req: Request, res: Response) => {
  const fundId = Number(req.params.id);
  const { fund_name, category, fund_house, expense_ratio, benchmark, risk_level, launch_year, notes, current_nav, scheme_code } = req.body;
  if (!fund_name || !category || !fund_house) {
    return res.status(400).json({ error: 'Fund Name, Category and Fund House are required.' });
  }
  try {
    await execute(
      `UPDATE mutual_funds 
       SET fund_name = ?, category = ?, fund_house = ?, expense_ratio = ?, benchmark = ?, risk_level = ?, launch_year = ?, notes = ?, current_nav = ?, scheme_code = ? 
       WHERE id = ?`,
      [
        fund_name, category, fund_house, 
        Number(expense_ratio) || 0, benchmark || '', 
        risk_level || 'High', Number(launch_year) || null, 
        notes || '', Number(current_nav) || 10.0,
        scheme_code || null,
        fundId
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete mutual fund
router.delete('/mutual-funds/:id', async (req: Request, res: Response) => {
  const fundId = Number(req.params.id);
  try {
    await execute(`DELETE FROM mutual_funds WHERE id = ?`, [fundId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get transactions for a fund
router.get('/mutual-funds/:id/transactions', async (req: Request, res: Response) => {
  const fundId = Number(req.params.id);
  try {
    const txs = await query(
      `SELECT * FROM mutual_fund_transactions WHERE fund_id = ? ORDER BY date DESC, id DESC`,
      [fundId]
    );
    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a transaction
router.post('/mutual-funds/:id/transactions', async (req: Request, res: Response) => {
  const fundId = Number(req.params.id);
  const { date, type, amount, nav, units, remarks } = req.body;
  if (!date || !type || !amount || !nav || !units) {
    return res.status(400).json({ error: 'Date, Type, Amount, NAV and Units are required.' });
  }
  try {
    const result = await execute(
      `INSERT INTO mutual_fund_transactions (fund_id, date, type, amount, nav, units, remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fundId, date, type, Number(amount), Number(nav), Number(units), remarks || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a transaction
router.put('/mutual-funds/transactions/:txId', async (req: Request, res: Response) => {
  const txId = Number(req.params.txId);
  const { date, type, amount, nav, units, remarks } = req.body;
  if (!date || !type || !amount || !nav || !units) {
    return res.status(400).json({ error: 'Date, Type, Amount, NAV and Units are required.' });
  }
  try {
    await execute(
      `UPDATE mutual_fund_transactions 
       SET date = ?, type = ?, amount = ?, nav = ?, units = ?, remarks = ? 
       WHERE id = ?`,
      [date, type, Number(amount), Number(nav), Number(units), remarks || '', txId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a transaction
router.delete('/mutual-funds/transactions/:txId', async (req: Request, res: Response) => {
  const txId = Number(req.params.txId);
  try {
    await execute(`DELETE FROM mutual_fund_transactions WHERE id = ?`, [txId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk CSV Import
router.post('/mutual-funds/:id/import', async (req: Request, res: Response) => {
  const fundId = Number(req.params.id);
  const { transactions } = req.body; // Array of { date, type, amount, nav, units, remarks }
  try {
    let count = 0;
    for (const tx of transactions) {
      if (!tx.date || !tx.type || !tx.amount || !tx.nav || !tx.units) continue;
      await execute(
        `INSERT INTO mutual_fund_transactions (fund_id, date, type, amount, nav, units, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fundId, tx.date, tx.type, Number(tx.amount), Number(tx.nav), Number(tx.units), tx.remarks || '']
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RECURRING AUTOMATION ENDPOINTS ──────────────────────────────────────────
import { 
  runRecurringAutomation, 
  generateNextMonthForecast, 
  sendTelegramMessage, 
  getGlobalCheetuAutopilotStatus,
  getGlobalLicAutopilotStatus,
  getLicModuleSummary,
  isPolicyActive,
  backfillLicHistoricalPremiums,
  recalculateLicMetrics,
  runDeveloperAutomationSimulation,
  runFullAutomationValidationSuite 
} from '../services/recurringAutomation';

import { LicPolicyScheduleService } from '../services/LicPolicyScheduleService';

// ─── LIC DEBUG ENDPOINT FOR CONTRACT SCHEDULER TRACING ─────────────────────
router.get('/debug/lic/:policyId', async (req: Request, res: Response) => {
  const policyId = Number(req.params.policyId);
  try {
    const policy = await get(`SELECT * FROM lic_policies WHERE id = ?`, [policyId]);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    const totalInstallments = Number(policy.policy_term || 10) * 12;
    const countRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ?`, [policyId]);
    const paidRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`, [policyId]);
    const pendingRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'`, [policyId]);
    const overdueRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Overdue'`, [policyId]);

    const nextScheduledPremium = await LicPolicyScheduleService.getNextScheduledPremium(policyId);
    const nextFivePremiums = await query(
      `SELECT * FROM lic_premium_schedule WHERE policy_id = ? AND status IN ('Pending','Overdue') ORDER BY installment_number ASC LIMIT 5`,
      [policyId]
    );

    const user = await get(`SELECT telegram_chat_id FROM users WHERE id = ?`, [policy.user_id || 1]);

    const schedulerState = {
      scheduleGeneratedAt: policy.schedule_generated_at || 'Not Generated',
      lastAutomationRun: policy.last_automation_run_month ? `${policy.last_automation_run_month}/${policy.last_automation_run_year}` : 'None',
      status: policy.status
    };

    const telegramState = {
      isLinked: !!(user && user.telegram_chat_id),
      chatId: user?.telegram_chat_id || null
    };

    const calculationTrace = [
      `Policy #${policyId} (${policy.policy_name}): start_date=${policy.start_date}, term=${policy.policy_term}y (${totalInstallments} total installments)`,
      `Contract schedule rows in DB: ${countRes?.count || 0}`,
      `Paid: ${paidRes?.count || 0}, Pending: ${pendingRes?.count || 0}, Overdue: ${overdueRes?.count || 0}`,
      `Next Scheduled Premium pointer: ${nextScheduledPremium ? `#${nextScheduledPremium.installmentNumber} (${nextScheduledPremium.monthYearStr} • ₹${nextScheduledPremium.amount})` : 'NONE (100% Completed)'}`
    ];

    res.json({
      totalInstallments,
      paidInstallments: Number(paidRes?.count || 0),
      pendingInstallments: Number(pendingRes?.count || 0),
      overdueInstallments: Number(overdueRes?.count || 0),
      nextScheduledPremium,
      nextFivePremiums,
      schedulerState,
      telegramState,
      calculationTrace
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/automation/lic/global-sync', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const activePolicies = await query(`SELECT id FROM lic_policies WHERE user_id = ?`, [userId]);
    for (const p of activePolicies) {
      await LicPolicyScheduleService.generateFullContractSchedule(p.id);
    }

    const syncRes: any = await LicPolicyScheduleService.processManualSync(userId);
    const status = await getGlobalLicAutopilotStatus(userId);
    res.json({
      success: true,
      message: 'Global LIC Sync completed.',
      processedCount: syncRes?.processedCount || 0,
      updatedCount: syncRes?.updatedCount || 0,
      skippedCount: syncRes?.skippedCount || 0,
      failedCount: syncRes?.failedCount || 0,
      traces: syncRes?.traces || [],
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPAIR LIC SCHEDULE ONE-TIME MIGRATION ENDPOINT ───────────────────────
router.post('/lic/:id/repair-schedule', async (req: Request, res: Response) => {
  const policyId = Number(req.params.id);
  try {
    await backfillLicHistoricalPremiums(policyId);
    const status = await getGlobalLicAutopilotStatus(req.user!.id);
    res.json({ success: true, message: `Schedule repaired for policy #${policyId}`, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lic/repair-all-schedules', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const policies = await query(`SELECT id FROM lic_policies WHERE user_id = ?`, [userId]);
    for (const p of policies) {
      await backfillLicHistoricalPremiums(p.id);
    }
    const status = await getGlobalLicAutopilotStatus(userId);
    res.json({ success: true, message: `Repaired full schedule for ${policies.length} policies`, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GLOBAL LIC AUTOPILOT ENDPOINTS ──────────────────────────────────────────
router.get('/automation/lic/global-status', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const status = await getGlobalLicAutopilotStatus(userId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/automation/lic/global-toggle', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const rules = await query(`SELECT enabled FROM recurring_commitments WHERE user_id = ? AND module_type = 'lic'`, [userId]);
    const currentEnabled = rules.some(r => r.enabled === 1);
    const newEnabled = currentEnabled ? 0 : 1;

    await execute(
      `INSERT INTO recurring_commitments (user_id, module_type, entity_id, enabled, auto_create, auto_mark_paid)
       VALUES (?, 'lic', 0, ?, 1, 1)
       ON CONFLICT(module_type, entity_id) DO UPDATE SET enabled = ?`,
      [userId, newEnabled, newEnabled]
    );

    const activePolicies = await query(`SELECT id FROM lic_policies WHERE user_id = ? AND (status = 'Running' OR status IS NULL OR status != 'Completed')`, [userId]);
    for (const p of activePolicies) {
      await execute(
        `INSERT INTO recurring_commitments (user_id, module_type, entity_id, enabled, auto_create, auto_mark_paid)
         VALUES (?, 'lic', ?, ?, 1, 1)
         ON CONFLICT(module_type, entity_id) DO UPDATE SET enabled = ?`,
        [userId, p.id, newEnabled, newEnabled]
      );
    }

    const status = await getGlobalLicAutopilotStatus(userId);
    res.json({ success: true, enabled: newEnabled, message: newEnabled ? 'Global LIC autopilot resumed successfully.' : 'Global LIC autopilot paused successfully.', status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { LicAutomationScheduler } from '../services/licAutomationScheduler';

router.post('/automation/lic/global-sync', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    // 1. Trigger full lifecycle schedule backfill for active policies missing history
    const activePolicies = await query(`SELECT id FROM lic_policies WHERE user_id = ?`, [userId]);
    for (const p of activePolicies) {
      await LicAutomationScheduler.generateFullSchedule(p.id);
    }

    // 2. Run manual sync execution via centralized LicAutomationScheduler
    const syncRes: any = await LicAutomationScheduler.processManualSync(userId);
    const status = await getGlobalLicAutopilotStatus(userId);
    res.json({
      success: true,
      message: 'Global LIC Sync completed.',
      processedCount: syncRes?.processedCount || 0,
      updatedCount: syncRes?.updatedCount || 0,
      skippedCount: syncRes?.skippedCount || 0,
      failedCount: syncRes?.failedCount || 0,
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GLOBAL CHEETTU AUTOPILOT ENDPOINTS (MUST BE BEFORE PARAMETRIC ROUTES) ─────
router.post('/automation/chit/developer-simulate', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { simDate, actionType, commitChanges, sendTelegram } = req.body;
  try {
    const result = await runDeveloperAutomationSimulation(
      userId,
      simDate,
      actionType || 'month-start',
      !!commitChanges,
      !!sendTelegram
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/automation/chit/developer-validate', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const report = await runFullAutomationValidationSuite(userId);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/automation/chit/global-status', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const status = await getGlobalCheetuAutopilotStatus(userId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/automation/chit/global-toggle', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const rules = await query(`SELECT enabled FROM recurring_commitments WHERE user_id = ? AND module_type = 'chit'`, [userId]);
    const currentEnabled = rules.some(r => r.enabled === 1);
    const newEnabled = currentEnabled ? 0 : 1;

    // Toggle global commitment record (entity_id = 0) and all active chit commitments
    await execute(
      `INSERT INTO recurring_commitments (user_id, module_type, entity_id, enabled, auto_create, auto_mark_paid)
       VALUES (?, 'chit', 0, ?, 1, 1)
       ON CONFLICT(module_type, entity_id) DO UPDATE SET enabled = ?`,
      [userId, newEnabled, newEnabled]
    );

    const activeChits = await query(`SELECT id FROM chit_funds WHERE user_id = ? AND status = 'Running'`, [userId]);
    for (const c of activeChits) {
      await execute(
        `INSERT INTO recurring_commitments (user_id, module_type, entity_id, enabled, auto_create, auto_mark_paid)
         VALUES (?, 'chit', ?, ?, 1, 1)
         ON CONFLICT(module_type, entity_id) DO UPDATE SET enabled = ?`,
        [userId, c.id, newEnabled, newEnabled]
      );
    }

    const status = await getGlobalCheetuAutopilotStatus(userId);
    res.json({ success: true, enabled: newEnabled, message: newEnabled ? 'Global autopilot resumed successfully.' : 'Global autopilot paused successfully.', status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/automation/chit/global-sync', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const syncRes: any = await runRecurringAutomation(userId, true);
    const status = await getGlobalCheetuAutopilotStatus(userId);
    res.json({
      success: true,
      message: 'Global Cheetu Sync completed.',
      processedCount: syncRes?.processedCount || 0,
      updatedCount: syncRes?.updatedCount || 0,
      skippedCount: syncRes?.skippedCount || 0,
      failedCount: syncRes?.failedCount || 0,
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send Month-End / Heads-up Commitment Forecast Telegram message
router.post('/automation/forecast/send-telegram', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { isHeadsUp } = req.body;
  try {
    const user = await get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
    if (!user || !user.telegram_chat_id) {
      return res.status(400).json({ error: 'Telegram chat ID not linked.' });
    }

    const { text, totalCommitments } = await generateNextMonthForecast(userId, !!isHeadsUp);
    const ok = await sendTelegramMessage(user.telegram_chat_id, text);

    if (ok) {
      res.json({ success: true, totalCommitments, message: 'Telegram forecast message sent successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to send Telegram forecast message.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PARAMETRIC AUTOMATION ROUTES ────────────────────────────────────────────
// Get automation settings and history for a specific entity
router.get('/automation/:moduleType/:entityId', async (req: Request, res: Response) => {
  const { moduleType, entityId } = req.params;
  const userId = req.user!.id;

  try {
    let settings = await get(
      `SELECT * FROM recurring_commitments WHERE user_id = ? AND module_type = ? AND entity_id = ?`,
      [userId, moduleType, entityId]
    );

    if (!settings) {
      settings = {
        module_type: moduleType,
        entity_id: Number(entityId),
        enabled: 0,
        auto_create: 1,
        auto_mark_paid: 0,
        telegram_confirm: 1,
        telegram_reminder: 1,
        payment_day: 1,
        reminder_days_before: 3,
        frequency: 'monthly',
        last_run_date: null
      };
    }

    const logs = await query(
      `SELECT * FROM recurring_automation_logs 
       WHERE user_id = ? AND module_type = ? AND entity_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [userId, moduleType, entityId]
    );

    let nextInstallment: any = null;
    let isCompleted = false;
    let paidInstallments = 0;
    let pendingInstallments = 0;

    if (moduleType === 'chit') {
      nextInstallment = await get(
        `SELECT * FROM chit_payments WHERE chit_id = ? AND status != 'Paid' ORDER BY year ASC, month ASC LIMIT 1`,
        [entityId]
      );
    } else if (moduleType === 'lic') {
      const policyIdNum = Number(entityId);
      nextInstallment = await LicPolicyScheduleService.getNextScheduledPremium(policyIdNum);

      const policy = await get(`SELECT policy_term, status FROM lic_policies WHERE id = ?`, [policyIdNum]);
      const paidRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Paid'`, [policyIdNum]);
      const pendingRes = await get(`SELECT COUNT(*) as count FROM lic_premium_schedule WHERE policy_id = ? AND status = 'Pending'`, [policyIdNum]);

      paidInstallments = Number(paidRes?.count || 0);
      pendingInstallments = Number(pendingRes?.count || 0);

      const totalPolicyMonths = Number(policy?.policy_term || 15) * 12;
      isCompleted = totalPolicyMonths > 0 && paidInstallments >= totalPolicyMonths;

      console.log('\nLIC API RESPONSE', JSON.stringify({
        policyId: policyIdNum,
        paidInstallments,
        pendingInstallments,
        isCompleted,
        nextScheduledPremium: nextInstallment
      }, null, 2));
    }

    res.json({ 
      settings, 
      logs, 
      nextInstallment, 
      nextScheduledPremium: nextInstallment, 
      isCompleted, 
      paidInstallments, 
      pendingInstallments 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save or Update automation settings
router.post('/automation/:moduleType/:entityId', async (req: Request, res: Response) => {
  const { moduleType, entityId } = req.params;
  const userId = req.user!.id;
  const {
    enabled,
    auto_create,
    auto_mark_paid,
    telegram_confirm,
    telegram_reminder,
    payment_day,
    reminder_days_before,
    frequency
  } = req.body;

  try {
    const existing = await get(
      `SELECT id FROM recurring_commitments WHERE user_id = ? AND module_type = ? AND entity_id = ?`,
      [userId, moduleType, entityId]
    );

    if (existing) {
      await execute(
        `UPDATE recurring_commitments SET
          enabled = ?,
          auto_create = ?,
          auto_mark_paid = ?,
          telegram_confirm = ?,
          telegram_reminder = ?,
          payment_day = ?,
          reminder_days_before = ?,
          frequency = ?
         WHERE id = ?`,
        [
          enabled ? 1 : 0,
          auto_create ? 1 : 0,
          auto_mark_paid ? 1 : 0,
          telegram_confirm ? 1 : 0,
          telegram_reminder ? 1 : 0,
          payment_day || 1,
          reminder_days_before || 3,
          frequency || 'monthly',
          existing.id
        ]
      );
    } else {
      await execute(
        `INSERT INTO recurring_commitments 
         (user_id, module_type, entity_id, enabled, auto_create, auto_mark_paid, telegram_confirm, telegram_reminder, payment_day, reminder_days_before, frequency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          moduleType,
          entityId,
          enabled ? 1 : 0,
          auto_create ? 1 : 0,
          auto_mark_paid ? 1 : 0,
          telegram_confirm ? 1 : 0,
          telegram_reminder ? 1 : 0,
          payment_day || 1,
          reminder_days_before || 3,
          frequency || 'monthly'
        ]
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run automation manually for user
router.post('/automation/:moduleType/:entityId/run', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    await runRecurringAutomation(userId, true);
    res.json({ success: true, message: 'Automation executed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Pause / Resume automation
router.post('/automation/:moduleType/:entityId/pause', async (req: Request, res: Response) => {
  const { moduleType, entityId } = req.params;
  const userId = req.user!.id;
  try {
    const setting = await get(
      `SELECT enabled FROM recurring_commitments WHERE user_id = ? AND module_type = ? AND entity_id = ?`,
      [userId, moduleType, entityId]
    );
    const newEnabled = setting?.enabled === 1 ? 0 : 1;

    await execute(
      `UPDATE recurring_commitments SET enabled = ? WHERE user_id = ? AND module_type = ? AND entity_id = ?`,
      [newEnabled, userId, moduleType, entityId]
    );

    res.json({ success: true, enabled: newEnabled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
