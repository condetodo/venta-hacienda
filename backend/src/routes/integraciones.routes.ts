import { Router } from 'express';
import {
  atlaUpload,
  integracionesController,
  requireAtlaKey,
} from '../controllers/integraciones.controller';

const router = Router();

// Atla se autentica con su propia clave de API, no con un usuario
router.use('/atla', requireAtlaKey);

router.get('/atla/ping', integracionesController.ping);
router.post('/atla/documentos', atlaUpload, integracionesController.recibirDocumento);

export { router as integracionesRoutes };
