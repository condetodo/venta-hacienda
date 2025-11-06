import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { Venta } from '../../types';
import { ventasService } from '../../services/ventas.service';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import { HistorialPagosModal } from './HistorialPagosModal';

interface PagosListProps {
  refreshTrigger?: number;
}

type EstadoCobranza = 'COMPLETO' | 'PARCIAL' | 'PENDIENTE' | 'RETRASADO' | 'PRECIO_PENDIENTE';

interface EstadoCobranzaInfo {
  estado: EstadoCobranza;
  diasRetraso?: number;
  fechaPagoEsperada?: Date;
}

export const PagosList: React.FC<PagosListProps> = ({ refreshTrigger }) => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    estadoCobranza: '' as EstadoCobranza | '',
    conFactura: '' as 'true' | 'false' | '',
    moneda: '' as 'ARS' | 'USD' | '',
    search: '',
  });
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [ventaParaPago, setVentaParaPago] = useState<Venta | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [ventaParaHistorial, setVentaParaHistorial] = useState<Venta | null>(null);

  useEffect(() => {
    fetchVentas();
  }, [refreshTrigger]);

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

  const tienePrecioAcordado = (venta: Venta): boolean => {
    // Verificar si hay precio acordado (precioKg o importeEnUSD)
    return !!(venta.precioKg || venta.importeEnUSD || venta.totalAPagar);
  };

  const calcularEstadoCobranza = (venta: Venta): EstadoCobranzaInfo => {
    // Si no hay precio acordado, mostrar estado especial
    if (!tienePrecioAcordado(venta)) {
      return { estado: 'PRECIO_PENDIENTE' };
    }

    const totalAPagar = venta.totalAPagar || 0;
    const totalPagado = venta.totalPagado || 0;
    const saldoPendiente = totalAPagar - totalPagado;

    // Si no hay fecha de romaneo, no podemos calcular fecha esperada
    if (!venta.fechaRomaneo) {
      if (saldoPendiente === 0 && totalAPagar > 0) {
        return { estado: 'COMPLETO' };
      } else if (totalPagado > 0) {
        return { estado: 'PARCIAL' };
      } else {
        return { estado: 'PENDIENTE' };
      }
    }

    // Calcular fecha de pago esperada (30 días después del romaneo)
    const fechaRomaneo = new Date(venta.fechaRomaneo);
    const fechaPagoEsperada = new Date(fechaRomaneo);
    fechaPagoEsperada.setDate(fechaPagoEsperada.getDate() + 30);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaPagoEsperada.setHours(0, 0, 0, 0);

    const diasRetraso = Math.floor((hoy.getTime() - fechaPagoEsperada.getTime()) / (1000 * 60 * 60 * 24));

    if (saldoPendiente === 0 && totalAPagar > 0) {
      return { estado: 'COMPLETO', fechaPagoEsperada };
    } else if (diasRetraso > 0 && saldoPendiente > 0) {
      return { estado: 'RETRASADO', diasRetraso, fechaPagoEsperada };
    } else if (totalPagado > 0) {
      return { estado: 'PARCIAL', fechaPagoEsperada };
    } else {
      return { estado: 'PENDIENTE', fechaPagoEsperada };
    }
  };

  const ventasFiltradas = ventas.filter((venta) => {
    // Filtro de búsqueda
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (
        !venta.numeroDUT.toLowerCase().includes(search) &&
        !venta.titularDestino.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Filtro de estado de cobranza
    if (filters.estadoCobranza) {
      const estadoInfo = calcularEstadoCobranza(venta);
      if (estadoInfo.estado !== filters.estadoCobranza) {
        return false;
      }
    }

    // Filtro de factura
    if (filters.conFactura !== '') {
      const conFactura = filters.conFactura === 'true';
      if (venta.sinFacturar === conFactura) {
        return false;
      }
    }

    // Filtro de moneda (basado en si tiene importeEnUSD)
    if (filters.moneda) {
      if (filters.moneda === 'USD' && !venta.importeEnUSD) {
        return false;
      }
      if (filters.moneda === 'ARS' && venta.importeEnUSD && !venta.importeOriginal) {
        return false;
      }
    }

    return true;
  });

  const handleRegistrarPago = (venta: Venta) => {
    setVentaParaPago(venta);
    setShowRegistrarPago(true);
  };

  const handleVerHistorial = (venta: Venta) => {
    setVentaParaHistorial(venta);
    setShowHistorial(true);
  };

  const handlePagoRegistrado = () => {
    fetchVentas();
    setShowRegistrarPago(false);
    setVentaParaPago(null);
    // Forzar refresh del componente padre
    window.dispatchEvent(new CustomEvent('pagoRegistrado'));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getEstadoCobranzaBadge = (estadoInfo: EstadoCobranzaInfo) => {
    const { estado, diasRetraso } = estadoInfo;
    const badges = {
      COMPLETO: 'bg-green-100 text-green-800',
      PARCIAL: 'bg-yellow-100 text-yellow-800',
      PENDIENTE: 'bg-gray-100 text-gray-800',
      RETRASADO: 'bg-red-100 text-red-800',
      PRECIO_PENDIENTE: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      COMPLETO: 'Completo',
      PARCIAL: 'Parcial',
      PENDIENTE: 'Pendiente',
      RETRASADO: diasRetraso ? `Retrasado (${diasRetraso} días)` : 'Retrasado',
      PRECIO_PENDIENTE: 'Precio Pendiente',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  const getMonedaBadge = (venta: Venta) => {
    if (venta.importeEnUSD) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          USD
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ARS
      </span>
    );
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
      {/* Header con búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por DUT o cliente..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowRegistrarPago(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Pago</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Cobranza
            </label>
              <select
                value={filters.estadoCobranza}
                onChange={(e) =>
                  setFilters({ ...filters, estadoCobranza: e.target.value as EstadoCobranza | '' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Todos</option>
                <option value="COMPLETO">Completo</option>
                <option value="PARCIAL">Parcial</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="RETRASADO">Retrasado</option>
                <option value="PRECIO_PENDIENTE">Precio Pendiente</option>
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factura
            </label>
            <select
              value={filters.conFactura}
              onChange={(e) =>
                setFilters({ ...filters, conFactura: e.target.value as 'true' | 'false' | '' })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Todas</option>
              <option value="false">Con Factura</option>
              <option value="true">Sin Factura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              value={filters.moneda}
              onChange={(e) =>
                setFilters({ ...filters, moneda: e.target.value as 'ARS' | 'USD' | '' })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Todas</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {ventasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron ventas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total a Pagar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendiente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Pago Esperada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventasFiltradas.map((venta) => {
                  const estadoInfo = calcularEstadoCobranza(venta);
                  const tienePrecio = tienePrecioAcordado(venta);
                  const saldoPendiente = tienePrecio ? (venta.totalAPagar || 0) - venta.totalPagado : 0;
                  const porcentajePagado =
                    venta.totalAPagar && venta.totalAPagar > 0
                      ? (venta.totalPagado / venta.totalAPagar) * 100
                      : 0;

                  return (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {venta.numeroDUT}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.titularDestino.length > 30
                          ? `${venta.titularDestino.substring(0, 30)}...`
                          : venta.titularDestino}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tienePrecio ? formatCurrency(venta.totalAPagar || 0) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {tienePrecio ? formatCurrency(venta.totalPagado || 0) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {tienePrecio ? formatCurrency(saldoPendiente) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMonedaBadge(venta)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            venta.sinFacturar
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {venta.sinFacturar ? 'Sin IVA' : 'Con IVA'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoCobranzaBadge(estadoInfo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {estadoInfo.fechaPagoEsperada
                          ? formatDate(estadoInfo.fechaPagoEsperada.toISOString())
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {tienePrecio && saldoPendiente > 0 && (
                            <button
                              onClick={() => handleRegistrarPago(venta)}
                              className="text-primary hover:text-primary/80"
                              title="Registrar pago"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                          {tienePrecio && (venta.pagos && venta.pagos.length > 0) && (
                            <button
                              onClick={() => handleVerHistorial(venta)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver historial de pagos"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <RegistrarPagoModal
        isOpen={showRegistrarPago}
        onClose={() => {
          setShowRegistrarPago(false);
          setVentaParaPago(null);
        }}
        onSuccess={handlePagoRegistrado}
        ventaSeleccionada={ventaParaPago || undefined}
      />

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

