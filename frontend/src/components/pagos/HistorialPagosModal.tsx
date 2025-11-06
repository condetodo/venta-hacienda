import React, { useState, useEffect } from 'react';
import { X, Eye, Download } from 'lucide-react';
import { Pago, Venta } from '../../types';
import { pagosService } from '../../services/pagos.service';

interface HistorialPagosModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Venta | null;
}

export const HistorialPagosModal: React.FC<HistorialPagosModalProps> = ({
  isOpen,
  onClose,
  venta,
}) => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && venta) {
      fetchPagos();
    }
  }, [isOpen, venta]);

  const fetchPagos = async () => {
    if (!venta) return;

    try {
      setLoading(true);
      const response = await pagosService.getByVenta(venta.id);
      setPagos(response.pagos);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getFormaPagoLabel = (formaPago: string) => {
    const formas: Record<string, string> = {
      TRANSFERENCIA: 'Transferencia',
      EFECTIVO: 'Efectivo',
      CHEQUE: 'Cheque',
      CHEQUE_ELECTRONICO: 'E-CHEQ',
    };
    return formas[formaPago] || formaPago;
  };

  const totalPagado = pagos.reduce((sum, pago) => {
    if (pago.moneda === 'USD' && pago.tipoCambio) {
      return sum + pago.monto * pago.tipoCambio;
    }
    return sum + pago.monto;
  }, 0);

  const saldoPendiente = venta ? (venta.totalAPagar || 0) - totalPagado : 0;

  if (!isOpen || !venta) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Historial de Pagos</h2>
            <p className="text-sm text-gray-500 mt-1">
              DUT: {venta.numeroDUT} - {venta.titularDestino}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(venta.totalAPagar || 0, 'ARS')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pagado</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(totalPagado, 'ARS')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo Pendiente</p>
                <p className={`text-lg font-bold ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(saldoPendiente, 'ARS')}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Pagos */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay pagos registrados para esta venta</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Moneda
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forma de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donde se Acredita
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pagos.map((pago) => {
                    const montoEnARS = pago.moneda === 'USD' && pago.tipoCambio
                      ? pago.monto * pago.tipoCambio
                      : pago.monto;

                    return (
                      <tr key={pago.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(pago.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {formatCurrency(pago.monto, pago.moneda)}
                            </div>
                            {pago.moneda === 'USD' && pago.tipoCambio && (
                              <div className="text-xs text-gray-500">
                                ≈ {formatCurrency(montoEnARS, 'ARS')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pago.moneda === 'USD' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {pago.moneda}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getFormaPagoLabel(pago.formaPago)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pago.referencia || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pago.dondeSeAcredita || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {pago.comprobanteUrl && (
                            <a
                              href={pago.comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 mr-3"
                              title="Ver comprobante"
                            >
                              <Eye className="h-4 w-4 inline" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Observaciones si existen */}
          {pagos.some((p) => p.observaciones) && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Observaciones</h3>
              <div className="space-y-2">
                {pagos
                  .filter((p) => p.observaciones)
                  .map((pago) => (
                    <div key={pago.id} className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        {formatDate(pago.fecha)} - {formatCurrency(pago.monto, pago.moneda)}
                      </p>
                      <p className="text-sm text-gray-700">{pago.observaciones}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Botón Cerrar */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

