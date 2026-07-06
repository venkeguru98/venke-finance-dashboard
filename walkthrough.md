# VENKE Finance Dashboard - Production Deployment & Desktop Walkthrough

The application has been successfully configured into a production-ready, self-contained desktop system. You can now run the dashboard directly from your Windows environment and share access with other devices (e.g. mobile phones) on your local Wi-Fi network.

## Key Enhancements

### 1. Unified Express Production Server
* **Static Asset Serving:** We have replaced the dual dev servers (Vite client + Node dev backend). The Node server now compiles both layers and serves the React client dist folder statically on a single port (**5000**).
* **Dynamic API Paths:** Removed all hardcoded `http://localhost:5000` URLs. The frontend now calculates APIs dynamically (`/api`). This ensures the app works flawlessly from any device without CORS issues.
* **Network Binding (`0.0.0.0`):** The server now binds to `0.0.0.0` instead of `localhost`, allowing local Wi-Fi devices to connect.
* **Graceful Port Collision Handling:** If port 5000 is already occupied, the server exits cleanly with instructions on how to clear it instead of crashing.

---

### 2. One-Click Launcher (`launch.bat`)
* You can start the entire application by double-clicking the launch.bat file at the project root.
* **Smart Checks:** It checks if the server is already active on port 5000. If so, it instantly opens the browser tab.
* **Silent Execution:** It spins up the server in a minimized cmd prompt window and continuously checks the health endpoint before opening the browser.

---

### 3. Startup Configuration Scripts
* **Enable Boot Launch:** Run the `setup-startup.ps1` script in PowerShell to launch the dashboard automatically when Windows boots.
* **Disable Boot Launch:** Run the `remove-startup.ps1` script to remove it.

---

### 4. Settings Panel Upgrades
Go to the **Settings** page in the application to access:
* **System Stats Panel:** View Application Version, Server Status (Running), Database Status, Database File Size, and Port.
* **Local Network Details & QR Code:** Displays your current host IPv4 address. You can scan the displayed QR Code with your mobile phone's camera to open the dashboard over Wi-Fi instantly!
* **Database Snapshot & Restore:** 
  * Trigger a new manual backup.
  * Download the raw SQLite database file.
  * Restore your database from a list of historical backups with a single click.

---

### 5. Enhanced Dashboard Summary Widgets
* **Monthly Savings Card:** Prominently displays current month savings (total of `savings` type transactions) with MoM changes, percent fluctuations, and real-time sparkline charts.
* **Available Balance Card:** Displays your actual remaining spending cash (`Available Balance = Monthly Income - Monthly Expenses - Monthly Savings`) with color indicators:
  * 🟢 **Green (Healthy):** Positive balance and savings rate above 20%.
  * 🟡 **Yellow (Low):** Available balance under 20% of income or under ₹5,000.
  * 🔴 **Red (Critical/Overspent):** Negative remaining balance.
* **Net Balance Card:** Synchronized to display the identical monthly remaining amount (`Monthly Income - Monthly Expenses - Monthly Savings`) as Available Balance, ensuring unified accounting data representation.
* **6-Card Responsive Row:** Rearranged the layout into a sleek responsive grid displaying: Monthly Income, Monthly Expenses, Monthly Savings, Available Balance, Net Balance, and Savings Rate.
* **Interaction Tooltips:** Hovering over any card reveals detailed calculation breakdowns (e.g. formula, comparison figures).
* **Real-time Updates & Empty States:** recaclulates and renders immediately when adding/editing/deleting transactions, displaying helpful setup prompts if income is missing.

---

### 6. Mobile UI/UX Overhaul
* **Collapsible Navigation Drawer:** Replaced the static desktop sidebar navigation with a responsive sliding drawer on mobile viewports. Includes a hamburger toggle trigger in the top navbar and auto-closes when navigation completes.
* **Sticky Bottom Thumb Navigation:** Added a bottom sticky tab bar on mobile screens (`Dashboard`, `Transactions`, `Records`, `Budgets`, `Insights`) for easy, one-handed thumb navigation.
* **Data-Table-to-Card Transformation:** Wide, multi-column desktop tables on the Transactions and Financial Records pages dynamically transform into responsive, high-fidelity native cards on mobile viewports to prevent horizontal page scrolling.
* **Scrollable Tab Bars:** Navigation tabs (like the Debt, Deposits, Transfers tabs inside Financial Records or filters inside Transactions) use horizontal scrolling with hidden scrollbars, preventing crowding and wrapping.
* **Mobile-Optimized Forms:** Grids and multi-column inputs stack vertically on screens `< sm` with enlarged touch targets ($\ge 44\times44\text{px}$) to enhance native mobile tap interaction.

---

### 7. Polymorphic Monthly Ledger System
* **Child Payment Logs Database Table:** Created `ledger_entries` schema holding polymorphic child records mapping payments/contributions to parent records (`debts_loans`, `deposits`, `chit_funds`).
* **Automated Aggregate Analytics:** Selecting a record automatically computes sum totals for target amounts, total amount paid, outstanding balances, average monthly payment, last payment dates, and payment counts.
* **Inline Adding & Editing Logs:** Add or edit ledger payments directly from the record's details drawer, selecting dates, contribution amounts, payment types, and notes.
* **Receipt & Document Attachment Uploads:** Integrates raw file upload capabilities (receipts, screenshots, statements) to each individual payment log.
* **Year-Wise Grouped Collapsible Accordions:** Automatically groups payments chronologically under collapsible year headings (e.g. `Year 2023`, `Year 2024`) displaying detailed item descriptors.

---

## Direct Launch Instructions

Double-click the `launch.bat` file in your file explorer to launch the dashboard.
