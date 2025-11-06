import React, { useState, useEffect } from 'react';
import { Search, Eye, ChevronRight } from 'lucide-react';
import { Venta } from '../../types';
import { ventasService } from '../../services/ventas.service';
import { HistorialPagosModal } from './HistorialPagosModal';

interface DeudaCliente {
  cliente: string;
  ventas: Venta[];
  totalAdeudadoARS: number;
  totalAdeudadoUSD: number;
  totalPagadoARS: number;
  totalPagadoUSD: number;
  cantidadVentas: number;
  cantidadVentasPendientes: number;
  cantidadVentasRetrasadas: number;
  ultimaFechaPago: Date | null;
  diasRetrasoPromedio: number;
}

interface DeudasPorClienteProps {
  refreshTrigger?: number;
}

export const DeudasPorCliente: React.FC<DeudasPorClienteProps> = ({ refreshTrigger }) => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deudasPorCliente, setDeudasPorCliente] = useState<DeudaCliente[]>([]);
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [ventaParaHistorial, setVentaParaHistorial] = useState<Venta | null>(null);

  useEffect(() => {
    fetchVentas();
  }, [refreshTrigger]);

  useEffect(() => {
    calcularDeudasPorCliente();
  }, [ventas]);

  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ventasService.getAll({ limit: 1000 });
      setVentas(response.ventas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las ventas');
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

  const tienePrecioAcordado = (venta: Venta): boolean => {
    // Verificar si hay precio acordado (precioKg o importeEnUSD)
    return !!(venta.precioKg || venta.importeEnUSD || venta.totalAPagar);
  };

  const calcularDeudasPorCliente = () => {
    const deudasMap = new Map<string, DeudaCliente>();

    ventas.forEach((venta) => {
      // Solo incluir ventas con precio acordado en el cálculo de deudas
      if (!tienePrecioAcordado(venta)) {
        return;
      }

      const cliente = venta.titularDestino;
      const saldoPendiente = (venta.totalAPagar || 0) - venta.totalPagado;

      if (!deudasMap.has(cliente)) {
        deudasMap.set(cliente, {
          cliente,
          ventas: [],
          totalAdeudadoARS: 0,
          totalAdeudadoUSD: 0,
          totalPagadoARS: 0,
          totalPagadoUSD: 0,
          cantidadVentas: 0,
          cantidadVentasPendientes: 0,
          cantidadVentasRetrasadas: 0,
          ultimaFechaPago: null,
          diasRetrasoPromedio: 0,
        });
      }

      const deuda = deudasMap.get(cliente)!;
      deuda.ventas.push(venta);
      deuda.cantidadVentas++;

      // Calcular totales
      if (venta.importeEnUSD) {
        // Venta en USD
        const totalEnUSD = venta.totalAPagar || 0;
        const pagadoEnUSD = venta.totalPagado || 0;
        const tipoCambio = venta.tipoCambio || 1;

        deuda.totalAdeudadoUSD += totalEnUSD / tipoCambio;
        deuda.totalPagadoUSD += pagadoEnUSD / tipoCambio;
        deuda.totalAdeudadoARS += totalEnUSD - pagadoEnUSD;
      } else {
        // Venta en ARS
        deuda.totalAdeudadoARS += saldoPendiente;
        deuda.totalPagadoARS += venta.totalPagado || 0;
      }

      // Contar ventas pendientes
      if (saldoPendiente > 0) {
        deuda.cantidadVentasPendientes++;
      }

      // Contar ventas retrasadas
      const diasRetraso = calcularDiasRetraso(venta);
      if (diasRetraso > 0 && saldoPendiente > 0) {
        deuda.cantidadVentasRetrasadas++;
      }

      // Obtener última fecha de pago
      if (venta.pagos && venta.pagos.length > 0) {
        const fechasPago = venta.pagos.map((p) => new Date(p.fecha));
        const ultimaFecha = new Date(Math.max(...fechasPago.map((d) => d.getTime())));
        if (!deuda.ultimaFechaPago || ultimaFecha > deuda.ultimaFechaPago) {
          deuda.ultimaFechaPago = ultimaFecha;
        }
      }
    });

    // Calcular días de retraso promedio
    deudasMap.forEach((deuda) => {
      const ventasRetrasadas = deuda.ventas.filter((v) => {
        const diasRetraso = calcularDiasRetraso(v);
        const saldoPendiente = (v.totalAPagar || 0) - v.totalPagado;
        return diasRetraso > 0 && saldoPendiente > 0;
      });

      if (ventasRetrasadas.length > 0) {
        const totalDiasRetraso = ventasRetrasadas.reduce((sum, v) => sum + calcularDiasRetraso(v), 0);
        deuda.diasRetrasoPromedio = Math.round(totalDiasRetraso / ventasRetrasadas.length);
      }
    });

    // Filtrar solo clientes con deuda pendiente
    const deudasArray = Array.from(deudasMap.values()).filter(
      (d) => d.totalAdeudadoARS > 0 || d.totalAdeudadoUSD > 0
    );

    // Ordenar por total adeudado (ARS) descendente
    deudasArray.sort((a, b) => b.totalAdeudadoARS - a.totalAdeudadoARS);

    setDeudasPorCliente(deudasArray);
  };

  const deudasFiltradas = deudasPorCliente.filter((deuda) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return deuda.cliente.toLowerCase().includes(searchLower);
  });

  const handleVerDetalle = (cliente: string) => {
    if (clienteExpandido === cliente) {
      setClienteExpandido(null);
    } else {
      setClienteExpandido(cliente);
    }
  };

  const handleVerHistorial = (venta: Venta) => {
    setVentaParaHistorial(venta);
    setShowHistorial(true);
  };

  const formatCurrency = (amount: number, moneda: 'ARS' | 'USD' = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-AR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Lista de deudas por cliente */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {deudasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron deudas pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {deudasFiltradas.map((deuda) => {
              const ventasPendientes = deuda.ventas.filter(
                (v) => (v.totalAPagar || 0) - v.totalPagado > 0
              );

              return (
                <div key={deuda.cliente} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleVerDetalle(deuda.cliente)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ChevronRight
                            className={`h-5 w-5 transition-transform ${
                              clienteExpandido === deuda.cliente ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900">{deuda.cliente}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Adeudado</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(deuda.totalAdeudadoARS, 'ARS')}
                        </p>
                        {deuda.totalAdeudadoUSD > 0 && (
                          <p className="text-sm text-gray-500">
                            {formatCurrency(deuda.totalAdeudadoUSD, 'USD')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Ventas Pendientes</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {deuda.cantidadVentasPendientes}
                        </p>
                        {deuda.cantidadVentasRetrasadas > 0 && (
                          <p className="text-sm text-red-600">
                            {deuda.cantidadVentasRetrasadas} retrasadas
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {clienteExpandido === deuda.cliente && (
                    <div className="mt-4 pl-8">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Total Ventas</p>
                            <p className="font-semibold text-gray-900">{deuda.cantidadVentas}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ventas Pendientes</p>
                            <p className="font-semibold text-orange-600">
                              {deuda.cantidadVentasPendientes}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ventas Retrasadas</p>
                            <p className="font-semibold text-red-600">
                              {deuda.cantidadVentasRetrasadas}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Días Retraso Promedio</p>
                            <p className="font-semibold text-gray-900">
                              {deuda.diasRetrasoPromedio > 0 ? `${deuda.diasRetrasoPromedio} días` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Última Fecha de Pago</p>
                            <p className="font-semibold text-gray-900">
                              {formatDate(deuda.ultimaFechaPago)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lista de ventas pendientes */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                DUT
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total a Pagar
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Pagado
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Pendiente
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Días Retraso
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ventasPendientes.map((venta) => {
                              const saldoPendiente = (venta.totalAPagar || 0) - venta.totalPagado;
                              const diasRetraso = calcularDiasRetraso(venta);

                              return (
                                <tr key={venta.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {venta.numeroDUT}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {formatCurrency(venta.totalAPagar || 0)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                                    {formatCurrency(venta.totalPagado || 0)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                                    {formatCurrency(saldoPendiente)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {diasRetraso > 0 ? (
                                      <span className="text-red-600 font-medium">
                                        {diasRetraso} días
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                    {venta.pagos && venta.pagos.length > 0 && (
                                      <button
                                        onClick={() => handleVerHistorial(venta)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Ver historial de pagos"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Historial */}
      <HistorialPagosModal
        isOpen={showHistorial}
        onClose={() => {
          setShowHistorial(false);
          setVentaParaHistorial(null);
        }}
        venta={ventaParaHistorial}
      />
    </div>
  );
};

