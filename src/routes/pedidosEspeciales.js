import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const pedidos = await prisma.pedidoEspecial.findMany({
      include: { cliente: true },
      orderBy: { fechaEntrega: 'asc' }
    });
    res.json({ success: true, pedidos });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al obtener pedidos' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { clienteNombre, clienteTelefono, clienteId, descripcion, fechaEntrega, anticipo, total, notas } = req.body;
    
    // Si hay un anticipo, debemos registrar la venta en el turno actual
    let saleRecord = null;
    if (parseFloat(anticipo) > 0) {
      const turnoActivo = await prisma.turno.findFirst({ where: { estado: 'ABIERTO' } });
      if (!turnoActivo) {
        return res.status(400).json({ success: false, message: 'Se requiere un turno abierto para registrar el anticipo' });
      }

      // Crear un Order fantasma para asociar la venta
      const order = await prisma.order.create({
        data: {
          type: 'PEDIDO_ESPECIAL',
          status: 'PAID',
          total: parseFloat(anticipo),
          clienteId: clienteId || null
        }
      });

      saleRecord = await prisma.sale.create({
        data: {
          orderId: order.id,
          turnoId: turnoActivo.id,
          clienteId: clienteId || null,
          amount: parseFloat(anticipo),
          method: 'CASH' // Asumiremos efectivo por defecto, esto se puede mejorar en el frontend
        }
      });

      // Actualizar los totales del turno
      await prisma.turno.update({
        where: { id: turnoActivo.id },
        data: {
          totalEfectivo: { increment: parseFloat(anticipo) },
          totalVentas: { increment: parseFloat(anticipo) },
          numVentas: { increment: 1 }
        }
      });
    }

    const pedido = await prisma.pedidoEspecial.create({
      data: {
        clienteNombre,
        clienteTelefono,
        clienteId: clienteId || null,
        descripcion,
        fechaEntrega: new Date(fechaEntrega),
        anticipo: parseFloat(anticipo || 0),
        total: parseFloat(total || 0),
        notas,
        creadoPor: req.user.username
      }
    });
    
    // Emitir evento de impresión
    const io = req.app.get('io');
    if (io) {
      io.emit('new_pedido_especial', pedido);
      // Para imprimir
      io.emit('print_job', {
        printerName: null, // usa la default configurada en el cliente
        printData: Buffer.from(`PEDIDO ESPECIAL\n----------------\nCliente: ${clienteNombre}\nEntrega: ${new Date(fechaEntrega).toLocaleString()}\nDesc: ${descripcion}\nAnticipo: $${parseFloat(anticipo).toFixed(2)}\nTotal: $${parseFloat(total).toFixed(2)}\n\n`).toString('base64')
      });
    }

    audit(req.user.username, 'PEDIDO_ESPECIAL_CREAR', `Creado pedido para ${clienteNombre}`);
    res.json({ success: true, pedido });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Error al crear pedido' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notas } = req.body;
    const pedido = await prisma.pedidoEspecial.update({
      where: { id: parseInt(id) },
      data: { status, notas }
    });
    res.json({ success: true, pedido });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al actualizar pedido' });
  }
});

export default router;
