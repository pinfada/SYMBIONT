import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number; // en ms
  onClose?: () => void;
}

const getColor = (type: string) => {
  switch (type) {
    case 'success': return '#00e0ff';
    case 'error': return '#ff4b6e';
    case 'info':
    default: return '#00e0ff';
  }
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3500, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="ext-toast" style={{ color: getColor(type) }}>
      {message}
    </div>
  );
};

export default Toast; 