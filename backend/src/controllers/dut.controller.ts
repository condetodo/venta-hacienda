import { Request, Response } from 'express';
import multer from 'multer';
import { dutExtractionService } from '../services/dut-extraction.service';
import { supabase } from '../config/supabase';
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

// Función para guardar documento en Supabase Storage
const saveDocumentToStorage = async (file: Express.Multer.File, ventaId: string): Promise<string> => {
  try {
    const fileName = `${ventaId}/${Date.now()}-${file.originalname}`;
    
    const { data, error } = await supabase.storage
      .from('documentos-hacienda')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Error subiendo archivo a Supabase:', error);
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('documentos-hacienda')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error en saveDocumentToStorage:', error);
    throw error;
  }
};

// Función para crear registro de documento en la base de datos
const createDocumentRecord = async (ventaId: string, file: Express.Multer.File, url: string, datosExtraidos: any) => {
  try {
    const documento = await prisma.documento.create({
      data: {
        ventaId,
        tipo: 'DUT',
        nombreArchivo: file.originalname,
        url,
        mimeType: file.mimetype,
        tamano: file.size,
        datosExtraidos: JSON.stringify(datosExtraidos),
        procesadoOCR: true,
        fechaCarga: new Date(),
      }
    });

    return documento;
  } catch (error) {
    console.error('Error creando registro de documento:', error);
    throw error;
  }
};

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

      res.json({
        success: true,
        data: resultado
      });

    } catch (error: any) {
      console.error('Error procesando archivo DUT:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
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

      console.log('Guardando documento en storage...');
      // Guardar documento en Supabase Storage
      const documentUrl = await saveDocumentToStorage(req.file, ventaId);
      console.log('Documento guardado en:', documentUrl);

      console.log('Creando registro de documento en BD...');
      // Crear registro en la base de datos
      const documento = await createDocumentRecord(ventaId, req.file, documentUrl, resultado);
      console.log('Registro de documento creado:', documento.id);

      res.json({
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
      res.status(500).json({
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

      console.log('Guardando documento en storage...');
      // Guardar documento en Supabase Storage
      const documentUrl = await saveDocumentToStorage(req.file, ventaId);
      console.log('Documento guardado en:', documentUrl);

      console.log('Creando registro de documento en BD...');
      // Crear registro en la base de datos
      const documento = await createDocumentRecord(ventaId, req.file, documentUrl, null);
      console.log('Registro de documento creado:', documento.id);

      res.json({
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
      res.status(500).json({
        error: error.message || 'Error al subir el documento'
      });
    }
  },

  // Middleware para subida de archivos
  uploadMiddleware: upload.single('archivo')
};
