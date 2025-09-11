import React from 'react';
import { useGeolocation } from '../../hooks';
import { Alert, Button } from '../ui';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function LocationPermissions() {
  const { permission, requestPermission, loading } = useGeolocation();

  if (permission.granted) {
    return null;
  }

  return (
    <Alert
      type="warning"
      title="Permisos de Ubicación Requeridos"
      message="Para registrar tu check-in, necesitas conceder permisos de ubicación."
    >
      <div className="mt-4">
        <Button
          size="sm"
          onClick={requestPermission}
          loading={loading}
          leftIcon={<MapPinIcon className="h-4 w-4" />}
        >
          Conceder Permisos
        </Button>
      </div>
      
      <div className="mt-3 text-sm text-yellow-700">
        <p>Si el botón no funciona, puedes conceder permisos manualmente:</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>Haz clic en el icono de ubicación en la barra de direcciones</li>
          <li>Selecciona "Permitir" o "Always allow"</li>
          <li>Recarga la página si es necesario</li>
        </ol>
      </div>
    </Alert>
  );
}