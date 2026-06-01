import qz from 'qz-tray';

let connected = false;

export const connectQZ = async () => {
  if (connected && qz.websocket.isActive()) return true;
  try {
    await qz.websocket.connect();
    connected = true;
    console.log('[QZ Tray] Conectado exitosamente');
    return true;
  } catch (err) {
    console.error('[QZ Tray] Error al conectar:', err);
    connected = false;
    return false;
  }
};

export const getLocalPrinters = async () => {
  try {
    await connectQZ();
    const printers = await qz.printers.find();
    return printers;
  } catch (err) {
    console.error('[QZ Tray] Error al obtener impresoras:', err);
    return [];
  }
};

export const printRawBase64 = async (printerName, base64Data) => {
  if (!printerName || !base64Data) {
    console.warn('[QZ Tray] Faltan parámetros para imprimir (printerName o base64Data).');
    return false;
  }
  
  try {
    await connectQZ();
    const config = qz.configs.create(printerName);
    
    // El formato raw en base64 le dice a QZ que envíe los bytes tal cual a la impresora
    const data = [{ type: 'raw', format: 'base64', data: base64Data }];
    
    await qz.print(config, data);
    console.log(`[QZ Tray] Impresión enviada correctamente a: ${printerName}`);
    return true;
  } catch (err) {
    console.error(`[QZ Tray] Error al imprimir en ${printerName}:`, err);
    return false;
  }
};
