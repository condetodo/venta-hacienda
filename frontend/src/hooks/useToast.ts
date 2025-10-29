import { useState, useCallback } from 'react';
import { ToastType, ToastData } from '../components/common/ToastContainer';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((
    type: ToastType,
    title: string,
    message: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      id,
      type,
      title,
      message,
      duration,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Métodos específicos para cada tipo
  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    addToast('success', title, message, duration);
  }, [addToast]);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    addToast('error', title, message, duration || 6000); // Errores duran más
  }, [addToast]);

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    addToast('warning', title, message, duration);
  }, [addToast]);

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    addToast('info', title, message, duration);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
