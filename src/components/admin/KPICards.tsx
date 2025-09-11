import React from 'react';
import { SystemKPIs } from '../../types';
import { formatPercentage, formatHours } from '../../utils/formatters';
import {
  ClockIcon,
  CheckCircleIcon,
  MapPinIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface KPICardsProps {
  kpis: SystemKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      title: 'Cumplimiento de Jornada',
      value: formatPercentage(kpis.punctualityPercentage),
      description: 'Porcentaje de check-ins a tiempo o anticipados',
      icon: CheckCircleIcon,
      color: kpis.punctualityPercentage >= 80 ? 'text-green-600' : 
             kpis.punctualityPercentage >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: kpis.punctualityPercentage >= 80 ? 'bg-green-50' : 
               kpis.punctualityPercentage >= 60 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      title: 'Precisión de Ubicación',
      value: formatPercentage(kpis.locationAccuracyPercentage),
      description: 'Porcentaje de registros con geolocalización válida',
      icon: MapPinIcon,
      color: kpis.locationAccuracyPercentage >= 90 ? 'text-green-600' : 
             kpis.locationAccuracyPercentage >= 70 ? 'text-yellow-600' : 'text-red-600',
      bgColor: kpis.locationAccuracyPercentage >= 90 ? 'bg-green-50' : 
               kpis.locationAccuracyPercentage >= 70 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      title: 'Total de Incidencias',
      value: kpis.totalIncidents.toString(),
      description: 'Suma de retrasos y ubicaciones inválidas',
      icon: ExclamationTriangleIcon,
      color: kpis.totalIncidents === 0 ? 'text-green-600' : 
             kpis.totalIncidents <= 5 ? 'text-yellow-600' : 'text-red-600',
      bgColor: kpis.totalIncidents === 0 ? 'bg-green-50' : 
               kpis.totalIncidents <= 5 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      title: 'Horas Trabajadas (Promedio)',
      value: formatHours(kpis.avgHoursWorked),
      description: 'Promedio de horas por jornada laboral',
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-md ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className={`text-lg font-medium ${card.color}`}>
                    {card.value}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500">
                {card.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}