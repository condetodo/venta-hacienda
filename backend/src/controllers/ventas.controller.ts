import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { VentasService } from '../services/ventas.service';
import { Decimal } from 'decimal.js';

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

      // Helper para parsear números (acepta 0 correctamente)
      const parseNum = (val: any): number | undefined => {
        if (val === null || val === undefined || val === '') return undefined;
        const num = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(num) ? undefined : num;
      };

      // Helper para parsear fechas
      const parseDate = (val: any): Date | undefined => {
        if (!val || val === '') return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
      };

      // Solo extraer campos actualizables (excluir id, createdAt, updatedAt, relaciones)
      const data: any = {};

      // Campos de texto
      if (updateData.establecimientoEmisor !== undefined) data.establecimientoEmisor = updateData.establecimientoEmisor;
      if (updateData.numeroDUT !== undefined) data.numeroDUT = updateData.numeroDUT;
      if (updateData.titularDestino !== undefined) data.titularDestino = updateData.titularDestino;
      if (updateData.numeroRespaDestino !== undefined) data.numeroRespaDestino = updateData.numeroRespaDestino || null;
      if (updateData.motivo !== undefined) data.motivo = updateData.motivo;
      if (updateData.categoria !== undefined) data.categoria = updateData.categoria;
      if (updateData.estado !== undefined) data.estado = updateData.estado;
      if (updateData.numeroRemito !== undefined) data.numeroRemito = updateData.numeroRemito || null;
      if (updateData.tropa !== undefined) data.tropa = updateData.tropa || null;
      if (updateData.numeroFactura !== undefined) data.numeroFactura = updateData.numeroFactura || null;
      if (updateData.formaPago !== undefined) data.formaPago = updateData.formaPago || null;
      if (updateData.dondeSeAcredita !== undefined) data.dondeSeAcredita = updateData.dondeSeAcredita || null;
      if (updateData.observaciones !== undefined) data.observaciones = updateData.observaciones || null;
      if (updateData.sinFacturar !== undefined) data.sinFacturar = updateData.sinFacturar;

      // Campos numéricos (parseNum acepta 0 correctamente)
      if (updateData.valorDUT !== undefined) data.valorDUT = parseNum(updateData.valorDUT);
      if (updateData.valorGuia !== undefined) data.valorGuia = parseNum(updateData.valorGuia);
      if (updateData.cantidadEnDUT !== undefined) data.cantidadEnDUT = parseNum(updateData.cantidadEnDUT);
      if (updateData.cantidadCargada !== undefined) data.cantidadCargada = parseNum(updateData.cantidadCargada);
      if (updateData.cantidadRomaneo !== undefined) data.cantidadRomaneo = parseNum(updateData.cantidadRomaneo);
      if (updateData.precioKg !== undefined) data.precioKg = parseNum(updateData.precioKg);
      if (updateData.precioCabeza !== undefined) data.precioCabeza = parseNum(updateData.precioCabeza);
      if (updateData.importeEnUSD !== undefined) data.importeEnUSD = parseNum(updateData.importeEnUSD);
      if (updateData.tipoCambio !== undefined) data.tipoCambio = parseNum(updateData.tipoCambio);
      if (updateData.importeOriginal !== undefined) data.importeOriginal = parseNum(updateData.importeOriginal);
      if (updateData.importeNeto !== undefined) data.importeNeto = parseNum(updateData.importeNeto);
      if (updateData.iva !== undefined) data.iva = parseNum(updateData.iva);
      if (updateData.totalOperacion !== undefined) data.totalOperacion = parseNum(updateData.totalOperacion);
      if (updateData.retencion !== undefined) data.retencion = parseNum(updateData.retencion);
      if (updateData.totalAPagar !== undefined) data.totalAPagar = parseNum(updateData.totalAPagar);
      if (updateData.totalKgs !== undefined) data.totalKgs = parseNum(updateData.totalKgs);
      if (updateData.kiloLimpioPorCabeza !== undefined) data.kiloLimpioPorCabeza = parseNum(updateData.kiloLimpioPorCabeza);

      // Campos de fecha
      if (updateData.fechaEmisionDUT !== undefined) data.fechaEmisionDUT = parseDate(updateData.fechaEmisionDUT);
      if (updateData.fechaCargaDUT !== undefined) data.fechaCargaDUT = parseDate(updateData.fechaCargaDUT);
      if (updateData.fechaVencimientoDUT !== undefined) data.fechaVencimientoDUT = parseDate(updateData.fechaVencimientoDUT);
      if (updateData.fechaCargaReal !== undefined) data.fechaCargaReal = parseDate(updateData.fechaCargaReal);
      if (updateData.fechaPago !== undefined) data.fechaPago = parseDate(updateData.fechaPago);

      // Actualizar venta
      const venta = await prisma.venta.update({
        where: { id },
        data,
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

  // Marcar como retirado con datos del remito (soporta 1-3 remitos)
  marcarComoRetirado: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        remitos,
        // Backward-compatible fields
        numeroRemito,
        fechaRemito,
        cantidadCargada,
      } = req.body;

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

      // Validar transición de estado
      try {
        await VentasService.validarTransicionEstado(id, 'RETIRADO');
      } catch (error: any) {
        res.status(400).json({
          error: error.message,
          code: 'INVALID_STATE_TRANSITION',
        });
        return;
      }

      // Preparar datos para actualizar
      const updateData: any = {
        estado: 'RETIRADO',
      };

      // Si vienen remitos (nuevo formato), usarlos
      if (remitos && Array.isArray(remitos) && remitos.length > 0) {
        updateData.remitos = remitos;
        // cantidadCargada = suma de cantidades de todos los remitos
        updateData.cantidadCargada = remitos.reduce((sum: number, r: any) => sum + (r.cantidad || 0), 0);
        // fechaCargaReal = fecha del primer remito
        if (remitos[0].fecha) {
          updateData.fechaCargaReal = new Date(remitos[0].fecha);
        }
      } else {
        // Backward compatibility: campos individuales
        updateData.cantidadCargada = cantidadCargada || existingVenta.cantidadEnDUT;
        if (fechaRemito) {
          updateData.fechaCargaReal = new Date(fechaRemito);
        }
        // Guardar como remito unico en el JSON
        if (numeroRemito) {
          updateData.remitos = [{
            numero: numeroRemito,
            fecha: fechaRemito || new Date().toISOString().split('T')[0],
            cantidad: cantidadCargada || existingVenta.cantidadEnDUT,
          }];
        }
      }

      // Actualizar venta
      const venta = await prisma.venta.update({
        where: { id },
        data: updateData,
      });

      res.json({ venta });
    } catch (error) {
      console.error('Error en marcarComoRetirado:', error);
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

  // Asignar precio por kilo a una venta (sin crear pago)
  asignarPrecioPorKilo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { precioPorKilo, moneda, tipoCambio, sinFacturar } = req.body;

      // Validaciones
      if (!precioPorKilo || precioPorKilo <= 0) {
        res.status(400).json({
          error: 'El precio por kilo debe ser mayor a 0',
          code: 'INVALID_PRECIO',
        });
        return;
      }

      // Verificar que la venta existe
      const venta = await prisma.venta.findUnique({
        where: { id },
      });

      if (!venta) {
        res.status(404).json({
          error: 'Venta no encontrada',
          code: 'VENTA_NOT_FOUND',
        });
        return;
      }

      // Verificar que la venta tenga kilos de romaneo
      if (!venta.totalKgs || venta.totalKgs.equals(0)) {
        res.status(400).json({
          error: 'La venta no tiene kilos de romaneo registrados',
          code: 'NO_TOTAL_KGS',
        });
        return;
      }

      // Verificar que no tenga precio acordado ya
      if (venta.totalAPagar && venta.totalAPagar.greaterThan(0)) {
        res.status(400).json({
          error: 'La venta ya tiene un precio acordado. Use la opción de actualizar venta si desea modificarlo.',
          code: 'PRECIO_YA_ASIGNADO',
        });
        return;
      }

      // Calcular monto total: precioPorKilo × totalKgs
      const montoTotal = new Decimal(precioPorKilo).mul(venta.totalKgs);

      // Si es USD, convertir a ARS para calcular totalAPagar
      let montoEnARS = montoTotal;
      if (moneda === 'USD' && tipoCambio) {
        montoEnARS = montoTotal.mul(tipoCambio);
      }

      // Calcular totalAPagar según si tiene factura o no
      const importeNeto = montoEnARS;
      
      // Si sinFacturar es true, no se suma IVA
      // Si sinFacturar es false (o undefined), se suma IVA
      const tieneFactura = sinFacturar === false || sinFacturar === undefined;
      const totalOperacion = tieneFactura
        ? importeNeto.mul(new Decimal(1).add(venta.iva.div(100)))
        : importeNeto;
      
      const descuentos = (venta.retencion || new Decimal(0))
        .add(venta.valorDUT || new Decimal(0))
        .add(venta.valorGuia || new Decimal(0));

      // Preparar datos de actualización
      const updateData: any = {
        precioKg: precioPorKilo,
        importeNeto: importeNeto.toNumber(),
        totalOperacion: totalOperacion.toNumber(),
        totalAPagar: totalOperacion.sub(descuentos).toNumber(),
        sinFacturar: sinFacturar === true,
      };

      // Si es USD, también actualizar importeEnUSD y tipoCambio
      if (moneda === 'USD') {
        updateData.importeEnUSD = montoTotal.toNumber();
        if (tipoCambio) {
          updateData.tipoCambio = tipoCambio;
          updateData.importeOriginal = montoEnARS.toNumber();
        }
      } else {
        // Si es ARS, el importeOriginal es el mismo monto
        updateData.importeOriginal = montoEnARS.toNumber();
      }

      // Actualizar venta
      const ventaActualizada = await prisma.venta.update({
        where: { id },
        data: updateData,
      });

      res.json({ venta: ventaActualizada });
    } catch (error: any) {
      console.error('Error en asignarPrecioPorKilo:', error);
      res.status(500).json({
        error: error.message || 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

