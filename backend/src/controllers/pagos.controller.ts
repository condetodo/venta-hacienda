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

      // Validaciones básicas
      if (!pagoData.ventaId || !pagoData.monto || !pagoData.fecha || !pagoData.formaPago) {
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

      // Crear pago
      const pago = await prisma.pago.create({
        data: {
          ...pagoData,
          monto: new Decimal(pagoData.monto),
          tipoCambio: pagoData.tipoCambio ? new Decimal(pagoData.tipoCambio) : null,
        },
      });

      // Actualizar total pagado en la venta
      const totalPagado = await prisma.pago.aggregate({
        where: { ventaId: pagoData.ventaId },
        _sum: { monto: true },
      });

      await prisma.venta.update({
        where: { id: pagoData.ventaId },
        data: {
          totalPagado: totalPagado._sum.monto || new Decimal(0),
        },
      });

      res.status(201).json({ pago });
    } catch (error) {
      console.error('Error en create pago:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
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

      // Recalcular total pagado en la venta
      const totalPagado = await prisma.pago.aggregate({
        where: { ventaId: existingPago.ventaId },
        _sum: { monto: true },
      });

      await prisma.venta.update({
        where: { id: existingPago.ventaId },
        data: {
          totalPagado: totalPagado._sum.monto || new Decimal(0),
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

      // Recalcular total pagado en la venta
      const totalPagado = await prisma.pago.aggregate({
        where: { ventaId },
        _sum: { monto: true },
      });

      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          totalPagado: totalPagado._sum.monto || new Decimal(0),
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

