import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Venta } from '../types';
import { VentasList } from '../components/ventas/VentasList';
import { VentaForm } from '../components/ventas/VentaForm';
import { CambioEstadoModal } from '../components/ventas/CambioEstadoModal';

export const Ventas: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCambioEstadoModal, setShowCambioEstadoModal] = useState(false);
  const [ventaParaCambio, setVentaParaCambio] = useState<Venta | null>(null);

  const handleCreateVenta = () => {
    setEditingVenta(null);
    setShowForm(true);
  };

  const handleChangeEstado = (venta: Venta) => {
    setVentaParaCambio(venta);
    setShowCambioEstadoModal(true);
  };

  const handleViewVenta = (venta: Venta) => {
    navigate(`/ventas/${venta.id}`);
  };

  const handleDeleteVenta = async (venta: Venta) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la venta ${venta.numeroDTE}?`)) {
      try {
        // Aquí implementarías la llamada a la API para eliminar
        console.log('Eliminar venta:', venta.id);
        // await ventasService.delete(venta.id);
        // Refrescar la lista
      } catch (error) {
        console.error('Error al eliminar venta:', error);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVenta(null);
    // Refrescar la lista de ventas
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingVenta(null);
  };

  const handleCambioEstadoSuccess = async (data: any) => {
    try {
      // TODO: Implementar llamada a la API para cambiar estado
      console.log('Cambiar estado de venta:', data);
      // await ventasService.changeEstado(data.ventaId, data.nuevoEstado, data);
      
      // Refrescar la lista
      setRefreshTrigger(prev => prev + 1);
      setShowCambioEstadoModal(false);
      setVentaParaCambio(null);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado de la venta');
    }
  };

  const handleCambioEstadoCancel = () => {
    setShowCambioEstadoModal(false);
    setVentaParaCambio(null);
  };

  if (showForm) {
    return (
      <VentaForm
        initialData={editingVenta || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <p className="text-gray-600">Gestiona todas las ventas de hacienda</p>
      </div>

      <VentasList
        onViewVenta={handleViewVenta}
        onChangeEstado={handleChangeEstado}
        onDeleteVenta={handleDeleteVenta}
        onCreateVenta={handleCreateVenta}
        refreshTrigger={refreshTrigger}
      />

      {/* Modal de Cambio de Estado */}
      {ventaParaCambio && (
        <CambioEstadoModal
          isOpen={showCambioEstadoModal}
          onClose={handleCambioEstadoCancel}
          onSubmit={handleCambioEstadoSuccess}
          venta={ventaParaCambio}
        />
      )}
    </div>
  );
};

