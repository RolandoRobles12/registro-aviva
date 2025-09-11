// src/pages/admin/Reports.tsx - Placeholder component
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/ui';
import { 
  DocumentTextIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

export default function AdminReports() {
  const { user } = useAuth();

  const plannedReports = [
    {
      title: 'Reporte de Asistencia',
      description: 'Análisis detallado de puntualidad y asistencia por empleado',
      icon: ClockIcon,
      status: 'Próximamente'
    },
    {
      title: 'Reporte de Productividad',
      description: 'Métricas de rendimiento y horas trabajadas por equipo',
      icon: ChartBarIcon,
      status: 'Próximamente'
    },
    {
      title: 'Reporte de Ubicaciones',
      description: 'Análisis de check-ins por kiosco y precisión GPS',
      icon: MapPinIcon,
      status: 'Próximamente'
    },
    {
      title: 'Reporte Mensual',
      description: 'Resumen ejecutivo mensual con KPIs principales',
      icon: CalendarDaysIcon,
      status: 'Próximamente'
    },
    {
      title: 'Reporte de Equipos',
      description: 'Análisis comparativo por departamentos y supervisores',
      icon: UsersIcon,
      status: 'Próximamente'
    },
    {
      title: 'Reporte Personalizado',
      description: 'Constructor de reportes con filtros avanzados',
      icon: DocumentTextIcon,
      status: 'Próximamente'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reportes y Análisis
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Genera reportes detallados y análisis del sistema de asistencia.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Alert */}
      <Alert
        type="info"
        title="Funcionalidad en Desarrollo"
        message="El módulo de reportes estará disponible en una próxima versión. Incluirá reportes automáticos, análisis avanzados y exportación en múltiples formatos."
      />

      {/* Planned Reports Grid */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Reportes Planificados
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plannedReports.map((report, index) => (
            <div
              key={index}
              className="relative bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <report.icon className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    {report.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {report.description}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {report.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Preview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Características Planificadas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">
              Funcionalidades de Reportes
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></div>
                Exportación en PDF, Excel y CSV
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></div>
                Filtros avanzados por fecha, usuario, kiosco
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></div>
                Gráficos interactivos y visualizaciones
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></div>
                Reportes automáticos programados
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></div>
                Comparativas históricas
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">
              Métricas Incluidas
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                Porcentaje de puntualidad por empleado
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                Horas trabajadas y productividad
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                Análisis de ubicaciones y precisión GPS
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                Tendencias y patrones de asistencia
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                Comparativas entre equipos y departamentos
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Temporary Workaround */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <DocumentTextIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Alternativa Temporal
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">
                Mientras se desarrolla este módulo, puedes usar las siguientes alternativas:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Exportar datos desde la sección de Check-ins</li>
                <li>Ver estadísticas en tiempo real en el Dashboard</li>
                <li>Usar la sección de Estadísticas para métricas generales</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}