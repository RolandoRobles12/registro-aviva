import React from 'react';
import { CheckIn } from '../../types';
import { formatTime } from '../../utils/formatters';
import { CHECK_IN_TYPES, CHECK_IN_STATUS } from '../../utils/constants';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface TodayCheckInsProps {
  checkIns: CheckIn[];
}

export function TodayCheckIns({ checkIns }: TodayCheckInsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'a_tiempo':
        return CheckCircleIcon;
      case 'retrasado':
        return ExclamationTriangleIcon;
      case 'anticipado':
        return CheckCircleIcon;
      case 'ubicacion_invalida':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'a_tiempo':
        return 'text-green-600 bg-green-50';
      case 'retrasado':
        return 'text-yellow-600 bg-yellow-50';
      case 'anticipado':
        return 'text-blue-600 bg-blue-50';
      case 'ubicacion_invalida':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (checkIns.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Registros de Hoy
        </h3>
        <div className="text-center py-6">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Sin registros
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Aún no has registrado ningún check-in hoy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Registros de Hoy
      </h3>
      
      <div className="space-y-3">
        {checkIns.map((checkIn) => {
          const StatusIcon = getStatusIcon(checkIn.status);
          const statusColor = getStatusColor(checkIn.status);
          
          return (
            <div
              key={checkIn.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1 rounded-full ${statusColor}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {CHECK_IN_TYPES[checkIn.type as keyof typeof CHECK_IN_TYPES]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {checkIn.kioskName}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatTime(checkIn.timestamp)}
                </p>
                <p className="text-xs text-gray-500">
                  {CHECK_IN_STATUS[checkIn.status as keyof typeof CHECK_IN_STATUS]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total de registros:</span>
          <span className="font-medium text-gray-900">{checkIns.length}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600">A tiempo:</span>
          <span className="font-medium text-green-600">
            {checkIns.filter(c => c.status === 'a_tiempo').length}
          </span>
        </div>
        {checkIns.some(c => c.status === 'retrasado') && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Retrasados:</span>
            <span className="font-medium text-yellow-600">
              {checkIns.filter(c => c.status === 'retrasado').length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}