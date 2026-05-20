import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/ventas/historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&metodo=ALL&tipo=ALL&page=1&limit=50
router.get('/historial', authenticate, async (req, res) => {
  try {
    const { desde, hasta, metodo, tipo, page = 1, limit = 50 } = req.query;

    // Build date range — include the full "hasta" day until 23:59:59
    const fechaDesde = desde ? new Date(`${desde}T00:00:00`) : new Date(0);
    const fechaHasta = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    // Base filter on Sale
    const saleWhere = {
      createdAt: { gte: fechaDesde, lte: fechaHasta },
    };

    // Filter by payment method
    if (metodo && metodo !== 'ALL') {
      saleWhere.method = metodo;
    }

    // Filter by order type (DINE_IN / TAKEAWAY) — we join through order
    const orderWhere = {};
    if (tipo && tipo !== 'ALL') {
      orderWhere.type = tipo;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ventas, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...saleWhere,
          order: Object.keys(orderWhere).length > 0 ? orderWhere : undefined,
        },
        include: {
          order: {
            include: {
              table: { select: { name: true } },
              items: {
                include: { product: { select: { name: true } } },
              },
              factura: true,
            },
          },
          cliente: { select: { nombre: true, nit: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.sale.count({
        where: {
          ...saleWhere,
          order: Object.keys(orderWhere).length > 0 ? orderWhere : undefined,
        },
      }),
    ]);

    res.json({
      success: true,
      ventas,
      total: totalCount,
      pages: Math.ceil(totalCount / parseInt(limit)),
      page: parseInt(page),
    });
  } catch (e) {
    console.error('[ventas/historial]', e);
    res.status(500).json({ success: false, message: 'Error al obtener historial de ventas.' });
  }
});

export default router;
