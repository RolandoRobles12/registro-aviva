// src/components/ui/Toast.tsx - NUEVO COMPONENTE
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

export function Toast({ 
  isOpen, 
  onClose, 
  type = 'success', 
  title, 
  message, 
  duration = 5000,
  position = 'top-center'
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
      
      // Auto close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
      setClosing(false);
    }, 300); // Animation duration
  };

  if (!isOpen && !visible) return null;

  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  const positions = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const Icon = icons[type];

  const toastElement = (
    <div 
      className={`
        fixed z-50 max-w-sm w-full mx-4 
        ${positions[position]}
        transition-all duration-300 ease-in-out
        ${visible && !closing 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-2 scale-95'
        }
      `}
    >
      <div className={`
        rounded-lg shadow-lg overflow-hidden
        ${styles[type]}
        backdrop-blur-sm
      `}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className="h-6 w-6" />
            </div>
            
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold">
                {title}
              </p>
              {message && (
                <p className="mt-1 text-sm opacity-90">
                  {message}
                </p>
              )}
            </div>
            
            <div className="ml-4 flex-shrink-0">
              <button
                className="inline-flex text-white hover:opacity-75 focus:outline-none"
                onClick={handleClose}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-black bg-opacity-20">
          <div 
            className="h-full bg-white bg-opacity-50 transition-all ease-linear"
            style={{
              width: closing ? '0%' : '100%',
              transitionDuration: closing ? '300ms' : `${duration}ms`
            }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(toastElement, document.body);
}

// Hook personalizado para usar toasts fácilmente
export function useToast() {
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: undefined
  });

  const showToast = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string
  ) => {
    setToast({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess: (title: string, message?: string) => showToast('success', title, message),
    showError: (title: string, message?: string) => showToast('error', title, message),
    showWarning: (title: string, message?: string) => showToast('warning', title, message),
    showInfo: (title: string, message?: string) => showToast('info', title, message)
  };
}