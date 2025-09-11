import React from 'react';
import { TimeOffRequest } from '../../types';
import { formatPercentage } from '../../utils/formatters';

interface TimeOffRequestStatsProps {
  requests: TimeOffRequest[];
}

export function TimeOffRequestStats({ requests }: TimeOffRequestStatsProps) {
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  // Type breakdown
  const vacations = requests.filter(r => r.type === 'vacaciones').length;
  const avivaDays = requests.filter(r => r.type === 'aviva_day').length;
  const sickLeave = requests.filter(r => r.type === 'incapacidad').length;

  const stats = [
    {
      label: 'Total',
      value: total,
      color: 'text-gray-900'
    },
    {
      label: 'Pendientes',
      value: `${pending} (${formatPercentage(total > 0 ? (pending / total) * 100 : 0)})`,
      color: 'text-yellow-600'
    },
    {
      label: 'Aprobadas',
      value: `${approved} (${formatPercentage(total > 0 ? (approved / total) * 100 : 0)})`,
      color: 'text-green-600'
    },
    {
      label: 'Rechazadas',
      value: `${rejected} (${formatPercentage(total > 0 ? (rejected / total) * 100 : 0)})`,
      color: 'text-red-600'
    },
    {
      label: 'Vacaciones',
      value: `${vacations} (${formatPercentage(total > 0 ? (vacations / total) * 100 : 0)})`,
      color: 'text-blue-600'
    },
    {
      label: 'Días Aviva',
      value: `${avivaDays} (${formatPercentage(total > 0 ? (avivaDays / total) * 100 : 0)})`,
      color: 'text-purple-600'
    },
    {
      label: 'Incapacidades',
      value: `${sickLeave} (${formatPercentage(total > 0 ? (sickLeave / total) * 100 : 0)})`,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Estadísticas de Solicitudes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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