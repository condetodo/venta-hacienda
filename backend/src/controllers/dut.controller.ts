import { Request, Response } from 'express';
import multer from 'multer';
import { dutExtractionService } from '../services/dut-extraction.service';
import { guardarDocumento } from '../services/documentos-storage.service';
import { prisma } from '../config/database';

// Configuración de multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado. Use PDF, JPG o PNG.'));
    }
  },
});

export const dutController = {
  // Extraer datos de un archivo DUT
  extractFromFile: async (req: Request, res: Response) => {
    try {
      console.log('=== INICIO EXTRACCIÓN DUT ===');
      console.log('Archivo recibido:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No hay archivo');
      console.log('Body recibido:', req.body);

      if (!req.file) {
        console.log('ERROR: No se proporcionó ningún archivo');
        return res.status(400).json({
          error: 'No se proporcionó ningún archivo'
        });
      }

      const { tipoArchivo } = req.body;
      console.log('Tipo de archivo:', tipoArchivo);
      
      if (!tipoArchivo || !['pdf', 'imagen'].includes(tipoArchivo)) {
        console.log('ERROR: Tipo de archivo no válido');
        return res.status(400).json({
          error: 'Tipo de archivo no válido. Use "pdf" o "imagen"'
        });
      }

      console.log('Iniciando procesamiento del archivo...');
      // Procesar el archivo
      const resultado = await dutExtractionService.processFile(req.file, tipoArchivo);
      console.log('Resultado de procesamiento:', resultado);

      return res.json({
        success: true,
        data: resultado
      });

    } catch (error: any) {
      console.error('Error procesando archivo DUT:', error);
      console.error('Stack trace:', error.stack);
      return res.status(500).json({
        error: error.message || 'Error al procesar el archivo DUT'
      });
    }
  },

  // Extraer datos y guardar documento asociado a una venta
  extractAndSaveDocument: async (req: Request, res: Response) => {
    try {
      console.log('=== INICIO EXTRACCIÓN Y GUARDADO DUT ===');
      console.log('Archivo recibido:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No hay archivo');
      console.log('Body recibido:', req.body);

      if (!req.file) {
        console.log('ERROR: No se proporcionó ningún archivo');
        return res.status(400).json({
          error: 'No se proporcionó ningún archivo'
        });
      }

      const { tipoArchivo, ventaId } = req.body;
      console.log('Tipo de archivo:', tipoArchivo);
      console.log('Venta ID:', ventaId);
      
      if (!tipoArchivo || !['pdf', 'imagen'].includes(tipoArchivo)) {
        console.log('ERROR: Tipo de archivo no válido');
        return res.status(400).json({
          error: 'Tipo de archivo no válido. Use "pdf" o "imagen"'
        });
      }

      if (!ventaId) {
        console.log('ERROR: No se proporcionó ventaId');
        return res.status(400).json({
          error: 'Se requiere ventaId para asociar el documento'
        });
      }

      // Verificar que la venta existe
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId }
      });

      if (!venta) {
        console.log('ERROR: Venta no encontrada');
        return res.status(404).json({
          error: 'Venta no encontrada'
        });
      }

      console.log('Iniciando procesamiento del archivo...');
      // Procesar el archivo
      const resultado = await dutExtractionService.processFile(req.file, tipoArchivo);
      console.log('Resultado de procesamiento:', resultado);

      console.log('Guardando documento...');
      const documento = await guardarDocumento({
        ventaId,
        tipo: 'DUT',
        file: req.file,
        datosExtraidos: JSON.stringify(resultado),
        procesadoOCR: true,
      });
      console.log('Documento guardado:', documento.id);

      return res.json({
        success: true,
        data: resultado,
        documento: {
          id: documento.id,
          nombreArchivo: documento.nombreArchivo,
          url: documento.url,
          fechaCarga: documento.fechaCarga
        }
      });

    } catch (error: any) {
      console.error('Error procesando archivo DUT:', error);
      console.error('Stack trace:', error.stack);
      return res.status(500).json({
        error: error.message || 'Error al procesar el archivo DUT'
      });
    }
  },

  // Subir documento a una venta existente
  uploadDocumentToVenta: async (req: Request, res: Response) => {
    try {
      console.log('=== SUBIR DOCUMENTO A VENTA ===');
      console.log('Archivo recibido:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No hay archivo');
      console.log('Body recibido:', req.body);

      if (!req.file) {
        console.log('ERROR: No se proporcionó ningún archivo');
        return res.status(400).json({
          error: 'No se proporcionó ningún archivo'
        });
      }

      const { ventaId, tipoDocumento = 'DUT' } = req.body;
      console.log('Venta ID:', ventaId);
      console.log('Tipo documento:', tipoDocumento);

      if (!ventaId) {
        console.log('ERROR: No se proporcionó ventaId');
        return res.status(400).json({
          error: 'Se requiere ventaId para asociar el documento'
        });
      }

      // Verificar que la venta existe
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId }
      });

      if (!venta) {
        console.log('ERROR: Venta no encontrada');
        return res.status(404).json({
          error: 'Venta no encontrada'
        });
      }

      console.log('Guardando documento...');
      const documento = await guardarDocumento({ ventaId, tipo: 'DUT', file: req.file, procesadoOCR: true });
      console.log('Documento guardado:', documento.id);

      return res.json({
        success: true,
        documento: {
          id: documento.id,
          nombreArchivo: documento.nombreArchivo,
          url: documento.url,
          fechaCarga: documento.fechaCarga
        }
      });

    } catch (error: any) {
      console.error('Error subiendo documento:', error);
      console.error('Stack trace:', error.stack);
      return res.status(500).json({
        error: error.message || 'Error al subir el documento'
      });
    }
  },

  // Middleware para subida de archivos
  uploadMiddleware: upload.single('archivo')
};
