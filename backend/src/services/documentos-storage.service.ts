import crypto from 'crypto';
import { Prisma, TipoDocumento } from '@prisma/client';
import { prisma } from '../config/database';

// Los archivos se guardan en Postgres (tabla DocumentoArchivo), separados de los
// metadatos para que listar documentos no traiga el contenido.

export const rutaDescarga = (documentoId: string): string => `/api/documentos/${documentoId}/download`;

interface NuevoDocumento {
  ventaId: string;
  tipo: TipoDocumento;
  file: Express.Multer.File;
  datosExtraidos?: Prisma.InputJsonValue;
  procesadoOCR?: boolean;
}

// Crea el registro del documento junto con su archivo, en una sola operación
export const guardarDocumento = async ({ ventaId, tipo, file, datosExtraidos, procesadoOCR = false }: NuevoDocumento) => {
  const id = crypto.randomUUID();
  return prisma.documento.create({
    data: {
      id,
      ventaId,
      tipo,
      nombreArchivo: file.originalname,
      url: rutaDescarga(id),
      mimeType: file.mimetype,
      tamano: file.size,
      ...(datosExtraidos !== undefined ? { datosExtraidos } : {}),
      procesadoOCR,
      archivo: { create: { contenido: file.buffer } },
    },
  });
};

// Tipos que el navegador puede mostrar sin riesgo; el resto se entrega como descarga binaria
const TIPOS_VISIBLES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export const tipoParaEntregar = (mimeType: string): string =>
  TIPOS_VISIBLES.has(mimeType.toLowerCase()) ? mimeType : 'application/octet-stream';
