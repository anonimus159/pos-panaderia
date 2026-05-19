import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../prismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ success: false, message: 'Faltan campos' });
    
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, role },
      select: { id: true, username: true, role: true, createdAt: true }
    });
    audit(req.user.username, 'USUARIO_CREAR', `Usuario creado: ${username}`);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, username: true, role: true, createdAt: true }
    });
    audit(req.user.username, 'USUARIO_ACTUALIZAR', `Usuario actualizado: ${user.username}`);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ success: false, message: 'No puedes borrarte a ti mismo' });
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

// Permisos de roles
router.get('/permissions/all', async (req, res) => {
  try {
    const perms = await prisma.rolePermission.findMany();
    const grouped = {};
    perms.forEach(p => {
      if (!grouped[p.role]) grouped[p.role] = [];
      grouped[p.role].push(p.module);
    });
    res.json({ success: true, permissions: grouped });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.put('/permissions/update', async (req, res) => {
  try {
    const { role, modules } = req.body;
    if (role === 'ADMIN') return res.status(400).json({ success: false, message: 'ADMIN es inmutable' });
    
    await prisma.rolePermission.deleteMany({ where: { role } });
    for (const module of modules) {
      await prisma.rolePermission.create({ data: { role, module } });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

export default router;
