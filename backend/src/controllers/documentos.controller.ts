import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadFile, deleteFile, getSignedUrl, supabase } from '../config/supabase';
import { env } from '../config/env';

export const documentosController = {
  // Probar configuración de Supabase
  testSupabase: async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('=== TEST SUPABASE ===');
      console.log('SUPABASE_URL:', env.SUPABASE_URL);
      console.log('SUPABASE_SERVICE_KEY:', env.SUPABASE_SERVICE_KEY ? 'Presente' : 'Ausente');
      console.log('SUPABASE_STORAGE_BUCKET:', env.SUPABASE_STORAGE_BUCKET);
      
      // Intentar listar buckets
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error listando buckets:', error);
        res.status(500).json({
          error: 'Error conectando con Supabase',
          details: error.message,
        });
        return;
      }
      
      console.log('Buckets disponibles:', buckets);
      
      res.json({
        message: 'Configuración de Supabase OK',
        buckets: buckets.map(b => b.name),
        bucketTarget: env.SUPABASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error('Error en testSupabase:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  },

  // Obtener documentos de una venta
  getByVenta: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ventaId } = req.params;

      const documentos = await prisma.documento.findMany({
        where: { ventaId },
        orderBy: { fechaCarga: 'desc' },
      });

      res.json({ documentos });
    } catch (error) {
      console.error('Error en getByVenta documentos:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Subir documentos
  upload: async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('=== UPLOAD DOCUMENTOS ===');
      console.log('VentaId:', req.params.ventaId);
      console.log('Files:', req.files);
      console.log('Body:', req.body);
      
      const { ventaId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        console.log('ERROR: No se proporcionaron archivos');
        res.status(400).json({
          error: 'No se proporcionaron archivos',
          code: 'NO_FILES',
        });
        return;
      }

      // Verificar que la venta existe
      console.log('Verificando venta...');
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
      });

      if (!venta) {
        console.log('ERROR: Venta no encontrada');
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }
      
      console.log('Venta encontrada:', venta.numeroDUT);

      const documentosSubidos = [];

      for (const file of files) {
        console.log(`Procesando archivo: ${file.originalname}`);
        
        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        const fileName = `${file.fieldname}_${timestamp}.${extension}`;
        const path = `ventas/${ventaId}/${fileName}`;

        console.log('Subiendo archivo a Supabase...');
        console.log('Bucket:', env.SUPABASE_STORAGE_BUCKET);
        console.log('Path:', path);
        console.log('MimeType:', file.mimetype);
        console.log('Size:', file.size);

        // Subir archivo a Supabase Storage
        const { url } = await uploadFile(
          env.SUPABASE_STORAGE_BUCKET,
          path,
          file.buffer,
          file.mimetype
        );

        console.log('Archivo subido exitosamente:', url);

        // Guardar información en base de datos
        console.log('Creando registro en BD...');
        const documento = await prisma.documento.create({
          data: {
            ventaId,
            tipo: file.fieldname as any, // El tipo viene del campo del formulario
            nombreArchivo: file.originalname,
            url,
            mimeType: file.mimetype,
            tamano: file.size,
          },
        });

        console.log('Documento creado:', documento.id);
        documentosSubidos.push(documento);
      }

      res.status(201).json({
        message: `${documentosSubidos.length} documento(s) subido(s) exitosamente`,
        documentos: documentosSubidos,
      });
    } catch (error) {
      console.error('Error en upload documentos:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Descargar documento
  download: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const documento = await prisma.documento.findUnique({
        where: { id },
      });

      if (!documento) {
        res.status(404).json({
          error: 'Documento no encontrado',
          code: 'DOCUMENTO_NOT_FOUND',
        });
        return;
      }

      // Generar URL firmada para descarga
      const signedUrl = await getSignedUrl(
        env.SUPABASE_STORAGE_BUCKET,
        documento.url.split('/').slice(-2).join('/'), // Extraer path del archivo
        3600 // 1 hora de expiración
      );

      res.json({ downloadUrl: signedUrl });
    } catch (error) {
      console.error('Error en download documento:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Eliminar documento
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const documento = await prisma.documento.findUnique({
        where: { id },
      });

      if (!documento) {
        res.status(404).json({
          error: 'Documento no encontrado',
          code: 'DOCUMENTO_NOT_FOUND',
        });
        return;
      }

      // Eliminar archivo de Supabase Storage
      const filePath = documento.url.split('/').slice(-2).join('/');
      await deleteFile(env.SUPABASE_STORAGE_BUCKET, filePath);

      // Eliminar registro de base de datos
      await prisma.documento.delete({
        where: { id },
      });

      res.json({ message: 'Documento eliminado exitosamente' });
    } catch (error) {
      console.error('Error en delete documento:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

