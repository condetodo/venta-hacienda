import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { z } from 'zod';
import { CategoriaAnimal, Establecimiento, Prisma, TipoDocumento } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { guardarDocumento } from '../services/documentos-storage.service';

// ---------------------------------------------------------------------------
// Integración con Atla (asistente de WhatsApp)
//
// Atla ya extrae los datos de cada DUT y remito. Acá solo se reciben los datos
// estructurados más el archivo original, y se crea o actualiza la venta.
// Todo lo que entra por acá queda marcado "a revisar".
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const atlaUpload = upload.single('archivo');

const sha256 = (value: string): Buffer => crypto.createHash('sha256').update(value).digest();

// Autenticación por clave de API (header X-API-Key o Authorization: Bearer)
export const requireAtlaKey = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.ATLA_API_KEY) {
    res.status(503).json({ error: 'Integración con Atla no configurada', code: 'INTEGRATION_DISABLED' });
    return;
  }

  const header = req.headers['x-api-key'];
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const provided = (Array.isArray(header) ? header[0] : header) || bearer;

  if (!provided || !crypto.timingSafeEqual(sha256(provided), sha256(env.ATLA_API_KEY))) {
    res.status(401).json({ error: 'Clave de API inválida', code: 'INVALID_API_KEY' });
    return;
  }

  next();
};

const textoOpcional = z.string().trim().nullish().transform((value) => (value ? value : null));
const fechaOpcional = z
  .string()
  .trim()
  .nullish()
  .transform((value) => {
    if (!value) return null;
    // Solo importa el día calendario: se descarta la hora para evitar corrimientos
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = new Date(match ? `${match[1]}T00:00:00.000Z` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  });

const payloadSchema = z.object({
  kind: z.enum(['DUT', 'REMITO']),
  externalId: textoOpcional, // id del documento en Atla
  number: z.string().trim().min(1, 'number es requerido'), // N° de DUT o de remito
  dutNumber: textoOpcional, // solo REMITO: N° del DUT con el que Atla lo emparejó
  issuedAt: fechaOpcional,
  loadDate: fechaOpcional,
  expiresAt: fechaOpcional,
  reason: textoOpcional,
  establishmentKey: textoOpcional,
  originEstablishment: textoOpcional,
  destHolder: textoOpcional,
  destRenspa: textoOpcional,
  lines: z
    .array(z.object({
      category: textoOpcional,
      quantity: z.coerce.number().int().nonnegative().nullish().transform((value) => value ?? null),
    }))
    .default([]),
  totalHead: z.coerce.number().int().nonnegative().nullish().transform((value) => value ?? null),
  needsReview: z.boolean().default(false),
  reviewReason: textoOpcional,
});

type AtlaPayload = z.infer<typeof payloadSchema>;

const normalizar = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const mapEstablecimiento = (payload: AtlaPayload): Establecimiento | null => {
  const texto = normalizar(`${payload.establishmentKey ?? ''} ${payload.originEstablishment ?? ''}`);
  if (/CURIOSO|ESCORIAL/.test(texto)) return 'CABO_CURIOSO';
  if (/PRADERA|LOCHIEL/.test(texto)) return 'LOCHIEL';
  return null;
};

const CATEGORIAS: [RegExp, CategoriaAnimal][] = [
  [/CORDER/, 'CORDERO'],
  [/BORREGA/, 'BORREGA'],
  [/BORREGO/, 'BORREGO'],
  [/CAPON/, 'CAPON'],
  [/CARNERO/, 'CARNERO'],
  [/OVEJA/, 'OVEJA'],
];

const mapCategoria = (texto: string | null): CategoriaAnimal | null => {
  if (!texto) return null;
  const normalizado = normalizar(texto);
  return CATEGORIAS.find(([pattern]) => pattern.test(normalizado))?.[1] ?? null;
};

const fechaCorta = (date: Date): string => date.toISOString().slice(0, 10);

// Busca en el cronograma la carga programada que corresponde a un DUT:
// misma fecha de carga (±1 día), todavía sin venta, y comprador con alguna palabra en común.
const buscarCargaProgramada = async (fechaCarga: Date, titularDestino: string) => {
  const dia = 24 * 60 * 60 * 1000;
  const candidatas = await prisma.cargaProgramada.findMany({
    where: {
      ventaId: null,
      estado: 'PROGRAMADA',
      fecha: { gte: new Date(fechaCarga.getTime() - dia), lte: new Date(fechaCarga.getTime() + dia) },
    },
  });

  const destino = normalizar(titularDestino);
  const coincidentes = candidatas.filter((carga) =>
    normalizar(carga.comprador)
      .split(/\s+/)
      .some((palabra) => palabra.length >= 4 && destino.includes(palabra)),
  );

  coincidentes.sort(
    (a, b) => Math.abs(a.fecha.getTime() - fechaCarga.getTime()) - Math.abs(b.fecha.getTime() - fechaCarga.getTime()),
  );
  return coincidentes[0] ?? null;
};

const AVISO_ARCHIVO_NO_GUARDADO = 'No se pudo guardar el archivo original';

const adjuntarArchivo = async (
  ventaId: string,
  tipo: TipoDocumento,
  file: Express.Multer.File | undefined,
  payload: AtlaPayload,
): Promise<{ documentoId: string | null; aviso: string | null }> => {
  if (!file) return { documentoId: null, aviso: 'Atla no envió el archivo original' };
  try {
    const documento = await guardarDocumento({
      ventaId,
      tipo,
      file,
      datosExtraidos: payload as unknown as Prisma.InputJsonValue,
      procesadoOCR: true,
    });
    return { documentoId: documento.id, aviso: null };
  } catch (error) {
    console.error('Atla: no se pudo guardar el archivo:', error instanceof Error ? error.message : error);
    return { documentoId: null, aviso: AVISO_ARCHIVO_NO_GUARDADO };
  }
};

// Cuando un reenvío completa un archivo que había faltado, se quita el aviso de la venta
// (solo si ya no queda ningún documento de Atla sin archivo).
const limpiarAvisoArchivo = async (ventaId: string): Promise<void> => {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { documentos: { where: { tipo: 'DUT' }, select: { id: true } } },
  });
  if (!venta?.motivoRevision?.includes(AVISO_ARCHIVO_NO_GUARDADO)) return;

  const remitos = (Array.isArray(venta.remitos) ? venta.remitos : []) as unknown as RemitoGuardado[];
  const faltaDUT = venta.origenCarga === 'ATLA' && venta.documentos.length === 0;
  const faltaRemito = remitos.some((remito) => remito.origen === 'ATLA' && !remito.documentoId);
  if (faltaDUT || faltaRemito) return;

  const motivoRevision = venta.motivoRevision
    .split('\n')
    .filter((linea) => linea !== AVISO_ARCHIVO_NO_GUARDADO)
    .join('\n');
  await prisma.venta.update({ where: { id: ventaId }, data: { motivoRevision } });
};

const sumarMotivo = (actual: string | null, nuevos: string[]): string =>
  [...(actual ? actual.split('\n') : []), ...nuevos].filter((item, index, all) => item && all.indexOf(item) === index).join('\n');

const procesarDUT = async (payload: AtlaPayload, file: Express.Multer.File | undefined, res: Response): Promise<void> => {
  const numeroDUT = payload.number;
  const existente = await prisma.venta.findUnique({
    where: { numeroDUT },
    include: { documentos: { where: { tipo: 'DUT' }, select: { id: true } } },
  });

  // La venta ya existe: no se pisan datos que una persona pudo haber corregido.
  if (existente) {
    let documentoId: string | null = null;
    if (existente.documentos.length === 0 && file) {
      documentoId = (await adjuntarArchivo(existente.id, 'DUT', file, payload)).documentoId;
      if (documentoId) await limpiarAvisoArchivo(existente.id);
    }
    if (!existente.atlaDocId && payload.externalId) {
      await prisma.venta.update({ where: { id: existente.id }, data: { atlaDocId: payload.externalId } });
    }
    res.json({ ok: true, action: 'exists', ventaId: existente.id, numeroDUT, documentoId });
    return;
  }

  const motivos: string[] = ['DUT cargado automáticamente por Atla'];
  if (payload.needsReview) motivos.push(`Atla lo marcó para revisar${payload.reviewReason ? `: ${payload.reviewReason}` : ''}`);

  const establecimiento = mapEstablecimiento(payload);
  if (!establecimiento) motivos.push('No se pudo identificar el establecimiento emisor (se asumió Lochiel)');

  const lineas = payload.lines.filter((linea) => (linea.quantity ?? 0) > 0);
  const principal = [...lineas].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0];
  const categoria = mapCategoria(principal?.category ?? null);
  if (!categoria) motivos.push(`Categoría no reconocida${principal?.category ? ` ("${principal.category}")` : ''} (se asumió oveja)`);
  if (lineas.length > 1) {
    motivos.push(`El DUT tiene varias categorías: ${lineas.map((linea) => `${linea.quantity} ${linea.category ?? '?'}`).join(', ')}`);
  }

  const cantidad = payload.totalHead ?? lineas.reduce((total, linea) => total + (linea.quantity ?? 0), 0);
  if (!cantidad) motivos.push('Falta la cantidad de cabezas');
  if (!payload.destHolder) motivos.push('Falta el titular de destino');
  if (!payload.issuedAt) motivos.push('Falta la fecha de emisión (se usó la fecha de hoy)');
  if (!payload.loadDate) motivos.push('Falta la fecha de carga (se usó la de emisión)');
  if (!payload.reason) motivos.push('Falta el motivo del DUT');

  const fechaEmision = payload.issuedAt ?? new Date();
  const fechaCarga = payload.loadDate ?? fechaEmision;
  const titularDestino = payload.destHolder ?? 'SIN DATO';

  const carga = await buscarCargaProgramada(fechaCarga, titularDestino);
  if (!carga) motivos.push('No coincide con ninguna carga programada del cronograma');
  else if (cantidad && carga.cantidad !== cantidad) {
    motivos.push(`El cronograma preveía ${carga.cantidad} cabezas y el DUT autoriza ${cantidad}`);
  }

  const venta = await prisma.venta.create({
    data: {
      numeroDUT,
      establecimientoEmisor: establecimiento ?? 'LOCHIEL',
      titularDestino,
      numeroRespaDestino: payload.destRenspa,
      fechaEmisionDUT: fechaEmision,
      fechaCargaDUT: fechaCarga,
      fechaVencimientoDUT: payload.expiresAt,
      motivo: payload.reason ?? 'SIN DATO',
      categoria: categoria ?? 'OVEJA',
      cantidadEnDUT: cantidad,
      origenCarga: 'ATLA',
      pendienteRevision: true,
      motivoRevision: motivos.join('\n'),
      atlaDocId: payload.externalId,
    },
  });

  if (carga) {
    await prisma.cargaProgramada.update({ where: { id: carga.id }, data: { ventaId: venta.id } });
  }

  const archivo = await adjuntarArchivo(venta.id, 'DUT', file, payload);
  if (archivo.aviso) {
    await prisma.venta.update({
      where: { id: venta.id },
      data: { motivoRevision: sumarMotivo(venta.motivoRevision, [archivo.aviso]) },
    });
  }

  res.status(201).json({
    ok: true,
    action: 'created',
    ventaId: venta.id,
    numeroDUT,
    documentoId: archivo.documentoId,
    cargaProgramadaId: carga?.id ?? null,
  });
};

interface RemitoGuardado {
  numero: string;
  fecha: string;
  cantidad: number;
  documentoId?: string;
  origen?: string;
}

const procesarRemito = async (payload: AtlaPayload, file: Express.Multer.File | undefined, res: Response): Promise<void> => {
  if (!payload.dutNumber) {
    res.status(422).json({
      error: 'El remito debe venir emparejado con un DUT (dutNumber)',
      code: 'DUT_NUMBER_REQUIRED',
    });
    return;
  }

  const venta = await prisma.venta.findUnique({ where: { numeroDUT: payload.dutNumber } });
  if (!venta) {
    res.status(404).json({
      error: `No existe una venta con DUT ${payload.dutNumber}. Enviá primero el DUT.`,
      code: 'DUT_NOT_FOUND',
    });
    return;
  }

  const remitos = (Array.isArray(venta.remitos) ? venta.remitos : []) as unknown as RemitoGuardado[];
  const yaCargado = remitos.find((remito) => String(remito.numero) === payload.number);
  if (yaCargado) {
    // El remito ya está: solo se completa el archivo si había quedado sin guardar
    let documentoId: string | null = yaCargado.documentoId ?? null;
    if (!documentoId && file) {
      documentoId = (await adjuntarArchivo(venta.id, 'REMITO_CAMPO', file, payload)).documentoId;
      if (documentoId) {
        const completados = remitos.map((remito) => (remito === yaCargado ? { ...remito, documentoId } : remito));
        await prisma.venta.update({
          where: { id: venta.id },
          data: { remitos: completados as unknown as Prisma.InputJsonValue },
        });
        await limpiarAvisoArchivo(venta.id);
      }
    }
    res.json({ ok: true, action: 'exists', ventaId: venta.id, numeroDUT: venta.numeroDUT, documentoId });
    return;
  }

  const cantidad = payload.totalHead ?? payload.lines.reduce((total, linea) => total + (linea.quantity ?? 0), 0);
  const fecha = payload.issuedAt ?? payload.loadDate ?? new Date();
  const archivo = await adjuntarArchivo(venta.id, 'REMITO_CAMPO', file, payload);

  const actualizados: RemitoGuardado[] = [
    ...remitos,
    {
      numero: payload.number,
      fecha: fechaCorta(fecha),
      cantidad,
      origen: 'ATLA',
      ...(archivo.documentoId ? { documentoId: archivo.documentoId } : {}),
    },
  ];
  const cantidadCargada = actualizados.reduce((total, remito) => total + (remito.cantidad || 0), 0);

  const motivos: string[] = [`Remito ${payload.number} cargado automáticamente por Atla`];
  if (payload.needsReview) motivos.push(`Atla lo marcó para revisar${payload.reviewReason ? `: ${payload.reviewReason}` : ''}`);
  if (!cantidad) motivos.push(`El remito ${payload.number} no tiene cantidad de cabezas`);
  if (cantidadCargada > venta.cantidadEnDUT) {
    motivos.push(`Se cargaron ${cantidadCargada} cabezas y el DUT autoriza ${venta.cantidadEnDUT}`);
  }
  if (archivo.aviso) motivos.push(archivo.aviso);

  await prisma.venta.update({
    where: { id: venta.id },
    data: {
      remitos: actualizados as unknown as Prisma.InputJsonValue,
      cantidadCargada,
      fechaCargaReal: venta.fechaCargaReal ?? fecha,
      // Solo avanza el estado si la venta todavía no había sido retirada
      ...(venta.estado === 'PENDIENTE' ? { estado: 'RETIRADO' as const } : {}),
      pendienteRevision: true,
      motivoRevision: sumarMotivo(venta.pendienteRevision ? venta.motivoRevision : null, motivos),
    },
  });

  // La carga programada asociada pasa a "cargada"
  const cargas = await prisma.cargaProgramada.updateMany({
    where: { ventaId: venta.id, estado: 'PROGRAMADA' },
    data: { estado: 'CARGADA' },
  });

  res.status(201).json({
    ok: true,
    action: 'remito_added',
    ventaId: venta.id,
    numeroDUT: venta.numeroDUT,
    documentoId: archivo.documentoId,
    cargasMarcadas: cargas.count,
  });
};

export const integracionesController = {
  // Permite a Atla comprobar que la clave y la URL son correctas
  ping: (_req: Request, res: Response): void => {
    res.json({ ok: true });
  },

  // Recibe un DUT o un remito. Multipart: campo "payload" (JSON) + archivo opcional "archivo".
  // También acepta JSON puro cuando no hay archivo.
  recibirDocumento: async (req: Request, res: Response): Promise<void> => {
    try {
      let raw: unknown = req.body;
      if (typeof req.body?.payload === 'string') {
        try {
          raw = JSON.parse(req.body.payload);
        } catch {
          res.status(400).json({ error: 'El campo payload no es JSON válido', code: 'INVALID_JSON' });
          return;
        }
      }

      const parsed = payloadSchema.safeParse(raw);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Datos inválidos',
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
        });
        return;
      }

      if (parsed.data.kind === 'DUT') await procesarDUT(parsed.data, req.file, res);
      else await procesarRemito(parsed.data, req.file, res);
    } catch (error) {
      // Dos envíos simultáneos del mismo DUT: el segundo choca con el índice único
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.status(409).json({ error: 'El DUT ya está siendo procesado, reintentá', code: 'DUPLICATE' });
        return;
      }
      console.error('Error en integración Atla:', error);
      res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_SERVER_ERROR' });
    }
  },
};
