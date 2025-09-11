import React from 'react';
import { TimeOffRequest } from '../../types';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import { TIME_OFF_TYPES } from '../../utils/constants';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimeOffRequestListProps {
  requests: TimeOffRequest[];
}

export function TimeOffRequestList({ requests }: TimeOffRequestListProps) {
  const sortedRequests = [...requests].sort((a, b) => 
    b.createdAt.toMillis() - a.createdAt.toMillis()
  );

  if (requests.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Mis Solicitudes
        </h3>
        <div className="text-center py-6">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Sin solicitudes
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Aún no has enviado ninguna solicitud de días libres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Mis Solicitudes
      </h3>
      
      <div className="space-y-4">
        {sortedRequests.map((request) => (
          <div
            key={request.id}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {TIME_OFF_TYPES[request.type as keyof typeof TIME_OFF_TYPES]}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Solicitado {formatRelativeTime(request.createdAt)}
                </p>
              </div>
              <StatusBadge status={request.status} type="request" />
            </div>

            {/* Dates */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>
                  {formatDate(request.startDate)}
                  {request.startDate.toMillis() !== request.endDate.toMillis() && (
                    <> - {formatDate(request.endDate)}</>
                  )}
                </span>
              </div>
            </div>

            {/* Reason */}
            {request.reason && (
              <div className="text-sm text-gray-700">
                <p className="font-medium">Motivo:</p>
                <p className="mt-1">{request.reason}</p>
              </div>
            )}

            {/* Review Information */}
            {request.status !== 'pending' && request.reviewedBy && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start space-x-2 text-sm">
                  <ClockIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">
                        {request.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                      {' '}por {request.reviewerName} {formatRelativeTime(request.reviewedAt!)}
                    </p>
                    {request.reviewComment && (
                      <p className="text-gray-700 mt-1">
                        <strong>Comentario:</strong> {request.reviewComment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </p>
            <p className="text-xs text-gray-500">Aprobadas</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </p>
            <p className="text-xs text-gray-500">Rechazadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}