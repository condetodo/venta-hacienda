import { useState } from 'react';
import { NotificationType } from '../components/common/NotificationModal';

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    autoClose: boolean = true
  ) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
    });

    // Auto-close after 3 seconds for success, 5 seconds for others
    if (autoClose) {
      const delay = type === 'success' ? 3000 : 5000;
      setTimeout(() => {
        hideNotification();
      }, delay);
    }
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showSuccess = (title: string, message: string) => {
    showNotification('success', title, message);
  };

  const showError = (title: string, message: string) => {
    showNotification('error', title, message, false); // Don't auto-close errors
  };

  const showWarning = (title: string, message: string) => {
    showNotification('warning', title, message);
  };

  const showInfo = (title: string, message: string) => {
    showNotification('info', title, message);
  };

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
