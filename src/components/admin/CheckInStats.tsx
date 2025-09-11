import React from 'react';
import { CheckIn } from '../../types';
import { formatPercentage } from '../../utils/formatters';

interface CheckInStatsProps {
  checkIns: CheckIn[];
}

export function CheckInStats({ checkIns }: CheckInStatsProps) {
  const total = checkIns.length;
  const onTime = checkIns.filter(c => c.status === 'a_tiempo').length;
  const late = checkIns.filter(c => c.status === 'retrasado').length;
  const early = checkIns.filter(c => c.status === 'anticipado').length;
  const invalidLocation = checkIns.filter(c => c.status === 'ubicacion_invalida').length;
  const withPhoto = checkIns.filter(c => c.photoUrl).length;

  const stats = [
    {
      label: 'Total',
      value: total,
      color: 'text-gray-900'
    },
    {
      label: 'A Tiempo',
      value: `${onTime} (${formatPercentage(total > 0 ? (onTime / total) * 100 : 0)})`,
      color: 'text-green-600'
    },
    {
      label: 'Retrasados',
      value: `${late} (${formatPercentage(total > 0 ? (late / total) * 100 : 0)})`,
      color: 'text-yellow-600'
    },
    {
      label: 'Anticipados',
      value: `${early} (${formatPercentage(total > 0 ? (early / total) * 100 : 0)})`,
      color: 'text-blue-600'
    },
    {
      label: 'Ubicación Inválida',
      value: `${invalidLocation} (${formatPercentage(total > 0 ? (invalidLocation / total) * 100 : 0)})`,
      color: 'text-red-600'
    },
    {
      label: 'Con Fotografía',
      value: `${withPhoto} (${formatPercentage(total > 0 ? (withPhoto / total) * 100 : 0)})`,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Estadísticas de Registros
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <dt className="text-sm font-medium text-gray-500">
              {stat.label}
            </dt>
            <dd className={`mt-1 text-lg font-semibold ${stat.color}`}>
              {stat.value}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}