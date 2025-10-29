import { Router } from 'express';
import { ventasController } from '../controllers/ventas.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de ventas
router.get('/', ventasController.getAll);
router.get('/:id', ventasController.getById);
router.post('/', ventasController.create);
router.put('/:id', ventasController.update);
router.delete('/:id', ventasController.delete);
router.post('/:id/marcar-retirado', ventasController.marcarComoRetirado);
router.patch('/:id/estado', ventasController.updateEstado);

export { router as ventasRoutes };

