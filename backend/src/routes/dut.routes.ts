import { Router } from 'express';
import { dutController } from '../controllers/dut.controller';

const router = Router();

// Extraer datos de archivo DUT
router.post('/extract', 
  dutController.uploadMiddleware,
  dutController.extractFromFile
);

// Extraer datos y guardar documento asociado a una venta
router.post('/extract-and-save', 
  dutController.uploadMiddleware,
  dutController.extractAndSaveDocument
);

// Subir documento a una venta existente
router.post('/upload-to-venta', 
  dutController.uploadMiddleware,
  dutController.uploadDocumentToVenta
);

export default router;


