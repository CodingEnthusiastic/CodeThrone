import toast from 'react-hot-toast';

// Toast utility functions
export const showError = (message: string) => {
  toast.error(message, {
    position: 'bottom-right',
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#fff',
    },
  });
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    position: 'bottom-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
    },
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    position: 'bottom-right',
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
    },
  });
};

export const showWarning = (message: string) => {
  toast(message, {
    position: 'bottom-right',
    duration: 3000,
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
    },
  });
};
