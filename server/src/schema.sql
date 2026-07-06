-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    theme TEXT DEFAULT 'dark',
    password_reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense', 'savings')) NOT NULL,
    color TEXT DEFAULT '#2563EB',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recurring Transactions Rules
CREATE TABLE IF NOT EXISTS recurring_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense', 'savings')) NOT NULL,
    category_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
    next_date DATE NOT NULL,
    last_triggered DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense', 'savings')) NOT NULL,
    category_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    tags TEXT,
    recurring_id INTEGER,
    is_imported INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(recurring_id) REFERENCES recurring_rules(id) ON DELETE SET NULL
);

-- Savings Investments Table
CREATE TABLE IF NOT EXISTS savings_investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    investment_type TEXT CHECK(investment_type IN (
        'emergency_fund', 'gold', 'sip', 'mutual_funds', 'fixed_deposits', 
        'stocks', 'digital_gold', 'crypto', 'cash', 'other'
    )) NOT NULL,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    limit_amount REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id, month, year),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Savings Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_saved REAL DEFAULT 0,
    deadline DATE NOT NULL,
    status TEXT CHECK(status IN ('active', 'completed')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert Default Categories (id 1 to 15)
INSERT OR IGNORE INTO categories (id, user_id, name, type, color) VALUES 
(1, NULL, 'Food', 'expense', '#F59E0B'),
(2, NULL, 'Travel', 'expense', '#3B82F6'),
(3, NULL, 'Fuel', 'expense', '#EF4444'),
(4, NULL, 'Rent', 'expense', '#8B5CF6'),
(5, NULL, 'Shopping', 'expense', '#EC4899'),
(6, NULL, 'Entertainment', 'expense', '#10B981'),
(7, NULL, 'EMI', 'expense', '#F97316'),
(8, NULL, 'Bills', 'expense', '#6366F1'),
(9, NULL, 'Medical', 'expense', '#14B8A6'),
(10, NULL, 'Insurance', 'expense', '#06B6D4'),
(11, NULL, 'Salary', 'income', '#10B981'),
(12, NULL, 'Freelance', 'income', '#3B82F6'),
(13, NULL, 'Bonus', 'income', '#8B5CF6'),
(14, NULL, 'Investment', 'savings', '#F59E0B'),
(15, NULL, 'Miscellaneous', 'expense', '#6B7280');

-- Debts & Loans Table
CREATE TABLE IF NOT EXISTS debts_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    person_name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('borrowed', 'lent')) NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    status TEXT CHECK(status IN ('pending', 'paid')) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    monthly_amount REAL,
    total_amount_paid REAL DEFAULT 0,
    start_date DATE NOT NULL,
    maturity_date DATE,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Money Transfers Table
CREATE TABLE IF NOT EXISTS money_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    purpose TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chit Funds Table
CREATE TABLE IF NOT EXISTS chit_funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    monthly_amount REAL NOT NULL,
    total_paid REAL DEFAULT 0,
    remaining_installments INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Personal Notes Table
CREATE TABLE IF NOT EXISTS personal_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    title TEXT,
    content TEXT NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    upload_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Polymorphic Monthly Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    record_type TEXT NOT NULL, -- 'debt', 'deposit', 'chit'
    month_year TEXT NOT NULL, -- e.g. 'Apr 2023'
    payment_date DATE NOT NULL,
    amount REAL NOT NULL,
    payment_type TEXT DEFAULT 'UPI',
    notes TEXT,
    attachment_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
