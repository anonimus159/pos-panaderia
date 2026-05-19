import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({ where: { activo: true }, orderBy: { totalGastado: 'desc' } });
    res.json({ success: true, clientes });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const cliente = await prisma.cliente.create({ data: req.body });
    res.json({ success: true, cliente });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/:id/historial', authenticate, async (req, res) => {
  try {
    const ventas = await prisma.sale.findMany({
      where: { clienteId: parseInt(req.params.id) },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, ventas });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
