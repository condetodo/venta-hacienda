import { Router } from 'express';
import { ventasController } from '../controllers/ventas.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Dashboard (ANTES de /:id para evitar conflicto con params)
router.get('/dashboard/stats', ventasController.getDashboardStats);
router.get('/dashboard/por-mes', ventasController.getVentasPorMes);

// Rutas de ventas
router.get('/', ventasController.getAll);
router.get('/:id', ventasController.getById);
router.post('/', ventasController.create);
router.put('/:id', ventasController.update);
router.delete('/:id', ventasController.delete);
router.post('/:id/marcar-retirado', ventasController.marcarComoRetirado);
router.patch('/:id/estado', ventasController.updateEstado);
router.post('/:id/asignar-precio', ventasController.asignarPrecioPorKilo);

export { router as ventasRoutes };

