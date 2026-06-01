/**
 * printComanda — Imprime en impresora térmica POS (80mm) usando config del negocio
 * @param {object} opts
 * @param {string}   opts.tableName     — "Mesa 1" | "Mostrador"
 * @param {Array}    opts.items         — [{ name, quantity, subtotal, notes? }]
 * @param {string}   opts.type          — 'COCINA' | 'TICKET'
 * @param {number}   [opts.total]       — Total (solo ticket de cobro)
 * @param {string}   [opts.payMethod]   — Método de pago
 * @param {number}   [opts.orderNumber] — Número de orden
 * @param {number}   [opts.discount]    — Descuento aplicado
 * @param {number}   [opts.tip]         — Propina aplicada
 */

// Cache de configuración del negocio (se carga una vez)
async function getConfig() {
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.success) return d.config;
  } catch(e) {}
  return {};
}

export async function printComanda({ tableName, items, type = 'COCINA', total, payMethod, orderNumber, discount, tip, factura }) {
  // 1. Intentar imprimir directamente en la impresora física conectada al servidor
  try {
    const endpoint = type === 'COCINA' ? '/api/print/comanda' : '/api/print/ticket';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableName, items, total, payMethod, orderNumber, discount, tip, factura })
    });
    const result = await response.json();
    if (result.success) {
      console.log('[PRINT] Impresión directa exitosa vía servidor:', result.message);
      return; // Impresión exitosa, evitar mostrar diálogo del navegador
    } else {
      console.warn('[PRINT] Error en impresión directa del servidor:', result.message);
    }
  } catch (err) {
    console.error('[PRINT] No se pudo conectar al servidor de impresión:', err);
  }

  // 2. Fallback: Diálogo de impresión del navegador local
  console.log('[PRINT] Usando diálogo de impresión del navegador local como fallback...');
  const config = await getConfig();
  const nombre    = config['negocio.nombre']    || 'POS Bakery';
  const direccion = config['negocio.direccion'] || '';
  const telefono  = config['negocio.telefono']  || '';
  const rfc       = config['negocio.rfc']       || ''; // En Colombia se usa NIT
  const slogan    = config['negocio.slogan']    || '';
  const footer    = config['ticket.footer']     || '¡Gracias por su preferencia!';
  const legal     = config['ticket.legal']      || '';

  const now   = new Date();
  const fecha = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const methodLabel = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', DIVIDIDA: 'Cuenta Dividida' };

  const isFactura = !!factura;
  const titulo = isFactura ? 'FACTURA ELECTRÓNICA' : (type === 'COCINA' ? 'COMANDA COCINA' : 'TICKET DE VENTA');

  const itemsHtml = items.map(item => `
    <tr>
      <td class="qty">${item.quantity}</td>
      <td class="name">${item.name || item.product?.name || '—'}</td>
      ${type !== 'COCINA' ? `<td class="price">$${Math.round(item.subtotal ?? 0).toLocaleString('es-CO')}</td>` : ''}
    </tr>
    ${item.notes ? `<tr><td></td><td class="notes" colspan="2">↳ ${item.notes}</td></tr>` : ''}
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11px; color: #000; background: #fff;
      width: 80mm; padding: 5mm;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 10px; line-height: 1.4; }
    .header .logo { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
    .header .tipo-doc { 
      font-size: 12px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;
      margin: 5px 0; padding: 3px 0; text-transform: uppercase;
    }
    
    .info-block { font-size: 10px; margin-bottom: 8px; }
    
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 10px; text-align: left; }
    td { padding: 4px 0; vertical-align: top; }
    .qty { width: 10%; text-align: center; }
    .price { width: 25%; text-align: right; }
    .notes { font-size: 9px; font-style: italic; color: #333; padding-bottom: 4px; padding-left: 2px; }
    
    .totals { border-top: 1px solid #000; padding-top: 5px; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .grand { font-size: 14px; font-weight: bold; margin-top: 5px; border-top: 1px double #000; padding-top: 5px; }
    
    .dian-info { font-size: 9px; margin-top: 15px; border: 1px solid #000; padding: 5px; line-height: 1.2; }
    .cufe { font-size: 8px; word-break: break-all; margin-top: 5px; }
    .qr-box { width: 100px; height: 100px; border: 1px solid #ccc; margin: 10px auto; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; }
    
    .footer { margin-top: 15px; font-size: 9px; line-height: 1.4; color: #444; }
    @media print { body { width: 80mm; } }
  </style>
</head>
<body>
  <div class="header text-center">
    <div class="logo">🥖 ${nombre.toUpperCase()}</div>
    <div class="info-block">
      ${direccion}<br>
      ${telefono ? `Tel: ${telefono}<br>` : ''}
      NIT: ${rfc}<br>
      ${slogan ? `<i>${slogan}</i><br>` : ''}
    </div>
    
    <div class="tipo-doc">${titulo}</div>
    ${isFactura ? `<div class="bold">No. ${factura.numeroFactura}</div>` : ''}
    <div class="info-block">
      Fecha: ${fecha} - Hora: ${hora}<br>
      ${orderNumber ? `Orden: #${orderNumber}` : ''} | Mesa: ${tableName}
    </div>
  </div>
 
  ${isFactura ? `
  <div class="info-block" style="border: 1px solid #000; padding: 5px;">
    <div class="bold">ADQUIRIENTE:</div>
    ${factura.clienteNombre || 'Cliente General'}<br>
    NIT/CC: ${factura.clienteNit || '222222222222'}<br>
    ${factura.clienteEmail ? `Email: ${factura.clienteEmail}` : ''}
  </div>
  ` : ''}
 
  <table>
    <thead>
      <tr>
        <th class="qty">Cant</th>
        <th>Descripción</th>
        ${type !== 'COCINA' ? '<th class="price">Total</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
 
  ${type !== 'COCINA' ? `
   <div class="totals">
     <div class="row"><span>Subtotal:</span><span>$${Math.round(total - (tip || 0) + (discount || 0)).toLocaleString('es-CO')}</span></div>
     ${discount ? `<div class="row"><span>Descuento:</span><span>-$${Math.round(discount).toLocaleString('es-CO')}</span></div>` : ''}
     ${tip ? `<div class="row"><span>Propina:</span><span>+$${Math.round(tip).toLocaleString('es-CO')}</span></div>` : ''}
     <div class="row grand"><span>TOTAL A PAGAR:</span><span>$${Math.round(total).toLocaleString('es-CO')} COP</span></div>
     <div class="row" style="margin-top:5px; font-size: 9px;"><span>Método de Pago:</span><span>${methodLabel[payMethod] || payMethod || 'Efectivo'}</span></div>
   </div>
  ` : ''}
 
  ${isFactura ? `
  <div class="dian-info">
    <div class="bold">Resolución DIAN No. 187640000001</div>
    Desde: 2024-01-01 Hasta: 2025-01-01<br>
    Prefijo: ${factura.numeroFactura.split('-')[0]} Rango: 1 al 100000
    <div class="cufe"><b>CUFE:</b> ${factura.cufe}</div>
  </div>
  
  <div class="qr-box">
    [CÓDIGO QR DIAN]
  </div>
  ` : ''}
 
  <div class="footer text-center">
    ${footer}<br>
    ${legal ? `<div style="font-size: 8px; margin-top: 5px; font-style: italic;">${legal}</div>` : ''}
    Software: POS Panadería v2.0 - Colombia<br>
    ${isFactura ? 'Factura generada electrónicamente' : 'Documento Equivalente POS'}
  </div>
 </body>
 </html>`;

  // Imprimir usando un iframe oculto para evitar popups bloqueados
  let iframe = document.getElementById('print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Esperar un momento para que los estilos se apliquen antes de imprimir
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 500);
}
