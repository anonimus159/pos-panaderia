import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      include: { 
        orders: { 
          where: { status: { in: ['PENDING', 'PREPARING', 'READY'] } },
          include: { items: true }
        } 
      }
    });
    res.json({ success: true, tables });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        orders: { 
          where: { status: { in: ['PENDING', 'PREPARING', 'READY'] } },
          include: { 
            items: { 
              include: { product: true } 
            } 
          }
        } 
      }
    });
    if (!table) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    res.json({ success: true, table });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const { 
      method, totalNew, tip, discount, discountType, discountAuth, 
      payments, autoFree, items 
    } = req.body;

    // 1. Si hay items nuevos, crear una orden completada para ellos
    let newOrderId = null;
    if (items && items.length > 0) {
      const newOrder = await prisma.order.create({
        data: {
          tableId,
          type: 'DINE_IN',
          status: 'COMPLETED',
          total: parseFloat(totalNew),
          items: {
            create: items.map(i => ({
              productId: i.productId,
              quantity: parseFloat(i.quantity),
              price: parseFloat(i.price),
              subtotal: parseFloat(i.subtotal),
              notes: i.notes,
              status: 'READY'
            }))
          }
        }
      });
      newOrderId = newOrder.id;
    }

    // 2. Buscar todas las órdenes activas de la mesa
    const activeOrders = await prisma.order.findMany({
      where: { 
        tableId, 
        status: { in: ['PENDING', 'PREPARING', 'READY'] } 
      }
    });

    // 3. Marcar órdenes como completadas
    await prisma.order.updateMany({
      where: { id: { in: activeOrders.map(o => o.id) } },
      data: { status: 'COMPLETED' }
    });

    // 4. Crear registro(s) de venta (Sale)
    if (payments && payments.length > 0) {
      for (const p of payments) {
        await prisma.sale.create({
          data: {
            orderId: activeOrders[0]?.id || newOrderId,
            amount: parseFloat(p.amount),
            tip: parseFloat(p.tip || 0),
            method: p.method,
          }
        });
      }
    } else {
      const currentOrdersTotal = activeOrders.reduce((sum, o) => sum + o.total, 0);
      await prisma.sale.create({
        data: {
          orderId: activeOrders[0]?.id || newOrderId,
          amount: currentOrdersTotal + (parseFloat(totalNew) || 0) - (parseFloat(discount) || 0),
          tip: parseFloat(tip || 0),
          method: method || 'CASH',
        }
      });
    }

    // 5. Liberar mesa
    // Obtenemos la config para estar seguros
    const autoFreeConfig = await prisma.config.findUnique({ where: { key: 'ops.autoFreeTable' } });
    const shouldFree = autoFree === true || autoFree === 'true' || autoFreeConfig?.value === 'true';

    if (shouldFree) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'LIBRE' }
      });
    }

    // 6. Notificar cambios
    const io = req.app.get('io');
    if (io) {
      io.emit('table_updated', { id: tableId });
      io.emit('order_updated', { tableId });
    }

    res.json({ success: true });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const table = await prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    req.app.get('io')?.emit('table_updated', table);
    res.json({ success: true, table });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
