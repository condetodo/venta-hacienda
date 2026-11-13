import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Las fechas del cronograma son días calendario: viajan como "YYYY-MM-DD"
// y se guardan en una columna DATE, sin hora ni zona horaria.
const toDate = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`);
const toFechaString = (date: Date): string => date.toISOString().slice(0, 10);

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value) => (value ? value : null));

const cargaSchema = z.object({
  fecha: z.string().regex(FECHA_REGEX, 'La fecha debe tener formato YYYY-MM-DD'),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0').max(100000),
  categoria: z.string().trim().min(1, 'La categoría es requerida').max(100),
  comprador: z.string().trim().min(1, 'El comprador es requerido').max(150),
  origen: textoOpcional,
  condiciones: textoOpcional,
  notas: textoOpcional,
  estado: z.enum(['PROGRAMADA', 'CARGADA', 'CANCELADA']).default('PROGRAMADA'),
  ventaId: z.string().uuid().nullish().transform((value) => value ?? null),
});

type CargaConVenta = {
  id: string;
  fecha: Date;
  venta: { id: string; numeroDUT: string; estado: string } | null;
  [key: string]: unknown;
};

const serialize = (carga: CargaConVenta) => ({
  ...carga,
  fecha: toFechaString(carga.fecha),
});

const includeVenta = {
  venta: { select: { id: true, numeroDUT: true, estado: true } },
} as const;

const validationError = (res: Response, error: z.ZodError): void => {
  res.status(400).json({
    error: error.issues[0]?.message || 'Datos inválidos',
    code: 'VALIDATION_ERROR',
    details: error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
  });
};

const internalError = (res: Response, context: string, error: unknown): void => {
  console.error(`Error en ${context}:`, error);
  res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_SERVER_ERROR' });
};

export const cronogramaController = {
  // Cargas programadas entre dos fechas (inclusive)
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { desde, hasta } = req.query;
      if (
        typeof desde !== 'string' || typeof hasta !== 'string' ||
        !FECHA_REGEX.test(desde) || !FECHA_REGEX.test(hasta)
      ) {
        res.status(400).json({
          error: 'Parámetros requeridos: desde y hasta (YYYY-MM-DD)',
          code: 'MISSING_RANGE',
        });
        return;
      }

      const cargas = await prisma.cargaProgramada.findMany({
        where: { fecha: { gte: toDate(desde), lte: toDate(hasta) } },
        include: includeVenta,
        orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
      });

      res.json({ cargas: cargas.map(serialize) });
    } catch (error) {
      internalError(res, 'getAll cronograma', error);
    }
  },

  // Valores ya usados, para autocompletar el formulario
  getSugerencias: async (_req: Request, res: Response): Promise<void> => {
    try {
      const [compradores, categorias, origenes] = await Promise.all([
        prisma.cargaProgramada.findMany({ distinct: ['comprador'], select: { comprador: true }, orderBy: { comprador: 'asc' } }),
        prisma.cargaProgramada.findMany({ distinct: ['categoria'], select: { categoria: true }, orderBy: { categoria: 'asc' } }),
        prisma.cargaProgramada.findMany({ distinct: ['origen'], select: { origen: true }, where: { origen: { not: null } }, orderBy: { origen: 'asc' } }),
      ]);

      res.json({
        compradores: compradores.map((item) => item.comprador),
        categorias: categorias.map((item) => item.categoria),
        origenes: origenes.map((item) => item.origen),
      });
    } catch (error) {
      internalError(res, 'getSugerencias cronograma', error);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = cargaSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const { fecha, ...data } = parsed.data;
      const carga = await prisma.cargaProgramada.create({
        data: { ...data, fecha: toDate(fecha) },
        include: includeVenta,
      });

      res.status(201).json({ carga: serialize(carga) });
    } catch (error) {
      internalError(res, 'create cronograma', error);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const parsed = cargaSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const existing = await prisma.cargaProgramada.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Carga programada no encontrada', code: 'NOT_FOUND' });
        return;
      }

      const { fecha, ...data } = parsed.data;
      const carga = await prisma.cargaProgramada.update({
        where: { id },
        data: { ...data, ...(fecha ? { fecha: toDate(fecha) } : {}) },
        include: includeVenta,
      });

      res.json({ carga: serialize(carga) });
    } catch (error) {
      internalError(res, 'update cronograma', error);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existing = await prisma.cargaProgramada.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Carga programada no encontrada', code: 'NOT_FOUND' });
        return;
      }

      await prisma.cargaProgramada.delete({ where: { id } });
      res.json({ message: 'Carga programada eliminada' });
    } catch (error) {
      internalError(res, 'delete cronograma', error);
    }
  },
};
