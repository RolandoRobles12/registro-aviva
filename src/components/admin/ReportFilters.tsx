// src/components/admin/ReportFilters.tsx - Advanced filters for reports
import React, { useState, useEffect } from 'react';
import { User, Kiosk, Hub } from '../../types';
import { ReportFilters } from '../../services/reportsService';
import { getAllUsers, getAllKiosks, getAllHubs } from '../../services/reportsService';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilters) => void;
  initialFilters?: Partial<ReportFilters>;
}

export default function ReportFiltersComponent({ onFilterChange, initialFilters }: ReportFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState<string>(
    initialFilters?.startDate?.toISOString().split('T')[0] ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    initialFilters?.endDate?.toISOString().split('T')[0] ||
    new Date().toISOString().split('T')[0]
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialFilters?.userIds || []);
  const [selectedKioskIds, setSelectedKioskIds] = useState<string[]>(initialFilters?.kioskIds || []);
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>(initialFilters?.hubIds || []);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(initialFilters?.productTypes || []);
  const [selectedCheckInType, setSelectedCheckInType] = useState<string>(initialFilters?.checkInType || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters?.status || '');

  // Load options
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [usersData, kiosksData, hubsData] = await Promise.all([
        getAllUsers(),
        getAllKiosks(),
        getAllHubs()
      ]);

      setUsers(usersData.filter(u => u.status === 'active'));
      setKiosks(kiosksData);
      setHubs(hubsData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleApplyFilters = () => {
    const filters: ReportFilters = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      kioskIds: selectedKioskIds.length > 0 ? selectedKioskIds : undefined,
      hubIds: selectedHubIds.length > 0 ? selectedHubIds : undefined,
      productTypes: selectedProductTypes.length > 0 ? selectedProductTypes : undefined,
      checkInType: selectedCheckInType as any || undefined,
      status: selectedStatus as any || undefined,
    };

    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedUserIds([]);
    setSelectedKioskIds([]);
    setSelectedHubIds([]);
    setSelectedProductTypes([]);
    setSelectedCheckInType('');
    setSelectedStatus('');

    onFilterChange({
      startDate: firstDayOfMonth,
      endDate: new Date(),
    });
  };

  const activeFiltersCount = [
    selectedUserIds.length > 0,
    selectedKioskIds.length > 0,
    selectedHubIds.length > 0,
    selectedProductTypes.length > 0,
    selectedCheckInType !== '',
    selectedStatus !== '',
  ].filter(Boolean).length;

  const productTypes = ['BA', 'Aviva_Contigo', 'Casa_Marchand', 'Otro'];

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFiltersCount} activos
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {isExpanded ? 'Ocultar' : 'Mostrar'} filtros
        </button>
      </div>

      {/* Quick Date Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            const today = new Date();
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Hoy
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            setStartDate(lastWeek.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Última Semana
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(firstDay.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Este Mes
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            setStartDate(lastMonth.toISOString().split('T')[0]);
            setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
          }}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Mes Anterior
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="space-y-4 border-t pt-4">
          {/* Users Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empleados ({selectedUserIds.length} seleccionados)
            </label>
            <select
              multiple
              value={selectedUserIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedUserIds(selected);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              size={5}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples
            </p>
          </div>

          {/* Hubs Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hubs ({selectedHubIds.length} seleccionados)
            </label>
            <select
              multiple
              value={selectedHubIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedHubIds(selected);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              size={3}
            >
              {hubs.map(hub => (
                <option key={hub.id} value={hub.id}>
                  {hub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kiosks Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kioscos ({selectedKioskIds.length} seleccionados)
            </label>
            <select
              multiple
              value={selectedKioskIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedKioskIds(selected);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              size={5}
            >
              {kiosks.map(kiosk => (
                <option key={kiosk.id} value={kiosk.id}>
                  {kiosk.name} - {kiosk.city}
                </option>
              ))}
            </select>
          </div>

          {/* Product Types Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipos de Producto ({selectedProductTypes.length} seleccionados)
            </label>
            <div className="space-y-2">
              {productTypes.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductTypes([...selectedProductTypes, type]);
                      } else {
                        setSelectedProductTypes(selectedProductTypes.filter(t => t !== type));
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Check-in Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Check-in
            </label>
            <select
              value={selectedCheckInType}
              onChange={(e) => setSelectedCheckInType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="comida">Comida</option>
              <option value="regreso_comida">Regreso de Comida</option>
              <option value="salida">Salida</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">Todos</option>
              <option value="a_tiempo">A Tiempo</option>
              <option value="retrasado">Retrasado</option>
              <option value="anticipado">Anticipado</option>
              <option value="ubicacion_invalida">Ubicación Inválida</option>
              <option value="auto_closed">Auto Cerrado</option>
            </select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <button
          onClick={handleClearFilters}
          className="flex items-center text-sm text-gray-600 hover:text-gray-700"
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          Limpiar Filtros
        </button>
        <Button onClick={handleApplyFilters}>
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );
}
