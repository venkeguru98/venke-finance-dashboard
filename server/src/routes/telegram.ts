import { Router, Request, Response } from 'express';
import { query, execute, get } from '../database';
import { parseSingleLine } from '../utils/nlp';
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

      if (data.startsWith('undo:')) {
        const txId = data.split(':')[1];
        await execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, user.id]);
        await editMessageText(chatId, messageId, '❌ <b>Transaction deleted successfully.</b>');
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

export default router;
