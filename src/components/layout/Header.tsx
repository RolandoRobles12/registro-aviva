// src/components/layout/Header.tsx - Versión optimizada
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
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

          {/* Username + Logout button */}
          <div className="flex items-center gap-x-3">
            <UserCircleIcon className="h-8 w-8 text-primary-100" aria-hidden="true" />
            <span className="hidden lg:block text-sm font-semibold leading-6 text-white">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-x-1.5 rounded-md bg-primary-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 transition-colors"
              title="Cerrar Sesión"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}