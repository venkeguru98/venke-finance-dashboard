import { query, execute, get } from '../database';
import { LicPolicyScheduleService } from './LicPolicyScheduleService';

export type LicSchedulerEventType = 
  | 'AUTO_PAYMENT_COMPLETED'
  | 'RECONCILIATION_REPAIRED'
  | 'MONTH_END_FORECAST_GENERATED'
  | 'MISSED_RUN_RECOVERED';

export interface LicSchedulerEventPayload {
  policyId?: number;
  policyName?: string;
  installmentNumber?: number;
  premiumAmount?: number;
  paidDate?: string;
  nextDueMonth?: string;
  missedPeriod?: string;
  totalActivePolicies?: number;
  nextMonthCommitment?: number;
  forecastPeriod?: string;
  executionTime?: string;
}

export class LicSchedulerEventDispatcher {
  /**
   * Universal Post-Commit Event Dispatcher for LIC Scheduler
   * Ensures Telegram notification is sent ONLY after DB transaction commit.
   */
  static async dispatch(eventType: LicSchedulerEventType, payload: LicSchedulerEventPayload, userId: number = 1): Promise<boolean> {
    try {
      const user = await get(`SELECT telegram_chat_id FROM users WHERE id = ?`, [userId]);
      const chatId = user?.telegram_chat_id;
      if (!chatId) {
        console.log(`[LicSchedulerEventDispatcher] Telegram not linked for user #${userId}. Skipping dispatch.`);
        return false;
      }

      const execTime = payload.executionTime || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      let message = '';
      let actionLog = '';

      switch (eventType) {
        case 'AUTO_PAYMENT_COMPLETED':
          actionLog = 'Auto-marked Paid';
          message = 
            `<b>Venke Finance — LIC Autopilot Executed</b>\n\n` +
            `Scheduler completed successfully.\n\n` +
            `Policy: <b>${payload.policyName || `Policy #${payload.policyId}`}</b>\n` +
            `Installment: <b>${payload.installmentNumber}</b>\n` +
            `Amount: <b>₹${(payload.premiumAmount || 0).toLocaleString('en-IN')}</b>\n` +
            `Status: <b>Auto Paid</b>\n` +
            `Paid Date: <b>${payload.paidDate}</b>\n` +
            `Next Premium: <b>${payload.nextDueMonth || 'N/A'}</b>\n` +
            `Execution Time: <b>${execTime}</b>\n` +
            `Scheduler: <b>Success</b>\n\n` +
            `Venke Finance`;
          break;

        case 'RECONCILIATION_REPAIRED':
          actionLog = 'Reconciliation Repaired';
          message = 
            `<b>Venke Finance — LIC Autopilot Reconciled</b>\n\n` +
            `A missing premium record was restored automatically.\n\n` +
            `Policy: <b>${payload.policyName || `Policy #${payload.policyId}`}</b>\n` +
            `Installment: <b>${payload.installmentNumber}</b>\n` +
            `Result: <b>Repaired Successfully</b>\n` +
            `Execution Time: <b>${execTime}</b>\n\n` +
            `Venke Finance`;
          break;

        case 'MONTH_END_FORECAST_GENERATED':
          actionLog = 'Forecast Sent';
          message = 
            `<b>Venke Finance — LIC Forecast Generated</b>\n\n` +
            `Next Month Forecast\n` +
            `Total Active Policies: <b>${payload.totalActivePolicies || 0}</b>\n` +
            `Total Commitment: <b>₹${(payload.nextMonthCommitment || 0).toLocaleString('en-IN')}</b>\n` +
            `Forecast Period: <b>${payload.forecastPeriod || 'Next Month'}</b>\n` +
            `Scheduler: <b>Success</b>\n` +
            `Execution Time: <b>${execTime}</b>\n\n` +
            `Venke Finance`;
          break;

        case 'MISSED_RUN_RECOVERED':
          actionLog = 'Missed Run Recovered';
          message = 
            `<b>Venke Finance — LIC Recovery Completed</b>\n\n` +
            `A missed automation cycle was recovered successfully.\n\n` +
            `Policy: <b>${payload.policyName || `Policy #${payload.policyId}`}</b>\n` +
            `Installment: <b>${payload.installmentNumber}</b>\n` +
            `Recovery Time: <b>${execTime}</b>\n` +
            `Next Premium: <b>${payload.nextDueMonth || 'N/A'}</b>\n\n` +
            `Venke Finance`;
          break;
      }

      // Retry delivery loop (30s, 2m, 10m)
      let sent = false;
      const retryDelays = [0, 30000, 120000, 600000];

      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        if (attempt > 0) {
          console.log(`[LicSchedulerEventDispatcher] Retrying Telegram dispatch for ${eventType} (Attempt ${attempt}/3)...`);
          await new Promise((r) => setTimeout(r, retryDelays[attempt]));
        }

        sent = await LicPolicyScheduleService.sendTelegram(chatId, message);
        if (sent) break;
      }

      // Log dispatch status
      await execute(
        `INSERT INTO recurring_automation_logs (user_id, module_type, entity_id, action, amount, period_month, period_year, telegram_sent, details)
         VALUES (?, 'lic', ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          payload.policyId || 0,
          actionLog,
          payload.premiumAmount || 0,
          new Date().getMonth() + 1,
          new Date().getFullYear(),
          sent ? 1 : 0,
          `[Event: ${eventType}] ${sent ? 'Delivered' : 'Failed after retries'} at ${execTime}`
        ]
      );

      return sent;
    } catch (err: any) {
      console.error('[LicSchedulerEventDispatcher Error]', err);
      return false;
    }
  }
}
