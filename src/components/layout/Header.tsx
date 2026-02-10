// src/components/layout/Header.tsx - Versión optimizada
import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  isAdmin?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false, isAdmin = false }: HeaderProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-primary-700 bg-primary-600 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      {showMenuButton && (
        <button
          type="button"
          className="-m-2.5 p-2.5 text-white lg:hidden"
          onClick={onMenuClick}
        >
          <span className="sr-only">Abrir sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Separator */}
      <div className="h-6 w-px bg-primary-500 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Left side - Logo/Title (only visible on mobile) */}
        <div className="flex items-center lg:hidden">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="ml-2 text-lg font-semibold text-white">
              Asistencia Aviva
            </h1>
            {isAdmin && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-primary-800">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-primary-100 hover:text-white"
          >
            <span className="sr-only">Ver notificaciones</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-primary-500" aria-hidden="true" />

          {/* Logout button - always visible for shared devices */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-x-1.5 rounded-md bg-primary-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
            <span>Cerrar Sesión</span>
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-primary-500" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Abrir menú de usuario</span>
              <UserCircleIcon className="h-8 w-8 text-primary-100" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-white" aria-hidden="true">
                  {user?.name}
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-primary-200" aria-hidden="true" />
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user?.role === 'super_admin' && 'Super Administrador'}
                    {user?.role === 'admin' && 'Administrador'}
                    {user?.role === 'supervisor' && 'Supervisor'}
                    {user?.role === 'promotor' && 'Promotor'}
                  </p>
                </div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-50' : ''
                      } flex w-full px-3 py-2 text-sm text-gray-700`}
                    >
                      <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                      Mi Perfil
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-50' : ''
                      } flex w-full px-3 py-2 text-sm text-gray-700`}
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                      Configuración
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      className={`${
                        active ? 'bg-gray-50' : ''
                      } flex w-full px-3 py-2 text-sm text-gray-700`}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                      Cerrar Sesión
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}