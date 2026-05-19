import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { fecha } = req.query;
    let where = {};
    if (fecha) {
      const start = new Date(fecha + 'T00:00:00');
      const end   = new Date(fecha + 'T23:59:59');
      where.fecha = { gte: start, lte: end };
    }
    const reservaciones = await prisma.reservacion.findMany({
      where,
      include: { table: { select: { name: true } } },
      orderBy: { hora: 'asc' }
    });
    res.json({ success: true, reservaciones });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const reservacion = await prisma.reservacion.create({
      data: { ...req.body, fecha: new Date(req.body.fecha), creadoPor: req.user.username }
    });
    res.json({ success: true, reservacion });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
