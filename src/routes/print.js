import express from 'express';
import prisma from '../../prismaClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/ticket', authenticate, async (req, res) => {
  try {
    const { ThermalPrinter, PrinterTypes, CharacterSet } = await import('node-thermal-printer');
    const cfgRows = await prisma.config.findMany();
    const cfg = {};
    cfgRows.forEach(r => { cfg[r.key] = r.value; });

    const printerName = cfg['printer.nombre'] || '';
    const printerType = cfg['printer.tipo'] === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;

    if (!printerName) return res.status(400).json({ success: false, message: 'Impresora no configurada' });

    const printer = new ThermalPrinter({
      type: printerType,
      interface: `printer:${printerName}`,
      characterSet: CharacterSet.PC850_MULTILINGUAL,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      options: { timeout: 5000 }
    });

    const { items, total, payMethod, tip, orderNumber, tableName, discount } = req.body;
    const now = new Date();

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(cfg['negocio.nombre'] || 'POS Bakery');
    printer.bold(false);
    printer.setTextNormal();
    if (cfg['negocio.direccion']) printer.println(cfg['negocio.direccion']);
    if (cfg['negocio.telefono'])  printer.println(`Tel: ${cfg['negocio.telefono']}`);
    // CAMBIO: RFC -> NIT
    if (cfg['negocio.rfc'])       printer.println(`NIT: ${cfg['negocio.rfc']}`);
    printer.drawLine();

    printer.alignLeft();
    printer.println(`Fecha: ${now.toLocaleDateString('es-MX')}`);
    printer.println(`Hora:  ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`);
    if (orderNumber) printer.println(`Ticket #${orderNumber}`);
    if (tableName)   printer.println(`Mesa: ${tableName}`);
    printer.drawLine();

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
    
    printer.drawLine();
    printer.alignCenter();
    printer.println(cfg['ticket.footer'] || 'Gracias por su preferencia');
    if (cfg['ticket.legal']) printer.println(cfg['ticket.legal']);
    printer.cut();

    await printer.execute();
    res.json({ success: true, message: 'Ticket impreso correctamente' });
  } catch (e) {
    console.error('Print error:', e);
    res.status(500).json({ success: false, message: `Error de impresión: ${e.message}` });
  }
});

export default router;
