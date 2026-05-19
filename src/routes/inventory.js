import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.get('/ingredients', async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany();
    res.json({ success: true, ingredients });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/ingredients', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, unit, minStock, costoPorUnidad, fechaCaducidad } = req.body;
    if (!name || !unit) return res.status(400).json({ success: false, message: 'Faltan campos' });
    const ingredient = await prisma.ingredient.create({ 
      data: { 
        name, unit, 
        minStock: parseFloat(minStock || 0),
        costoPorUnidad: parseFloat(costoPorUnidad || 0),
        fechaCaducidad: fechaCaducidad ? new Date(fechaCaducidad) : null
      } 
    });
    req.app.get('io')?.emit('ingredient_updated', { id: ingredient.id, action: 'CREATE' });
    res.json({ success: true, ingredient });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.put('/ingredients/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, unit, minStock, costoPorUnidad, fechaCaducidad } = req.body;
    const ingredient = await prisma.ingredient.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(unit && { unit }),
        ...(minStock !== undefined && { minStock: parseFloat(minStock || 0) }),
        ...(costoPorUnidad !== undefined && { costoPorUnidad: parseFloat(costoPorUnidad || 0) }),
        ...(fechaCaducidad !== undefined && { fechaCaducidad: fechaCaducidad ? new Date(fechaCaducidad) : null })
      }
    });
    req.app.get('io')?.emit('ingredient_updated', { id: ingredient.id, action: 'UPDATE' });
    res.json({ success: true, ingredient });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/movement', authenticate, async (req, res) => {
  try {
    const { ingredientId, type, quantity, reason } = req.body;
    const qty = parseFloat(quantity);
    if (!ingredientId || isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Datos inválidos' });

    const [mov, ing] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: { ingredientId: parseInt(ingredientId), type, quantity: qty, reason, usuario: req.user.username }
      }),
      prisma.ingredient.update({
        where: { id: parseInt(ingredientId) },
        data: { stock: { [type === 'IN' ? 'increment' : 'decrement']: qty } }
      })
    ]);

    req.app.get('io')?.emit('stock_updated', { ingredientId });
    res.json({ success: true, ingredient: ing });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/transactions', authenticate, requireAdmin, async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: { ingredient: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, transactions });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
