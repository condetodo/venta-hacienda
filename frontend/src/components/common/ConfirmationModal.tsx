import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
      case 'info':
        return <AlertTriangle className="h-8 w-8 text-blue-600" />;
      case 'warning':
      default:
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      case 'warning':
      default:
        return 'text-yellow-800';
    }
  };

  const getMessageColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-700';
      case 'info':
        return 'text-blue-700';
      case 'warning':
      default:
        return 'text-yellow-700';
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'warning':
      default:
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${getBackgroundColor()}`}>
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-semibold ${getTitleColor()}`}>
                {title}
              </h3>
              <p className={`mt-2 text-sm ${getMessageColor()}`}>
                {message}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonColor()}`}
            >
              {loading ? 'Procesando...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
