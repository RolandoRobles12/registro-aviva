// src/components/admin/QuickActions.tsx - Complete version with all actions
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  UsersIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export function QuickActions() {
  const actions = [
    {
      title: 'Ver Check-ins',
      description: 'Administrar registros de asistencia',
      href: '/admin/checkins',
      icon: ClockIcon,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Gestionar Usuarios',
      description: 'Agregar y editar usuarios',
      href: '/admin/users',
      icon: UsersIcon,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Ubicaciones',
      description: 'Administrar kioscos',
      href: '/admin/locations',
      icon: MapPinIcon,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'Reportes',
      description: 'Ver reportes y análisis',
      href: '/admin/reports',
      icon: DocumentTextIcon,
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      title: 'Días Libres',
      description: 'Gestionar solicitudes',
      href: '/admin/time-off',
      icon: CalendarDaysIcon,
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      title: 'Estadísticas',
      description: 'Ver métricas y KPIs',
      href: '/admin/statistics',
      icon: ChartBarIcon,
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      title: 'Configuración',
      description: 'Ajustes del sistema',
      href: '/admin/configuration',
      icon: Cog6ToothIcon,
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Acciones Rápidas
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            className="group relative bg-white p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}