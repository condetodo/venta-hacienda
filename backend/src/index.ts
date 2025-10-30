import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { ventasRoutes } from './routes/ventas.routes';
import { documentosRoutes } from './routes/documentos.routes';
import { pagosRoutes } from './routes/pagos.routes';
import { dolarRoutes } from './routes/dolar.routes';
import dutRoutes from './routes/dut.routes';
import { env } from './config/env';

// Carga de env ahora se realiza en config/env.ts para asegurar orden correcto

const app = express();
const PORT = env.PORT;

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/dolar', dolarRoutes);
app.use('/api/dut', dutRoutes);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

