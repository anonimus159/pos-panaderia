import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/resumen', authenticate, async (req, res) => {
  try {
    const { fecha } = req.query;
    let startOfDay, endOfDay;
    if (fecha) { startOfDay = new Date(fecha + 'T00:00:00'); endOfDay = new Date(fecha + 'T23:59:59'); }
    else { startOfDay = new Date(); startOfDay.setHours(0,0,0,0); endOfDay = new Date(); endOfDay.setHours(23,59,59,999); }

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { order: true }
    });

    const stats = sales.reduce((acc, s) => {
      acc.total += s.amount;
      if (s.method === 'CASH') acc.efectivo += s.amount;
      else if (s.method === 'CARD') acc.tarjeta += s.amount;
      else acc.transferencia += s.amount;
      return acc;
    }, { total: 0, efectivo: 0, tarjeta: 0, transferencia: 0 });

    res.json({
      success: true,
      resumen: {
        fecha: startOfDay.toISOString().split('T')[0],
        ventasEfectivo: stats.efectivo,
        ventasTarjeta: stats.tarjeta,
        ventasTransfer: stats.transferencia,
        totalVentas: stats.total,
        numTransacciones: sales.length,
        detalle: sales
      }
    });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/cierre', authenticate, async (req, res) => {
  try {
    const cierre = await prisma.cierreCaja.create({
      data: { ...req.body, creadoPor: req.user.username }
    });
    res.json({ success: true, cierre });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
