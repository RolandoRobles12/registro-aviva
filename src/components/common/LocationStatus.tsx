import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks';
import { LoadingSpinner, Button, Alert } from '../ui';
import { MapPinIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatDistance } from '../../utils/formatters';

export function LocationStatus() {
  const { 
    location, 
    permission, 
    loading, 
    error, 
    getCurrentLocation, 
    requestPermission 
  } = useGeolocation();
  
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (location) {
      setLastUpdate(new Date());
    }
  }, [location]);

  const handleRefreshLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Error refreshing location:', error);
    }
  };

  const getStatusColor = () => {
    if (error || !permission.granted) return 'text-red-600';
    if (location) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (error || !permission.granted) return ExclamationTriangleIcon;
    if (location) return CheckCircleIcon;
    return MapPinIcon;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Estado de Ubicación</h3>
        <StatusIcon className={`h-6 w-6 ${getStatusColor()}`} />
      </div>

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              permission.granted ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Permisos de Ubicación
            </p>
            <p className="text-sm text-gray-600">
              {permission.granted ? 'Concedidos' : 'Denegados o no solicitados'}
            </p>
          </div>
        </div>

        {/* Current Location */}
        {location && (
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 rounded-full mt-2 bg-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Ubicación Actual
                </p>
                <p className="text-xs text-gray-600">
                  Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                </p>
                {location.accuracy && (
                  <p className="text-xs text-gray-500">
                    Precisión: {formatDistance(location.accuracy)}
                  </p>
                )}
              </div>
            </div>

            {lastUpdate && (
              <p className="text-xs text-gray-500 ml-5">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert
            type="error"
            message={error}
          />
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!permission.granted && (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={requestPermission}
              leftIcon={<MapPinIcon className="h-4 w-4" />}
            >
              Solicitar Permisos
            </Button>
          )}

          {permission.granted && (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={handleRefreshLocation}
              loading={loading}
              leftIcon={<MapPinIcon className="h-4 w-4" />}
            >
              Actualizar Ubicación
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 rounded-md p-3">
          <p className="text-xs text-blue-700">
            <strong>Importante:</strong> Para registrar tu check-in, necesitas dar permisos de ubicación 
            para verificar que estés en el kiosco correcto.
          </p>
        </div>
      </div>
    </div>
  );
}