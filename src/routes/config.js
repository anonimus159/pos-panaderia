import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rows = await prisma.config.findMany();
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    res.json({ success: true, config });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.put('/', authenticate, async (req, res) => {
  try {
    const updates = req.body;
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.config.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
      )
    );
    audit(req.user?.username || 'admin', 'CONFIG', 'Configuración actualizada');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('config_updated', { updates, user: req.user?.username });
    }
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
