import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { VentasService } from '../services/ventas.service';

export const ventasController = {
  // Obtener todas las ventas con paginación y filtros
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Filtros
      if (req.query.estado) {
        where.estado = req.query.estado;
      }
      if (req.query.cliente) {
        where.titularDestino = {
          contains: req.query.cliente as string,
          mode: 'insensitive',
        };
      }
      if (req.query.categoria) {
        where.categoria = req.query.categoria;
      }
      if (req.query.establecimiento) {
        where.establecimientoEmisor = req.query.establecimiento;
      }
      if (req.query.fechaDesde && req.query.fechaHasta) {
        where.fechaEmisionDUT = {
          gte: new Date(req.query.fechaDesde as string),
          lte: new Date(req.query.fechaHasta as string),
        };
      }

      const [ventas, total] = await Promise.all([
        prisma.venta.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            documentos: {
              select: {
                id: true,
                tipo: true,
                nombreArchivo: true,
                fechaCarga: true,
              },
            },
            pagos: {
              select: {
                id: true,
                monto: true,
                fecha: true,
                formaPago: true,
              },
            },
            alertas: {
              where: { resuelta: false },
              select: {
                id: true,
                tipo: true,
                mensaje: true,
                severidad: true,
              },
            },
          },
        }),
        prisma.venta.count({ where }),
      ]);

      res.json({
        ventas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error en getAll ventas:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Obtener venta por ID
  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const venta = await prisma.venta.findUnique({
        where: { id },
        include: {
          documentos: true,
          pagos: {
            orderBy: { fecha: 'desc' },
          },
          alertas: {
            orderBy: { fechaCreacion: 'desc' },
          },
        },
      });

      if (!venta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      res.json({ venta });
    } catch (error) {
      console.error('Error en getById venta:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Crear nueva venta
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const ventaData = req.body;

      // Validaciones básicas
      if (!ventaData.numeroDUT || !ventaData.titularDestino || !ventaData.cantidadEnDUT) {
        res.status(400).json({
          error: 'Campos requeridos: numeroDUT, titularDestino, cantidadEnDUT',
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Verificar que el DUT no exista
      console.log('🔍 Verificando DUT duplicado...');
      console.log('DUT a verificar:', ventaData.numeroDUT);
      console.log('Titular destino:', ventaData.titularDestino);
      
      const existingVenta = await prisma.venta.findUnique({
        where: { numeroDUT: ventaData.numeroDUT },
      });

      if (existingVenta) {
        console.log('❌ DUT duplicado encontrado:');
        console.log('  - DUT existente:', existingVenta.numeroDUT);
        console.log('  - Cliente existente:', existingVenta.titularDestino);
        console.log('  - Fecha existente:', existingVenta.fechaEmisionDUT);
        console.log('  - ID existente:', existingVenta.id);
        
        res.status(409).json({
          error: 'Ya existe una venta con este número de DUT',
          code: 'DUT_EXISTS',
          existingVenta: {
            id: existingVenta.id,
            numeroDUT: existingVenta.numeroDUT,
            titularDestino: existingVenta.titularDestino,
            fechaEmisionDUT: existingVenta.fechaEmisionDUT
          }
        });
        return;
      }
      
      console.log('✅ DUT único, procediendo con la creación...');
      console.log('Datos recibidos para crear venta:', JSON.stringify(ventaData, null, 2));

      // Crear venta
      try {
        console.log('🔄 Iniciando creación de venta...');
        
        // Excluir campos que no pertenecen al modelo Venta
        const { archivoDUT, ...ventaDataClean } = ventaData;
        console.log('Datos limpios para Prisma:', JSON.stringify(ventaDataClean, null, 2));
        
        const venta = await prisma.venta.create({
          data: {
            ...ventaDataClean,
            // Convertir strings a Decimal para campos numéricos
            valorDUT: ventaDataClean.valorDUT ? parseFloat(ventaDataClean.valorDUT) : 0,
            valorGuia: ventaDataClean.valorGuia ? parseFloat(ventaDataClean.valorGuia) : 0,
            precioKg: ventaDataClean.precioKg ? parseFloat(ventaDataClean.precioKg) : null,
            precioCabeza: ventaDataClean.precioCabeza ? parseFloat(ventaDataClean.precioCabeza) : null,
            importeEnUSD: ventaDataClean.importeEnUSD ? parseFloat(ventaDataClean.importeEnUSD) : null,
            tipoCambio: ventaDataClean.tipoCambio ? parseFloat(ventaDataClean.tipoCambio) : null,
            importeOriginal: ventaDataClean.importeOriginal ? parseFloat(ventaDataClean.importeOriginal) : null,
            importeNeto: ventaDataClean.importeNeto ? parseFloat(ventaDataClean.importeNeto) : null,
            iva: ventaDataClean.iva ? parseFloat(ventaDataClean.iva) : 10.5,
            totalOperacion: ventaDataClean.totalOperacion ? parseFloat(ventaDataClean.totalOperacion) : null,
            retencion: ventaDataClean.retencion ? parseFloat(ventaDataClean.retencion) : 0,
            totalAPagar: ventaDataClean.totalAPagar ? parseFloat(ventaDataClean.totalAPagar) : null,
            totalPagado: ventaDataClean.totalPagado ? parseFloat(ventaDataClean.totalPagado) : 0,
            totalKgs: ventaDataClean.totalKgs ? parseFloat(ventaDataClean.totalKgs) : null,
            kiloLimpioPorCabeza: ventaDataClean.kiloLimpioPorCabeza ? parseFloat(ventaDataClean.kiloLimpioPorCabeza) : null,
            // Convertir strings de fecha a objetos Date
            fechaEmisionDUT: ventaDataClean.fechaEmisionDUT ? new Date(ventaDataClean.fechaEmisionDUT) : new Date(),
            fechaCargaDUT: ventaDataClean.fechaCargaDUT ? new Date(ventaDataClean.fechaCargaDUT) : new Date(),
            fechaVencimientoDUT: ventaDataClean.fechaVencimientoDUT ? new Date(ventaDataClean.fechaVencimientoDUT) : null,
            fechaCargaReal: ventaDataClean.fechaCargaReal ? new Date(ventaDataClean.fechaCargaReal) : null,
            fechaPago: ventaDataClean.fechaPago ? new Date(ventaDataClean.fechaPago) : null,
          },
        });

        console.log('✅ Venta creada exitosamente:', venta.id);
        res.status(201).json({ venta });
      } catch (createError) {
        console.error('❌ Error creando venta:', createError);
        console.error('Stack trace:', createError.stack);
        res.status(500).json({
          error: 'Error interno del servidor al crear la venta',
          code: 'INTERNAL_SERVER_ERROR',
          details: createError.message
        });
      }
    } catch (error: any) {
      console.error('Error en create venta:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Actualizar venta
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que la venta existe
      const existingVenta = await prisma.venta.findUnique({
        where: { id },
      });

      if (!existingVenta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      // Actualizar venta
      const venta = await prisma.venta.update({
        where: { id },
        data: {
          ...updateData,
          // Convertir strings a Decimal para campos numéricos
          valorDUT: updateData.valorDUT ? parseFloat(updateData.valorDUT) : undefined,
          valorGuia: updateData.valorGuia ? parseFloat(updateData.valorGuia) : undefined,
          precioKg: updateData.precioKg ? parseFloat(updateData.precioKg) : undefined,
          precioCabeza: updateData.precioCabeza ? parseFloat(updateData.precioCabeza) : undefined,
          importeEnUSD: updateData.importeEnUSD ? parseFloat(updateData.importeEnUSD) : undefined,
          tipoCambio: updateData.tipoCambio ? parseFloat(updateData.tipoCambio) : undefined,
          importeOriginal: updateData.importeOriginal ? parseFloat(updateData.importeOriginal) : undefined,
          importeNeto: updateData.importeNeto ? parseFloat(updateData.importeNeto) : undefined,
          iva: updateData.iva ? parseFloat(updateData.iva) : undefined,
          totalOperacion: updateData.totalOperacion ? parseFloat(updateData.totalOperacion) : undefined,
          retencion: updateData.retencion ? parseFloat(updateData.retencion) : undefined,
          totalAPagar: updateData.totalAPagar ? parseFloat(updateData.totalAPagar) : undefined,
          totalPagado: updateData.totalPagado ? parseFloat(updateData.totalPagado) : undefined,
          totalKgs: updateData.totalKgs ? parseFloat(updateData.totalKgs) : undefined,
          kiloLimpioPorCabeza: updateData.kiloLimpioPorCabeza ? parseFloat(updateData.kiloLimpioPorCabeza) : undefined,
          // Convertir strings de fecha a objetos Date
          fechaEmisionDUT: updateData.fechaEmisionDUT ? new Date(updateData.fechaEmisionDUT) : undefined,
          fechaCargaDUT: updateData.fechaCargaDUT ? new Date(updateData.fechaCargaDUT) : undefined,
          fechaVencimientoDUT: updateData.fechaVencimientoDUT ? new Date(updateData.fechaVencimientoDUT) : undefined,
          fechaCargaReal: updateData.fechaCargaReal ? new Date(updateData.fechaCargaReal) : undefined,
          fechaPago: updateData.fechaPago ? new Date(updateData.fechaPago) : undefined,
        },
      });

      res.json({ venta });
    } catch (error) {
      console.error('Error en update venta:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Eliminar venta
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Verificar que la venta existe
      const existingVenta = await prisma.venta.findUnique({
        where: { id },
      });

      if (!existingVenta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      // Eliminar venta (cascade eliminará documentos, pagos y alertas)
      await prisma.venta.delete({
        where: { id },
      });

      res.json({ message: 'Venta eliminada exitosamente' });
    } catch (error) {
      console.error('Error en delete venta:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Actualizar estado de venta
  updateEstado: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado) {
        res.status(400).json({
          error: 'Estado es requerido',
          code: 'MISSING_ESTADO',
        });
        return;
      }

      // Verificar que la venta existe
      const existingVenta = await prisma.venta.findUnique({
        where: { id },
      });

      if (!existingVenta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      // Actualizar estado
      const venta = await prisma.venta.update({
        where: { id },
        data: { estado },
      });

      res.json({ venta });
    } catch (error) {
      console.error('Error en updateEstado venta:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Obtener estadísticas del dashboard
  getDashboardStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const estadisticas = await VentasService.obtenerEstadisticasDashboard();
      res.json(estadisticas);
    } catch (error) {
      console.error('Error en getDashboardStats:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Obtener ventas por mes para gráficos
  getVentasPorMes: async (req: Request, res: Response): Promise<void> => {
    try {
      const meses = parseInt(req.query.meses as string) || 12;
      const ventasPorMes = await VentasService.obtenerVentasPorMes(meses);
      res.json(ventasPorMes);
    } catch (error) {
      console.error('Error en getVentasPorMes:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Calcular importes automáticamente
  calcularImportes: async (req: Request, res: Response): Promise<void> => {
    try {
      const ventaData = req.body;
      const calculos = await VentasService.calcularImportes(ventaData);
      res.json(calculos);
    } catch (error) {
      console.error('Error en calcularImportes:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

