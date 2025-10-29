import { Decimal } from 'decimal.js';
import { prisma } from '../config/database';

export class VentasService {
  /**
   * Calcula los importes automáticamente basado en los datos de la venta
   */
  static async calcularImportes(ventaData: any) {
    const calculos: any = {};

    // 1. Conversión USD a ARS (si hay tipo de cambio)
    if (ventaData.importeEnUSD && ventaData.tipoCambio) {
      calculos.importeOriginal = new Decimal(ventaData.importeEnUSD)
        .mul(ventaData.tipoCambio)
        .toNumber();
    }

    // 2. Cálculo de total con IVA
    if (calculos.importeOriginal && ventaData.iva) {
      calculos.totalOperacion = new Decimal(calculos.importeOriginal)
        .mul(new Decimal(1).add(new Decimal(ventaData.iva).div(100)))
        .toNumber();
    }

    // 3. Cálculo de neto a cobrar (descontando costos y retenciones)
    if (calculos.totalOperacion) {
      const descuentos = new Decimal(ventaData.retencion || 0)
        .add(ventaData.valorDUT || 0)
        .add(ventaData.valorGuia || 0);
      
      calculos.totalAPagar = new Decimal(calculos.totalOperacion)
        .sub(descuentos)
        .toNumber();
    }

    // 4. Peso promedio por animal (si hay datos de faena)
    if (ventaData.totalKgs && ventaData.cantidadRomaneo) {
      calculos.kiloLimpioPorCabeza = new Decimal(ventaData.totalKgs)
        .div(ventaData.cantidadRomaneo)
        .toNumber();
    }

    // 5. Total en USD por kilos (si hay precio por kilo)
    if (ventaData.totalKgs && ventaData.precioKg) {
      calculos.importeEnUSD = new Decimal(ventaData.totalKgs)
        .mul(ventaData.precioKg)
        .toNumber();
    }

    return calculos;
  }

  /**
   * Valida las transiciones de estado de venta
   */
  static async validarTransicionEstado(ventaId: string, nuevoEstado: string) {
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        documentos: true,
      },
    });

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    const estadosValidos = {
      PENDIENTE: ['RETIRADO', 'CANCELADO'],
      RETIRADO: ['EN_FRIGORIFICO', 'CANCELADO'],
      EN_FRIGORIFICO: ['LIQUIDADO', 'CANCELADO'],
      LIQUIDADO: ['FACTURADO', 'CANCELADO'],
      FACTURADO: ['PAGO_PARCIAL', 'FINALIZADO', 'CANCELADO'],
      PAGO_PARCIAL: ['FINALIZADO', 'CANCELADO'],
      FINALIZADO: [], // Estado final
      CANCELADO: [], // Estado final
    };

    const estadosPermitidos = estadosValidos[venta.estado as keyof typeof estadosValidos] || [];
    
    if (!estadosPermitidos.includes(nuevoEstado as any)) {
      throw new Error(`No se puede cambiar de ${venta.estado} a ${nuevoEstado}`);
    }

    // Validaciones específicas por estado
    switch (nuevoEstado) {
      case 'LIQUIDADO':
        const tieneRomaneo = venta.documentos.some(doc => doc.tipo === 'ROMANEO');
        if (!tieneRomaneo) {
          throw new Error('No se puede liquidar sin romaneo del frigorífico');
        }
        break;
      
      case 'FACTURADO':
        if (!venta.numeroFactura && !venta.sinFacturar) {
          throw new Error('Debe ingresar número de factura o marcar como "Sin Facturar"');
        }
        break;
      
      case 'FINALIZADO':
        const saldoPendiente = (venta.totalAPagar || 0) - (venta.totalPagado || 0);
        if (saldoPendiente > 0) {
          throw new Error(`Saldo pendiente: $${saldoPendiente}. No se puede finalizar.`);
        }
        break;
    }

    return true;
  }

  /**
   * Calcula el saldo pendiente de una venta
   */
  static calcularSaldoPendiente(venta: any): number {
    const totalAPagar = venta.totalAPagar || 0;
    const totalPagado = venta.totalPagado || 0;
    return Math.max(0, totalAPagar - totalPagado);
  }

  /**
   * Obtiene estadísticas del dashboard
   */
  static async obtenerEstadisticasDashboard() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const [
      ventasActivas,
      totalVendidoMes,
      totalPorCobrar,
      alertasPendientes,
    ] = await Promise.all([
      // Ventas activas (no finalizadas ni canceladas)
      prisma.venta.count({
        where: {
          estado: {
            notIn: ['FINALIZADO', 'CANCELADO'],
          },
        },
      }),

      // Total vendido en el mes
      prisma.venta.aggregate({
        where: {
          fechaEmisionDUT: {
            gte: inicioMes,
            lte: finMes,
          },
          estado: {
            notIn: ['CANCELADO'],
          },
        },
        _sum: {
          totalAPagar: true,
        },
      }),

      // Total por cobrar
      prisma.venta.aggregate({
        where: {
          estado: {
            notIn: ['FINALIZADO', 'CANCELADO'],
          },
        },
        _sum: {
          totalAPagar: true,
          totalPagado: true,
        },
      }),

      // Alertas pendientes (top 5)
      prisma.alerta.findMany({
        where: {
          resuelta: false,
        },
        orderBy: {
          fechaCreacion: 'desc',
        },
        take: 5,
        include: {
          venta: {
            select: {
              numeroDUT: true,
              titularDestino: true,
            },
          },
        },
      }),
    ]);

    const totalVendido = totalVendidoMes._sum.totalAPagar || 0;
    const totalAPagar = totalPorCobrar._sum.totalAPagar || 0;
    const totalPagado = totalPorCobrar._sum.totalPagado || 0;
    const totalPorCobrarCalculado = totalAPagar - totalPagado;

    return {
      ventasActivas,
      totalVendidoMes: totalVendido,
      totalPorCobrar: totalPorCobrarCalculado,
      alertasPendientes,
    };
  }

  /**
   * Obtiene ventas por mes para gráficos
   */
  static async obtenerVentasPorMes(meses: number = 12) {
    const hoy = new Date();
    const inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() - meses + 1, 1);

    const ventasPorMes = await prisma.venta.groupBy({
      by: ['fechaEmisionDUT'],
      where: {
        fechaEmisionDUT: {
          gte: inicioPeriodo,
        },
        estado: {
          notIn: ['CANCELADO'],
        },
      },
      _sum: {
        totalAPagar: true,
      },
      _count: {
        id: true,
      },
    });

    // Agrupar por mes
    const ventasAgrupadas = ventasPorMes.reduce((acc, venta) => {
      const mes = venta.fechaEmisionDUT.getMonth();
      const año = venta.fechaEmisionDUT.getFullYear();
      const clave = `${año}-${mes.toString().padStart(2, '0')}`;
      
      if (!acc[clave]) {
        acc[clave] = {
          mes: mes + 1,
          año,
          total: 0,
          cantidad: 0,
        };
      }
      
      acc[clave].total += venta._sum.totalAPagar || 0;
      acc[clave].cantidad += venta._count.id;
      
      return acc;
    }, {} as any);

    return Object.values(ventasAgrupadas);
  }
}
