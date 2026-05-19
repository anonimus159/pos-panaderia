import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/resumen', authenticate, requireAdmin, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const start = desde ? new Date(desde + 'T00:00:00') : new Date(new Date().setDate(new Date().getDate() - 30));
    const end   = hasta ? new Date(hasta + 'T23:59:59') : new Date();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { 
        order: { 
          include: { 
            items: { 
              include: { 
                product: { 
                  include: { category: true } 
                } 
              } 
            } 
          } 
        } 
      }
    });

    let totalVentas = 0;
    const ventasPorMetodo = { CASH: 0, CARD: 0, TRANSFER: 0 };
    const ventasPorDiaMap = {};
    const productosMap = {};
    const categoriasMap = {};

    sales.forEach(sale => {
      totalVentas += sale.amount;
      
      // Métodos de pago
      if (ventasPorMetodo.hasOwnProperty(sale.method)) {
        ventasPorMetodo[sale.method] += sale.amount;
      }

      // Ventas por día
      const date = sale.createdAt.toISOString().split('T')[0];
      ventasPorDiaMap[date] = (ventasPorDiaMap[date] || 0) + sale.amount;

      // Desglose de productos y categorías desde la orden
      if (sale.order && sale.order.items) {
        sale.order.items.forEach(item => {
          const pId = item.productId;
          if (!productosMap[pId]) {
            productosMap[pId] = { name: item.product.name, cantidad: 0, ingresos: 0 };
          }
          productosMap[pId].cantidad += item.quantity;
          productosMap[pId].ingresos += item.subtotal;

          const cId = item.product.categoryId;
          if (!categoriasMap[cId]) {
            categoriasMap[cId] = { name: item.product.category.name, total: 0 };
          }
          categoriasMap[cId].total += item.subtotal;
        });
      }
    });

    // Formatear ventas por día
    const ventasPorDia = Object.entries(ventasPorDiaMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Formatear top productos
    const topProductos = Object.values(productosMap)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    // Formatear categorías
    const ventasPorCategoria = Object.values(categoriasMap)
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        totalVentas,
        numTransacciones: sales.length,
        ventasPorMetodo,
        ventasPorDia,
        topProductos,
        ventasPorCategoria,
        periodo: { desde: start.toISOString().split('T')[0], hasta: end.toISOString().split('T')[0] }
      }
    });
  } catch (e) { 
    console.error('Error en reporte resumen:', e);
    res.status(500).json({ success: false }); 
  }
});

export default router;
