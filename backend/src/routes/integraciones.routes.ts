import { Router } from 'express';
import {
  atlasUpload,
  integracionesController,
  requireAtlasKey,
} from '../controllers/integraciones.controller';

const router = Router();

// Atlas se autentica con su propia clave de API, no con un usuario
router.use('/atlas', requireAtlasKey);

router.get('/atlas/ping', integracionesController.ping);
router.post('/atlas/documentos', atlasUpload, integracionesController.recibirDocumento);

export { router as integracionesRoutes };
