# Walkthrough - Policy-Agnostic LIC Autonomous Automation Engine

Implemented a **completely policy-agnostic, contract-driven LIC autonomous automation engine**. The system derives all schedule generation, payment reconciliation, next-premium resolution, and Telegram dispatches dynamically from policy contract fields without hardcoding policy names, dates, amounts, or terms.

> [!IMPORTANT]
> **REGRESSION PROTECTION**: Cheetu, DigiGold, Dashboard financial calculations, Budgets, Transactions, and Analytics remain **100% untouched and preserved**.

---

## ⚡ Core Engine Capabilities

1. **Universal Schedule Generation & Frequency Calculation**
   - Supports `Monthly`, `Quarterly`, `Half-Yearly`, and `Yearly` policy frequencies.
   - Calculates exact installment counts (`termYears * (12 / stepMonths)`).

2. **Universal Historical Backfill & Immediate Reconciliation**
   - Past installments auto-backfill as `Paid`.
   - Current month installment reconciles automatically upon policy creation.

3. **15-Minute Continuous Background Scheduler Ticker**
   - `GlobalLicAutopilotService.start15MinuteTicker(1)` evaluates active policies every 15 minutes.
   - Automatically processes pending installments where `due_date <= TODAY`.

4. **Missed-Run Recovery Engine**
   - Reconciles missed executions automatically upon server startup.

5. **Single Source of Truth (`lic_premium_schedule`)**
   - Dynamic Next Premium: First unpaid installment ordered by `installment_number ASC`.
   - Policy Badge: Current installment status strictly from `lic_premium_schedule`.

---

## 🔒 Verification & Build Output
1. **Compilation**: Ran `npm run build` — transformed **2,436 modules** in **1.69s** with **0 TypeScript / Vite errors**.
2. **Git Commit**: Saved to `main` (`8f7925d`).
