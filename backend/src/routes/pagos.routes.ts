import { Router } from 'express';
import { pagosController } from '../controllers/pagos.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de pagos
router.get('/venta/:ventaId', pagosController.getByVenta);
router.post('/', pagosController.create);
router.put('/:id', pagosController.update);
router.delete('/:id', pagosController.delete);

export { router as pagosRoutes };

