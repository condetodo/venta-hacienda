import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const onCloseRef = React.useRef(onClose);

  // Mantener la referencia de onClose actualizada
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Timer que se ejecuta cuando el componente se monta o cambia la duración
  React.useEffect(() => {
    const timerId = id; // Capturar el id actual
    const timer = setTimeout(() => {
      onCloseRef.current(timerId);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration]); // Dependemos de id y duration

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  const getMessageColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className={`w-full border rounded-lg shadow-lg pointer-events-auto ${getBackgroundColor()}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${getTitleColor()}`}>
                {title}
              </p>
              <p className={`text-sm ${getMessageColor()}`}>
                {message}
              </p>
            </div>
          </div>
          <button
            className={`rounded-md inline-flex ${getTitleColor()} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white`}
            onClick={() => onClose(id)}
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
