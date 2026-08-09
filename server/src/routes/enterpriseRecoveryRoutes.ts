import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { EnterpriseRecoveryService } from '../services/EnterpriseRecoveryService';

const router = Router();

// GET /api/enterprise-recovery/status
router.get('/status', async (_req, res) => {
  try {
    const status = await EnterpriseRecoveryService.getSystemRecoveryStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching system recovery status' });
  }
});

// GET /api/enterprise-recovery/list
router.get('/list', (_req, res) => {
  try {
    const backups = EnterpriseRecoveryService.listAllBackups();
    res.json({ backups, count: backups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error listing recovery backups' });
  }
});

// POST /api/enterprise-recovery/create-daily
router.post('/create-daily', async (_req, res) => {
  try {
    const result = await EnterpriseRecoveryService.createDailyImmutableSnapshot('manual');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating daily immutable snapshot' });
  }
});

// POST /api/enterprise-recovery/create-migration-package
router.post('/create-migration-package', async (_req, res) => {
  try {
    const result = await EnterpriseRecoveryService.createProductionMigrationPackage();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating production migration package' });
  }
});

// POST /api/enterprise-recovery/simulate-restore
router.post('/simulate-restore', async (_req, res) => {
  try {
    const result = await EnterpriseRecoveryService.runRecoveryReadinessSimulation();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error running restore simulation' });
  }
});

// POST /api/enterprise-recovery/compare
router.post('/compare', async (req, res) => {
  try {
    const { snapshotPath } = req.body || {};
    if (!snapshotPath) {
      return res.status(400).json({ error: 'snapshotPath is required' });
    }
    const result = await EnterpriseRecoveryService.compareSnapshotWithLive(snapshotPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error comparing snapshot' });
  }
});

// POST /api/enterprise-recovery/restore
router.post('/restore', async (req, res) => {
  try {
    const { snapshotPath } = req.body || {};
    if (!snapshotPath) {
      return res.status(400).json({ error: 'snapshotPath is required' });
    }
    const result = await EnterpriseRecoveryService.restoreFromSnapshot(snapshotPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error restoring from snapshot' });
  }
});

// PUT /api/enterprise-recovery/retention
router.put('/retention', (req, res) => {
  try {
    const { days } = req.body || {};
    const retentionDays = Number(days);
    if (isNaN(retentionDays)) {
      return res.status(400).json({ error: 'Valid retention days required' });
    }
    const result = EnterpriseRecoveryService.setRetentionDays(retentionDays);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating retention policy' });
  }
});

// GET /api/enterprise-recovery/export
router.get('/export', (req, res) => {
  try {
    const { filePath } = req.query || {};
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'filePath parameter required' });
    }

    const resolvedPath = path.resolve(filePath);
    const backupRoot = path.resolve(__dirname, '../../../backups');

    if (!resolvedPath.startsWith(backupRoot) || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Requested backup package file not found' });
    }

    res.download(resolvedPath, path.basename(resolvedPath));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error exporting backup file' });
  }
});

export default router;
