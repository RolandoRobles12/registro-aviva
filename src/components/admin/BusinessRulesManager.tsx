import React, { useState } from 'react';
import { Alert } from '../ui';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

export function BusinessRulesManager() {
  return (
    <div className="space-y-6">
      {/* Coming Soon Alert */}
      <Alert
        type="info"
        title="Funcionalidad en Desarrollo"
        message="El Motor de Reglas de Operación estará disponible en una próxima versión. Esta funcionalidad permitirá configurar reglas complejas de negocio."
      />

      {/* Preview of Future Functionality */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Próximas Funcionalidades
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800">Reglas Globales</h4>
                <p>Configuración de políticas que aplican a todo el sistema</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Reglas por Tipo de Kiosco</h4>
                <p>Configuraciones específicas por producto (BA, Aviva Contigo, etc.)</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Reglas por Kiosco/Usuario</h4>
                <p>Configuraciones específicas para kioscos individuales o usuarios</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Motor de Condiciones</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Tipo de Check-in (entrada, comida, salida)</li>
                  <li>Hora del día</li>
                  <li>Distancia GPS</li>
                  <li>Foto adjunta</li>
                  <li>Minutos de retraso</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Motor de Acciones</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Asignar estado de puntualidad</li>
                  <li>Sumar minutos de retraso</li>
                  <li>Exigir comentario</li>
                  <li>Notificar a supervisor/admin/usuario</li>
                  <li>Notificar a Slack</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}