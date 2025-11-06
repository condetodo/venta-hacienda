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

      // Calcular total pagado
      const totalPagado = await prisma.pago.aggregate({
        where: { ventaId: pagoData.ventaId },
        _sum: { monto: true },
      });

      const totalPagadoDecimal = totalPagado._sum.monto || new Decimal(0);

      // Si la venta no tiene precio acordado aún (no tiene totalAPagar), calcularlo
      // El precio por kilo viene en el pago (monto / totalKgs)
      const updateData: any = {
        totalPagado: totalPagadoDecimal.toNumber(),
      };

      // Si no tiene totalAPagar, calcularlo basado en el precio del pago
      // El monto del pago es: precioPorKilo × totalKgs
      // Entonces el totalAPagar debería ser ese monto + IVA - descuentos
      if (!venta.totalAPagar || venta.totalAPagar.equals(0)) {
        if (venta.totalKgs) {
          // El monto del pago ya es precioPorKilo × totalKgs
          // Calcular precio por kilo del pago
          const precioPorKilo = new Decimal(pagoData.monto).div(venta.totalKgs);
          
          // Si es USD, convertir a ARS para calcular totalAPagar
          let montoEnARS = new Decimal(pagoData.monto);
          if (pagoData.moneda === 'USD' && pagoData.tipoCambio) {
            montoEnARS = new Decimal(pagoData.monto).mul(pagoData.tipoCambio);
          }

          // Actualizar precioKg (convertir a número para Prisma)
          updateData.precioKg = precioPorKilo.toNumber();
          
          // Calcular totalAPagar: monto × (1 + IVA/100) - retenciones - valorDUT - valorGuia
          // El montoEnARS es el importe neto (precio × kilos)
          const importeNeto = montoEnARS;
          const totalOperacion = importeNeto.mul(new Decimal(1).add(venta.iva.div(100)));
          const descuentos = (venta.retencion || new Decimal(0))
            .add(venta.valorDUT || new Decimal(0))
            .add(venta.valorGuia || new Decimal(0));
          
          // Convertir a números para Prisma
          updateData.totalAPagar = totalOperacion.sub(descuentos).toNumber();
          updateData.importeNeto = importeNeto.toNumber();
          updateData.totalOperacion = totalOperacion.toNumber();
          
          // Si es USD, también actualizar importeEnUSD y tipoCambio
          if (pagoData.moneda === 'USD') {
            updateData.importeEnUSD = new Decimal(pagoData.monto).toNumber();
            if (pagoData.tipoCambio) {
              updateData.tipoCambio = new Decimal(pagoData.tipoCambio).toNumber();
              updateData.importeOriginal = montoEnARS.toNumber();
            }
          } else {
            // Si es ARS, el importeOriginal es el mismo monto
            updateData.importeOriginal = montoEnARS.toNumber();
          }
        }
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

