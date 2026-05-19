import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [turnos, lastClosed] = await Promise.all([
      prisma.turno.findMany({ orderBy: { aperturaAt: 'desc' }, take: 100 }),
      prisma.turno.findFirst({ where: { estado: 'CERRADO', NOT: { notasTraspaso: null } }, orderBy: { cierreAt: 'desc' } })
    ]);
    res.json({ success: true, turnos, lastClosedNotes: lastClosed?.notasTraspaso || null });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/activo', authenticate, async (req, res) => {
  try {
    const turno = await prisma.turno.findFirst({ where: { estado: 'ABIERTO' }, orderBy: { aperturaAt: 'desc' } });
    res.json({ success: true, turno });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { nombre, cajero, fondoInicial } = req.body;
    const turno = await prisma.turno.create({
      data: { nombre, cajero, fondoInicial: parseFloat(fondoInicial || 0) }
    });
    audit(req.user.username, 'TURNO_ABIERTO', `${nombre} — Cajero: ${cajero}`);
    res.json({ success: true, turno });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/:id/cerrar', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fondoFinal, observaciones, notasTraspaso } = req.body;
    const ventas = await prisma.sale.findMany({ where: { turnoId: parseInt(id) } });
    
    const stats = ventas.reduce((acc, v) => {
      acc.total += v.amount;
      if (v.method === 'CASH') acc.efectivo += v.amount;
      else if (v.method === 'CARD') acc.tarjeta += v.amount;
      else acc.transferencia += v.amount;
      return acc;
    }, { total: 0, efectivo: 0, tarjeta: 0, transferencia: 0 });

    const turno = await prisma.turno.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'CERRADO', cierreAt: new Date(),
        cerradoPor: req.user.username,
        fondoFinal: parseFloat(fondoFinal || 0),
        totalEfectivo: stats.efectivo, totalTarjeta: stats.tarjeta, totalTransfer: stats.transferencia,
        totalVentas: stats.total, numVentas: ventas.length,
        observaciones, notasTraspaso
      }
    });
    audit(req.user.username, 'TURNO_CERRADO', `${turno.nombre} — Total: ${stats.total}`);
    res.json({ success: true, turno });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
