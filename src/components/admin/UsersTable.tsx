import React from 'react';
import { User, SalesGoal } from '../../types';
import { StatusBadge } from '../common';
import { Button } from '../ui';
import { USER_ROLES } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';
import {
  PencilIcon,
  EllipsisVerticalIcon,
  PowerIcon,
  TrashIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onToggle: (userId: string, currentStatus: string) => void;
  onDelete: (userId: string) => void;
  onSetGoal?: (user: User) => void;
  salesGoals?: Map<string, SalesGoal>;
}

export function UsersTable({ users, onEdit, onToggle, onDelete, onSetGoal, salesGoals }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay usuarios
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comienza invitando a tu primer usuario al sistema.
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
              Usuario
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rol
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Equipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Slack ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meta Ventas
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Último Acceso
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {USER_ROLES[user.role]}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {user.team || '-'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {user.slackId || '-'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={user.status} type="user" />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                {salesGoals?.get(user.id) ? (
                  <button
                    onClick={() => onSetGoal?.(user)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800"
                    title="Editar meta"
                  >
                    {salesGoals.get(user.id)!.goal.toLocaleString('es-MX')}
                  </button>
                ) : (
                  <button
                    onClick={() => onSetGoal?.(user)}
                    className="text-xs text-gray-400 hover:text-primary-600"
                    title="Asignar meta"
                  >
                    —
                  </button>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">
                  {user.updatedAt ? formatRelativeTime(user.updatedAt) : 'Nunca'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
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
                              onClick={() => onEdit(user)}
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
                              onClick={() => onSetGoal?.(user)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                            >
                              <ChartBarIcon className="mr-3 h-4 w-4" />
                              Meta de ventas
                            </button>
                          )}
                        </Menu.Item>

                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => onToggle(user.id, user.status)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                            >
                              <PowerIcon className="mr-3 h-4 w-4" />
                              {user.status === 'active' ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => onDelete(user.id)}
                              className={`${
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              } flex w-full px-4 py-2 text-sm`}
                            >
                              <TrashIcon className="mr-3 h-4 w-4" />
                              Eliminar
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