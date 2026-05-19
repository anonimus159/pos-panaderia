import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({});

// Permisos por defecto para cada rol
const DEFAULT_PERMISSIONS = {
  ADMIN:      ['dashboard', 'mesas', 'pos', 'cocina', 'productos', 'inventario', 'panaderia', 'usuarios'],
  CAJERO:     ['dashboard', 'mesas', 'pos'],
  MESERO:     ['mesas'],
  COCINA:     ['cocina'],
  PANADERO:   ['panaderia'],
  INVENTARIO: ['dashboard', 'productos', 'inventario'],
};

async function main() {
  // 1. Usuarios por rol
  const usersToCreate = [
    { username: 'admin',      password: 'admin',     role: 'ADMIN' },
    { username: 'cajero',     password: 'cajero123', role: 'CAJERO' },
    { username: 'mesero',     password: 'mesero123', role: 'MESERO' },
    { username: 'cocina',     password: 'cocina123', role: 'COCINA' },
    { username: 'panadero',   password: 'pan123',    role: 'PANADERO' },
    { username: 'inventario', password: 'inv123',    role: 'INVENTARIO' },
  ];

  for (const u of usersToCreate) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      const hashed = await bcrypt.hash(u.password, 10);
      await prisma.user.create({ data: { username: u.username, password: hashed, role: u.role } });
      console.log(`✅ Usuario '${u.username}' (${u.role}) creado`);
    } else {
      console.log(`ℹ️  Usuario '${u.username}' ya existe`);
    }
  }

  // 2. Permisos por defecto por rol
  const existingPerms = await prisma.rolePermission.count();
  if (existingPerms === 0) {
    for (const [role, modules] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const module of modules) {
        await prisma.rolePermission.create({ data: { role, module } });
      }
    }
    console.log('✅ Permisos por defecto creados');
  } else {
    console.log('ℹ️  Permisos ya existen, omitiendo seed');
  }

  // 3. Mesas
  const countTables = await prisma.table.count();
  if (countTables === 0) {
    await prisma.table.createMany({
      data: [
        { name: 'Mesa 1', capacity: 4 },
        { name: 'Mesa 2', capacity: 4 },
        { name: 'Mesa 3', capacity: 2 },
        { name: 'Terraza 1', capacity: 6 }
      ]
    });
    console.log('✅ Mesas creadas');
  }

  // 4. Categorías
  let catPanes, catPostres, catBebidas;
  const countCategories = await prisma.category.count();
  if (countCategories === 0) {
    catPanes    = await prisma.category.create({ data: { name: 'Panes',    description: 'Panadería fresca' } });
    catPostres  = await prisma.category.create({ data: { name: 'Postres',  description: 'Dulces y pasteles' } });
    catBebidas  = await prisma.category.create({ data: { name: 'Bebidas',  description: 'Cafés y fríos' } });
    console.log('✅ Categorías creadas');
  } else {
    catPanes   = await prisma.category.findFirst({ where: { name: 'Panes' } });
    catPostres = await prisma.category.findFirst({ where: { name: 'Postres' } });
    catBebidas = await prisma.category.findFirst({ where: { name: 'Bebidas' } });
  }

  // 5. Productos
  let prodCroissant, prodPanFrances, prodCafe;
  const countProducts = await prisma.product.count();
  if (countProducts === 0 && catPanes && catBebidas) {
    prodCroissant  = await prisma.product.create({ data: { name: 'Croissant',       price: 2.50, categoryId: catPanes.id } });
    prodPanFrances = await prisma.product.create({ data: { name: 'Pan Francés',     price: 1.00, categoryId: catPanes.id } });
    prodCafe       = await prisma.product.create({ data: { name: 'Café Americano',  price: 1.50, categoryId: catBebidas.id } });
    console.log('✅ Productos creados');
  } else {
    prodCroissant  = await prisma.product.findFirst({ where: { name: 'Croissant' } });
    prodPanFrances = await prisma.product.findFirst({ where: { name: 'Pan Francés' } });
    prodCafe       = await prisma.product.findFirst({ where: { name: 'Café Americano' } });
  }

  // 6. Insumos
  let ingHarina, ingMantequilla, ingCafe;
  const countIngredients = await prisma.ingredient.count();
  if (countIngredients === 0) {
    ingHarina      = await prisma.ingredient.create({ data: { name: 'Harina de Trigo', unit: 'Kg', stock: 50, minStock: 10 } });
    ingMantequilla = await prisma.ingredient.create({ data: { name: 'Mantequilla',     unit: 'Kg', stock: 15, minStock: 5 } });
    ingCafe        = await prisma.ingredient.create({ data: { name: 'Grano de Café',   unit: 'Kg', stock: 5,  minStock: 2 } });
    console.log('✅ Insumos creados');
  } else {
    ingHarina      = await prisma.ingredient.findFirst({ where: { name: 'Harina de Trigo' } });
    ingMantequilla = await prisma.ingredient.findFirst({ where: { name: 'Mantequilla' } });
    ingCafe        = await prisma.ingredient.findFirst({ where: { name: 'Grano de Café' } });
  }

  // 7. Recetas
  const countRecipes = await prisma.recipe.count();
  if (countRecipes === 0 && ingHarina && prodCroissant && ingCafe && prodCafe) {
    await prisma.recipe.create({ data: { productId: prodCroissant.id,  ingredientId: ingHarina.id,      quantity: 0.1 } });
    await prisma.recipe.create({ data: { productId: prodCroissant.id,  ingredientId: ingMantequilla.id, quantity: 0.05 } });
    await prisma.recipe.create({ data: { productId: prodCafe.id,       ingredientId: ingCafe.id,        quantity: 0.02 } });
    console.log('✅ Recetas creadas');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
