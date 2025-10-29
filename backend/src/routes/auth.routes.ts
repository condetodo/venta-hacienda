import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Rutas de autenticación
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);

export { router as authRoutes };

