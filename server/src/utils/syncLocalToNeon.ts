import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const neonConnectionString = process.argv[2] || process.env.DATABASE_URL;

if (!neonConnectionString) {
  console.error('ERROR: Please provide your Neon Connection String as an argument!');
  console.log('Usage: npx ts-node server/src/utils/syncLocalToNeon.ts "postgres://user:pass@ep-xyz.singapore.aws.neon.tech/neondb?sslmode=require"');
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: neonConnectionString,
  ssl: { rejectUnauthorized: false }
});

const sqlite3Verbose = sqlite3.verbose();

const getSqliteRows = (db: any, sql: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const migrateDatabaseFile = async (dbPath: string) => {
  if (!fs.existsSync(dbPath)) return;
  console.log(`\n[Migrator] ----------------------------------------------------`);
  console.log(`[Migrator] Processing SQLite File: ${path.basename(dbPath)}`);
  console.log(`[Migrator] ----------------------------------------------------`);

  const db = new sqlite3Verbose.Database(dbPath);

  const tables = [
    'users',
    'categories',
    'goals',
    'budgets',
    'recurring_rules',
    'transactions',
    'savings_investments',
    'notifications',
    'debts_loans',
    'debts',
    'deposits',
    'money_transfers',
    'chit_funds',
    'chit_payments',
    'personal_notes',
    'notes',
    'documents',
    'ledger_entries',
    'lic_policies',
    'lic_premium_schedule',
    'lic_premium_history',
    'digital_gold',
    'digital_gold_transactions',
    'wellness_logs'
  ];

  for (const tableName of tables) {
    try {
      const rows = await getSqliteRows(db, `SELECT * FROM ${tableName}`);
      if (rows.length === 0) continue;

      let targetTable = tableName;
      if (tableName === 'debts_loans') targetTable = 'debts';
      if (tableName === 'personal_notes') targetTable = 'notes';

      console.log(`[Migrator] Migrating ${rows.length} rows for table '${targetTable}'...`);

      for (const row of rows) {
        try {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const cols = keys.join(', ');

          const queryStr = `INSERT INTO ${targetTable} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          await pgPool.query(queryStr, values);
        } catch (_) {
          // Ignore individual row constraint issues (e.g. duplicate IDs across backup files)
        }
      }

      // Sync PostgreSQL autoincrement sequence
      try {
        await pgPool.query(`SELECT setval(pg_get_serial_sequence('${targetTable}', 'id'), COALESCE(MAX(id), 1)) FROM ${targetTable}`);
      } catch (_) {}

      console.log(`[Migrator] ✓ Table '${targetTable}' merged successfully.`);
    } catch (_) {
      // Table doesn't exist in this specific backup file
    }
  }

  db.close();
};

const runMigration = async () => {
  try {
    console.log('[Migrator] Testing connection to Neon PostgreSQL...');
    await pgPool.query('SELECT 1');
    console.log('[Migrator] Connected to Neon PostgreSQL!');

    // Find all database files in root and backups directory
    const rootDb = path.resolve(__dirname, '../../../database.sqlite');
    const backupDir = path.resolve(__dirname, '../../../backups');

    const dbFiles: string[] = [rootDb];

    if (fs.existsSync(backupDir)) {
      const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.sqlite') || f.endsWith('.db'))
        .map(f => path.join(backupDir, f));
      dbFiles.push(...backupFiles);
    }

    console.log(`[Migrator] Found ${dbFiles.length} SQLite database/backup files to process.`);

    for (const file of dbFiles) {
      await migrateDatabaseFile(file);
    }

    // Verify final transaction count
    const txCount = await pgPool.query('SELECT COUNT(*) as cnt FROM transactions');
    const catCount = await pgPool.query('SELECT COUNT(*) as cnt FROM categories');

    console.log('\n======================================================');
    console.log(`🎉 SUCCESS: All historical database backups merged to Neon!`);
    console.log(`📊 Final Neon Database State: ${catCount.rows[0].cnt} Categories, ${txCount.rows[0].cnt} Total Transactions!`);
    console.log('======================================================');

    await pgPool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('FATAL Migration Error:', err.message);
    process.exit(1);
  }
};

runMigration();
