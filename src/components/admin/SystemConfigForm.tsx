import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Alert } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { SystemConfig, ProductType } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import { ArrowDownTrayIcon as SaveIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function SystemConfigForm() {
  // Estados locales directos para cada campo
  const [selectedProduct, setSelectedProduct] = useState<string>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados directos para cada campo de configuración
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(5);
  const [severeDelayThreshold, setSevereDelayThreshold] = useState<number>(20);
  const [defaultRadius, setDefaultRadius] = useState<number>(150);
  const [restDay, setRestDay] = useState<string>('sunday');
  
  // Estados para reglas de ausencia
  const [noEntryAfterMinutes, setNoEntryAfterMinutes] = useState<number>(60);
  const [noExitAfterMinutes, setNoExitAfterMinutes] = useState<number>(120);
  
  // Estados para cierre automático
  const [closeAfterMinutes, setCloseAfterMinutes] = useState<number>(60);
  const [markAsAbsent, setMarkAsAbsent] = useState<boolean>(true);
  
  // Estados para reglas de comida
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(90);
  
  // Estados para notificaciones
  const [notifyOnAbsence, setNotifyOnAbsence] = useState<boolean>(true);
  const [notifyOnLateExit, setNotifyOnLateExit] = useState<boolean>(false);
  
  // Estados para alertas y aprobaciones
  const [generateOnIrregularities, setGenerateOnIrregularities] = useState<boolean>(true);
  const [requireForLateExit, setRequireForLateExit] = useState<boolean>(false);

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

  // Cargar configuración inicial
  useEffect(() => {
    loadConfiguration();
  }, [selectedProduct]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      console.log('Cargando configuración para:', selectedProduct);
      
      const productType = selectedProduct === 'global' ? undefined : selectedProduct;
      const config = await FirestoreService.getSystemConfig(productType);
      
      if (config) {
        console.log('Configuración encontrada:', config);
        // Cargar valores existentes
        setToleranceMinutes(config.toleranceMinutes || 5);
        setSevereDelayThreshold(config.severeDelayThreshold || 20);
        setDefaultRadius(config.defaultRadius || 150);
        setRestDay(config.restDay || 'sunday');
        
        // Reglas de ausencia
        setNoEntryAfterMinutes(config.absenceRules?.noEntryAfterMinutes || 60);
        setNoExitAfterMinutes(config.absenceRules?.noExitAfterMinutes || 120);
        
        // Cierre automático
        setCloseAfterMinutes(config.autoCloseRules?.closeAfterMinutes || 60);
        setMarkAsAbsent(config.autoCloseRules?.markAsAbsent ?? true);
        
        // Comida
        setMaxDurationMinutes(config.lunchRules?.maxDurationMinutes || 90);
        
        // Notificaciones
        setNotifyOnAbsence(config.notificationRules?.notifyOnAbsence ?? true);
        setNotifyOnLateExit(config.notificationRules?.notifyOnLateExit ?? false);
        
        // Alertas y aprobaciones
        setGenerateOnIrregularities(config.alertRules?.generateOnIrregularities ?? true);
        setRequireForLateExit(config.approvalRules?.requireForLateExit ?? false);
      } else {
        console.log('No se encontró configuración, usando valores por defecto');
        // Valores por defecto
        setToleranceMinutes(5);
        setSevereDelayThreshold(20);
        setDefaultRadius(150);
        setRestDay('sunday');
        setNoEntryAfterMinutes(60);
        setNoExitAfterMinutes(120);
        setCloseAfterMinutes(60);
        setMarkAsAbsent(true);
        setMaxDurationMinutes(90);
        setNotifyOnAbsence(true);
        setNotifyOnLateExit(false);
        setGenerateOnIrregularities(true);
        setRequireForLateExit(false);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const configData: Partial<SystemConfig> = {
        toleranceMinutes,
        severeDelayThreshold,
        defaultRadius,
        restDay,
        absenceRules: {
          noEntryAfterMinutes,
          noExitAfterMinutes,
        },
        autoCloseRules: {
          closeAfterMinutes,
          markAsAbsent,
        },
        lunchRules: {
          maxDurationMinutes,
        },
        notificationRules: {
          notifyOnAbsence,
          notifyOnLateExit,
        },
        alertRules: {
          generateOnIrregularities,
        },
        approvalRules: {
          requireForLateExit,
        }
      };

      const productType = selectedProduct === 'global' ? undefined : selectedProduct;
      
      console.log('Guardando configuración:', { productType, configData });
      
      await FirestoreService.updateSystemConfig(
        configData,
        productType,
        'admin'
      );

      setSuccess('✅ Configuración guardada correctamente');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('❌ Error guardando configuración: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Validaciones en tiempo real
  const validateToleranceMinutes = (value: number) => {
    return value >= 0 && value <= 60;
  };

  const validateSevereDelayThreshold = (value: number) => {
    return value >= 5 && value <= 120;
  };

  const validateDefaultRadius = (value: number) => {
    return value >= 50 && value <= 1000;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2">Cargando configuración...</span>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen de Tolerancia (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={toleranceMinutes}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (validateToleranceMinutes(value)) {
                    setToleranceMinutes(value);
                  }
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutos después de la hora de entrada que se considera 'A Tiempo'
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de Retraso Grave (minutos)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={severeDelayThreshold}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (validateSevereDelayThreshold(value)) {
                    setSevereDelayThreshold(value);
                  }
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                A partir de cuántos minutos un retraso se marca como 'Grave'
              </p>
            </div>
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Ubicación
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Radio de Geocerca por Defecto (metros)
            </label>
            <input
              type="number"
              min="50"
              max="1000"
              value={defaultRadius}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (validateDefaultRadius(value)) {
                  setDefaultRadius(value);
                }
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Radio para kioscos sin valor específico
            </p>
          </div>
        </div>

        {/* Absence Rules */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración de Inasistencias y Ausencias
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inasistencia por Falta de Entrada (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="480"
                value={noEntryAfterMinutes}
                onChange={(e) => setNoEntryAfterMinutes(parseInt(e.target.value) || 60)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no hay registro de entrada después de X minutos del horario, se marca como ausencia
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ausencia por Falta de Salida (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="480"
                value={noExitAfterMinutes}
                onChange={(e) => setNoExitAfterMinutes(parseInt(e.target.value) || 120)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no hay registro de salida después de X minutos del horario, se marca como ausencia parcial
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cierre Automático (minutos después de salida)
              </label>
              <input
                type="number"
                min="0"
                max="240"
                value={closeAfterMinutes}
                onChange={(e) => setCloseAfterMinutes(parseInt(e.target.value) || 60)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutos después del horario de salida para cerrar jornada automáticamente
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo Máximo de Comida (minutos)
              </label>
              <input
                type="number"
                min="30"
                max="180"
                value={maxDurationMinutes}
                onChange={(e) => setMaxDurationMinutes(parseInt(e.target.value) || 90)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tiempo máximo permitido para el período de comida
              </p>
            </div>
          </div>

          {/* Boolean Options */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="markAsAbsentOnMissingExit"
                checked={markAsAbsent}
                onChange={(e) => setMarkAsAbsent(e.target.checked)}
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
                checked={notifyOnAbsence}
                onChange={(e) => setNotifyOnAbsence(e.target.checked)}
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
                checked={generateOnIrregularities}
                onChange={(e) => setGenerateOnIrregularities(e.target.checked)}
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
                checked={requireForLateExit}
                onChange={(e) => setRequireForLateExit(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireApprovalForLateCheckOut" className="ml-2 text-sm font-medium text-gray-700">
                Requerir aprobación para registros de salida tardíos
              </label>
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
            value={restDay}
            onChange={(e) => setRestDay(e.target.value)}
            options={restDayOptions}
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
              <p className="font-medium text-blue-900">{toleranceMinutes} min</p>
            </div>
            <div>
              <span className="text-blue-700">Retraso Grave:</span>
              <p className="font-medium text-blue-900">{severeDelayThreshold} min</p>
            </div>
            <div>
              <span className="text-blue-700">Radio Defecto:</span>
              <p className="font-medium text-blue-900">{defaultRadius} m</p>
            </div>
            <div>
              <span className="text-blue-700">Ausencia Entrada:</span>
              <p className="font-medium text-blue-900">{noEntryAfterMinutes} min</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saving}
            leftIcon={<SaveIcon className="h-4 w-4" />}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>

      {/* Debug Info (solo en desarrollo) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 rounded-md p-3 text-xs">
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify({
            selectedProduct,
            toleranceMinutes,
            severeDelayThreshold,
            defaultRadius,
            noEntryAfterMinutes,
            noExitAfterMinutes,
            saving
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}