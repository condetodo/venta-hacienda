import React, { useState, useEffect } from 'react';
import { Venta, VentasFilters } from '../../types';
import { ventasService } from '../../services/ventas.service';
import { dutExtractionService } from '../../services/dut-extraction.service';
import { NuevaVentaModal } from './NuevaVentaModal';
import { Search, Filter, Plus, Eye, ArrowRight, Trash2 } from 'lucide-react';

interface VentasListProps {
  onViewVenta?: (venta: Venta) => void;
  onChangeEstado?: (venta: Venta) => void;
  onDeleteVenta?: (venta: Venta) => void;
  onCreateVenta?: () => void;
  refreshTrigger?: number; // Para forzar refresh desde el padre
}

export const VentasList: React.FC<VentasListProps> = ({
  onViewVenta,
  onChangeEstado,
  onDeleteVenta,
  onCreateVenta,
  refreshTrigger,
}) => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VentasFilters>({
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showNuevaVentaModal, setShowNuevaVentaModal] = useState(false);
  const [conflictoDUT, setConflictoDUT] = useState<{
    show: boolean;
    data: any;
    ventaExistente: Venta | null;
  }>({
    show: false,
    data: null,
    ventaExistente: null,
  });

  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ventasService.getAll(filters);
      setVentas(response.ventas);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, [filters, refreshTrigger]);

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      titularDestino: searchTerm || undefined,
      page: 1,
    }));
  };

  const handleFilterChange = (key: keyof VentasFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
  };

  const handleNuevaVenta = async (data: any) => {
    try {
      // Crear la venta
      const response = await ventasService.create(data);
      const ventaCreada = response.venta;
      console.log('Venta creada:', ventaCreada);
      
      // Si hay un archivo DUT asociado, subirlo
      console.log('🔍 Verificando archivo DUT...');
      console.log('data.archivoDUT:', data.archivoDUT);
      console.log('ventaCreada.id:', ventaCreada.id);
      
      if (data.archivoDUT && ventaCreada.id) {
        try {
          console.log('📤 Subiendo documento DUT...');
          console.log('Archivo:', data.archivoDUT.name, data.archivoDUT.size, 'bytes');
          console.log('Venta ID:', ventaCreada.id);
          
          const resultado = await dutExtractionService.uploadDocumentToVenta({
            archivo: data.archivoDUT,
            ventaId: ventaCreada.id,
            tipoDocumento: 'DUT'
          });
          
          console.log('✅ Documento DUT subido exitosamente:', resultado);
        } catch (docError) {
          console.error('❌ Error subiendo documento DUT:', docError);
          console.error('Error details:', docError.response?.data);
          // No fallar la operación si no se puede subir el documento
          alert('Venta creada exitosamente, pero hubo un problema subiendo el documento. Puedes subirlo manualmente desde la página de detalle.');
        }
      } else {
        console.log('⚠️ No se subirá documento - archivoDUT:', !!data.archivoDUT, 'ventaCreada.id:', !!ventaCreada.id);
      }
      
      fetchVentas(); // Refrescar la lista
      setShowNuevaVentaModal(false);
    } catch (error: any) {
      console.error('Error creando venta:', error);
      
      // Manejo específico de errores
      if (error.response?.status === 409) {
        // Buscar la venta existente para mostrar información
        const ventaExistente = ventas.find(v => v.numeroDUT === data.numeroDUT);
        setConflictoDUT({
          show: true,
          data,
          ventaExistente: ventaExistente || null,
        });
        setShowNuevaVentaModal(false);
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || 'Datos inválidos';
        alert(`Error de validación: ${errorMessage}`);
      } else {
        alert('Error al crear la venta. Por favor, intente nuevamente.');
      }
    }
  };

  const handleActualizarVentaExistente = async () => {
    if (!conflictoDUT.ventaExistente || !conflictoDUT.data) return;
    
    try {
      // Actualizar la venta existente
      await ventasService.update(conflictoDUT.ventaExistente.id, conflictoDUT.data);
      
      // Si hay un archivo DUT asociado, subirlo
      if (conflictoDUT.data.archivoDUT) {
        try {
          console.log('Subiendo documento DUT a venta existente...');
          await dutExtractionService.uploadDocumentToVenta({
            archivo: conflictoDUT.data.archivoDUT,
            ventaId: conflictoDUT.ventaExistente.id,
            tipoDocumento: 'DUT'
          });
          console.log('Documento DUT subido exitosamente');
        } catch (docError) {
          console.error('Error subiendo documento DUT:', docError);
          alert('Venta actualizada exitosamente, pero hubo un problema subiendo el documento. Puedes subirlo manualmente desde la página de detalle.');
        }
      }
      
      fetchVentas(); // Refrescar la lista
      setConflictoDUT({ show: false, data: null, ventaExistente: null });
    } catch (error: any) {
      console.error('Error actualizando venta:', error);
      alert('Error al actualizar la venta. Por favor, intente nuevamente.');
    }
  };

  const handleCancelarConflicto = () => {
    setConflictoDUT({ show: false, data: null, ventaExistente: null });
    setShowNuevaVentaModal(true); // Reabrir el modal para editar
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
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
              placeholder="Buscar por DUT, cliente..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
          
          <button
            onClick={() => setShowNuevaVentaModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.estado || ''}
                onChange={(e) => handleFilterChange('estado', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Todos los estados</option>
                <option value="ABIERTO">Abierto</option>
                <option value="PENDIENTE">Abierto (Pendiente)</option>
                <option value="RETIRADO">Retirado</option>
                <option value="ROMANEO">Romaneo</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filters.categoria || ''}
                onChange={(e) => handleFilterChange('categoria', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Todas las categorías</option>
                <option value="OVEJA">Oveja</option>
                <option value="BORREGO">Borrego</option>
                <option value="CORDERO">Cordero</option>
                <option value="CAPON">Capón</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.fechaDesde || ''}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.fechaHasta || ''}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!ventas || ventas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron ventas</p>
          </div>
        ) : (
          <>
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
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Carga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargados
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Romaneo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventas?.map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {venta.numeroDUT}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.titularDestino.length > 20 
                          ? `${venta.titularDestino.substring(0, 20)}...` 
                          : venta.titularDestino}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.categoria}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.cantidadEnDUT}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.fechaCargaDUT ? formatDate(venta.fechaCargaDUT) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.cantidadCargada || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venta.cantidadRomaneo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(venta.estado)}`}>
                          {getEstadoDisplay(venta.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onChangeEstado?.(venta)}
                            className="text-green-600 hover:text-green-800"
                            title="Cambiar estado"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onViewVenta?.(venta)}
                            className="text-primary hover:text-primary/80"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteVenta?.(venta)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={!ventas || ventas.length < (filters.limit || 20)}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{((filters.page || 1) - 1) * (filters.limit || 20) + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min((filters.page || 1) * (filters.limit || 20), total)}
                      </span>{' '}
                      de <span className="font-medium">{total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange((filters.page || 1) - 1)}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => handlePageChange((filters.page || 1) + 1)}
                        disabled={!ventas || ventas.length < (filters.limit || 20)}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Nueva Venta */}
      <NuevaVentaModal
        isOpen={showNuevaVentaModal}
        onClose={() => setShowNuevaVentaModal(false)}
        onSubmit={handleNuevaVenta}
      />

      {/* Modal Conflicto DUT */}
      {conflictoDUT.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-sm font-bold">!</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Conflicto de DUT
                </h3>
                <p className="text-sm text-gray-500">
                  Ya existe una venta con este número de DUT
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>DUT:</strong> {conflictoDUT.data?.numeroDUT}
              </p>
              {conflictoDUT.ventaExistente && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Venta existente:</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Cliente: {conflictoDUT.ventaExistente.titularDestino}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fecha: {new Date(conflictoDUT.ventaExistente.fechaEmisionDUT).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleActualizarVentaExistente}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Actualizar venta existente
              </button>
              <button
                onClick={handleCancelarConflicto}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm font-medium"
              >
                Editar datos
              </button>
              <button
                onClick={() => setConflictoDUT({ show: false, data: null, ventaExistente: null })}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
