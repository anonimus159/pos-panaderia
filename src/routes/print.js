import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { getPrinterInstance, checkPrinterStatus, getSystemPrinters } from '../utils/printerHelper.js';

const router = express.Router();

// ─── Helper: obtener instancia de impresora ───────────────────────────────────
async function getPrinter() {
  const cfgRows = await prisma.config.findMany();
  const cfg = {};
  cfgRows.forEach(r => { cfg[r.key] = r.value; });

  const printer = await getPrinterInstance(cfg);
  return { printer, cfg };
}

// ─── Helper: obtener config sin impresora ────────────────────────────────────
async function getConfig() {
  const cfgRows = await prisma.config.findMany();
  const cfg = {};
  cfgRows.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/ticket
// Imprime un ticket de venta con los datos del cuerpo (modo manual/custom)
// Body: { items, total, payMethod, tip, orderNumber, tableName, discount }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ticket', authenticate, async (req, res) => {
  try {
    const { printer, cfg } = await getPrinter();
    const { items, total, payMethod, tip, orderNumber, tableName, discount, factura } = req.body;
    const now = new Date();
    const isFactura = !!factura;
    const titulo = isFactura ? 'FACTURA ELECTRÓNICA' : 'TICKET DE VENTA';

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(cfg['negocio.nombre'] || 'POS Bakery');
    printer.bold(false);
    printer.setTextNormal();
    if (cfg['negocio.direccion']) printer.println(cfg['negocio.direccion']);
    if (cfg['negocio.telefono'])  printer.println(`Tel: ${cfg['negocio.telefono']}`);
    if (cfg['negocio.rfc'])       printer.println(`NIT: ${cfg['negocio.rfc']}`);
    printer.drawLine();

    printer.alignCenter();
    printer.bold(true);
    printer.println(titulo);
    if (isFactura) {
      printer.println(`No. ${factura.numeroFactura}`);
    }
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();
    printer.println(`Fecha: ${now.toLocaleDateString('es-CO')}`);
    printer.println(`Hora:  ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
    if (orderNumber) printer.println(`Ticket #${orderNumber}`);
    if (tableName)   printer.println(`Mesa: ${tableName}`);
    if (payMethod)   printer.println(`Pago: ${payMethod}`);
    printer.drawLine();

    if (isFactura) {
      printer.bold(true);
      printer.println('ADQUIRIENTE:');
      printer.bold(false);
      // En el frontend se envían las propiedades como clienteNombre, clienteNit, clienteEmail
      printer.println(factura.clienteNombre || factura.cliente?.nombre || 'Cliente General');
      printer.println(`NIT/CC: ${factura.clienteNit || factura.cliente?.nit || '222222222222'}`);
      const email = factura.clienteEmail || factura.cliente?.email;
      if (email) printer.println(`Email: ${email}`);
      printer.drawLine();
    }

    printer.tableCustom([
      { text: 'Producto', align: 'LEFT', width: 0.5 },
      { text: 'Cant', align: 'CENTER', width: 0.15 },
      { text: 'Total', align: 'RIGHT', width: 0.35 }
    ]);
    printer.drawLine();

    for (const item of (items || [])) {
      printer.tableCustom([
        { text: item.name.substring(0, 18), align: 'LEFT', width: 0.5 },
        { text: String(item.quantity), align: 'CENTER', width: 0.15 },
        { text: `$${Number(item.subtotal).toFixed(2)}`, align: 'RIGHT', width: 0.35 }
      ]);
    }

    printer.drawLine();
    if (discount && discount > 0) {
      printer.tableCustom([
        { text: 'Descuento:', align: 'LEFT', width: 0.6 },
        { text: `-$${Number(discount).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
      ]);
    }
    if (tip && tip > 0) {
      printer.tableCustom([
        { text: 'Propina:', align: 'LEFT', width: 0.6 },
        { text: `$${Number(tip).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
      ]);
    }
    printer.bold(true);
    printer.tableCustom([
      { text: 'TOTAL:', align: 'LEFT', width: 0.6 },
      { text: `$${Number(total).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
    ]);
    printer.bold(false);

    if (isFactura) {
      printer.drawLine();
      printer.alignCenter();
      printer.println('Resolución DIAN No. 187640000001');
      printer.println('Desde: 2024-01-01 Hasta: 2025-01-01');
      const prefijo = (factura.numeroFactura || '').split('-')[0] || 'FE';
      printer.println(`Prefijo: ${prefijo} Rango: 1 al 100000`);
      if (factura.cufe) {
        printer.bold(true);
        printer.println('CUFE:');
        printer.bold(false);
        printer.println(factura.cufe);
      }
      printer.newLine();
      try {
        printer.printQR(factura.qrCode || factura.cufe || 'DIAN-FACTURA-E', {
          cellSize: 4,
          correction: 'M'
        });
      } catch (qrErr) {
        console.error('[PRINT] Error generating QR code:', qrErr);
      }
    }

    printer.drawLine();
    printer.alignCenter();
    printer.println(cfg['ticket.footer'] || 'Gracias por su preferencia');
    if (cfg['ticket.legal']) printer.println(cfg['ticket.legal']);
    printer.cut();

    const printData = printer.getBuffer().toString('base64');
    printer.clear();
    res.json({ success: true, message: 'Ticket impreso correctamente', printData });
  } catch (e) {
    console.error('[PRINT] Error ticket:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/ticket/:orderId
// Imprime ticket de una orden existente buscándola por ID en la BD
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ticket/:orderId', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'ID de orden inválido' });

    // Buscar la orden completa con sus ítems, incluyendo factura y su cliente
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        table: true,
        sales: true,
        factura: { include: { cliente: true } }
      }
    });

    if (!order) return res.status(404).json({ success: false, message: `Orden #${orderId} no encontrada` });

    const { printer, cfg } = await getPrinter();
    const now = new Date();
    const payMethod = order.sales?.[0]?.method || '';
    const tip = order.sales?.reduce((s, v) => s + (v.tip || 0), 0) || 0;
    const factura = order.factura;
    const isFactura = !!factura;
    const titulo = isFactura ? 'FACTURA ELECTRÓNICA' : 'TICKET DE VENTA';

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(cfg['negocio.nombre'] || 'POS Bakery');
    printer.bold(false);
    printer.setTextNormal();
    if (cfg['negocio.direccion']) printer.println(cfg['negocio.direccion']);
    if (cfg['negocio.telefono'])  printer.println(`Tel: ${cfg['negocio.telefono']}`);
    if (cfg['negocio.rfc'])       printer.println(`NIT: ${cfg['negocio.rfc']}`);
    printer.drawLine();

    printer.alignCenter();
    printer.bold(true);
    printer.println(titulo);
    if (isFactura) {
      printer.println(`No. ${factura.numeroFactura}`);
    }
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();
    printer.println(`Fecha: ${now.toLocaleDateString('es-CO')}`);
    printer.println(`Hora:  ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
    printer.println(`Ticket #${order.id}`);
    if (order.table) printer.println(`Mesa: ${order.table.name}`);
    if (payMethod)   printer.println(`Pago: ${payMethod}`);
    printer.drawLine();

    if (isFactura) {
      printer.bold(true);
      printer.println('ADQUIRIENTE:');
      printer.bold(false);
      printer.println(factura.cliente?.nombre || 'Cliente General');
      printer.println(`NIT/CC: ${factura.cliente?.nit || '222222222222'}`);
      if (factura.cliente?.email) printer.println(`Email: ${factura.cliente.email}`);
      printer.drawLine();
    }

    printer.tableCustom([
      { text: 'Producto', align: 'LEFT', width: 0.5 },
      { text: 'Cant', align: 'CENTER', width: 0.15 },
      { text: 'Total', align: 'RIGHT', width: 0.35 }
    ]);
    printer.drawLine();

    for (const item of order.items) {
      printer.tableCustom([
        { text: item.product.name.substring(0, 18), align: 'LEFT', width: 0.5 },
        { text: String(item.quantity), align: 'CENTER', width: 0.15 },
        { text: `$${Number(item.subtotal).toFixed(2)}`, align: 'RIGHT', width: 0.35 }
      ]);
      if (item.notes) {
        printer.alignLeft();
        printer.println(`  * ${item.notes}`);
      }
    }

    printer.drawLine();
    if (order.discount && order.discount > 0) {
      printer.tableCustom([
        { text: 'Descuento:', align: 'LEFT', width: 0.6 },
        { text: `-$${Number(order.discount).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
      ]);
    }
    if (tip > 0) {
      printer.tableCustom([
        { text: 'Propina:', align: 'LEFT', width: 0.6 },
        { text: `$${Number(tip).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
      ]);
    }
    printer.bold(true);
    printer.tableCustom([
      { text: 'TOTAL:', align: 'LEFT', width: 0.6 },
      { text: `$${Number(order.total).toFixed(2)}`, align: 'RIGHT', width: 0.4 }
    ]);
    printer.bold(false);

    if (isFactura) {
      printer.drawLine();
      printer.alignCenter();
      printer.println('Resolución DIAN No. 187640000001');
      printer.println('Desde: 2024-01-01 Hasta: 2025-01-01');
      const prefijo = (factura.numeroFactura || '').split('-')[0] || 'FE';
      printer.println(`Prefijo: ${prefijo} Rango: 1 al 100000`);
      if (factura.cufe) {
        printer.bold(true);
        printer.println('CUFE:');
        printer.bold(false);
        printer.println(factura.cufe);
      }
      printer.newLine();
      try {
        printer.printQR(factura.qrCode || factura.cufe || 'DIAN-FACTURA-E', {
          cellSize: 4,
          correction: 'M'
        });
      } catch (qrErr) {
        console.error('[PRINT] Error generating QR code:', qrErr);
      }
    }

    printer.drawLine();
    printer.alignCenter();
    printer.println(cfg['ticket.footer'] || 'Gracias por su preferencia');
    if (cfg['ticket.legal']) printer.println(cfg['ticket.legal']);
    printer.cut();

    const printData = printer.getBuffer().toString('base64');
    printer.clear();
    res.json({ success: true, message: `Ticket #${order.id} impreso correctamente`, printData });
  } catch (e) {
    console.error('[PRINT] Error ticket por ID:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/comanda
// Imprime una comanda de cocina con los datos del cuerpo
// Body: { items, orderNumber, tableName, orderType, notes }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/comanda', authenticate, async (req, res) => {
  try {
    const { printer, cfg } = await getPrinter();
    const { items, orderNumber, tableName, orderType, notes } = req.body;
    const now = new Date();

    // Encabezado grande de cocina
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('*** COCINA ***');
    printer.setTextNormal();
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();
    printer.bold(true);
    printer.println(`Hora: ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    printer.bold(false);
    if (orderNumber) {
      printer.bold(true);
      printer.println(`Orden #${orderNumber}`);
      printer.bold(false);
    }

    // Tipo de orden destacado
    const tipoLabel = orderType === 'TAKEOUT' ? '[ PARA LLEVAR ]'
                    : orderType === 'DELIVERY' ? '[ DOMICILIO ]'
                    : tableName ? `[ Mesa: ${tableName} ]`
                    : '[ En Salon ]';
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(tipoLabel);
    printer.setTextNormal();
    printer.bold(false);
    printer.drawLine();

    // Items con cantidad grande
    printer.alignLeft();
    for (const item of (items || [])) {
      printer.bold(true);
      printer.println(`${item.quantity}x  ${item.name}`);
      printer.bold(false);
      if (item.notes) {
        printer.println(`   >> ${item.notes}`);
      }
    }

    printer.drawLine();
    if (notes) {
      printer.bold(true);
      printer.println('NOTAS:');
      printer.bold(false);
      printer.println(notes);
      printer.drawLine();
    }

    printer.alignCenter();
    printer.println(cfg['negocio.nombre'] || '');
    printer.cut();

    const printData = printer.getBuffer().toString('base64');
    printer.clear();
    res.json({ success: true, message: 'Comanda enviada a cocina', printData });
  } catch (e) {
    console.error('[PRINT] Error comanda:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/comanda/:orderId
// Imprime comanda de una orden existente en la BD
// ─────────────────────────────────────────────────────────────────────────────
router.post('/comanda/:orderId', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'ID de orden inválido' });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        table: true
      }
    });

    if (!order) return res.status(404).json({ success: false, message: `Orden #${orderId} no encontrada` });

    const { printer, cfg } = await getPrinter();
    const now = new Date();

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('*** COCINA ***');
    printer.setTextNormal();
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();
    printer.bold(true);
    printer.println(`Hora: ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    printer.println(`Orden #${order.id}`);
    printer.bold(false);

    const tipoLabel = order.type === 'TAKEOUT' ? '[ PARA LLEVAR ]'
                    : order.type === 'DELIVERY' ? '[ DOMICILIO ]'
                    : order.table ? `[ Mesa: ${order.table.name} ]`
                    : '[ En Salon ]';
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(tipoLabel);
    printer.setTextNormal();
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();
    for (const item of order.items) {
      printer.bold(true);
      printer.println(`${item.quantity}x  ${item.product.name}`);
      printer.bold(false);
      if (item.notes) {
        printer.println(`   >> ${item.notes}`);
      }
    }

    printer.drawLine();
    printer.alignCenter();
    printer.println(cfg['negocio.nombre'] || '');
    printer.cut();

    const printData = printer.getBuffer().toString('base64');
    printer.clear();
    res.json({ success: true, message: `Comanda #${order.id} enviada a cocina`, printData });
  } catch (e) {
    console.error('[PRINT] Error comanda por ID:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/test
// Imprime una página de prueba para verificar la conexión con la impresora
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test', authenticate, async (req, res) => {
  try {
    const { printer, cfg } = await getPrinter();
    const now = new Date();

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('** PRUEBA DE IMPRESORA **');
    printer.setTextNormal();
    printer.bold(false);
    printer.drawLine();
    printer.println(cfg['negocio.nombre'] || 'POS Panadería');
    printer.println(`Fecha: ${now.toLocaleString('es-CO')}`);
    printer.drawLine();
    printer.println('Impresora funcionando correctamente.');
    printer.println('Todos los caracteres: áéíóú ñÑ');
    printer.drawLine();
    printer.alignLeft();
    printer.tableCustom([
      { text: 'Producto',   align: 'LEFT',   width: 0.5 },
      { text: 'Cant',       align: 'CENTER', width: 0.15 },
      { text: 'Total',      align: 'RIGHT',  width: 0.35 }
    ]);
    printer.tableCustom([
      { text: 'Pan Integral',  align: 'LEFT',   width: 0.5 },
      { text: '2',              align: 'CENTER', width: 0.15 },
      { text: '$4.500',         align: 'RIGHT',  width: 0.35 }
    ]);
    printer.tableCustom([
      { text: 'Croissant',     align: 'LEFT',   width: 0.5 },
      { text: '1',              align: 'CENTER', width: 0.15 },
      { text: '$3.200',         align: 'RIGHT',  width: 0.35 }
    ]);
    printer.drawLine();
    printer.bold(true);
    printer.tableCustom([
      { text: 'TOTAL:', align: 'LEFT', width: 0.6 },
      { text: '$7.700', align: 'RIGHT', width: 0.4 }
    ]);
    printer.bold(false);
    printer.drawLine();
    printer.alignCenter();
    printer.println('Gracias por su preferencia');
    printer.cut();

    const printData = printer.getBuffer().toString('base64');
    printer.clear();
    res.json({ success: true, message: 'Prueba de impresora enviada correctamente', printData });
  } catch (e) {
    console.error('[PRINT] Error prueba:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/print/status
// Verifica si la impresora está configurada y disponible (sin imprimir)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  try {
    const cfg = await getConfig();
    const printerName = cfg['printer.nombre'] || '';
    const printerType = cfg['printer.tipo'] || 'EPSON';

    if (!printerName) {
      return res.json({
        success: false,
        configured: false,
        message: 'Impresora no configurada. Ve a Configuración → Impresora.'
      });
    }

    const status = await checkPrinterStatus(printerName);

    res.json({
      success: true,
      configured: status.configured,
      connected: status.connected,
      printerName,
      printerType,
      message: status.message
    });
  } catch (e) {
    console.error('[PRINT] Error status:', e);
    res.status(500).json({ success: false, message: `Error al verificar impresora: ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/print/printers
// Retorna la lista de impresoras instaladas en el sistema de Windows
// ─────────────────────────────────────────────────────────────────────────────
router.get('/printers', authenticate, async (req, res) => {
  try {
    const printers = await getSystemPrinters();
    res.json({ success: true, printers });
  } catch (e) {
    console.error('[PRINT] Error listing system printers:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
