import React, { useState } from 'react';
import { Hub, ProductType } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import { Button } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  CubeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface HubsTableProps {
  hubs: Hub[];
  onEdit: (hub: Hub) => void;
  onDelete: (hub: Hub) => void;
  onToggleStatus: (hub: Hub) => void;
  onViewDetails: (hub: Hub) => void;
  onOpenReport: (hub: Hub) => void;
}

export function HubsTable({
  hubs,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  onOpenReport,
}: HubsTableProps) {
  const [expandedHubId, setExpandedHubId] = useState<string | null>(null);

  if (hubs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay Hubs</h3>
        <p className="mt-1 text-sm text-gray-500">
          Comienza creando un nuevo Hub para organizar tus registros.
        </p>
      </div>
    );
  }

  const toggleExpand = (hubId: string) => {
    setExpandedHubId(expandedHubId === hubId ? null : hubId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hub
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estados
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Productos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Creado
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {hubs.map(hub => (
            <React.Fragment key={hub.id}>
              <tr className="hover:bg-gray-50">
                {/* Hub Name & Description */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <CubeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {hub.name}
                      </div>
                      {hub.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {hub.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* States */}
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {hub.states.slice(0, 2).map(state => (
                      <span
                        key={state}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {state}
                      </span>
                    ))}
                    {hub.states.length > 2 && (
                      <button
                        onClick={() => toggleExpand(hub.id)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        +{hub.states.length - 2} más
                      </button>
                    )}
                  </div>
                </td>

                {/* Products */}
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {hub.productTypes.slice(0, 2).map(product => (
                      <span
                        key={product}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                      >
                        {PRODUCT_TYPES[product]}
                      </span>
                    ))}
                    {hub.productTypes.length > 2 && (
                      <button
                        onClick={() => toggleExpand(hub.id)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        +{hub.productTypes.length - 2} más
                      </button>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {hub.status === 'active' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Inactivo
                    </span>
                  )}
                </td>

                {/* Created Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {hub.createdAt && format(hub.createdAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(hub)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalles"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onEdit(hub)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(hub)}
                      className={hub.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                      title={hub.status === 'active' ? 'Desactivar' : 'Activar'}
                    >
                      {hub.status === 'active' ? (
                        <XCircleIcon className="h-5 w-5" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onOpenReport(hub)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Reporte diario de asistencia"
                    >
                      <EnvelopeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onDelete(hub)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>

              {/* Expanded Row */}
              {expandedHubId === hub.id && (
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* All States */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Estados ({hub.states.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {hub.states.map(state => (
                            <span
                              key={state}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              {state}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* All Products */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Productos ({hub.productTypes.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {hub.productTypes.map(product => (
                            <span
                              key={product}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                            >
                              {PRODUCT_TYPES[product]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {hub.description && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          Descripción
                        </h4>
                        <p className="text-sm text-gray-600">{hub.description}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <p>Creado por: {hub.createdBy}</p>
                      {hub.updatedBy && <p>Actualizado por: {hub.updatedBy}</p>}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
