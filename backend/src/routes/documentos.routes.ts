import { Router } from 'express';
import { documentosController } from '../controllers/documentos.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload, handleUploadError } from '../middleware/upload.middleware';

const router = Router();

// Endpoint de diagnóstico público (no requiere token)
router.get('/test-supabase-public', documentosController.testSupabase);

// Todas las rutas siguientes requieren autenticación
router.use(authenticateToken);

// Rutas de documentos (protegidas)
router.get('/test-supabase', documentosController.testSupabase);
router.get('/venta/:ventaId', documentosController.getByVenta);
router.post('/upload/:ventaId', upload.array('files', 5), handleUploadError, documentosController.upload);
router.get('/:id/download', documentosController.download);
router.delete('/:id', documentosController.delete);

export { router as documentosRoutes };

