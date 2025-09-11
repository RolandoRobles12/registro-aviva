// src/components/admin/LocationForm.tsx - Versión completa corregida
import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '../ui';
import { PRODUCT_TYPES, MEXICAN_STATES } from '../../utils/constants';
import { Kiosk } from '../../types';

interface LocationFormProps {
  kiosk?: Kiosk | null;
  onSave: (data: Omit<Kiosk, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function LocationForm({ kiosk, onSave, onCancel, saving = false }: LocationFormProps) {
  // Estados del formulario
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    city: '',
    state: '',
    productType: 'BA' as const,
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    radiusOverride: undefined as number | undefined,
    status: 'active' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario cuando cambia el kiosk
  useEffect(() => {
    console.log('Inicializando formulario con kiosk:', kiosk);
    
    if (kiosk) {
      // Modo edición
      setFormData({
        id: kiosk.id || '',
        name: kiosk.name || '',
        city: kiosk.city || '',
        state: kiosk.state || '',
        productType: kiosk.productType || 'BA',
        coordinates: {
          latitude: kiosk.coordinates?.latitude || 0,
          longitude: kiosk.coordinates?.longitude || 0
        },
        radiusOverride: kiosk.radiusOverride,
        status: kiosk.status || 'active'
      });
    } else {
      // Modo creación - formulario vacío
      setFormData({
        id: '',
        name: '',
        city: '',
        state: '',
        productType: 'BA',
        coordinates: {
          latitude: 0,
          longitude: 0
        },
        radiusOverride: undefined,
        status: 'active'
      });
    }
    
    // Limpiar errores
    setErrors({});
  }, [kiosk]);

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

  const handleInputChange = (field: string, value: any) => {
    console.log(`Cambiando ${field}:`, value);
    
    if (field.includes('.')) {
      // Campo anidado (ej: coordinates.latitude)
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar ID
    if (!formData.id.trim()) {
      newErrors.id = 'ID es requerido';
    } else if (!/^\d{4}$/.test(formData.id)) {
      newErrors.id = 'ID debe ser de 4 dígitos';
    }

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'Nombre es requerido';
    }

    // Validar ciudad
    if (!formData.city.trim()) {
      newErrors.city = 'Ciudad es requerida';
    }

    // Validar estado
    if (!formData.state.trim()) {
      newErrors.state = 'Estado es requerido';
    }

    // Validar coordenadas
    if (!formData.coordinates.latitude || formData.coordinates.latitude === 0) {
      newErrors.latitude = 'Latitud es requerida';
    } else if (formData.coordinates.latitude < -90 || formData.coordinates.latitude > 90) {
      newErrors.latitude = 'Latitud debe estar entre -90 y 90';
    }

    if (!formData.coordinates.longitude || formData.coordinates.longitude === 0) {
      newErrors.longitude = 'Longitud es requerida';
    } else if (formData.coordinates.longitude < -180 || formData.coordinates.longitude > 180) {
      newErrors.longitude = 'Longitud debe estar entre -180 y 180';
    }

    // Validar radio override si se proporciona
    if (formData.radiusOverride !== undefined && formData.radiusOverride !== null) {
      if (formData.radiusOverride < 50 || formData.radiusOverride > 1000) {
        newErrors.radiusOverride = 'Radio debe estar entre 50 y 1000 metros';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Enviando formulario:', formData);
    
    if (!validateForm()) {
      console.log('Errores de validación:', errors);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Preparar datos para enviar
      const dataToSave = {
        ...formData,
        radiusOverride: formData.radiusOverride || undefined
      };
      
      console.log('Datos a guardar:', dataToSave);
      
      await onSave(dataToSave);
    } catch (error) {
      console.error('Error en submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = saving || isSubmitting;

  console.log('Renderizando formulario. FormData:', formData);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="ID del Kiosco"
          placeholder="0001"
          value={formData.id}
          onChange={(e) => handleInputChange('id', e.target.value)}
          error={errors.id}
          helpText="Formato de 4 dígitos (ej: 0001, 0002)"
          required
          disabled={!!kiosk} // No cambiar ID en modo edición
        />

        <Input
          label="Nombre del Kiosco"
          placeholder="Kiosco Chalco"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          required
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Ciudad"
          placeholder="Chalco"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          error={errors.city}
          required
        />

        <Select
          label="Estado"
          value={formData.state}
          onChange={(e) => handleInputChange('state', e.target.value)}
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
          value={formData.productType}
          onChange={(e) => handleInputChange('productType', e.target.value)}
          options={productTypeOptions}
          error={errors.productType}
          required
        />

        <Select
          label="Estado"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
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
          value={formData.coordinates.latitude || ''}
          onChange={(e) => handleInputChange('coordinates.latitude', parseFloat(e.target.value) || 0)}
          error={errors.latitude}
          helpText="Coordenada de latitud (ej: 19.4326)"
          required
        />

        <Input
          label="Longitud"
          type="number"
          step="any"
          placeholder="-99.1332"
          value={formData.coordinates.longitude || ''}
          onChange={(e) => handleInputChange('coordinates.longitude', parseFloat(e.target.value) || 0)}
          error={errors.longitude}
          helpText="Coordenada de longitud (ej: -99.1332)"
          required
        />
      </div>

      {/* Radius Override */}
      <Input
        label="Radio Personalizado (metros)"
        type="number"
        placeholder="150"
        value={formData.radiusOverride || ''}
        onChange={(e) => handleInputChange('radiusOverride', e.target.value ? parseInt(e.target.value) : undefined)}
        error={errors.radiusOverride}
        helpText="Opcional: Radio específico para este kiosco. Si se deja vacío, se usa el valor por defecto (150m)."
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

      {/* Current Values Display */}
      <div className="bg-gray-50 rounded-md p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Vista Previa
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">ID:</span>
            <p className="font-medium">{formData.id || 'Sin especificar'}</p>
          </div>
          <div>
            <span className="text-gray-600">Nombre:</span>
            <p className="font-medium">{formData.name || 'Sin especificar'}</p>
          </div>
          <div>
            <span className="text-gray-600">Ubicación:</span>
            <p className="font-medium">{formData.city ? `${formData.city}, ${formData.state}` : 'Sin especificar'}</p>
          </div>
          <div>
            <span className="text-gray-600">Producto:</span>
            <p className="font-medium">{PRODUCT_TYPES[formData.productType]}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : (kiosk ? 'Actualizar Kiosco' : 'Crear Kiosco')}
        </Button>
      </div>

      {/* Debug Info (solo en desarrollo) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 rounded-md p-3 text-xs">
          <strong>Debug:</strong>
          <pre>{JSON.stringify(formData, null, 2)}</pre>
          <strong>Errores:</strong>
          <pre>{JSON.stringify(errors, null, 2)}</pre>
        </div>
      )}
    </form>
  );
}