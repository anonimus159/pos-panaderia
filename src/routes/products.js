import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

// CATEGORIES
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    res.json({ success: true, categories });
  } catch (e) {
    console.error("DETALLE ERROR GET CATEGORIES:", e);
    res.status(500).json({ success: false }); 
  }
});

router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Nombre obligatorio' });
    const category = await prisma.category.create({ data: { name, description } });
    req.app.get('io')?.emit('category_updated', { id: category.id, action: 'CREATE' });
    res.json({ success: true, category });
  } catch (e) {
    console.error("DETALLE ERROR POST CATEGORIES:", e);
    res.status(500).json({ success: false, message: 'Error BD: ' + e.message }); 
  }
});

router.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Buscar o crear la categoría "General" de forma compatible con SQLite
    let generalCategory = await prisma.category.findFirst({
      where: { 
        OR: [
          { name: 'General' },
          { name: 'general' },
          { name: 'GENERAL' }
        ]
      }
    });

    if (!generalCategory) {
      generalCategory = await prisma.category.create({
        data: { name: 'General', description: 'Categoría por defecto' }
      });
    }

    // No permitir eliminar la categoría General
    if (categoryId === generalCategory.id) {
      return res.status(400).json({ success: false, message: 'No se puede eliminar la categoría General' });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ success: false, message: 'Categoría no encontrada' });

    // Mover productos a General y eliminar categoría en una sola transacción
    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId: categoryId },
        data: { categoryId: generalCategory.id }
      }),
      prisma.category.delete({
        where: { id: categoryId }
      })
    ]);
    
    req.app.get('io')?.emit('category_updated', { id: categoryId, action: 'DELETE' });
    audit(req.user.username, 'CATEGORIA_ELIMINAR', `Categoría eliminada: ${category.name}. Productos movidos a General.`);
    res.json({ success: true });
  } catch (e) { 
    console.error("DETALLE ERROR CATEGORIA:", e);
    res.status(500).json({ success: false, message: 'Error técnico al eliminar la categoría (verificar consola)' }); 
  }
});

router.put('/categories/reorder', authenticate, async (req, res) => {
  try {
    const { orders } = req.body; // Array de { id, order }
    if (!Array.isArray(orders)) return res.status(400).json({ success: false });

    await prisma.$transaction(
      orders.map(o => prisma.category.update({
        where: { id: parseInt(o.id) },
        data: { order: parseInt(o.order) }
      }))
    );

    req.app.get('io')?.emit('category_updated', { action: 'REORDER' });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

// PRODUCTS
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    res.json({ success: true, products });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, price, isWeight, requiresPrep, categoryId, barcode, stock } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Nombre obligatorio' });
    if (isNaN(price) || price < 0) return res.status(400).json({ success: false, message: 'Precio inválido' });

    const product = await prisma.product.create({ 
      data: { 
        name, description, price: parseFloat(price), isWeight, 
        requiresPrep: requiresPrep ?? true, categoryId: parseInt(categoryId), 
        barcode: barcode || null, stock: parseFloat(stock) || 0
      } 
    });
    req.app.get('io')?.emit('product_updated', { id: product.id, action: 'CREATE' });
    res.json({ success: true, product });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, isWeight, requiresPrep, categoryId, barcode, stock } = req.body;
    
    if (name && name.trim() === '') return res.status(400).json({ success: false, message: 'Nombre vacío' });
    if (price !== undefined && (isNaN(price) || price < 0)) return res.status(400).json({ success: false, message: 'Precio inválido' });

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { 
        ...(name && { name }), 
        ...(description !== undefined && { description }), 
        ...(price !== undefined && { price: parseFloat(price) }), 
        ...(isWeight !== undefined && { isWeight }), 
        ...(requiresPrep !== undefined && { requiresPrep }), 
        ...(categoryId && { categoryId: parseInt(categoryId) }), 
        ...(barcode !== undefined && { barcode: barcode || null }),
        ...(stock !== undefined && { stock: parseFloat(stock) })
      }
    });
    req.app.get('io')?.emit('product_updated', { id: product.id, action: 'UPDATE' });
    res.json({ success: true, product });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ success: false, message: 'No encontrado' });
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    audit(req.user.username, 'PRODUCTO_ELIMINAR', `Producto eliminado: ${product.name}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Error al eliminar (posibles registros asociados)' }); }
});

export default router;
