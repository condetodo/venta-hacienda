import { Router } from 'express';
import { dolarController } from '../controllers/dolar.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de dólar
router.get('/cotizaciones', dolarController.getCotizaciones);
router.get('/cotizacion/:tipo', dolarController.getCotizacion);

export { router as dolarRoutes };

