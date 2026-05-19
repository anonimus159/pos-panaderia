import prisma from '../../prismaClient.js';

export const audit = async (usuario, accion, detalle = null) => {
  try {
    await prisma.auditLog.create({
      data: { 
        usuario: usuario || 'SISTEMA', 
        accion, 
        detalle 
      }
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};
