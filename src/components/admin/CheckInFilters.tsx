import React, { useState } from 'react';
import { Button, Input, Select } from '../ui';
import { CheckInFilters as Filters, Kiosk } from '../../types';
import { PRODUCT_TYPES, CHECK_IN_TYPES, CHECK_IN_STATUS, MEXICAN_STATES } from '../../utils/constants';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CheckInFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  kiosks: Kiosk[];
}

export function CheckInFilters({ filters, onFiltersChange, kiosks }: CheckInFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Options for dropdowns
  const productTypeOptions = Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const checkInTypeOptions = Object.entries(CHECK_IN_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const statusOptions = Object.entries(CHECK_IN_STATUS).map(([key, label]) => ({
    value: key,
    label
  }));

  const stateOptions = MEXICAN_STATES.map(state => ({
    value: state,
    label: state
  }));

  const kioskOptions = kiosks.map(kiosk => ({
    value: kiosk.id,
    label: `${kiosk.name} - ${PRODUCT_TYPES[kiosk.productType]}`
  }));

  // Get unique cities from kiosks
  const cities = [...new Set(kiosks.map(k => k.city))].sort();
  const cityOptions = cities.map(city => ({
    value: city,
    label: city
  }));

  const handleFilterChange = (key: keyof Filters, value: any) => {
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
    const emptyFilters: Filters = {};
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
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Menos filtros' : 'Más filtros'}
          </Button>
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
      </div>

      <div className="space-y-4">
        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Input
            label="Buscar por nombre"
            placeholder="Nombre del usuario..."
            value={localFilters.userName || ''}
            onChange={(e) => handleFilterChange('userName', e.target.value)}
          />

          <Select
            label="Tipo de check-in"
            placeholder="Todos los tipos"
            value={localFilters.checkInType || ''}
            onChange={(e) => handleFilterChange('checkInType', e.target.value)}
            options={checkInTypeOptions}
          />

          <Select
            label="Estado"
            placeholder="Todos los estados"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={statusOptions}
          />

          <Select
            label="Producto"
            placeholder="Todos los productos"
            value={localFilters.productType || ''}
            onChange={(e) => handleFilterChange('productType', e.target.value)}
            options={productTypeOptions}
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

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <Select
              label="Kiosco específico"
              placeholder="Todos los kioscos"
              value={localFilters.kioskId || ''}
              onChange={(e) => handleFilterChange('kioskId', e.target.value)}
              options={kioskOptions}
            />

            <Select
              label="Estado geográfico"
              placeholder="Todos los estados"
              value={localFilters.state || ''}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              options={stateOptions}
            />

            <Select
              label="Ciudad"
              placeholder="Todas las ciudades"
              value={localFilters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              options={cityOptions}
            />
          </div>
        )}

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