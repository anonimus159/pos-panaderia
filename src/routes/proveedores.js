import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { activo: true },
      include: { _count: { select: { compras: true } } },
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, proveedores });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, notas } = req.body;
    const proveedor = await prisma.proveedor.create({ data: { nombre, contacto, telefono, email, notas } });
    res.json({ success: true, proveedor });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/:id/compras', authenticate, async (req, res) => {
  try {
    const compras = await prisma.compraProveedor.findMany({
      where: { proveedorId: parseInt(req.params.id) },
      include: { items: { include: { ingredient: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, compras });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/:id/compras', authenticate, async (req, res) => {
  try {
    const { descripcion, total, items } = req.body;
    const compra = await prisma.compraProveedor.create({
      data: {
        proveedorId: parseInt(req.params.id),
        descripcion, total: parseFloat(total || 0),
        creadoPor: req.user.username,
        items: {
          create: (items || []).map(it => ({
            ingredientId: it.ingredientId, cantidad: parseFloat(it.cantidad),
            unidad: it.unidad, precioUnitario: parseFloat(it.precioUnitario), subtotal: parseFloat(it.subtotal)
          }))
        }
      }
    });

    for (const it of items) {
      if (it.ingredientId) {
        await prisma.ingredient.update({
          where: { id: it.ingredientId },
          data: { stock: { increment: parseFloat(it.cantidad) } }
        });
      }
    }
    audit(req.user.username, 'COMPRA_PROVEEDOR', `Compra a proveedor ID ${req.params.id}`);
    res.json({ success: true, compra });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
