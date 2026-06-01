import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/recipes', authenticate, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({ include: { product: true, ingredient: true } });
    res.json({ success: true, recipes });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/batch', authenticate, async (req, res) => {
  try {
    const { productId, batches } = req.body;
    const parsedBatches = parseInt(batches);
    const recipes = await prisma.recipe.findMany({ 
      where: { productId: parseInt(productId) },
      include: { product: true, ingredient: true }
    });
    
    if (recipes.length === 0) return res.status(400).json({ success: false, message: 'Sin receta' });

    await prisma.$transaction(async (tx) => {
      const productName = recipes[0].product.name;
      
      for (const r of recipes) {
        const requiredQty = r.quantity * parsedBatches;
        await tx.ingredient.update({
          where: { id: r.ingredientId },
          data: { stock: { decrement: requiredQty } }
        });
        
        await tx.inventoryTransaction.create({
          data: { 
            ingredientId: r.ingredientId, 
            type: 'OUT', 
            quantity: requiredQty, 
            reason: `Producción de ${parsedBatches} ${productName}`, 
            usuario: req.user.username 
          }
        });
      }
      await tx.product.update({
        where: { id: parseInt(productId) },
        data: { stock: { increment: parsedBatches } }
      });
    });
    res.json({ success: true });
  } catch (e) { 
    console.error('Error en producción:', e);
    res.status(500).json({ success: false }); 
  }
});

export default router;
