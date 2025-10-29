import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, DollarSign, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Venta } from '../types';
import { ventasService } from '../services/ventas.service';

export const VentaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVenta();
    }
  }, [id]);

  const fetchVenta = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ventasService.getById(id!);
      setVenta(response.venta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/ventas/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la venta ${venta?.numeroDUT}?`)) {
      try {
        await ventasService.delete(id!);
        navigate('/ventas');
      } catch (error) {
        console.error('Error al eliminar venta:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ABIERTO':
      case 'PENDIENTE': // Mantener compatibilidad con datos existentes
        return 'bg-blue-100 text-blue-800';
      case 'RETIRADO':
        return 'bg-orange-100 text-orange-800';
      case 'ROMANEO':
        return 'bg-purple-100 text-purple-800';
      case 'FINALIZADO':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoDisplay = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'ABIERTO'; // Mostrar "ABIERTO" para datos existentes con "PENDIENTE"
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Venta no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/ventas')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{venta.numeroDUT}</h1>
            <p className="text-gray-600">{venta.titularDestino} - {venta.categoria}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            <span>Editar</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Información general */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Datos de la venta */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la Venta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
                <p className="mt-1 text-sm text-gray-900">{venta.establecimientoEmisor || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de DUT</label>
                <p className="mt-1 text-sm text-gray-900">{venta.numeroDUT || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <p className="mt-1 text-sm text-gray-900">{venta.titularDestino || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                <p className="mt-1 text-sm text-gray-900">{venta.categoria || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cantidad en DUT</label>
                <p className="mt-1 text-sm text-gray-900">{venta.cantidadEnDUT || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Precio por Kg</label>
                <p className="mt-1 text-sm text-gray-900">{venta.precioKg ? `$${venta.precioKg} USD` : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Motivo</label>
                <p className="mt-1 text-sm text-gray-900">{venta.motivo || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha Emisión DUT</label>
                <p className="mt-1 text-sm text-gray-900">{venta.fechaEmisionDUT ? formatDate(venta.fechaEmisionDUT) : '-'}</p>
              </div>
            </div>
          </div>

          {/* Control de cantidades */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Control de Cantidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">DUT</h4>
                <p className="text-2xl font-bold text-blue-600">{venta.cantidadEnDUT || '-'}</p>
                <p className="text-sm text-gray-500">Autorizadas</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">Remito</h4>
                <p className="text-2xl font-bold text-yellow-600">{venta.cantidadCargada || '-'}</p>
                <p className="text-sm text-gray-500">Cargadas</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">Romaneo</h4>
                <p className="text-2xl font-bold text-green-600">{venta.cantidadRomaneo || '-'}</p>
                <p className="text-sm text-gray-500">Faenadas</p>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Documentos</h3>
              <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90">
                Subir Documento
              </button>
            </div>
            <div className="space-y-2">
              {venta.documentos && venta.documentos.length > 0 ? (
                venta.documentos.map((documento) => (
                  <div key={documento.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{documento.nombreArchivo}</p>
                        <p className="text-sm text-gray-500">{formatDate(documento.fechaCarga)}</p>
                      </div>
                    </div>
                    <button className="text-primary hover:text-primary/80">Ver</button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay documentos cargados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estado y acciones */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estado</h3>
            <div className="space-y-4">
              <div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(venta.estado)}`}>
                  {getEstadoDisplay(venta.estado)}
                </span>
              </div>
              <div className="space-y-2">
                <button className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary">
                  Marcar como Retirado
                </button>
                <button 
                  onClick={handleEdit}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Editar Venta
                </button>
              </div>
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen Financiero</h3>
            <div className="space-y-3">
              {venta.importeEnUSD && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total en USD:</span>
                  <span className="font-medium">${venta.importeEnUSD.toLocaleString()}</span>
                </div>
              )}
              {venta.tipoCambio && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de Cambio:</span>
                  <span className="font-medium">{venta.tipoCambio.toFixed(4)}</span>
                </div>
              )}
              {venta.importeOriginal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total en ARS:</span>
                  <span className="font-medium">{formatCurrency(venta.importeOriginal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({venta.iva}%):</span>
                <span className="font-medium">
                  {venta.totalOperacion && venta.importeNeto 
                    ? formatCurrency(venta.totalOperacion - venta.importeNeto)
                    : venta.importeNeto && venta.iva
                    ? formatCurrency(venta.importeNeto * (venta.iva / 100))
                    : '-'
                  }
                </span>
              </div>
              <hr />
              {venta.totalAPagar && (
                <div className="flex justify-between font-bold text-lg">
                  <span>Total a Pagar:</span>
                  <span>{formatCurrency(venta.totalAPagar)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Pagado:</span>
                <span className="font-medium text-green-600">{formatCurrency(venta.totalPagado)}</span>
              </div>
              {venta.totalAPagar && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Saldo Pendiente:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(venta.totalAPagar - venta.totalPagado)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900">Alertas</h3>
            </div>
            <div className="space-y-2">
              {venta.alertas && venta.alertas.length > 0 ? (
                venta.alertas.map((alerta) => (
                  <div key={alerta.id} className={`p-3 border rounded-lg ${
                    alerta.severidad === 'CRITICA' ? 'bg-red-50 border-red-200' :
                    alerta.severidad === 'ALTA' ? 'bg-orange-50 border-orange-200' :
                    alerta.severidad === 'MEDIA' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`text-sm ${
                      alerta.severidad === 'CRITICA' ? 'text-red-800' :
                      alerta.severidad === 'ALTA' ? 'text-orange-800' :
                      alerta.severidad === 'MEDIA' ? 'text-yellow-800' :
                      'text-gray-800'
                    }`}>
                      <strong>{alerta.tipo.replace(/_/g, ' ')}:</strong> {alerta.mensaje}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay alertas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

