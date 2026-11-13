import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Rutas de autenticación
router.post('/login', authController.login);
router.post('/register', optionalAuth, authController.register);
router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);

export { router as authRoutes };

