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
    // 1.1 Summary Stats
    const activeLicCount = await get(
      `SELECT COUNT(*) as count FROM lic_policies WHERE user_id = ? AND status = 'Running'`,
      [userId]
    );

    // LIC Premium Due (sum of running policies not paid this month)
    const runningPolicies = await query(
      `SELECT id, monthly_premium, premium_due_day FROM lic_policies WHERE user_id = ? AND status = 'Running'`,
      [userId]
    );
    let licPremiumDue = 0;
    for (const policy of runningPolicies) {
      const paidThisMonth = await get(
        `SELECT COUNT(*) as count FROM lic_premium_history 
         WHERE policy_id = ? AND month = ? AND year = ? AND status = 'Paid'`,
        [policy.id, currentMonth, currentYear]
      );
      if (paidThisMonth.count === 0) {
        licPremiumDue += policy.monthly_premium;
      }
    }

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
       WHERE c.user_id = ? GROUP BY c.id`,
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

    // Combine and sort
    const allActivities = [
      ...licTimeline.map(x => ({ ...x, dateStr: x.date })),
      ...goldTimeline.map(x => ({ ...x, dateStr: x.date.split(' ')[0] })),
      ...chitTimeline.map(x => ({ ...x, dateStr: x.date })),
      ...savingsTimeline.map(x => ({ ...x, dateStr: x.date }))
    ];

    allActivities.sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
    const timeline = allActivities.slice(0, 5);

    res.json({
      stats: {
        activeLicPolicies: activeLicCount.count,
        licPremiumDue,
        digitalGoldInvested: goldInvested.total || 0,
        runningChitFunds: activeChitsCount.count,
        upcomingChitPayments,
        offlineSavingsBalance: savingsBalance.total || 0
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
    
    // Enrich with computed details
    const enriched = [];
    const today = new Date();
    
    for (const p of policies) {
      // Premium Paid Details
      const paidHist = await query(
        `SELECT SUM(amount_paid) as total, COUNT(*) as count 
         FROM lic_premium_history WHERE policy_id = ? AND status = 'Paid'`,
        [p.id]
      );
      const totalPaid = paidHist[0]?.total || 0;
      const countPaid = paidHist[0]?.count || 0;

      // Policy Term total premium count (term is in years, so term * 12 payments)
      const totalInstallments = p.policy_term * 12;
      const remainingInstallments = Math.max(0, totalInstallments - countPaid);
      const totalRemaining = remainingInstallments * p.monthly_premium;

      // Countdown Days to Maturity
      const maturity = new Date(p.maturity_date);
      const diffTime = maturity.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const monthsRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));

      const completionPct = Math.min(100, Math.round((countPaid / totalInstallments) * 100));

      // Check current month status
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const paidThisMonth = await get(
        `SELECT COUNT(*) as count FROM lic_premium_history 
         WHERE policy_id = ? AND month = ? AND year = ? AND status = 'Paid'`,
        [p.id, currentMonth, currentYear]
      );

      enriched.push({
        ...p,
        totalInstallments,
        premiumsPaid: countPaid,
        premiumsRemaining: remainingInstallments,
        totalPaid,
        totalRemaining,
        daysRemaining,
        monthsRemaining,
        completionPct,
        isPremiumPending: paidThisMonth.count === 0 && p.status === 'Running'
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
    res.json({ id: result.lastID, success: true });
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
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lic/:id', async (req: Request, res: Response) => {
  try {
    await execute(`DELETE FROM lic_policies WHERE id=? AND user_id=?`, [req.params.id, req.user!.id]);
    res.json({ success: true });
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
  try {
    const result = await execute(
      `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status, remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, month, year, amount_paid, paid_date, status, remarks]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lic/premiums/:premiumId', async (req: Request, res: Response) => {
  try {
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
  try {
    const result = await execute(
      `INSERT INTO digital_gold (user_id, investment_name, platform, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, investment_name, platform, start_date, end_date]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/gold/:id', async (req: Request, res: Response) => {
  const { investment_name, platform, start_date, end_date } = req.body;
  try {
    await execute(
      `UPDATE digital_gold SET investment_name=?, platform=?, start_date=?, end_date=? WHERE id=? AND user_id=?`,
      [investment_name, platform, start_date, end_date, req.params.id, req.user!.id]
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
        `SELECT SUM(installment_amount) as totalPaid, 
                COUNT(*) FILTER(WHERE status='Paid') as monthsPaid 
         FROM chit_payments WHERE chit_id = ?`,
        [c.id]
      );
      
      const totalPaid = stats.totalPaid || 0;
      const monthsPaid = stats.monthsPaid || 0;
      const monthsLeft = Math.max(0, c.total_months - monthsPaid);
      const remainingAmount = Math.max(0, (c.monthly_installment * c.total_months) - totalPaid);

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

export default router;
