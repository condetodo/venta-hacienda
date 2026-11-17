import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { guardarDocumento, tipoParaEntregar } from '../services/documentos-storage.service';

export const documentosController = {
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
      const tipoDocumentoRaw = (req.body?.tipoDocumento || '').toString().toUpperCase();
      const allowedTipos = ['DUT', 'REMITO', 'ROMANEO'];
      // Mapear a enum de Prisma cuando sea necesario
      const tipoToEnum = (tipo: string): 'DUT' | 'REMITO_CAMPO' | 'ROMANEO' => {
        if (tipo === 'REMITO') return 'REMITO_CAMPO';
        if (tipo === 'ROMANEO') return 'ROMANEO';
        return 'DUT';
      };
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        console.log('ERROR: No se proporcionaron archivos');
        res.status(400).json({
          error: 'No se proporcionaron archivos',
          code: 'NO_FILES',
        });
        return;
      }

      if (!allowedTipos.includes(tipoDocumentoRaw)) {
        res.status(400).json({
          error: 'Tipo de documento inválido. Use DUT, REMITO o ROMANEO',
          code: 'INVALID_DOCUMENT_TYPE',
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
        
        const documento = await guardarDocumento({
          ventaId,
          tipo: tipoToEnum(tipoDocumentoRaw),
          file,
        });

        console.log('Documento creado:', documento.id);
        documentosSubidos.push(documento);
      }

      res.status(201).json({
        message: `${documentosSubidos.length} documento(s) subido(s) exitosamente`,
        documentos: documentosSubidos,
      });
    } catch (error: any) {
      console.error('Error en upload documentos:', error);
      const message = error?.message || 'Error interno del servidor';
      const details = error?.cause?.message || error?.stack || undefined;
      res.status(500).json({
        error: message,
        code: 'INTERNAL_SERVER_ERROR',
        details,
      });
    }
  },

  // Descargar documento (devuelve el archivo)
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

      const archivo = await prisma.documentoArchivo.findUnique({
        where: { documentoId: id },
      });

      // Documentos cargados antes de pasar los archivos a Postgres: el archivo ya no existe
      if (!archivo) {
        res.status(404).json({
          error: 'El archivo de este documento ya no está disponible. Volvé a subirlo.',
          code: 'ARCHIVO_NO_DISPONIBLE',
        });
        return;
      }

      const nombre = encodeURIComponent(documento.nombreArchivo);
      res.set({
        'Content-Type': tipoParaEntregar(documento.mimeType),
        'Content-Length': String(archivo.contenido.length),
        'Content-Disposition': `inline; filename*=UTF-8''${nombre}`,
        'Cache-Control': 'private, max-age=3600',
      });
      res.send(Buffer.from(archivo.contenido));
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

      // Eliminar el registro (el archivo se borra en cascada)
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

