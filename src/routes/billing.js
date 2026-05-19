import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.post('/generar', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { cliente: true, factura: true }
    });

    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    if (!order.cliente || !order.cliente.nit) return res.status(400).json({ success: false, message: 'El cliente no tiene NIT/Documento' });

    // Mock DIAN
    const mockNum  = `FE-${Math.floor(Math.random() * 10000)}`;
    const factura = await prisma.factura.create({
      data: {
        orderId: order.id,
        clienteId: order.clienteId,
        numeroFactura: mockNum,
        cufe: `CUFE-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        status: 'ACCEPTED'
      }
    });

    audit(req.user.username, 'FACTURACION_DIAN', `Factura #${mockNum} para Orden #${orderId}`);
    res.json({ success: true, factura });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
