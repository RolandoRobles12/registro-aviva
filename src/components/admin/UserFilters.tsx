import React, { useState } from 'react';
import { Button, Input, Select } from '../ui';
import { User } from '../../types';
import { USER_ROLES } from '../../utils/constants';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface UserFiltersProps {
  onFiltersChange: (filters: any) => void;
  users: User[];
}

interface Filters {
  name: string;
  role: string;
  status: string;
  team: string;
}

export function UserFilters({ onFiltersChange, users }: UserFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    name: '',
    role: '',
    status: '',
    team: ''
  });

  const roleOptions = Object.entries(USER_ROLES).map(([key, label]) => ({
    value: key,
    label
  }));

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  // Get unique teams from users
  const teams = [...new Set(users.map(u => u.team).filter(Boolean))].sort();
  const teamOptions = teams.map(team => ({
    value: team!,
    label: team!
  }));

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: Filters = { name: '', role: '', status: '', team: '' };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          label="Buscar por nombre o email"
          placeholder="Buscar..."
          value={filters.name}
          onChange={(e) => handleFilterChange('name', e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
        />

        <Select
          label="Rol"
          placeholder="Todos los roles"
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
          options={roleOptions}
        />

        <Select
          label="Estado"
          placeholder="Todos los estados"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          options={statusOptions}
        />

        <Select
          label="Equipo"
          placeholder="Todos los equipos"
          value={filters.team}
          onChange={(e) => handleFilterChange('team', e.target.value)}
          options={teamOptions}
        />
      </div>
    </div>
  );
}