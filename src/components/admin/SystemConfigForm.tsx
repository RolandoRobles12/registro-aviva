import React, { useState, useEffect } from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Select, Alert } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { SystemConfig, ProductType } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import { ArrowDownTrayIcon as SaveIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function SystemConfigForm() {
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  const [selectedProduct, setSelectedProduct] = useState<string>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Valores por defecto SOLO para inicialización
  const getDefaultConfig = (): Partial<SystemConfig> => ({
    toleranceMinutes: 5,
    severeDelayThreshold: 20,
    defaultRadius: 150,
    restDay: 'sunday',
    // NUEVAS configuraciones de ausencias
    absenceRules: {
      noEntryAfterMinutes: 60,
      noExitAfterMinutes: 120,
    },
    autoCloseRules: {
      closeAfterMinutes: 60,
      markAsAbsent: true,
    },
    lunchRules: {
      maxDurationMinutes: 90,
    },
    notificationRules: {
      notifyOnAbsence: true,
      notifyOnLateExit: false,
    },
    alertRules: {
      generateOnIrregularities: true,
    },
    approvalRules: {
      requireForLateExit: false,
    }
  });

  const {
    values,
    errors,
    handleSubmit,
    setValue,
    reset
  } = useForm<Partial<SystemConfig>>(
    getDefaultConfig(),
    (values) => {
      const fieldErrors: Partial<Record<string, string>> = {};
      
      if (!values.toleranceMinutes || values.toleranceMinutes < 0 || values.toleranceMinutes > 60) {
        fieldErrors.toleranceMinutes = 'Debe ser entre 0 y 60 minutos';
      }
      
      if (!values.severeDelayThreshold || values.severeDelayThreshold < 5 || values.severeDelayThreshold > 120) {
        fieldErrors.severeDelayThreshold = 'Debe ser entre 5 y 120 minutos';
      }
      
      if (!values.defaultRadius || values.defaultRadius < 50 || values.defaultRadius > 1000) {
        fieldErrors.defaultRadius = 'Debe ser entre 50 y 1000 metros';
      }

      // Validaciones para las nuevas reglas
      if (values.absenceRules?.noEntryAfterMinutes && (values.absenceRules.noEntryAfterMinutes < 0 || values.absenceRules.noEntryAfterMinutes > 480)) {
        fieldErrors['absenceRules.noEntryAfterMinutes'] = 'Debe ser entre 0 y 480 minutos (8 horas)';
      }

      if (values.absenceRules?.noExitAfterMinutes && (values.absenceRules.noExitAfterMinutes < 0 || values.absenceRules.noExitAfterMinutes > 480)) {
        fieldErrors['absenceRules.noExitAfterMinutes'] = 'Debe ser entre 0 y 480 minutos (8 horas)';
      }

      if (values.autoCloseRules?.closeAfterMinutes && (values.autoCloseRules.closeAfterMinutes < 0 || values.autoCloseRules.closeAfterMinutes > 240)) {
        fieldErrors['autoCloseRules.closeAfterMinutes'] = 'Debe ser entre 0 y 240 minutos (4 horas)';
      }

      if (values.lunchRules?.maxDurationMinutes && (values.lunchRules.maxDurationMinutes < 30 || values.lunchRules.maxDurationMinutes > 180)) {
        fieldErrors['lunchRules.maxDurationMinutes'] = 'Debe ser entre 30 y 180 minutos (3 horas)';
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
      reset(config);
    } else {
      reset(getDefaultConfig());
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

  const handleNestedValueChange = (path: string, value: any) => {
    const keys = path.split('.');
    if (keys.length === 2) {
      const [parent, child] = keys;
      setValue(parent as any, {
        ...((values as any)[parent] || {}),
        [child]: value
      });
    }
  };

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

        {/* NUEVA SECCIÓN: Configuración de Inasistencias y Ausencias */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Inasistencias y Ausencias
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Inasistencia por Falta de Entrada (minutos)"
              type="number"
              min="0"
              max="480"
              value={values.absenceRules?.noEntryAfterMinutes || ''}
              onChange={(e) => handleNestedValueChange('absenceRules.noEntryAfterMinutes', parseInt(e.target.value) || 60)}
              error={errors['absenceRules.noEntryAfterMinutes']}
              helpText="Si no hay registro de entrada después de X minutos del horario, se marca como ausencia"
            />

            <Input
              label="Ausencia por Falta de Salida (minutos)"
              type="number"
              min="0"
              max="480"
              value={values.absenceRules?.noExitAfterMinutes || ''}
              onChange={(e) => handleNestedValueChange('absenceRules.noExitAfterMinutes', parseInt(e.target.value) || 120)}
              error={errors['absenceRules.noExitAfterMinutes']}
              helpText="Si no hay registro de salida después de X minutos del horario, se marca como ausencia parcial"
            />

            <Input
              label="Cierre Automático (minutos después de salida)"
              type="number"
              min="0"
              max="240"
              value={values.autoCloseRules?.closeAfterMinutes || ''}
              onChange={(e) => handleNestedValueChange('autoCloseRules.closeAfterMinutes', parseInt(e.target.value) || 60)}
              error={errors['autoCloseRules.closeAfterMinutes']}
              helpText="Minutos después del horario de salida para cerrar jornada automáticamente"
            />

            <Input
              label="Tiempo Máximo de Comida (minutos)"
              type="number"
              min="30"
              max="180"
              value={values.lunchRules?.maxDurationMinutes || ''}
              onChange={(e) => handleNestedValueChange('lunchRules.maxDurationMinutes', parseInt(e.target.value) || 90)}
              error={errors['lunchRules.maxDurationMinutes']}
              helpText="Tiempo máximo permitido para el período de comida"
            />
          </div>

          {/* Opciones Booleanas */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="markAsAbsentOnMissingExit"
                checked={values.autoCloseRules?.markAsAbsent || false}
                onChange={(e) => handleNestedValueChange('autoCloseRules.markAsAbsent', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="markAsAbsentOnMissingExit" className="ml-2 text-sm font-medium text-gray-700">
                Marcar como ausente si no hay registro de salida
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyAdminsOnAbsence"
                checked={values.notificationRules?.notifyOnAbsence || false}
                onChange={(e) => handleNestedValueChange('notificationRules.notifyOnAbsence', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="notifyAdminsOnAbsence" className="ml-2 text-sm font-medium text-gray-700">
                Notificar a administradores cuando se detecte una ausencia
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="generateAlertsOnIrregularities"
                checked={values.alertRules?.generateOnIrregularities || false}
                onChange={(e) => handleNestedValueChange('alertRules.generateOnIrregularities', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="generateAlertsOnIrregularities" className="ml-2 text-sm font-medium text-gray-700">
                Generar alertas automáticas por irregularidades
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireApprovalForLateCheckOut"
                checked={values.approvalRules?.requireForLateExit || false}
                onChange={(e) => handleNestedValueChange('approvalRules.requireForLateExit', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireApprovalForLateCheckOut" className="ml-2 text-sm font-medium text-gray-700">
                Requerir aprobación para registros de salida tardíos
              </label>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Funcionamiento de las Reglas
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Inasistencia por Entrada:</strong> Si el empleado no registra entrada después del tiempo configurado, se marca automáticamente como ausente</li>
                    <li><strong>Ausencia por Salida:</strong> Si no hay registro de salida después del tiempo límite, se considera ausencia parcial</li>
                    <li><strong>Cierre Automático:</strong> El sistema cierra automáticamente la jornada después del tiempo configurado</li>
                    <li><strong>Tiempo de Comida:</strong> Si el empleado excede el tiempo máximo de comida, se genera una alerta</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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
              <span className="text-blue-700">Ausencia Entrada:</span>
              <p className="font-medium text-blue-900">{values.absenceRules?.noEntryAfterMinutes} min</p>
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