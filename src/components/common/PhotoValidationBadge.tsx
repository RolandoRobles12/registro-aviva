import React from 'react';
import { PhotoValidationResult, PhotoValidationStatus } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PhotoValidationBadgeProps {
  validation: PhotoValidationResult;
  variant?: 'compact' | 'detailed';
}

export function PhotoValidationBadge({ validation, variant = 'compact' }: PhotoValidationBadgeProps) {
  const { status, confidence } = validation;

  // Configuración de estilos según estado
  const config = getStatusConfig(status);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md ${config.bgColor} ${config.borderColor} border`}>
        <config.icon className={`h-4 w-4 ${config.iconColor}`} />
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-500">
          ({Math.round(confidence * 100)}%)
        </span>
      </div>
    );
  }

  // Modo detallado
  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start space-x-3">
        <config.icon className={`h-6 w-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />

        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${config.textColor} mb-2`}>
            {config.title}
          </h4>

          {/* Barra de confianza */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Confianza de validación</span>
              <span className={`font-semibold ${config.textColor}`}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${config.progressColor}`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Detalles de detección */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <DetectionItem
              label="Persona"
              detected={validation.personDetected}
              confidence={validation.personConfidence}
            />
            <DetectionItem
              label="Uniforme"
              detected={validation.uniformDetected}
              confidence={validation.uniformConfidence}
            />
            <DetectionItem
              label="Logo"
              detected={validation.logoDetected}
              confidence={validation.logoConfidence}
            />
            <DetectionItem
              label="Ubicación"
              detected={validation.locationValid}
              confidence={validation.locationConfidence}
            />
          </div>

          {/* Razón de rechazo */}
          {validation.rejectionReason && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <span className="font-medium">Razón: </span>
              {validation.rejectionReason}
            </div>
          )}

          {/* Notas de revisión manual */}
          {validation.reviewNotes && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <span className="font-medium">Nota del supervisor: </span>
              {validation.reviewNotes}
            </div>
          )}

          {/* Etiquetas detectadas (expandible) */}
          {validation.labels.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                Ver etiquetas detectadas ({validation.labels.length})
              </summary>
              <div className="mt-2 flex flex-wrap gap-1">
                {validation.labels.slice(0, 10).map((label, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {label.description} ({Math.round(label.score * 100)}%)
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para mostrar detección individual
function DetectionItem({
  label,
  detected,
  confidence,
}: {
  label: string;
  detected: boolean;
  confidence: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}:</span>
      <div className="flex items-center space-x-1">
        {detected ? (
          <>
            <CheckCircleIcon className="h-3 w-3 text-green-600" />
            <span className="text-green-700 font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </>
        ) : (
          <>
            <XCircleIcon className="h-3 w-3 text-red-600" />
            <span className="text-red-700">No</span>
          </>
        )}
      </div>
    </div>
  );
}

// Configuración de estilos según estado
function getStatusConfig(status: PhotoValidationStatus) {
  switch (status) {
    case 'auto_approved':
      return {
        label: 'Auto-aprobada',
        title: 'Foto Aprobada Automáticamente',
        icon: CheckCircleIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
        progressColor: 'bg-green-600',
      };

    case 'approved':
      return {
        label: 'Aprobada',
        title: 'Foto Aprobada por Supervisor',
        icon: CheckCircleIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
        progressColor: 'bg-green-600',
      };

    case 'rejected':
      return {
        label: 'Rechazada',
        title: 'Foto Rechazada',
        icon: XCircleIcon,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
        progressColor: 'bg-red-600',
      };

    case 'needs_review':
      return {
        label: 'Requiere revisión',
        title: 'Requiere Revisión Manual',
        icon: ExclamationTriangleIcon,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600',
        progressColor: 'bg-yellow-600',
      };

    case 'pending':
    default:
      return {
        label: 'Pendiente',
        title: 'Validación Pendiente',
        icon: ClockIcon,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-600',
        progressColor: 'bg-gray-600',
      };
  }
}
