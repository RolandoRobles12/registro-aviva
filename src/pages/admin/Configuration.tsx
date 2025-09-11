import React, { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { SystemConfigForm } from '../../components/admin/SystemConfigForm';
import { BusinessRulesManager } from '../../components/admin/BusinessRulesManager';
import { HolidaysManager } from '../../components/admin/HolidaysManager';
import { RolesManager } from '../../components/admin/RolesManager';
import { LoadingSpinner, Alert } from '../../components/ui';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  UsersIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const configTabs = [
  {
    id: 'system',
    name: 'General del Sistema',
    icon: Cog6ToothIcon,
    description: 'Parámetros globales para puntualidad y geocercas',
    component: SystemConfigForm
  },
  {
    id: 'rules',
    name: 'Motor de Reglas',
    icon: ShieldCheckIcon,
    description: 'Define, encadena y ajusta políticas de retardos, faltas y bloqueos',
    component: BusinessRulesManager
  },
  {
    id: 'holidays',
    name: 'Calendarios y Feriados',
    icon: CalendarDaysIcon,
    description: 'Administra el calendario corporativo y los feriados regionales',
    component: HolidaysManager
  },
  {
    id: 'roles',
    name: 'Organización & Roles',
    icon: UsersIcon,
    description: 'Gestiona roles, permisos y la estructura de equipos',
    component: RolesManager
  }
];

export default function AdminConfiguration() {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('system');
  const [loading, setLoading] = useState(false);

  // Only super admins can access configuration
  if (!isSuperAdmin()) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Acceso Restringido
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Solo los Super Administradores pueden acceder a la configuración del sistema.
          </p>
        </div>
      </div>
    );
  }

  const activeTabData = configTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración del Sistema
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Ajustes avanzados para la operación de Asistencia Aviva. Solo para Super Admins.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name}
              </div>
              <div className="text-xs text-red-600 font-medium">
                Super Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert
        type="warning"
        title="¡Importante!"
        message="Los cambios en esta sección afectan todo el sistema. Asegúrate de entender las implicaciones antes de realizar modificaciones."
      />

      {/* Tabs Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {configTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        {activeTabData && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {activeTabData.description}
            </p>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            ActiveComponent && <ActiveComponent />
          )}
        </div>
      </div>
    </div>
  );
}