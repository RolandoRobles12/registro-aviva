import React, { useState } from 'react';
import { TimeOffRequest } from '../../types';
import { StatusBadge } from '../common';
import { Button, Modal, Input } from '../ui';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import { TIME_OFF_TYPES } from '../../utils/constants';
import {
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface TimeOffRequestTableProps {
  requests: TimeOffRequest[];
  onUpdate: (requestId: string, status: 'approved' | 'rejected', comment?: string) => Promise<void>;
}

interface ReviewModalData {
  request: TimeOffRequest;
  action: 'approve' | 'reject';
}

export function TimeOffRequestTable({ requests, onUpdate }: TimeOffRequestTableProps) {
  const [reviewModal, setReviewModal] = useState<ReviewModalData | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleReviewClick = (request: TimeOffRequest, action: 'approve' | 'reject') => {
    setReviewModal({ request, action });
    setComment('');
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;

    try {
      setProcessing(true);
      const status = reviewModal.action === 'approve' ? 'approved' : 'rejected';
      await onUpdate(reviewModal.request.id, status, comment || undefined);
      setReviewModal(null);
      setComment('');
    } catch (error) {
      console.error('Error processing review:', error);
    } finally {
      setProcessing(false);
    }
  };

  const calculateDuration = (startDate: any, endDate: any) => {
    const start = startDate.toDate ? startDate.toDate() : startDate;
    const end = endDate.toDate ? endDate.toDate() : endDate;
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (requests.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a4 4 0 118 0v4m-4 9v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay solicitudes
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No se encontraron solicitudes con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solicitado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.userEmail}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {TIME_OFF_TYPES[request.type as keyof typeof TIME_OFF_TYPES]}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(request.startDate)}
                    </div>
                    {request.startDate.toMillis() !== request.endDate.toMillis() && (
                      <div className="text-sm text-gray-500">
                        a {formatDate(request.endDate)}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {calculateDuration(request.startDate, request.endDate)} día(s)
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={request.status} type="request" />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatRelativeTime(request.createdAt)}
                    </div>
                    {request.reviewedAt && request.reviewerName && (
                      <div className="text-xs text-gray-500">
                        Revisado por {request.reviewerName}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {request.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleReviewClick(request, 'approve')}
                            leftIcon={<CheckIcon className="h-4 w-4" />}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReviewClick(request, 'reject')}
                            leftIcon={<XMarkIcon className="h-4 w-4" />}
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModal(null)}
          title={`${reviewModal.action === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud`}
        >
          <div className="space-y-4">
            {/* Request Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Detalles de la Solicitud
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Usuario:</span>
                  <span className="text-gray-900">{reviewModal.request.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="text-gray-900">
                    {TIME_OFF_TYPES[reviewModal.request.type as keyof typeof TIME_OFF_TYPES]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fechas:</span>
                  <span className="text-gray-900">
                    {formatDate(reviewModal.request.startDate)} - {formatDate(reviewModal.request.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duración:</span>
                  <span className="text-gray-900">
                    {calculateDuration(reviewModal.request.startDate, reviewModal.request.endDate)} día(s)
                  </span>
                </div>
                {reviewModal.request.reason && (
                  <div>
                    <span className="text-gray-600">Motivo:</span>
                    <p className="text-gray-900 mt-1">{reviewModal.request.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Input */}
            <Input
              label={`Comentario ${reviewModal.action === 'reject' ? '(requerido)' : '(opcional)'}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                reviewModal.action === 'approve'
                  ? 'Añade un comentario opcional...'
                  : 'Explica el motivo del rechazo...'
              }
              required={reviewModal.action === 'reject'}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setReviewModal(null)}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button
                variant={reviewModal.action === 'approve' ? 'success' : 'danger'}
                onClick={handleReviewSubmit}
                loading={processing}
                disabled={reviewModal.action === 'reject' && !comment.trim()}
              >
                {reviewModal.action === 'approve' ? 'Aprobar' : 'Rechazar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}