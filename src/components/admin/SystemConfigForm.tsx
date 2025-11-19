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
  const [notifyOnLateArrival, setNotifyOnLateArrival] = useState<boolean>(true);
  const [notifyOnLongLunch, setNotifyOnLongLunch] = useState<boolean>(true);
  const [notifySupervisor, setNotifySupervisor] = useState<boolean>(true);
  const [notifyAdmin, setNotifyAdmin] = useState<boolean>(true);
  const [notifyUser, setNotifyUser] = useState<boolean>(true);

  // Estados para reglas de comentarios
  const [requireOnLateArrival, setRequireOnLateArrival] = useState<boolean>(true);
  const [requireOnEarlyDeparture, setRequireOnEarlyDeparture] = useState<boolean>(true);
  const [requireOnLongLunch, setRequireOnLongLunch] = useState<boolean>(true);
  const [minCommentLength, setMinCommentLength] = useState<number>(10);

  // Estados para configuración de Slack
  const [slackEnabled, setSlackEnabled] = useState<boolean>(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState<string>('');
  const [slackDefaultChannel, setSlackDefaultChannel] = useState<string>('');
  const [slackNotifyOnLateArrival, setSlackNotifyOnLateArrival] = useState<boolean>(true);
  const [slackNotifyOnAbsence, setSlackNotifyOnAbsence] = useState<boolean>(true);
  const [slackNotifyOnLongLunch, setSlackNotifyOnLongLunch] = useState<boolean>(true);

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
        setNotifyOnLateArrival(config.notificationRules?.notifyOnLateArrival ?? true);
        setNotifyOnLongLunch(config.notificationRules?.notifyOnLongLunch ?? true);
        setNotifySupervisor(config.notificationRules?.notifySupervisor ?? true);
        setNotifyAdmin(config.notificationRules?.notifyAdmin ?? true);
        setNotifyUser(config.notificationRules?.notifyUser ?? true);

        // Reglas de comentarios
        setRequireOnLateArrival(config.commentRules?.requireOnLateArrival ?? true);
        setRequireOnEarlyDeparture(config.commentRules?.requireOnEarlyDeparture ?? true);
        setRequireOnLongLunch(config.commentRules?.requireOnLongLunch ?? true);
        setMinCommentLength(config.commentRules?.minCommentLength ?? 10);

        // Configuración de Slack
        setSlackEnabled(config.slackConfig?.enabled ?? false);
        setSlackWebhookUrl(config.slackConfig?.webhookUrl ?? '');
        setSlackDefaultChannel(config.slackConfig?.defaultChannel ?? '');
        setSlackNotifyOnLateArrival(config.slackConfig?.notifyOnLateArrival ?? true);
        setSlackNotifyOnAbsence(config.slackConfig?.notifyOnAbsence ?? true);
        setSlackNotifyOnLongLunch(config.slackConfig?.notifyOnLongLunch ?? true);

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
        setNotifyOnLateArrival(true);
        setNotifyOnLongLunch(true);
        setNotifySupervisor(true);
        setNotifyAdmin(true);
        setNotifyUser(true);
        setRequireOnLateArrival(true);
        setRequireOnEarlyDeparture(true);
        setRequireOnLongLunch(true);
        setMinCommentLength(10);
        setSlackEnabled(false);
        setSlackWebhookUrl('');
        setSlackDefaultChannel('');
        setSlackNotifyOnLateArrival(true);
        setSlackNotifyOnAbsence(true);
        setSlackNotifyOnLongLunch(true);
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
          notifyOnLateArrival,
          notifyOnLongLunch,
          notifySupervisor,
          notifyAdmin,
          notifyUser,
        },
        commentRules: {
          requireOnLateArrival,
          requireOnEarlyDeparture,
          requireOnLongLunch,
          minCommentLength,
        },
        slackConfig: {
          enabled: slackEnabled,
          webhookUrl: slackWebhookUrl || undefined,
          defaultChannel: slackDefaultChannel || undefined,
          notifyOnLateArrival: slackNotifyOnLateArrival,
          notifyOnAbsence: slackNotifyOnAbsence,
          notifyOnLongLunch: slackNotifyOnLongLunch,
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

        {/* Message Preview Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-300 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-3xl mr-3">👁️</span>
            Previsualización de Mensajes
          </h3>

          <div className="space-y-4">
            <div className="bg-green-100 border-l-4 border-green-500 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <span className="text-xl mr-2">ℹ️</span>
                <p className="text-sm text-green-800">
                  Así se verán las notificaciones cuando se envíen
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Slack Message Preview */}
              <div className="bg-white rounded-lg p-4 border border-purple-300">
                <div className="flex items-center mb-3">
                  <span className="text-xl mr-2">💬</span>
                  <h4 className="text-sm font-bold text-gray-900">Mensaje de Slack</h4>
                  {!slackEnabled && (
                    <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Deshabilitado</span>
                  )}
                </div>
                <div className={`bg-gray-50 border-l-4 border-purple-500 p-3 rounded ${!slackEnabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold mr-2">
                      AA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Asistencia Aviva</p>
                      <p className="text-xs text-gray-500">
                        {slackDefaultChannel ? `#${slackDefaultChannel}` : '#asistencia'} • ahora
                      </p>
                    </div>
                  </div>
                  <div className="ml-10">
                    <p className="text-sm text-gray-800 mb-1">
                      <span className="font-bold">⚠️ Retraso Detectado</span>
                    </p>
                    <p className="text-xs text-gray-700 mb-2">
                      <strong>Usuario:</strong> Juan Pérez<br/>
                      <strong>Hora esperada:</strong> 09:00<br/>
                      <strong>Hora de entrada:</strong> 09:15<br/>
                      <strong>Retraso:</strong> 15 minutos
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      "Tráfico en la autopista"
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Canal: {slackDefaultChannel ? `#${slackDefaultChannel}` : 'Del webhook configurado'}
                </p>
              </div>

              {/* System Notification Preview */}
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="flex items-center mb-3">
                  <span className="text-xl mr-2">🔔</span>
                  <h4 className="text-sm font-bold text-gray-900">Notificación del Sistema</h4>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                        🕐
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1">
                        Entrada con Retraso
                      </p>
                      <p className="text-xs text-gray-700 mb-2">
                        Juan Pérez llegó 15 minutos tarde hoy a las 09:15.
                      </p>
                      <div className="bg-white rounded p-2 text-xs text-gray-600 italic border-l-2 border-blue-300">
                        "Tráfico en la autopista"
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Hace 2 minutos
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Destinatarios:
                  {notifyUser && ' Usuario'}
                  {notifySupervisor && ' • Supervisor'}
                  {notifyAdmin && ' • Admin'}
                </p>
              </div>

              {/* Email Preview */}
              <div className="bg-white rounded-lg p-4 border border-indigo-300">
                <div className="flex items-center mb-3">
                  <span className="text-xl mr-2">📧</span>
                  <h4 className="text-sm font-bold text-gray-900">Email de Notificación</h4>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-indigo-600 p-3">
                    <p className="text-white text-sm font-bold">Asistencia Aviva</p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-gray-900 mb-2">
                      Alerta de Ausencia
                    </p>
                    <p className="text-xs text-gray-700 mb-3">
                      Estimado Supervisor,
                    </p>
                    <p className="text-xs text-gray-700 mb-3">
                      Le informamos que <strong>María González</strong> no ha registrado entrada hoy {new Date().toLocaleDateString()}.
                    </p>
                    <div className="bg-gray-50 border-l-4 border-red-400 p-2 mb-3">
                      <p className="text-xs text-gray-800">
                        <strong>Estado:</strong> Ausencia sin justificar<br/>
                        <strong>Hora esperada:</strong> 08:00<br/>
                        <strong>Tiempo transcurrido:</strong> {noEntryAfterMinutes} minutos
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Este es un mensaje automático del sistema de asistencia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Push Notification Preview */}
              <div className="bg-white rounded-lg p-4 border border-amber-300">
                <div className="flex items-center mb-3">
                  <span className="text-xl mr-2">📱</span>
                  <h4 className="text-sm font-bold text-gray-900">Notificación Push</h4>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xl mr-3 flex-shrink-0">
                      🍽️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-gray-900">Asistencia Aviva</p>
                        <p className="text-xs text-gray-500">ahora</p>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        Tiempo de Comida Excedido
                      </p>
                      <p className="text-xs text-gray-600">
                        Has excedido el tiempo permitido de comida ({maxDurationMinutes} min). Por favor registra tu regreso.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <span className="mr-1">📲</span>
                  Se envía cuando se excede el tiempo de comida
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comment Rules */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            📝 Reglas de Comentarios Obligatorios
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireCommentOnLateArrival"
                checked={requireOnLateArrival}
                onChange={(e) => setRequireOnLateArrival(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireCommentOnLateArrival" className="ml-2 text-sm font-medium text-gray-700">
                Requerir comentario en entradas con retraso
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireCommentOnEarlyDeparture"
                checked={requireOnEarlyDeparture}
                onChange={(e) => setRequireOnEarlyDeparture(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireCommentOnEarlyDeparture" className="ml-2 text-sm font-medium text-gray-700">
                Requerir comentario en salidas anticipadas
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireCommentOnLongLunch"
                checked={requireOnLongLunch}
                onChange={(e) => setRequireOnLongLunch(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireCommentOnLongLunch" className="ml-2 text-sm font-medium text-gray-700">
                Requerir comentario cuando se excede tiempo de comida
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitud mínima del comentario (caracteres)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={minCommentLength}
                onChange={(e) => setMinCommentLength(parseInt(e.target.value) || 10)}
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número mínimo de caracteres requeridos en el comentario explicativo
              </p>
            </div>
          </div>
        </div>

        {/* Slack Configuration - MOVED UP FOR BETTER VISIBILITY */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-300 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">💬</span>
              Integración con Slack
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${slackEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {slackEnabled ? '✓ Habilitado' : '○ Deshabilitado'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="slackEnabled"
                  checked={slackEnabled}
                  onChange={(e) => setSlackEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {!slackEnabled && (
            <div className="bg-purple-100 border-l-4 border-purple-500 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">ℹ️</div>
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    Las notificaciones de Slack están deshabilitadas
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Activa el interruptor arriba para habilitar y configurar las notificaciones de Slack
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={`space-y-4 ${!slackEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="bg-white rounded-lg p-5 border border-purple-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-lg mr-2">🔗</span>
                Configuración de Conexión
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL de Slack <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                    disabled={!slackEnabled}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-xs"
                  />
                  <div className="mt-2 flex items-start space-x-2">
                    <span className="text-xs">💡</span>
                    <div className="text-xs text-gray-600">
                      <p className="font-medium">¿Cómo obtener tu Webhook URL?</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Ve a <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">api.slack.com/messaging/webhooks</a></li>
                        <li>Crea una nueva aplicación de Slack o usa una existente</li>
                        <li>Habilita "Incoming Webhooks"</li>
                        <li>Copia la URL del webhook y pégala aquí</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Canal por defecto (opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">#</span>
                    <input
                      type="text"
                      value={slackDefaultChannel.replace('#', '')}
                      onChange={(e) => setSlackDefaultChannel(e.target.value.replace('#', ''))}
                      placeholder="asistencia"
                      disabled={!slackEnabled}
                      className="block w-full pl-7 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Canal donde se enviarán las notificaciones (sin incluir #)
                  </p>
                </div>
              </div>

              {slackEnabled && !slackWebhookUrl && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md p-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">⚠️</span>
                    <p className="text-sm text-yellow-800 font-medium">
                      Webhook URL es obligatorio para enviar notificaciones
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg p-5 border border-purple-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-lg mr-2">🔔</span>
                Eventos para notificar en Slack
              </h4>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors">
                  <input
                    type="checkbox"
                    id="slackNotifyOnLateArrival"
                    checked={slackNotifyOnLateArrival}
                    onChange={(e) => setSlackNotifyOnLateArrival(e.target.checked)}
                    disabled={!slackEnabled}
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="slackNotifyOnLateArrival" className={`text-sm font-medium ${!slackEnabled ? 'text-gray-400' : 'text-gray-900'}`}>
                      🕐 Entradas con retraso
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Notifica cuando un usuario llega tarde a su horario de entrada
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors">
                  <input
                    type="checkbox"
                    id="slackNotifyOnAbsence"
                    checked={slackNotifyOnAbsence}
                    onChange={(e) => setSlackNotifyOnAbsence(e.target.checked)}
                    disabled={!slackEnabled}
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="slackNotifyOnAbsence" className={`text-sm font-medium ${!slackEnabled ? 'text-gray-400' : 'text-gray-900'}`}>
                      ❌ Ausencias detectadas
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Notifica cuando se detecta una ausencia sin justificación
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors">
                  <input
                    type="checkbox"
                    id="slackNotifyOnLongLunch"
                    checked={slackNotifyOnLongLunch}
                    onChange={(e) => setSlackNotifyOnLongLunch(e.target.checked)}
                    disabled={!slackEnabled}
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="slackNotifyOnLongLunch" className={`text-sm font-medium ${!slackEnabled ? 'text-gray-400' : 'text-gray-900'}`}>
                      🍽️ Comidas prolongadas
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Notifica cuando se excede el tiempo permitido de comida
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {slackEnabled && slackWebhookUrl && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-md p-4">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">✅</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Configuración de Slack completada
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Las notificaciones se enviarán al canal {slackDefaultChannel ? `#${slackDefaultChannel}` : 'configurado en el webhook'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Rules */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-300 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-3xl mr-3">🔔</span>
            Configuración de Notificaciones del Sistema
          </h3>

          <div className="space-y-4">
            <div className="bg-blue-100 border-l-4 border-blue-500 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <span className="text-xl mr-2">ℹ️</span>
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Estas notificaciones se envían por el sistema interno (email, notificaciones push, etc.)
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-lg mr-2">👥</span>
                Destinatarios de Notificaciones
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyUser"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifyUser" className="ml-3 text-sm font-medium text-gray-900">
                    👤 Usuario afectado
                  </label>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifySupervisor"
                    checked={notifySupervisor}
                    onChange={(e) => setNotifySupervisor(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifySupervisor" className="ml-3 text-sm font-medium text-gray-900">
                    👨‍💼 Supervisor
                  </label>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyAdmin"
                    checked={notifyAdmin}
                    onChange={(e) => setNotifyAdmin(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifyAdmin" className="ml-3 text-sm font-medium text-gray-900">
                    🔧 Administradores
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-lg mr-2">📢</span>
                Eventos que Generan Notificaciones
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyOnLateArrival"
                    checked={notifyOnLateArrival}
                    onChange={(e) => setNotifyOnLateArrival(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="notifyOnLateArrival" className="text-sm font-medium text-gray-900">
                      🕐 Entradas con retraso
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Alerta cuando hay retraso en la entrada</p>
                  </div>
                </div>

                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyOnLongLunch"
                    checked={notifyOnLongLunch}
                    onChange={(e) => setNotifyOnLongLunch(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="notifyOnLongLunch" className="text-sm font-medium text-gray-900">
                      🍽️ Tiempo de comida excedido
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Alerta por comida prolongada</p>
                  </div>
                </div>

                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyOnAbsenceMain"
                    checked={notifyOnAbsence}
                    onChange={(e) => setNotifyOnAbsence(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="notifyOnAbsenceMain" className="text-sm font-medium text-gray-900">
                      ❌ Ausencias detectadas
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Alerta de inasistencias</p>
                  </div>
                </div>

                <div className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="notifyOnLateExitMain"
                    checked={notifyOnLateExit}
                    onChange={(e) => setNotifyOnLateExit(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="notifyOnLateExitMain" className="text-sm font-medium text-gray-900">
                      🕐 Salidas tardías
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Alerta por salida posterior a horario</p>
                  </div>
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