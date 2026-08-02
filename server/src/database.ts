import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Check if we are running in PostgreSQL mode
const isPg = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: any = null;

const dbPath = path.resolve(__dirname, '../../database.sqlite');

if (isPg) {
  console.log('Connecting to Cloud PostgreSQL Database...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
} else {
  // Only load sqlite3 when actually needed (prevents crash on cloud where native build fails)
  try {
    const sqlite3 = require('sqlite3').verbose();
    console.log('Connecting to Local SQLite Database...');
    sqliteDb = new sqlite3.Database(dbPath, (err: any) => {
      if (err) {
        console.error('Error connecting to SQLite:', err.message);
      } else {
        console.log('Connected to the SQLite database.');
      }
    });
  } catch (err) {
    console.error('[DB] sqlite3 module not available. Set DATABASE_URL for PostgreSQL.');
    process.exit(1);
  }
}

// Convert SQLite '?' parameters and functions to PostgreSQL counterparts
const convertSql = (sql: string): string => {
  if (!isPg) return sql;
  let converted = sql;

  // 1. Convert strftime('%Y-%m', date) -> to_char(date, 'YYYY-MM')
  converted = converted.replace(/strftime\s*\(\s*'%Y-%m'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')");

  // 2. Convert strftime('%d', date) -> to_char(date, 'DD')
  converted = converted.replace(/strftime\s*\(\s*'%d'\s*,\s*([^)]+)\)/gi, "to_char($1, 'DD')");

  // 3. Convert GROUP_CONCAT(expr, separator) -> string_agg(expr::text, separator)
  converted = converted.replace(/GROUP_CONCAT\s*\(([^,]+)\s*,\s*('[^']+')\)/gi, "string_agg(($1)::text, $2)");

  // 3a. Convert GROUP BY month_raw -> GROUP BY to_char(date, 'YYYY-MM')
  converted = converted.replace(/GROUP BY\s+month_raw/gi, "GROUP BY to_char(date, 'YYYY-MM')");

  // 3b. Convert GROUP BY day_str -> GROUP BY to_char(date, 'DD')
  converted = converted.replace(/GROUP BY\s+day_str/gi, "GROUP BY to_char(date, 'DD')");

  // 3c. Convert (t.)date LIKE -> CAST((t.)date AS TEXT) LIKE (PostgreSQL DATE type safety)
  converted = converted.replace(/\b((?:[a-z_]+\.)?date)\s+LIKE\b/gi, "CAST($1 AS TEXT) LIKE");

  // 4. Convert parameter placeholders '?' to '$1, $2, ...'
  let index = 1;
  converted = converted.replace(/\?/g, () => `$${index++}`);

  return converted;
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    const result = await pgPool.query(converted, params);
    return result.rows;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(converted, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  return [];
};

export const execute = async (sql: string, params: any[] = []): Promise<any> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    // For INSERT statements, add RETURNING id to get the inserted row's ID
    let pgSql = converted;
    if (/^\s*INSERT/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }
    const result = await pgPool.query(pgSql, params);
    return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(converted, params, function (this: any, err: any) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    const result = await pgPool.query(converted, params);
    return result.rows[0] || null;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(converted, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  return null;
};

// Initialize schema (works for both SQLite & PostgreSQL)
export const initializeDatabase = async () => {
  try {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../src/schema.sql');
    }
    let schema = fs.readFileSync(schemaPath, 'utf-8');
    
    if (isPg && pgPool) {
      // Adapt SQLite syntax to PostgreSQL
      schema = schema
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/DATETIME/g, 'TIMESTAMP')
        .replace(/CHECK\(type IN \('income', 'expense', 'savings'\)\)/g, '')
        .replace(/CHECK\(status IN \('pending', 'paid'\)\)/g, '')
        .replace(/CHECK\(status IN \('active', 'completed'\)\)/g, '')
        .replace(/CHECK\(type IN \('borrowed', 'lent'\)\)/g, '')
        .replace(/CHECK\(frequency IN \('daily', 'weekly', 'monthly', 'yearly'\)\)/g, '')
        .replace(/CHECK\(investment_type IN \([\s\S]*?\)\)/g, '')
        .replace(/INSERT OR IGNORE/g, 'INSERT');
      
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await pgPool.query(stmt);
        } catch (err: any) {
          // Ignore "already exists" and duplicate key errors (idempotent schema init)
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.warn('[PG Schema]', err.message.slice(0, 120));
          }
        }
      }
      
      // Sync sequences to prevent duplicate key errors on inserts
      const tables = [
        'users', 'categories', 'transactions', 'budgets', 'goals', 'recurring_rules',
        'savings_investments', 'notifications', 'debts', 'deposits', 'transfers',
        'chit_funds', 'notes', 'documents', 'ledger_entries',
        'lic_policies', 'lic_premium_history', 'digital_gold', 'digital_gold_transactions',
        'chit_payments', 'savings_accounts', 'savings_transactions', 'mutual_funds', 'mutual_fund_transactions',
        'personal_tasks', 'personal_habits', 'habit_completions', 'personal_goals', 'goal_milestones',
        'personal_notes', 'personal_reminders', 'personal_events'
      ];
      for (const table of tables) {
        try {
          await pgPool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(max(id), 1)) FROM ${table}`);
        } catch (seqErr) {
          // Ignore error if table or sequence doesn't exist yet
        }
      }

      console.log('PostgreSQL database schema initialized.');
    } else if (sqliteDb) {
      return new Promise<void>((resolve, reject) => {
        sqliteDb.exec(schema, (err: any) => {
          if (err) reject(err);
          else {
            console.log('SQLite database schema initialized.');
            resolve();
          }
        });
      });
    }

    // Apply Schema Migrations for Telegram Integrations
    try {
      await execute('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT NULL');
    } catch (e) {}
    try {
      await execute('ALTER TABLE users ADD COLUMN telegram_token TEXT NULL');
    } catch (e) {}

    // Apply Schema Migrations for Debt Manager (Accounts, Transactions, Settlements)
    try {
      if (isPg && pgPool) {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS debt_accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            account_name VARCHAR(255) NOT NULL,
            description TEXT,
            priority VARCHAR(50) DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS debt_transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            account_id INTEGER NOT NULL REFERENCES debt_accounts(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            amount REAL NOT NULL,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            notes TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS debt_settlements (
            id SERIAL PRIMARY KEY,
            transaction_id INTEGER NOT NULL REFERENCES debt_transactions(id) ON DELETE CASCADE,
            amount REAL NOT NULL,
            date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await execute(`
          CREATE TABLE IF NOT EXISTS debt_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_name TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS debt_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('Borrowed', 'Lent')) NOT NULL,
            amount REAL NOT NULL,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            notes TEXT,
            status TEXT CHECK(status IN ('Pending', 'Partially Settled', 'Settled')) DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(account_id) REFERENCES debt_accounts(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS debt_settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            date DATE NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(transaction_id) REFERENCES debt_transactions(id) ON DELETE CASCADE
          )
        `);
      }

      // Dynamic migration for priority column in debt_accounts
      try {
        if (isPg && pgPool) {
          await pgPool.query(`ALTER TABLE debt_accounts ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'`);
          await pgPool.query(`UPDATE debt_accounts SET priority = 'medium' WHERE priority IS NULL OR priority = ''`);
        } else {
          await execute(`ALTER TABLE debt_accounts ADD COLUMN priority TEXT DEFAULT 'medium'`);
          await execute(`UPDATE debt_accounts SET priority = 'medium' WHERE priority IS NULL OR priority = ''`);
        }
      } catch (colErr) {
        // Ignore if column already exists
      }

      console.log('Debt Manager database tables verified/created.');
    } catch (dbErr) {
      console.error('Migration failed for debt manager tables:', dbErr);
    }

    // Apply Schema Migrations for Advanced Budget Planner
    try {
      if (isPg && pgPool) {
        await pgPool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS rollover_enabled INTEGER DEFAULT 0`);
        await pgPool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS rollover_amount REAL DEFAULT 0`);
        await pgPool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS linked_goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL`);
        await pgPool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'essential'`);

        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS salary_allocations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            income_amount REAL NOT NULL DEFAULT 0,
            allocation_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT salary_alloc_user_month_year UNIQUE(user_id, month, year)
          )
        `);

        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS budget_goal_allocations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
            suggested_amount REAL NOT NULL,
            accepted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        try { await execute(`ALTER TABLE budgets ADD COLUMN rollover_enabled INTEGER DEFAULT 0`); } catch (e) {}
        try { await execute(`ALTER TABLE budgets ADD COLUMN rollover_amount REAL DEFAULT 0`); } catch (e) {}
        try { await execute(`ALTER TABLE budgets ADD COLUMN linked_goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL`); } catch (e) {}
        try { await execute(`ALTER TABLE budgets ADD COLUMN priority TEXT DEFAULT 'essential'`); } catch (e) {}

        await execute(`
          CREATE TABLE IF NOT EXISTS salary_allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            income_amount REAL NOT NULL DEFAULT 0,
            allocation_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, month, year),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await execute(`
          CREATE TABLE IF NOT EXISTS budget_goal_allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            budget_id INTEGER NOT NULL,
            goal_id INTEGER NOT NULL,
            suggested_amount REAL NOT NULL,
            accepted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
            FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
          )
        `);
      }
      console.log('Budget Planner database tables & migrations verified/created.');
    } catch (budgetMigErr) {
      console.error('Migration failed for budget planner tables:', budgetMigErr);
    }

    // Create Mutual Funds tables
    try {
      if (isPg && pgPool) {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS mutual_funds (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            fund_name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            fund_house VARCHAR(255) NOT NULL,
            expense_ratio REAL NOT NULL DEFAULT 0,
            benchmark VARCHAR(255),
            risk_level VARCHAR(50) DEFAULT 'High',
            launch_year INTEGER,
            notes TEXT,
            current_nav REAL NOT NULL DEFAULT 10.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS mutual_fund_transactions (
            id SERIAL PRIMARY KEY,
            fund_id INTEGER NOT NULL REFERENCES mutual_funds(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            type VARCHAR(50) NOT NULL,
            amount REAL NOT NULL,
            nav REAL NOT NULL,
            units REAL NOT NULL,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await execute(`
          CREATE TABLE IF NOT EXISTS mutual_funds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            fund_name TEXT NOT NULL,
            category TEXT NOT NULL,
            fund_house TEXT NOT NULL,
            expense_ratio REAL NOT NULL DEFAULT 0,
            benchmark TEXT,
            risk_level TEXT DEFAULT 'High',
            launch_year INTEGER,
            notes TEXT,
            current_nav REAL NOT NULL DEFAULT 10.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS mutual_fund_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fund_id INTEGER NOT NULL,
            date DATE NOT NULL,
            type TEXT CHECK(type IN ('SIP', 'Lumpsum', 'Redemption')) NOT NULL,
            amount REAL NOT NULL,
            nav REAL NOT NULL,
            units REAL NOT NULL,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(fund_id) REFERENCES mutual_funds(id) ON DELETE CASCADE
          )
        `);
      }
      console.log('Mutual Funds database tables verified/created.');
      // Migrations to add scheme_code column to mutual_funds if not exists
      try {
        if (isPg && pgPool) {
          await pgPool.query(`ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS scheme_code VARCHAR(100) NULL`);
        } else {
          await execute(`ALTER TABLE mutual_funds ADD COLUMN scheme_code TEXT NULL`);
        }
      } catch (alterErr) {
        // Ignore column already exists error
      }
    } catch (mfErr) {
      console.error('Migration failed for mutual funds tables:', mfErr);
    }

    // Dynamic Migration of legacy debts_loans entries to debt_accounts structure
    try {
      const oldDebts = await query(`SELECT * FROM debts_loans`);
      if (oldDebts && oldDebts.length > 0) {
        const accountsCheck = await query(`SELECT COUNT(*) as count FROM debt_accounts`);
        const accCount = accountsCheck[0]?.count || 0;
        if (Number(accCount) === 0) {
          console.log(`[DB Migration] Migrating ${oldDebts.length} legacy debts_loans entries to new account structure...`);
          const accountMap = new Map<string, number>();

          for (const d of oldDebts) {
            const key = `${d.user_id}_${d.person_name}`;
            let accId = accountMap.get(key);
            if (!accId) {
              const res = await execute(
                `INSERT INTO debt_accounts (user_id, account_name, description) VALUES (?, ?, ?)`,
                [d.user_id || 1, d.person_name, `Migrated account for ${d.person_name}`]
              );
              accId = res.lastID;
              accountMap.set(key, accId!);
            }

            const txStatus = d.status === 'paid' ? 'Settled' : 'Pending';
            const txType = d.type === 'borrowed' ? 'Borrowed' : 'Lent';

            await execute(
              `INSERT INTO debt_transactions (user_id, account_id, type, amount, date, description, notes, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [d.user_id || 1, accId, txType, d.amount, d.date, `Legacy debt record: ${d.notes || 'No description'}`, d.notes || '', txStatus]
            );
          }
          console.log('[DB Migration] Legacy debts_loans migration complete.');
        }
      }
    } catch (_) {
      // Ignore errors if debts_loans table is missing or doesn't exist
    }

    // Apply Schema Migrations for Venke Assist Wellness Module
    try {
      if (isPg && pgPool) {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS wellness_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            age INTEGER DEFAULT 30,
            sex VARCHAR(20) DEFAULT 'Male',
            height_cm REAL DEFAULT 170,
            weight_kg REAL DEFAULT 70,
            activity_level VARCHAR(50) DEFAULT 'Moderately Active',
            goal VARCHAR(50) DEFAULT 'Maintain Weight',
            daily_calorie_target INTEGER DEFAULT 2000,
            daily_water_target_ml INTEGER DEFAULT 2500,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS wellness_meals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            meal_type VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            time VARCHAR(20),
            total_calories REAL DEFAULT 0,
            protein_g REAL DEFAULT 0,
            carbs_g REAL DEFAULT 0,
            fat_g REAL DEFAULT 0,
            notes TEXT,
            ai_estimated INTEGER DEFAULT 0,
            user_confirmed INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS wellness_meal_items (
            id SERIAL PRIMARY KEY,
            meal_id INTEGER NOT NULL REFERENCES wellness_meals(id) ON DELETE CASCADE,
            food_name VARCHAR(255) NOT NULL,
            quantity REAL DEFAULT 1,
            unit VARCHAR(50) DEFAULT 'serving',
            calories REAL DEFAULT 0,
            protein_g REAL DEFAULT 0,
            carbs_g REAL DEFAULT 0,
            fat_g REAL DEFAULT 0,
            confidence VARCHAR(20) DEFAULT 'High',
            ai_estimated INTEGER DEFAULT 0
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS wellness_exercise (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_type VARCHAR(100) NOT NULL,
            date DATE NOT NULL,
            start_time VARCHAR(20),
            duration_mins INTEGER NOT NULL,
            intensity VARCHAR(50) DEFAULT 'Moderate',
            calories_burned REAL DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS wellness_water_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            amount_ml INTEGER NOT NULL,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await execute(`
          CREATE TABLE IF NOT EXISTS wellness_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            age INTEGER DEFAULT 30,
            sex TEXT DEFAULT 'Male',
            height_cm REAL DEFAULT 170,
            weight_kg REAL DEFAULT 70,
            activity_level TEXT DEFAULT 'Moderately Active',
            goal TEXT DEFAULT 'Maintain Weight',
            daily_calorie_target INTEGER DEFAULT 2000,
            daily_water_target_ml INTEGER DEFAULT 2500,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS wellness_meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            meal_type TEXT NOT NULL,
            date DATE NOT NULL,
            time TEXT,
            total_calories REAL DEFAULT 0,
            protein_g REAL DEFAULT 0,
            carbs_g REAL DEFAULT 0,
            fat_g REAL DEFAULT 0,
            notes TEXT,
            ai_estimated INTEGER DEFAULT 0,
            user_confirmed INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS wellness_meal_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meal_id INTEGER NOT NULL,
            food_name TEXT NOT NULL,
            quantity REAL DEFAULT 1,
            unit TEXT DEFAULT 'serving',
            calories REAL DEFAULT 0,
            protein_g REAL DEFAULT 0,
            carbs_g REAL DEFAULT 0,
            fat_g REAL DEFAULT 0,
            confidence TEXT DEFAULT 'High',
            ai_estimated INTEGER DEFAULT 0,
            FOREIGN KEY(meal_id) REFERENCES wellness_meals(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS wellness_exercise (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            date DATE NOT NULL,
            start_time TEXT,
            duration_mins INTEGER NOT NULL,
            intensity TEXT DEFAULT 'Moderate',
            calories_burned REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS wellness_water_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            amount_ml INTEGER NOT NULL,
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
      }
      console.log('Wellness database tables verified/created.');
    } catch (wErr) {
      console.error('Migration failed for wellness tables:', wErr);
    }

    // Initialize Recurring Commitments & Automation Audit tables
    try {
      if (isPg) {
        await execute(`
          CREATE TABLE IF NOT EXISTS recurring_commitments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL DEFAULT 1,
            module_type VARCHAR(20) NOT NULL,
            entity_id INTEGER NOT NULL,
            enabled INTEGER DEFAULT 0,
            auto_create INTEGER DEFAULT 1,
            auto_mark_paid INTEGER DEFAULT 0,
            telegram_confirm INTEGER DEFAULT 1,
            telegram_reminder INTEGER DEFAULT 1,
            payment_day INTEGER DEFAULT 1,
            reminder_days_before INTEGER DEFAULT 3,
            frequency VARCHAR(20) DEFAULT 'monthly',
            last_run_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(module_type, entity_id)
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS recurring_automation_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL DEFAULT 1,
            module_type VARCHAR(20) NOT NULL,
            entity_id INTEGER NOT NULL,
            action VARCHAR(50) NOT NULL,
            amount NUMERIC DEFAULT 0,
            period_month INTEGER NOT NULL,
            period_year INTEGER NOT NULL,
            telegram_sent INTEGER DEFAULT 0,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await execute(`
          CREATE TABLE IF NOT EXISTS recurring_commitments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            module_type TEXT CHECK(module_type IN ('chit', 'gold', 'lic')) NOT NULL,
            entity_id INTEGER NOT NULL,
            enabled INTEGER DEFAULT 0,
            auto_create INTEGER DEFAULT 1,
            auto_mark_paid INTEGER DEFAULT 0,
            telegram_confirm INTEGER DEFAULT 1,
            telegram_reminder INTEGER DEFAULT 1,
            payment_day INTEGER DEFAULT 1,
            reminder_days_before INTEGER DEFAULT 3,
            frequency TEXT DEFAULT 'monthly',
            last_run_date DATE NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(module_type, entity_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await execute(`
          CREATE TABLE IF NOT EXISTS recurring_automation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            module_type TEXT CHECK(module_type IN ('chit', 'gold', 'lic')) NOT NULL,
            entity_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            amount REAL DEFAULT 0,
            period_month INTEGER NOT NULL,
            period_year INTEGER NOT NULL,
            telegram_sent INTEGER DEFAULT 0,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
      }
      // Initialize Contract-Driven LIC Schedule Table
      try {
        if (isPg) {
          await execute(`
            CREATE TABLE IF NOT EXISTS lic_premium_schedule (
              id SERIAL PRIMARY KEY,
              policy_id INTEGER NOT NULL REFERENCES lic_policies(id) ON DELETE CASCADE,
              installment_number INTEGER NOT NULL,
              due_date DATE NOT NULL,
              month INTEGER NOT NULL,
              year INTEGER NOT NULL,
              premium_amount NUMERIC NOT NULL,
              status VARCHAR(20) DEFAULT 'Pending',
              paid_date DATE NULL,
              payment_source VARCHAR(30) NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(policy_id, installment_number)
            )
          `);
          await execute(`ALTER TABLE lic_policies ADD COLUMN IF NOT EXISTS schedule_generated_at TIMESTAMP NULL`);
          await execute(`ALTER TABLE lic_policies ADD COLUMN IF NOT EXISTS last_automation_run_month INTEGER NULL`);
          await execute(`ALTER TABLE lic_policies ADD COLUMN IF NOT EXISTS last_automation_run_year INTEGER NULL`);
        } else {
          await execute(`
            CREATE TABLE IF NOT EXISTS lic_premium_schedule (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              policy_id INTEGER NOT NULL,
              installment_number INTEGER NOT NULL,
              due_date DATE NOT NULL,
              month INTEGER NOT NULL,
              year INTEGER NOT NULL,
              premium_amount REAL NOT NULL,
              status TEXT DEFAULT 'Pending',
              paid_date DATE NULL,
              payment_source TEXT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(policy_id, installment_number),
              FOREIGN KEY(policy_id) REFERENCES lic_policies(id) ON DELETE CASCADE
            )
          `);
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN schedule_generated_at TEXT NULL`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_automation_run_month INTEGER NULL`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_automation_run_year INTEGER NULL`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN total_paid REAL DEFAULT 0`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_automation_run_at TEXT NULL`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_processed_installment INTEGER NULL`); } catch (_) {}
          try { await execute(`ALTER TABLE lic_policies ADD COLUMN last_processed_due_date TEXT NULL`); } catch (_) {}
        }

        // Add LIC Automation Execution Audit Ledger Table
        if (isPg) {
          await execute(`
            CREATE TABLE IF NOT EXISTS lic_automation_execution (
              execution_id SERIAL PRIMARY KEY,
              execution_month INTEGER NOT NULL,
              execution_year INTEGER NOT NULL,
              started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              completed_at TIMESTAMP NULL,
              policies_processed INTEGER DEFAULT 0,
              policies_updated INTEGER DEFAULT 0,
              telegram_sent INTEGER DEFAULT 0,
              telegram_failed INTEGER DEFAULT 0,
              status VARCHAR(20) DEFAULT 'Running'
            )
          `);
        } else {
          await execute(`
            CREATE TABLE IF NOT EXISTS lic_automation_execution (
              execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
              execution_month INTEGER NOT NULL,
              execution_year INTEGER NOT NULL,
              started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              completed_at DATETIME NULL,
              policies_processed INTEGER DEFAULT 0,
              policies_updated INTEGER DEFAULT 0,
              telegram_sent INTEGER DEFAULT 0,
              telegram_failed INTEGER DEFAULT 0,
              status TEXT DEFAULT 'Running'
            )
          `);
        }
        console.log('Contract-Driven LIC Schedule & Audit Ledger tables verified/created.');
      } catch (licSchErr) {
        console.error('Migration failed for lic_premium_schedule table:', licSchErr);
      }

      console.log('Recurring commitment automation database tables verified/created.');
    } catch (rErr) {
      console.error('Migration failed for recurring commitment automation tables:', rErr);
    }

  } catch (error) {
    console.error('Failed to initialize database schema', error);
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (isPg && pgPool) {
    await pgPool.end();
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.close((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export const reopenDatabase = async (): Promise<void> => {
  if (isPg) return;
  try {
    const sqlite3 = require('sqlite3').verbose();
    return new Promise((resolve) => {
      sqliteDb = new sqlite3.Database(dbPath, (err: any) => {
        if (err) console.error('Error reopening SQLite:', err.message);
        resolve();
      });
    });
  } catch (_) {}
};
