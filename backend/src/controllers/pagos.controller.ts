import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { Decimal } from 'decimal.js';

export const pagosController = {
  // Obtener pagos de una venta
  getByVenta: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ventaId } = req.params;

      const pagos = await prisma.pago.findMany({
        where: { ventaId },
        orderBy: { fecha: 'desc' },
      });

      res.json({ pagos });
    } catch (error) {
      console.error('Error en getByVenta pagos:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Crear nuevo pago
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const pagoData = req.body;
      console.log('Datos recibidos para crear pago:', JSON.stringify(pagoData, null, 2));

      // Validaciones básicas
      if (!pagoData.ventaId || !pagoData.monto || !pagoData.fecha || !pagoData.formaPago) {
        console.log('Campos faltantes:', {
          ventaId: !!pagoData.ventaId,
          monto: !!pagoData.monto,
          fecha: !!pagoData.fecha,
          formaPago: !!pagoData.formaPago,
        });
        res.status(400).json({
          error: 'Campos requeridos: ventaId, monto, fecha, formaPago',
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Verificar que la venta existe
      const venta = await prisma.venta.findUnique({
        where: { id: pagoData.ventaId },
      });

      if (!venta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      // Convertir fecha de string a DateTime
      const fechaPago = new Date(pagoData.fecha);
      if (isNaN(fechaPago.getTime())) {
        res.status(400).json({
          error: 'Fecha inválida',
          code: 'INVALID_DATE',
        });
        return;
      }

      // Crear pago
      const pago = await prisma.pago.create({
        data: {
          ventaId: pagoData.ventaId,
          monto: new Decimal(pagoData.monto),
          moneda: pagoData.moneda || 'ARS',
          tipoCambio: pagoData.tipoCambio ? new Decimal(pagoData.tipoCambio) : null,
          fecha: fechaPago,
          formaPago: pagoData.formaPago,
          referencia: pagoData.referencia || null,
          dondeSeAcredita: pagoData.dondeSeAcredita || null,
          comprobanteUrl: pagoData.comprobanteUrl || null,
          observaciones: pagoData.observaciones || null,
        },
      });

      // Calcular total pagado (convirtiendo USD a ARS)
      const todosLosPagos = await prisma.pago.findMany({
        where: { ventaId: pagoData.ventaId },
      });

      const totalPagadoDecimal = todosLosPagos.reduce((sum, p) => {
        const monto = new Decimal(p.monto);
        if (p.moneda === 'USD' && p.tipoCambio) {
          return sum.add(monto.mul(new Decimal(p.tipoCambio)));
        }
        return sum.add(monto);
      }, new Decimal(0));

      // Actualizar solo el totalPagado
      // NO calcular precio si ya existe (eso se hace con asignarPrecioPorKilo)
      const updateData: any = {
        totalPagado: totalPagadoDecimal.toNumber(),
      };

      // Validar que la venta tenga precio acordado antes de registrar pago
      if (!venta.totalAPagar || venta.totalAPagar.equals(0)) {
        res.status(400).json({
          error: 'La venta no tiene precio acordado. Debe asignar el precio por kilo primero.',
          code: 'PRECIO_NO_ASIGNADO',
        });
        return;
      }

      // Actualizar venta
      await prisma.venta.update({
        where: { id: pagoData.ventaId },
        data: updateData,
      });

      res.status(201).json({ pago });
    } catch (error: any) {
      console.error('Error en create pago:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        error: error.message || 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  },

  // Actualizar pago
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que el pago existe
      const existingPago = await prisma.pago.findUnique({
        where: { id },
      });

      if (!existingPago) {
        res.status(404).json({
          error: 'Pago no encontrado',
          code: 'PAGO_NOT_FOUND',
        });
        return;
      }

      // Actualizar pago
      const pago = await prisma.pago.update({
        where: { id },
        data: {
          ...updateData,
          monto: updateData.monto ? new Decimal(updateData.monto) : undefined,
          tipoCambio: updateData.tipoCambio ? new Decimal(updateData.tipoCambio) : undefined,
        },
      });

      // Recalcular total pagado en la venta (convirtiendo USD a ARS)
      const todosLosPagos = await prisma.pago.findMany({
        where: { ventaId: existingPago.ventaId },
      });

      const totalPagadoRecalc = todosLosPagos.reduce((sum, p) => {
        const m = new Decimal(p.monto);
        if (p.moneda === 'USD' && p.tipoCambio) {
          return sum.add(m.mul(new Decimal(p.tipoCambio)));
        }
        return sum.add(m);
      }, new Decimal(0));

      await prisma.venta.update({
        where: { id: existingPago.ventaId },
        data: {
          totalPagado: totalPagadoRecalc.toNumber(),
        },
      });

      res.json({ pago });
    } catch (error) {
      console.error('Error en update pago:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Eliminar pago
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const pago = await prisma.pago.findUnique({
        where: { id },
      });

      if (!pago) {
        res.status(404).json({
          error: 'Pago no encontrado',
          code: 'PAGO_NOT_FOUND',
        });
        return;
      }

      const ventaId = pago.ventaId;

      // Eliminar pago
      await prisma.pago.delete({
        where: { id },
      });

      // Recalcular total pagado en la venta (convirtiendo USD a ARS)
      const pagosRestantes = await prisma.pago.findMany({
        where: { ventaId },
      });

      const totalPagadoRecalc = pagosRestantes.reduce((sum, p) => {
        const m = new Decimal(p.monto);
        if (p.moneda === 'USD' && p.tipoCambio) {
          return sum.add(m.mul(new Decimal(p.tipoCambio)));
        }
        return sum.add(m);
      }, new Decimal(0));

      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          totalPagado: totalPagadoRecalc.toNumber(),
        },
      });

      res.json({ message: 'Pago eliminado exitosamente' });
    } catch (error) {
      console.error('Error en delete pago:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

