import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const descuentos = await prisma.descuento.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, descuentos });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { nombre, tipo, valor, descripcion, requiereAuth, activo, desde, hasta } = req.body;
    const descuento = await prisma.descuento.create({
      data: {
        nombre, tipo, valor: parseFloat(valor),
        descripcion, requiereAuth, activo,
        desde: desde ? new Date(desde) : null,
        hasta: hasta ? new Date(hasta) : null
      }
    });
    res.json({ success: true, descuento });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
