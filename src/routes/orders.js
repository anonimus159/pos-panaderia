import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { decrementOrderStock, restoreItemStock } from '../utils/stock.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } }, table: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { type, tableId, items, total, tip, paymentMethod } = req.body;
    
    const order = await prisma.order.create({
      data: {
        type, 
        tableId: tableId ? parseInt(tableId) : null, 
        total: parseFloat(total),
        items: {
          create: items.map(i => ({
            productId: i.productId, 
            quantity: parseFloat(i.quantity),
            price: parseFloat(i.price), 
            subtotal: parseFloat(i.subtotal), 
            notes: i.notes
          }))
        }
      },
      include: { items: true }
    });

    // Actualizar estado de la mesa si aplica
    if (tableId) {
      try {
        await prisma.table.update({
          where: { id: parseInt(tableId) },
          data: { status: 'OCUPADA' }
        });
        req.app.get('io')?.emit('table_updated');
      } catch (tableErr) {
        console.error('Error actualizando estado de mesa:', tableErr);
      }
    }

    // Notificar a cocina y POS
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', order);
      // Descontar stock automáticamente
      decrementOrderStock(order.id, io);
      io.emit('product_updated');
    }

    res.json({ success: true, order });
  } catch (e) { 
    console.error('Error creando orden:', e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    req.app.get('io')?.emit('order_status_updated', order);
    res.json({ success: true, order });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.delete('/items/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.orderItem.findUnique({ 
      where: { id: parseInt(id) },
      include: { order: true }
    });
    
    if (!item) return res.status(404).json({ success: false, message: 'Ítem no encontrado' });

    // Restaurar stock antes de eliminar (necesitamos los datos del ítem)
    await restoreItemStock(parseInt(id), req.app.get('io'));

    // Actualizar el total de la orden
    const newTotal = Math.max(item.order.total - item.subtotal, 0);
    
    await prisma.$transaction([
      prisma.orderItem.delete({ where: { id: parseInt(id) } }),
      prisma.order.update({
        where: { id: item.orderId },
        data: { total: newTotal }
      })
    ]);

    // Auditoría
    audit(req.user.username, 'ORDEN_ITEM_ELIMINAR', `Eliminado ítem ID ${id} (${item.productId}) de la Orden #${item.orderId}. Total actualizado: ${newTotal}`);

    req.app.get('io')?.emit('orderUpdated', { tableId: item.order.tableId });
    res.json({ success: true });
  } catch (e) {
    console.error('Error al eliminar ítem:', e);
    res.status(500).json({ success: false, message: 'Error al eliminar el ítem' });
  }
});

export default router;
