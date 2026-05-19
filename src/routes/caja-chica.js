import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { fecha } = req.query;
    let startOfDay, endOfDay;
    if (fecha) { startOfDay = new Date(fecha + 'T00:00:00'); endOfDay = new Date(fecha + 'T23:59:59'); }
    else { startOfDay = new Date(); startOfDay.setHours(0,0,0,0); endOfDay = new Date(); endOfDay.setHours(23,59,59,999); }
    const gastos = await prisma.cajaChica.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'desc' }
    });
    const fondoCfg = await prisma.config.findUnique({ where: { key: 'cajachica.fondo' } });
    res.json({ success: true, gastos, fondoInicial: parseFloat(fondoCfg?.value || 0) });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { descripcion, categoria, monto, comprobante } = req.body;
    const gasto = await prisma.cajaChica.create({
      data: { descripcion, categoria: categoria || 'OTROS', monto: parseFloat(monto), comprobante: comprobante || null, creadoPor: req.user.username }
    });
    audit(req.user.username, 'CAJA_CHICA', `${categoria} — ${descripcion}: $${monto}`);
    res.json({ success: true, gasto });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
