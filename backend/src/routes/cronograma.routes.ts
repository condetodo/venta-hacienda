import { Router } from 'express';
import { cronogramaController } from '../controllers/cronograma.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.get('/', cronogramaController.getAll);
router.get('/sugerencias', cronogramaController.getSugerencias);
router.post('/', cronogramaController.create);
router.put('/:id', cronogramaController.update);
router.delete('/:id', cronogramaController.delete);

export { router as cronogramaRoutes };
