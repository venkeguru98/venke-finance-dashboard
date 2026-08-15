import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from multiple candidate paths
const candidateEnvPaths = [
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const p of candidateEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import { initializeDatabase } from '../database';
import { EnterpriseRecoveryService } from '../services/EnterpriseRecoveryService';

async function main() {
  console.log('--------------------------------------------------');
  console.log(`[Standalone CLI Backup] Invoked at ${new Date().toISOString()}`);
  console.log('--------------------------------------------------');

  try {
    // 1. Initialize Database schema & tables
    await initializeDatabase();

    // 2. Ensure directory structure exists
    EnterpriseRecoveryService.ensureDirectories();

    // 3. Perform 30-day multi-day catch-up backfill
    await EnterpriseRecoveryService.checkAndExecuteCatchup();

    // 3. Execute Daily Immutable Recovery Snapshot
    const result = await EnterpriseRecoveryService.createDailyImmutableSnapshot('automatic');

    if (result.success) {
      console.log(`[Standalone CLI Backup] ✅ SUCCESS: Backup completed cleanly at ${result.folderPath}`);
      console.log(`[Standalone CLI Backup] Certificate: ${result.metadata?.sha256_checksum?.slice(0, 12)}...`);
      process.exit(0);
    } else {
      console.error(`[Standalone CLI Backup] ❌ FAILURE: ${result.message}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[Standalone CLI Backup] ❌ FATAL ERROR: ${err.message}`);
    process.exit(1);
  }
}

main();
