import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIn } from '../../types';
import { StatusBadge, ImageViewer } from '../common';
import { formatTimestamp } from '../../utils/formatters';
import { CHECK_IN_TYPES } from '../../utils/constants';
import { EyeIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface RecentCheckInsProps {
  checkIns: CheckIn[];
}

export function RecentCheckIns({ checkIns }: RecentCheckInsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const recentCheckIns = checkIns.slice(0, 10); // Show last 10

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Check-ins Recientes
        </h3>
        <Link
          to="/admin/checkins"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Ver todos
        </Link>
      </div>
      
      <div className="divide-y divide-gray-200">
        {recentCheckIns.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay check-ins recientes
          </div>
        ) : (
          recentCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {checkIn.userName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {CHECK_IN_TYPES[checkIn.type as keyof typeof CHECK_IN_TYPES]} - {checkIn.kioskName}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-3">
                    <StatusBadge status={checkIn.status} type="checkin" size="sm" />
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(checkIn.timestamp)}
                    </span>
                    {checkIn.photoUrl && (
                      <button
                        onClick={() => setSelectedImage(checkIn.photoUrl!)}
                        className="text-xs text-primary-600 hover:text-primary-500 flex items-center space-x-1"
                      >
                        <PhotoIcon className="h-3 w-3" />
                        <span>Ver foto</span>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {checkIn.validationResults.distanceFromKiosk}m del kiosco
                  </p>
                  {checkIn.validationResults.minutesLate > 0 && (
                    <p className="text-xs text-red-600">
                      {checkIn.validationResults.minutesLate} min tarde
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          isOpen={true}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage}
          title="Foto de Check-in"
        />
      )}
    </div>
  );
}