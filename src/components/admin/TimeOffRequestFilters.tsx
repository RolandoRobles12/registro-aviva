import React, { useState } from 'react';
import { Button, Input, Select } from '../ui';
import { TimeOffFilters } from '../../types';
import { TIME_OFF_TYPES, REQUEST_STATUS } from '../../utils/constants';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TimeOffRequestFiltersProps {
  filters: TimeOffFilters;
  onFiltersChange: (filters: TimeOffFilters) => void;
}

export function TimeOffRequestFilters({ filters, onFiltersChange }: TimeOffRequestFiltersProps) {
  const [localFilters, setLocalFilters] = useState<TimeOffFilters>(filters);

  const typeOptions = Object.entries(TIME_OFF_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const statusOptions = Object.entries(REQUEST_STATUS).map(([key, label]) => ({
    value: key,
    label
  }));

  const handleFilterChange = (key: keyof TimeOffFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : undefined;
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: date
      }
    }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: TimeOffFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  const formatDateForInput = (date: Date | undefined) => {
    return date ? date.toISOString().split('T')[0] : '';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            leftIcon={<XMarkIcon className="h-4 w-4" />}
          >
            Limpiar
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Buscar por nombre"
            placeholder="Nombre del usuario..."
            value={localFilters.userName || ''}
            onChange={(e) => handleFilterChange('userName', e.target.value)}
          />

          <Select
            label="Tipo de solicitud"
            placeholder="Todos los tipos"
            value={localFilters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            options={typeOptions}
          />

          <Select
            label="Estado"
            placeholder="Todos los estados"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={statusOptions}
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha desde"
            type="date"
            value={formatDateForInput(localFilters.dateRange?.start)}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
          />

          <Input
            label="Fecha hasta"
            type="date"
            value={formatDateForInput(localFilters.dateRange?.end)}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            min={formatDateForInput(localFilters.dateRange?.start)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="primary"
            onClick={applyFilters}
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}