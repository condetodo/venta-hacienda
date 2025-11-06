import React, { useState, useEffect } from 'react';
import { Venta } from '../types';
import { ventasService } from '../services/ventas.service';
import { ResumenFinanciero } from '../components/pagos/ResumenFinanciero';
import { PagosList } from '../components/pagos/PagosList';
import { DeudasPorCliente } from '../components/pagos/DeudasPorCliente';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';

type TabType = 'porVenta' | 'porCliente';

export const Pagos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('porVenta');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  useEffect(() => {
    fetchVentas();
    
    // Escuchar evento de pago registrado
    const handlePagoRegistrado = () => {
      setRefreshTrigger((prev) => prev + 1);
      fetchVentas();
    };
    
    window.addEventListener('pagoRegistrado', handlePagoRegistrado);
    
    return () => {
      window.removeEventListener('pagoRegistrado', handlePagoRegistrado);
    };
  }, []);

  const fetchVentas = async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({ limit: 1000 });
      setVentas(response.ventas);
    } catch (error: any) {
      console.error('Error al cargar ventas:', error);
      showError('Error', 'Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  const calcularFechaPagoEsperada = (venta: Venta): Date | null => {
    if (!venta.fechaRomaneo) return null;
    const fechaRomaneo = new Date(venta.fechaRomaneo);
    const fechaEsperada = new Date(fechaRomaneo);
    fechaEsperada.setDate(fechaEsperada.getDate() + 30);
    return fechaEsperada;
  };

  const calcularDiasRetraso = (venta: Venta): number => {
    const fechaEsperada = calcularFechaPagoEsperada(venta);
    if (!fechaEsperada) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaEsperada.setHours(0, 0, 0, 0);

    const saldoPendiente = (venta.totalAPagar || 0) - venta.totalPagado;
    if (saldoPendiente <= 0) return 0;

    const diasRetraso = Math.floor((hoy.getTime() - fechaEsperada.getTime()) / (1000 * 60 * 60 * 24));
    return diasRetraso > 0 ? diasRetraso : 0;
  };

  // Calcular métricas para el resumen
  const calcularMetricas = () => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    let totalPorCobrar = 0;
    let totalPagadoMes = 0;
    let pagosRetrasados = {
      cantidad: 0,
      monto: 0,
    };
    let ventasPendientes = 0;

    ventas.forEach((venta) => {
      const totalAPagar = venta.totalAPagar || 0;
      const totalPagado = venta.totalPagado || 0;
      const saldoPendiente = totalAPagar - totalPagado;

      // Total por cobrar
      totalPorCobrar += saldoPendiente;

      // Total pagado en el mes actual
      if (venta.pagos && venta.pagos.length > 0) {
        venta.pagos.forEach((pago) => {
          const fechaPago = new Date(pago.fecha);
          if (fechaPago.getMonth() === mesActual && fechaPago.getFullYear() === añoActual) {
            // Convertir a ARS si es USD
            if (pago.moneda === 'USD' && pago.tipoCambio) {
              totalPagadoMes += pago.monto * pago.tipoCambio;
            } else {
              totalPagadoMes += pago.monto;
            }
          }
        });
      }

      // Ventas pendientes
      if (saldoPendiente > 0) {
        ventasPendientes++;
      }

      // Pagos retrasados
      const diasRetraso = calcularDiasRetraso(venta);
      if (diasRetraso > 0 && saldoPendiente > 0) {
        pagosRetrasados.cantidad++;
        pagosRetrasados.monto += saldoPendiente;
      }
    });

    return {
      totalPorCobrar,
      totalPagadoMes,
      pagosRetrasados,
      ventasPendientes,
    };
  };

  const metricas = calcularMetricas();

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-600">Control de cobranzas y gestión de pagos</p>
      </div>

      {/* Resumen Financiero */}
      {!loading && (
        <ResumenFinanciero
          totalPorCobrar={metricas.totalPorCobrar}
          totalPagadoMes={metricas.totalPagadoMes}
          pagosRetrasados={metricas.pagosRetrasados}
          ventasPendientes={metricas.ventasPendientes}
        />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('porVenta')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'porVenta'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Por Venta
            </button>
            <button
              onClick={() => setActiveTab('porCliente')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'porCliente'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Por Cliente
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'porVenta' ? (
            <PagosList refreshTrigger={refreshTrigger} />
          ) : (
            <DeudasPorCliente refreshTrigger={refreshTrigger} />
          )}
        </div>
      </div>
    </div>
  );
};

