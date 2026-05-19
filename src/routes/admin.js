import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import path from 'path';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/audit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.auditLog.count()
    ]);
    res.json({ success: true, logs, total });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/backup', authenticate, requireAdmin, async (req, res) => {
  try {
    const dbPath = path.resolve('./prisma/dev.db');
    audit(req.user.username, 'BACKUP', 'Descarga de DB');
    res.download(dbPath, `backup-${new Date().toISOString().split('T')[0]}.db`);
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/metas', authenticate, async (req, res) => {
  try {
    const metas = await prisma.metaVentas.findMany({ orderBy: { anio: 'desc' } });
    res.json({ success: true, metas });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
