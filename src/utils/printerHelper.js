import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

export async function getPrinterInstance(cfg) {
  const printerType = cfg['printer.tipo'] === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;

  // Crear la instancia de la impresora térmica en memoria (sin interface local)
  const printer = new ThermalPrinter({
    type: printerType,
    interface: 'printer',
    characterSet: CharacterSet.PC850_MULTILINGUAL,
    removeSpecialCharacters: false,
    lineCharacter: '-',
  });

  return printer;
}

// Ya no aplican porque estamos en la nube, pero las mantenemos por compatibilidad de rutas
export function checkPrinterStatus(printerName) {
  return Promise.resolve({
    configured: true,
    connected: true,
    message: 'Validación delegada a QZ Tray en el cliente.'
  });
}

export function getSystemPrinters() {
  return Promise.resolve([]); // Delegado al cliente con QZ Tray
}

