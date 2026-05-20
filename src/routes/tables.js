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

    // Auto-corregir mesas atascadas: OCUPADA sin órdenes activas con ítems
    const fixes = tables
      .filter(t => t.status === 'OCUPADA' && !t.orders.some(o => o.items.length > 0))
      .map(t => prisma.table.update({ where: { id: t.id }, data: { status: 'LIBRE' } }));
    if (fixes.length > 0) {
      await Promise.all(fixes);
      fixes.forEach((_, i) => { tables.find(t => t.status === 'OCUPADA' && !t.orders.some(o => o.items.length > 0) && (t.status = 'LIBRE')); });
    }

    res.json({ success: true, tables });
  } catch (e) { res.status(500).json({ success: false }); }
});


router.get('/:id', authenticate, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const table = await prisma.table.findUnique({
      where: { id: tableId },
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

    // Auto-corregir: si está OCUPADA pero no tiene ítems activos, liberarla
    const hasActiveItems = table.orders.some(o => o.items.length > 0);
    if (table.status === 'OCUPADA' && !hasActiveItems) {
      await prisma.table.update({ where: { id: tableId }, data: { status: 'LIBRE' } });
      table.status = 'LIBRE';
    }

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

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, capacity } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre de la mesa es requerido.' });
    }

    // Validar si el nombre ya existe
    const existingTable = await prisma.table.findUnique({
      where: { name }
    });
    if (existingTable) {
      return res.status(400).json({ success: false, message: 'Ya existe una mesa con este nombre.' });
    }

    const table = await prisma.table.create({
      data: {
        name,
        capacity: parseInt(capacity) || 4,
        status: 'LIBRE'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('table_updated', table);
      io.emit('tableUpdated', table);
    }

    res.json({ success: true, table });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Error interno al crear la mesa.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const table = await prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('table_updated', table);
      io.emit('tableUpdated', table);
    }
    res.json({ success: true, table });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);

    // 1. Check if the table has active orders (PENDING, PREPARING, READY)
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId,
        status: { in: ['PENDING', 'PREPARING', 'READY'] }
      }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar la mesa porque tiene órdenes activas.' 
      });
    }

    // 2. Set tableId to null for all orders (historical/completed) to avoid foreign key violations
    await prisma.order.updateMany({
      where: { tableId },
      data: { tableId: null }
    });

    // 3. Set tableId to null for all reservaciones
    await prisma.reservacion.updateMany({
      where: { tableId },
      data: { tableId: null }
    });

    // 4. Delete the table
    await prisma.table.delete({
      where: { id: tableId }
    });

    // 5. Emit socket events to notify the clients
    const io = req.app.get('io');
    if (io) {
      io.emit('table_deleted', { id: tableId });
      io.emit('tableUpdated');
    }

    res.json({ success: true, message: 'Mesa eliminada con éxito.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Error al eliminar la mesa.' });
  }
});

export default router;
