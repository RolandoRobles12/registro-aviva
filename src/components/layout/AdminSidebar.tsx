// src/components/layout/AdminSidebar.tsx - ACTUALIZADO CON HORARIOS
import React, { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: HomeIcon
  },
  {
    name: 'Check-ins',
    href: '/admin/checkins',
    icon: ClockIcon
  },
  {
    name: 'Reportes',
    href: '/admin/reports',
    icon: DocumentTextIcon
  },
  {
    name: 'Días Libres',
    href: '/admin/time-off',
    icon: CalendarDaysIcon
  },
  {
    name: 'Ubicaciones',
    href: '/admin/locations',
    icon: MapPinIcon
  },
  {
    name: 'Horarios', // NUEVA OPCIÓN
    href: '/admin/schedules',
    icon: AdjustmentsHorizontalIcon
  },
  {
    name: 'Estadísticas',
    href: '/admin/statistics',
    icon: ChartBarIcon
  },
  {
    name: 'Usuarios',
    href: '/admin/users',
    icon: UsersIcon
  },
  {
    name: 'Configuración',
    href: '/admin/configuration',
    icon: Cog6ToothIcon
  }
];

export function AdminSidebar({ isMobile = false, isOpen = false, onClose }: AdminSidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 bg-primary-600">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Cog6ToothIcon className="w-5 h-5 text-primary-600" />
          </div>
          <span className="ml-2 text-white font-medium">Admin</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 rounded-md p-1"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 bg-white overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) => 
              `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`mr-3 h-4 w-4 flex-shrink-0 ${
                    isActive 
                      ? 'text-primary-600' 
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`} 
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Panel de Administración
        </div>
      </div>
    </div>
  );

  // Mobile sidebar (overlay)
  if (isMobile) {
    return (
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose || (() => {})}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white focus:outline-none">
                {sidebarContent}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    );
  }

  // Desktop sidebar
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        {sidebarContent}
      </div>
    </div>
  );
}