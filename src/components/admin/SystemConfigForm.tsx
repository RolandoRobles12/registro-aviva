import React, { useState, useEffect } from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Select, Alert } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { SystemConfig, ProductType } from '../../types';
import { PRODUCT_TYPES, DEFAULT_SYSTEM_CONFIG } from '../../utils/constants';
import { ArrowDownTrayIcon as SaveIcon } from '@heroicons/react/24/outline';

export function SystemConfigForm() {
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  const [selectedProduct, setSelectedProduct] = useState<string>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    values,
    errors,
    handleSubmit,
    setValue,
    reset
  } = useForm<Partial<SystemConfig>>(
    DEFAULT_SYSTEM_CONFIG,
    (values) => {
      const fieldErrors: Partial<Record<keyof SystemConfig, string>> = {};
      
      if (!values.toleranceMinutes || values.toleranceMinutes < 0 || values.toleranceMinutes > 60) {
        fieldErrors.toleranceMinutes = 'Debe ser entre 0 y 60 minutos';
      }
      
      if (!values.severeDelayThreshold || values.severeDelayThreshold < 5 || values.severeDelayThreshold > 120) {
        fieldErrors.severeDelayThreshold = 'Debe ser entre 5 y 120 minutos';
      }
      
      if (!values.defaultRadius || values.defaultRadius < 50 || values.defaultRadius > 1000) {
        fieldErrors.defaultRadius = 'Debe ser entre 50 y 1000 metros';
      }
      
      return fieldErrors;
    }
  );

  const productOptions = [
    { value: 'global', label: 'Configuración Global' },
    ...Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
      value: key,
      label: `${label} (Específico)`
    }))
  ];

  const restDayOptions = [
    { value: 'sunday', label: 'Domingo' },
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' }
  ];

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    const config = configs[selectedProduct];
    if (config) {
      reset({
        toleranceMinutes: config.toleranceMinutes,
        severeDelayThreshold: config.severeDelayThreshold,
        defaultRadius: config.defaultRadius,
        restDay: config.restDay
      });
    } else {
      reset(DEFAULT_SYSTEM_CONFIG);
    }
  }, [selectedProduct, configs, reset]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      
      // Load global and all product-specific configs
      const configPromises = [
        FirestoreService.getSystemConfig('global'),
        ...Object.keys(PRODUCT_TYPES).map(productType => 
          FirestoreService.getSystemConfig(productType)
        )
      ];

      const configResults = await Promise.all(configPromises);
      const configMap: Record<string, SystemConfig> = {};

      // Global config
      if (configResults[0]) {
        configMap.global = configResults[0];
      }

      // Product-specific configs
      Object.keys(PRODUCT_TYPES).forEach((productType, index) => {
        if (configResults[index + 1]) {
          configMap[productType] = configResults[index + 1];
        }
      });

      setConfigs(configMap);
    } catch (error) {
      console.error('Error loading configurations:', error);
      setError('Error cargando configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = handleSubmit(async (formData) => {
    try {
      setSaving(true);
      setError(null);

      const productType = selectedProduct === 'global' ? undefined : selectedProduct;
      
      await FirestoreService.updateSystemConfig(
        formData,
        productType,
        'admin' // TODO: Get actual user ID
      );

      await loadConfigurations();
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {error && (
        <Alert type="error" message={error} dismissible onDismiss={() => setError(null)} />
      )}
      
      {success && (
        <Alert type="success" message={success} dismissible onDismiss={() => setSuccess(null)} />
      )}

      {/* Product Selection */}
      <div>
        <Select
          label="Configuración para"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          options={productOptions}
          helpText="Selecciona si quieres configurar parámetros globales o específicos por producto"
        />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tolerance Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Tolerancias
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Margen de Tolerancia (minutos)"
              type="number"
              min="0"
              max="60"
              value={values.toleranceMinutes || ''}
              onChange={(e) => setValue('toleranceMinutes', parseInt(e.target.value) || 0)}
              error={errors.toleranceMinutes}
              helpText="Minutos después de la hora de entrada que se considera 'A Tiempo'"
            />

            <Input
              label="Umbral de Retraso Grave (minutos)"
              type="number"
              min="5"
              max="120"
              value={values.severeDelayThreshold || ''}
              onChange={(e) => setValue('severeDelayThreshold', parseInt(e.target.value) || 0)}
              error={errors.severeDelayThreshold}
              helpText="A partir de cuántos minutos un retraso se marca como 'Grave'"
            />
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Ubicación
          </h3>
          
          <Input
            label="Radio de Geocerca por Defecto (metros)"
            type="number"
            min="50"
            max="1000"
            value={values.defaultRadius || ''}
            onChange={(e) => setValue('defaultRadius', parseInt(e.target.value) || 0)}
            error={errors.defaultRadius}
            helpText="Radio para kioscos sin valor específico"
          />
        </div>

        {/* Schedule Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Horarios
          </h3>
          
          <Select
            label="Día de Descanso"
            value={values.restDay || ''}
            onChange={(e) => setValue('restDay', e.target.value)}
            options={restDayOptions}
            error={errors.restDay}
            helpText="Día de la semana que se considera descanso laboral"
          />
        </div>

        {/* Current Values Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Configuración Actual ({selectedProduct === 'global' ? 'Global' : PRODUCT_TYPES[selectedProduct as ProductType]})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Tolerancia:</span>
              <p className="font-medium text-blue-900">{values.toleranceMinutes} min</p>
            </div>
            <div>
              <span className="text-blue-700">Retraso Grave:</span>
              <p className="font-medium text-blue-900">{values.severeDelayThreshold} min</p>
            </div>
            <div>
              <span className="text-blue-700">Radio Defecto:</span>
              <p className="font-medium text-blue-900">{values.defaultRadius} m</p>
            </div>
            <div>
              <span className="text-blue-700">Día Descanso:</span>
              <p className="font-medium text-blue-900">
                {restDayOptions.find(opt => opt.value === values.restDay)?.label}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saving}
            leftIcon={<SaveIcon className="h-4 w-4" />}
          >
            Publicar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}