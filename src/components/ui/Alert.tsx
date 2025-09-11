import React from 'react';
import { clsx } from 'clsx';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  className
}: AlertProps) {
  const icons = {
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon
  };

  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const iconStyles = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400'
  };

  const Icon = icons[type];

  return (
    <div className={clsx('border rounded-md p-4', styles[type], className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={clsx('h-5 w-5', iconStyles[type])} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          <div className={clsx('text-sm', title && 'mt-1')}>
            <p>{message}</p>
          </div>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={clsx(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  type === 'success' && 'text-green-500 hover:bg-green-100 focus:ring-green-600',
                  type === 'warning' && 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600',
                  type === 'error' && 'text-red-500 hover:bg-red-100 focus:ring-red-600',
                  type === 'info' && 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                )}
                onClick={onDismiss}
              >
                <span className="sr-only">Cerrar</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}