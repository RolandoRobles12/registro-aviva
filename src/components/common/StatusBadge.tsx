import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  type?: 'checkin' | 'request' | 'user';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, type = 'checkin', size = 'sm' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === 'checkin') {
      switch (status) {
        case 'a_tiempo':
          return { label: 'A Tiempo', color: 'bg-green-100 text-green-800' };
        case 'retrasado':
          return { label: 'Retrasado', color: 'bg-yellow-100 text-yellow-800' };
        case 'anticipado':
          return { label: 'Anticipado', color: 'bg-blue-100 text-blue-800' };
        case 'ubicacion_invalida':
          return { label: 'Ubicación Inválida', color: 'bg-red-100 text-red-800' };
        default:
          return { label: status, color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    if (type === 'request') {
      switch (status) {
        case 'pending':
          return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' };
        case 'approved':
          return { label: 'Aprobado', color: 'bg-green-100 text-green-800' };
        case 'rejected':
          return { label: 'Rechazado', color: 'bg-red-100 text-red-800' };
        default:
          return { label: status, color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    if (type === 'user') {
      switch (status) {
        case 'active':
          return { label: 'Activo', color: 'bg-green-100 text-green-800' };
        case 'inactive':
          return { label: 'Inactivo', color: 'bg-gray-100 text-gray-800' };
        default:
          return { label: status, color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    return { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const { label, color } = getStatusConfig();
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        color,
        sizeClasses[size]
      )}
    >
      {label}
    </span>
  );
}