import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { EnterpriseRecoveryService, getBackupRootDir } from '../services/EnterpriseRecoveryService';

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

// GET /api/enterprise-recovery/backup-status
router.get('/backup-status', async (_req, res) => {
  try {
    const status = await EnterpriseRecoveryService.getSystemRecoveryStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching backup status' });
  }
});

// POST /api/enterprise-recovery/trigger-backup
router.post('/trigger-backup', async (_req, res) => {
  try {
    const result = await EnterpriseRecoveryService.createDailyImmutableSnapshot('automatic');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error triggering backup' });
  }
});

// GET /api/enterprise-recovery/ledger
router.get('/ledger', async (_req, res) => {
  try {
    const entries = await EnterpriseRecoveryService.getLedgerEntries(50);
    res.json({ entries, count: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching backup ledger' });
  }
});

// GET /api/enterprise-recovery/health
router.get('/health', async (_req, res) => {
  try {
    const health = await EnterpriseRecoveryService.calculateBackupHealthScore();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error calculating health score' });
  }
});

// GET /api/enterprise-recovery/external-path
router.get('/external-path', (_req, res) => {
  try {
    const externalPath = EnterpriseRecoveryService.getExternalBackupDir();
    const exists = fs.existsSync(externalPath);
    res.json({ externalPath, verified: exists });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enterprise-recovery/external-path
router.post('/external-path', (req, res) => {
  try {
    const { customPath } = req.body || {};
    if (!customPath) return res.status(400).json({ error: 'customPath is required' });
    const result = EnterpriseRecoveryService.setExternalBackupDir(customPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enterprise-recovery/download-golden-bundle
router.get('/download-golden-bundle', (_req, res) => {
  try {
    const backupRoot = getBackupRootDir();
    const bundlePath = path.join(backupRoot, 'latest', 'latest_recovery_bundle.zip');

    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({ error: 'Golden recovery bundle not yet generated' });
    }

    res.download(bundlePath, 'latest_recovery_bundle.zip');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
