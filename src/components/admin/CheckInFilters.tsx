import React, { useState } from 'react';
import { Button, Input, Select } from '../ui';
import { CheckInFilters as Filters, Kiosk, Hub } from '../../types';
import { PRODUCT_TYPES, CHECK_IN_TYPES, CHECK_IN_STATUS, MEXICAN_STATES } from '../../utils/constants';
import { MagnifyingGlassIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface CheckInFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  kiosks: Kiosk[];
  hubs?: Hub[];
}

export function CheckInFilters({ filters, onFiltersChange, kiosks = [], hubs = [] }: CheckInFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Options for dropdowns - con verificación de que los datos existan
  const productTypeOptions = Object.entries(PRODUCT_TYPES || {}).map(([key, label]) => ({
    value: key,
    label
  }));

  const checkInTypeOptions = Object.entries(CHECK_IN_TYPES || {}).map(([key, label]) => ({
    value: key,
    label
  }));

  const statusOptions = Object.entries(CHECK_IN_STATUS || {}).map(([key, label]) => ({
    value: key,
    label
  }));

  const stateOptions = (MEXICAN_STATES || []).map(state => ({
    value: state,
    label: state
  }));

  const kioskOptions = (kiosks || []).map(kiosk => ({
    value: kiosk.id,
    label: `${kiosk.name} - ${PRODUCT_TYPES[kiosk.productType] || kiosk.productType} (${kiosk.id})`
  }));

  const hubOptions = (hubs || []).map(hub => ({
    value: hub.id,
    label: `${hub.name} (${hub.states.join(', ')})`
  }));

  // Get unique cities from kiosks - con verificación
  const cities = [...new Set((kiosks || []).map(k => k.city))].sort();
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
    if (!value) {
      // Si se borra la fecha, eliminar la parte correspondiente
      setLocalFilters(prev => {
        const newDateRange = { ...prev.dateRange };
        delete newDateRange[type];

        // Si ambas fechas fueron eliminadas, eliminar el objeto dateRange completamente
        if (!newDateRange.start && !newDateRange.end) {
          const { dateRange, ...rest } = prev;
          return rest;
        }

        return { ...prev, dateRange: newDateRange };
      });
      return;
    }

    // Crear fecha con la hora apropiada
    let date: Date;
    if (type === 'start') {
      // Fecha de inicio: 00:00:00
      date = new Date(value + 'T00:00:00');
    } else {
      // Fecha de fin: 23:59:59 para incluir todo el día
      date = new Date(value + 'T23:59:59');
    }

    console.log(`📅 Setting ${type} date:`, value, '→', date);

    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...(prev.dateRange || {}),
        [type]: date
      }
    }));
  };

  const applyFilters = () => {
    console.log('Applying filters:', localFilters);
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

  // Determine which filter will be used as primary (for Firestore optimization)
  const getPrimaryFilter = () => {
    if (localFilters.dateRange?.start && localFilters.dateRange?.end) return 'Rango de fechas';
    if (localFilters.kioskId) return 'Kiosco específico';
    if (localFilters.productType) return 'Tipo de producto';
    if (localFilters.status) return 'Estado';
    if (localFilters.checkInType) return 'Tipo de check-in';
    return 'Sin filtro principal';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filtros de Búsqueda</h3>
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

      {/* Filter Priority Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">Filtro principal optimizado: {getPrimaryFilter()}</p>
            <p className="text-blue-600 mt-1">
              Para mejor rendimiento, usa primero rango de fechas, luego kiosco específico, 
              después tipo de producto. Los demás filtros se aplicarán en memoria.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Primary Filters (Optimized for Firestore) */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-3">
            🚀 Filtros Principales
          </h4>
          
          {/* Date Range - Highest Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="📅 Fecha desde"
              type="date"
              value={formatDateForInput(localFilters.dateRange?.start)}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
            />

            <Input
              label="📅 Fecha hasta"
              type="date"
              value={formatDateForInput(localFilters.dateRange?.end)}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              min={formatDateForInput(localFilters.dateRange?.start)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hub */}
            <Select
              label="🏢 Hub"
              placeholder="Todos los hubs"
              value={localFilters.hubId || ''}
              onChange={(e) => handleFilterChange('hubId', e.target.value)}
              options={hubOptions}
            />

            {/* Kiosco - usando el formato de tu Select original */}
            <Select
              label="🏪 Kiosco específico"
              placeholder="Seleccionar kiosco..."
              value={localFilters.kioskId || ''}
              onChange={(e) => handleFilterChange('kioskId', e.target.value)}
              options={kioskOptions}
            />

            {/* Tipo de producto */}
            <Select
              label="📦 Tipo de producto"
              placeholder="Todos los productos"
              value={localFilters.productType || ''}
              onChange={(e) => handleFilterChange('productType', e.target.value)}
              options={productTypeOptions}
            />

            {/* Estado */}
            <Select
              label="📋 Estado"
              placeholder="Todos los estados"
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="👤 Buscar por nombre"
            placeholder="Nombre del usuario..."
            value={localFilters.userName || ''}
            onChange={(e) => handleFilterChange('userName', e.target.value)}
          />

          <Select
            label="⏰ Tipo de check-in"
            placeholder="Todos los tipos"
            value={localFilters.checkInType || ''}
            onChange={(e) => handleFilterChange('checkInType', e.target.value)}
            options={checkInTypeOptions}
          />
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              🔍 Filtros Adicionales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="🗺️ Estado geográfico"
                placeholder="Todos los estados"
                value={localFilters.state || ''}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                options={stateOptions}
              />

              <Select
                label="🏙️ Ciudad"
                placeholder="Todas las ciudades"
                value={localFilters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                options={cityOptions}
              />
            </div>
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

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Filtros Activos:</h4>
          <div className="flex flex-wrap gap-2">
            {localFilters.dateRange?.start && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📅 {formatDateForInput(localFilters.dateRange.start)} - {formatDateForInput(localFilters.dateRange.end)}
              </span>
            )}
            {localFilters.hubId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                🏢 {hubs.find(h => h.id === localFilters.hubId)?.name}
              </span>
            )}
            {localFilters.kioskId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🏪 {kiosks.find(k => k.id === localFilters.kioskId)?.name}
              </span>
            )}
            {localFilters.productType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                📦 {PRODUCT_TYPES[localFilters.productType as keyof typeof PRODUCT_TYPES]}
              </span>
            )}
            {localFilters.status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                📋 {CHECK_IN_STATUS[localFilters.status as keyof typeof CHECK_IN_STATUS]}
              </span>
            )}
            {localFilters.userName && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                👤 {localFilters.userName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}