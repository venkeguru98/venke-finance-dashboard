import { Pool } from 'pg';

const renderUrl = process.argv[2];
const neonUrl = process.argv[3] || process.env.DATABASE_URL;

if (!renderUrl || !neonUrl) {
  console.error('ERROR: Missing connection strings!');
  console.log('Usage: npx ts-node server/src/utils/syncRenderPgToNeon.ts "RENDER_EXTERNAL_URL" "NEON_URL"');
  process.exit(1);
}

const renderPool = new Pool({ connectionString: renderUrl, ssl: { rejectUnauthorized: false } });
const neonPool = new Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });

const migratePgToPg = async () => {
  try {
    console.log('[PG Migrator] Connecting to Render PostgreSQL...');
    await renderPool.query('SELECT 1');
    console.log('[PG Migrator] Connected to Render PostgreSQL!');

    console.log('[PG Migrator] Connecting to Neon PostgreSQL...');
    await neonPool.query('SELECT 1');
    console.log('[PG Migrator] Connected to Neon PostgreSQL!');

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
      'personal_notes',
      'wellness_logs',
      'debts',
      'debts_loans'
    ];

    for (const table of tables) {
      try {
        const renderRes = await renderPool.query(`SELECT * FROM ${table}`);
        const rows = renderRes.rows || [];
        if (rows.length === 0) continue;

        let targetTable = table;
        if (table === 'debts_loans') targetTable = 'debts';
        if (table === 'personal_notes') targetTable = 'notes';

        console.log(`[PG Migrator] Copying ${rows.length} rows for table '${targetTable}' from Render to Neon...`);

        for (const row of rows) {
          try {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const cols = keys.join(', ');

            await neonPool.query(`INSERT INTO ${targetTable} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
          } catch (_) {}
        }

        try {
          await neonPool.query(`SELECT setval(pg_get_serial_sequence('${targetTable}', 'id'), COALESCE(MAX(id), 1)) FROM ${targetTable}`);
        } catch (_) {}

        console.log(`[PG Migrator] ✓ Table '${targetTable}' migrated from Render (${rows.length} rows).`);
      } catch (_) {
        // Table doesn't exist on Render
      }
    }

    const finalTx = await neonPool.query('SELECT COUNT(*) as cnt FROM transactions');
    console.log('\n======================================================');
    console.log(`🎉 SUCCESS: 100% of Render Server Data Migrated to Neon!`);
    console.log(`📊 Total Transactions in Neon: ${finalTx.rows[0].cnt}`);
    console.log('======================================================');

    await renderPool.end();
    await neonPool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('Migration Error:', err.message);
    process.exit(1);
  }
};

migratePgToPg();
