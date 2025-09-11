import React from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Select } from '../ui';
import { kioskSchema } from '../../utils/validators';
import { PRODUCT_TYPES, MEXICAN_STATES } from '../../utils/constants';
import { Kiosk } from '../../types';

interface LocationFormProps {
  kiosk?: Kiosk | null;
  onSave: (data: Omit<Kiosk, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function LocationForm({ kiosk, onSave, onCancel }: LocationFormProps) {
  const {
    values,
    errors,
    handleSubmit,
    setValue,
    isSubmitting
  } = useForm<Omit<Kiosk, 'createdAt' | 'updatedAt'>>(
    kiosk || {
      id: '',
      name: '',
      city: '',
      state: '',
      productType: 'BA',
      coordinates: { latitude: 0, longitude: 0 },
      status: 'active'
    },
    (values) => {
      try {
        kioskSchema.parse(values);
        return {};
      } catch (error: any) {
        const fieldErrors: Partial<Record<keyof Kiosk, string>> = {};
        error.errors?.forEach((err: any) => {
          if (err.path?.length > 0) {
            fieldErrors[err.path[0] as keyof Kiosk] = err.message;
          }
        });
        return fieldErrors;
      }
    }
  );

  const productTypeOptions = Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const stateOptions = MEXICAN_STATES.map(state => ({
    value: state,
    label: state
  }));

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  const handleFormSubmit = handleSubmit(async (formData) => {
    await onSave(formData);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="ID del Kiosco"
          placeholder="0001"
          value={values.id}
          onChange={(e) => setValue('id', e.target.value)}
          error={errors.id}
          helpText="Formato de 4 dígitos (ej: 0001, 0002)"
          required
        />

        <Input
          label="Nombre del Kiosco"
          placeholder="Kiosco Chalco"
          value={values.name}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
          required
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Ciudad"
          placeholder="Chalco"
          value={values.city}
          onChange={(e) => setValue('city', e.target.value)}
          error={errors.city}
          required
        />

        <Select
          label="Estado"
          value={values.state}
          onChange={(e) => setValue('state', e.target.value)}
          options={stateOptions}
          placeholder="Selecciona un estado"
          error={errors.state}
          required
        />
      </div>

      {/* Product Type and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo de Producto"
          value={values.productType}
          onChange={(e) => setValue('productType', e.target.value as any)}
          options={productTypeOptions}
          error={errors.productType}
          required
        />

        <Select
          label="Estado"
          value={values.status}
          onChange={(e) => setValue('status', e.target.value as any)}
          options={statusOptions}
          error={errors.status}
          required
        />
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Latitud"
          type="number"
          step="any"
          placeholder="19.4326"
          value={values.coordinates.latitude || ''}
          onChange={(e) => setValue('coordinates', {
            ...values.coordinates,
            latitude: parseFloat(e.target.value) || 0
          })}
          error={errors.coordinates}
          helpText="Coordenada de latitud (ej: 19.4326)"
          required
        />

        <Input
          label="Longitud"
          type="number"
          step="any"
          placeholder="-99.1332"
          value={values.coordinates.longitude || ''}
          onChange={(e) => setValue('coordinates', {
            ...values.coordinates,
            longitude: parseFloat(e.target.value) || 0
          })}
          error={errors.coordinates}
          helpText="Coordenada de longitud (ej: -99.1332)"
          required
        />
      </div>

      {/* Radius Override */}
      <Input
        label="Radio Personalizado (metros)"
        type="number"
        placeholder="150"
        value={values.radiusOverride || ''}
        onChange={(e) => setValue('radiusOverride', 
          e.target.value ? parseInt(e.target.value) : undefined
        )}
        error={errors.radiusOverride}
        helpText="Opcional: Radio específico para este kiosco. Si se deja vacío, se usa el valor por defecto."
      />

      {/* Help Text */}
      <div className="bg-blue-50 rounded-md p-3">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Información Importante
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Usa herramientas como Google Maps para obtener coordenadas precisas</li>
          <li>• El radio por defecto es de 150 metros</li>
          <li>• Los kioscos inactivos no aparecerán en la lista de check-in</li>
          <li>• El ID debe ser único en todo el sistema</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
        >
          {kiosk ? 'Actualizar Kiosco' : 'Crear Kiosco'}
        </Button>
      </div>
    </form>
  );
}