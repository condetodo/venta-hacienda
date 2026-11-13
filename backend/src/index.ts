import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { ventasRoutes } from './routes/ventas.routes';
import { documentosRoutes } from './routes/documentos.routes';
import { pagosRoutes } from './routes/pagos.routes';
import { dolarRoutes } from './routes/dolar.routes';
import dutRoutes from './routes/dut.routes';
import { cronogramaRoutes } from './routes/cronograma.routes';
import { integracionesRoutes } from './routes/integraciones.routes';
import { authenticateToken } from './middleware/auth.middleware';
import { env } from './config/env';

// Carga de env ahora se realiza en config/env.ts para asegurar orden correcto

const app = express();
const PORT = env.PORT;

// Railway termina TLS en su proxy
app.set('trust proxy', 1);

// Middleware de seguridad
const supabaseOrigin = new URL(env.SUPABASE_URL).origin;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", supabaseOrigin],
      frameSrc: ["'self'", 'blob:', supabaseOrigin],
      objectSrc: ["'self'", 'blob:', supabaseOrigin],
    },
  },
}));
app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  const allowed = (() => {
    // Requests sin origin (ej: Postman, curl)
    if (!origin) return true;
    // Mismo origen: el frontend lo sirve este mismo servidor
    try {
      if (new URL(origin).host === req.headers.host) return true;
    } catch {
      return false;
    }
    // En desarrollo, permitir cualquier localhost
    if (env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
    // Frontend alojado en otro dominio (opcional)
    return origin === env.FRONTEND_URL;
  })();
  callback(allowed ? null : new Error('Not allowed by CORS'), { origin: allowed, credentials: true });
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
app.use('/api/dut', authenticateToken, dutRoutes);
app.use('/api/cronograma', cronogramaRoutes);
app.use('/api/integraciones', integracionesRoutes);

// Rutas de API inexistentes: 404 en JSON (no caer en el fallback del frontend)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Frontend (build de Vite) servido por este mismo servidor
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  // Fallback de SPA: cualquier otra ruta GET devuelve index.html
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else if (env.NODE_ENV === 'production') {
  console.warn(`⚠️ No se encontró el build del frontend en ${frontendDist}`);
}

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} en uso. Cerrá otros procesos o cambiá PORT en .env`);
    process.exit(1);
  }
  throw err;
});

export default app;

