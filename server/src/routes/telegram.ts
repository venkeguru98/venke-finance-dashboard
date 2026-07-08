import { Router, Request, Response } from 'express';
import { query, execute, get } from '../database';
import { parseSingleLine, parseNaturalDate } from '../utils/nlp';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper to send messages to Telegram using native fetch
async function sendMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    if (!res.ok) {
      console.error('[Telegram Send Error]', await res.text());
    }
  } catch (err: any) {
    console.error('[Telegram Send Error]', err.message);
  }
}

// Helper to edit messages on Telegram using native fetch
async function editMessageText(chatId: string | number, messageId: number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    if (!res.ok) {
      console.error('[Telegram Edit Error]', await res.text());
    }
  } catch (err: any) {
    console.error('[Telegram Edit Error]', err.message);
  }
}

// ─── GET /api/telegram/link-token ──────────────────────────────────────────
// Secures link-token behind authMiddleware inside the app routing mounts
router.get('/link-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await get('SELECT telegram_token, telegram_chat_id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let token = user.telegram_token;
    if (!token) {
      token = Math.random().toString(36).slice(2, 10).toUpperCase();
      await execute('UPDATE users SET telegram_token = ? WHERE id = ?', [token, userId]);
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'VenkeFinanceBot';

    res.json({
      token,
      botUrl: `https://t.me/${botUsername}?start=${token}`,
      isLinked: !!user.telegram_chat_id,
      isBotConfigured: !!TELEGRAM_BOT_TOKEN
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/telegram/webhook ────────────────────────────────────────────
// Publicly accessible webhook from Telegram API
router.post('/webhook', async (req: Request, res: Response) => {
  res.sendStatus(200); // Always acknowledge immediately to Telegram

  if (!TELEGRAM_BOT_TOKEN) return;

  const { message, callback_query } = req.body;

  try {
    // 1. Handle Callback Buttons (Undo & Category Updates)
    if (callback_query) {
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;
      const data = callback_query.data;

      // Authenticate Telegram Chat ID
      const user = await get('SELECT id FROM users WHERE telegram_chat_id = ?', [String(chatId)]);
      if (!user) return;

      if (data.startsWith('undo:') || data.startsWith('del_search:')) {
        const txId = data.split(':')[1];
        const tx = await get('SELECT amount, notes FROM transactions WHERE id = ? AND user_id = ?', [txId, user.id]);
        const detail = tx ? ` (₹${tx.amount} - ${tx.notes || ''})` : '';
        await execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, user.id]);
        await editMessageText(chatId, messageId, `❌ <b>Deleted transaction${detail} successfully.</b>`);
      }

      else if (data.startsWith('cats:')) {
        const txId = data.split(':')[1];
        
        // Fetch the transaction details to find its type
        const tx = await get('SELECT type FROM transactions WHERE id = ? AND user_id = ?', [txId, user.id]);
        if (!tx) return;

        // Query only categories matching the transaction type (income, expense, or savings)
        const categories = await query(
          'SELECT id, name, type FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = ? ORDER BY name ASC',
          [user.id, tx.type]
        );

        // Map all categories into the inline buttons
        const buttons = categories.map((cat: any) => ({
          text: `${cat.type === 'income' ? '🟢' : '🔴'} ${cat.name}`,
          callback_data: `setcat:${txId}:${cat.id}:${cat.name}`
        }));

        const keyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
          keyboard.push(buttons.slice(i, i + 2));
        }
        keyboard.push([{ text: '❌ Cancel', callback_data: `cancel_cat:${txId}` }]);

        await editMessageText(chatId, messageId, '🏷️ <b>Choose a Category:</b>', {
          inline_keyboard: keyboard
        });
      }

      else if (data.startsWith('setcat:')) {
        const parts = data.split(':');
        const txId = parts[1];
        const catId = parts[2];
        const catName = parts[3];

        await execute('UPDATE transactions SET category_id = ? WHERE id = ? AND user_id = ?', [catId, txId, user.id]);
        await editMessageText(chatId, messageId, `✅ <b>Category updated to:</b> ${catName}`);
      }

      else if (data.startsWith('cancel_cat:')) {
        await editMessageText(chatId, messageId, '🏷️ <b>Category selection cancelled.</b>');
      }
      return;
    }

    // 2. Handle Text Messages / SMS forwarding
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text.trim();

      // Check if command is start token linking
      if (text.startsWith('/start ')) {
        const token = text.split(' ')[1]?.toUpperCase();
        if (!token) return;

        const user = await get('SELECT id FROM users WHERE telegram_token = ?', [token]);
        if (!user) {
          await sendMessage(chatId, '❌ Invalid start token. Please check your Dashboard settings page.');
          return;
        }

        // Link user to this Telegram Chat ID
        await execute(
          'UPDATE users SET telegram_chat_id = ?, telegram_token = NULL WHERE id = ?',
          [String(chatId), user.id]
        );
        await sendMessage(chatId, '🎉 <b>Welcome to VENKE Finance!</b>\n\nYour account is successfully linked. You can now type transactions (e.g., <i>"spent 350 on petrol"</i>) or directly forward your bank SMS alerts to log them.');
        return;
      }

      // Find user matching this Chat ID
      const user = await get('SELECT id FROM users WHERE telegram_chat_id = ?', [String(chatId)]);
      if (!user) {
        await sendMessage(chatId, '🔒 <b>Your Telegram account is not linked.</b>\n\nPlease go to Settings ➔ Link Telegram on your Dashboard to configure.');
        return;
      }

      // ─── Command: /recent or /delete ────────────────────────────────────
      if (text === '/recent' || text === '/delete' || text === '/list') {
        const txs = await query(
          `SELECT t.*, c.name as category_name FROM transactions t 
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = ? 
           ORDER BY t.date DESC, t.id DESC LIMIT 5`,
          [user.id]
        );

        if (txs.length === 0) {
          await sendMessage(chatId, '📝 <b>No transactions found in your ledger.</b>');
          return;
        }

        let response = '📝 <b>Recent Transactions:</b>\n\n';
        const keyboard: any[] = [];

        txs.forEach((tx: any, index: number) => {
          response += `<b>${index + 1}.</b> ${tx.date} — <b>₹${tx.amount.toLocaleString('en-IN')}</b>\n` +
            `• <i>${tx.notes || 'No description'}</i> (${tx.category_name || 'Others'})\n\n`;
          
          keyboard.push([
            { text: `❌ Delete #${index + 1} (₹${tx.amount})`, callback_data: `del_search:${tx.id}` }
          ]);
        });

        await sendMessage(chatId, response, { inline_keyboard: keyboard });
        return;
      }

      // ─── Command: /search or /find ──────────────────────────────────────
      if (text.startsWith('/search ') || text.startsWith('/find ')) {
        const parts = text.split(' ');
        const searchTerm = parts.slice(1).join(' ').trim();
        if (!searchTerm) {
          await sendMessage(chatId, '🔍 Please provide a search term (e.g. <code>/search petrol</code>).');
          return;
        }

        const queryTerm = `%${searchTerm}%`;
        const txs = await query(
          `SELECT t.*, c.name as category_name FROM transactions t 
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = ? AND (t.notes LIKE ? OR c.name LIKE ?)
           ORDER BY t.date DESC, t.id DESC LIMIT 5`,
          [user.id, queryTerm, queryTerm]
        );

        if (txs.length === 0) {
          await sendMessage(chatId, `🔍 <b>No transactions found matching "${searchTerm}".</b>`);
          return;
        }

        let response = `🔍 <b>Search results for "${searchTerm}":</b>\n\n`;
        const keyboard: any[] = [];

        txs.forEach((tx: any, index: number) => {
          response += `<b>${index + 1}.</b> ${tx.date} — <b>₹${tx.amount.toLocaleString('en-IN')}</b>\n` +
            `• <i>${tx.notes || 'No description'}</i> (${tx.category_name || 'Others'})\n\n`;
          
          keyboard.push([
            { text: `❌ Delete (₹${tx.amount})`, callback_data: `del_search:${tx.id}` }
          ]);
        });

        await sendMessage(chatId, response, { inline_keyboard: keyboard });
        return;
      }

      // ─── Command: /balance ───────────────────────────────────────────────
      if (text === '/balance') {
        const txs = await query('SELECT amount, type FROM transactions WHERE user_id = ?', [user.id]);
        const income = txs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
        const expense = txs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
        const savings = txs.filter((t: any) => t.type === 'savings').reduce((sum: number, t: any) => sum + t.amount, 0);
        const balance = income - expense - savings;

        await sendMessage(chatId, `💵 <b>Current Balance Status</b>\n───────────────────\n• <b>Net Balance:</b> ₹${balance.toLocaleString('en-IN')}\n• <b>Total Income:</b> ₹${income.toLocaleString('en-IN')}\n• <b>Total Expenses:</b> ₹${expense.toLocaleString('en-IN')}\n• <b>Total Savings:</b> ₹${savings.toLocaleString('en-IN')}`);
        return;
      }

      const lowercaseText = text.toLowerCase();

      // Intercept LIC / Insurance logs
      if (lowercaseText.includes('lic') || lowercaseText.includes('policy') || lowercaseText.includes('insurance')) {
        const policies = await query(
          `SELECT * FROM lic_policies WHERE user_id = ? AND status = 'Running'`,
          [user.id]
        );
        if (policies.length === 0) {
          await sendMessage(chatId, '❌ <b>No active LIC Policies found.</b>\nPlease add a policy on your dashboard first.');
          return;
        }

        // Match policy
        let policy = policies[0];
        if (policies.length > 1) {
          for (const p of policies) {
            if (lowercaseText.includes(p.policy_name.toLowerCase()) || lowercaseText.includes(p.policy_number)) {
              policy = p;
              break;
            }
          }
        }

        const parsed = parseRecordInput(text, policy.monthly_premium);

        // Delete existing premium for that month/year if logged to avoid double entries
        await execute(
          `DELETE FROM lic_premium_history WHERE policy_id = ? AND month = ? AND year = ?`,
          [policy.id, parsed.month, parsed.year]
        );

        // Log premium history
        await execute(
          `INSERT INTO lic_premium_history (policy_id, month, year, amount_paid, paid_date, status) 
           VALUES (?, ?, ?, ?, ?, 'Paid')`,
          [policy.id, parsed.month, parsed.year, parsed.amount, parsed.date]
        );

        const monthName = new Date(2000, parsed.month - 1).toLocaleString('default', { month: 'long' });
        await sendMessage(
          chatId,
          `🛡️ <b>LIC Premium Logged!</b>\n───────────────────\n• <b>Policy:</b> ${policy.policy_name}\n• <b>Period:</b> ${monthName} ${parsed.year}\n• <b>Amount Paid:</b> ₹${parsed.amount.toLocaleString('en-IN')}\n• <b>Paid Date:</b> ${parsed.date}`
        );
        return;
      }

      // Intercept DigiGold buy logs
      if (lowercaseText.includes('gold') || lowercaseText.includes('digigold')) {
        const goldAccounts = await query(
          `SELECT * FROM digital_gold WHERE user_id = ?`,
          [user.id]
        );
        if (goldAccounts.length === 0) {
          await sendMessage(chatId, '❌ <b>No active Digital Gold accounts found.</b>\nPlease add a gold investment account on your dashboard first.');
          return;
        }

        let gold = goldAccounts[0];
        if (goldAccounts.length > 1) {
          for (const g of goldAccounts) {
            if (lowercaseText.includes(g.investment_name.toLowerCase()) || lowercaseText.includes(g.platform.toLowerCase())) {
              gold = g;
              break;
            }
          }
        }

        const parsed = parseRecordInput(text, 0);
        if (parsed.amount <= 0) {
          await sendMessage(chatId, '🪙 <b>Gold purchase failed:</b> Please specify a valid amount (e.g. <i>"bought gold 500"</i>).');
          return;
        }

        // Log gold transaction
        await execute(
          `INSERT INTO digital_gold_transactions (gold_id, month, year, amount) VALUES (?, ?, ?, ?)`,
          [gold.id, parsed.month, parsed.year, parsed.amount]
        );

        const monthName = new Date(2000, parsed.month - 1).toLocaleString('default', { month: 'long' });
        await sendMessage(
          chatId,
          `🪙 <b>Gold Investment Logged!</b>\n───────────────────\n• <b>Account:</b> ${gold.investment_name}\n• <b>Period:</b> ${monthName} ${parsed.year}\n• <b>Amount Invested:</b> ₹${parsed.amount.toLocaleString('en-IN')}`
        );
        return;
      }

      // Intercept Chit / Cheetu query or payment logs
      const chits = await query(
        `SELECT * FROM chit_funds WHERE user_id = ? AND status = 'Running'`,
        [user.id]
      );

      // Helper to clean chit name by removing years, months, and prepositions
      const cleanChitName = (nameQuery: string) => {
        let q = nameQuery.toLowerCase();
        q = q.replace(/\b20\d{2}\b/g, '');
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        months.forEach(m => q = q.replace(new RegExp('\\b' + m + '\\b', 'g'), ''));
        shortMonths.forEach(sm => q = q.replace(new RegExp('\\b' + sm + '\\b', 'g'), ''));
        q = q.replace(/\bon\s+\d{1,2}(?:st|nd|rd|th)?/g, '');
        q = q.replace(/\bfor\b/g, '');
        q = q.replace(/\bon\b/g, '');
        return q.trim().replace(/\s+/g, ' ');
      };

      // Match a query name against running chits
      const findMatchedChits = (queryName: string) => {
        if (!queryName) return [];
        const cleanQ = cleanChitName(queryName);
        if (!cleanQ) return [];
        
        // Try exact match first
        const exact = chits.find(c => c.chit_name.toLowerCase().trim().replace(/\s+/g, ' ') === cleanQ);
        if (exact) return [exact];

        // Try partial match
        return chits.filter(c => {
          const name = c.chit_name.toLowerCase();
          return name.includes(cleanQ) || cleanQ.includes(name);
        });
      };

      // Check if it is a pay command: "pay <amount> <Chit Fund Name>"
      const normalizedInput = text.trim().replace(/\s+/g, ' ');
      const payMatch = normalizedInput.match(/^pay\s+(\d+(?:,\d+)*(?:\.\d+)?)\s+(.+)$/i);
      const isPayCommand = !!payMatch;

      // Check if it is a status query
      const isStatusQuery = !isPayCommand && (
        lowercaseText.includes('chit') || 
        lowercaseText.includes('cheetu') || 
        lowercaseText.includes('due') || 
        lowercaseText.includes('pay') ||
        lowercaseText.includes('status') ||
        findMatchedChits(normalizedInput).length > 0
      );

      if (isPayCommand || isStatusQuery) {
        if (chits.length === 0) {
          await sendMessage(chatId, '❌ <b>No active running Chit Funds found.</b>\nPlease create a chit group on your dashboard first.');
          return;
        }

        if (isPayCommand) {
          const amount = parseFloat(payMatch[1].replace(/,/g, ''));
          const rawNameQuery = payMatch[2].trim();
          const matched = findMatchedChits(rawNameQuery);

          if (matched.length > 1) {
            const list = matched.map((c, idx) => `${idx + 1}. ${c.chit_name}`).join('\n\n');
            const response = `I found multiple Chit Funds with similar names.\n\n${list}\n\nPlease reply with the full Chit Fund name.`;
            await sendMessage(chatId, response);
            return;
          }

          if (matched.length === 0) {
            const listItems = chits.map(c => `• ${c.chit_name}`).join('\n');
            const response = `Unknown Chit Fund.\n\nAvailable Chit Funds:\n${listItems}\n\nUse:\npay &lt;amount&gt; &lt;Chit Fund Name&gt;\n\nExample:\npay 2500 ${chits[0]?.chit_name || 'Office Chit'}`;
            await sendMessage(chatId, response);
            return;
          }

          const matchedChit = matched[0];
          const parsed = parseRecordInput(text, amount);

          // Find the payment schedule item for that month/year
          const sched = await get(
            `SELECT id FROM chit_payments WHERE chit_id = ? AND month = ? AND year = ?`,
            [matchedChit.id, parsed.month, parsed.year]
          );

          if (sched) {
            await execute(
              `UPDATE chit_payments SET installment_amount = ?, status = 'Paid', payment_date = ? 
               WHERE id = ?`,
              [parsed.amount, parsed.date, sched.id]
            );
          } else {
            await execute(
              `INSERT INTO chit_payments (chit_id, month, year, installment_amount, status, payment_date) 
               VALUES (?, ?, ?, ?, 'Paid', ?)`,
              [matchedChit.id, parsed.month, parsed.year, parsed.amount, parsed.date]
            );
          }

          const monthName = new Date(2000, parsed.month - 1).toLocaleString('default', { month: 'long' });
          await sendMessage(
            chatId,
            `🎰 <b>Chit Payment Logged!</b>\n───────────────────\n• <b>Chit:</b> ${matchedChit.chit_name}\n• <b>Period:</b> ${monthName} ${parsed.year}\n• <b>Amount Paid:</b> ₹${parsed.amount.toLocaleString('en-IN')}\n• <b>Date:</b> ${parsed.date}`
          );
          return;
        }

        if (isStatusQuery) {
          // Parse month, year, and name query from conversational query
          const monthsList = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
          const shortMonthsList = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          
          let queryMonth = new Date().getMonth() + 1;
          let queryYear = new Date().getFullYear();

          // Extract Month
          let matchedMonthIdx = -1;
          for (let i = 0; i < monthsList.length; i++) {
            if (lowercaseText.includes(monthsList[i])) {
              matchedMonthIdx = i;
              break;
            }
          }
          if (matchedMonthIdx === -1) {
            for (let i = 0; i < shortMonthsList.length; i++) {
              const reg = new RegExp('\\b' + shortMonthsList[i] + '\\b', 'i');
              if (reg.test(lowercaseText)) {
                matchedMonthIdx = i;
                break;
              }
            }
          }
          if (matchedMonthIdx !== -1) {
            queryMonth = matchedMonthIdx + 1;
          }

          // Extract Year
          const yearMatch = lowercaseText.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            queryYear = parseInt(yearMatch[1], 10);
          }

          // Extract Chit Name by removing years, months, and prepositions
          let nameQuery = cleanChitName(normalizedInput);

          let matchedChits = chits;
          if (nameQuery.length > 0) {
            const matched = findMatchedChits(nameQuery);
            if (matched.length > 1) {
              const list = matched.map((c, idx) => `${idx + 1}. ${c.chit_name}`).join('\n\n');
              const response = `I found multiple Chit Funds with similar names.\n\n${list}\n\nPlease reply with the full Chit Fund name.`;
              await sendMessage(chatId, response);
              return;
            }
            if (matched.length === 0) {
              const listItems = chits.map(c => `• ${c.chit_name}`).join('\n');
              const response = `Unknown Chit Fund.\n\nAvailable Chit Funds:\n${listItems}\n\nUse:\npay &lt;amount&gt; &lt;Chit Fund Name&gt;\n\nExample:\npay 2500 ${chits[0]?.chit_name || 'Office Chit'}`;
              await sendMessage(chatId, response);
              return;
            }
            matchedChits = matched;
          }

          const formatDisplayDate = (dateStr: string) => {
            if (!dateStr) return 'N/A';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthStr = months[d.getMonth()];
            const yr = d.getFullYear();
            return `${day}-${monthStr}-${yr}`;
          };

          const monthName = new Date(2000, queryMonth - 1).toLocaleString('default', { month: 'long' });
          const monthLabel = `${monthName} ${queryYear}`;

          let responses: string[] = [];

          for (const chit of matchedChits) {
            const currentPay = await get(
              `SELECT * FROM chit_payments 
               WHERE chit_id = ? AND month = ? AND year = ?`,
              [chit.id, queryMonth, queryYear]
            );
            
            const stats = await get(
              `SELECT 
                 SUM(CASE WHEN status='Paid' THEN installment_amount ELSE 0 END) as total_paid, 
                 SUM(CASE WHEN status='Paid' THEN 1 ELSE 0 END) as months_paid
               FROM chit_payments WHERE chit_id = ?`,
              [chit.id]
            );

            const monthsPaid = Number(stats?.months_paid || 0);
            const monthsRemaining = Math.max(0, chit.total_months - monthsPaid);
            const totalPaid = Number(stats?.total_paid || 0);

            const monthlyContribution = chit.monthly_installment;
            const formattedClosing = formatDisplayDate(chit.closing_date);
            const dueAmount = currentPay?.installment_amount || chit.monthly_installment;

            if (currentPay?.status === 'Paid') {
              const formattedPayDate = formatDisplayDate(currentPay.payment_date);
              const nextDate = new Date(queryYear, queryMonth, 1);
              const nextMonthName = nextDate.toLocaleString('default', { month: 'long' });
              const nextMonthYear = nextDate.getFullYear();

              responses.push(
                `📌 <b>${chit.chit_name}</b>\n\n` +
                `<b>Current Month</b>\n${monthLabel}\n\n` +
                `<b>Due This Month</b>\n₹${dueAmount.toLocaleString('en-IN')}\n\n` +
                `<b>Status</b>\n✅ Paid\n\n` +
                `<b>Paid Amount</b>\n₹${currentPay.installment_amount.toLocaleString('en-IN')}\n\n` +
                `<b>Paid On</b>\n${formattedPayDate}\n\n` +
                `<b>Next Due</b>\n${nextMonthName} ${nextMonthYear}`
              );
            } else {
              responses.push(
                `📌 <b>${chit.chit_name}</b>\n\n` +
                `<b>Monthly Contribution</b>\n₹${monthlyContribution.toLocaleString('en-IN')}\n\n` +
                `<b>Current Month</b>\n${monthLabel}\n\n` +
                `<b>Due This Month</b>\n₹${dueAmount.toLocaleString('en-IN')}\n\n` +
                `<b>Closing Date</b>\n${formattedClosing}\n\n` +
                `<b>Months Remaining</b>\n${monthsRemaining}\n\n` +
                `<b>Total Paid</b>\n₹${totalPaid.toLocaleString('en-IN')}\n\n` +
                `<b>Status</b>\n🟢 Pending`
              );
            }
          }

          await sendMessage(chatId, responses.join('\n\n───────────────────\n\n'));
          return;
        }
      }



      // Parse Transaction text
      const categories = await query(
        'SELECT id, name, type FROM categories WHERE user_id IS NULL OR user_id = ?',
        [user.id]
      );

      const parsed = parseSingleLine(text, categories);

      if (parsed && parsed.amount > 0) {
        // Save Transaction
        const result = await execute(
          `INSERT INTO transactions (user_id, date, amount, type, category_id, payment_method, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user.id, parsed.date, parsed.amount, parsed.type, parsed.category_id, parsed.payment_method, parsed.notes]
        );

        const txId = result.lastID;

        // Formulate response card with inline keyboard
        const responseText = `💰 <b>Transaction Logged!</b>\n` +
          `───────────────────\n` +
          `• <b>Amount:</b> ₹${parsed.amount.toLocaleString('en-IN')}\n` +
          `• <b>Category:</b> ${parsed.category_name}\n` +
          `• <b>Type:</b> <code style="text-transform: uppercase;">${parsed.type}</code>\n` +
          `• <b>Method:</b> ${parsed.payment_method}\n` +
          `• <b>Notes:</b> ${parsed.notes}\n` +
          `• <b>Date:</b> ${parsed.date}`;

        const inlineKeyboard = {
          inline_keyboard: [
            [
              { text: '❌ Undo', callback_data: `undo:${txId}` },
              { text: '🏷️ Category', callback_data: `cats:${txId}` }
            ]
          ]
        };

        await sendMessage(chatId, responseText, inlineKeyboard);
      } else {
        await sendMessage(chatId, '🤷‍♂️ <b>I couldn\'t extract a valid transaction.</b>\n\nPlease send sentences containing amounts, like:\n• <i>"Spent 500 on Food today"</i>\n• <i>"Got 50000 salary from office"</i>\n• Or forward a bank SMS alert.');
      }
    }
  } catch (error: any) {
    console.error('[Telegram Webhook Handling Error]', error);
  }
});

// Helper to parse record inputs (LIC, Gold, Chit) from natural language
function parseRecordInput(text: string, defaultAmount: number = 0) {
  const clean = text.toLowerCase();
  
  // 1. Extract Date using robust parseNaturalDate helper
  const date = parseNaturalDate(text);
  
  // Extract month and year from that parsed date
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);

  // 2. Extract Amount (ignoring year/date numbers)
  let amount = defaultAmount;
  const textWithoutYears = clean.replace(/\b20\d{2}\b/g, ''); // strip 4-digit years
  const amountMatch = clean.match(/(?:rs\.?|inr|₹|amount|paid|spent|invested|buy)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) || 
                      textWithoutYears.match(/\b(\d{3,6})\b/); // minimum 3 digits to avoid matching day numbers like 2, 5, 15
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  return { amount, month, year, date };
}

export default router;
