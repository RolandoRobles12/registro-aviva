import React, { useState } from 'react';
import { AttendanceIssue } from '../../types';
import { Button } from '../ui';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AttendanceIssuesTableProps {
  issues: AttendanceIssue[];
  onResolve: (issueId: string, resolution: string) => Promise<void>;
}

const ISSUE_TYPE_LABELS: Record<AttendanceIssue['type'], string> = {
  no_entry: 'Sin registro de entrada',
  no_exit: 'Sin registro de salida',
  no_lunch_return: 'Sin regreso de comida',
  late_lunch_return: 'Regreso tarde de comida',
  auto_closed: 'Cierre automático'
};

const ISSUE_TYPE_COLORS: Record<AttendanceIssue['type'], string> = {
  no_entry: 'bg-red-100 text-red-800',
  no_exit: 'bg-orange-100 text-orange-800',
  no_lunch_return: 'bg-yellow-100 text-yellow-800',
  late_lunch_return: 'bg-amber-100 text-amber-800',
  auto_closed: 'bg-gray-100 text-gray-800'
};

export function AttendanceIssuesTable({ issues, onResolve }: AttendanceIssuesTableProps) {
  const [selectedIssue, setSelectedIssue] = useState<AttendanceIssue | null>(null);
  const [resolution, setResolution] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleResolveClick = (issue: AttendanceIssue) => {
    setSelectedIssue(issue);
    setResolution('');
  };

  const handleResolveSubmit = async () => {
    if (!selectedIssue || !resolution.trim()) return;

    try {
      setProcessing(true);
      await onResolve(selectedIssue.id, resolution);
      setSelectedIssue(null);
      setResolution('');
    } catch (error) {
      console.error('Error resolving issue:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (issues.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-12 w-12 text-green-400">
          <CheckIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay faltas pendientes
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Todas las incidencias de asistencia han sido resueltas.
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
                  Tipo de Falta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora Esperada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detectado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {issue.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {issue.productType}
                      </div>
                      {issue.kioskName && (
                        <div className="text-xs text-gray-400">
                          {issue.kioskName}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ISSUE_TYPE_COLORS[issue.type]}`}>
                      {ISSUE_TYPE_LABELS[issue.type]}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(issue.date)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {issue.expectedTime}
                    </div>
                    {issue.minutesLate && issue.minutesLate > 0 && (
                      <div className="text-xs text-red-600">
                        +{issue.minutesLate} min tarde
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatRelativeTime(issue.detectedAt)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {issue.resolved ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Resuelto
                        </span>
                        {issue.resolvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            por {issue.resolvedBy}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Pendiente
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {!issue.resolved ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResolveClick(issue)}
                        leftIcon={<CheckIcon className="h-4 w-4" />}
                      >
                        Resolver
                      </Button>
                    ) : issue.resolution && (
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={issue.resolution}>
                        {issue.resolution}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Resolver Falta
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Issue Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Detalles de la Falta
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usuario:</span>
                    <span className="text-gray-900">{selectedIssue.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="text-gray-900">{ISSUE_TYPE_LABELS[selectedIssue.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="text-gray-900">{formatDate(selectedIssue.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hora esperada:</span>
                    <span className="text-gray-900">{selectedIssue.expectedTime}</span>
                  </div>
                  {selectedIssue.minutesLate && selectedIssue.minutesLate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Retraso:</span>
                      <span className="text-red-600">{selectedIssue.minutesLate} minutos</span>
                    </div>
                  )}
                  {selectedIssue.ruleTriggered && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Regla activada:</span>
                      <span className="text-gray-900">{selectedIssue.ruleTriggered}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolución / Comentarios <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe cómo se resolvió esta falta (ej: 'Justificado por enfermedad', 'Olvido de registro - corregido manualmente', etc.)"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Esta información quedará registrada en el historial
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedIssue(null)}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleResolveSubmit}
                loading={processing}
                disabled={!resolution.trim()}
                leftIcon={<CheckIcon className="h-4 w-4" />}
              >
                Marcar como Resuelto
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
