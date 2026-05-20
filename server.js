import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }
});

app.set('io', io);

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
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
httpServer.listen(PORT, () => {
  console.log(`✅ Servidor POS Modernizado corriendo en puerto ${PORT} (v2)`);
});
