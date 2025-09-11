import React from 'react';
import { Alert } from '../ui';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export function RolesManager() {
  return (
    <div className="space-y-6">
      {/* Coming Soon Alert */}
      <Alert
        type="info"
        title="Funcionalidad en Desarrollo"
        message="La gestión avanzada de roles y equipos estará disponible en una próxima versión."
      />

      {/* Current Roles Display */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Roles Actuales del Sistema
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white rounded p-3 border">
                <h4 className="font-medium text-red-700">Super Administrador</h4>
                <p className="text-gray-600">Acceso total a todas las funciones y configuraciones del sistema</p>
                <div className="mt-1 text-xs text-gray-500">
                  Permisos: Todos (manage_all)
                </div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <h4 className="font-medium text-blue-700">Administrador</h4>
                <p className="text-gray-600">Gestión de usuarios, kioscos, aprobación de solicitudes y reportes</p>
                <div className="mt-1 text-xs text-gray-500">
                  Permisos: manage_users, manage_kiosks, manage_teams, approve_time_off, view_reports, perform_checkin
                </div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <h4 className="font-medium text-green-700">Supervisor</h4>
                <p className="text-gray-600">Visualización de reportes y aprobación de solicitudes de su equipo</p>
                <div className="mt-1 text-xs text-gray-500">
                  Permisos: view_reports, approve_time_off, perform_checkin
                </div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <h4 className="font-medium text-gray-700">Promotor</h4>
                <p className="text-gray-600">Solo puede registrar check-ins y solicitar días libres</p>
                <div className="mt-1 text-xs text-gray-500">
                  Permisos: perform_checkin
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}