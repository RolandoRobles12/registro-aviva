import React, { useEffect, useState } from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Alert } from '../ui';
import { Hub, ProductType } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import { HubService } from '../../services/hubs';

interface HubFormProps {
  hub?: Hub | null;
  onSave: (data: Partial<Hub>) => Promise<void>;
  onCancel: () => void;
}

export function HubForm({ hub, onSave, onCancel }: HubFormProps) {
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>(hub?.states || []);
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>(hub?.productTypes || []);
  const [newState, setNewState] = useState('');

  const {
    values,
    errors,
    handleSubmit,
    setValue,
    isSubmitting
  } = useForm<Partial<Hub>>(
    hub || {
      name: '',
      description: '',
      states: [],
      productTypes: [],
      status: 'active'
    },
    (values) => {
      const errors: Partial<Record<keyof Hub, string>> = {};

      if (!values.name || values.name.trim().length === 0) {
        errors.name = 'El nombre es requerido';
      }

      if (selectedStates.length === 0) {
        errors.states = 'Debe seleccionar al menos un estado';
      }

      if (selectedProducts.length === 0) {
        errors.productTypes = 'Debe seleccionar al menos un producto';
      }

      return errors;
    }
  );

  useEffect(() => {
    loadAvailableStates();
  }, []);

  const loadAvailableStates = async () => {
    const states = await HubService.getAvailableStates();
    setAvailableStates(states);
  };

  const handleFormSubmit = handleSubmit(async (formData) => {
    const dataToSave = {
      ...formData,
      states: selectedStates,
      productTypes: selectedProducts
    };
    await onSave(dataToSave);
  });

  const handleToggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state));
    } else {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const handleAddNewState = () => {
    if (newState.trim() && !selectedStates.includes(newState.trim())) {
      const trimmedState = newState.trim();
      setSelectedStates([...selectedStates, trimmedState]);
      if (!availableStates.includes(trimmedState)) {
        setAvailableStates([...availableStates, trimmedState].sort());
      }
      setNewState('');
    }
  };

  const handleToggleProduct = (productType: ProductType) => {
    if (selectedProducts.includes(productType)) {
      setSelectedProducts(selectedProducts.filter(p => p !== productType));
    } else {
      setSelectedProducts([...selectedProducts, productType]);
    }
  };

  const isEditing = !!hub;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Information Alert */}
      {!isEditing && (
        <Alert
          type="info"
          title="Crear Nuevo Hub"
          message="Los Hubs agrupan estados geográficos y productos para facilitar la visualización de registros."
        />
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <Input
          label="Nombre del Hub"
          placeholder="Ej: Hub Norte, Hub Centro, Hub Occidente"
          value={values.name || ''}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción (Opcional)
          </label>
          <textarea
            placeholder="Descripción breve del hub..."
            value={values.description || ''}
            onChange={(e) => setValue('description', e.target.value)}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={values.status || 'active'}
            onChange={(e) => setValue('status', e.target.value as 'active' | 'inactive')}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Estados Geográficos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estados Geográficos *
        </label>

        {/* Add new state */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Agregar nuevo estado..."
            value={newState}
            onChange={(e) => setNewState(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNewState();
              }
            }}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            type="button"
            onClick={handleAddNewState}
            disabled={!newState.trim()}
            variant="secondary"
          >
            Agregar
          </Button>
        </div>

        {/* Available states */}
        <div className="border rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
          {availableStates.length === 0 ? (
            <p className="text-sm text-gray-500">No hay estados disponibles. Agrega uno nuevo arriba.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableStates.map(state => (
                <label
                  key={state}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedStates.includes(state)}
                    onChange={() => handleToggleState(state)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{state}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Selected states */}
        {selectedStates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedStates.map(state => (
              <span
                key={state}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {state}
                <button
                  type="button"
                  onClick={() => handleToggleState(state)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {errors.states && (
          <p className="mt-1 text-sm text-red-600">{errors.states}</p>
        )}
      </div>

      {/* Tipos de Producto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipos de Producto *
        </label>

        <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
          {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={selectedProducts.includes(key as ProductType)}
                onChange={() => handleToggleProduct(key as ProductType)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-gray-500 ml-2">({key})</span>
              </div>
            </label>
          ))}
        </div>

        {/* Selected products */}
        {selectedProducts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProducts.map(product => (
              <span
                key={product}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {PRODUCT_TYPES[product]}
                <button
                  type="button"
                  onClick={() => handleToggleProduct(product)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {errors.productTypes && (
          <p className="mt-1 text-sm text-red-600">{errors.productTypes}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Hub' : 'Crear Hub'}
        </Button>
      </div>
    </form>
  );
}
