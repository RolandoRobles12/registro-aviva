import React from 'react';
import { Link } from 'react-router-dom';
import { TimeOffRequest } from '../../types';
import { StatusBadge } from '../common';
import { FirestoreService } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import { TIME_OFF_TYPES } from '../../utils/constants';
import { Button } from '../ui';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PendingRequestsProps {
  requests: TimeOffRequest[];
  onUpdate: () => void;
}

export function PendingRequests({ requests, onUpdate }: PendingRequestsProps) {
  const { user } = useAuth();

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    try {
      await FirestoreService.updateTimeOffRequest(
        requestId,
        'approved',
        user.id
      );
      onUpdate();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    
    try {
      await FirestoreService.updateTimeOffRequest(
        requestId,
        'rejected',
        user.id,
        'Rechazado desde panel de administración'
      );
      onUpdate();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Solicitudes Pendientes
        </h3>
        <Link
          to="/admin/time-off"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Ver todas
        </Link>
      </div>
      
      <div className="divide-y divide-gray-200">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay solicitudes pendientes
          </div>
        ) : (
          requests.slice(0, 5).map((request) => (
            <div key={request.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.userName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {TIME_OFF_TYPES[request.type as keyof typeof TIME_OFF_TYPES]}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                    {request.reason && (
                      <p className="text-xs text-gray-500 mt-1">
                        {request.reason}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleApprove(request.id)}
                    leftIcon={<CheckIcon className="h-4 w-4" />}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(request.id)}
                    leftIcon={<XMarkIcon className="h-4 w-4" />}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}