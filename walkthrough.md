# Walkthrough - LIC Next Scheduled Premium Recalculation & State Synchronization

Fixed the LIC Next Scheduled Premium recalculation bug so that the pointer advances dynamically after **every payment mutation**, manual payment, manual sync, edit, deletion, or automated execution.

> [!IMPORTANT]
> **NO CACHING — DYNAMIC RECALCULATION**: Every LIC mutation endpoint (`POST /lic/:id/premiums`, `DELETE /lic/premiums/:id`, `POST /automation/lic/global-sync`, `PUT /lic/:id`, `POST /lic`) updates `lic_premium_schedule`, recalculates metrics, resolves `nextScheduledPremium`, returns `{ policyId, paidInstallments, pendingInstallments, nextScheduledPremium, isCompleted }`, and emits `lic:updated`. Cheetu, DigiGold, Dashboard financial calculations, Budgets, Transactions, and Analytics remain **100% untouched and preserved**.

---

## ⚡ Key Improvements

### 1. Mandatory Recalculation Trigger (`LicPolicyScheduleService.getNextScheduledPremium`)
- **Query**:
  ```sql
  SELECT * FROM lic_premium_schedule
  WHERE policy_id = ? AND status IN ('Pending', 'Overdue')
  ORDER BY installment_number ASC
  LIMIT 1
  ```
- Evaluated dynamically after every payment or schedule edit.

---

### 2. Standardized API Response Payload
- Mutation endpoints (`POST /api/records/lic/:id/premiums`, `DELETE /api/records/lic/premiums/:id`, `GET /api/records/lic`) return:
  ```json
  {
    "success": true,
    "policyId": 2,
    "paidInstallments": 27,
    "pendingInstallments": 153,
    "nextScheduledPremium": {
      "installmentNumber": 28,
      "month": 10,
      "year": 2026,
      "amount": 932,
      "dueDate": "02 Oct 2026",
      "monthYearStr": "October 2026",
      "formattedStr": "October 2026 • ₹932"
    },
    "isCompleted": false
  }
  ```

---

### 3. Real-Time Event Subscription (`subscribeLicUpdates`)
- `ReadOnlyLicAutomationCard.tsx` subscribes to `subscribeLicUpdates(fetchLicAutomationInfo)`.
- When September 2026 is marked Paid, `emitLicUpdated()` fires, refreshing `ReadOnlyLicAutomationCard` instantly.
- Pointer advances immediately from **September 2026** → **October 2026** → **November 2026** without page reloads.

---

### 4. Recalculated Telegram Confirmation
- Telegram payload uses the newly resolved Next Scheduled Premium:
  ```html
  Venke Finance — LIC Premium Recorded

  Policy: LIC 2024
  Month: September 2026
  Amount: ₹932
  Status: Paid
  Paid on: 01 Sep 2026
  Next Premium: October 2026
  Due: 02 Oct 2026

  Venke Finance
  ```

---

## 🔒 Verification & Build Output
1. **Compilation**: Ran `npm run build` — transformed **2,436 modules** in **1.70s** with **0 TypeScript / Vite errors**.
2. **Git Commit**: Saved to `main` (`42b95bb`).
