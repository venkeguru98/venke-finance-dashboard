import fs from 'fs';
import path from 'path';
import { query, get, execute } from '../database';

const BACKUP_DIR = path.resolve(__dirname, '../../../backups');

export class LocalDatabaseBackupService {
  private static backupIntervalTimer: NodeJS.Timeout | null = null;

  /**
   * Ensures the backups directory exists
   */
  private static ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Creates a full JSON snapshot of all database tables
   */
  static async createLocalBackup(reason: string = 'SCHEDULED'): Promise<{ success: boolean; filePath: string; totalRecords: number }> {
    try {
      LocalDatabaseBackupService.ensureBackupDir();

      const targetTables = [
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

      const snapshotData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const table of targetTables) {
        try {
          const rows = await query(`SELECT * FROM ${table}`);
          snapshotData[table] = rows || [];
          totalRecords += (rows || []).length;
        } catch (_) {
          snapshotData[table] = [];
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-snapshot-${timestamp}.json`;
      const filePath = path.join(BACKUP_DIR, filename);
      const latestPath = path.join(BACKUP_DIR, 'latest_local_snapshot.json');

      const payload = {
        metadata: {
          timestamp: new Date().toISOString(),
          reason,
          totalTables: targetTables.length,
          totalRecords,
          version: '1.0'
        },
        data: snapshotData
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      fs.writeFileSync(filePath, jsonStr, 'utf-8');
      fs.writeFileSync(latestPath, jsonStr, 'utf-8');

      console.log(`[BackupService] Local database snapshot created: ${filename} (${totalRecords} records across ${targetTables.length} tables)`);

      // Clean up old backups keeping the latest 30 files
      LocalDatabaseBackupService.cleanupOldBackups(30);

      return { success: true, filePath, totalRecords };
    } catch (err: any) {
      console.error('[BackupService] Failed to create local database snapshot:', err.message);
      return { success: false, filePath: '', totalRecords: 0 };
    }
  }

  /**
   * Cleans up old backup files, keeping only the most recent maxFiles
   */
  private static cleanupOldBackups(maxFiles: number = 30) {
    try {
      LocalDatabaseBackupService.ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup-snapshot-') && f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
          fs.unlinkSync(path.join(BACKUP_DIR, file.name));
        }
      }
    } catch (_) {}
  }

  /**
   * Restores database data from a JSON snapshot file
   */
  static async restoreFromSnapshot(snapshotFilePath?: string): Promise<{ success: boolean; message: string; restoredCount: number }> {
    try {
      LocalDatabaseBackupService.ensureBackupDir();
      const targetPath = snapshotFilePath || path.join(BACKUP_DIR, 'latest_local_snapshot.json');

      if (!fs.existsSync(targetPath)) {
        return { success: false, message: `Backup file not found at ${targetPath}`, restoredCount: 0 };
      }

      const content = fs.readFileSync(targetPath, 'utf-8');
      const snapshot = JSON.parse(content);
      const data = snapshot.data || {};

      let restoredCount = 0;

      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        for (const row of rows) {
          try {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map(() => '?').join(', ');
            const cols = keys.join(', ');

            await execute(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`, values);
            restoredCount++;
          } catch (_) {
            // Ignore duplicate/conflict errors during restore
          }
        }
      }

      console.log(`[BackupService] Successfully restored ${restoredCount} records from ${path.basename(targetPath)}`);
      return { success: true, message: `Restored ${restoredCount} records from snapshot`, restoredCount };
    } catch (err: any) {
      console.error('[BackupService] Restore failed:', err.message);
      return { success: false, message: err.message, restoredCount: 0 };
    }
  }

  /**
   * Lists all local database backup files
   */
  static listLocalBackups() {
    LocalDatabaseBackupService.ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json') || f.endsWith('.sqlite'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          path: path.join(BACKUP_DIR, f),
          sizeBytes: stat.size,
          sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
          created_at: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return files;
  }

  /**
   * Starts the 6-hour periodic backup daemon
   */
  static startBackupDaemon(intervalHours: number = 6) {
    if (LocalDatabaseBackupService.backupIntervalTimer) return;

    // Create an immediate startup backup
    LocalDatabaseBackupService.createLocalBackup('STARTUP');

    // Schedule periodic backups
    const intervalMs = intervalHours * 60 * 60 * 1000;
    LocalDatabaseBackupService.backupIntervalTimer = setInterval(() => {
      LocalDatabaseBackupService.createLocalBackup('PERIODIC_DAEMON');
    }, intervalMs);

    console.log(`[BackupService] Local Database Backup Daemon started (Runs every ${intervalHours} hours).`);
  }
}
