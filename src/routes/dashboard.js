import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const pendingOrders = await prisma.order.count({
      where: { status: { notIn: ['COMPLETED', 'SERVED', 'CANCELLED'] } }
    });

    const tables = await prisma.table.findMany();
    const occupiedTables = tables.filter(t => t.status === 'OCUPADA').length;

    const avgTicket = sales._count.id > 0 ? (sales._sum.amount || 0) / sales._count.id : 0;

    const lowStockItems = await prisma.ingredient.findMany({
      where: { stock: { lte: 10 } },
      orderBy: { stock: 'asc' },
      take: 5
    });

    res.json({ 
      success: true, 
      stats: {
        todaySales: sales._sum.amount || 0,
        todayTransactions: sales._count.id || 0,
        pendingOrders, occupiedTables, totalTables: tables.length,
        avgTicket, lowStockItems
      }
    });
  } catch (error) { res.status(500).json({ success: false }); }
});

router.get('/sales-week', authenticate, async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const result = await prisma.sale.aggregate({
        where: { createdAt: { gte: d, lte: end } },
        _sum: { amount: true }
      });
      days.push({
        day: d.toLocaleDateString('es', { weekday: 'short', day: '2-digit' }),
        ventas: result._sum.amount || 0
      });
    }
    res.json({ success: true, data: days });
  } catch (error) { res.status(500).json({ success: false }); }
});

router.get('/sales-by-hour', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay } }
    });
    const hours = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}:00`, ventas: 0 }));
    sales.forEach(s => {
      const h = new Date(s.createdAt).getHours();
      hours[h].ventas += s.amount;
    });
    res.json({ success: true, data: hours });
  } catch (error) { res.status(500).json({ success: false }); }
});

router.get('/top-products', authenticate, async (req, res) => {
  try {
    const top = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5
    });
    const products = await prisma.product.findMany({
      where: { id: { in: top.map(t => t.productId) } }
    });
    const data = top.map(t => {
      const p = products.find(prod => prod.id === t.productId);
      return {
        name: p?.name || 'Desconocido',
        cantidad: t._sum.quantity,
        ingresos: t._sum.subtotal
      };
    });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false }); }
});

router.get('/low-stock', authenticate, async (req, res) => {
  try {
    const items = await prisma.ingredient.findMany({
      where: { stock: { lte: prisma.ingredient.fields.minStock } },
      orderBy: { stock: 'asc' },
      take: 10
    });
    res.json({ success: true, data: items });
  } catch (error) { 
    // Fallback if field comparison fails in some prisma versions
    try {
      const all = await prisma.ingredient.findMany();
      const low = all.filter(i => i.stock <= i.minStock).slice(0, 10);
      res.json({ success: true, data: low });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }
});

export default router;
