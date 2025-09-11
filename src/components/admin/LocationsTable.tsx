import React, { useState } from 'react';
import { Kiosk } from '../../types';
import { StatusBadge } from '../common';
import { Button } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { PRODUCT_TYPES } from '../../utils/constants';
import { formatDistance } from '../../utils/formatters';
import {
  PencilIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  TrashIcon,
  PowerIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface LocationsTableProps {
  kiosks: Kiosk[];
  onEdit: (kiosk: Kiosk) => void;
  onUpdate: () => void;
}

export function LocationsTable({ kiosks, onEdit, onUpdate }: LocationsTableProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleToggleStatus = async (kiosk: Kiosk) => {
    try {
      setProcessing(kiosk.id);
      const newStatus = kiosk.status === 'active' ? 'inactive' : 'active';
      
      await FirestoreService.saveKiosk({
        ...kiosk,
        status: newStatus
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error toggling kiosk status:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewOnMap = (kiosk: Kiosk) => {
    const url = `https://www.google.com/maps?q=${kiosk.coordinates.latitude},${kiosk.coordinates.longitude}`;
    window.open(url, '_blank');
  };

  if (kiosks.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <MapPinIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay kioscos registrados
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comienza añadiendo un nuevo kiosco o importando una lista.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre del Kiosco
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ubicación
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Coordenadas (Lat, Lng)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Radio (m)
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
          {kiosks.map((kiosk) => (
            <tr key={kiosk.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {kiosk.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {kiosk.id}
                  </div>
                </div>
              </td>
              
              <td className="px-6 py-4">
                <div>
                  <div className="text-sm text-gray-900">{kiosk.city}</div>
                  <div className="text-sm text-gray-500">{kiosk.state}</div>
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {PRODUCT_TYPES[kiosk.productType]}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {kiosk.coordinates.latitude.toFixed(6)}, {kiosk.coordinates.longitude.toFixed(6)}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {kiosk.radiusOverride || 'Default'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={kiosk.status} type="user" />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={processing === kiosk.id}
                    >
                      <span className="sr-only">Abrir menú</span>
                      <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                    </Menu.Button>
                  </div>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => onEdit(kiosk)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                            >
                              <PencilIcon className="mr-3 h-4 w-4" />
                              Editar
                            </button>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleViewOnMap(kiosk)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                            >
                              <EyeIcon className="mr-3 h-4 w-4" />
                              Ver en Mapa
                            </button>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleToggleStatus(kiosk)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                              disabled={processing === kiosk.id}
                            >
                              <PowerIcon className="mr-3 h-4 w-4" />
                              {kiosk.status === 'active' ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}