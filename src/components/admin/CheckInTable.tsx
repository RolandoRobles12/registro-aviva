import React, { useState } from 'react';
import { CheckIn } from '../../types';
import { StatusBadge, ImageViewer } from '../common';
import { PhotoValidationBadge } from '../common/PhotoValidationBadge';
import { Button, LoadingSpinner } from '../ui';
import { formatTimestamp, formatDistance } from '../../utils/formatters';
import { CHECK_IN_TYPES, PRODUCT_TYPES } from '../../utils/constants';
import { PhotoIcon, EyeIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface CheckInTableProps {
  checkIns: CheckIn[];
  loading: boolean;
  hasNext: boolean;
  onLoadMore: () => void;
}

export function CheckInTable({ checkIns, loading, hasNext, onLoadMore }: CheckInTableProps) {
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);

  if (checkIns.length === 0 && !loading) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay registros
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No se encontraron check-ins con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kiosco
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evidencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Validación Foto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {checkIns.map((checkIn) => (
              <tr key={checkIn.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {checkIn.userName}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {checkIn.userId.slice(-6)}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {checkIn.kioskName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {PRODUCT_TYPES[checkIn.productType]}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {CHECK_IN_TYPES[checkIn.type as keyof typeof CHECK_IN_TYPES]}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatTimestamp(checkIn.timestamp)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={checkIn.status} type="checkin" />
                  {checkIn.validationResults.minutesLate > 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      {checkIn.validationResults.minutesLate} min tarde
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDistance(checkIn.validationResults.distanceFromKiosk)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {checkIn.validationResults.locationValid ? 'Válida' : 'Inválida'}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {checkIn.photoUrl ? (
                    <button
                      onClick={() => setSelectedImage({
                        url: checkIn.photoUrl!,
                        title: `${checkIn.userName} - ${formatTimestamp(checkIn.timestamp)}`
                      })}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-500"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      <span className="text-sm">Ver</span>
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400">Sin foto</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {checkIn.photoValidation ? (
                    <PhotoValidationBadge validation={checkIn.photoValidation} variant="compact" />
                  ) : (
                    <span className="text-sm text-gray-400">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasNext && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            loading={loading}
          >
            Cargar más registros
          </Button>
        </div>
      )}

      {/* Loading indicator for additional data */}
      {loading && hasNext && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          isOpen={true}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
        />
      )}
    </div>
  );
}