import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper para obtener permisos por rol (Podría moverse a un service si crece)
async function getPermissionsByRole(role) {
  if (role === 'ADMIN') {
    return ['dashboard', 'mesas', 'pos', 'cocina', 'pedidos', 'productos', 'inventario', 'panaderia', 'historial', 'caja', 'reportes', 'configuracion', 'usuarios'];
  }
  const perms = await prisma.rolePermission.findMany({ where: { role } });
  return perms.map(p => p.module);
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    const permissions = await getPermissionsByRole(user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword, permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'No session' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    const permissions = await getPermissionsByRole(user.role);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword, permissions });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.post('/verify-admin', async (req, res) => {
  try {
    const { password } = req.body;
    const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (adminUsers.length === 0) return res.status(404).json({ success: false, message: 'No hay administradores' });

    for (const admin of adminUsers) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'PIN de administrador incorrecto' });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
