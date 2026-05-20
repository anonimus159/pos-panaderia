import fs from 'fs';
import path from 'path';

// Extrae la ruta del archivo de la variable de entorno DATABASE_URL (ej: "file:/data/dev.db" -> "/data/dev.db")
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const targetDb = dbUrl.startsWith('file:') ? dbUrl.substring(5) : dbUrl;
const templateDb = path.join(process.cwd(), 'prisma', 'prod_initial.db');

console.log(`[DB Init] Validando base de datos destino: ${targetDb}`);

// Asegurar que la carpeta contenedora exista
const targetDir = path.dirname(targetDb);
if (!fs.existsSync(targetDir)) {
  console.log(`[DB Init] Creando directorio para base de datos: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copiar la base de datos local si no existe en producción
if (!fs.existsSync(targetDb)) {
  console.log(`[DB Init] Base de datos no encontrada en ${targetDb}.`);
  if (fs.existsSync(templateDb)) {
    console.log(`[DB Init] Copiando plantilla de base de datos desde: ${templateDb}`);
    fs.copyFileSync(templateDb, targetDb);
    console.log('✅ [DB Init] Base de datos de producción inicializada con tus datos locales.');
  } else {
    console.log('⚠️ [DB Init] No se encontró ninguna plantilla en prisma/prod_initial.db. Se creará una base de datos vacía.');
  }
} else {
  console.log(`✅ [DB Init] Base de datos detectada en ${targetDb}. No se requiere inicializar para evitar sobreescribir datos.`);
}
