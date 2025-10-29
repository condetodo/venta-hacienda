import { useState } from 'react';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const useConfirmation = () => {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'warning' | 'danger' | 'info';
      onCancel?: () => void;
    }
  ) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText || 'Confirmar',
      cancelText: options?.cancelText || 'Cancelar',
      type: options?.type || 'warning',
      onConfirm,
      onCancel: options?.onCancel,
    });
  };

  const hideConfirmation = () => {
    setConfirmation(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleConfirm = () => {
    if (confirmation.onConfirm) {
      confirmation.onConfirm();
    }
    hideConfirmation();
  };

  const handleCancel = () => {
    if (confirmation.onCancel) {
      confirmation.onCancel();
    }
    hideConfirmation();
  };

  // Métodos específicos para casos comunes
  const confirmDelete = (
    itemName: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showConfirmation(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar ${itemName}? Esta acción no se puede deshacer.`,
      onConfirm,
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger',
        onCancel,
      }
    );
  };

  const confirmAction = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showConfirmation(title, message, onConfirm, {
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      type: 'warning',
      onCancel,
    });
  };

  return {
    confirmation,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel,
    confirmDelete,
    confirmAction,
  };
};
