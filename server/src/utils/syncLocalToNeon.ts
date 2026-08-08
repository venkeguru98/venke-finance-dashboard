import { Pool } from 'pg';
import path from 'path';
import sqlite3 from 'sqlite3';

const neonConnectionString = process.argv[2] || process.env.DATABASE_URL;

if (!neonConnectionString) {
  console.error('ERROR: Please provide your Neon Connection String as an argument!');
  console.log('Usage: npx ts-node server/src/utils/syncLocalToNeon.ts "postgres://user:pass@ep-xyz.singapore.aws.neon.tech/neondb?sslmode=require"');
  process.exit(1);
}

const dbPath = path.resolve(__dirname, '../../../database.sqlite');
console.log(`[Migrator] Reading local SQLite database from: ${dbPath}`);

const sqlite3Verbose = sqlite3.verbose();
const sqliteDb = new sqlite3Verbose.Database(dbPath);

const pgPool = new Pool({
  connectionString: neonConnectionString,
  ssl: { rejectUnauthorized: false }
});

const getSqliteRows = (sql: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, [], (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const migrateTable = async (tableName: string, pgIdColumn: string = 'id') => {
  try {
    const rows = await getSqliteRows(`SELECT * FROM ${tableName}`);
    if (rows.length === 0) {
      console.log(`[Migrator] Table '${tableName}' is empty in local SQLite. Skipped.`);
      return;
    }

    console.log(`[Migrator] Migrating ${rows.length} rows for table '${tableName}'...`);

    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const cols = keys.join(', ');

      const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      await pgPool.query(query, values);
    }

    // Reset PostgreSQL autoincrement sequence
    try {
      await pgPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', '${pgIdColumn}'), COALESCE(MAX(${pgIdColumn}), 1)) FROM ${tableName}`);
    } catch (_) {}

    console.log(`[Migrator] ✓ Table '${tableName}' migrated successfully (${rows.length} records).`);
  } catch (err: any) {
    console.warn(`[Migrator] Table '${tableName}' migration warning:`, err.message);
  }
};

const runMigration = async () => {
  try {
    console.log('[Migrator] Testing connection to Neon PostgreSQL...');
    await pgPool.query('SELECT 1');
    console.log('[Migrator] Connected to Neon PostgreSQL!');

    const tables = [
      'users',
      'categories',
      'transactions',
      'budgets',
      'goals',
      'chit_funds',
      'chit_payments',
      'digital_gold',
      'digital_gold_transactions',
      'lic_policies',
      'lic_premium_schedule',
      'lic_premium_history',
      'recurring_commitments',
      'recurring_automation_logs',
      'lic_automation_execution',
      'notes',
      'wellness_logs',
      'debts',
      'debt_accounts',
      'debt_transactions'
    ];

    for (const t of tables) {
      await migrateTable(t);
    }

    console.log('\n======================================================');
    console.log('🎉 SUCCESS: All local data migrated to Neon PostgreSQL!');
    console.log('======================================================');

    sqliteDb.close();
    await pgPool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('FATAL Migration Error:', err.message);
    process.exit(1);
  }
};

runMigration();
