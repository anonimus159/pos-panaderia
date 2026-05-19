import prisma from '../../prismaClient.js';

export async function decrementOrderStock(orderId, io) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { include: { recipes: true } } } } }
    });
    if (!order || order.stockDescontado) return;

    for (const item of order.items) {
      // 1. Descontar stock del producto (si tiene stock físico)
      await prisma.product.updateMany({
        where: { id: item.productId, stock: { gt: 0 } },
        data: { stock: { decrement: item.quantity } }
      });

      // 2. Descontar ingredientes según la receta
      if (item.product.recipes && item.product.recipes.length > 0) {
        for (const recipe of item.product.recipes) {
          const totalIngredientToSubtract = recipe.quantity * item.quantity;
          await prisma.ingredient.update({
            where: { id: recipe.ingredientId },
            data: { stock: { decrement: totalIngredientToSubtract } }
          });
          
          await prisma.inventoryTransaction.create({
            data: {
              ingredientId: recipe.ingredientId,
              type: 'SALIDA',
              quantity: totalIngredientToSubtract,
              reason: `Venta Orden #${order.id} - ${item.product.name}`
            }
          });
        }
      }
    }

    await prisma.order.update({ where: { id: orderId }, data: { stockDescontado: true } });
    io?.emit('stock_updated', { orderId });
  } catch (e) { console.error('Error decrementando stock:', e); }
}

export async function restoreItemStock(orderItemId, io) {
  try {
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { product: { include: { recipes: true } } }
    });

    if (!item) return;

    // 1. Restaurar stock del producto
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } }
    });

    // 2. Restaurar ingredientes
    if (item.product.recipes && item.product.recipes.length > 0) {
      for (const recipe of item.product.recipes) {
        const totalToRestore = recipe.quantity * item.quantity;
        await prisma.ingredient.update({
          where: { id: recipe.ingredientId },
          data: { stock: { increment: totalToRestore } }
        });

        await prisma.inventoryTransaction.create({
          data: {
            ingredientId: recipe.ingredientId,
            type: 'ENTRADA',
            quantity: totalToRestore,
            reason: `Devolución/Cancelación Ítem en Orden #${item.orderId} - ${item.product.name}`
          }
        });
      }
    }

    io?.emit('stock_updated', { productId: item.productId });
  } catch (e) { console.error('Error restaurando stock:', e); }
}

