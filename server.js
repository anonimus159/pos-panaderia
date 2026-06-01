import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Importación de Rutas Modulares
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import productRoutes from './src/routes/products.js';
import inventoryRoutes from './src/routes/inventory.js';
import orderRoutes from './src/routes/orders.js';
import tableRoutes from './src/routes/tables.js';
import turnosRoutes from './src/routes/turnos.js';
import proveedorRoutes from './src/routes/proveedores.js';
import dashboardRoutes from './src/routes/dashboard.js';
import productionRoutes from './src/routes/production.js';
import cajaRoutes from './src/routes/caja.js';
import reportesRoutes from './src/routes/reportes.js';
import configRoutes from './src/routes/config.js';
import clientRoutes from './src/routes/clients.js';
import reservationRoutes from './src/routes/reservations.js';
import cajaChicaRoutes from './src/routes/caja-chica.js';
import discountRoutes from './src/routes/discounts.js';
import adminRoutes from './src/routes/admin.js';
import printRoutes from './src/routes/print.js';
import billingRoutes from './src/routes/billing.js';
import uploadRoutes from './src/routes/upload.js';
import ventasRoutes from './src/routes/ventas.js';
import pedidosEspecialesRoutes from './src/routes/pedidosEspeciales.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
// Permitir conexiones desde cualquier origen en la red local (PC, celular, tablet)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim());
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir sin origin (apps nativas, Postman) o cualquier IP local
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permitir cualquier IP en red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNet = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);
    if (localNet) return callback(null, true);
    callback(null, true); // En desarrollo, permitir todo
  },
  credentials: true
};

const io = new Server(httpServer, { cors: corsOptions });

app.set('io', io);

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('public/uploads'));

// Registro de Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/reservaciones', reservationRoutes);
app.use('/api/caja-chica', cajaChicaRoutes);
app.use('/api/descuentos', discountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/print', printRoutes);
app.use('/api/facturacion', billingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/pedidos-especiales', pedidosEspecialesRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

// Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
}



const PORT = process.env.PORT || 3000;

// Obtener la IP local del PC para mostrarla al iniciar
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Escuchar en 0.0.0.0 para que el celular (misma red WiFi) pueda conectarse
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`✅ Servidor POS Modernizado corriendo en puerto ${PORT} (v2)`);
  console.log(`🖥️  Acceso local:  http://localhost:${PORT}`);
  console.log(`📱 Acceso celular: http://${localIP}:${PORT}`);
  console.log(`🖨️  Para imprimir desde celular, usa la IP: ${localIP}`);
});
