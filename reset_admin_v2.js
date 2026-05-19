import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
  const password = '7394';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (admin) {
    await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hash, role: 'ADMIN' }
    });
    console.log('✅ Contraseña de admin actualizada a: 7394');
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hash,
        role: 'ADMIN'
      }
    });
    console.log('✅ Usuario admin creado con contraseña: 7394');
  }

  const allUsers = await prisma.user.findMany();
  console.log('Usuarios actuales:', allUsers.map(u => ({ username: u.username, role: u.role })));

  await prisma.$disconnect();
}

reset();
