import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Venta } from '../types';
import { VentasList } from '../components/ventas/VentasList';
import { VentaForm } from '../components/ventas/VentaForm';
import { CambioEstadoModal } from '../components/ventas/CambioEstadoModal';
import { NotificationModal } from '../components/common/NotificationModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { ToastContainer } from '../components/common/ToastContainer';
import { useNotification } from '../hooks/useNotification';
import { useConfirmation } from '../hooks/useConfirmation';
import { useToast } from '../hooks/useToast';
import { ventasService } from '../services/ventas.service';

export const Ventas: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCambioEstadoModal, setShowCambioEstadoModal] = useState(false);
  const [ventaParaCambio, setVentaParaCambio] = useState<Venta | null>(null);
  const { notification, showError, hideNotification } = useNotification();
  const { confirmation, handleConfirm, handleCancel, confirmDelete } = useConfirmation();
  const { toasts, showSuccess, showError: showErrorToast, removeToast } = useToast();

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

  const handleDeleteVenta = (venta: Venta) => {
    confirmDelete(
      `la venta ${venta.numeroDUT}`,
      async () => {
        try {
          console.log('Eliminar venta:', venta.id);
          
          // Llamar al servicio para eliminar
          await ventasService.delete(venta.id);
          
          // Refrescar la lista
          setRefreshTrigger(prev => prev + 1);
          
          // Mostrar mensaje de éxito con toast
          showSuccess(
            'Venta eliminada',
            `La venta ${venta.numeroDUT} ha sido eliminada exitosamente.`
          );
        } catch (error: any) {
          console.error('Error al eliminar venta:', error);
          const errorMessage = error.response?.data?.error || error.message || 'Error al eliminar la venta';
          showErrorToast(
            'Error al eliminar',
            errorMessage
          );
        }
      }
    );
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
      // Validar datos requeridos
      if (!data.numeroRemito || !data.cantidadCargada) {
        showError(
          'Datos incompletos',
          'Número de remito y cantidad cargada son obligatorios.'
        );
        return;
      }

      console.log('Marcar como retirado:', data);
      
      // Llamar al servicio para marcar como retirado
      const { venta } = await ventasService.marcarComoRetirado(data.ventaId, {
        numeroRemito: data.numeroRemito,
        fechaRemito: data.fechaRemito,
        cliente: data.cliente,
        transportista: data.transportista,
        categoria: data.categoria,
        motivo: data.motivo,
        cantidadCargada: data.cantidadCargada,
      });
      
      console.log('Venta actualizada:', venta);
      
      // Refrescar la lista
      setRefreshTrigger(prev => prev + 1);
      setShowCambioEstadoModal(false);
      setVentaParaCambio(null);
      
      // Mostrar mensaje de éxito con toast
      showSuccess(
        'Estado actualizado',
        `La venta ${venta.numeroDUT} ha sido marcada como retirada exitosamente.`
      );
    } catch (error: any) {
      console.error('Error al marcar como retirado:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al cambiar el estado de la venta';
      showErrorToast(
        'Error al actualizar estado',
        errorMessage
      );
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
      {/* Toasts */}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />

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

      {/* Modal de Notificaciones */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      {/* Modal de Confirmación */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        type={confirmation.type}
      />

    </div>
  );
};

